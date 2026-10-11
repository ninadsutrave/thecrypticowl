/** Prompts and schemas (Gemini dialect, converted per provider). */

export const QUESTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    question: { type: 'STRING' },
    // One verbatim source sentence per fact the question uses.
    evidence: { type: 'ARRAY', items: { type: 'STRING' } },
    // The reveal shown after the puzzle ends, and the sentence proving it.
    fact: { type: 'STRING' },
    factEvidence: { type: 'STRING' },
    // Shorter forms the question itself asks for ("Diesel" for Diesel engine).
    alsoAccept: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['question', 'evidence', 'fact', 'factEvidence', 'alsoAccept'],
};

/**
 * The house style: one story-shaped question, answered in free text. Facts
 * chain from oblique to telling, so the solver has to connect them rather
 * than recall one fact, which is what makes it medium rather than easy.
 */
export const WRITER_SYSTEM = `You write the single daily trivia question for a puzzle site. It is a short story with a hidden answer, in the style of a good quiz night: the player reads it and types the answer. There are no options.

The shape:
- 70 to 130 words, 4 to 6 sentences, ending with one direct question ("Name the product.", "What is this dish called?").
- Chain 3 to 5 interesting facts about the HIDDEN SUBJECT: an origin story, an odd name, a first, a record. Order them from oblique to telling, so the answer only clicks towards the end.
- Pitch it at the DIFFICULTY line in the prompt. The first two sentences must never identify the subject on their own: only the last fact should make it click.
- Refer to the subject as "this product", "this film", "it" and so on. Never write the answer, any of its other names, or a distinctive part of them (e.g. "Bubble" for Bubble Wrap).

The rules:
- Use ONLY facts stated in the SOURCE TEXT. Never add outside knowledge, never exaggerate.
- "evidence": for each fact you use, copy one sentence from the source that proves it, verbatim.
- "fact": one sentence (at most 40 words) shown after the puzzle ends, a further fun detail from the source. It may name the answer. "factEvidence": the source sentence proving it, verbatim.
- "alsoAccept": if the question asks for a shorter form than the subject's full name (e.g. "Diesel" for "Diesel engine"), list it. Otherwise leave it empty.
- For a person: only their work and public achievements. Never health, relationships, legal matters or scandal.
- British English. Conversational and playful, but accurate.

An example of the style, for a different subject (Bubble Wrap):
"In 1957 two engineers in New Jersey sealed a pair of shower curtains together, hoping to sell the result as a fashionable textured wallpaper. Nobody wanted to hang it. They tried pitching it as insulation for greenhouses; that flopped too. Its break came when a computer company needed a way to protect a new machine on its journey to customers. Today there is even an appreciation day for it on the last Monday of January. Name the product."`;

/**
 * Indian subjects are pitched medium-hard for an Indian audience; everything
 * else is a popular subject pitched at medium.
 */
export const difficultyLine = india =>
  india
    ? 'DIFFICULTY: medium-hard, for an Indian audience. A well-read Indian adult should have to connect the facts: lead with lesser-known details and keep the giveaway for the very end.'
    : 'DIFFICULTY: medium. This is a popular, well-known subject: most adults should get it by the end with a little thought, building to one familiar fact in the last sentence.';

export function buildWriterPrompt({ category, answer, excerpt, feedback, india = false }) {
  return [
    `CATEGORY: ${category}`,
    difficultyLine(india),
    `HIDDEN SUBJECT (never write this or its other names): ${answer}`,
    feedback ? `A previous attempt was rejected. Fix these problems:\n${feedback}` : null,
    `SOURCE TEXT:\n"""\n${excerpt}\n"""`,
    'Write the question as JSON.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export const SOLVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    guesses: { type: 'ARRAY', items: { type: 'STRING' } },
    // Only meaningful on the full question.
    difficulty: { type: 'STRING', enum: ['easy', 'medium', 'hard', 'obscure'] },
    fair: { type: 'BOOLEAN' },
    issues: { type: 'STRING' },
  },
  required: ['guesses', 'difficulty', 'fair', 'issues'],
};

export const SOLVER_SYSTEM = `You are a sharp quiz player. You are shown a trivia question (sometimes only its opening) in a given category. Reply with your three best answers, most likely first, using the common English name.

Also judge the question as a quiz setter would:
- "difficulty": how a typical well-read adult at a pub quiz would find it. "easy" = most would get it from the first sentence or two; "medium" = most get it by the end with some thought; "hard" = a good minority; "obscure" = almost nobody could.
- "fair": false if any statement is doubtful, the question fits several answers equally well, it is offensive, or (for a person) it touches health, relationships, legal matters or scandal. Explain any problem briefly in "issues", otherwise leave it empty.`;

export function buildSolverPrompt(category, question) {
  return [`CATEGORY: ${category}`, `QUESTION:\n${question}`, 'Your three best answers.'].join(
    '\n\n'
  );
}
