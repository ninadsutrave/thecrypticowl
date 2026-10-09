/**
 * Schema utilities for cross-provider compatibility.
 *
 * Schemas are authored once in `constants/prompts.js` in Gemini's
 * OpenAPI-flavoured dialect (UPPERCASE type names). Every other provider wants
 * standard JSON Schema, and OpenAI's strict structured-outputs mode wants a
 * stricter variant still.
 *
 *   Gemini    responseSchema, "OBJECT"/"STRING", optional fields simply absent
 *             from `required`.
 *   Claude    tool input_schema, standard JSON Schema — ordinary optionality.
 *   OpenAI /  response_format json_schema with strict: true. Strict mode
 *   Mistral   demands that EVERY key in `properties` also appears in
 *             `required`, and that objects set additionalProperties: false.
 *             Genuine optionality is expressed as a nullable type union
 *             instead: `{"type": ["string", "null"]}`.
 *
 * That last rule is not cosmetic. `CLUE_RESPONSE_SCHEMA.clue_parts.items`
 * declares `text`, `type` and `indicator_subtype` but requires only `text`,
 * so passing it to strict mode unconverted returns a 400 and the provider can
 * never generate a clue.
 */

const TYPE_MAP = {
  OBJECT: 'object',
  STRING: 'string',
  ARRAY: 'array',
  INTEGER: 'integer',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
};

const normaliseType = t => {
  if (Array.isArray(t)) return t.map(normaliseType);
  if (typeof t !== 'string') return t;
  return TYPE_MAP[t] ?? t.toLowerCase();
};

/**
 * Convert a Gemini-flavoured schema into standard JSON Schema.
 *
 * Idempotent: an already-lowercase schema converts to an equivalent copy.
 * Never mutates the input.
 *
 * @param {object|null|undefined} schema
 * @param {{ strict?: boolean }} [options]
 *   strict — target OpenAI structured outputs: every property becomes
 *   required, and properties that were optional become nullable unions so
 *   the model can still decline to supply them.
 * @returns {object|null}
 */
export function toJsonSchema(schema, options = {}) {
  const { strict = false } = options;
  if (!schema || typeof schema !== 'object') return schema ?? null;

  const out = { ...schema };

  if (out.type !== undefined) {
    out.type = normaliseType(out.type);
  }

  if (out.properties && typeof out.properties === 'object') {
    const originallyRequired = new Set(Array.isArray(out.required) ? out.required : []);
    const props = {};

    for (const [key, value] of Object.entries(out.properties)) {
      const converted = toJsonSchema(value, options);

      if (strict && !originallyRequired.has(key)) {
        // Optional under Gemini → nullable-and-required under strict mode.
        // Only widen concrete scalar/array types; leave anything exotic alone.
        if (typeof converted.type === 'string' && converted.type !== 'null') {
          converted.type = [converted.type, 'null'];
        } else if (Array.isArray(converted.type) && !converted.type.includes('null')) {
          converted.type = [...converted.type, 'null'];
        }
      }

      props[key] = converted;
    }

    out.properties = props;

    if (strict) {
      out.required = Object.keys(props);
    } else if (Array.isArray(out.required)) {
      out.required = [...out.required];
    }
  }

  if (out.items) {
    out.items = toJsonSchema(out.items, options);
  }

  // Strict mode requires this on every object; harmless and tidy elsewhere.
  if (out.type === 'object' && out.additionalProperties === undefined) {
    out.additionalProperties = false;
  }

  return out;
}
