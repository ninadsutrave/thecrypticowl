/**
 * Daily themes. Each is a Wikidata query for well-known things (fame by
 * sitelinks: how many Wikipedias have an article) with one number to
 * compare, plus how the game words and formats it.
 *
 * `?value` must come out as a plain number: quantities use the normalised
 * value (psn:, always SI units). Every query returns
 * ?item ?itemLabel ?itemDescription ?value ?links.
 *
 * `poolSize` (default 150) keeps only the best-known entries; smaller for
 * themes whose long tail is obscure.
 *
 * `close` sets what a fair pair looks like: far enough apart to be clearly
 * different, close enough to need knowledge rather than common sense.
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
];

/** India's first-level divisions as they stand: states and union territories. */
const INDIA_DIVISIONS = `wd:Q668 wdt:P150 ?item . FILTER NOT EXISTS { ?item wdt:P576 ?ended }`;

/**
 * India-focused themes: five days in eight (shared/runtime/india.js) draw
 * from these instead.
 */
export const INDIA_THEMES = [
  {
    id: 'indian-city-population',
    title: 'Which Indian city has more people?',
    noun: 'population (city proper)',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    poolSize: 120,
    close: { minRatio: 1.12, maxRatio: 1.9 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?pop) AS ?value) (MAX(?sl) AS ?links) WHERE {
      VALUES ?type { wd:Q1549591 wd:Q1637706 wd:Q200250 }
      ?item wdt:P31 ?type ; wdt:P17 wd:Q668 ; wdt:P1082 ?pop ; wikibase:sitelinks ?sl .
      FILTER(?sl >= 25)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'indian-state-population',
    title: 'Which Indian state or territory has more people?',
    noun: 'population',
    higher: 'More',
    lower: 'Fewer',
    format: 'count',
    close: { minRatio: 1.15, maxRatio: 2.5 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?pop) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ${INDIA_DIVISIONS}
      ?item wdt:P1082 ?pop ; wikibase:sitelinks ?sl .
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'indian-state-area',
    title: 'Which Indian state or territory is bigger?',
    noun: 'area',
    higher: 'Bigger',
    lower: 'Smaller',
    format: 'area',
    close: { minRatio: 1.15, maxRatio: 2.5 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ${INDIA_DIVISIONS}
      ?item wikibase:sitelinks ?sl .
      ${quantity('P2046').replace('?value', '?v')}
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'indian-river-length',
    title: 'Which Indian river is longer?',
    noun: 'length',
    higher: 'Longer',
    lower: 'Shorter',
    format: 'kilometres',
    poolSize: 80,
    close: { minRatio: 1.12, maxRatio: 2 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q4022 ; wdt:P17 wd:Q668 ; wikibase:sitelinks ?sl .
      ${quantity('P2043').replace('?value', '?v')}
      FILTER(?sl >= 15)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
  {
    id: 'indian-peak-height',
    title: 'Which Indian peak is higher?',
    noun: 'height',
    higher: 'Higher',
    lower: 'Lower',
    format: 'metres',
    poolSize: 50,
    close: { minRatio: 1.04, maxRatio: 1.6 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MAX(?v) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q8502 ; wdt:P17 wd:Q668 ; wikibase:sitelinks ?sl .
      ${quantity('P2044').replace('?value', '?v')}
      FILTER(?sl >= 10)
      ${LABELS}
    } GROUP BY ?item ?itemLabel ?itemDescription`,
  },
];

/** Every theme, for looking one up by id. */
export const ALL_THEMES = [...THEMES, ...INDIA_THEMES];

export const themeFor = dayIndex =>
  THEMES[((dayIndex % THEMES.length) + THEMES.length) % THEMES.length];
