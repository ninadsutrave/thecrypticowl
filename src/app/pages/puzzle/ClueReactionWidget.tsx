import { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { getTheme } from '../../theme';
import { useClueReaction, type Reaction } from '../../hooks/useClueReaction';
// ─── CLUE REACTION ────────────────────────────────────────────────────────────

export function ClueReactionWidget({
  puzzleNumber,
  userId,
  puzzleId,
  isDark,
  variant = 'inline',
}: {
  puzzleNumber: number;
  userId?: string;
  puzzleId?: string;
  isDark: boolean;
  variant?: 'inline' | 'card';
}) {
  const { reaction, vote } = useClueReaction(puzzleNumber, userId, puzzleId);
  return (
    <ReactionWidget reaction={reaction} vote={vote} noun="clue" isDark={isDark} variant={variant} />
  );
}

/** Thumbs up / down with a thank-you note. Toggling the chosen thumb clears it. */
export function ReactionWidget({
  reaction,
  vote,
  noun,
  isDark,
  variant = 'inline',
}: {
  reaction: Reaction;
  vote: (r: 'like' | 'dislike') => Promise<boolean>;
  noun: 'clue' | 'puzzle';
  isDark: boolean;
  variant?: 'inline' | 'card';
}) {
  const T = getTheme(isDark);
  const [flash, setFlash] = useState<'like' | 'dislike' | 'failed' | null>(null);

  const handleVote = async (r: 'like' | 'dislike') => {
    const isDeselect = reaction === r;
    if (!isDeselect) setFlash(r);
    const saved = await vote(r);
    if (!saved) setFlash('failed');
    if (!isDeselect || !saved) setTimeout(() => setFlash(null), 1800);
  };

  const likeActive = reaction === 'like';
  const dislikeActive = reaction === 'dislike';

  const buttons = (
    <div className="flex items-center gap-2">
      {/* 👍 */}
      <m.button
        onClick={() => handleVote('like')}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        className="flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-full border transition-colors"
        style={{
          background: likeActive ? T.successBg : 'transparent',
          borderColor: likeActive ? '#10B981' : T.inputBorder,
          color: likeActive ? '#10B981' : T.textMuted,
        }}
        aria-label={`Like this ${noun}`}
        aria-pressed={likeActive}
      >
        <ThumbsUp size={14} />
      </m.button>

      {/* 👎 */}
      <m.button
        onClick={() => handleVote('dislike')}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        className="flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-full border transition-colors"
        style={{
          background: dislikeActive ? T.wrongBg : 'transparent',
          borderColor: dislikeActive ? '#EF4444' : T.inputBorder,
          color: dislikeActive ? '#EF4444' : T.textMuted,
        }}
        aria-label={`Dislike this ${noun}`}
        aria-pressed={dislikeActive}
      >
        <ThumbsDown size={14} />
      </m.button>

      {/* Thank-you flash */}
      <AnimatePresence>
        {flash && (
          <m.span
            key={flash}
            role="status"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: flash === 'like' ? '#10B981' : '#EF4444',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {flash === 'like'
              ? 'Thanks! 🙏'
              : flash === 'dislike'
                ? 'Noted! 📝'
                : 'Couldn’t save that, try again'}
          </m.span>
        )}
      </AnimatePresence>
    </div>
  );

  if (variant === 'card') {
    return (
      <m.div
        className="rounded-3xl border p-4"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <p
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: '0.88rem',
              color: T.textMuted,
              margin: 0,
            }}
          >
            Did you like this {noun}?
          </p>
          {buttons}
        </div>
      </m.div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: T.textFaint,
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        Did you like this {noun}?
      </span>
      {buttons}
    </div>
  );
}
