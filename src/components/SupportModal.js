import React from 'react';
import { IoHeart, IoClose } from 'react-icons/io5';

const KOFI_URL = 'https://ko-fi.com/PullFool';

function SupportModal({ open, onClose }) {
  if (!open) return null;

  const openKofi = () => {
    try { window.nw.Shell.openExternal(KOFI_URL); }
    catch (e) { window.open(KOFI_URL, '_blank'); }
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

        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 22 }}>
          Enjoying PlayFool?
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          PlayFool is free and ad-free — built with love, one feature at a time.<br />
          If it's made your day a little better, a coffee would mean the world. ☕
        </p>

        <button
          onClick={openKofi}
          style={{
            background: '#13c3ff', color: '#fff', border: 'none',
            borderRadius: 20, padding: '12px 28px', fontSize: 15,
            fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginBottom: 12, transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          ☕ Support on Ko-fi
        </button>

        <div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: 'var(--text-muted)',
              border: 'none', fontSize: 13, cursor: 'pointer',
              padding: '8px 16px', textDecoration: 'underline',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupportModal;
