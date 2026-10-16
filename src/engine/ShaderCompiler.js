/**
 * Maps an effect parameter key to its GLSL uniform name.
 * e.g. "power" -> "uPower", "centerX" -> "uCenterX", "uTime" -> "uTime"
 */
export function toUniformName(key) {
  if (!key) return '';
  if (key.startsWith('u') && key.length > 1 && key[1] === key[1].toUpperCase()) {
    return key;
  }
  return 'u' + key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Standard Vertex Shader for rendering a full-screen quad textured from source.
 */
export const DEFAULT_VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vTex;

void main() {
  vTex = (aPosition + 1.0) * 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Standard Passthrough Fragment Shader fallback.
 */
export const PASSTHROUGH_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uTexture;
varying vec2 vTex;

void main() {
  gl_FragColor = texture2D(uTexture, vTex);
}
`;

/**
 * Compiles and links a WebGL program.
 * Returns { program, error, lineErrors }
 */
export function compileProgram(gl, fragmentShaderSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, DEFAULT_VERTEX_SHADER);
  gl.compileShader(vs);

  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const vsErr = gl.getShaderInfoLog(vs);
    gl.deleteShader(vs);
    return { program: null, error: `Vertex Shader Error: ${vsErr}`, lineErrors: [] };
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fragmentShaderSource);
  gl.compileShader(fs);

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const fsErr = gl.getShaderInfoLog(fs);
    const lineErrors = parseShaderErrors(fsErr);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return { program: null, error: fsErr, lineErrors };
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const linkErr = gl.getProgramInfoLog(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteProgram(program);
    return { program: null, error: `Linker Error: ${linkErr}`, lineErrors: [] };
  }

  // Shaders can be detached once linked
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return { program, error: null, lineErrors: [] };
}

/**
 * Parses WebGL shader log into structured line error objects.
 * Typical log lines: "ERROR: 0:24: 'uPower' : undeclared identifier"
 */
export function parseShaderErrors(log) {
  if (!log) return [];
  const lines = log.split('\n');
  const errors = [];

  for (const line of lines) {
    const match = line.match(/ERROR:\s*([0-9]+):([0-9]+):\s*(.*)/i);
    if (match) {
      errors.push({
        line: parseInt(match[2], 10),
        message: match[3]?.trim() || line
      });
    }
  }

  return errors;
}
