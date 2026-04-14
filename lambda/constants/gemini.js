export const GEMINI_MODEL = "gemini-2.5-pro";
// gemini-3-flash: user-specified judge model. If this ID causes a 400/404,
// verify the exact model name at https://ai.google.dev/gemini-api/docs/models
export const GEMINI_JUDGE_MODEL = "gemini-2.5-flash";

// v1beta covers all Gemini models including 2.5-pro, 2.5-flash, and 3.x variants.
// v1 (stable) only includes older GA models — using it with 2.5+ returns 404.
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
export const GEMINI_GENERATE_ACTION = ":generateContent";

export const GEMINI_HEADERS = {
  "Content-Type": "application/json",
};

// Generator config: temperature 0.7 for creative, varied clue construction.
export const GEMINI_CONFIG = {
  temperature: 0.7,
  responseMimeType: "application/json",
};

// Judge config: temperature 0.1 for deterministic, consistent evaluation.
// A judge that scores the same clue differently on different runs is unreliable.
export const GEMINI_JUDGE_CONFIG = {
  temperature: 0.1,
  responseMimeType: "application/json",
};

export const HTTP_METHODS = {
  POST: "POST",
  GET: "GET",
};

