import { useEffect, useState } from 'react';
import { m } from 'motion/react';
import { Check, Copy, Flame, Share2, Timer, Trophy } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { canShareSheet, shareOrCopy } from '../pages/puzzle/shareResult';
import { CopyLinkButton } from '../components/CopyLinkButton';
import { computeHistoryStats } from './historyStats';
import { dayResults } from './progress';
import { buildDayShare, puzzleUrl } from './share';
import { formatClock, getAllPlays } from './solveRecords';

/**
 * The big finish: shown once every puzzle of the day is done, with the
 * day's marks and a share for the group chat. Renders nothing until then.
 */
export function DayComplete() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [played, setPlayed] = useState(() => dayResults());
  const [streak, setStreak] = useState(() => computeHistoryStats(getAllPlays()).currentStreak);
  // The finish that completes the day may be saved a moment after this
  // first renders (the cryptic page records in an effect): look again.
  useEffect(() => {
    const id = setTimeout(() => {
      setPlayed(dayResults());
      setStreak(computeHistoryStats(getAllPlays()).currentStreak);
    }, 400);
    return () => clearTimeout(id);
  }, []);
  const [shared, setShared] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (shared === 'idle') return;
    const t = setTimeout(() => setShared('idle'), 2500);
    return () => clearTimeout(t);
  }, [shared]);
  if (!played) return null;

  const total = played.reduce((s, p) => s + p.record.seconds, 0);
  const solved = played.filter(p => p.record.outcome === 'solved').length;
  const mark = { solved: '✅', failed: '❌', revealed: '👀' } as const;
  const share = async () => setShared(await shareOrCopy(buildDayShare(played, { streak })));

  return (
    <m.section
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-3xl p-[2px]"
      style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899, #7C3AED)' }}
      aria-label="Every puzzle done today"
    >
      <div className="rounded-[22px] px-5 py-6 text-center" style={{ background: T.cardBg }}>
        <Trophy size={30} className="mx-auto" color="#F59E0B" aria-hidden />
        <h2
          className="mt-2 mb-1"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(1.3rem, 5vw, 1.6rem)',
            color: T.heading,
          }}
        >
          All {played.length} done today! 🦉
        </h2>
        <p className="text-sm font-bold" style={{ color: T.textMuted }}>
          {solved === played.length
            ? 'Every single one solved. Owl-standing.'
            : `${solved} of ${played.length} solved: a full set played.`}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-extrabold">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: T.inputBg, color: T.text }}
          >
            <Timer size={14} aria-hidden /> {formatClock(total)} in total
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: T.successBg, color: isDark ? '#6EE7B7' : '#047857' }}
          >
            <Check size={14} aria-hidden /> {solved}/{played.length} solved
          </span>
          {streak >= 2 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: T.streakBg, color: T.streakText }}
            >
              <Flame size={14} aria-hidden /> {streak}-day streak
            </span>
          )}
        </div>

        <p className="mt-4 mb-0 text-xl tracking-wide leading-relaxed" aria-label="Today's marks">
          {played.map(p => `${p.game.emoji}${mark[p.record.outcome]}`).join(' ')}
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={share}
            className="min-h-[48px] w-full sm:w-auto px-6 rounded-2xl font-extrabold inline-flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              color: '#FFFFFF',
              boxShadow: '0 8px 20px -8px rgba(124,58,237,0.6)',
            }}
          >
            {canShareSheet ? <Share2 size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {shared === 'copied'
              ? 'Day copied'
              : shared === 'shared'
                ? 'Shared!'
                : shared === 'failed'
                  ? "Couldn't share. Try again"
                  : canShareSheet
                    ? 'Share your day'
                    : 'Copy your day'}
          </button>
          <CopyLinkButton url={puzzleUrl('/')} T={T} className="min-h-[48px] w-full sm:w-auto" />
        </div>
      </div>
    </m.section>
  );
}
