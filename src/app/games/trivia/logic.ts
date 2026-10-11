/** The hint in words, for screen readers: "Starts with S. 2 words: 5, 6 letters." */
export function describePattern(answer: string): string {
  const words = answer.trim().split(/\s+/);
  const lengths = words.map(w => [...w].filter(ch => /\p{L}|\p{N}/u.test(ch)).length);
  const first = [...answer].find(ch => /\p{L}/u.test(ch))?.toUpperCase() ?? '';
  return words.length === 1
    ? `Starts with ${first}. ${lengths[0]} letters.`
    : `Starts with ${first}. ${words.length} words: ${lengths.join(', ')} letters.`;
}

/** 🟥 per wrong guess, 🟩 for the right one, ⬜ for guesses unused; 💡 if hinted. */
export function triviaGrid(wrong: number, solved: boolean, hint: boolean, max: number): string {
  const cells = [
    ...Array.from({ length: Math.min(wrong, max) }, () => '🟥'),
    ...(solved ? ['🟩'] : []),
  ];
  while (cells.length < max) cells.push('⬜');
  return `${cells.join('')}${hint ? ' 💡' : ''}`;
}
