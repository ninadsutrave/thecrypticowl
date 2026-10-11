/**
 * Suitability screen on the judge model. Keyword filters catch the obvious
 * (wars, killings, disasters) but not "a nuclear test" or "a sectarian
 * picket", nor tell a household name from an obscure one. One call per date
 * reviews every candidate before any are picked.
 *
 * Optional by design: with no model key, or if the call fails, Chronology
 * falls back to its keyword filters rather than missing a day.
 */

export const SCREEN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdicts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'INTEGER' },
          suitable: { type: 'BOOLEAN' },
        },
        required: ['index', 'suitable'],
      },
    },
  },
  required: ['verdicts'],
};

export const SCREEN_SYSTEM = `You curate a light, friendly daily history puzzle. Most players are in India; the rest are international. For each numbered event, decide whether it is suitable.

Suitable means BOTH:
- Recognisable: a well-read adult has likely heard of it or its subject, or it is a clear landmark (a founding, a first, an invention, a famous work, a coronation of a well-known ruler, a famous person's birth). Judge Indian history, leaders, reformers, film, music and sport as an Indian reader would: a figure well known in India counts even if few outside India know them.
- Told as history, not as horror: wars, battles, campaigns, sieges, coups and military operations are welcome (including the World Wars and Indian military history). Turn away atrocities, massacres, genocide, terrorism, executions, disasters and crashes, events described by their death toll, sectarian or ethnic violence, and anything likely to upset or divide players.
- A living person's birth only if they are loved and uncontroversial: film, music, sport, science, arts. Never a politician, activist, businessperson or anyone whose name divides opinion.

Be strict: when unsure, mark it unsuitable. There are plenty to choose from.`;

export function buildScreenPrompt(events) {
  return events.map((e, i) => `${i}. ${e.text}`).join('\n');
}

/** Keep the candidates the judge marks suitable; null when it can't be asked. */
export async function screenEvents(events, callJudge) {
  if (!callJudge || events.length === 0) return null;
  const out = await callJudge(buildScreenPrompt(events), SCREEN_SYSTEM, SCREEN_SCHEMA);
  const keep = new Set((out?.verdicts ?? []).filter(v => v?.suitable === true).map(v => v.index));
  return events.filter((_, i) => keep.has(i));
}
