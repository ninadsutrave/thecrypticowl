/**
 * Shape checks for generated payloads. The database is ours, but the JSON is
 * still untrusted input to a render path: a malformed row must fall back to
 * practice, never throw inside a board.
 */

type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
export const isInt = (v: unknown): v is number => Number.isInteger(v);
export const isStrArray = (v: unknown, len?: number): v is string[] =>
  Array.isArray(v) && v.every(isStr) && (len === undefined || v.length === len);
export const isSource = (v: unknown): v is { label: string; url: string } =>
  isObj(v) && isStr(v.label) && isStr(v.url) && /^https:\/\//.test(v.url);
