import React from 'react';
import { IoWarning, IoAlertCircle } from 'react-icons/io5';

function ConfirmDialog({ open, title, message, confirmText = 'OK', cancelText = 'Cancel', danger = false, onConfirm, onCancel, variant = 'confirm' }) {
  if (!open) return null;

  const isAlert = variant === 'alert';
  const Icon = danger ? IoWarning : IoAlertCircle;
  const iconColor = danger ? '#ff6b6b' : 'var(--green)';

  return (
    <div className="modal-overlay" onClick={isAlert ? onConfirm : onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
          <Icon style={{ fontSize: 32, color: iconColor, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            {title && <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>{title}</h3>}
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {message}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          {!isAlert && (
            <button className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
          )}
          <button
            className="btn btn-primary"
            style={danger ? { background: '#ff6b6b', color: '#fff' } : undefined}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
