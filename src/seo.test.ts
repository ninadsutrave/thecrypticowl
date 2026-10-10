import { describe, expect, it } from 'vitest';
import seo from './seo.json';
import { GAMES } from './app/games/registry';
import hub from './app/pages/Hub.tsx?raw';
import learn from './app/pages/Learn.tsx?raw';
import indexHtml from '../index.html?raw';

// Titles the app sets in the browser must match what search engines get.

describe('seo.json', () => {
  it('has a page for every game, named and titled like the app', () => {
    for (const game of GAMES) {
      const page = seo.pages.find(p => p.path === game.path);
      expect(page, game.id).toBeDefined();
      expect(page?.name).toBe(game.name);
      // GameShell: `${game.name} · Free daily puzzle · The Cryptic Owl`
      expect(page?.title).toBe(`${game.name} · Free daily puzzle · The Cryptic Owl`);
    }
  });

  it('matches the titles the home and guide pages set', () => {
    expect(hub).toContain(seo.home.title);
    expect(learn).toContain(seo.pages.find(p => p.path === '/learn')?.title);
    expect(indexHtml).toContain(`<title>${seo.home.title}</title>`);
  });

  it('keeps descriptions to what search results show', () => {
    for (const page of [seo.home, ...seo.pages]) {
      expect(page.description.length, page.path).toBeLessThanOrEqual(230);
      expect(page.title.length, page.path).toBeLessThanOrEqual(70);
    }
  });

  it('never names third-party puzzle sources', () => {
    expect(JSON.stringify(seo)).not.toMatch(/lichess/i);
  });
});
