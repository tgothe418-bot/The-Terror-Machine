import { ThinkingLevel } from '@google/genai';

/**
 * Global reasoning-effort dial (owner decision: single machine-wide selector).
 * 'default' defers to each provider's purpose-derived policy; explicit values
 * override every provider's knob at its own boundary.
 */
export const REASONING_EFFORTS = ['default', 'minimal', 'low', 'medium', 'high'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'default';

let runtimeEffort: ReasoningEffort = DEFAULT_REASONING_EFFORT;

function readConfiguredEffort(): ReasoningEffort {
  const configured = process.env.REASONING_EFFORT?.trim().toLowerCase();
  return configured && REASONING_EFFORTS.includes(configured as ReasoningEffort)
    ? (configured as ReasoningEffort)
    : DEFAULT_REASONING_EFFORT;
}

export function getReasoningEffort(): ReasoningEffort {
  return runtimeEffort !== DEFAULT_REASONING_EFFORT ? runtimeEffort : readConfiguredEffort();
}

export function setReasoningEffort(effort: ReasoningEffort): void {
  if (!REASONING_EFFORTS.includes(effort)) {
    throw new Error(`Reasoning effort ${effort} is not supported.`);
  }
  runtimeEffort = effort;
}

/**
 * Gemini translation: the graded ThinkingLevel is the dial's closest native
 * match. 'default' and 'minimal'-as-unset return null meaning "purpose map".
 */
export function geminiThinkingLevelForEffort(effort: ReasoningEffort): ThinkingLevel | null {
  switch (effort) {
    case 'minimal':
    case 'low':
      return ThinkingLevel.LOW;
    case 'medium':
      return ThinkingLevel.MEDIUM;
    case 'high':
      return ThinkingLevel.HIGH;
    default:
      return null;
  }
}
