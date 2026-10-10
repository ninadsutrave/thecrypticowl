import { describe, expect, it } from 'vitest';
import { cellNumber, cellText, readTables } from './wikiTables.js';

const PAGE = `
<h2 id="Most">Most wins</h2>
<table class="wikitable sortable">
<tbody><tr><th>Rank</th><th>Artist</th><th>Country</th><th>Awards</th></tr>
<tr><td rowspan="2">1</td><td><a href="/wiki/Beyonc%C3%A9" title="Beyoncé">Beyoncé</a><sup class="reference"><a href="#cite">[1]</a></sup></td>
<td><span class="flagicon"><img alt="United States" src="x.png"></span> <a href="/wiki/United_States">US</a></td><td rowspan="2">35</td></tr>
<tr><td><span class="flagicon"><a href="/wiki/India" title="India"><img alt="India"></a></span> <a href="/wiki/A._R._Rahman">A. R. Rahman</a> ǂ</td>
<td><span class="flagicon"><img alt="India"></span> India</td></tr>
<tr><td colspan="2">Total</td><td>—</td><td>70&nbsp;million</td></tr>
</tbody></table>
<h3>Other</h3><p>No table here.</p>`;

describe('readTables', () => {
  const [table] = readTables(PAGE);

  it('reads the heading and header row', () => {
    expect(table.heading).toBe('Most wins');
    expect(table.header).toEqual(['Rank', 'Artist', 'Country', 'Awards']);
  });

  it('spreads rowspans and colspans so columns line up', () => {
    expect(table.rows).toHaveLength(3);
    const [first, second, total] = table.rows;
    expect(first.map(c => c.text)).toEqual(['1', 'Beyoncé', 'US', '35']);
    expect(second.map(c => c.text)).toEqual(['1', 'A. R. Rahman ǂ', 'India', '35']);
    expect(total.map(c => c.text)).toEqual(['Total', 'Total', '—', '70 million']);
  });

  it("links a row to its subject, skipping flags, and reads flags' countries", () => {
    const [first, second] = table.rows;
    expect(first[1].link).toBe('Beyoncé');
    expect(second[1].link).toBe('A. R. Rahman');
    expect(second[2].flags).toEqual(['India']);
    expect(first[2].flags).toEqual(['United States']);
  });
});

describe('cellText', () => {
  it('drops footnotes, hidden sort keys and tags', () => {
    expect(
      cellText('<span class="sortkey">0001</span>Avatar<sup class="reference">[2]</sup> &amp; co')
    ).toBe('Avatar & co');
  });
});

describe('cellNumber', () => {
  it('reads plain numbers, units and ranges', () => {
    expect(cellNumber('35')).toBe(35);
    expect(cellNumber('$2,927,099,455')).toBe(2_927_099_455);
    expect(cellNumber('$2.923 billion')).toBe(2.923e9);
    expect(cellNumber('₹1,968–2,054 crore')).toBe(1.968e10);
    expect(cellNumber('9,000,000 (2025)')).toBe(9e6);
    expect(cellNumber('—')).toBeNaN();
  });
});
