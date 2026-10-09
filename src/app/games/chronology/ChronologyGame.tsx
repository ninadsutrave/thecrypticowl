import { useRef, useState, type PointerEvent } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, GripVertical, Lock } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { parseChronology } from './parse';
import { correctSlots, moveEvent, moveToSlot } from './logic';
import { SAMPLE_CHRONOLOGY, type ChronologyPuzzle } from './sample';
import { getChronologyTutorial } from './tutorial';

const ACCENT = '#D97706';
const MAX_ATTEMPTS = 3;

export function ChronologyGame() {
  const {
    puzzle: puzzle,
    isPractice,
    loading,
  } = useDailyPuzzle('chronology', SAMPLE_CHRONOLOGY, parseChronology);
  if (loading || !puzzle) return <GameLoading gameId="chronology" />;
  return (
    <GameShell
      gameId="chronology"
      practice={isPractice}
      puzzleId={puzzle.events.map(e => e.id).join('|')}
      subtitle={`${puzzle.events.length} events · Medium`}
      tutorial={getChronologyTutorial(puzzle.events.length)}
      rules={
        <>
          <p>
            Every event below happened on {puzzle.day}, in different years. Use the arrows to put
            them in order, <strong>earliest at the top</strong>.
          </p>
          <p>Drag an event by its handle, or use its arrows.</p>
          <p>
            You have {MAX_ATTEMPTS} checks. After each one, events in the right place lock in green
            and the rest stay movable.
          </p>
          <p>One hint per puzzle: it reveals the year of the event at the top of your list.</p>
        </>
      }
    >
      {api => <ChronologyBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function ChronologyBoard({ puzzle, api }: { puzzle: ChronologyPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  // Saved as ids, so a stored order can't smuggle in stale event text.
  const [orderIds, setOrderIds] = useGameState<string[]>(api, 'order', () =>
    puzzle.events.map(e => e.id)
  );
  const [locked, setLocked] = useGameState<boolean[]>(api, 'locked', () =>
    puzzle.events.map(() => false)
  );
  const [history, setHistory] = useGameState<boolean[][]>(api, 'history', []);
  // The event whose year the one hint revealed — fixed once chosen.
  const [hintId, setHintId] = useGameState<string | null>(api, 'hint', null);
  const hintUsed = hintId !== null;
  const byId = new Map(puzzle.events.map(e => [e.id, e]));
  const order = orderIds.map(id => byId.get(id)!).filter(Boolean);
  const setOrder = (fn: (o: typeof order) => typeof order) => setOrderIds(fn(order).map(e => e.id));

  const finished = api.finished;
  const display = finished ? [...puzzle.events].sort((a, b) => a.year - b.year) : order;

  const check = () => {
    const slots = correctSlots(order);
    const nextHistory = [...history, slots];
    setHistory(nextHistory);
    setLocked(slots);
    const placed = slots.filter(Boolean).length;
    if (placed === slots.length) {
      api.complete({
        outcome: 'solved',
        score: `Check ${nextHistory.length} of ${MAX_ATTEMPTS}${hintUsed ? ' · hint' : ''}`,
        hints: hintUsed ? 1 : 0,
        mistakes: nextHistory.length - 1,
        details: { checks: nextHistory.length },
        grid: chronologyGrid(nextHistory),
      });
    } else if (nextHistory.length === MAX_ATTEMPTS) {
      api.complete({
        outcome: 'failed',
        score: `${placed}/${slots.length} in place`,
        hints: hintUsed ? 1 : 0,
        mistakes: nextHistory.length,
        details: { checks: nextHistory.length, placed },
        grid: chronologyGrid(nextHistory),
      });
    }
  };

  // ── Drag to reorder (arrows remain for keyboard and screen readers) ──────
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<{
    from: number;
    pointerId: number;
    startY: number;
    dy: number;
    mids: number[];
  } | null>(null);

  const dropIndex = (d: NonNullable<typeof drag>) => {
    const centre = d.mids[d.from] + d.dy;
    let best = d.from;
    d.mids.forEach((m, i) => {
      if (Math.abs(m - centre) < Math.abs(d.mids[best] - centre)) best = i;
    });
    return best;
  };

  const startDrag = (e: PointerEvent, i: number) => {
    if (finished || locked[i]) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const mids = rowRefs.current.map(el => {
      const r = el?.getBoundingClientRect();
      return r ? r.top + r.height / 2 : 0;
    });
    setDrag({ from: i, pointerId: e.pointerId, startY: e.clientY, dy: 0, mids });
  };
  const moveDrag = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.pointerId) setDrag({ ...drag, dy: e.clientY - drag.startY });
  };
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const to = dropIndex(drag);
    setDrag(null);
    if (to !== drag.from) setOrder(o => moveToSlot(o, locked, drag.from, to));
  };
  const target = drag ? dropIndex(drag) : null;

  const triesLeft = MAX_ATTEMPTS - history.length;
  const hintEvent = hintId ? byId.get(hintId) : undefined;
  const takeHint = () => setHintId(order.find((_, i) => !locked[i])?.id ?? null);

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between text-xs font-extrabold"
        style={{ color: T.textMuted }}
      >
        <span>EARLIEST ↑</span>
        {!finished && (
          <span>
            {triesLeft} check{triesLeft === 1 ? '' : 's'} left
          </span>
        )}
      </div>

      <ol className="space-y-2 list-none p-0 m-0">
        {display.map((event, i) => {
          const isLocked = !finished && locked[i];
          return (
            <li
              key={event.id}
              ref={el => {
                rowRefs.current[i] = el;
              }}
              className="relative rounded-2xl border-2 px-3 py-3 flex items-center gap-3"
              style={{
                background: isLocked || finished ? T.successBg : T.cardBg,
                borderColor:
                  target === i && drag?.from !== i
                    ? ACCENT
                    : isLocked || finished
                      ? T.successBorder
                      : T.cardBorder,
                borderStyle: target === i && drag?.from !== i ? 'dashed' : 'solid',
                ...(drag?.from === i
                  ? {
                      transform: `translateY(${drag.dy}px) scale(1.02)`,
                      zIndex: 10,
                      boxShadow: T.shadowCardHover,
                      transition: 'none',
                    }
                  : { transition: 'border-color 120ms' }),
              }}
            >
              {!isLocked && !finished && (
                <span
                  onPointerDown={e => startDrag(e, i)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={() => setDrag(null)}
                  className="-ml-1 flex items-center touch-none"
                  style={{ cursor: drag?.from === i ? 'grabbing' : 'grab', color: T.textMuted }}
                  aria-hidden
                >
                  <GripVertical size={18} />
                </span>
              )}
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  background: `${ACCENT}22`,
                  color: ACCENT,
                }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p style={{ color: T.text, fontWeight: 700, lineHeight: 1.45, margin: 0 }}>
                  {event.text}
                </p>
                {finished && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline"
                    style={{ color: ACCENT }}
                  >
                    {event.year} <ExternalLink size={11} />
                  </a>
                )}
              </div>
              {isLocked ? (
                <Lock size={16} color="#10B981" role="img" aria-label="Locked in place" />
              ) : finished ? (
                <CheckCircle2 size={16} color="#10B981" aria-hidden />
              ) : (
                <div className="flex flex-col gap-1">
                  <MoveButton
                    label={`Move "${event.text}" earlier`}
                    disabled={i === 0}
                    onClick={() => setOrder(o => moveEvent(o, locked, i, -1))}
                    T={T}
                  >
                    <ArrowUp size={15} />
                  </MoveButton>
                  <MoveButton
                    label={`Move "${event.text}" later`}
                    disabled={i === display.length - 1}
                    onClick={() => setOrder(o => moveEvent(o, locked, i, 1))}
                    T={T}
                  >
                    <ArrowDown size={15} />
                  </MoveButton>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="text-xs font-extrabold" style={{ color: T.textMuted }}>
        LATEST ↓
      </div>

      {history.length > 0 && (
        <div className="flex flex-col items-center gap-0.5" role="group" aria-label="Your checks">
          {history.map((row, r) => (
            <span key={r} style={{ letterSpacing: '0.15em' }}>
              {row.map(ok => (ok ? '🟩' : '🟨')).join('')}
            </span>
          ))}
        </div>
      )}

      {!finished && hintEvent && (
        <p
          className="rounded-2xl px-4 py-2.5 text-sm font-extrabold border"
          style={{ background: T.fodderBg, borderColor: T.streakBorder, color: T.text }}
        >
          💡 “{hintEvent.text}” happened in {hintEvent.year}.
        </p>
      )}

      {!finished && !hintUsed && (
        <button
          onClick={takeHint}
          className="w-full py-2.5 rounded-2xl border-2 text-sm font-extrabold"
          style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
        >
          💡 Hint: reveal the year of the top unlocked event
        </button>
      )}

      {!finished && (
        <button
          onClick={check}
          className="w-full py-3 rounded-2xl font-extrabold"
          style={{ background: ACCENT, color: 'white' }}
        >
          Check order
        </button>
      )}
      {finished && !history[history.length - 1]?.every(Boolean) && (
        <p className="text-center text-sm font-bold" style={{ color: T.textMuted }}>
          That's the correct order. Each year links to its Wikipedia article.
        </p>
      )}
    </div>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  T,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  T: ReturnType<typeof getTheme>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-7 rounded-lg border flex items-center justify-center disabled:opacity-30"
      style={{ borderColor: T.cardBorder, color: T.brandText, background: T.inputBg }}
    >
      {children}
    </button>
  );
}

/** One row per check: green where an event was in place, yellow where not. */
function chronologyGrid(history: boolean[][]) {
  return history.map(row => row.map(ok => (ok ? '🟩' : '🟨')).join('')).join('\n');
}
