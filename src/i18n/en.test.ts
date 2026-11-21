import { describe, expect, it } from 'vitest';
import catalog from '../../languages/en.json';

const ALLOWED = new Set([
  'OK',
  'JSON',
  'GitHub',
  'YYYY',
  'MM',
  'DD',
  'MMM',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
]);

function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
}

function proseWords(sentence: string): string[] {
  return sentence
    .replace(/Advanced Note Mover/g, (match, offset: number) =>
      /\S/.test(sentence.slice(0, offset)) ? 'name' : 'Name'
    )
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\{\{[^\s]*/g, ' ')
    .replace(/\{[A-Za-z0-9]+\}/g, ' ')
    .replace(/\b(?:tag|fileName|path|property):/g, ' ')
    .split(/\s+/)
    .filter(
      token =>
        /[A-Za-z]/.test(token) && !token.includes('/') && !token.startsWith('#')
    );
}

function assertSentenceCase(value: string): void {
  expect(value.startsWith('+')).toBe(false);
  expect(/^[^:\n]+:$/.test(value)).toBe(false);

  const sentences = value
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\{\{[^\s]*/g, ' ')
    .replace(/\be\.g\./gi, 'eg')
    .replace(/\bi\.e\./gi, 'ie')
    .split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    const words = proseWords(sentence);
    words.forEach((word, index) => {
      const letters = word.replace(/[^A-Za-z-]/g, '');
      if (!letters || ALLOWED.has(word) || ALLOWED.has(letters)) {
        return;
      }
      if (index === 0) {
        const before = sentence.slice(0, sentence.indexOf(word));
        if (!/\{/.test(before)) {
          expect(letters[0]).toBe(letters[0].toUpperCase());
          expect(letters.slice(1)).toBe(letters.slice(1).toLowerCase());
        }
        return;
      }
      expect(letters).toBe(letters.toLowerCase());
    });
  }
}

describe('languages/en.json', () => {
  it('uses sentence case for every string', () => {
    for (const value of stringsIn(catalog)) {
      assertSentenceCase(value);
    }
  });
});
