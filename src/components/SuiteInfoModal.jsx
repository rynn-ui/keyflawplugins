import React from 'react';
import { X, Download, Smartphone, Info } from 'lucide-react';

export function SuiteInfoModal({
  isOpen,
  onClose,
  suite,
  effects = [],
  onExportSuite
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} style={{ color: '#ffffff' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ffffff' }}>
              Suite Details & Installation
            </h3>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Suite Summary Card */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>
                  {suite?.name || 'Effect Suite'}
                </h4>
                <p className="font-mono text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                  ID: {suite?.id}
                </p>
              </div>
              <span className="badge badge-active">
                {effects.length} Effects
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', marginTop: '4px' }}>
              {suite?.description || 'Custom visual effect shaders for Keyflaw video editor.'}
            </p>

            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--fg-muted)', marginTop: '2px' }}>
              <span>Author: <strong style={{ color: '#ffffff' }}>{suite?.author || 'Creator'}</strong></span>
            </div>
          </div>

          {/* Download Action Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: '#141414',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px' }}>
                Export for Keyflaw Android
              </div>
              <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                ZIP-compatible <code>.kfpack</code> container
              </div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={onExportSuite}>
              <Download size={12} />
              <span>Download .kfpack</span>
            </button>
          </div>

          {/* Android Installation Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
              <Smartphone size={14} style={{ color: '#ffffff' }} />
              <span>Installation Steps in Keyflaw Android App:</span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--fg-secondary)'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ width: '18px', height: '18px', justifyContent: 'center', padding: 0 }}>1</span>
                <span>Export the <code>.kfpack</code> file to your device.</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ width: '18px', height: '18px', justifyContent: 'center', padding: 0 }}>2</span>
                <span>Open <strong>Keyflaw</strong> app.</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ width: '18px', height: '18px', justifyContent: 'center', padding: 0 }}>3</span>
                <span>Navigate to <strong>Settings $\rightarrow$ Effect Suites</strong>.</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ width: '18px', height: '18px', justifyContent: 'center', padding: 0 }}>4</span>
                <span>Select <strong>Import Suite (.kfpack)</strong> and pick your file.</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ width: '18px', height: '18px', justifyContent: 'center', padding: 0 }}>5</span>
                <span>The new effects shelf will appear in the effects drawer ready for use.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-card)'
        }}>
          <button className="btn btn-sm btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
