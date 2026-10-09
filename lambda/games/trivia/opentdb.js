import { fetchJson } from '../../shared/runtime/http.js';

/**
 * Open Trivia DB fallback (CC BY-SA 4.0), used only when every AI attempt
 * for a day fails. Its questions are human-written, so they skip the judge,
 * but they still pass the reviewer.
 */

const ENTITIES = {
  '&quot;': '"',
  '&#039;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&hellip;': '…',
  '&eacute;': 'é',
  '&uuml;': 'ü',
  '&ouml;': 'ö',
  '&aacute;': 'á',
  '&ntilde;': 'ñ',
  '&shy;': '',
};

export function decodeEntities(s) {
  return String(s)
    .replace(/&[a-z]+;|&#0?39;/gi, m => ENTITIES[m] ?? ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const CATEGORY_MAP = [
  [/geograph/i, 'Geography'],
  [/science|nature|computers|mathematics|gadgets/i, 'Science'],
  [/history|politics/i, 'History'],
  [/art/i, 'Art'],
  [/books/i, 'Literature'],
  [/music/i, 'Music'],
  [/sport/i, 'Sport'],
  [/animals/i, 'Nature'],
];

export async function fetchOpenTdb(amount, rng, { fetcher = fetchJson } = {}) {
  const data = await fetcher(
    `https://opentdb.com/api.php?amount=${amount}&type=multiple&difficulty=medium`
  );
  if (data?.response_code !== 0)
    throw new Error(`Open Trivia DB response_code ${data?.response_code}`);
  return data.results.map(r => {
    const correct = decodeEntities(r.correct_answer);
    const options = rng.shuffle([correct, ...r.incorrect_answers.map(decodeEntities)]);
    const cat = CATEGORY_MAP.find(([re]) => re.test(r.category))?.[1] ?? 'General knowledge';
    return {
      category: cat,
      question: decodeEntities(r.question),
      options,
      answer: options.indexOf(correct),
      fact: `The answer is ${correct}.`,
      source: { label: 'Open Trivia DB (CC BY-SA 4.0)', url: 'https://opentdb.com/' },
    };
  });
}
