import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ThinkingLevel } from '@google/genai';
import {
  GEMINI_MODEL_ID,
  GEMINI_POLICIES,
  getGeminiPolicy,
  GeminiPurpose,
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

  it('resolves every declared purpose to gemini-3.7-flash', () => {
    expect(GEMINI_MODEL_ID).toBe('gemini-3.7-flash');
    for (const purpose of ALL_PURPOSES) {
      const policy = getGeminiPolicy(purpose);
      expect(policy.model).toBe('gemini-3.7-flash');
    }
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

  it('guards all 5 live server files against legacy model IDs, unsupported sampling parameters, and forbidden APIs', () => {
    const liveFiles = [
      'server/utils/aiClient.ts',
      'server/routes/chat.ts',
      'server/routes/forge.ts',
      'server/routes/turn.ts',
      'server/routes/voice.ts',
    ];

    const legacyModelPattern = /gemini-(3\.1-pro-preview|3\.5-flash|1\.5-pro|1\.5-flash|2\.0-flash|2\.5-flash|3\.0-flash)/i;
    const forbiddenSamplingPattern = /\b(temperature|topP|topK|thinkingBudget|candidateCount)\s*:/;
    const forbiddenApisPattern = /(\.interactions|previous_interaction_id|previousInteractionId)/;
    const directQuotedModelPattern = /model\s*:\s*["'][^"']+["']/;

    for (const relPath of liveFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      expect(
        legacyModelPattern.test(content),
        `Found legacy model string in ${relPath}`
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
