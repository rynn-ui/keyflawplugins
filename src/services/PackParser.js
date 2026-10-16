import JSZip from 'jszip';

/**
 * Parses a .kfpack (ZIP archive) into structured metadata, effect list, and virtual files.
 * @param {File | Blob | ArrayBuffer} fileOrBuffer
 * @returns {Promise<{suite: Object, effects: Array, files: Object}>}
 */
export async function parseKfpack(fileOrBuffer) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileOrBuffer);
  const files = {};

  // 1. Read all files into memory
  const fileEntries = Object.keys(loadedZip.files);
  for (const relativePath of fileEntries) {
    const entry = loadedZip.files[relativePath];
    if (!entry.dir) {
      files[relativePath] = await entry.async('string');
    }
  }

  // 2. Parse suite.json (required at root)
  let suite = {
    id: 'custom_suite',
    name: 'Custom Effect Suite',
    author: 'Keyflaw Creator',
    version: '1.0.0',
    description: 'Custom Keyflaw Visual Effects'
  };

  if (files['suite.json']) {
    try {
      suite = JSON.parse(files['suite.json']);
    } catch (e) {
      console.warn('Failed to parse suite.json, using defaults:', e);
    }
  }

  // 3. Discover all effects under effects/<id>/
  const effectsMap = new Map();
  for (const path of Object.keys(files)) {
    const match = path.match(/^effects\/([^/]+)\/(effect\.json|shader\.glsl)$/);
    if (match) {
      const effectId = match[1];
      const fileType = match[2];

      if (!effectsMap.has(effectId)) {
        effectsMap.set(effectId, {
          id: effectId,
          name: effectId,
          category: suite.name || 'Custom',
          parameters: [],
          shaderCode: '',
          effectJsonStr: ''
        });
      }

      const effectObj = effectsMap.get(effectId);
      if (fileType === 'effect.json') {
        effectObj.effectJsonStr = files[path];
        try {
          const parsedMeta = JSON.parse(files[path]);
          effectObj.id = parsedMeta.id || effectId;
          effectObj.name = parsedMeta.name || effectId;
          effectObj.category = parsedMeta.category || suite.name || 'Custom';
          effectObj.parameters = parsedMeta.parameters || [];
        } catch (e) {
          console.warn(`Failed to parse ${path}:`, e);
        }
      } else if (fileType === 'shader.glsl') {
        effectObj.shaderCode = files[path];
      }
    }
  }

  const effects = Array.from(effectsMap.values());

  return {
    suite,
    effects,
    files
  };
}
