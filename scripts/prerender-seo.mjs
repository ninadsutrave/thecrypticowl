#!/usr/bin/env node
/**
 * Search-engine pages for the single-page app. Runs after `vite build`.
 *
 * Every route used to be served the same index.html, so search engines and
 * link previews saw one title and description for the whole site. From
 * `src/seo.json` this writes, for the home page and each public route:
 *
 *   - its own <title>, description, canonical URL and Open Graph/Twitter tags;
 *   - JSON-LD structured data (the site, its list of puzzles, each page);
 *   - a short crawlable summary inside #root, visually hidden, which React
 *     replaces on load with the real page (same content, so not cloaking).
 *
 * Output: dist/index.html (home) and dist/_routes/<name>.html for each route,
 * which the deploy uploads to the S3 key "<name>" so CloudFront serves
 * /<name> directly. Also writes dist/sitemap.xml and dist/llms.txt from the
 * same list, so they can't drift from the real pages again.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const seo = JSON.parse(readFileSync('src/seo.json', 'utf8'));
const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const url = path => `${seo.site}${path === '/' ? '/' : path}`;
const games = seo.pages.filter(p => p.game);

function jsonLd(page) {
  const website = {
    '@type': 'WebSite',
    '@id': `${seo.site}/#website`,
    name: seo.name,
    url: `${seo.site}/`,
    description: seo.home.description,
    inLanguage: 'en',
    author: { '@type': 'Person', name: 'Ninad Sutrave', url: 'https://ninadsutrave.in' },
  };
  const graph = [website];
  if (page.path === '/') {
    graph.push({
      '@type': 'ItemList',
      name: 'Daily puzzles',
      itemListElement: games.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.name,
        url: url(g.path),
      })),
    });
  } else {
    graph.push({
      '@type': 'WebPage',
      name: page.title,
      url: url(page.path),
      description: page.description,
      isPartOf: { '@id': `${seo.site}/#website` },
      ...(page.game
        ? {
            mainEntity: {
              '@type': 'Game',
              name: page.name,
              description: page.description,
              url: url(page.path),
              isAccessibleForFree: true,
            },
          }
        : {}),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function render(page) {
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url(page.path)}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url(page.path)}" />`,
    `<meta property="og:site_name" content="${esc(seo.name)}" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<script type="application/ld+json">${jsonLd(page).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');

  // Links to every puzzle, so crawlers find them all from any page.
  const links = games.map(g => `<li><a href="${g.path}">${esc(g.name)}</a></li>`).join('');
  const summary =
    `<div class="seo-summary"><h1>${esc(page.heading)}</h1><p>${esc(page.body)}</p>` +
    `<nav aria-label="Puzzles"><ul>${links}<li><a href="/learn">How to solve cryptic clues</a></li></ul></nav></div>`;

  let html = shell
    // Drop the shell's own copies of the tags this page replaces.
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
    .replace(/<link rel="canonical"[^>]*>\s*/, '')
    .replace(/<meta\s+property="og:(title|description|url|site_name)"[\s\S]*?\/>\s*/g, '')
    .replace(/<meta\s+name="twitter:(title|description)"[\s\S]*?\/>\s*/g, '');
  html = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${head}`);
  if (!html.includes('<div id="root"></div>')) throw new Error('index.html: no empty #root');
  return html.replace('<div id="root"></div>', `<div id="root">${summary}</div>`);
}

// Home page in place; every other route under _routes/ for the deploy.
writeFileSync(join(DIST, 'index.html'), render(seo.home));
mkdirSync(join(DIST, '_routes'), { recursive: true });
for (const page of seo.pages) {
  writeFileSync(join(DIST, '_routes', `${page.path.slice(1)}.html`), render(page));
}

const today = new Date().toISOString().slice(0, 10);
const entry = (path, freq, priority) =>
  `  <url>\n    <loc>${url(path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
writeFileSync(
  join(DIST, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entry('/', 'daily', '1.0'),
    ...seo.pages.map(p =>
      p.game
        ? entry(p.path, 'daily', '0.9')
        : entry(
            p.path,
            p.path === '/learn' ? 'monthly' : 'yearly',
            p.path === '/learn' ? '0.8' : '0.3'
          )
    ),
    '</urlset>',
    '',
  ].join('\n')
);

writeFileSync(
  join(DIST, 'llms.txt'),
  [
    `# ${seo.name}`,
    '',
    `> ${seo.home.description}`,
    '',
    '## Puzzles',
    '',
    `- [All of today's puzzles](${url('/')}): the home page`,
    ...games.map(g => `- [${g.name}](${url(g.path)}): ${g.description}`),
    '',
    '## More',
    '',
    ...seo.pages
      .filter(p => !p.game)
      .map(p => `- [${p.heading}](${url(p.path)}): ${p.description}`),
    '',
  ].join('\n')
);

console.log(`SEO: home + ${seo.pages.length} routes, sitemap.xml, llms.txt`);
