import {
  GenerationProviderId,
  GenerationSelection,
  PublicProviderDescriptor,
  StructuredGenerationAdapter,
  ProviderConfigurationError,
  GENERATION_PROVIDER_IDS,
} from './providerTypes';
import { GeminiAdapter } from './providers/geminiAdapter';
import { QwenAdapter, QWEN_ENGINE_MODEL_ID } from './providers/qwenAdapter';
import { GEMINI_MODEL_ID } from './modelPolicy';

export class ProviderRegistry {
  private readonly adapters = new Map<GenerationProviderId, StructuredGenerationAdapter>();

  constructor(customAdapters?: StructuredGenerationAdapter[]) {
    if (customAdapters && customAdapters.length > 0) {
      for (const adapter of customAdapters) {
        if (this.adapters.has(adapter.providerId)) {
          throw new Error(`Duplicate provider registered: ${adapter.providerId}`);
        }
        if (!GENERATION_PROVIDER_IDS.includes(adapter.providerId)) {
          throw new Error(`Unknown provider: ${adapter.providerId}`);
        }
        this.adapters.set(adapter.providerId, adapter);
      }
    } else {
      this.adapters.set('gemini', new GeminiAdapter());
      this.adapters.set('qwen', new QwenAdapter());
    }
  }

  getAdapter(providerId: GenerationProviderId): StructuredGenerationAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new ProviderConfigurationError(providerId);
    }
    return adapter;
  }

  getPublicDescriptors(): PublicProviderDescriptor[] {
    return Array.from(this.adapters.values()).map((adapter) => ({
      providerId: adapter.providerId,
      displayName: adapter.displayName,
      modelId: adapter.defaultModelId,
      structuredOutput: adapter.structuredOutput,
      configured: adapter.isConfigured(),
    }));
  }
}

export function resolveEngineGenerationSelection(
  env: NodeJS.ProcessEnv = process.env
): GenerationSelection {
  const raw = env.TTM_ENGINE_PROVIDER;
  const providerKey = raw === undefined || raw === null || raw.trim() === '' ? 'gemini' : raw;

  if (providerKey === 'gemini') {
    return {
      providerId: 'gemini',
      modelId: GEMINI_MODEL_ID,
    };
  }

  if (providerKey === 'qwen') {
    return {
      providerId: 'qwen',
      modelId: QWEN_ENGINE_MODEL_ID,
    };
  }

  // Any other value fails closed without guessing
  throw new ProviderConfigurationError(providerKey as GenerationProviderId);
}

export const defaultProviderRegistry = new ProviderRegistry();
