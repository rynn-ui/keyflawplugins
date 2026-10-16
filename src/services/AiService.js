/**
 * Keyflaw AI Service — Multi-Provider API Engine
 * Supports:
 * - Google Gemini (Official Free Tier via Google AI Studio)
 * - OpenRouter (Claude, Grok, DeepSeek, Qwen & free community models)
 * - xAI Grok (Official API)
 * - Anthropic Claude (Official API)
 * - OpenAI (GPT-4o / GPT-4o-mini)
 */

export const AI_PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    tag: 'Free Available',
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    models: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recommended • Interactions API)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
    ],
    defaultModel: 'gemini-3.8-flash'
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (All Models)',
    tag: 'Claude, Grok, DeepSeek & Free Models',
    keyHelpUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    models: [
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free Tier)' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free Tier)' },
      { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder (Free Tier)' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'x-ai/grok-2-1212', name: 'xAI Grok 2' },
      { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' }
    ],
    defaultModel: 'google/gemini-2.0-flash-exp:free'
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    tag: 'xAI Official',
    keyHelpUrl: 'https://console.x.ai/',
    keyPlaceholder: 'xai-...',
    models: [
      { id: 'grok-2-latest', name: 'Grok 2' },
      { id: 'grok-beta', name: 'Grok Beta' }
    ],
    defaultModel: 'grok-2-latest'
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    tag: 'Anthropic Official',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-api03-...',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ],
    defaultModel: 'claude-3-5-sonnet-20241022'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    tag: 'OpenAI Official',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ],
    defaultModel: 'gpt-4o'
  }
};

const STORAGE_KEY = 'keyflaw_ai_api_settings';

export function getAiSettings() {
  const defaultKeys = {
    gemini: '',
    openrouter: '',
    grok: '',
    claude: '',
    openai: ''
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.provider && AI_PROVIDERS[parsed.provider]) {
        const mergedKeys = { ...defaultKeys, ...(parsed.keys || {}) };
        if (parsed.apiKey && !mergedKeys[parsed.provider]) {
          mergedKeys[parsed.provider] = parsed.apiKey;
        }
        let model = parsed.model || AI_PROVIDERS[parsed.provider].defaultModel;
        if (model === 'gemini-2.0-flash' || model === 'gemini-2.5-flash') {
          model = 'gemini-3.8-flash';
        }
        return {
          provider: parsed.provider,
          apiKey: mergedKeys[parsed.provider] || '',
          model,
          keys: mergedKeys
        };
      }
    }
  } catch (_) {}

  // Check legacy gemini key if user configured earlier
  let legacyKey = '';
  try {
    const legacy = JSON.parse(localStorage.getItem('keyflaw_ai_settings') || '{}');
    if (legacy?.geminiApiKey) legacyKey = legacy.geminiApiKey;
  } catch (_) {}

  return {
    provider: 'gemini',
    apiKey: legacyKey,
    model: 'gemini-3.8-flash',
    keys: {
      ...defaultKeys,
      gemini: legacyKey
    }
  };
}

