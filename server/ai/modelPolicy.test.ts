import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ThinkingLevel } from '@google/genai';
import {
  APPROVED_GEMINI_MODELS,
  DEFAULT_FREE_MODEL,
  DEFAULT_PAID_MODEL,
  GEMINI_MODEL_ID,
  GEMINI_POLICIES,
  getActiveModelId,
  getActiveTier,
  getFallbackModelId,
  getGeminiPolicy,
  GeminiPurpose,
  setActiveModelId,
  setActiveTier,
} from './modelPolicy';

describe('Gemini Model Policy', () => {
  const ALL_PURPOSES: GeminiPurpose[] = [
    'ENGINE_INIT',
    'ENGINE_TURN',
    'ENGINE_PREVIEW',
    'FORGE_ARCHITECTURE',
    'FORGE_PREVIEW',
    'LORE_ANALYSIS',
    'VOICE',
    'AUTOPILOT_ACTION',
    'LEGACY_RECONCILIATION',
  ];

  beforeEach(() => {
    setActiveTier('free');
    setActiveModelId(null);
  });

  afterEach(() => {
    setActiveTier('free');
    setActiveModelId(null);
  });

  it('resolves every declared purpose to the active model', () => {
    expect(APPROVED_GEMINI_MODELS).toContain(DEFAULT_FREE_MODEL);
    expect(APPROVED_GEMINI_MODELS).toContain(DEFAULT_PAID_MODEL);
    expect(GEMINI_MODEL_ID).toBe(DEFAULT_FREE_MODEL);
    expect(getActiveModelId()).toBe(DEFAULT_FREE_MODEL);
    for (const purpose of ALL_PURPOSES) {
      const policy = getGeminiPolicy(purpose);
      expect(policy.model).toBe(DEFAULT_FREE_MODEL);
    }
  });

  it('switches models cleanly between Free and Paid tiers', () => {
    setActiveTier('free');
    expect(getActiveTier()).toBe('free');
    expect(getActiveModelId()).toBe(DEFAULT_FREE_MODEL);
    expect(getGeminiPolicy('ENGINE_TURN').model).toBe('gemini-3.6-flash');

    setActiveTier('paid');
    expect(getActiveTier()).toBe('paid');
    expect(getActiveModelId()).toBe(DEFAULT_PAID_MODEL);
    expect(getGeminiPolicy('ENGINE_TURN').model).toBe('gemini-3.7-flash');
  });

  it('supports explicit model overrides within approved models', () => {
    setActiveModelId('gemini-3.5-flash-lite');
    expect(getActiveModelId()).toBe('gemini-3.5-flash-lite');
    expect(getGeminiPolicy('ENGINE_TURN').model).toBe('gemini-3.5-flash-lite');

    // Rejects unapproved model names
    expect(() => {
      // @ts-expect-error test unapproved model rejection
      setActiveModelId('unapproved-gpt-4');
    }).toThrow();
  });

  it('provides a resilient fallback model hierarchy', () => {
    expect(getFallbackModelId('gemini-3.7-flash')).toBe('gemini-3.6-flash');
    expect(getFallbackModelId('gemini-3.6-flash')).toBe('gemini-3.5-flash-lite');
    expect(getFallbackModelId('gemini-3.5-flash-lite')).toBe('gemini-3.6-flash');
    expect(getFallbackModelId('gemini-2.5-flash')).toBe('gemini-3.6-flash');
    expect(getFallbackModelId('gemini-2.5-flash-lite')).toBe('gemini-3.5-flash-lite');
  });

  it('resolves each purpose to the exact required thinking level', () => {
    const expectedLevels: Record<GeminiPurpose, ThinkingLevel> = {
      ENGINE_INIT: ThinkingLevel.MEDIUM,
      ENGINE_TURN: ThinkingLevel.MEDIUM,
      ENGINE_PREVIEW: ThinkingLevel.MEDIUM,
      FORGE_ARCHITECTURE: ThinkingLevel.HIGH,
      FORGE_PREVIEW: ThinkingLevel.HIGH,
      LORE_ANALYSIS: ThinkingLevel.MEDIUM,
      VOICE: ThinkingLevel.MEDIUM,
      AUTOPILOT_ACTION: ThinkingLevel.LOW,
      LEGACY_RECONCILIATION: ThinkingLevel.MEDIUM,
    };

    for (const purpose of ALL_PURPOSES) {
      const policy = getGeminiPolicy(purpose);
      expect(policy.thinkingLevel).toBe(expectedLevels[purpose]);
    }
  });

  it('ensures policy objects cannot be mutated by consumers', () => {
    expect(Object.isFrozen(GEMINI_POLICIES)).toBe(true);
    for (const purpose of ALL_PURPOSES) {
      const policy = getGeminiPolicy(purpose);
      expect(Object.isFrozen(policy)).toBe(true);
      expect(() => {
        // @ts-expect-error test immutability at runtime
        policy.model = 'other-model';
      }).toThrow();
    }
  });

  it('guards all 5 live server files against deprecated model IDs, unsupported sampling parameters, and forbidden APIs', () => {
    const liveFiles = [
      'server/utils/aiClient.ts',
      'server/routes/chat.ts',
      'server/routes/forge.ts',
      'server/routes/turn.ts',
      'server/routes/voice.ts',
    ];

    const deprecatedModelPattern = /gemini-(1\.5-pro|1\.5-flash|2\.0-flash|3\.0-flash)/i;
    const forbiddenSamplingPattern = /\b(temperature|topP|topK|thinkingBudget|candidateCount)\s*:/;
    const forbiddenApisPattern = /(\.interactions|previous_interaction_id|previousInteractionId)/;
    const directQuotedModelPattern = /model\s*:\s*["'][^"']+["']/;

    for (const relPath of liveFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      expect(
        deprecatedModelPattern.test(content),
        `Found deprecated model string in ${relPath}`
      ).toBe(false);

      expect(
        forbiddenSamplingPattern.test(content),
        `Found forbidden sampling parameter in ${relPath}`
      ).toBe(false);

      expect(
        forbiddenApisPattern.test(content),
        `Found forbidden API pattern in ${relPath}`
      ).toBe(false);

      expect(
        directQuotedModelPattern.test(content),
        `Found hardcoded quoted model in ${relPath}`
      ).toBe(false);
    }
  });
});
