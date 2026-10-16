import React, { useRef, useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Film,
  AlertTriangle,
  RefreshCw,
  X,
  Maximize2
} from 'lucide-react';

function formatAspectLabel(w, h) {
  if (!w || !h) return '16:9';
  const ratio = w / h;
  if (Math.abs(ratio - 16 / 9) < 0.04) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.04) return '9:16';
  if (Math.abs(ratio - 1) < 0.04) return '1:1';
  if (Math.abs(ratio - 4 / 5) < 0.04) return '4:5';
  if (Math.abs(ratio - 4 / 3) < 0.04) return '4:3';
  if (Math.abs(ratio - 19 / 9) < 0.06 || Math.abs(ratio - 19.5 / 9) < 0.06 || Math.abs(ratio - 20 / 9) < 0.06) return '19:9';
  if (Math.abs(ratio - 9 / 19) < 0.06 || Math.abs(ratio - 9 / 19.5) < 0.06 || Math.abs(ratio - 9 / 20) < 0.06) return '9:19';
  if (Math.abs(ratio - 21 / 9) < 0.06) return '21:9';
  return `${ratio.toFixed(2)}:1`;
}

export function Viewport({
  canvasRef,
  hasMedia,
  mediaName,
  mediaDimensions = { width: 1920, height: 1080 },
  isVideo,
  currentTime,
  duration,
  isPlaying,
  isLooping,
  onTogglePlay,
  onToggleLoop,
  onSeek,
  onResetTime,
  onUploadMedia,
  onClearMedia,
  shaderError
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aspectPreset, setAspectPreset] = useState('auto'); // 'auto' | '16:9' | '9:16' | '1:1' | '19:9' | '9:19' | '4:5' | '21:9'
  const [fitMode, setFitMode] = useState('fit'); // 'fit' (show full uncropped video) | 'fill'

  const detectedAspect = useMemo(
    () => formatAspectLabel(mediaDimensions.width, mediaDimensions.height),
    [mediaDimensions.width, mediaDimensions.height]
  );

  const activeAspectStyle = useMemo(() => {
    if (aspectPreset === '16:9') return '16 / 9';
    if (aspectPreset === '9:16') return '9 / 16';
    if (aspectPreset === '1:1') return '1 / 1';
    if (aspectPreset === '19:9') return '19 / 9';
    if (aspectPreset === '9:19') return '9 / 19';
    if (aspectPreset === '4:5') return '4 / 5';
    if (aspectPreset === '21:9') return '21 / 9';
    // 'auto': exact native decoded video dimensions!
    if (mediaDimensions.width > 0 && mediaDimensions.height > 0) {
      return `${mediaDimensions.width} / ${mediaDimensions.height}`;
    }
    return '16 / 9';
  }, [aspectPreset, mediaDimensions.width, mediaDimensions.height]);

  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadMedia(file);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const isMedia = file.type?.startsWith('image/') || 
                      file.type?.startsWith('video/') ||
                      /\.(png|jpe?g|webp|gif|bmp|svg|mp4|webm|mov|m4v|ogg|ogv)$/i.test(file.name);
      if (isMedia) {
        onUploadMedia(file);
      }
    }
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}s`;
  };

  const triggerFileInput = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      className="viewport-wrapper"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleCustomUpload}
      />

      {/* Error Banner Overlay */}
      {shaderError && (
        <div 
          className="error-diagnostic-bar"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }}
        >
          <AlertTriangle size={14} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Shader Compile Error: {shaderError}
          </span>
          <span className="badge" style={{ background: '#222222', color: '#ffffff' }}>
            Fallback Active
          </span>
        </div>
      )}

      {/* Top Floating Control Bar (When media exists) */}
      {hasMedia && (
        <div 
          style={{
            position: 'absolute',
            top: shaderError ? '34px' : '10px',
            left: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
            pointerEvents: 'none'
          }}
        >
          {/* Media Info & Aspect Ratio Chip */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(0, 0, 0, 0.9)', 
              borderRadius: 'var(--radius-pill)',
              padding: '3px 10px',
              border: '1px solid var(--border-default)',
              pointerEvents: 'auto'
            }}
          >
            <Film size={12} style={{ color: '#ffffff' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mediaName || 'imported_media'}
            </span>
            <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 5px' }}>
              {mediaDimensions.width}×{mediaDimensions.height}
            </span>
            <span className="badge" style={{ fontSize: '9px', padding: '1px 5px' }}>
              {detectedAspect}
            </span>
          </div>

          {/* Keyflaw Aspect Ratio & Fit Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
            {/* Aspect Ratio Selector (# icon as in Keyflaw Android) */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-pill)',
                padding: '2px 8px',
                height: '26px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#3d6ae1' }}>#</span>
              <select
                value={aspectPreset}
                onChange={(e) => setAspectPreset(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
                title="Select composition aspect ratio"
              >
                <option value="auto" style={{ background: '#111' }}>Auto ({detectedAspect})</option>
                <option value="16:9" style={{ background: '#111' }}>16:9 (Landscape)</option>
                <option value="9:16" style={{ background: '#111' }}>9:16 (Vertical Reels/TikTok)</option>
                <option value="1:1" style={{ background: '#111' }}>1:1 (Square)</option>
                <option value="19:9" style={{ background: '#111' }}>19:9 (Smartphone)</option>
                <option value="9:19" style={{ background: '#111' }}>9:19 (Vertical Phone)</option>
                <option value="4:5" style={{ background: '#111' }}>4:5 (Social Portrait)</option>
                <option value="4:3" style={{ background: '#111' }}>4:3 (Classic)</option>
                <option value="21:9" style={{ background: '#111' }}>21:9 (Ultrawide)</option>
              </select>
            </div>

            {/* Fit / Fill Mode Button ('Full' button as in Keyflaw Android) */}
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setFitMode(fitMode === 'fit' ? 'fill' : 'fit')}
              title={fitMode === 'fit' ? 'Fit: Full uncropped video visible' : 'Fill: Cropped to fill container'}
              style={{ fontSize: '10px', fontWeight: 600, height: '26px', padding: '0 8px' }}
            >
              <span>{fitMode === 'fit' ? 'FIT' : 'FILL'}</span>
            </button>

            {/* Replace Button */}
            <button
              className="btn btn-sm btn-outline"
              onClick={triggerFileInput}
              title="Replace current media file"
              style={{ height: '26px' }}
            >
              <RefreshCw size={11} />
              <span>Replace</span>
            </button>

            {/* Clear Media Button */}
            <button
              className="btn btn-sm btn-outline btn-icon-sm"
              onClick={onClearMedia}
              title="Remove media"
              style={{ height: '26px', width: '26px' }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area: ALWAYS MOUNTED and perfectly centered */}
      <div className="canvas-container">
        <canvas 
          ref={canvasRef} 
          className="webgl-canvas" 
          style={
            hasMedia
              ? {
                  aspectRatio: activeAspectStyle,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: fitMode === 'fill' ? '100%' : 'auto',
                  height: fitMode === 'fill' ? '100%' : 'auto',
                  objectFit: fitMode === 'fill' ? 'cover' : 'contain',
                  display: 'block',
                  margin: 'auto'
                }
              : { position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }
          } 
        />

        {/* Clean Empty Dropzone when no media is loaded */}
        {!hasMedia && (
          <div 
            className={`empty-media-dropzone ${isDragOver ? 'drag-active' : ''}`}
            onClick={triggerFileInput}
          >
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#141414',
                border: '1px solid #333333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}
            >
              <Upload size={20} style={{ color: '#ffffff' }} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ffffff', marginBottom: '6px' }}>
              IMPORT YOUR MEDIA
            </div>
            <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', maxWidth: '280px', marginBottom: '16px' }}>
              Drop your video or image file here to preview and tune Keyflaw shaders in real-time.
            </p>
            <button 
              type="button"
              className="btn btn-primary"
              onClick={triggerFileInput}
            >
              <Upload size={13} />
              <span>Select File from Device</span>
            </button>
            <span style={{ fontSize: '10px', color: 'var(--fg-muted)', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>
              Supports MP4, WebM, MOV, PNG, JPG, WebP
            </span>
          </div>
        )}
      </div>

      {/* Bottom Transport Scrubber Controls (When media exists) */}
      {hasMedia && (
        <div className="viewport-transport">
          <button 
            className="btn btn-ghost btn-icon-sm" 
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <button 
            className="btn btn-ghost btn-icon-sm" 
            onClick={onResetTime}
            title="Reset to 00:00"
          >
            <RotateCcw size={12} />
          </button>

          {/* Timecode Badge */}
          <span className="font-mono text-muted" style={{ fontSize: '11px', minWidth: '46px' }}>
            {formatTime(currentTime)}
          </span>

          {/* Video Scrubber */}
          <input
            type="range"
            min="0"
            max={duration || 10}
            step="0.05"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            style={{ width: '130px' }}
            title="Seek timeline"
          />

          <button
            className={`btn btn-sm ${isLooping ? 'btn-primary' : 'btn-outline'}`}
            onClick={onToggleLoop}
            title={isLooping ? 'Loop playback enabled' : 'Loop playback disabled'}
            style={{ fontSize: '10px', fontWeight: 600, height: '22px', padding: '0 8px' }}
          >
            {isLooping ? 'LOOP' : 'ONCE'}
          </button>
        </div>
      )}
    </div>
  );
}
