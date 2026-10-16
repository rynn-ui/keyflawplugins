import { parseKfpack } from './PackParser';

export const SAMPLE_SUITES = [];

/**
 * Loads a built-in sample suite by ID.
 * @param {string} suiteId
 * @returns {Promise<{suite: Object, effects: Array, files: Object}>}
 */
export async function loadSampleSuite(suiteId) {
  const meta = SAMPLE_SUITES.find((s) => s.id === suiteId) || SAMPLE_SUITES[0];
  // Note: Vite base relative URL resolution
  const basePath = import.meta.env.BASE_URL || './';
  const url = `${basePath.endsWith('/') ? basePath : basePath + '/'}${meta.file}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load sample suite from ${url}: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return parseKfpack(arrayBuffer);
}
