import { compileProgram, PASSTHROUGH_FRAGMENT_SHADER, toUniformName } from './ShaderCompiler';

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!this.gl) {
      throw new Error('WebGL is not supported by your browser.');
    }

    const gl = this.gl;
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.activeProgram = null;
    this.fallbackProgram = null;
    this.lastError = null;
    this.lastLineErrors = [];

    // Compile fallback passthrough program
    const fallbackRes = compileProgram(gl, PASSTHROUGH_FRAGMENT_SHADER);
    this.fallbackProgram = fallbackRes.program;

    // Start with fallback
    this.activeProgram = this.fallbackProgram;
  }

  /**
   * Updates and hot-reloads the active fragment shader.
   * @param {string} fragmentShaderSource
   * @returns {{ success: boolean, error: string | null, lineErrors: Array }}
   */
  setShaderSource(fragmentShaderSource) {
    if (!this.gl || !fragmentShaderSource) {
      return { success: false, error: 'Empty shader source', lineErrors: [] };
    }

    const res = compileProgram(this.gl, fragmentShaderSource);
    if (res.error) {
      this.lastError = res.error;
      this.lastLineErrors = res.lineErrors;
      return { success: false, error: res.error, lineErrors: res.lineErrors };
    }

    // Free previous non-fallback program
    if (this.activeProgram && this.activeProgram !== this.fallbackProgram) {
      this.gl.deleteProgram(this.activeProgram);
    }

    this.activeProgram = res.program;
    this.lastError = null;
    this.lastLineErrors = [];
    return { success: true, error: null, lineErrors: [] };
  }

  /**
   * Renders a frame using the media element and current parameter uniform values.
   * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} sourceElement
   * @param {Array} parameters - List of parameter descriptors from effect.json
   * @param {Object} paramValues - Map of { key: value }
   * @param {number} timeSeconds - Current composition playback time
   */
  renderFrame(sourceElement, parameters = [], paramValues = {}, timeSeconds = 0) {
    const gl = this.gl;
    if (!gl || !sourceElement) return;

    const program = this.activeProgram || this.fallbackProgram;
    if (!program) return;

    // Get exact intrinsic source dimensions (videoWidth for video, naturalWidth for image)
    const srcWidth = (sourceElement.videoWidth > 0 ? sourceElement.videoWidth : null) ||
                     (sourceElement.naturalWidth > 0 ? sourceElement.naturalWidth : null) ||
                     sourceElement.width || 1280;
    const srcHeight = (sourceElement.videoHeight > 0 ? sourceElement.videoHeight : null) ||
                      (sourceElement.naturalHeight > 0 ? sourceElement.naturalHeight : null) ||
                      sourceElement.height || 720;

    // Cap to GPU MAX_TEXTURE_SIZE to prevent WebGL buffer overflow
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    let targetWidth = srcWidth;
    let targetHeight = srcHeight;
    if (targetWidth > maxTexSize || targetHeight > maxTexSize) {
      const scale = Math.min(maxTexSize / targetWidth, maxTexSize / targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
    }

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set pixel store parameters for non-standard, odd, and phone aspect ratios
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceElement);
    } catch (e) {
      // Occurs if video frame is temporarily unreadable
      return;
    }

    gl.useProgram(program);

    // Bind Quad Vertex Buffer
    const aPosLoc = gl.getAttribLocation(program, 'aPosition');
    if (aPosLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Bind Standard Engine Uniforms
    const uTextureLoc = gl.getUniformLocation(program, 'uTexture');
    if (uTextureLoc) gl.uniform1i(uTextureLoc, 0);

    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    if (uTimeLoc) gl.uniform1f(uTimeLoc, timeSeconds);

    const uTexelSizeLoc = gl.getUniformLocation(program, 'uTexelSize');
    if (uTexelSizeLoc) {
      gl.uniform2f(uTexelSizeLoc, 1.0 / this.canvas.width, 1.0 / this.canvas.height);
    }

    // Bind Dynamic Parameter Sliders
    for (const param of parameters) {
      const uName = toUniformName(param.key);
      const loc = gl.getUniformLocation(program, uName);
      if (loc) {
        let val = paramValues[param.key];
        if (val === undefined || val === null) {
          val = param.default !== undefined ? param.default : 0.0;
        }
        gl.uniform1f(loc, parseFloat(val));
      }
    }

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.activeProgram && this.activeProgram !== this.fallbackProgram) {
      gl.deleteProgram(this.activeProgram);
    }
    if (this.fallbackProgram) gl.deleteProgram(this.fallbackProgram);
  }
}
