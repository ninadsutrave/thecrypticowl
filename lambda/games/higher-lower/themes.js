/**
 * Daily themes: one number to compare across well-known things, plus how the
 * game words and formats it. Two kinds of source:
 *
 * - **Wikidata** (`query`): fame by sitelinks (how many Wikipedias have an
 *   article). `?value` must come out as a plain number: quantities use the
 *   normalised value (psn:, always SI units). Every query returns
 *   ?item ?itemLabel ?itemDescription ?value ?links.
 * - **Wikipedia** (`wikipedia`): a ranked list article (Grammy records,
 *   most-followed accounts, box office…) for numbers Wikidata keeps poorly or
 *   late. Read fresh each day, so a new Grammy or box-office run shows up as
 *   soon as Wikipedia has it. `table` picks the tables by section heading,
 *   `name`/`value`/`india` find columns by header, `scale` turns the column's
 *   unit ("millions") into a plain number.
 *
 * `poolSize` (default 150) keeps only the best-known entries; smaller for
 * themes whose long tail is obscure.
 *
 * `close` sets what a fair pair looks like: far enough apart to be clearly
 * different, close enough to need knowledge rather than common sense.
 *
 * No dates or years: comparing when things happened is Chronology's job.
 */

const LABELS = `SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }`;

/** A quantity statement's normalised (SI) value, best rank only. */
const quantity = prop =>
  `?item p:${prop} ?st . ?st a wikibase:BestRank ; psn:${prop}/wikibase:quantityAmount ?value .`;

