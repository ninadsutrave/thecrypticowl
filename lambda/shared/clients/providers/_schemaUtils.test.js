import { describe, it, expect } from 'vitest';
import { toJsonSchema } from './_schemaUtils.js';
import {
  CLUE_RESPONSE_SCHEMA,
  LEXICAL_RESPONSE_SCHEMA,
} from '../../../games/cryptic/constants/prompts.js';

describe('toJsonSchema', () => {
  it('lowercases Gemini type names recursively', () => {
    const out = toJsonSchema({
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
        count: { type: 'INTEGER' },
        ok: { type: 'BOOLEAN' },
      },
      required: ['name'],
    });
    expect(out.type).toBe('object');
    expect(out.properties.name.type).toBe('string');
    expect(out.properties.tags.type).toBe('array');
    expect(out.properties.tags.items.type).toBe('string');
    expect(out.properties.count.type).toBe('integer');
    expect(out.properties.ok.type).toBe('boolean');
  });

  it('does not mutate the input', () => {
    const input = { type: 'OBJECT', properties: { a: { type: 'STRING' } }, required: ['a'] };
    const snapshot = JSON.parse(JSON.stringify(input));
    toJsonSchema(input, { strict: true });
    expect(input).toEqual(snapshot);
  });

  it('is idempotent on already-standard schemas', () => {
    const once = toJsonSchema(CLUE_RESPONSE_SCHEMA);
    expect(toJsonSchema(once)).toEqual(once);
  });

  it('adds additionalProperties: false to every object', () => {
    const out = toJsonSchema(CLUE_RESPONSE_SCHEMA);
    expect(out.additionalProperties).toBe(false);
    expect(out.properties.clue_parts.items.additionalProperties).toBe(false);
  });

  it('leaves optionality alone in non-strict mode (Claude tool schemas)', () => {
    const out = toJsonSchema(CLUE_RESPONSE_SCHEMA);
    expect(out.properties.clue_parts.items.required).toEqual(['text']);
    expect(out.properties.clue_parts.items.properties.type.type).toBe('string');
  });

  describe('strict mode (OpenAI structured outputs)', () => {
    // This is the bug that made AI_PROVIDER=openai return a 400 on every
    // clue: strict mode demands that `required` list every key in
    // `properties`, and clue_parts.items declared three but required one.
    it('promotes every property to required', () => {
      const out = toJsonSchema(CLUE_RESPONSE_SCHEMA, { strict: true });
      const item = out.properties.clue_parts.items;
      expect(item.required.sort()).toEqual(['indicator_subtype', 'text', 'type']);
      expect(out.required.sort()).toEqual(Object.keys(out.properties).sort());
    });

    it('makes previously-optional properties nullable so the model can still omit them', () => {
      const item = toJsonSchema(CLUE_RESPONSE_SCHEMA, { strict: true }).properties.clue_parts.items;
      expect(item.properties.type.type).toEqual(['string', 'null']);
      expect(item.properties.indicator_subtype.type).toEqual(['string', 'null']);
      // `text` was genuinely required — it must stay non-nullable.
      expect(item.properties.text.type).toBe('string');
    });

    it('satisfies the strict-mode invariant for every nested object', () => {
      const assertStrict = (node, path = '$') => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'object' || (Array.isArray(node.type) && node.type.includes('object'))) {
          expect(node.additionalProperties, `${path}.additionalProperties`).toBe(false);
          expect(new Set(node.required ?? []), `${path}.required`).toEqual(
            new Set(Object.keys(node.properties ?? {}))
          );
        }
        Object.entries(node.properties ?? {}).forEach(([k, v]) => assertStrict(v, `${path}.${k}`));
        if (node.items) assertStrict(node.items, `${path}[]`);
      };

      assertStrict(toJsonSchema(CLUE_RESPONSE_SCHEMA, { strict: true }), 'clue');
      assertStrict(toJsonSchema(LEXICAL_RESPONSE_SCHEMA, { strict: true }), 'lexical');
    });

    it('preserves enum constraints', () => {
      const out = toJsonSchema(LEXICAL_RESPONSE_SCHEMA, { strict: true });
      expect(out.properties.difficulty.enum).toEqual(['easy', 'medium', 'hard']);
    });
  });

  it('handles null and non-object input without throwing', () => {
    expect(toJsonSchema(null)).toBeNull();
    expect(toJsonSchema(undefined)).toBeNull();
    expect(toJsonSchema('STRING')).toBe('STRING');
  });
});
