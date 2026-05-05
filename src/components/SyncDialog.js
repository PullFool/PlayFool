import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoCloudOutline, IoSync, IoRefresh } from 'react-icons/io5';

// Cloud relay URL — same Worker the mobile app calls.
const RELAY_URL = 'https://playfool-sync.playfool-sync.workers.dev';

const primaryBtn = {
  background: '#1ed760', color: '#000', border: 'none',
  borderRadius: 20, padding: '10px 20px', fontSize: 13,
  fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8,
};
const secondaryBtn = {
  background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 20, padding: '10px 20px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8,
};

const CODE_KEY = 'playfool_sync_code';

function genCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function SyncDialog({ open, onClose }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem(CODE_KEY) || '';
    setCode(saved);
    setStatus('');
    setCounts(null);
    if (saved) refreshCounts(saved);
  }, [open]);

  const refreshCounts = async (c) => {
    try {
      const r = await fetch(`${RELAY_URL}/v1/list?code=${encodeURIComponent(c)}`);
      const j = await r.json();
      const localList = await fetch('/api/library').then((x) => x.json()).catch(() => ({ songs: [] }));
      setCounts({ cloud: (j.files || []).length, local: (localList.songs || []).length });
    } catch (e) {
      setCounts(null);
    }
  };

  const onConnect = async () => {
    if (!code || code.length < 4) {
      setStatus('Enter at least 4 characters'); return;
    }
    setBusy(true); setStatus('');
    try {
      // Touch the relay to confirm internet works.
      const r = await fetch(`${RELAY_URL}/v1/list?code=${encodeURIComponent(code)}`);
      if (!r.ok) throw new Error(`Relay returned ${r.status}`);
      localStorage.setItem(CODE_KEY, code);
      await refreshCounts(code);
      setStatus('Connected');
    } catch (e) { setStatus('Cannot reach the cloud relay — check your internet'); }
    setBusy(false);
  };

  const onDisconnect = () => {
    localStorage.removeItem(CODE_KEY);
    setStatus('');
    setCounts(null);
  };

  const onGenerate = () => {
    const c = genCode();
    setCode(c);
  };

  const onSync = async () => {
    setBusy(true); setStatus('Syncing...');
    try {
      const r = await fetch('/api/cloud-sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, relay: RELAY_URL }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'sync failed');
      setStatus(`✓ ${j.uploaded} up · ${j.downloaded} down · ${j.errors} failed`);
      await refreshCounts(code);
    } catch (e) { setStatus(e.message); }
    setBusy(false);
  };

  if (!open) return null;

  const connected = !!localStorage.getItem(CODE_KEY) && code === localStorage.getItem(CODE_KEY);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'transparent', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer',
          fontSize: 20, padding: 4,
        }} title="Close">
          <IoClose />
        </button>

        <h2 style={{ margin: 0, marginBottom: 8, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoCloudOutline /> Cloud Sync
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          Share music between your PC and phone over the internet. Pick or generate a sync code,
          then enter the same code on your phone (Settings → Sync). Files relay through Cloudflare
          and get deleted right after they transfer.
        </p>

        <div style={{
          background: 'var(--bg-card, #1a1a1a)', borderRadius: 8, padding: 16,
          border: '1px solid var(--border)', marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Sync code</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={16}
              style={{
                flex: 1, fontSize: 22, letterSpacing: 4, fontWeight: 700,
                background: 'var(--bg-surface)', color: '#1ed760',
                border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px',
              }}
            />
            <button onClick={onGenerate} style={secondaryBtn} title="Generate a new code">
              <IoRefresh />
            </button>
          </div>

          {counts && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              Cloud: {counts.cloud} pending · Local library: {counts.local}
            </div>
          )}
        </div>

        {!!status && (
          <div style={{ fontSize: 12, color: status.startsWith('✓') ? '#1ed760' : 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>
            {status}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!connected ? (
            <button onClick={onConnect} disabled={busy} style={primaryBtn}>
              <IoSync /> Connect
            </button>
          ) : (
            <>
              <button onClick={onDisconnect} disabled={busy} style={secondaryBtn}>
                Disconnect
              </button>
              <button onClick={onSync} disabled={busy} style={primaryBtn}>
                <IoSync /> Sync now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SyncDialog;
