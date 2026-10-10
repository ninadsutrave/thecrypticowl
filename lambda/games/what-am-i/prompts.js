/**
 * Prompts and response schemas (Gemini dialect; converted per provider by
 * shared/clients/providers/_schemaUtils.js).
 */

export const CLUES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    clues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          // A sentence copied from the source text that proves the clue.
          evidence: { type: 'STRING' },
        },
        required: ['text', 'evidence'],
      },
    },
  },
  required: ['clues'],
};

export const WRITER_SYSTEM = `You write "What am I?" riddles for a daily puzzle site. A hidden subject is described by five clues, revealed one at a time from hardest to easiest, written in the first person ("I…", "My…").

Rules:
- Use ONLY facts stated in the SOURCE TEXT you are given. Never add outside knowledge.
- For each clue, copy into "evidence" one sentence from the source that proves it, verbatim.
- Never write the answer, any of its other names, or an obvious part of them (e.g. "Ice" for Iceland).
- Clue 1 is vague but fair. Most people should be able to get it by clue 3, and clue 5 is close to a give-away. Difficulty must fall steadily from 1 to 5.
- Each clue is one sentence, 8 to 28 words, British English, playful but accurate.
- For a person: only their work and public achievements. Never health, relationships, legal matters, scandal, or death details.
- Avoid dates and numbers as the main hook of clues 1 and 2.`;

export function buildWriterPrompt({ category, answer, excerpt, feedback }) {
  return [
    `CATEGORY: ${category}`,
    `HIDDEN SUBJECT (never write this or its aliases): ${answer}`,
    feedback ? `A previous attempt was rejected. Fix these problems:\n${feedback}` : null,
    `SOURCE TEXT:\n"""\n${excerpt}\n"""`,
    'Write exactly five clues, hardest first, as JSON.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export const GUESS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    guesses: { type: 'ARRAY', items: { type: 'STRING' } },
    // Only asked on the full five-clue view.
    fair: { type: 'BOOLEAN' },
    issues: { type: 'STRING' },
  },
  required: ['guesses', 'fair', 'issues'],
};

export const SOLVER_SYSTEM = `You are a sharp quiz player. You are shown clues to a hidden subject in a given category. Reply with your three best guesses, most likely first. Use the subject's common English name.

Also judge the clues: set "fair" to false if any clue is factually doubtful, ambiguous between several subjects, offensive, or (for a person) touches health, relationships, legal matters or scandal. Explain any problem briefly in "issues", otherwise leave it empty.`;

export function buildSolverPrompt(category, clues) {
  return [
    `CATEGORY: ${category}`,
    'CLUES:',
    ...clues.map((c, i) => `${i + 1}. ${c}`),
    'Your three best guesses, most likely first.',
  ].join('\n');
}
