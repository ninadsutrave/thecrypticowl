/**
 * Daily themes. Each is a Wikidata query for well-known things (fame by
 * sitelinks: how many Wikipedias have an article) with one number to
 * compare, plus how the game words and formats it.
 *
 * `?value` must come out as a plain number: quantities use the normalised
 * value (psn:, always SI units), dates the year. Every query returns
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
    id: 'film-year',
    title: 'Which film came out later?',
    noun: 'release year',
    higher: 'Later',
    lower: 'Earlier',
    format: 'year',
    close: { minGap: 3, maxGap: 25 },
    query: `SELECT ?item ?itemLabel ?itemDescription (MIN(YEAR(?d)) AS ?value) (MAX(?sl) AS ?links) WHERE {
      ?item wdt:P31 wd:Q11424 ; wdt:P577 ?d ; wikibase:sitelinks ?sl .
      FILTER(?sl >= 70)
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
];

export const themeFor = dayIndex =>
  THEMES[((dayIndex % THEMES.length) + THEMES.length) % THEMES.length];
