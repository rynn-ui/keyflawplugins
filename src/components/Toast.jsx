import React, { useEffect } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        background: '#0d0d0d',
        border: `1px solid ${isError ? '#ffffff' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-pill)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.9)',
        color: '#ffffff',
        fontSize: '12px',
        maxWidth: '340px'
      }}
    >
      {isError ? (
        <AlertCircle size={14} style={{ color: '#ffffff', flexShrink: 0 }} />
      ) : (
        <Check size={14} style={{ color: '#ffffff', flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>{toast.message}</span>
      <button 
        className="btn btn-ghost btn-icon-sm" 
        onClick={onClose}
        style={{ width: '18px', height: '18px', padding: 0 }}
      >
        <X size={11} />
      </button>
    </div>
  );
}
