/**
 * The hint, drawn as letter slots: the first letter filled in, an empty slot
 * for every other letter, a gap between words. Punctuation and digits show
 * as they are.
 */
export function LetterPattern({
  answer,
  color = 'currentColor',
}: {
  answer: string;
  color?: string;
}) {
  let first = true;
  const words = answer.trim().split(/\s+/);
  return (
    <span className="inline-flex flex-wrap items-end gap-x-3 gap-y-1.5" aria-hidden>
      {words.map((word, w) => (
        <span key={w} className="inline-flex items-end gap-1">
          {[...word].map((ch, i) => {
            const letter = /\p{L}/u.test(ch);
            const shown = letter && first;
            if (shown) first = false;
            if (!letter) {
              return (
                <span key={i} className="text-sm font-extrabold" style={{ color }}>
                  {ch}
                </span>
              );
            }
            return (
              <span
                key={i}
                className="inline-flex items-end justify-center text-sm font-extrabold"
                style={{ width: 14, height: 20, borderBottom: `2px solid ${color}`, color }}
              >
                {shown ? ch.toUpperCase() : ''}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
