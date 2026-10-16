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
  Cpu
} from 'lucide-react';

import { 
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
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(getAiSettings());
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      const s = getAiSettings();
      setSettings(s);
      setApiKeyInput(s.geminiApiKey || '');
      setErrorMessage(null);

      if (shaderError) {
        setMode('fix');
      } else if (activeEffect && initialMode === 'modify') {
        setMode('modify');
      } else {
        setMode('new');
      }
    }
  }, [isOpen, shaderError, activeEffect, initialMode]);

  // Animated loading messages
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

  const loadingMessages = [
    'Synthesizing real-time GLSL algorithm...',
    'Declaring parameter uniforms & slider limits...',
    'Optimizing texture sampling & performance...',
    'Finalizing Keyflaw WebGL package...'
  ];

  const handleSaveSettings = () => {
    const next = {
      ...settings,
      geminiApiKey: apiKeyInput.trim()
    };
    setSettings(next);
    saveAiSettings(next);
    setShowSettings(false);
  };

  const handleGenerate = async () => {
    if (mode !== 'fix' && !prompt.trim()) return;
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content ai-studio-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-header-title-group">
            <div className="ai-sparkle-avatar">
              <Sparkles size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="ai-header-title">KEYFLAW AI STUDIO</h3>
                <span className="ai-provider-badge">
                  {settings.provider === 'gemini' && settings.geminiApiKey ? 'Gemini 2.0 Free' : 'Free AI Active'}
                </span>
              </div>
              <p className="ai-header-sub">Author and modify real-time WebGL shaders with natural language</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm btn-icon-only ${showSettings ? 'badge-active' : 'btn-ghost'}`}
              onClick={() => setShowSettings(!showSettings)}
              title="AI Provider Settings"
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

        {/* Expandable Settings Drawer */}
        {showSettings && (
          <div className="ai-settings-drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>AI Provider Configuration</span>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>100% Free Forever</span>
            </div>

            <div className="ai-provider-toggle-group">
              <button
                type="button"
                className={`ai-provider-option ${settings.provider === 'free' ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, provider: 'free' })}
              >
                <Cpu size={14} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>Built-in Free AI</div>
                  <div style={{ fontSize: '9px', color: 'var(--fg-muted)' }}>Zero-setup public inference • Ready instantly</div>
                </div>
              </button>

              <button
                type="button"
                className={`ai-provider-option ${settings.provider === 'gemini' ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, provider: 'gemini' })}
              >
                <Sparkles size={14} color="#8b5cf6" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>Google Gemini Free Tier</div>
                  <div style={{ fontSize: '9px', color: 'var(--fg-muted)' }}>Sub-second speed • 1,500 requests/day free</div>
                </div>
              </button>
            </div>

            {settings.provider === 'gemini' && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: 'var(--fg-secondary)', display: 'block', marginBottom: '4px' }}>
                  Gemini API Key (Saved locally in your browser):
                </label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="Paste your Gemini API key (AIzaSy...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', marginBottom: '6px' }}
                />
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '10px', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                >
                  <span>Get your 100% free Gemini API key at Google AI Studio</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-sm btn-primary" onClick={handleSaveSettings}>
                <Check size={12} />
                <span>Save Settings</span>
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
