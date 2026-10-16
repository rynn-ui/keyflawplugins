/**
 * Keyflaw AI Service
 * Supports:
 * 1. Default Built-in Free AI (Pollinations text API, zero-setup, zero key needed)
 * 2. Google Gemini Free Tier API (Using user's free API key from Google AI Studio)
 */

const STORAGE_KEY = 'keyflaw_ai_settings';

export function getAiSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {
    provider: 'free', // 'free' | 'gemini'
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash'
  };
}

export function saveAiSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
     - key: "invert" (boolean) -> uniform float uInvert; (0.0 or 1.0)
     Every parameter defined in "parameters" MUST have a corresponding uniform declared in the shader!
   - Sampling:
     Use texture2D(uTexture, coord).
     When distorting coordinates, clamp or wrap gracefully: clamp(coord, 0.0, 1.0).
   - Output:
     Write final color to gl_FragColor = vec4(rgb, alpha);

2. JSON RESPONSE FORMAT:
You MUST respond with raw JSON only (no conversational text). The JSON must match this exact schema:
{
  "id": "snake_case_id",
  "name": "Human Readable Effect Title",
  "category": "DISTORT" | "COLOR" | "LIGHT" | "BLUR" | "RETRO" | "GLITCH" | "STYLIZED",
  "description": "Short 1-sentence description of what this effect does.",
  "parameters": [
    {
      "key": "camelCaseKey",
      "label": "Readable Slider Label",
      "min": 0.0,
      "max": 2.0,
      "default": 1.0,
      "step": 0.01,
      "type": "float" // or "boolean"
    }
  ],
  "shaderCode": "#ifdef GL_FRAGMENT_PRECISION_HIGH\\nprecision highp float;\\n..."
}

Ensure the shader code compiles without syntax errors. Avoid non-standard WebGL extensions.`;

/**
 * Strips markdown code blocks and extracts raw JSON from an AI response.
 */
function extractJson(text) {
  if (!text) throw new Error('Empty response from AI service');
  let clean = text.trim();
  // Remove markdown fences: ```json ... ``` or ``` ... ```
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  // If text contains JSON embedded inside other text, find the outermost { }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(clean);
}

/**
 * Calls the Pollinations free text inference API.
 */
async function callPollinations(prompt, systemInstruction = KEYFLAW_GLSL_SYSTEM_PROMPT) {
  const response = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      model: 'openai',
      jsonMode: true,
      seed: Math.floor(Math.random() * 100000)
    })
  });

  if (!response.ok) {
    throw new Error(`Free AI endpoint returned HTTP ${response.status}`);
  }

  const rawText = await response.text();
  return extractJson(rawText);
}

/**
 * Calls Google Gemini Free Tier API.
 */
async function callGemini(prompt, apiKey, model = 'gemini-2.0-flash', systemInstruction = KEYFLAW_GLSL_SYSTEM_PROMPT) {
  if (!apiKey) {
    throw new Error('Google Gemini API Key is missing. Please enter your free key in AI Settings.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `Gemini API error (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed.error?.message) msg = parsed.error.message;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) throw new Error('No candidate response received from Gemini.');
  return extractJson(candidate);
}

/**
 * Normalizes and validates the effect JSON output from the AI.
 */
function normalizeEffectData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid effect payload received.');
  }

  const id = (data.id || 'ai_effect_' + Date.now()).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const name = data.name || 'AI Custom Effect';
  const category = (data.category || 'STYLIZED').toUpperCase();
  const description = data.description || 'Custom AI-generated Keyflaw visual effect.';
  const parameters = Array.isArray(data.parameters) ? data.parameters.map((p, idx) => ({
    key: p.key || `param_${idx}`,
    label: p.label || p.name || p.key || `Param ${idx + 1}`,
    min: typeof p.min === 'number' ? p.min : 0.0,
    max: typeof p.max === 'number' ? p.max : 2.0,
    default: typeof p.default === 'number' ? p.default : 1.0,
    step: typeof p.step === 'number' ? p.step : 0.01,
    type: p.type === 'boolean' || (p.min === 0 && p.max === 1 && p.step === 1) ? 'boolean' : 'float'
  })) : [];

  let shaderCode = data.shaderCode || '';
  if (!shaderCode.includes('gl_FragColor')) {
    throw new Error('Generated shader code is missing gl_FragColor assignment.');
  }

  return {
    id,
    name,
    category,
    description,
    parameters,
    shaderCode
  };
}

/**
 * 1. Generate a brand new visual effect from user description.
 */
export async function generateNewEffect(userPrompt) {
  const settings = getAiSettings();
  const fullPrompt = `Create a complete new Keyflaw visual effect based on this request:
"${userPrompt}"

Ensure you include 2 to 6 expressive parameter sliders/toggles so the user can tweak the visual effect in real-time. Make the shader visually compelling and high performance.`;

  let result;
  if (settings.provider === 'gemini' && settings.geminiApiKey) {
    result = await callGemini(fullPrompt, settings.geminiApiKey, settings.geminiModel);
  } else {
    result = await callPollinations(fullPrompt);
  }

  return normalizeEffectData(result);
}

/**
 * 2. Modify an existing effect with new tweaks or parameter requests.
 */
export async function modifyExistingEffect(userInstruction, currentEffect, currentShader) {
  const settings = getAiSettings();
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

  let result;
  if (settings.provider === 'gemini' && settings.geminiApiKey) {
    result = await callGemini(fullPrompt, settings.geminiApiKey, settings.geminiModel);
  } else {
    result = await callPollinations(fullPrompt);
  }

  return normalizeEffectData(result);
}

/**
 * 3. Fix a WebGL shader compile error.
 */
export async function fixShaderError(errorMessage, currentShader, currentParameters = []) {
  const settings = getAiSettings();
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

  let result;
  if (settings.provider === 'gemini' && settings.geminiApiKey) {
    result = await callGemini(fullPrompt, settings.geminiApiKey, settings.geminiModel);
  } else {
    result = await callPollinations(fullPrompt);
  }

  return normalizeEffectData(result);
}
