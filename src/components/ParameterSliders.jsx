import React, { useState, useMemo, useRef } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Layers, 
  Eye, 
  EyeOff, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  MoreVertical,
  Equal,
  Upload,
  Package,
  Sparkles
} from 'lucide-react';

import { KeyflawRulerSlider } from './KeyflawRulerSlider';
import { KeyflawToggle } from './KeyflawToggle';

/**
 * Checks whether a parameter should be rendered as a toggle button or a ruler slider.
 */
function isToggleParameter(param) {
  if (!param) return false;
  if (param.type === 'boolean' || param.type === 'toggle' || param.type === 'switch') {
    return true;
  }
  if (param.min === 0 && param.max === 1 && param.step === 1) {
    return true;
  }
  if (
    param.min === 0 && 
    param.max === 1 && 
    /^(is|has|use|enable|round|toggle|flip|invert|mirror|active)/i.test(param.key || param.label)
  ) {
    return true;
  }
  return false;
}

export function ParameterSliders({
  suite,
  activeEffect,
  effects = [],
  onSelectEffect,
  paramValues = {},
  onChangeParam,
  onResetParams,
  onImportSuiteFile,
  onOpenAiStudio
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const emptyFileInputRef = useRef(null);

  // Compute unique categories
  const categories = useMemo(() => {
    const set = new Set();
    (effects || []).forEach((eff) => {
      if (typeof eff?.category === 'string') {
        set.add(eff.category.toUpperCase());
      }
    });
    return ['ALL', ...Array.from(set)];
  }, [effects]);

  // Filter effects by category
  const filteredEffects = useMemo(() => {
    if (selectedCategory === 'ALL') return effects || [];
    return (effects || []).filter(
      (eff) => typeof eff?.category === 'string' && eff.category.toUpperCase() === selectedCategory
    );
  }, [effects, selectedCategory]);

  // Handle Drag & Drop of .kfpack directly into parameters panel
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onImportSuiteFile) {
      onImportSuiteFile(file);
    }
  };

  // If no suite or effect is loaded, show clean empty state with Import action
  if (!activeEffect || effects.length === 0) {
    return (
      <div 
        className={`parameters-panel ${isDragOver ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={emptyFileInputRef}
          accept=".kfpack,.zip"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onImportSuiteFile) onImportSuiteFile(f);
            if (e.target) e.target.value = '';
          }}
        />

        <div className="empty-suite-state">
          <div className="empty-suite-icon">
            <Package size={36} color="#71717a" />
          </div>
          <h3 className="empty-suite-title">NO SUITES IMPORTED</h3>
          <p className="empty-suite-desc">
            Import a custom <code>.kfpack</code> visual effect suite to configure interactive parameter sliders.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              className="btn btn-outline"
              onClick={() => emptyFileInputRef.current?.click()}
            >
              <Upload size={14} />
              <span>Import .kfpack Suite</span>
            </button>
            <button 
              className="btn btn-primary ai-generate-btn"
              onClick={() => onOpenAiStudio?.('new')}
            >
              <Sparkles size={14} />
              <span>Create with AI (Free)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const parameters = activeEffect.parameters || [];

  return (
    <div className="parameters-panel">
      {/* 1. Category Filter Bar (If multiple categories exist) */}
      {categories.length > 2 && (
        <div className="category-filter-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 2. Effect Shelf Chips (If suite contains multiple effects) */}
      {effects.length > 1 && (
        <div className="effect-shelf-bar">
          {filteredEffects.map((eff) => {
            const isActive = eff.id === activeEffect.id;
            return (
              <button
                key={eff.id}
                className={`effect-chip ${isActive ? 'active' : ''}`}
                onClick={() => onSelectEffect(eff.id)}
              >
                <Layers size={11} />
                <span>{eff.name || eff.id}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Main Scrollable Container containing Keyflaw Effect Card */}
      <div className="parameters-scroll">
        <div className={`kf-effect-card ${isBypassed ? 'is-bypassed' : ''}`}>
          {/* Effect Card Header Bar (Matching Keyflaw Android app screenshot) */}
          <div className="kf-card-header">
            {/* Left: Drag Grip Handle + Effect Title */}
            <div className="kf-card-title-group">
              <div className="kf-drag-grip" title="Reorder effect">
                <Equal size={18} color="#71717a" />
              </div>
              <h2 className="kf-effect-title">
                {activeEffect.name || activeEffect.id}
              </h2>
            </div>

            {/* Right: Actions (AI Tweak, Eye, Chevron, Red Trash, Menu) */}
            <div className="kf-card-actions">
              {/* AI Tweak Button */}
              <button
                className="kf-icon-btn"
                onClick={() => onOpenAiStudio?.('modify')}
                title="Tweak this effect with AI"
              >
                <Sparkles size={18} color="#c084fc" />
              </button>

              {/* Eye Toggle (Active/Bypass) */}
              <button
                className={`kf-icon-btn ${!isBypassed ? 'text-blue' : 'text-muted'}`}
                onClick={() => setIsBypassed(!isBypassed)}
                title={isBypassed ? 'Enable Effect' : 'Bypass Effect'}
              >
                {isBypassed ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {/* Chevron Toggle (Collapse / Expand) */}
              <button
                className="kf-icon-btn text-muted"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand parameters' : 'Collapse parameters'}
              >
                {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>

              {/* Red Trash Icon (Reset effect parameters to defaults) */}
              <button
                className="kf-icon-btn text-red"
                onClick={onResetParams}
                title="Reset all parameters to default"
              >
                <Trash2 size={18} />
              </button>

              {/* 3-Dots Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  className="kf-icon-btn text-muted"
                  onClick={() => setShowMenu(!showMenu)}
                  title="Effect options"
                >
                  <MoreVertical size={18} />
                </button>

                {showMenu && (
                  <div className="kf-dropdown-menu">
                    <button 
                      className="kf-menu-item"
                      onClick={() => {
                        onResetParams();
                        setShowMenu(false);
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Reset to Defaults</span>
                    </button>
                    <button 
                      className="kf-menu-item"
                      onClick={() => {
                        navigator.clipboard?.writeText(JSON.stringify(paramValues, null, 2));
                        setShowMenu(false);
                      }}
                    >
                      <Layers size={12} />
                      <span>Copy Uniform Values</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parameter List: Sliders and Toggles */}
          {!isCollapsed && (
            <div className="kf-card-body">
              {parameters.length === 0 ? (
                <div className="kf-empty-params">
                  <Sliders size={20} color="#71717a" />
                  <span>No dynamic slider uniforms</span>
                </div>
              ) : (
                parameters.map((param) => {
                  const defaultVal = typeof param.default === 'number' ? param.default : (param.min || 0);
                  const currentVal = typeof paramValues[param.key] === 'number' ? paramValues[param.key] : defaultVal;

                  // Render Toggle Button ONLY if parameter is a toggle/boolean
                  if (isToggleParameter(param)) {
                    return (
                      <KeyflawToggle
                        key={param.key}
                        param={param}
                        value={currentVal}
                        onChange={(val) => onChangeParam(param.key, val)}
                      />
                    );
                  }

                  // Otherwise render Keyflaw Ruler Slider
                  return (
                    <KeyflawRulerSlider
                      key={param.key}
                      param={param}
                      value={currentVal}
                      onChange={(val) => onChangeParam(param.key, val)}
                      onReset={() => onChangeParam(param.key, defaultVal)}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
