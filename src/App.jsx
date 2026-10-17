import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Code2, 
  FolderTree, 
  Info
} from 'lucide-react';

import { Header } from './components/Header';
import { Viewport } from './components/Viewport';
import { ParameterSliders } from './components/ParameterSliders';
import { CodeEditor } from './components/CodeEditor';
import { FileTree } from './components/FileTree';
import { SuiteInfoModal } from './components/SuiteInfoModal';
import { AiStudioModal } from './components/AiStudioModal';
import { Toast } from './components/Toast';

import { parseKfpack } from './services/PackParser';
import { exportKfpack } from './services/PackExporter';
import { WebGLRenderer } from './engine/WebGLRenderer';
import { MediaSourceManager } from './engine/MediaSourceManager';

export default function App() {
  // --- Core Suite & Effect State ---
  const [suite, setSuite] = useState(null);
  const [effects, setEffects] = useState([]);
  const [files, setFiles] = useState({});
  const [activeEffectId, setActiveEffectId] = useState('');
  const [activeFilePath, setActiveFilePath] = useState('');
  const [openFiles, setOpenFiles] = useState([]);
  const [paramValues, setParamValues] = useState({});
  const [importedSuites, setImportedSuites] = useState([]);

  // --- Engine & Media State ---
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaName, setMediaName] = useState('');
  const [mediaDimensions, setMediaDimensions] = useState({ width: 1920, height: 1080 });
  const mediaDimensionsRef = useRef({ width: 1920, height: 1080 });
  const [isVideo, setIsVideo] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false); // Default to ONCE as requested
  const [shaderError, setShaderError] = useState(null);
  const [lineErrors, setLineErrors] = useState([]);

  // --- Layout State ('app' | 'split' | 'code') ---
  const [activeLayout, setActiveLayout] = useState('app');
  const [mobileTab, setMobileTab] = useState('sliders');
  const [isMobile, setIsMobile] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Refs ---
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const mediaManagerRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const currentTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  // 1. Detect Screen Size
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // 2. Initialize Media Manager & WebGL Engine on Mount (Zero dummy suites loaded)
  useEffect(() => {
    const mm = new MediaSourceManager();
    mm.isLooping = false;
    mediaManagerRef.current = mm;

    if (canvasRef.current) {
      try {
        rendererRef.current = new WebGLRenderer(canvasRef.current);
      } catch (e) {
        console.error('WebGL initialization error:', e);
      }
    }

    // No dummy sample suites are preloaded. App starts clean waiting for imported suites.

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      if (mediaManagerRef.current) {
        mediaManagerRef.current.stopPlayback();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const activeEffect = effects.find((e) => e.id === activeEffectId) || effects[0];

  // 3. Update Shader when Active Effect changes
  useEffect(() => {
    if (!activeEffect?.shaderCode) return;

    if (!rendererRef.current && canvasRef.current) {
      try {
        rendererRef.current = new WebGLRenderer(canvasRef.current);
      } catch (e) {
        console.error('WebGL initialization error:', e);
        return;
      }
    }

    if (rendererRef.current) {
      const res = rendererRef.current.setShaderSource(activeEffect.shaderCode);
      setShaderError(res.error);
      setLineErrors(res.lineErrors);
    }
  }, [activeEffect?.id, activeEffect?.shaderCode]);

  // 4. Custom Suite Import Handler (.kfpack / .zip)
  const handleImportKfpackFile = async (file) => {
    if (!file) return;
    try {
      const data = await parseKfpack(file);
      setImportedSuites((prev) => {
        const existingIndex = prev.findIndex((s) => s.suite?.id === data.suite?.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data;
          return updated;
        }
        return [...prev, data];
      });
      applySuiteData(data);
      showToast(`Imported ${data.suite?.name || file.name} (${data.effects.length} FX)`);
    } catch (e) {
      showToast(`Failed to parse .kfpack: ${e.message}`, 'error');
    }
  };

  const handleSelectImportedSuite = (suiteId) => {
    const found = importedSuites.find((s) => s.suite?.id === suiteId);
    if (found) {
      applySuiteData(found);
      showToast(`Switched to ${found.suite?.name || suiteId}`);
    }
  };

  const handleRemoveSuite = (suiteId) => {
    const target = importedSuites.find((s) => s.suite?.id === suiteId);
    const targetName = target?.suite?.name || target?.suite?.id || 'Suite';
    setImportedSuites((prev) => {
      const nextList = prev.filter((s) => s.suite?.id !== suiteId);
      if (suite?.id === suiteId) {
        if (nextList.length > 0) {
          applySuiteData(nextList[0]);
        } else {
          setSuite(null);
          setEffects([]);
          setFiles({});
          setActiveEffectId('');
          setActiveFilePath('');
          setOpenFiles([]);
        }
      }
      return nextList;
    });
    showToast(`Deleted "${targetName}" from suites`, 'info');
  };

  const applySuiteData = (data) => {
    setSuite(data.suite);
    setEffects(data.effects);
    setFiles(data.files);

    if (data.effects.length > 0) {
      const firstEff = data.effects[0];
      setActiveEffectId(firstEff.id);

      const initialParams = {};
      for (const p of firstEff.parameters || []) {
        initialParams[p.key] = p.default !== undefined ? p.default : 0.0;
      }
      setParamValues(initialParams);

      const shaderPath = `effects/${firstEff.id}/shader.glsl`;
      const jsonPath = `effects/${firstEff.id}/effect.json`;
      setActiveFilePath(shaderPath);
      setOpenFiles([shaderPath, jsonPath, 'suite.json']);
    }
  };

  // 5. Handle Switching Active Effect
  const handleSelectEffect = (effectId) => {
    const eff = effects.find((e) => e.id === effectId);
    if (!eff) return;

    setActiveEffectId(effectId);

    const newParams = {};
    for (const p of eff.parameters || []) {
      newParams[p.key] = p.default !== undefined ? p.default : 0.0;
    }
    setParamValues(newParams);

    const shaderPath = `effects/${eff.id}/shader.glsl`;
    const jsonPath = `effects/${eff.id}/effect.json`;
    setActiveFilePath(shaderPath);

    setOpenFiles((prev) => {
      const updated = [...prev];
      if (!updated.includes(shaderPath)) updated.unshift(shaderPath);
      if (!updated.includes(jsonPath)) updated.push(jsonPath);
      return updated;
    });
  };

  // 6. Code Editor Changes (Live Shader Reload)
  const handleChangeCode = (newCode) => {
    if (!activeFilePath) return;

    setFiles((prev) => ({
      ...prev,
      [activeFilePath]: newCode
    }));

    if (activeFilePath === `effects/${activeEffectId}/shader.glsl`) {
      setEffects((prev) =>
        prev.map((eff) => (eff.id === activeEffectId ? { ...eff, shaderCode: newCode } : eff))
      );
    }

    if (activeFilePath === `effects/${activeEffectId}/effect.json`) {
      try {
        const parsed = JSON.parse(newCode);
        setEffects((prev) =>
          prev.map((eff) =>
            eff.id === activeEffectId
              ? {
                  ...eff,
                  name: parsed.name || eff.name,
                  category: parsed.category || eff.category,
                  parameters: parsed.parameters || eff.parameters
                }
              : eff
          )
        );
      } catch (e) {
        // In-progress JSON syntax
      }
    }

    if (activeFilePath === 'suite.json') {
      try {
        const parsedSuite = JSON.parse(newCode);
        setSuite(parsedSuite);
      } catch (e) {}
    }
  };

  const handleSelectFile = (path) => {
    setActiveFilePath(path);
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));

    if (path.startsWith('effects/')) {
      const effectId = path.split('/')[1];
      if (effectId && effectId !== activeEffectId) {
        handleSelectEffect(effectId);
      }
    }
  };

  // 7. Parameter Slider Adjustments
  const handleChangeParam = (key, value) => {
    setParamValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetParams = () => {
    if (!activeEffect) return;
    const initial = {};
    for (const p of activeEffect.parameters || []) {
      initial[p.key] = p.default !== undefined ? p.default : 0.0;
    }
    setParamValues(initial);
    showToast('Sliders reset to default values', 'info');
  };

  // 8. User Custom Media Handlers (Image or Video)
  const handleUploadCustomMedia = async (file) => {
    if (!file) return;
    if (!mediaManagerRef.current) {
      mediaManagerRef.current = new MediaSourceManager();
      mediaManagerRef.current.isLooping = isLooping;
    }
    try {
      await mediaManagerRef.current.loadMediaFile(file);
      const w = mediaManagerRef.current.width || 1280;
      const h = mediaManagerRef.current.height || 720;
      mediaDimensionsRef.current = { width: w, height: h };
      setMediaDimensions({ width: w, height: h });
      setDuration(mediaManagerRef.current.duration);
      setHasMedia(true);
      setMediaName(file.name || 'imported_media');
      const isVid = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(file.name);
      setIsVideo(isVid);
      showToast(`Loaded ${file.name} (${w}×${h})`);
    } catch (e) {
      showToast('Error loading media: ' + (e?.message || e), 'error');
    }
  };

  const handleClearMedia = () => {
    if (mediaManagerRef.current) {
      mediaManagerRef.current.clearPreviousMedia();
    }
    setHasMedia(false);
    setMediaName('');
    setIsVideo(false);
    showToast('Media cleared', 'info');
  };

  const handleTogglePlay = () => {
    if (!mediaManagerRef.current) return;
    const playing = mediaManagerRef.current.togglePlay();
    setIsPlaying(playing);
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (mediaManagerRef.current) mediaManagerRef.current.isLooping = next;
  };

  const handleSeek = (time) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
    if (mediaManagerRef.current) mediaManagerRef.current.seek(time);
  };

  const handleResetTime = () => {
    handleSeek(0);
  };

  // 9. Main WebGL Animation Loop (With auto-rebind defense if canvas ever changes)
  useEffect(() => {
    const render = (now) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Auto-rebind WebGLRenderer if canvas ever changes
      if (canvasRef.current && (!rendererRef.current || rendererRef.current.canvas !== canvasRef.current)) {
        try {
          if (rendererRef.current) rendererRef.current.destroy();
          rendererRef.current = new WebGLRenderer(canvasRef.current);
          if (activeEffect?.shaderCode) {
            rendererRef.current.setShaderSource(activeEffect.shaderCode);
          }
        } catch (e) {
          console.error('WebGL auto-rebind error:', e);
        }
      }

      const mm = mediaManagerRef.current;
      const renderer = rendererRef.current;

      if (mm && renderer) {
        if (isPlaying) {
          if (mm.video) {
            currentTimeRef.current = mm.video.currentTime || 0;
            if (!isLooping && mm.video.ended) {
              setIsPlaying(false);
            }
          } else {
            const dur = mm.duration || 10;
            const next = currentTimeRef.current + delta;
            if (isLooping) {
              currentTimeRef.current = next % dur;
            } else {
              if (next >= dur) {
                currentTimeRef.current = dur;
                setIsPlaying(false);
              } else {
                currentTimeRef.current = next;
              }
            }
          }
        }

        // Throttle React UI time update (~8 FPS) to prevent component tree thrashing
        if (now - lastUiUpdateRef.current > 120) {
          lastUiUpdateRef.current = now;
          setCurrentTime(currentTimeRef.current);
        }

        const textureSource = mm.getTextureElement();
        if (textureSource) {
          // Continuously track intrinsic media dimensions once video frames decode
          const curW = textureSource.videoWidth || textureSource.naturalWidth || mm.width;
          const curH = textureSource.videoHeight || textureSource.naturalHeight || mm.height;
          if (curW > 0 && curH > 0 && (curW !== mediaDimensionsRef.current.width || curH !== mediaDimensionsRef.current.height)) {
            mediaDimensionsRef.current = { width: curW, height: curH };
            setMediaDimensions({ width: curW, height: curH });
          }

          renderer.renderFrame(
            textureSource,
            activeEffect?.parameters || [],
            paramValues || {},
            currentTimeRef.current
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isLooping, activeEffect?.id, paramValues]);

  // 10. Pack Export Handler
  const handleExportSuite = async () => {
    if (!suite) return;
    try {
      const filename = `${suite.id || 'custom_suite'}.kfpack`;
      await exportKfpack(files, filename);
      showToast(`Exported ${filename}`);
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
  };

  // 11. AI Studio State & Apply Handlers
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState('new');

  const handleOpenAiStudio = (mode = 'new') => {
    setAiModalMode(mode);
    setIsAiModalOpen(true);
  };

  const handleApplyAiEffect = (effectData, applyMode) => {
    if (!effectData) return;

    if (applyMode === 'replace' && activeEffect) {
      // 1. Replace/Update active effect
      const updatedEff = {
        ...activeEffect,
        name: effectData.name || activeEffect.name,
        category: effectData.category || activeEffect.category,
        description: effectData.description || activeEffect.description,
        parameters: effectData.parameters || activeEffect.parameters,
        shaderCode: effectData.shaderCode || activeEffect.shaderCode
      };

      setEffects((prev) =>
        prev.map((e) => (e.id === activeEffect.id ? updatedEff : e))
      );

      const newParams = {};
      for (const p of updatedEff.parameters || []) {
        newParams[p.key] = p.default !== undefined ? p.default : 0.0;
      }
      setParamValues(newParams);

      const shaderPath = `effects/${activeEffect.id}/shader.glsl`;
      const jsonPath = `effects/${activeEffect.id}/effect.json`;

      setFiles((prev) => ({
        ...prev,
        [shaderPath]: updatedEff.shaderCode,
        [jsonPath]: JSON.stringify({
          id: activeEffect.id,
          name: updatedEff.name,
          category: updatedEff.category,
          description: updatedEff.description,
          parameters: updatedEff.parameters
        }, null, 2)
      }));

      if (rendererRef.current && updatedEff.shaderCode) {
        const res = rendererRef.current.setShaderSource(updatedEff.shaderCode);
        setShaderError(res.error);
        setLineErrors(res.lineErrors);
      }

      showToast(`✨ Updated "${updatedEff.name}" with AI changes!`);
    } else {
      // 2. Add as New Effect to current or new suite
      const newId = effectData.id || `fx_${Date.now()}`;
      const newEff = {
        ...effectData,
        id: newId
      };

      let currentSuite = suite;
      if (!currentSuite) {
        currentSuite = {
          id: 'custom_ai_suite',
          name: 'AI Effects Suite',
          author: 'Keyflaw AI Creator',
          description: 'Custom effects created with Keyflaw AI Studio',
          version: '1.0.0',
          effects: []
        };
        setSuite(currentSuite);
      }

      const updatedEffects = [...effects, newEff];
      setEffects(updatedEffects);

      const shaderPath = `effects/${newId}/shader.glsl`;
      const jsonPath = `effects/${newId}/effect.json`;

      const newFiles = {
        ...files,
        [shaderPath]: newEff.shaderCode,
        [jsonPath]: JSON.stringify({
          id: newId,
          name: newEff.name,
          category: newEff.category,
          description: newEff.description,
          parameters: newEff.parameters
        }, null, 2),
        'suite.json': JSON.stringify({
          ...currentSuite,
          effects: updatedEffects.map((e) => ({ id: e.id, name: e.name, category: e.category }))
        }, null, 2)
      };
      setFiles(newFiles);

      setImportedSuites((prev) => {
        const suiteObj = {
          suite: {
            ...currentSuite,
            effects: updatedEffects.map((e) => ({ id: e.id, name: e.name, category: e.category }))
          },
          effects: updatedEffects,
          files: newFiles
        };
        const existingIdx = prev.findIndex((s) => s.suite?.id === currentSuite.id);
        if (existingIdx >= 0) {
          const list = [...prev];
          list[existingIdx] = suiteObj;
          return list;
        }
        return [...prev, suiteObj];
      });

      setActiveEffectId(newId);
      setActiveFilePath(shaderPath);
      setOpenFiles((prev) => [shaderPath, jsonPath, ...prev.filter((p) => p !== shaderPath && p !== jsonPath)]);

      const initialParams = {};
      for (const p of newEff.parameters || []) {
        initialParams[p.key] = p.default !== undefined ? p.default : 0.0;
      }
      setParamValues(initialParams);

      if (rendererRef.current && newEff.shaderCode) {
        const res = rendererRef.current.setShaderSource(newEff.shaderCode);
        setShaderError(res.error);
        setLineErrors(res.lineErrors);
      }

      showToast(`✨ Added "${newEff.name}" to suite!`);
    }
  };

  // Viewport Props
  const viewportProps = {
    canvasRef,
    hasMedia,
    mediaName,
    mediaDimensions,
    isVideo,
    currentTime,
    duration,
    isPlaying,
    isLooping,
    onTogglePlay: handleTogglePlay,
    onToggleLoop: handleToggleLoop,
    onSeek: handleSeek,
    onResetTime: handleResetTime,
    onUploadMedia: handleUploadCustomMedia,
    onClearMedia: handleClearMedia,
    shaderError
  };

  // Sliders Props
  const slidersProps = {
    suite,
    activeEffect,
    effects,
    onSelectEffect: handleSelectEffect,
    paramValues,
    onChangeParam: handleChangeParam,
    onResetParams: handleResetParams,
    onImportSuiteFile: handleImportKfpackFile,
    onOpenAiStudio: handleOpenAiStudio
  };

  // Global window drop handler for .kfpack files
  useEffect(() => {
    const handleGlobalDragOver = (e) => e.preventDefault();
    const handleGlobalDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.kfpack') || file.name.endsWith('.zip'))) {
        handleImportKfpackFile(file);
      }
    };
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  return (
    <div className="app-shell">
      {/* Clean Monochrome Header (Only imported suites shown) */}
      <Header
        suite={suite}
        importedSuites={importedSuites}
        onSelectSuite={handleSelectImportedSuite}
        onRemoveSuite={handleRemoveSuite}
        onImportSuiteFile={handleImportKfpackFile}
        onExportSuite={handleExportSuite}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAiStudio={handleOpenAiStudio}
        activeLayout={activeLayout}
        onChangeLayout={setActiveLayout}
      />

      {/* Main Studio Viewport & Layout */}
      <div className="studio-main-workspace">
        {isMobile ? (
          /* Mobile View: Vertical Split */
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <div style={{ height: '42%', flexShrink: 0, borderBottom: '1px solid var(--border-default)' }}>
              <Viewport {...viewportProps} />
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {mobileTab === 'sliders' && <ParameterSliders {...slidersProps} />}

                {mobileTab === 'code' && (
                  <CodeEditor
                    activeFilePath={activeFilePath}
                    code={files[activeFilePath] || ''}
                    onChangeCode={handleChangeCode}
                    lineErrors={lineErrors}
                    openFiles={openFiles}
                    onSelectFile={handleSelectFile}
                    onOpenAiStudio={handleOpenAiStudio}
                  />
                )}

                {mobileTab === 'files' && (
                  <FileTree
                    files={files}
                    activeFilePath={activeFilePath}
                    onSelectFile={handleSelectFile}
                    activeEffectId={activeEffectId}
                    onSelectEffect={handleSelectEffect}
                  />
                )}

                {mobileTab === 'pack' && (
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="param-card">
                      <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{suite?.name}</h3>
                      <p className="font-mono text-muted" style={{ fontSize: '11px' }}>ID: {suite?.id}</p>
                      <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', marginTop: '4px' }}>{suite?.description}</p>
                      <p style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>Author: {suite?.author}</p>
                    </div>

                    <button className="btn btn-outline" onClick={() => setIsGuideOpen(true)}>
                      <Info size={14} />
                      <span>Android Guide</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Bottom Tabs */}
              <nav style={{ height: '48px', display: 'flex', borderTop: '1px solid var(--border-default)', background: '#000000' }}>
                <button
                  className={`btn btn-ghost ${mobileTab === 'sliders' ? 'badge-active' : ''}`}
                  style={{ flex: 1, borderRadius: 0, height: '100%' }}
                  onClick={() => setMobileTab('sliders')}
                >
                  <Sliders size={15} />
                  <span>Sliders</span>
                </button>
                <button
                  className={`btn btn-ghost ${mobileTab === 'code' ? 'badge-active' : ''}`}
                  style={{ flex: 1, borderRadius: 0, height: '100%' }}
                  onClick={() => setMobileTab('code')}
                >
                  <Code2 size={15} />
                  <span>Code</span>
                </button>
                <button
                  className={`btn btn-ghost ${mobileTab === 'files' ? 'badge-active' : ''}`}
                  style={{ flex: 1, borderRadius: 0, height: '100%' }}
                  onClick={() => setMobileTab('files')}
                >
                  <FolderTree size={15} />
                  <span>Files</span>
                </button>
              </nav>
            </div>
          </div>
        ) : (
          /* ========================================================
             DESKTOP PERSISTENT CSS GRID WORKSPACE
             Viewport and canvas are NEVER unmounted across layout switches!
             WebGL context stays alive and video keeps playing continuously.
             ======================================================== */
          <div className={`studio-grid-container layout-${activeLayout}`}>
            {/* Panel 1: File Tree (visible in 'code' view) */}
            <div className="panel-files" style={{ display: activeLayout === 'code' ? 'flex' : 'none' }}>
              <FileTree
                files={files}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                activeEffectId={activeEffectId}
                onSelectEffect={handleSelectEffect}
              />
            </div>

            {/* Panel 2: Code Editor (visible in 'split' and 'code' views) */}
            <div className="panel-editor" style={{ display: activeLayout !== 'app' ? 'flex' : 'none' }}>
              <CodeEditor
                activeFilePath={activeFilePath}
                code={files[activeFilePath] || ''}
                onChangeCode={handleChangeCode}
                lineErrors={lineErrors}
                openFiles={openFiles}
                onSelectFile={handleSelectFile}
                onOpenAiStudio={handleOpenAiStudio}
              />
            </div>

            {/* Panel 3: Viewport (ALWAYS MOUNTED IN THE EXACT SAME POSITION!) */}
            <div className="panel-viewport">
              <Viewport {...viewportProps} />
            </div>

            {/* Panel 4: Parameter Sliders (ALWAYS MOUNTED IN THE EXACT SAME POSITION!) */}
            <div className="panel-sliders">
              <ParameterSliders {...slidersProps} />
            </div>
          </div>
        )}
      </div>

      {/* Suite Installation & Info Modal */}
      <SuiteInfoModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        suite={suite}
        effects={effects}
        onExportSuite={handleExportSuite}
      />

      {/* Keyflaw AI Studio Modal (100% Free Built-in + Gemini) */}
      <AiStudioModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeEffect={activeEffect}
        currentShaderCode={activeEffect?.shaderCode || files[activeFilePath] || ''}
        shaderError={shaderError}
        onApplyEffect={handleApplyAiEffect}
        initialMode={aiModalMode}
      />

      {/* Minimalist Floating Status Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
