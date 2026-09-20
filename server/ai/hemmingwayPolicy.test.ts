import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APPROVED_HEMMINGWAY_MODELS,
  DEFAULT_HEMMINGWAY_MODEL,
  HEMMINGWAY_BASE_URL,
  getHemmingwayModel,
  getHemmingwayThinking,
  setHemmingwayModel,
} from './hemmingwayPolicy';
import { setReasoningEffort, DEFAULT_REASONING_EFFORT } from './reasoningPolicy';

describe('Hemmingway policy', () => {
  beforeEach(() => {
    setHemmingwayModel(null);
    setReasoningEffort(DEFAULT_REASONING_EFFORT);
    delete process.env.HEMMINGWAY_MODEL;
    delete process.env.REASONING_EFFORT;
  });

  afterEach(() => {
    setHemmingwayModel(null);
    setReasoningEffort(DEFAULT_REASONING_EFFORT);
    delete process.env.HEMMINGWAY_MODEL;
    delete process.env.REASONING_EFFORT;
  });

  it('exposes the approved models list and default model', () => {
    expect(APPROVED_HEMMINGWAY_MODELS).toContain('hemmingway-27b');
    expect(getHemmingwayModel()).toBe(DEFAULT_HEMMINGWAY_MODEL);
    expect(HEMMINGWAY_BASE_URL).toBe('https://hemmingway.io/v1');
  });

  it('reads configured model from environment variable', () => {
    process.env.HEMMINGWAY_MODEL = 'hemmingway-27b';
    expect(getHemmingwayModel()).toBe('hemmingway-27b');

    process.env.HEMMINGWAY_MODEL = 'invalid-model';
    expect(getHemmingwayModel()).toBe(DEFAULT_HEMMINGWAY_MODEL);
  });

  it('accepts valid runtime overrides and rejects unapproved models', () => {
    setHemmingwayModel('hemmingway-27b');
    expect(getHemmingwayModel()).toBe('hemmingway-27b');

    expect(() => {
      // @ts-expect-error runtime boundary check
      setHemmingwayModel('unknown-model');
    }).toThrow('not an approved Hemmingway model');
  });

  it('derives thinking settings from purpose when reasoning effort is default', () => {
    setReasoningEffort('default');
    expect(getHemmingwayThinking('AUTOPILOT_ACTION')).toEqual({ enable_thinking: false });
    expect(getHemmingwayThinking('FORGE_ARCHITECTURE')).toEqual({ reasoning_effort: 'xhigh' });
    expect(getHemmingwayThinking('ENGINE_TURN')).toEqual({ reasoning_effort: 'medium' });
    expect(getHemmingwayThinking('VOICE')).toEqual({ reasoning_effort: 'medium' });
  });

  it('overrides thinking settings when global reasoning effort is set', () => {
    setReasoningEffort('minimal');
    expect(getHemmingwayThinking('ENGINE_TURN')).toEqual({ enable_thinking: false });

    setReasoningEffort('low');
    expect(getHemmingwayThinking('ENGINE_TURN')).toEqual({ reasoning_effort: 'low' });

    setReasoningEffort('medium');
    expect(getHemmingwayThinking('ENGINE_TURN')).toEqual({ reasoning_effort: 'medium' });

    setReasoningEffort('high');
    expect(getHemmingwayThinking('ENGINE_TURN')).toEqual({ reasoning_effort: 'xhigh' });
  });
});
