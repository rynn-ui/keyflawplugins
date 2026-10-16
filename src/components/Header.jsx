import React, { useRef } from 'react';
import { 
  Download, 
  Upload,
  HelpCircle, 
  ChevronDown, 
  Sliders, 
  Code2, 
  Columns 
} from 'lucide-react';

export function Header({
  suite,
  importedSuites = [],
  onSelectSuite,
  onImportSuiteFile,
  onExportSuite,
  onOpenGuide,
  activeLayout,
  onChangeLayout
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImportSuiteFile) {
      onImportSuiteFile(file);
    }
    // reset input value so re-importing the same file triggers change
    if (e.target) e.target.value = '';
  };

  return (
    <header className="app-header">
      {/* Brand & Suite Switcher */}
      <div className="brand-section">
        <img 
          src="/keyflaw_logo.webp" 
          alt="Keyflaw" 
          className="brand-logo-img" 
        />
        <span className="brand-title">KEYFLAW</span>

        {/* Suite Switcher Dropdown (Only shows imported suites) */}
        <div style={{ position: 'relative', marginLeft: '8px' }}>
          <select
            className="input-text"
            style={{ 
              height: '26px', 
              paddingRight: '22px', 
              cursor: importedSuites.length > 0 ? 'pointer' : 'default',
              background: '#0a0a0a',
              borderColor: 'var(--border-default)',
              fontSize: '11px',
              color: suite ? '#ffffff' : 'var(--fg-muted)'
            }}
            value={suite?.id || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId && onSelectSuite) onSelectSuite(selectedId);
            }}
            disabled={importedSuites.length === 0}
          >
            {importedSuites.length === 0 ? (
              <option value="">No Suites Imported</option>
            ) : (
              importedSuites.map((s) => (
                <option key={s.suite.id} value={s.suite.id}>
                  {s.suite.name || s.suite.id} ({s.effects?.length || 0} FX)
                </option>
              ))
            )}
          </select>
          <ChevronDown 
            size={12} 
            className="text-muted" 
            style={{ position: 'absolute', right: '6px', top: '7px', pointerEvents: 'none' }} 
          />
        </div>
      </div>

      {/* Screen Layout Viewport Switcher */}
      <div className="layout-switcher">
        <button
          className={`layout-btn ${activeLayout === 'app' ? 'active' : ''}`}
          onClick={() => onChangeLayout('app')}
          title="App View: Media Viewport & Effect Sliders side-by-side"
        >
          <Sliders size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
          <span>App View</span>
        </button>

        <button
          className={`layout-btn ${activeLayout === 'split' ? 'active' : ''}`}
          onClick={() => onChangeLayout('split')}
          title="Split View: Viewport, Sliders, and Code IDE"
        >
          <Columns size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
          <span>Split</span>
        </button>

        <button
          className={`layout-btn ${activeLayout === 'code' ? 'active' : ''}`}
          onClick={() => onChangeLayout('code')}
          title="Code IDE View: GLSL Shader Editor & Files"
        >
          <Code2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
          <span>Code IDE</span>
        </button>
      </div>

      {/* Actions: Import .kfpack & Export .kfpack */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Hidden file input for .kfpack import */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".kfpack,.zip"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <button
          className="btn btn-sm btn-outline"
          onClick={() => fileInputRef.current?.click()}
          title="Import a custom .kfpack suite from your device"
        >
          <Upload size={12} />
          <span>Import .kfpack</span>
        </button>

        <button
          className="btn btn-sm btn-primary"
          onClick={onExportSuite}
          disabled={!suite}
          title={suite ? `Download ${suite.id || 'suite'}.kfpack` : 'Import a suite to export'}
          style={!suite ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
        >
          <Download size={12} />
          <span>Export .kfpack</span>
        </button>

        <button
          className="btn btn-sm btn-icon-only btn-ghost"
          onClick={onOpenGuide}
          title="Keyflaw Android Instructions"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
}
