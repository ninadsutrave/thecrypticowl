#!/usr/bin/env node
/**
 * Emits one of the three Gemini request payloads to stdout as JSON.
 * Imports the actual prompt + schema + config constants from the lambda
 * package, so the smoke-test curls always match what the lambda sends.
 *
 * Usage:
 *   node scripts/build-gemini-payloads.mjs lexical
 *   node scripts/build-gemini-payloads.mjs clue
 *   node scripts/build-gemini-payloads.mjs judge
 *
 * The second argument for 'clue' and 'judge' is the lexical seed (JSON).
 *
 * Exits:
 *   0 — payload printed to stdout
 *   1 — usage error or missing constant
 */
import {
  LEXICAL_PLANNER_SYSTEM,
  LEXICAL_RESPONSE_SCHEMA,
  buildLexicalPrompt,
  CLUE_GENERATOR_SYSTEM,
  CLUE_RESPONSE_SCHEMA,
  buildCluePrompt,
  JUDGE_SYSTEM,
  JUDGE_RESPONSE_SCHEMA,
  buildJudgePrompt,
} from '../lambda/games/cryptic/constants/prompts.js';
import { GEMINI_CONFIG, GEMINI_JUDGE_CONFIG } from '../lambda/shared/constants/gemini.js';

const stage = process.argv[2];

function wrap(prompt, systemInstruction, responseSchema, baseConfig) {
  const generationConfig = { ...baseConfig };
  if (responseSchema) generationConfig.responseSchema = responseSchema;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }
  return body;
}

if (stage === 'lexical') {
  const body = wrap(
    buildLexicalPrompt([], []),
    LEXICAL_PLANNER_SYSTEM,
    LEXICAL_RESPONSE_SCHEMA,
    GEMINI_CONFIG
  );
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
}

if (stage === 'clue') {
  // Sample lexical seed — overrideable via argv[3] for a fresh payload.
  const defaultLexical = {
    answer: 'CANOE',
    type: 'anagram',
    definition: 'Small boat',
    difficulty: 'easy',
  };
  const lexical = process.argv[3] ? JSON.parse(process.argv[3]) : defaultLexical;
  const body = wrap(
    buildCluePrompt(lexical.answer, lexical.type, lexical.definition, lexical.answer.length),
    CLUE_GENERATOR_SYSTEM,
    CLUE_RESPONSE_SCHEMA,
    GEMINI_CONFIG
  );
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
}

if (stage === 'judge') {
  // Sample clue + lexical — overrideable via argv[3] (lexical JSON) + argv[4] (clue JSON).
  const defaultLexical = { answer: 'CANOE', type: 'anagram', definition: 'Small boat' };
  const defaultClue = {
    clue: 'Small boat when ocean is disturbed (5)',
    definition: 'Small boat',
    indicator: 'disturbed',
    fodder: 'OCEAN',
    wordplay_summary: 'Anagram (disturbed) of OCEAN = CANOE',
  };
  const lexical = process.argv[3] ? JSON.parse(process.argv[3]) : defaultLexical;
  const clue = process.argv[4] ? JSON.parse(process.argv[4]) : defaultClue;
  const body = wrap(
    buildJudgePrompt(lexical, clue, false),
    JUDGE_SYSTEM,
    JUDGE_RESPONSE_SCHEMA,
    GEMINI_JUDGE_CONFIG
  );
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
}

console.error(`Unknown stage: ${stage}. Use: lexical | clue | judge`);
process.exit(1);
