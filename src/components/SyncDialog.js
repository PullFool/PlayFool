import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoSync, IoCheckmarkCircle, IoRefresh } from 'react-icons/io5';

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

function SyncDialog({ open, onClose }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [debug, setDebug] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/sync/settings');
      const text = await r.text();
      let j;
      try { j = JSON.parse(text); } catch (parseErr) {
        setDebug(`Settings parse error: ${parseErr.message}\nRaw: ${text.slice(0, 200)}`);
        setInfo({ error: 'Bad response' });
        return;
      }
      setInfo(j);
    } catch (e) {
      setDebug(`Settings fetch error: ${e.message}`);
      setInfo({ error: e.message });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setDebug('');
    refresh();
  }, [open, refresh]);

  const enable = async () => {
    setBusy(true);
    setDebug('');
    try {
      const r = await fetch('/api/sync/enable', { method: 'POST' });
      const text = await r.text();
      if (!r.ok) {
        setDebug(`Enable failed (${r.status}): ${text.slice(0, 300)}`);
      } else {
        try {
          const j = JSON.parse(text);
          if (!j.ok) setDebug(`Enable returned: ${text.slice(0, 300)}`);
        } catch (e) {
          setDebug(`Enable parse error: ${text.slice(0, 300)}`);
        }
      }
      await refresh();
    } catch (e) {
      setDebug(`Enable threw: ${e.message}`);
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    await fetch('/api/sync/disable', { method: 'POST' });
    await refresh();
    setBusy(false);
  };

  const regenerate = async () => {
    if (!window.confirm('Generate a new PIN? Your phone will need to re-pair.')) return;
    setBusy(true);
    await fetch('/api/sync/regenerate', { method: 'POST' });
    await refresh();
    setBusy(false);
  };

  if (!open) return null;

  const enabled = info?.enabled;
  const token = info?.token;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 20, padding: 4,
          }}
          title="Close"
        >
          <IoClose />
        </button>

        <h2 style={{ margin: 0, marginBottom: 8, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoSync /> Library Sync
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          Sync downloaded songs between this PC and your phone over your local Wi-Fi.
          Both devices must be on the same network.
        </p>

        {!enabled && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button onClick={enable} disabled={busy} style={primaryBtn}>
              <IoSync /> Allow sync on this network
            </button>
          </div>
        )}

        {debug && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 6,
            background: 'rgba(232, 17, 35, 0.08)', border: '1px solid rgba(232, 17, 35, 0.4)',
            fontSize: 11, fontFamily: 'monospace', color: '#ff8a8a',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {debug}
          </div>
        )}

        {enabled && (
          <>
            <div style={{
              background: 'var(--bg-card, #1a1a1a)', borderRadius: 8, padding: 16,
              border: '1px solid var(--border)', marginBottom: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                On your phone, open <strong>Settings → Sync</strong>.
                This PC will appear automatically — tap it and enter the PIN below.
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>PIN</div>
              <code style={{ fontSize: 32, color: '#1ed760', fontWeight: 700, letterSpacing: 4 }}>
                {token || '------'}
              </code>

              <div style={{ fontSize: 11, color: '#1ed760', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                  background: '#1ed760', boxShadow: '0 0 6px #1ed760',
                }} />
                Broadcasting on the network
              </div>
            </div>

            {info?.peers && info.peers.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Recent devices:</div>
                {info.peers.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IoCheckmarkCircle style={{ color: '#1ed760' }} /> {p.name}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={regenerate} disabled={busy} style={secondaryBtn} title="Generate a new PIN">
                <IoRefresh /> New PIN
              </button>
              <button onClick={disable} disabled={busy} style={secondaryBtn}>
                Stop sync
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SyncDialog;