export const THEMES = [
  {
    id: 'city-population',
    title: 'Which city has more people?',
    noun: 'population (city proper)',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.12, maxRatio: 1.9 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?pop) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q1549591 ; wdt:P1082 ?pop ; wikibase:sitelinks ?sl .
      FILTER(?sl >= 120)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'country-area',
    countries: true,
    title: 'Which country is bigger?',
    noun: 'area',
    higher: 'Bigger',
    lower: 'Smaller',
    format: 'area',
    close: { minRatio: 1.15, maxRatio: 2.2 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q3624078 ; wikibase:sitelinks ?sl .
      ${quantity('P2046').replace('?value', '?v')}
      FILTER(?sl >= 150)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'mountain-height',
    poolSize: 100,
    title: 'Which mountain is higher?',
    noun: 'height',
    higher: 'Higher',
    lower: 'Lower',
    format: 'metres',
    close: { minRatio: 1.06, maxRatio: 1.6 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q8502 ; wikibase:sitelinks ?sl .
      ${quantity('P2044').replace('?value', '?v')}
      FILTER(?sl >= 35)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'river-length',
    poolSize: 100,
    title: 'Which river is longer?',
    noun: 'length',
    higher: 'Longer',
    lower: 'Shorter',
    format: 'kilometres',
    close: { minRatio: 1.12, maxRatio: 2 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q4022 ; wikibase:sitelinks ?sl .
      ${quantity('P2043').replace('?value', '?v')}
      FILTER(?sl >= 60)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'building-height',
    poolSize: 100,
    title: 'Which building is taller?',
    noun: 'height',
    higher: 'Taller',
    lower: 'Shorter',
    format: 'metres',
    close: { minRatio: 1.08, maxRatio: 1.7 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31/wdt:P279? wd:Q11303 ; wikibase:sitelinks ?sl .
      ${quantity('P2048').replace('?value', '?v')}
      FILTER(?sl >= 20)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'country-population',
    countries: true,
    title: 'Which country has more people?',
    noun: 'population',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.15, maxRatio: 2.2 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?pop) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q3624078 ; wdt:P1082 ?pop ; wikibase:sitelinks ?sl .
      FILTER(?sl >= 150)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'stadium-capacity',
    poolSize: 80,
    title: 'Which stadium holds more people?',
    noun: 'capacity',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.1, maxRatio: 1.8 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?cap) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31/wdt:P279? wd:Q483110 ; wdt:P1083 ?cap ; wikibase:sitelinks ?sl .
      FILTER(?sl >= 25)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'lake-area',
    title: 'Which lake is bigger?',
    noun: 'area',
    higher: 'Bigger',
    lower: 'Smaller',
    format: 'area',
    poolSize: 100,
    close: { minRatio: 1.15, maxRatio: 2.2 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q23397 ; wikibase:sitelinks ?sl .
      ${quantity('P2046').replace('?value', '?v')}
      FILTER(?sl >= 40)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'debut-age',
    indiaProp: 'P27',
    poolSize: 120,
    title: 'Who started their career younger?',
    noun: 'age at career start',
    higher: 'Older',
    lower: 'Younger',
    format: 'years',
    close: { minRatio: 1.3, maxRatio: 2.5 },
    // Singers and actors born since 1940 whose career start Wikidata records;
    // ages outside 4–40 are almost always a data slip, so they're left out.
    query: `SELECT ?item ?itemLabel ?itemDescription (MIN(?age) AS ?value) (MAX(?sl) AS ?links) WHERE {
      VALUES ?job { wd:Q177220 wd:Q33999 }
      ?item wdt:P31 wd:Q5 ; wdt:P106 ?job ; wdt:P569 ?born ; wdt:P2031 ?start ; wikibase:sitelinks ?sl .
      FILTER(?sl >= 70 && YEAR(?born) >= 1940)
      BIND(YEAR(?start) - YEAR(?born) AS ?age)
      FILTER(?age >= 4 && ?age <= 40)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'grammy-wins',
    title: 'Who has won more Grammys?',
    noun: 'Grammy wins',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.15, maxRatio: 2.2 },
    wikipedia: {
      page: 'Grammy Award milestones',
      table: h => /^Most Grammys won\b/.test(h) && !/one night|country/.test(h),
      name: /^(Artists?|Producer|Rapper)$/,
      value: /^Awards$/,
    },
  },
  {
    id: 'billionaire-net-worth',
    title: 'Who is richer?',
    noun: 'net worth (Forbes)',
    higher: 'Richer',
    lower: 'Poorer',
    format: 'usd',
    close: { minRatio: 1.1, maxRatio: 2.2 },
    wikipedia: {
      page: "The World's Billionaires",
      // This year's Forbes top ten and last year's, newest first.
      table: (h, all) =>
        /^\d{4}$/.test(h) &&
        Number(h) >= Math.max(...all.filter(x => /^\d{4}$/.test(x)).map(Number)) - 1,
      name: /^Name$/,
      value: /^Net worth/,
      india: /^Nationality$/,
      newestFirst: true,
    },
  },
  {
    id: 'instagram-followers',
    title: 'Who has more Instagram followers?',
    noun: 'Instagram followers',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.1, maxRatio: 1.9 },
    wikipedia: {
      page: 'List of most-followed Instagram accounts',
      table: h => h === 'List',
      name: /^Owner$/,
      value: /^Followers/,
      scale: 1e6,
      india: /^Country$/,
    },
  },
  {
    id: 'country-islands',
    countries: true,
    title: 'Which country has more islands?',
    noun: 'islands',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.3, maxRatio: 4 },
    wikipedia: {
      page: 'List of countries by number of islands',
      table: h => h === 'List',
      name: /^Country$/,
      value: /^No\. of islands$/,
    },
  },
  {
    id: 'film-box-office',
    title: 'Which film earned more?',
    noun: 'worldwide box office',
    higher: 'More',
    lower: 'Less',
    format: 'usd',
    close: { minRatio: 1.05, maxRatio: 1.7 },
    wikipedia: {
      page: 'List of highest-grossing films',
      table: h => h === 'Highest-grossing films',
      name: /^Title$/,
      value: /^Worldwide gross$/,
    },
  },
  {
    id: 'youtube-subscribers',
    title: 'Which YouTube channel has more subscribers?',
    noun: 'subscribers',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.1, maxRatio: 1.9 },
    wikipedia: {
      page: 'List of most-subscribed YouTube channels',
      table: h => /most-subscribed channels/.test(h),
      name: /^Name$/,
      value: /^Subscribers/,
      scale: 1e6,
      india: /^Country$/,
    },
  },
  {
    id: 'cricket-centuries',
    poolSize: 80,
    title: 'Who has scored more international hundreds?',
    noun: 'international centuries',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.15, maxRatio: 2.2 },
    wikipedia: {
      page: 'List of cricketers by number of international centuries scored',
      table: h => /^Men's international cricket$/.test(h),
      name: /^Player$/,
      value: /^Total$/,
      india: /^Team$/,
    },
  },
  {
    id: 'country-coastline',
    countries: true,
    title: 'Which country has the longer coastline?',
    noun: 'coastline',
    higher: 'Longer',
    lower: 'Shorter',
    format: 'kilometres',
    poolSize: 120,
    close: { minRatio: 1.3, maxRatio: 3 },
    wikipedia: {
      page: 'List of countries and dependencies by length of coastline',
      table: h => h === 'List',
      name: /^Location$/,
      value: /^\(CIA\)$/,
      exclude: /^(World|European Union|Antarctica)\b/,
    },
  },
  {
    id: 'record-sales',
    title: 'Who has sold more records?',
    noun: 'claimed record sales',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.15, maxRatio: 2.5 },
    wikipedia: {
      page: 'List of best-selling music artists',
      table: h => /^Over \d+ million$/.test(h),
      name: /^Artist$/,
      value: /^Claimed sales$/,
      india: /^Country$/,
    },
  },
  {
    id: 'indian-film-box-office',
    title: 'Which Indian film earned more?',
    noun: 'worldwide box office',
    higher: 'More',
    lower: 'Less',
    format: 'inr',
    close: { minRatio: 1.08, maxRatio: 1.9 },
    wikipedia: {
      page: 'List of highest-grossing Indian films',
      table: h => h === 'Highest-grossing films',
      name: /^Title$/,
      value: /^Worldwide gross$/,
    },
  },
  {
    id: 'olympic-golds',
    poolSize: 70,
    title: 'Who has won more Olympic golds?',
    noun: 'Olympic gold medals',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.2, maxRatio: 2.6 },
    wikipedia: {
      page: 'List of multiple Olympic gold medalists',
      table: h => h === 'List of most Olympic gold medals over career',
      name: /^Athlete$/,
      value: /^Gold$/,
      india: /^Nation$/,
    },
  },
  {
    id: 'painting-prices',
    title: 'Which painting sold for more?',
    noun: "price (in today's money)",
    higher: 'More',
    lower: 'Less',
    format: 'usd',
    close: { minRatio: 1.1, maxRatio: 2 },
    wikipedia: {
      page: 'List of most expensive paintings',
      table: h => h === 'List of highest prices paid',
      name: /^Name$/,
      value: /^Adjusted/,
      scale: 1e6,
    },
  },
  {
    id: 'spotify-streams',
    title: 'Which song has more Spotify streams?',
    noun: 'Spotify streams',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.05, maxRatio: 1.7 },
    wikipedia: {
      page: 'List of most-streamed songs on Spotify',
      table: h => h === 'Most-streamed songs',
      name: /^Song$/,
      value: /^Streams/,
      scale: 1e9,
    },
  },
  {
    id: 'company-revenue',
    title: 'Which company makes more money?',
    noun: 'yearly revenue',
    higher: 'More',
    lower: 'Less',
    format: 'usd',
    close: { minRatio: 1.08, maxRatio: 1.9 },
    wikipedia: {
      page: 'List of largest companies by revenue',
      table: h => h === 'List',
      name: /^Name$/,
      value: /^USD \(in billions\)$/,
      scale: 1e9,
      india: /^Headquarters$/,
    },
  },
  {
    id: 'football-goals',
    poolSize: 45,
    title: 'Who has scored more goals?',
    noun: 'career goals',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.04, maxRatio: 1.5 },
    wikipedia: {
      page: 'List of footballers with 500 or more goals',
      table: h => h === 'RSSSF list',
      name: /^Player$/,
      value: /^Goals$/,
    },
  },
  {
    id: 'museum-visitors',
    title: 'Which museum gets more visitors?',
    noun: 'visitors a year',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.1, maxRatio: 2 },
    wikipedia: {
      page: 'List of most-visited museums',
      table: h => h === 'List of most-visited museums',
      name: /^Name$/,
      value: /^Visitors$/,
      india: /^Country$/,
    },
  },
  {
    id: 'country-gdp',
    countries: true,
    title: 'Which country has the bigger economy?',
    noun: 'GDP (IMF)',
    higher: 'Bigger',
    lower: 'Smaller',
    format: 'usd',
    poolSize: 100,
    describe: false,
    close: { minRatio: 1.2, maxRatio: 2.5 },
    wikipedia: {
      page: 'List of countries by GDP (nominal)',
      table: h => h === 'Table',
      name: /^Country/,
      value: /^IMF/,
      scale: 1e6,
      exclude: /^World$/,
    },
  },
  {
    id: 'x-followers',
    title: 'Who has more followers on X?',
    noun: 'X followers',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.1, maxRatio: 1.9 },
    wikipedia: {
      page: 'List of most-followed X accounts',
      table: h => h === 'List',
      name: /^Owner$/,
      value: /^Followers/,
      scale: 1e6,
    },
  },
];

/**
 * The theme's query, also reporting which items are Indian (most players are
 * in India): an item located in India, or, for a theme of countries, India
 * itself. A chain then includes a couple of them (generator.js).
 */
export function indiaAwareQuery(theme) {
  const flag = theme.countries
    ? 'BIND(?item = wd:Q668 AS ?inIndia)'
    : `BIND(EXISTS { ?item wdt:${theme.indiaProp ?? 'P17'} wd:Q668 } AS ?inIndia)`;
  return theme.query
    .replace(
      'SELECT ?item ?itemLabel ?itemDescription',
      'SELECT ?item ?itemLabel ?itemDescription (SAMPLE(?inIndia) AS ?india)'
    )
    .replace(LABELS, `${flag}\n      ${LABELS}`);
}

/**
 * The day's theme. Rotation interleaves the two kinds, so places and sizes
 * alternate with people, money and fame rather than coming in runs.
 */
export const ROTATION = (() => {
  const data = THEMES.filter(t => !t.wikipedia);
  const lists = THEMES.filter(t => t.wikipedia);
  const out = [];
  for (let i = 0; out.length < THEMES.length; i++) {
    if (lists[2 * i]) out.push(lists[2 * i]);
    if (data[i]) out.push(data[i]);
    if (lists[2 * i + 1]) out.push(lists[2 * i + 1]);
  }
  return out;
})();

export const themeFor = dayIndex =>
  ROTATION[((dayIndex % ROTATION.length) + ROTATION.length) % ROTATION.length];
