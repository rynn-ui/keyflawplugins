import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { StreamLanguage } from '@codemirror/language';
import { c } from '@codemirror/legacy-modes/mode/clike';
import { FileCode, AlertCircle, Check, Sparkles } from 'lucide-react';

const glslLanguage = StreamLanguage.define(c);

export function CodeEditor({
  activeFilePath,
  code,
  onChangeCode,
  lineErrors = [],
  openFiles = [],
  onSelectFile,
  onOpenAiStudio
}) {
  const isJson = activeFilePath?.endsWith('.json');

  const extensions = useMemo(() => {
    const exts = [];
    if (isJson) {
      exts.push(json());
    } else {
      exts.push(glslLanguage);
    }
    return exts;
  }, [isJson]);

  return (
    <div className="editor-wrapper">
      {/* File Tabs Bar */}
      <div className="editor-tabs-bar">
        {openFiles.map((path) => {
          const fileName = path.split('/').pop();
          const isActive = path === activeFilePath;
          return (
            <button
              key={path}
              className={`editor-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFile(path)}
            >
              <FileCode size={12} style={{ color: isActive ? '#ffffff' : 'var(--fg-muted)' }} />
              <span>{fileName}</span>
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {lineErrors.length > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                style={{ borderColor: '#ef4444', color: '#f87171', gap: '4px' }}
                onClick={() => onOpenAiStudio?.('fix')}
                title="Automatically fix compile error with AI"
              >
                <Sparkles size={11} />
                <span>Fix with AI</span>
              </button>
              <span className="badge" style={{ background: '#222222', color: '#ffffff' }}>
                <AlertCircle size={10} />
                <span>{lineErrors.length} ERRORS</span>
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                style={{ color: '#c084fc', gap: '4px' }}
                onClick={() => onOpenAiStudio?.('modify')}
                title="Ask AI to modify this shader code"
              >
                <Sparkles size={11} />
                <span>AI Edit</span>
              </button>
              <span className="badge" style={{ background: '#111111', color: 'var(--fg-secondary)' }}>
                <Check size={10} />
                <span>COMPILED</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
        <CodeMirror
          value={code || ''}
          height="100%"
          theme="dark"
          extensions={extensions}
          onChange={(val) => onChangeCode(val)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true
          }}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            height: '100%'
          }}
        />
      </div>

      {/* Inline Line Errors Panel */}
      {lineErrors.length > 0 && (
        <div 
          style={{ 
            padding: '8px 12px', 
            background: '#111111', 
            borderTop: '1px solid var(--border-default)',
            maxHeight: '80px',
            overflowY: 'auto',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#ffffff'
          }}
        >
          {lineErrors.map((err, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
              <span style={{ color: '#888888', fontWeight: 600 }}>Line {err.line}:</span>
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
