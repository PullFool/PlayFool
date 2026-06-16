import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoVolumeMedium, IoCheckmarkCircle } from 'react-icons/io5';

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const dialog = {
  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw',
  position: 'relative',
};
const closeBtn = {
  position: 'absolute', top: 12, right: 12,
  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
  fontSize: 20, cursor: 'pointer',
};
const primaryBtn = {
  background: '#1ed760', color: '#000', border: 'none',
  borderRadius: 20, padding: '10px 20px', fontSize: 13,
  fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8,
};
const trackStyle = {
  height: 6, background: 'var(--bg-primary)', borderRadius: 3,
  overflow: 'hidden', marginTop: 12,
};
const fillStyle = (p) => ({
  height: '100%', background: '#1ed760', borderRadius: 3,
  width: `${Math.min(100, Math.max(0, p))}%`,
  transition: 'width 0.3s ease',
});

function NormalizeDialog({ open, onClose }) {
  const [status, setStatus] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/normalize-status');
      const j = await r.json();
      setStatus(j);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
    // Poll every 1.5s while open so the progress bar tracks ffmpeg's
    // per-file progress without spamming the server.
    const t = setInterval(fetchStatus, 1500);
    return () => clearInterval(t);
  }, [open, fetchStatus]);

  const startBatch = async () => {
    try {
      await fetch('/api/normalize-batch', { method: 'POST' });
      fetchStatus();
    } catch (e) {}
  };

  if (!open) return null;

  const total = status?.total || 0;
  const normalized = status?.normalized || 0;
  const remaining = Math.max(0, total - normalized);
  const running = !!status?.running;
  // Batch progress: `done` is set during a run; once finished, fall back to
  // the normalized/total ratio so the bar stays full.
  const progressPct = running
    ? (status.total > 0 ? (status.done / status.total) * 100 : 0)
    : (total > 0 ? (normalized / total) * 100 : 0);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtn} onClick={onClose}><IoClose /></button>
        <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoVolumeMedium /> Volume normalization
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 16px' }}>
          Equalizes every song to -14 LUFS (Spotify's target) so quiet and loud
          tracks sound the same. Songs are normalized once and remembered.
        </p>

        {!status && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading status...</p>
        )}

        {status && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{normalized} / {total} songs normalized</span>
              {remaining === 0 && total > 0 && (
                <span style={{ color: '#1ed760', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IoCheckmarkCircle /> Done
                </span>
              )}
            </div>
            <div style={trackStyle}>
              <div style={fillStyle(progressPct)} />
            </div>

            {running && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 12 }}>
                Processing: {status.currentFile || '...'}
              </p>
            )}

            {!running && remaining > 0 && (
              <button style={{ ...primaryBtn, marginTop: 16 }} onClick={startBatch}>
                Normalize {remaining} remaining
              </button>
            )}

            {!running && remaining === 0 && total > 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 12 }}>
                Future downloads will auto-normalize after they finish playing once.
              </p>
            )}

            {total === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>
                No songs in your library yet.
              </p>
            )}

            {status.error && (
              <p style={{ color: '#ff6b6b', fontSize: 12, marginTop: 12 }}>
                Last error: {status.error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default NormalizeDialog;
