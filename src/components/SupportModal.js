import React, { useState, useEffect } from 'react';
import { IoHeart, IoClose, IoHeartDislike } from 'react-icons/io5';

const KOFI_URL = 'https://ko-fi.com/PullFool';

const primaryBtn = {
  background: '#ff4b6e', color: '#fff', border: 'none',
  borderRadius: 20, padding: '12px 24px', fontSize: 14,
  fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8,
  transition: 'transform 0.2s',
};
const secondaryBtn = {
  background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 20, padding: '12px 24px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 8,
};

function SupportModal({ open, alreadyHearted = false, onClose, onLike, onDislike }) {
  const [stage, setStage] = useState(alreadyHearted ? 'donate' : 'ask');

  useEffect(() => {
    if (open) setStage(alreadyHearted ? 'donate' : 'ask');
  }, [open, alreadyHearted]);

  if (!open) return null;

  const openKofi = () => {
    try { window.nw.Shell.openExternal(KOFI_URL); }
    catch (e) { window.open(KOFI_URL, '_blank'); }
    onClose();
  };

  const handleLike = () => {
    if (onLike) onLike();
    setStage('donate');
  };

  const handleDislike = () => {
    if (onDislike) onDislike();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
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

        <div style={{ fontSize: 56, color: '#ff4b6e', marginBottom: 12 }}>
          <IoHeart />
        </div>

        {stage === 'ask' && (
          <>
            <h2 style={{ margin: 0, marginBottom: 12, fontSize: 22 }}>
              Do you like PlayFool?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Your answer helps me understand if I'm building something people actually enjoy. No data, no tracking — just a count. 🙏
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={handleLike}
                style={primaryBtn}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <IoHeart /> Yes, I love it!
              </button>
              <button onClick={handleDislike} style={secondaryBtn}>
                <IoHeartDislike /> Not yet
              </button>
            </div>
          </>
        )}

        {stage === 'donate' && (
          <>
            <h2 style={{ margin: 0, marginBottom: 12, fontSize: 22 }}>
              Thanks for the love! 💚
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              PlayFool is free and ad-free — built with love, one feature at a time.<br />
              Would you like to support development with a small donation? ☕
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={openKofi}
                style={{ ...primaryBtn, background: '#13c3ff' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                ☕ Yes, support on Ko-fi
              </button>
              <button onClick={onClose} style={secondaryBtn}>
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SupportModal;
