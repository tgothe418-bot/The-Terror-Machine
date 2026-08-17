import { describe, expect, it } from 'vitest';
import { unwrapStrictJsonResponse } from './aiClient';

describe('unwrapStrictJsonResponse', () => {
  it('leaves plain JSON unchanged', () => {
    expect(unwrapStrictJsonResponse('{"ok":true}')).toBe('{"ok":true}');
  });

  it('unwraps a complete fenced JSON response', () => {
    const fenced = ['```json', '{"ok":true}', '```'].join('\n');
    expect(unwrapStrictJsonResponse(fenced)).toBe('{"ok":true}');
  });

  it('does not scrape JSON from surrounding prose', () => {
    expect(unwrapStrictJsonResponse('Here is the result: {"ok":true}')).toBe(
      'Here is the result: {"ok":true}'
    );
  });
});
