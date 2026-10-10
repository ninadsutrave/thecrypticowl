/**
 * Reads the data tables (`class="wikitable"`) out of a Wikipedia article's
 * rendered HTML, as a grid of cells with rowspans and colspans spread out,
 * so column N of every row means the same thing.
 *
 * Regex-based on purpose: Wikipedia's HTML is machine-written and regular,
 * and a full HTML parser would be the Lambda's biggest dependency. Callers
 * validate what comes out (enough rows, real numbers) and skip a table that
 * no longer reads.
 */

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
};

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** A cell's visible text: no footnote markers, hidden sort keys or tags. */
export function cellText(html) {
  return decode(
    html
      .replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[\s\S]*?<\/sup>/g, '')
      .replace(/<style\b[\s\S]*?<\/style>/g, '')
      .replace(
        /<span\b[^>]*(?:display:\s*none|class="[^"]*sortkey[^"]*")[^>]*>[\s\S]*?<\/span>/g,
        ''
      )
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\[[^\]]{0,12}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FLAG_ICON = /<span\b[^>]*class="[^"]*flagicon[^"]*"[^>]*>([\s\S]*?)<\/span>/g;

/** The first article a cell links to, by title: the row's subject (flags don't count). */
function cellLink(html) {
  for (const m of html.replace(FLAG_ICON, '').matchAll(/<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>/g)) {
    const title = decodeURIComponent(m[1]).replace(/_/g, ' ');
    if (!/^(File|Help|Wikipedia|Template|Category|Special|Portal):/.test(title)) return title;
  }
  return null;
}

/** Countries named by flag icons in a cell ("India", "United States"). */
function cellFlags(html) {
  const flags = [];
  for (const m of html.matchAll(FLAG_ICON)) {
    const named = /(?:title|alt)="([^"]+)"/.exec(m[1]);
    if (named) flags.push(decode(named[1]).replace(/^Flag of (the )?/, ''));
  }
  return flags;
}

/** The outermost `<table class="…wikitable…">` blocks, with their start offsets. */
function tableBlocks(html) {
  const blocks = [];
  const re = /<table\b[^>]*class="[^"]*wikitable[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    let depth = 1;
    let i = re.lastIndex;
    const tag = /<(\/?)table\b/g;
    tag.lastIndex = i;
    let t;
    while (depth && (t = tag.exec(html))) {
      depth += t[1] ? -1 : 1;
      i = tag.lastIndex;
    }
    blocks.push({ start: m.index, html: html.slice(m.index, i) });
    re.lastIndex = i;
  }
  return blocks;
}

/** Section headings with their offsets, in page order. */
function headings(html) {
  return [...html.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/g)].map(m => ({
    at: m.index,
    text: cellText(m[1]),
  }));
}

const span = (attrs, name) =>
  Math.max(1, Number(new RegExp(`${name}="?(\\d+)`).exec(attrs)?.[1] ?? 1));

/**
 * Every wikitable in the page: its section heading, header row texts and
 * body rows. Each cell is { text, link, flags }.
 */
export function readTables(html) {
  const sections = headings(html);
  return tableBlocks(html).map(({ start, html: table }) => {
    const grid = [];
    const pending = []; // column → { cell, left } carried down by rowspan
    const header = [];
    // Nested tables would confuse the row split; drop them first.
    const flat = table.slice(1).replace(/<table\b[\s\S]*?<\/table>/g, '');
    for (const tr of flat.split(/<tr\b[^>]*>/).slice(1)) {
      const row = [];
      let col = 0;
      let allHeader = true;
      const fill = () => {
        while (pending[col]?.left > 0) {
          row[col] = pending[col].cell;
          pending[col].left--;
          col++;
        }
      };
      for (const m of tr.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
        fill();
        const [, kind, attrs, inner] = m;
        if (kind === 'td') allHeader = false;
        const cell = { text: cellText(inner), link: cellLink(inner), flags: cellFlags(inner) };
        const rows = span(attrs, 'rowspan');
        for (let c = 0; c < span(attrs, 'colspan'); c++) {
          row[col] = cell;
          if (rows > 1) pending[col] = { cell, left: rows - 1 };
          col++;
        }
      }
      fill();
      if (!row.length) continue;
      if (allHeader && !grid.length) header.push(row.map(c => c?.text ?? ''));
      else grid.push(row);
    }
    return {
      heading: sections.filter(h => h.at < start).at(-1)?.text ?? '',
      header: header.at(-1) ?? [],
      rows: grid,
    };
  });
}

const MULTIPLIERS = {
  thousand: 1e3,
  million: 1e6,
  billion: 1e9,
  trillion: 1e12,
  lakh: 1e5,
  crore: 1e7,
};

/**
 * The first number in a cell, scaled by any word after it:
 * "35" → 35, "$2.923 billion" → 2.923e9, "₹1,200 crore" → 1.2e10,
 * "₹1,968–2,054 crore" → 1.968e10.
 * NaN when there is none.
 */
export function cellNumber(text) {
  // A range ("₹1,968–2,054 crore") counts at its low end, scaled by the unit after it.
  const m =
    /(\d[\d,]*(?:\.\d+)?)(?:\s*[–-]\s*\d[\d,]*(?:\.\d+)?)?\s*(thousand|million|billion|trillion|lakh|crore)?/i.exec(
      String(text ?? '')
    );
  if (!m) return NaN;
  const n = Number(m[1].replace(/,/g, ''));
  return m[2] ? n * MULTIPLIERS[m[2].toLowerCase()] : n;
}
