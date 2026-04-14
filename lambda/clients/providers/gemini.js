import {
  GEMINI_MODEL,
  GEMINI_JUDGE_MODEL,
  GEMINI_BASE_URL,
  GEMINI_GENERATE_ACTION,
  GEMINI_HEADERS,
  GEMINI_CONFIG,
  GEMINI_JUDGE_CONFIG,
  HTTP_METHODS,
} from '../../constants/gemini.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Calls a Gemini model with optional responseSchema enforcement.
 *
 * When responseSchema is provided:
 *   - Gemini's JSON mode is fully enforced — the response is guaranteed to match
 *     the schema shape, so we parse it directly without any regex extraction.
 *
 * When responseSchema is omitted:
 *   - Falls back to regex extraction in case the model adds preamble text.
 *
 * @param {string}      prompt
 * @param {string}      systemInstruction
 * @param {object|null} responseSchema   - Gemini OpenAPI-style schema object
 * @param {string}      model            - Gemini model ID (defaults to GEMINI_MODEL)
 * @param {object}      baseConfig       - Generation config (defaults to GEMINI_CONFIG)
 */
export async function callGemini(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = GEMINI_MODEL,
  baseConfig = GEMINI_CONFIG
) {
  const generationConfig = { ...baseConfig };
  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };

  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  console.log(`[gemini] calling model: ${model} (temperature: ${baseConfig.temperature})`);

  const res = await fetch(
    `${GEMINI_BASE_URL}${model}${GEMINI_GENERATE_ACTION}?key=${GEMINI_API_KEY}`,
    {
      method: HTTP_METHODS.POST,
      headers: GEMINI_HEADERS,
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${model}): ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error(`Empty Gemini response from ${model}`);

  // Schema-enforced: response is guaranteed valid JSON — parse directly.
  if (responseSchema) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Schema-mode JSON parse failed (${model}): ${text.substring(0, 200)}`);
    }
  }

  // Fallback: strip markdown fences then extract the last valid JSON object.
  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatches = [
      ...cleanText.matchAll(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g),
    ];
    if (jsonMatches.length > 0) {
      return JSON.parse(jsonMatches[jsonMatches.length - 1][0]);
    }
    return JSON.parse(cleanText);
  } catch {
    throw new Error(`JSON parse failed (${model}): ${text.substring(0, 200)}`);
  }
}

/**
 * Judge variant: Gemini 3 Flash at temperature 0.1.
 *
 * Different model family from the generator (2.5 Pro) → different blind spots.
 * Near-zero temperature → deterministic, consistent scoring across runs.
 */
export function callGeminiFlash(prompt, systemInstruction, responseSchema) {
  return callGemini(prompt, systemInstruction, responseSchema, GEMINI_JUDGE_MODEL, GEMINI_JUDGE_CONFIG);
}
