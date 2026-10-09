import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { generateTrivia, pickTopics } from './generator.js';
import { judgeTrivia } from './judge.js';
import { decodeEntities } from './opentdb.js';
import { reviewQuestion, reviewTrivia } from './reviewer.js';
import { CATEGORY_NAMES } from './topics.js';

const q = (i, category = CATEGORY_NAMES[i % CATEGORY_NAMES.length]) => ({
  category,
  question: `Which famous thing number ${i} is described in this medium question here?`,
  options: [`Answer ${i}`, `Wrong A${i}`, `Wrong B${i}`, `Wrong C${i}`],
  answer: 0,
  fact: 'An interesting explanation of the answer.',
  source: { label: 'x', url: 'https://x' },
});

describe('reviewQuestion', () => {
  it('accepts a sound question grounded in its source', () => {
    const src =
      'Canberra was selected as the capital in 1908 as a compromise between Sydney and Melbourne.';
    const ok = {
      ...q(1),
      question: 'Which city is the capital of Australia today?',
      options: ['Canberra', 'Sydney', 'Melbourne', 'Perth'],
    };
    expect(reviewQuestion(ok, src, src)).toEqual([]);
  });

  it('catches duplicate options, a self-answering question, and ungrounded evidence', () => {
    expect(reviewQuestion({ ...q(1), options: ['A', 'A', 'B', 'C'] })).toContain(
      'duplicate options'
    );
    const self = {
      ...q(1),
      question: 'Is Canberra the capital of Australia, the city we mean here?',
      options: ['Canberra', 'Sydney', 'Melbourne', 'Perth'],
    };
    expect(reviewQuestion(self)).toContain('question contains its own answer');
    expect(
      reviewQuestion(
        q(1),
        'Some unrelated source text about whales and oceans.',
        'Made up claim that is not there at all'
      )
    ).toContain('evidence is not a sentence from the source');
  });
});

describe('judge', () => {
  it('keeps questions the blind solver gets right, at most two per category', async () => {
    const questions = Array.from({ length: 12 }, (_, i) => q(i));
    const callJudge = vi.fn().mockResolvedValue({
      answers: questions.map((_, i) => ({
        choice: i === 3 ? 2 : 0,
        ambiguous: false,
        problem: false,
      })),
    });
    const v = await judgeTrivia({ payload: { questions } }, { callJudge });
    expect(v.ok).toBe(true);
    expect(v.payload.questions).toHaveLength(10);
    expect(v.payload.questions.some(x => x.question === questions[3].question)).toBe(false);
  });

  it('fails when too few survive', async () => {
    const questions = Array.from({ length: 12 }, (_, i) => q(i));
    const callJudge = vi.fn().mockResolvedValue({
      answers: questions.map(() => ({ choice: 1, ambiguous: false, problem: false })),
    });
    expect((await judgeTrivia({ payload: { questions } }, { callJudge })).ok).toBe(false);
  });
});

describe('reviewTrivia', () => {
  it('needs ten questions', () => {
    expect(reviewTrivia({ payload: { questions: [q(1)] } }).ok).toBe(false);
    expect(
      reviewTrivia({ payload: { questions: Array.from({ length: 10 }, (_, i) => q(i)) } }).ok
    ).toBe(true);
  });
});

describe('generator', () => {
  it('spreads topics across categories and skips resting ones', () => {
    const picks = pickTopics(createRng(1), new Set(), 12);
    expect(new Set(picks.slice(0, CATEGORY_NAMES.length).map(p => p.category)).size).toBe(
      CATEGORY_NAMES.length
    );
  });

  it('keeps only questions that pass review', async () => {
    const text =
      'The subject was first described in detail in a famous early study of the natural world.';
    const callAI = vi.fn(async prompt => {
      const topics = [...prompt.matchAll(/topic "([^"]+)"/g)].map(m => m[1]);
      return {
        questions: topics.map((topic, i) => ({
          topic,
          question: `Which early account first described ${i} in detail, as this source says?`,
          options: ['A famous early study', 'A later survey', 'A modern film', 'A radio show'],
          answer: 0,
          fact: 'It was described in a famous early study.',
          evidence: i % 2 ? text : 'Invented sentence that is not present anywhere.',
        })),
      };
    });
    const c = await generateTrivia(
      { rng: createRng(2), used: new Set(), callAI, feedback: null },
      { fetchArticle: async t => ({ title: t, url: `https://x/${t}`, text: `${text}\n${text}` }) }
    );
    expect(c.payload.questions).toHaveLength(6);
  });
});

describe('Open Trivia DB', () => {
  it('decodes HTML entities', () => {
    expect(decodeEntities('Who wrote &quot;Hamlet&quot; &amp; &#039;Macbeth&#039;?')).toBe(
      `Who wrote "Hamlet" & 'Macbeth'?`
    );
  });
});
