import JSZip from 'jszip';

/**
 * Re-bundles virtual files into a .kfpack (ZIP) archive and triggers browser download.
 * @param {Object} files - Map of filepath -> string content
 * @param {string} filename - Output filename (e.g. "my_effects.kfpack")
 */
export async function exportKfpack(files, filename = 'custom_suite.kfpack') {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  downloadBlob(blob, filename.endsWith('.kfpack') ? filename : `${filename}.kfpack`);
}

/**
 * Exports an isolated single effect as a standalone .kfpack.
 * @param {Object} effect - The effect object { id, name, category, parameters, shaderCode }
 * @param {Object} suite - The parent suite info
 */
export async function exportSingleEffectPack(effect, suite) {
  const zip = new JSZip();

  const singleSuiteMeta = {
    id: `${effect.id}_pack`,
    name: `${effect.name} (Single)`,
    author: suite?.author || 'Keyflaw Creator',
    version: '1.0.0',
    description: `Standalone effect package for ${effect.name}`
  };

  const effectMeta = {
    id: effect.id,
    name: effect.name,
    category: effect.category || 'Custom',
    parameters: effect.parameters || []
  };

  zip.file('suite.json', JSON.stringify(singleSuiteMeta, null, 2));
  zip.file(`effects/${effect.id}/effect.json`, JSON.stringify(effectMeta, null, 2));
  zip.file(`effects/${effect.id}/shader.glsl`, effect.shaderCode || '');

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  downloadBlob(blob, `${effect.id}.kfpack`);
}

/**
 * Triggers browser download of a given Blob.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
