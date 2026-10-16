import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileJson, 
  FileText, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';

export function FileTree({
  files = {},
  activeFilePath,
  onSelectFile,
  activeEffectId,
  onSelectEffect
}) {
  const [collapsedFolders, setCollapsedFolders] = useState({});

  const toggleFolder = (folderKey) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  const filePaths = Object.keys(files).sort();
  const rootFiles = filePaths.filter((p) => !p.includes('/'));

  const effectFoldersMap = {};
  for (const path of filePaths) {
    if (path.startsWith('effects/')) {
      const parts = path.split('/');
      const effectId = parts[1];
      if (!effectFoldersMap[effectId]) effectFoldersMap[effectId] = [];
      effectFoldersMap[effectId].push(path);
    }
  }

  const getFileIcon = (path) => {
    if (path.endsWith('.glsl')) return <FileCode size={13} style={{ color: '#ffffff' }} />;
    if (path.endsWith('.json')) return <FileJson size={13} style={{ color: 'var(--fg-secondary)' }} />;
    return <FileText size={13} style={{ color: 'var(--fg-muted)' }} />;
  };

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <span>Files Explorer</span>
        <span className="badge">{filePaths.length} Files</span>
      </div>

      <div style={{ padding: '6px 0' }}>
        {/* Root Files */}
        {rootFiles.map((path) => (
          <div
            key={path}
            className={`tree-node ${activeFilePath === path ? 'active' : ''}`}
            onClick={() => onSelectFile(path)}
          >
            {getFileIcon(path)}
            <span>{path}</span>
          </div>
        ))}

        {/* Effects Directory Header */}
        <div
          className="tree-node tree-folder"
          onClick={() => toggleFolder('effects')}
          style={{ marginTop: '4px' }}
        >
          {collapsedFolders['effects'] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          {collapsedFolders['effects'] ? <Folder size={13} style={{ color: '#ffffff' }} /> : <FolderOpen size={13} style={{ color: '#ffffff' }} />}
          <span>effects/</span>
        </div>

        {/* Effects Subfolders */}
        {!collapsedFolders['effects'] && (
          <div style={{ paddingLeft: '12px' }}>
            {Object.entries(effectFoldersMap).map(([effectId, subPaths]) => {
              const isFolderCollapsed = collapsedFolders[`effects/${effectId}`];
              const isCurrentActiveEffect = activeEffectId === effectId;

              return (
                <div key={effectId}>
                  <div
                    className="tree-node tree-folder"
                    onClick={() => {
                      toggleFolder(`effects/${effectId}`);
                      onSelectEffect(effectId);
                    }}
                    style={{
                      color: isCurrentActiveEffect ? '#ffffff' : 'var(--fg-secondary)',
                      background: isCurrentActiveEffect ? '#181818' : 'transparent'
                    }}
                  >
                    {isFolderCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {isFolderCollapsed ? <Folder size={12} style={{ color: '#888888' }} /> : <FolderOpen size={12} style={{ color: '#888888' }} />}
                    <span>{effectId}</span>
                    {isCurrentActiveEffect && (
                      <span className="badge badge-active" style={{ marginLeft: 'auto', fontSize: '8px', padding: '1px 4px' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Files inside effects/<id>/ */}
                  {!isFolderCollapsed && (
                    <div style={{ paddingLeft: '12px' }}>
                      {subPaths.map((path) => {
                        const fileName = path.split('/').pop();
                        return (
                          <div
                            key={path}
                            className={`tree-node ${activeFilePath === path ? 'active' : ''}`}
                            onClick={() => {
                              onSelectFile(path);
                              onSelectEffect(effectId);
                            }}
                          >
                            {getFileIcon(path)}
                            <span>{fileName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
