import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Coffee,
  Gift,
  Lightbulb,
  Presentation,
  Sparkles,
  TrainFront,
  UserRound,
} from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { GAMES } from '../games/registry';
import { GameIcon } from '../games/GameIcon';
import { SuggestForm } from './about/SuggestForm';

const FONT_HEADING = "'Outfit', sans-serif";

export function About() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { hash } = useLocation();
  const suggestRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = 'About · The Cryptic Owl';
  }, []);
  // /about#suggest (from the home page and footer) lands on the form.
  useEffect(() => {
    if (hash === '#suggest') suggestRef.current?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const moments = [
    { Icon: TrainFront, text: 'On the way to the office' },
    { Icon: Coffee, text: 'While the kettle boils' },
    { Icon: Presentation, text: 'Stuck in a boring meeting' },
  ];

  const promises = [
    {
      Icon: Sparkles,
      title: 'Fresh every midnight',
      text: 'One of each puzzle, new every day at midnight your time. Most take a few minutes.',
    },
    {
      Icon: Lightbulb,
      title: 'Hints when you are stuck',
      text: 'Every puzzle has a nudge or two, and a quick walkthrough for anything new.',
    },
    {
      Icon: Gift,
      title: 'Free',
      text: 'Every puzzle, every day, free. No sign-up needed: just open one and play.',
    },
    {
      Icon: UserRound,
      title: 'Sign in to track your progress',
      text: 'Keep your streak and play history on every device, and go back to solve past puzzles.',
    },
  ];

  const h2 = {
    fontFamily: FONT_HEADING,
    fontSize: 'clamp(1.35rem, 4.5vw, 1.7rem)',
    color: T.heading,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <header className="pt-10 pb-8 flex flex-col items-center text-center">
        <Mascot mood="default" size={88} speechBubble="Hoo's ready for today's puzzles?" />
        <h1
          className="mt-4"
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 'clamp(1.8rem, 6vw, 2.5rem)',
            color: T.heading,
            lineHeight: 1.15,
          }}
        >
          Puzzles for every day
        </h1>
        <p
          className="mt-3 max-w-xl m-0"
          style={{ color: T.textMuted, fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.65 }}
        >
          The Cryptic Owl is an everyday puzzle site: a small set of fun, fresh puzzles every day,
          each worth a few minutes of your time. Whether you're on the way to the office or stuck in
          a boring meeting, there's always something here to solve.
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2 list-none p-0 m-0">
          {moments.map(({ Icon, text }) => (
            <li
              key={text}
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold"
              style={{ borderColor: T.cardBorder, background: T.cardBg, color: T.text }}
            >
              <Icon size={15} aria-hidden style={{ color: T.brand }} /> {text}
            </li>
          ))}
        </ul>
      </header>

      <section aria-labelledby="today" className="mb-12">
        <h2 id="today" style={h2}>
          Today's lineup
        </h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 list-none p-0 m-0">
          {GAMES.map(game => (
            <li key={game.id}>
              <Link
                to={game.path}
                className="flex items-center gap-3 rounded-2xl border px-3 py-3 no-underline h-full transition-shadow hover:shadow-md"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <GameIcon gameId={game.id} size={40} />
                <span className="min-w-0">
                  <span className="block font-extrabold" style={{ color: T.heading }}>
                    {game.name}
                  </span>
                  <span
                    className="block text-xs font-semibold line-clamp-2"
                    style={{ color: T.textMuted }}
                  >
                    {game.blurb}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="mb-12">
        <h2 id="how" style={h2}>
          How it works
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {promises.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border p-4"
              style={{ background: T.cardBg, borderColor: T.cardBorder }}
            >
              <Icon size={20} aria-hidden style={{ color: T.brand }} />
              <h3 className="mt-2 mb-1 font-extrabold text-base" style={{ color: T.heading }}>
                {title}
              </h3>
              <p
                className="m-0 text-sm"
                style={{ color: T.textMuted, fontWeight: 600, lineHeight: 1.55 }}
              >
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="suggest"
        ref={suggestRef}
        aria-labelledby="suggest-title"
        className="scroll-mt-24"
      >
        <h2 id="suggest-title" style={h2}>
          Suggest a puzzle
        </h2>
        <p className="mt-1 mb-4" style={{ color: T.textMuted, fontWeight: 600, lineHeight: 1.6 }}>
          Missing your favourite? Tell us which puzzle you'd like to see here next.
        </p>
        <SuggestForm />
      </section>

      <p
        className="mt-12 flex flex-wrap items-center justify-center gap-x-1 text-sm"
        style={{ color: T.textMuted, fontWeight: 600 }}
      >
        Made by{' '}
        <a
          href="https://ninadsutrave.in"
          target="_blank"
          rel="noopener noreferrer"
          className="font-extrabold underline"
          style={{ color: T.brandText }}
        >
          Ninad Sutrave
        </a>{' '}
        and Ollie
        <span className="inline-flex" aria-hidden>
          <Mascot size={22} animate={false} />
        </span>
      </p>
    </div>
  );
}