export function saveAiSettings(settings) {
  try {
    const toSave = {
      ...settings,
      apiKey: settings.keys?.[settings.provider] || settings.apiKey || ''
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (_) {}
}

const KEYFLAW_GLSL_SYSTEM_PROMPT = `You are the Keyflaw Shader AI Expert. You author real-time WebGL 1.0 GLSL fragment shaders and interactive parameter slider definitions for the Keyflaw visual effect engine.

ENGINE SPECIFICATION & CONSTRAINTS:
1. WebGL 1.0 GLSL ES fragment shader standard:
   - Must start with precision specifiers:
     #ifdef GL_FRAGMENT_PRECISION_HIGH
     precision highp float;
     #else
     precision mediump float;
     #endif
   - Standard uniforms provided automatically:
     uniform sampler2D uTexture;     // The video or image frame
     varying vec2 vTex;              // Normalized coordinates [0.0, 1.0]
     uniform float uTime;            // Playback time in seconds (use for animation)
     uniform vec2 uTexelSize;        // (1.0/width, 1.0/height) for pixel-stepping
   - Parameter uniforms:
     For every parameter in "parameters", a uniform is passed whose name is "u" + capitalized key:
     - key: "intensity"  -> uniform float uIntensity;
     - key: "speed"      -> uniform float uSpeed;
     - key: "radius"     -> uniform float uRadius;
     - key: "centerX"    -> uniform float uCenterX;
     - key: "invert"     -> uniform float uInvert; (0.0 or 1.0)
     Every parameter defined in "parameters" MUST have a corresponding uniform declared in the shader!
   - Sampling:
     Use texture2D(uTexture, coord).
     When distorting coordinates, clamp or wrap gracefully: clamp(coord, 0.0, 1.0).
   - Output:
     Write final color to gl_FragColor = vec4(rgb, alpha);

2. JSON RESPONSE FORMAT:
You MUST respond with valid RFC 8259 JSON only (no conversational text).
CRITICAL: Do NOT include JavaScript comments (// or /* */) inside the JSON.
CRITICAL: In the shaderCode string, escape newlines as \\n.
The JSON must match this exact schema:
{
  "id": "snake_case_id",
  "name": "Human Readable Effect Title",
  "category": "DISTORT",
  "description": "Short 1-sentence description of what this effect does.",
  "parameters": [
    {
      "key": "camelCaseKey",
      "label": "Readable Slider Label",
      "min": 0.0,
      "max": 2.0,
      "default": 1.0,
      "step": 0.01,
      "type": "float"
    }
  ],
  "shaderCode": "#ifdef GL_FRAGMENT_PRECISION_HIGH\\nprecision highp float;\\n#else\\nprecision mediump float;\\n#endif\\n\\nuniform sampler2D uTexture;\\nvarying vec2 vTex;\\n\\nvoid main() {\\n  gl_FragColor = texture2D(uTexture, vTex);\\n}"
}

Ensure the shader code compiles without syntax errors. Avoid non-standard WebGL extensions.`;

/**
 * 4-Tier Resilient JSON parser
 */
function extractJson(text) {
  if (!text) throw new Error('Empty response received from AI provider.');
  let s = text.trim();

  // 1. Strip markdown code fences ```json ... ``` or ``` ... ```
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // 2. Find outermost { and }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  // Attempt 1: Direct parse
  try {
    return JSON.parse(s);
  } catch (_) {}

  // Attempt 2: Sanitize JS comments and trailing commas
  let sanitized = s
    .replace(/(?<!:)\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,(\s*[\]}])/g, '$1');

  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // Attempt 3: Escape raw unescaped newlines/tabs inside string literals
  let inString = false;
  let escaped = false;
  let buffer = '';
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (char === '"' && !escaped) {
      inString = !inString;
      buffer += char;
    } else if (inString && (char === '\n' || char === '\r')) {
      buffer += '\\n';
    } else if (inString && char === '\t') {
      buffer += '\\t';
    } else {
      buffer += char;
    }
    escaped = (char === '\\' && !escaped);
  }

  try {
    return JSON.parse(buffer);
  } catch (_) {}

  // Attempt 4: Fallback AST/regex field extractor
  return fallbackExtractJson(text);
}

