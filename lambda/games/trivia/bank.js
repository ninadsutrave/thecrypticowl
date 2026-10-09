/**
 * Hand-written story questions, used only when every AI attempt for a day
 * fails, so the day still gets a puzzle. Each subject is also in topics.js
 * and is keyed the same way (`wiki:<title>`), so a bank question and a
 * generated one never use the same subject close together.
 *
 * Every fact is from the linked Wikipedia article.
 */

const wiki = title => ({
  label: `${title} on Wikipedia`,
  url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
});

export const BANK = [
  {
    title: 'Play-Doh',
    category: 'Brands & products',
    question:
      'In the 1930s a Cincinnati soap company sold a soft putty for wiping coal soot off wallpaper. As homes switched from coal to cleaner heating, sales collapsed and the company faced ruin. Then a nursery-school teacher noticed that children loved modelling with the stuff, and suggested selling it as a toy instead. With the detergent taken out and colours added, it was relaunched in the mid-1950s under a new name, and billions of cans have been sold since. What is it called?',
    answer: 'Play-Doh',
    accepted: ['Play-Doh', 'Play Doh', 'Playdoh', 'Play dough'],
    fact: 'The teacher, Kay Zufall, also helped choose the name, after her brother-in-law\'s suggestion of "Kutol\'s Rainbow Modeling Compound" was turned down.',
  },
  {
    title: 'Ferris wheel',
    category: 'Words & names',
    question:
      "Organisers of the 1893 world's fair in Chicago wanted something to outdo the iron tower that had been the star of the Paris exposition four years earlier. A young bridge engineer from Pittsburgh sketched his answer, reportedly over dinner. The fair's committee feared it was too flimsy to stand, but it opened that summer, with thirty-six cars each carrying sixty people. The ride still carries his surname. What is it called?",
    answer: 'Ferris wheel',
    accepted: ['Ferris wheel', 'Ferris'],
    fact: 'George Washington Gale Ferris Jr. built the original for the World’s Columbian Exposition; it carried about 38,000 passengers a day.',
  },
  {
    title: 'Bluetooth',
    category: 'Words & names',
    question:
      'In 1997 an engineer at Intel was reading a historical novel about Vikings while working with rival companies on a short-range radio standard. He proposed borrowing the nickname of a tenth-century Danish king who had united warring tribes, just as the technology would unite phones and computers. The codename was only meant to be temporary, but the alternatives fell through. Its logo still merges two runes: the king’s initials. Name the technology.',
    answer: 'Bluetooth',
    accepted: ['Bluetooth', 'Blue tooth'],
    fact: 'The king was Harald “Bluetooth” Gormsson, and the logo joins the runes ᚼ (H) and ᛒ (B).',
  },
  {
    title: 'Python (programming language)',
    category: 'Words & names',
    question:
      'In December 1989 a Dutch programmer looking for a hobby project to keep him busy over the Christmas holidays began writing a new programming language. He wanted a name that was short, unique and slightly mysterious, and he happened to be reading the scripts of a British comedy series at the time. Its documentation is still full of jokes about spam and eggs as a result. Decades later it is one of the most popular languages in the world. Name it.',
    answer: 'Python',
    accepted: ['Python', 'Python programming language'],
    fact: "Guido van Rossum named it after Monty Python's Flying Circus, not the snake.",
  },
  {
    title: 'Sandwich',
    category: 'Words & names',
    question:
      'An eighteenth-century English aristocrat served as First Lord of the Admiralty and backed Captain Cook, who named a group of Pacific islands after him in return. Yet he is remembered for something far more ordinary. According to a story spread by a French travel writer, he was so reluctant to leave the gaming table that he asked for meat tucked between two slices of bread, and his friends began to order "the same as" him. What food carries his title?',
    answer: 'Sandwich',
    accepted: ['Sandwich', 'Sandwiches'],
    fact: 'He was John Montagu, the 4th Earl of Sandwich; the islands Cook named for him are now known as Hawaii.',
  },
  {
    title: 'Ketchup',
    category: 'Food & drink',
    question:
      'Its name is thought to come from a word for a fermented fish sauce from southern China. When British traders brought the idea home in the early eighteenth century, cooks made their own versions from mushrooms, walnuts or oysters. A recipe using a red fruit from the Americas was published in 1812, and in 1876 a Pennsylvania businessman began bottling a version that made his own name famous. What is this condiment?',
    answer: 'Ketchup',
    accepted: ['Ketchup', 'Catsup', 'Tomato ketchup', 'Tomato sauce'],
    fact: 'Henry J. Heinz launched his tomato ketchup in 1876; earlier English ketchups contained no tomato at all.',
  },
  {
    title: 'Basketball',
    category: 'Sport & games',
    question:
      'In December 1891 a Canadian-born instructor at a training school in Massachusetts was told to invent an indoor game to keep a restless class busy through the New England winter. He wrote thirteen rules, and the school janitor found him two peach baskets to nail to the railing of the running track. Each time someone scored, the ball had to be fetched out by hand, because the baskets still had their bottoms. Name the sport.',
    answer: 'Basketball',
    accepted: ['Basketball'],
    fact: 'Its inventor, James Naismith, later founded the University of Kansas basketball programme, the only coach in its history with a losing record.',
  },
  {
    title: 'Polytetrafluoroethylene',
    category: 'Inventions & science',
    question:
      'In 1938 a young chemist at an American chemical company opened a cylinder of refrigerant gas and found that nothing came out, even though it weighed as much as a full one. Cutting it open, he found a slippery white powder: the gas had turned into a new plastic. It was soon put to use in the wartime project to build the atomic bomb. Years later a French engineer’s wife suggested he coat her frying pans with it. By what trade name is it best known?',
    answer: 'Teflon',
    accepted: ['Teflon', 'PTFE', 'Polytetrafluoroethylene'],
    fact: "Roy Plunkett made the discovery at DuPont; the French couple's non-stick pans became the Tefal brand.",
  },
  {
    title: 'Saxophone',
    category: 'Music',
    question:
      'In the 1840s a Belgian instrument maker working in Paris wanted a horn with the power of brass and the agility of woodwind, to bridge the two sections of a military band. His creation is made of brass, yet because it is played with a single reed it counts as a woodwind. Rival makers resented his success and took him to court again and again, and he died poor. The instrument went on to define jazz, and it bears his surname. Name it.',
    answer: 'Saxophone',
    accepted: ['Saxophone', 'Sax'],
    fact: 'Adolphe Sax patented it in 1846; he also invented the saxhorn and the saxotromba.',
  },
  {
    title: 'Rickrolling',
    category: 'Internet culture',
    question:
      'It began in 2007 on an anonymous image board, as a twist on an older prank in which a tempting link led to a picture of a duck on wheels. Instead, the link would lead to the music video for a 1987 hit by a British singer with a famously deep voice. Millions fell for it. In 2008 the singer himself sprang the prank live on television, during a famous parade in New York. Name the prank.',
    answer: 'Rickrolling',
    accepted: ['Rickrolling', 'Rickroll', 'Rick roll', 'Rick rolling', 'Rickrolled'],
    fact: 'The song is Rick Astley’s “Never Gonna Give You Up”; he appeared at the 2008 Macy’s Thanksgiving Day Parade.',
  },
].map(({ title, ...q }) => ({ title, payload: { ...q, source: wiki(title) } }));

/** An unused bank question if there is one, otherwise any. */
export function pickFromBank(ctx) {
  const fresh = BANK.filter(b => !ctx.used.has(`wiki:${b.title}`));
  const entry = ctx.rng.pick(fresh.length ? fresh : BANK);
  return {
    payload: entry.payload,
    sourceKeys: [`wiki:${entry.title}`],
    summary: `${entry.payload.answer} (bank)`,
  };
}
