export interface ModelCapability {
  supportsReasoningEffort: boolean;
  validReasoningLevels?: ('low' | 'medium' | 'high' | 'on' | 'off')[];
  maxContextTokens: number;
}

export const DEFAULT_MODEL_CAPABILITY: ModelCapability = {
  supportsReasoningEffort: false,
  maxContextTokens: 32768,
};

// Patterns matching model IDs to capabilities
export const MODEL_CAPABILITY_PATTERNS: Array<{
  pattern: RegExp;
  capability: ModelCapability;
}> = [
  // Gemma models (gemma-2, gemma-3, gemma-4, etc.)
  {
    pattern: /gemma/i,
    capability: {
      supportsReasoningEffort: true,
      validReasoningLevels: ['on', 'off'],
      maxContextTokens: 32768,
    },
  },
  // Qwen models (qwen2.5, qwen-2.5-coder, etc.)
  {
    pattern: /qwen/i,
    capability: {
      supportsReasoningEffort: false,
      maxContextTokens: 32768,
    },
  },
  // Llama models (llama-3, llama-3.1, llama-3.2, llama-3.3)
  {
    pattern: /llama/i,
    capability: {
      supportsReasoningEffort: false,
      maxContextTokens: 131072,
    },
  },
  // Mistral / Mixtral
  {
    pattern: /mi[xs]tral/i,
    capability: {
      supportsReasoningEffort: false,
      maxContextTokens: 32768,
    },
  },
  // DeepSeek R1 / V3
  {
    pattern: /deepseek/i,
    capability: {
      supportsReasoningEffort: false,
      maxContextTokens: 65536,
    },
  },
  // OpenAI reasoning models
  {
    pattern: /^o[134]/i,
    capability: {
      supportsReasoningEffort: true,
      validReasoningLevels: ['low', 'medium', 'high'],
      maxContextTokens: 128000,
    },
  },
];

export function getModelCapability(modelId: string): ModelCapability {
  const trimmed = (modelId || '').trim();
  for (const entry of MODEL_CAPABILITY_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      return { ...entry.capability };
    }
  }
  return { ...DEFAULT_MODEL_CAPABILITY };
}

/**
 * Estimates prompt token count roughly as ~3.5 chars per token for typical English / JSON prompts.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}

/**
 * Computes the safe effective maxTokens cap per call:
 * effectiveMaxTokens = min(requestedCap, maxContextTokens - estimatedPromptTokens - reserveTokens)
 * Defaults to reserveTokens = 1024. Ensures at least a minimum completion window (e.g. 512).
 */
export function computeEffectiveMaxTokens(
  modelId: string,
  promptText: string,
  requestedCap: number,
  reserveTokens = 1024
): number {
  const capability = getModelCapability(modelId);
  const promptTokens = estimateTokens(promptText);
  const availableForCompletion = capability.maxContextTokens - promptTokens - reserveTokens;
  const bound = Math.max(512, availableForCompletion);
  return Math.min(requestedCap, bound);
}
