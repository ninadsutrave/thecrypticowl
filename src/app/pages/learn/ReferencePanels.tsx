import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GLOSSARY, INDICATORS } from '../../data/crypticReference';

const H2 = { fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem' } as const;

/** The usual signpost words for each kind of wordplay. */
export function IndicatorsPanel({ onNext }: { onNext: () => void }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ ...H2, color: T.heading }}>Indicators 🧭</h2>
        <p style={{ fontSize: '0.9rem', color: T.textMuted, fontWeight: 600 }}>
          Words that tell you what the wordplay is doing. Spot one, and you know which tool to reach
          for.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {INDICATORS.map(group => (
          <section
            key={group.type}
            className="rounded-2xl border p-4"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <h3 className="m-0 font-extrabold flex items-center gap-2" style={{ color: T.heading }}>
              <span aria-hidden>{group.emoji}</span> {group.type}
            </h3>
            <p className="mt-1 mb-2 text-sm" style={{ color: T.textMuted, fontWeight: 600 }}>
              {group.means}
            </p>
            <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {group.words.map(w => (
                <li
                  key={w}
                  className="rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: T.indicatorBg, color: T.indicatorText }}
                >
                  {w}
                </li>
              ))}
            </ul>
            {group.example && (
              <p className="mt-3 mb-0 text-xs font-bold" style={{ color: T.textMuted }}>
                e.g. {group.example}
              </p>
            )}
          </section>
        ))}
      </div>
      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-extrabold"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white' }}
      >
        See sample clues <ChevronRight size={16} />
      </button>
    </div>
  );
}

/** A–Z of cryptic terms, searchable. */
export function GlossaryPanel() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const entries = GLOSSARY.filter(
    e => !q || e.term.toLowerCase().includes(q) || e.meaning.toLowerCase().includes(q)
  );
  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ ...H2, color: T.heading }}>Glossary 📖</h2>
        <p style={{ fontSize: '0.9rem', color: T.textMuted, fontWeight: 600 }}>
          The words solvers use, from &amp;lit to wordplay.
        </p>
      </div>
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2"
          size={18}
          style={{ color: T.textFaint }}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search the glossary…"
          aria-label="Search the glossary"
          className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 outline-none"
          style={{
            background: T.cardBg,
            borderColor: T.cardBorder,
            color: T.text,
            fontSize: '1rem',
          }}
        />
      </div>
      <dl className="m-0 grid gap-2.5">
        {entries.map(e => (
          <div
            key={e.term}
            className="rounded-2xl border px-4 py-3"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <dt className="font-extrabold" style={{ color: T.heading }}>
              {e.term}
            </dt>
            <dd className="m-0 mt-0.5 text-sm" style={{ color: T.textMuted, fontWeight: 600 }}>
              {e.meaning}
            </dd>
          </div>
        ))}
        {!entries.length && (
          <p className="text-sm font-bold" style={{ color: T.textMuted }}>
            Nothing matches “{query}”.
          </p>
        )}
      </dl>
    </div>
  );
}
