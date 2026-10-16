import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  HelpCircle, 
  ChevronDown, 
  Sliders, 
  Code2, 
  Columns,
  Plus,
  Check,
  Package,
  Trash2
} from 'lucide-react';
import logoImg from '../assets/keyflaw_logo.webp';

export function Header({
  suite,
  importedSuites = [],
  onSelectSuite,
  onRemoveSuite,
  onImportSuiteFile,
  onExportSuite,
  onOpenGuide,
  activeLayout,
  onChangeLayout
}) {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImportSuiteFile) {
      onImportSuiteFile(file);
    }
    // reset input value so re-importing the same file triggers change
    if (e.target) e.target.value = '';
  };

  const effectsCount = suite?.effects?.length || (importedSuites.find(s => s.suite?.id === suite?.id)?.effects?.length) || 0;

  return (
    <header className="app-header">
      {/* Brand & Suite Switcher */}
      <div className="brand-section">
        {!logoError ? (
          <img 
            src={logoImg} 
            alt="Keyflaw" 
            className="brand-logo-img" 
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="brand-logo" title="Keyflaw">
            KF
          </div>
        )}
        <span className="brand-title">KEYFLAW</span>

        {/* Custom Suite Switcher Dropdown with Integrated + Import Button */}
        <div className="suite-control-wrapper" ref={dropdownRef}>
          <div className={`suite-selector-pill ${isDropdownOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="suite-dropdown-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title={suite ? `${suite.name || suite.id} (${effectsCount} FX)` : 'No suites imported'}
            >
              <Package size={13} className="suite-pack-icon" />
              <span className="suite-name-text">
                {suite ? (suite.name || suite.id) : 'No Suites'}
              </span>
              {suite && effectsCount > 0 && (
                <span className="suite-fx-badge">{effectsCount} FX</span>
              )}
              <ChevronDown 
                size={12} 
                className={`suite-chevron ${isDropdownOpen ? 'rotated' : ''}`} 
              />
            </button>

            {/* Quick + Add Suite Button */}
            <button
              type="button"
              className="suite-quick-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="Import .kfpack suite (+)"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Dropdown Menu Popover */}
          {isDropdownOpen && (
            <div className="suite-dropdown-popover">
              <div className="suite-popover-header">
                <span>Imported Suites</span>
                <span className="suite-count-tag">{importedSuites.length}</span>
              </div>

              <div className="suite-popover-list">
                {importedSuites.length === 0 ? (
                  <div className="suite-popover-empty">
                    <Package size={22} color="#71717a" />
                    <span>No suites imported yet</span>
                    <span style={{ fontSize: '10px', color: '#52525b' }}>
                      Tap '+' below to load your first .kfpack
                    </span>
                  </div>
                ) : (
                  importedSuites.map((s, idx) => {
                    const suiteId = s.suite?.id || `suite-${idx}`;
                    const isCurrent = s.suite?.id === suite?.id;
                    const fxCount = s.effects?.length || 0;
                    return (
                      <div
                        key={suiteId}
                        className={`suite-popover-item ${isCurrent ? 'active' : ''}`}
                        onClick={() => {
                          if (onSelectSuite && s.suite?.id) onSelectSuite(s.suite.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="suite-item-info">
                          <div className="suite-item-title-row">
                            <span className="suite-item-name">{s.suite?.name || s.suite?.id}</span>
                            {isCurrent && <Check size={13} color="#3b82f6" />}
                          </div>
                          <span className="suite-item-sub">
                            {fxCount} {fxCount === 1 ? 'effect' : 'effects'} {s.suite?.author ? `• ${s.suite.author}` : ''}
                          </span>
                        </div>

                        {onRemoveSuite && importedSuites.length > 1 && (
                          <button
                            type="button"
                            className="suite-item-remove-btn"
                            title="Remove from session"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSuite(s.suite?.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="suite-popover-actions">
                <button
                  type="button"
                  className="suite-popover-import-btn"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <Plus size={14} />
                  <span>Import .kfpack Suite</span>
                </button>

                {suite && (
                  <button
                    type="button"
                    className="suite-popover-export-btn"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onExportSuite) onExportSuite();
                    }}
                  >
                    <Download size={13} />
                    <span>Export Active Suite</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screen Layout Viewport Switcher (Desktop Only) */}
      <div className="layout-switcher desktop-only">
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
      <div className="header-actions">
        {/* Hidden file input for .kfpack import */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".kfpack,.zip"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Desktop Import Button */}
        <button
          className="btn btn-sm btn-outline desktop-only"
          onClick={() => fileInputRef.current?.click()}
          title="Import a custom .kfpack suite from your device"
        >
          <Upload size={12} />
          <span>Import .kfpack</span>
        </button>

        {/* Export Button (Always visible on Desktop and Mobile!) */}
        <button
          className="btn btn-sm btn-primary header-export-btn"
          onClick={onExportSuite}
          disabled={!suite}
          title={suite ? `Download ${suite.id || 'suite'}.kfpack` : 'Import a suite to export'}
          style={!suite ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
        >
          <Download size={13} />
          <span className="header-export-text">Export</span>
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
