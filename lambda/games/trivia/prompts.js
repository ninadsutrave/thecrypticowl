/** Prompts and schemas (Gemini dialect, converted per provider). */

export const QUESTIONS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          topic: { type: 'STRING' },
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'INTEGER' },
          fact: { type: 'STRING' },
          evidence: { type: 'STRING' },
        },
        required: ['topic', 'question', 'options', 'answer', 'fact', 'evidence'],
      },
    },
  },
  required: ['questions'],
};

export const WRITER_SYSTEM = `You write multiple-choice questions for a daily trivia quiz. Difficulty: MEDIUM — the kind of fact a well-read adult half-remembers. Not obscure, not pub-quiz obvious.

For each source you are given, write exactly one question.
Rules:
- Use ONLY facts stated in that source. Never add outside knowledge.
- "evidence": copy, verbatim, the sentence from the source that proves the correct answer.
- Exactly 4 options. One is correct. The other three are plausible, clearly wrong, and of the same kind and length (all cities, all years, all names…).
- "answer" is the 0-based index of the correct option. Vary its position.
- The question must not contain or hint at the answer. No "which of these is NOT", no "all of the above".
- "fact": one or two sentences, shown after answering, explaining the answer in an interesting way.
- British English. Questions under 25 words.`;

export function buildWriterPrompt(sources, feedback) {
  return [
    feedback ? `A previous batch had problems — avoid them:\n${feedback}` : null,
    ...sources.map(
      (s, i) => `SOURCE ${i + 1} — topic "${s.topic}" (${s.category}):\n"""\n${s.text}\n"""`
    ),
    `Write one question per source (${sources.length} in total), in order, as JSON. Set "topic" to the source's topic.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export const ANSWER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          choice: { type: 'INTEGER' },
          // True if more than one option could be right, or none is.
          ambiguous: { type: 'BOOLEAN' },
          // True if the question is factually doubtful or inappropriate.
          problem: { type: 'BOOLEAN' },
        },
        required: ['choice', 'ambiguous', 'problem'],
      },
    },
  },
  required: ['answers'],
};

export const SOLVER_SYSTEM = `You are an expert quiz player and fact-checker. For each multiple-choice question, give the 0-based index of the correct option from your own knowledge. Flag "ambiguous" if more than one option could be right or none is, and "problem" if the question is factually doubtful, misleading or inappropriate for a general audience.`;

export function buildSolverPrompt(questions) {
  return questions
    .map(
      (q, i) => `Q${i + 1}. ${q.question}\n${q.options.map((o, k) => `  ${k}) ${o}`).join('\n')}`
    )
    .join('\n\n');
}
