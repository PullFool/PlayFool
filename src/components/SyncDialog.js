import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoSync, IoCheckmarkCircle, IoRefresh, IoCopyOutline } from 'react-icons/io5';

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

  const copy = (text) => {
    try { navigator.clipboard.writeText(text); } catch (e) {}
  };

  if (!open) return null;

  const enabled = info?.enabled;
  const address = info?.addresses?.[0];
  const port = info?.port || 3000;
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
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                On your phone, open Settings → Sync, then enter:
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 60 }}>Address:</span>
                <code style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {address ? `${address}:${port}` : '(detecting…)'}
                </code>
                {address && (
                  <button
                    onClick={() => copy(`${address}:${port}`)}
                    style={{ ...secondaryBtn, padding: '4px 8px', fontSize: 11 }}
                    title="Copy"
                  >
                    <IoCopyOutline />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 60 }}>PIN:</span>
                <code style={{ fontSize: 18, color: '#1ed760', fontWeight: 700, letterSpacing: 2 }}>
                  {token || '------'}
                </code>
                {token && (
                  <button
                    onClick={() => copy(token)}
                    style={{ ...secondaryBtn, padding: '4px 8px', fontSize: 11 }}
                    title="Copy"
                  >
                    <IoCopyOutline />
                  </button>
                )}
              </div>

              {info?.addresses && info.addresses.length > 1 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                  Other addresses: {info.addresses.slice(1).join(', ')}
                </div>
              )}

              <div style={{ fontSize: 11, color: '#1ed760', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                  background: '#1ed760', boxShadow: '0 0 6px #1ed760',
                }} />
                Broadcasting on the network — your phone should find this PC automatically.
              </div>
            </div>

            {address && token && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{
                  background: '#fff', padding: 10, borderRadius: 8,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <img
                    alt="Pair QR code"
                    width={180}
                    height={180}
                    src={
                      'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
                      encodeURIComponent(`playfool://pair?a=${address}:${port}&p=${token}`)
                    }
                  />
                  <span style={{ fontSize: 10, color: '#444', fontWeight: 600 }}>
                    Scan this from your phone
                  </span>
                </div>
              </div>
            )}

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