function fallbackExtractJson(raw) {
  const idMatch = raw.match(/"id"\s*:\s*"([^"]+)"/);
  const nameMatch = raw.match(/"name"\s*:\s*"([^"]+)"/);
  const catMatch = raw.match(/"category"\s*:\s*"([^"]+)"/);
  const descMatch = raw.match(/"description"\s*:\s*"([^"]+)"/);

  // Extract shaderCode: everything after "shaderCode": "
  let shaderCode = '';
  const shaderKeys = ['"shaderCode"', '"shader"', '"fragmentShader"', '"fragment_shader"', '"code"', '"glsl"'];
  for (const key of shaderKeys) {
    const shaderStart = raw.indexOf(key);
    if (shaderStart !== -1) {
      const colonIdx = raw.indexOf(':', shaderStart);
      const quoteOpen = raw.indexOf('"', colonIdx + 1);
      if (quoteOpen !== -1) {
        const rest = raw.slice(quoteOpen + 1);
        const quoteClose = rest.lastIndexOf('"');
        shaderCode = rest.slice(0, quoteClose !== -1 ? quoteClose : rest.length)
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"');
        break;
      }
    }
  }

  // Look for standalone glsl markdown block
  if (!shaderCode && raw.includes('gl_FragColor')) {
    const glslBlock = raw.match(/```(?:glsl)?\s*([\s\S]*?)```/);
    if (glslBlock) {
      shaderCode = glslBlock[1].trim();
    }
  }

  let parameters = [];
  const paramsStart = raw.indexOf('"parameters"');
  if (paramsStart !== -1) {
    const bracketOpen = raw.indexOf('[', paramsStart);
    if (bracketOpen !== -1) {
      let depth = 0;
      let bracketClose = -1;
      for (let i = bracketOpen; i < raw.length; i++) {
        if (raw[i] === '[') depth++;
        if (raw[i] === ']') {
          depth--;
          if (depth === 0) { bracketClose = i; break; }
        }
      }
      if (bracketClose !== -1) {
        const pStr = raw.slice(bracketOpen, bracketClose + 1)
          .replace(/(?<!:)\/\/.*$/gm, '')
          .replace(/,(\s*[\]}])/g, '$1');
        try {
          parameters = JSON.parse(pStr);
        } catch (_) {}
      }
    }
  }

  return {
    id: idMatch ? idMatch[1] : 'ai_effect_' + Date.now(),
    name: nameMatch ? nameMatch[1] : 'AI Custom Effect',
    category: catMatch ? catMatch[1] : 'DISTORT',
    description: descMatch ? descMatch[1] : 'Custom visual effect.',
    parameters,
    shaderCode
  };
}

/**
 * Ensures GLSL shader code compiles in WebGL 1.0, maps uniforms, and fixes syntax.
 */
