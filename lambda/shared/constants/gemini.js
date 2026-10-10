// Models in order of preference. Google retires model IDs (2.5 Pro and Flash
// were shut down for new keys in 2026), so each call falls back to the next
// ID when Google answers 404 "no longer available", instead of failing the
// day. The "-latest" aliases always point at Google's current model.
// Current list: https://ai.google.dev/gemini-api/docs/models. Checked with
// the "Diagnose · AI models" workflow (Oct 2026): on the free tier Pro has no
// quota, gemini-flash-latest was overloaded, and 3.6 Flash, 3 Flash preview
// and the Flash-Lite models answered in about a second. Pro stays first so a
// key with billing gets it; a free key skips it after one instant refusal.
export const GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
];
// The checker uses a different model from the writer where it can.
export const GEMINI_JUDGE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
];
/** First choices, for logs and single-model callers. */
export const GEMINI_MODEL = GEMINI_MODELS[0];
export const GEMINI_JUDGE_MODEL = GEMINI_JUDGE_MODELS[0];

// v1beta covers all Gemini models including 2.5-pro, 2.5-flash, and 3.x variants.
// v1 (stable) only includes older GA models — using it with 2.5+ returns 404.
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
export const GEMINI_GENERATE_ACTION = ':generateContent';

export const GEMINI_HEADERS = {
  'Content-Type': 'application/json',
};

// Generator config: temperature 0.7 for creative, varied clue construction.
export const GEMINI_CONFIG = {
  temperature: 0.7,
  responseMimeType: 'application/json',
};

// Judge config: temperature 0.1 for deterministic, consistent evaluation.
// A judge that scores the same clue differently on different runs is unreliable.
export const GEMINI_JUDGE_CONFIG = {
  temperature: 0.1,
  responseMimeType: 'application/json',
};

export const HTTP_METHODS = {
  POST: 'POST',
  GET: 'GET',
};
