import { describe, it, expect } from 'vitest';
import { parseOrRepairJson } from './jsonRepair';

describe('parseOrRepairJson', () => {
  it('parses valid JSON directly', () => {
    const input = '{"title":"Test","count":42}';
    expect(parseOrRepairJson(input)).toEqual({ title: 'Test', count: 42 });
  });

  it('repairs JSON cut off inside a string value', () => {
    const input = '{"summary":"A haunted lighthouse on a stormy coast';
    expect(parseOrRepairJson(input)).toEqual({ summary: 'A haunted lighthouse on a stormy coast' });
  });

  it('repairs JSON cut off inside an array element', () => {
    const input = '{"items":[{"id":"1","name":"Key"},{"id":"2","name":"Lantern';
    const result = parseOrRepairJson<{ items: Array<{ id: string; name: string }> }>(input);
    expect(result.items[0]).toEqual({ id: '1', name: 'Key' });
    expect(result.items[1].name).toBe('Lantern');
  });

  it('repairs JSON cut off after a comma in an array', () => {
    const input = '{"items":[{"id":"1","name":"Key"},';
    const result = parseOrRepairJson<{ items: Array<{ id: string; name: string }> }>(input);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ id: '1', name: 'Key' });
  });

  it('throws on completely invalid non-JSON strings', () => {
    expect(() => parseOrRepairJson('not json at all')).toThrow();
  });
});