function sanitizeAndWrapShader(rawShader, parameters = [], prompt = '') {
  let code = (rawShader || '').trim();

  if (code.startsWith('```')) {
    code = code.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Convert modern GLSL ES 3.0 fragColor to WebGL 1.0 gl_FragColor
  if (!code.includes('gl_FragColor')) {
    if (code.includes('fragColor')) {
      code = code.replace(/\bout\s+vec4\s+fragColor\s*;/g, '');
      code = code.replace(/\bfragColor\b/g, 'gl_FragColor');
    } else if (code.includes('outColor')) {
      code = code.replace(/\bout\s+vec4\s+outColor\s*;/g, '');
      code = code.replace(/\boutColor\b/g, 'gl_FragColor');
    }
  }

  // Wrap Shadertoy mainImage style if detected
  if (code.includes('mainImage') && !code.includes('void main()')) {
    code += `
void main() {
  vec4 color = vec4(0.0);
  mainImage(color, vTex * vec2(1920.0, 1080.0));
  gl_FragColor = color;
}
`;
  }

  // Fallback: If missing gl_FragColor or void main, synthesize working WebGL shader
  if (!code || !code.includes('gl_FragColor') || !code.includes('void main')) {
    const isDistort = /distort|lens|warp|fisheye|bend|wave|curve|ripple/i.test(prompt);
    const isColor = /color|tint|saturation|hue|contrast|brightness|invert/i.test(prompt);
    const isGlow = /glow|bloom|light|shine|neon|beam/i.test(prompt);

    const uniformDecls = parameters.map((p) => {
      const uName = 'u' + p.key.charAt(0).toUpperCase() + p.key.slice(1);
      return `uniform float ${uName};`;
    }).join('\n');

    if (isDistort) {
      code = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uTexture;
varying vec2 vTex;
uniform float uTime;
uniform vec2 uTexelSize;
${uniformDecls}

void main() {
  vec2 uv = vTex - 0.5;
  float r2 = dot(uv, uv);
  float distFactor = 0.5;
  ${parameters[0] ? `distFactor = u${parameters[0].key.charAt(0).toUpperCase() + parameters[0].key.slice(1)};` : ''}
  vec2 distorted = uv * (1.0 + distFactor * r2 * 2.5);
  vec2 finalUv = clamp(distorted + 0.5, 0.0, 1.0);
  gl_FragColor = texture2D(uTexture, finalUv);
}
`;
    } else if (isGlow) {
      code = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uTexture;
varying vec2 vTex;
uniform float uTime;
uniform vec2 uTexelSize;
${uniformDecls}

void main() {
  vec4 base = texture2D(uTexture, vTex);
  float intensity = 1.0;
  float radius = 3.0;
  ${parameters[0] ? `intensity = u${parameters[0].key.charAt(0).toUpperCase() + parameters[0].key.slice(1)};` : ''}
  ${parameters[1] ? `radius = u${parameters[1].key.charAt(0).toUpperCase() + parameters[1].key.slice(1)};` : ''}

  vec4 blur = vec4(0.0);
  blur += texture2D(uTexture, vTex + vec2(radius, 0.0) * uTexelSize) * 0.25;
  blur += texture2D(uTexture, vTex - vec2(radius, 0.0) * uTexelSize) * 0.25;
  blur += texture2D(uTexture, vTex + vec2(0.0, radius) * uTexelSize) * 0.25;
  blur += texture2D(uTexture, vTex - vec2(0.0, radius) * uTexelSize) * 0.25;

  gl_FragColor = base + blur * intensity;
}
`;
    } else {
      code = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uTexture;
varying vec2 vTex;
uniform float uTime;
uniform vec2 uTexelSize;
${uniformDecls}

void main() {
  vec4 col = texture2D(uTexture, vTex);
  ${parameters[0] ? `col.rgb *= u${parameters[0].key.charAt(0).toUpperCase() + parameters[0].key.slice(1)};` : ''}
  gl_FragColor = col;
}
`;
    }
  }

  // Prepend precision specifier if omitted
  if (!code.includes('precision')) {
    code = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

` + code;
  }

  // Ensure standard uniforms
  if (!code.includes('uTexture')) code = `uniform sampler2D uTexture;\n` + code;
  if (!code.includes('vTex')) code = `varying vec2 vTex;\n` + code;

  // Ensure every parameter uniform is declared
  for (const p of parameters) {
    const uName = 'u' + p.key.charAt(0).toUpperCase() + p.key.slice(1);
    if (!code.includes(uName)) {
      code = `uniform float ${uName};\n` + code;
    }
  }

  return code;
}

/**
 * Normalizes and validates the effect output.
 */
function normalizeEffectData(data, userPrompt = '') {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid effect payload received.');
  }

  const id = (data.id || 'ai_effect_' + Date.now()).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const name = data.name || data.title || 'AI Custom Effect';
  const category = (data.category || 'DISTORT').toUpperCase();
  const description = data.description || 'Custom visual effect created with Keyflaw AI.';

  const rawParams = data.parameters || data.params || data.uniforms || data.sliders || [];
  const parameters = Array.isArray(rawParams) ? rawParams.map((p, idx) => ({
    key: p.key || p.name?.toLowerCase().replace(/\s+/g, '_') || `param_${idx}`,
    label: p.label || p.name || p.key || `Param ${idx + 1}`,
    min: typeof p.min === 'number' ? p.min : (p.type === 'boolean' ? 0 : 0.0),
    max: typeof p.max === 'number' ? p.max : (p.type === 'boolean' ? 1 : 2.0),
    default: typeof p.default === 'number' ? p.default : (p.type === 'boolean' ? 0 : 1.0),
    step: typeof p.step === 'number' ? p.step : (p.type === 'boolean' ? 1 : 0.01),
    type: p.type === 'boolean' || (p.min === 0 && p.max === 1 && p.step === 1) ? 'boolean' : 'float'
  })) : [];

  const rawShader = data.shaderCode || 
                    data.shader || 
                    data.fragmentShader || 
                    data.fragment_shader || 
                    data.shader_code || 
                    data.code || 
                    data.glsl || 
                    data.fragment || 
                    '';

  const shaderCode = sanitizeAndWrapShader(rawShader, parameters, userPrompt);

  return {
    id,
    name,
    category,
    description,
    parameters,
    shaderCode
  };
}

/* ========================================================
   PROVIDER API CALLERS
   ======================================================== */

// 1. Google Gemini API (Interactions API + generateContent Fallback)
async function callGeminiInteractions(prompt, apiKey, model = 'gemini-3.8-flash') {
  const cleanModel = (model || 'gemini-3.8-flash').replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      model: cleanModel,
      input: `${KEYFLAW_GLSL_SYSTEM_PROMPT}\n\nUSER REQUEST:\n${prompt}`,
      responseFormat: {
        mimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Gemini Interactions API error (HTTP ${response.status})`;
    try {
      const p = JSON.parse(errBody);
      if (p.error?.message) msg = p.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.interaction?.outputText || data.outputText || data.output?.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No outputText returned by Gemini Interactions API.');
  return extractJson(text);
}

async function callGeminiGenerateContent(prompt, apiKey, model = 'gemini-1.5-flash') {
  const cleanModel = (model || 'gemini-1.5-flash').replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: KEYFLAW_GLSL_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Gemini API error (HTTP ${response.status})`;
    try {
      const p = JSON.parse(errBody);
      if (p.error?.message) msg = p.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response text returned by Gemini.');
  return extractJson(text);
}

async function callGemini(prompt, apiKey, model = 'gemini-3.8-flash') {
  if (!apiKey) throw new Error('Google Gemini API Key is missing. Please enter your API key in AI Settings.');

  let cleanModel = (model || 'gemini-3.8-flash').replace(/^models\//, '');
  if (cleanModel === 'gemini-2.0-flash' || cleanModel === 'gemini-2.5-flash') {
    cleanModel = 'gemini-3.8-flash';
  }

  // 1. If gemini-3.8-flash, call Google's Interactions API
  if (cleanModel.startsWith('gemini-3')) {
    try {
      return await callGeminiInteractions(prompt, apiKey, cleanModel);
    } catch (err) {
      console.warn('[Keyflaw AI] Interactions API failed, falling back to generateContent on gemini-1.5-flash:', err.message);
      try {
        return await callGeminiGenerateContent(prompt, apiKey, 'gemini-1.5-flash');
      } catch (_) {
        throw err;
      }
    }
  }

  // 2. Otherwise try generateContent first
  try {
    return await callGeminiGenerateContent(prompt, apiKey, cleanModel);
  } catch (err) {
    // If Google says model is deprecated/unavailable to new users, switch to Interactions API
    if (err.message?.includes('no longer available') || err.message?.includes('Interactions API')) {
      console.warn('[Keyflaw AI] Legacy model unavailable. Migrating to Interactions API (gemini-3.8-flash)...');
      return await callGeminiInteractions(prompt, apiKey, 'gemini-3.8-flash');
    }
    throw err;
  }
}

// 2. OpenRouter API (Claude, Grok, DeepSeek, GPT-4o, Free Tier)
async function callOpenRouter(prompt, apiKey, model = 'google/gemini-2.0-flash-exp:free') {
  if (!apiKey) throw new Error('OpenRouter API Key is missing. Please enter your API key in AI Settings.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://rynn-ui.github.io/keyflawplugins/',
      'X-Title': 'Keyflaw Studio'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: KEYFLAW_GLSL_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `OpenRouter API error (HTTP ${response.status})`;
    try {
      const p = JSON.parse(errBody);
      if (p.error?.message) msg = p.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content returned by OpenRouter.');
  return extractJson(text);
}

// 3. xAI Grok API
async function callGrok(prompt, apiKey, model = 'grok-2-latest') {
  if (!apiKey) throw new Error('xAI Grok API Key is missing. Please enter your API key in AI Settings.');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: KEYFLAW_GLSL_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `xAI Grok API error (HTTP ${response.status})`;
    try {
      const p = JSON.parse(errBody);
      if (p.error?.message) msg = p.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content returned by Grok.');
  return extractJson(text);
}

// 4. Anthropic Claude API (Client Direct)
async function callClaude(prompt, apiKey, model = 'claude-3-5-sonnet-20241022') {
  if (!apiKey) throw new Error('Anthropic Claude API Key is missing. Please enter your API key in AI Settings.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      system: KEYFLAW_GLSL_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Claude API error (HTTP ${response.status})`;
    try {
      const p = JSON.parse(errBody);
      if (p.error?.message) msg = p.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('No content returned by Claude.');
  return extractJson(text);
}

// 5. OpenAI API
async function callOpenAI(prompt, apiKey, model = 'gpt-4o') {
  if (!apiKey) throw new Error('OpenAI API Key is missing. Please enter your API key in AI Settings.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: KEYFLAW_GLSL_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `OpenAI API error (HTTP ${response.status})`;
    try {
      const p = JSON.parse(errBody);
      if (p.error?.message) msg = p.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content returned by OpenAI.');
  return extractJson(text);
}

/**
 * Dispatches the prompt to the user's active API provider.
 */
async function dispatchToActiveProvider(prompt) {
  const settings = getAiSettings();
  const providerId = settings.provider || 'gemini';
  const apiKey = (settings.keys && settings.keys[providerId]) || settings.apiKey || '';
  const model = settings.model || AI_PROVIDERS[providerId]?.defaultModel;

  if (!apiKey) {
    const providerName = AI_PROVIDERS[providerId]?.name || providerId;
    throw new Error(`Please configure your ${providerName} API Key in AI Settings to use AI Studio.`);
  }

  switch (providerId) {
    case 'gemini':
      return await callGemini(prompt, apiKey, model);
    case 'openrouter':
      return await callOpenRouter(prompt, apiKey, model);
    case 'grok':
      return await callGrok(prompt, apiKey, model);
    case 'claude':
      return await callClaude(prompt, apiKey, model);
    case 'openai':
      return await callOpenAI(prompt, apiKey, model);
    default:
      throw new Error(`Unsupported AI provider: ${providerId}`);
  }
}

/**
 * 1. Generate a brand new visual effect from user description.
 */
export async function generateNewEffect(userPrompt) {
  const fullPrompt = `Create a complete new Keyflaw visual effect based on this request:
"${userPrompt}"

Ensure you include 2 to 6 expressive parameter sliders/toggles so the user can tweak the visual effect in real-time. Make the shader visually compelling, high performance, and adhere to WebGL 1.0 specifications.`;

  const result = await dispatchToActiveProvider(fullPrompt);
  return normalizeEffectData(result, userPrompt);
}

/**
 * 2. Modify an existing effect with new tweaks or parameter requests.
 */
export async function modifyExistingEffect(userInstruction, currentEffect, currentShader) {
  const fullPrompt = `Modify the following existing Keyflaw visual effect based on user instructions.

CURRENT EFFECT:
- ID: ${currentEffect.id}
- Name: ${currentEffect.name}
- Category: ${currentEffect.category}
- Current Parameters:
${JSON.stringify(currentEffect.parameters, null, 2)}

CURRENT GLSL SHADER:
\`\`\`glsl
${currentShader}
\`\`\`

USER MODIFICATION REQUEST:
"${userInstruction}"

Return the complete updated JSON with modified/added parameters and full updated shader code. Keep working features intact unless asked to replace them.`;

  const result = await dispatchToActiveProvider(fullPrompt);
  return normalizeEffectData(result, userInstruction);
}

/**
 * 3. Fix a WebGL shader compile error.
 */
export async function fixShaderError(errorMessage, currentShader, currentParameters = []) {
  const fullPrompt = `The following WebGL fragment shader failed to compile with this exact compiler error:

ERROR LOG:
${errorMessage}

CURRENT PARAMETERS:
${JSON.stringify(currentParameters, null, 2)}

CURRENT FAILING SHADER:
\`\`\`glsl
${currentShader}
\`\`\`

Analyze the error log, locate the invalid syntax, undeclared identifier, type mismatch, or missing uniform, and return the fixed, fully working shader in the standard JSON structure.`;

  const result = await dispatchToActiveProvider(fullPrompt);
  return normalizeEffectData(result, 'fix error');
}
