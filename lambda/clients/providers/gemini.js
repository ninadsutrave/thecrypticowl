import { 
  GEMINI_MODEL, 
  GEMINI_BASE_URL, 
  GEMINI_GENERATE_ACTION, 
  GEMINI_HEADERS,
  GEMINI_CONFIG,
  HTTP_METHODS
} from "../../constants/gemini.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function callGemini(prompt, systemInstruction = "") {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: GEMINI_CONFIG,
  };

  if (systemInstruction) {
    body.system_instruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(
    `${GEMINI_BASE_URL}${GEMINI_MODEL}${GEMINI_GENERATE_ACTION}?key=${GEMINI_API_KEY}`,
    {
      method: HTTP_METHODS.POST,
      headers: GEMINI_HEADERS,
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Empty LLM response");

  try {
    // 1. Basic cleanup: remove markdown blocks
    let cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

    // 2. Handle "AI blabbering": find the LAST valid JSON object in the string
    const jsonMatches = [...cleanText.matchAll(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g)];
    
    if (jsonMatches.length > 0) {
      const lastMatch = jsonMatches[jsonMatches.length - 1][0];
      return JSON.parse(lastMatch);
    }

    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error(`Invalid JSON from Gemini: ${text.substring(0, 100)}...`);
  }
}
