import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThinkingLevel } from '@google/genai';
import {
  DEFAULT_REASONING_EFFORT,
  REASONING_EFFORTS,
  geminiThinkingLevelForEffort,
  getReasoningEffort,
  setReasoningEffort,
} from './reasoningPolicy';

describe('Reasoning policy', () => {
  beforeEach(() => {
    setReasoningEffort(DEFAULT_REASONING_EFFORT);
    delete process.env.REASONING_EFFORT;
  });

  afterEach(() => {
    setReasoningEffort(DEFAULT_REASONING_EFFORT);
    delete process.env.REASONING_EFFORT;
  });

  it('defaults to "default" reasoning effort', () => {
    expect(REASONING_EFFORTS).toContain(DEFAULT_REASONING_EFFORT);
    expect(getReasoningEffort()).toBe('default');
  });

  it('reads configured reasoning effort from environment variable', () => {
    process.env.REASONING_EFFORT = 'high';
    expect(getReasoningEffort()).toBe('high');

    process.env.REASONING_EFFORT = 'invalid-effort';
    expect(getReasoningEffort()).toBe('default');
  });

  it('accepts valid runtime overrides and rejects invalid efforts', () => {
    setReasoningEffort('low');
    expect(getReasoningEffort()).toBe('low');

    setReasoningEffort('minimal');
    expect(getReasoningEffort()).toBe('minimal');

    setReasoningEffort('medium');
    expect(getReasoningEffort()).toBe('medium');

    expect(() => {
      // @ts-expect-error runtime boundary check
      setReasoningEffort('ultra');
    }).toThrow('not supported');
  });

  it('maps reasoning effort to Gemini ThinkingLevel', () => {
    expect(geminiThinkingLevelForEffort('default')).toBeNull();
    expect(geminiThinkingLevelForEffort('minimal')).toBe(ThinkingLevel.LOW);
    expect(geminiThinkingLevelForEffort('low')).toBe(ThinkingLevel.LOW);
    expect(geminiThinkingLevelForEffort('medium')).toBe(ThinkingLevel.MEDIUM);
    expect(geminiThinkingLevelForEffort('high')).toBe(ThinkingLevel.HIGH);
  });
});
