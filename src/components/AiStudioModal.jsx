import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Settings, 
  Check, 
  Sliders, 
  Code2, 
  AlertCircle, 
  Wand2, 
  RefreshCw, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap
} from 'lucide-react';

import { 
  AI_PROVIDERS,
  getAiSettings, 
  saveAiSettings, 
  generateNewEffect, 
  modifyExistingEffect, 
  fixShaderError 
} from '../services/AiService';

const PRESET_INSPIRATIONS = [
  'Cyberpunk Neon Bloom with pulsating edge glow',
  'VHS 1980s Analog Tape with glitch tracking lines & grain',
  'Liquid Water Ripple with chromatic lens dispersion',
  'CRT Monitor with phosphor scanlines and barrel curvature',
  'Thermal Heatmap Vision with gradient infrared color mapping',
  'Retro 8-bit Pixelate with color dithering and vignette'
];

export function AiStudioModal({
  isOpen,
  onClose,
  activeEffect,
  currentShaderCode,
  shaderError,
  onApplyEffect, // (effectData, mode: 'new' | 'replace') => void
  initialMode = 'new'
}) {
  const [mode, setMode] = useState(initialMode); // 'new' | 'modify' | 'fix'
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [generatedEffect, setGeneratedEffect] = useState(null);
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(getAiSettings());
  const [activeProvider, setActiveProvider] = useState(settings.provider || 'gemini');
  const [activeModel, setActiveModel] = useState(settings.model || AI_PROVIDERS.gemini.defaultModel);
  const [providerKeys, setProviderKeys] = useState(settings.keys || {});
  const [showKey, setShowKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = getAiSettings();
      setSettings(s);
      setActiveProvider(s.provider || 'gemini');
      setActiveModel(s.model || AI_PROVIDERS[s.provider || 'gemini']?.defaultModel || '');
      setProviderKeys(s.keys || {});
      setErrorMessage(null);

      // If user has no API key set for the selected provider, open settings drawer automatically
      const currentKey = s.keys?.[s.provider || 'gemini'] || s.apiKey || '';
      if (!currentKey) {
        setShowSettings(true);
      } else {
        setShowSettings(false);
      }

      if (shaderError) {
        setMode('fix');
      } else if (activeEffect && initialMode === 'modify') {
        setMode('modify');
      } else {
        setMode('new');
      }
    }
  }, [isOpen, shaderError, activeEffect, initialMode]);

  // Loading animation step
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen) return null;

  const currentProviderConfig = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.gemini;
  const currentKey = providerKeys[activeProvider] || '';
  const hasKeyConfigured = Boolean(currentKey && currentKey.trim().length > 0);

  const loadingMessages = [
    'Synthesizing real-time GLSL algorithm...',
    'Declaring parameter uniforms & slider limits...',
    'Optimizing texture sampling & performance...',
    'Finalizing Keyflaw WebGL package...'
  ];

  const handleProviderSelect = (providerId) => {
    setActiveProvider(providerId);
    const provConfig = AI_PROVIDERS[providerId];
    if (provConfig) {
      setActiveModel(provConfig.defaultModel);
    }
  };

  const handleKeyChange = (value) => {
    setProviderKeys((prev) => ({
      ...prev,
      [activeProvider]: value
    }));
  };

  const handleSaveSettings = () => {
    const updated = {
      provider: activeProvider,
      model: activeModel,
      apiKey: providerKeys[activeProvider] || '',
      keys: {
        ...providerKeys
      }
    };
    setSettings(updated);
    saveAiSettings(updated);
    setShowSettings(false);
  };

  const handleGenerate = async () => {
    if (mode !== 'fix' && !prompt.trim()) return;

    if (!hasKeyConfigured) {
      setShowSettings(true);
      setErrorMessage(`Please enter your ${currentProviderConfig.name} API key below to proceed.`);
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedEffect(null);
    setLoadingStep(0);

    try {
      let result;
      if (mode === 'fix') {
        result = await fixShaderError(
          shaderError || 'Shader compile error',
          currentShaderCode,
          activeEffect?.parameters || []
        );
      } else if (mode === 'modify') {
        if (!activeEffect) throw new Error('No active effect selected to modify.');
        result = await modifyExistingEffect(prompt.trim(), activeEffect, currentShaderCode);
      } else {
        result = await generateNewEffect(prompt.trim());
      }

      setGeneratedEffect(result);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to generate effect. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = (applyMode) => {
    if (!generatedEffect || !onApplyEffect) return;
    onApplyEffect(generatedEffect, applyMode);
    onClose();
  };

  // Human-readable model label
  const selectedModelObj = currentProviderConfig.models?.find((m) => m.id === activeModel);
  const activeModelLabel = selectedModelObj ? selectedModelObj.name.split(' (')[0] : activeModel;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content ai-studio-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '660px' }}
      >
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-header-title-group">
            <div className="ai-sparkle-avatar">
              <Sparkles size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 className="ai-header-title">KEYFLAW AI STUDIO</h3>
                <button
                  type="button"
                  className="ai-provider-badge-btn"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Click to configure AI Provider or API Key"
                >
                  <Zap size={10} color="#a855f7" />
                  <span>{currentProviderConfig.name}: {activeModelLabel}</span>
                  <ChevronDown size={10} style={{ opacity: 0.6 }} />
                </button>
              </div>
              <p className="ai-header-sub">API-powered WebGL shader synthesis (Gemini, Claude, Grok, OpenAI & OpenRouter)</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm btn-icon-only ${showSettings ? 'badge-active' : 'btn-ghost'}`}
              onClick={() => setShowSettings(!showSettings)}
              title="API Provider & Key Settings"
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-icon-only btn-ghost"
              onClick={onClose}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Expandable Provider & API Key Settings Drawer */}
        {showSettings && (
          <div className="ai-settings-drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={13} color="#a855f7" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>Select AI Provider & API Key</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10b981' }}>
                <ShieldCheck size={12} />
                <span>Saved locally in browser</span>
              </div>
            </div>

            {/* Provider Grid */}
            <div className="ai-provider-toggle-group">
              {Object.values(AI_PROVIDERS).map((p) => {
                const isSelected = activeProvider === p.id;
                const hasProvKey = Boolean(providerKeys[p.id]?.trim());

                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`ai-provider-option ${isSelected ? 'active' : ''}`}
                    onClick={() => handleProviderSelect(p.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{p.name}</span>
                      {hasProvKey ? (
                        <span className="badge-key-ready">Ready</span>
                      ) : (
                        <span className="badge-key-needed">No Key</span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--fg-muted)', marginTop: '2px', textAlign: 'left' }}>
                      {p.tag}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Provider Form */}
            <div className="ai-provider-form-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--fg-secondary)', fontWeight: 600 }}>
                  {currentProviderConfig.name} Model:
                </label>
              </div>

              <select
                className="input-select"
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                style={{ width: '100%', marginBottom: '10px', fontSize: '12px' }}
              >
                {currentProviderConfig.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <label style={{ fontSize: '11px', color: 'var(--fg-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                {currentProviderConfig.name} API Key:
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="input-text"
                  placeholder={currentProviderConfig.keyPlaceholder}
                  value={currentKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  style={{ flex: 1, fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost btn-icon-only"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <a
                  href={currentProviderConfig.keyHelpUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '11px', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <span>Get {currentProviderConfig.name} API key</span>
                  <ExternalLink size={11} />
                </a>

                <button 
                  type="button"
                  className="btn btn-sm btn-primary" 
                  onClick={handleSaveSettings}
                  style={{ padding: '0 14px' }}
                >
                  <Check size={12} />
                  <span>Save Provider</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Key Gate Banner if user has not yet configured key */}
        {!hasKeyConfigured && !showSettings && (
          <div className="ai-key-warning-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} color="#f59e0b" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>
                  {currentProviderConfig.name} API Key Required
                </div>
                <div style={{ fontSize: '11px', color: 'var(--fg-secondary)', marginTop: '2px' }}>
                  To synthesize shaders directly in your browser, enter your free Gemini, Claude, Grok, or OpenRouter API key.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setShowSettings(true)}
              >
                Enter Key
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="ai-tabs-bar">
          <button
            type="button"
            className={`ai-tab-btn ${mode === 'new' ? 'active' : ''}`}
            onClick={() => { setMode('new'); setGeneratedEffect(null); }}
          >
            <Sparkles size={13} />
            <span>Create New Effect</span>
          </button>

          <button
            type="button"
            className={`ai-tab-btn ${mode === 'modify' ? 'active' : ''} ${!activeEffect ? 'disabled' : ''}`}
            onClick={() => {
              if (activeEffect) {
                setMode('modify');
                setGeneratedEffect(null);
              }
            }}
            disabled={!activeEffect}
            title={!activeEffect ? 'Import or select an effect first' : 'Modify active effect'}
          >
            <Wand2 size={13} />
            <span>Tweak Active FX</span>
            {activeEffect && <span className="ai-tab-tag">{activeEffect.name}</span>}
          </button>

          {shaderError && (
            <button
              type="button"
              className={`ai-tab-btn tab-error ${mode === 'fix' ? 'active' : ''}`}
              onClick={() => { setMode('fix'); setGeneratedEffect(null); }}
            >
              <AlertCircle size={13} color="#ef4444" />
              <span>Fix Compile Error</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body">
          {/* Active Error Notice in Fix Mode */}
          {mode === 'fix' && (
            <div className="ai-error-notice">
              <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '11px', color: '#ef4444', marginBottom: '2px' }}>
                  Active WebGL Compilation Error Detected:
                </div>
                <div className="font-mono text-muted" style={{ fontSize: '10px', wordBreak: 'break-word', maxHeight: '60px', overflowY: 'auto' }}>
                  {shaderError}
                </div>
              </div>
            </div>
          )}

          {/* Quick Preset Inspiration Chips (New Mode Only) */}
          {mode === 'new' && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Inspiration Presets:
              </span>
              <div className="ai-presets-scroll">
                {PRESET_INSPIRATIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="ai-preset-chip"
                    onClick={() => setPrompt(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Input Box */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '11px', color: 'var(--fg-secondary)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              {mode === 'fix' 
                ? 'Optional notes for the shader fixer:' 
                : mode === 'modify' 
                ? `What changes would you like to make to "${activeEffect?.name}"?`
                : 'Describe the visual effect you want to generate:'}
            </label>
            <textarea
              className="input-text ai-prompt-textarea"
              placeholder={
                mode === 'fix'
                  ? 'Click "Fix Shader Error" to automatically resolve syntax & uniform issues...'
                  : mode === 'modify'
                  ? 'e.g., "Add an audio pulse speed slider, invert colors, and make the glow cyan"'
                  : 'e.g., "Cyberpunk chromatic glitch with analog scanlines, RGB offset, and jitter slider"'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={isGenerating}
            />
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="ai-error-banner">
              <AlertCircle size={14} color="#ef4444" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Generation Button / Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-primary ai-generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || (mode !== 'fix' && !prompt.trim())}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={13} className="spin-icon" />
                  <span>{loadingMessages[loadingStep]}</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>
                    {mode === 'fix' ? 'Auto-Fix Shader Error' : mode === 'modify' ? 'Apply AI Changes' : 'Generate Effect'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Result Card */}
          {generatedEffect && (
            <div className="ai-result-card">
              <div className="ai-result-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      {generatedEffect.name}
                    </h4>
                    <span className="badge badge-category">{generatedEffect.category}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--fg-secondary)', margin: '4px 0 0' }}>
                    {generatedEffect.description}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  style={{ gap: '4px' }}
                >
                  <Code2 size={12} />
                  <span>{showCodePreview ? 'Hide GLSL' : 'View GLSL'}</span>
                  {showCodePreview ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </div>

              {/* Parameters List Pill Tags */}
              <div className="ai-result-params">
                <span style={{ fontSize: '10px', color: 'var(--fg-muted)', fontWeight: 600 }}>PARAMETERS ({generatedEffect.parameters.length}):</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                  {generatedEffect.parameters.map((p) => (
                    <span key={p.key} className="ai-param-tag">
                      <Sliders size={10} style={{ opacity: 0.6 }} />
                      <span>{p.label}</span>
                      <span className="ai-param-val">{p.default}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Expandable GLSL Code Box */}
              {showCodePreview && (
                <pre className="ai-code-preview">
                  <code>{generatedEffect.shaderCode}</code>
                </pre>
              )}

              {/* Action Buttons to apply to live viewport */}
              <div className="ai-result-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setGeneratedEffect(null)}
                >
                  Discard
                </button>

                {activeEffect && mode === 'modify' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleApply('replace')}
                    style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
                  >
                    <Check size={13} />
                    <span>Update "{activeEffect.name}"</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handleApply(activeEffect && mode === 'modify' ? 'replace' : 'new')}
                >
                  <Sparkles size={13} />
                  <span>
                    {activeEffect && mode === 'modify' ? 'Update Active Effect' : 'Add to Suite (+)'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
