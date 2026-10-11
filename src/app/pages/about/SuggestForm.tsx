import { useState } from 'react';
import { Check, Lightbulb, Send } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { submitPuzzleSuggestion } from '../../../lib/supabase';
import { IDEA_MAX, NAME_MAX, markSent, secondsUntilNext, suggestionProblem } from './suggestion';

type State = 'idle' | 'sending' | 'sent' | 'error';

/** "Suggest a puzzle": one idea, an optional name, nothing else. */
export function SuggestForm() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  // A field people never see: bots that fill every input fill this too.
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = suggestionProblem(idea, name);
    if (problem) return setMessage(problem);
    const wait = secondsUntilNext();
    if (wait > 0) return setMessage(`Thanks! Give it ${wait} seconds before the next one.`);
    if (website) {
      setState('sent'); // quietly drop it
      return;
    }
    setState('sending');
    setMessage(null);
    const ok = await submitPuzzleSuggestion(idea, name);
    if (ok) {
      markSent();
      setState('sent');
    } else {
      setState('error');
      setMessage("That didn't go through. Please try again in a moment.");
    }
  };

  const input = {
    borderColor: T.inputBorder,
    background: T.inputBg,
    color: T.text,
    fontWeight: 600,
  } as const;

  if (state === 'sent') {
    return (
      <div
        className="rounded-3xl border-2 p-6 text-center"
        style={{ background: T.successBg, borderColor: T.successBorder }}
        role="status"
      >
        <Check size={28} className="mx-auto" color="#10B981" aria-hidden />
        <p className="mt-2 mb-0 font-extrabold" style={{ color: T.heading }}>
          Thank you! The owl has your idea.
        </p>
        <p className="mt-1 mb-0 text-sm" style={{ color: T.textMuted, fontWeight: 600 }}>
          We read every suggestion when choosing what to build next.
        </p>
        <button
          type="button"
          onClick={() => {
            setIdea('');
            setName('');
            setState('idle');
          }}
          className="mt-4 text-sm font-extrabold underline min-h-[40px]"
          style={{ color: T.brandText }}
        >
          Suggest another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border p-5 sm:p-6 space-y-4"
      style={{ background: T.cardBg, borderColor: T.cardBorder, boxShadow: T.shadowCard }}
      noValidate
    >
      <label className="block">
        <span className="block text-sm font-extrabold mb-1.5" style={{ color: T.heading }}>
          What puzzle would you like to play here?
        </span>
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value.slice(0, IDEA_MAX))}
          rows={4}
          required
          placeholder="A daily word ladder, a nonogram, a guess-the-country-from-its-outline game… and how it might work."
          className="w-full rounded-2xl border-2 px-4 py-3 focus:outline-none resize-y"
          style={{ ...input, fontSize: '1rem', lineHeight: 1.5 }}
        />
        <span
          className="block text-right text-xs font-bold mt-1"
          style={{ color: T.textMuted }}
          aria-live="polite"
        >
          {idea.trim().length}/{IDEA_MAX}
        </span>
      </label>

      <label className="block">
        <span className="block text-sm font-extrabold mb-1.5" style={{ color: T.heading }}>
          Your name <span style={{ color: T.textMuted, fontWeight: 600 }}>(optional)</span>
        </span>
        <input
          value={name}
          onChange={e => setName(e.target.value.slice(0, NAME_MAX))}
          autoComplete="nickname"
          className="w-full rounded-2xl border-2 px-4 py-3 focus:outline-none"
          style={{ ...input, fontSize: '1rem' }}
        />
      </label>

      <label className="sr-only" aria-hidden>
        Leave this empty
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </label>

      {message && (
        <p
          className="text-sm font-bold rounded-xl px-3 py-2 border"
          style={{
            background: state === 'error' ? T.wrongBg : T.fodderBg,
            borderColor: state === 'error' ? T.wrongBorder : T.streakBorder,
            color: T.text,
          }}
          role="alert"
        >
          {message}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <p
          className="text-xs flex items-center gap-1.5"
          style={{ color: T.textMuted, fontWeight: 600 }}
        >
          <Lightbulb size={13} aria-hidden /> No email needed. We only keep your idea and name.
        </p>
        <button
          type="submit"
          disabled={state === 'sending'}
          className="min-h-[48px] px-6 rounded-2xl font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: T.brand, color: '#FFFFFF' }}
        >
          <Send size={16} aria-hidden /> {state === 'sending' ? 'Sending…' : 'Send suggestion'}
        </button>
      </div>
    </form>
  );
}
