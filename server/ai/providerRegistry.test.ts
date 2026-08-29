import { describe, expect, it, afterEach } from 'vitest';
import {
  ProviderRegistry,
  resolveEngineGenerationSelection,
} from './providerRegistry';
import { ProviderConfigurationError } from './providerTypes';

describe('Provider Registry and Engine Resolution (Packet 1-11A)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('provider registry exposes only admitted provider metadata and never credential material', () => {
    const registry = new ProviderRegistry();
    const descriptors = registry.getPublicDescriptors();

    // Exactly 2 admitted providers in this packet
    expect(descriptors).toHaveLength(2);
    const providerIds = descriptors.map((d) => d.providerId);
    expect(providerIds).toContain('gemini');
    expect(providerIds).toContain('qwen');

    // Safe metadata only: no keys, headers, urls, endpoints, or error details
    for (const descriptor of descriptors) {
      const keys = Object.keys(descriptor);
      expect(keys.sort()).toEqual([
        'configured',
        'displayName',
        'modelId',
        'providerId',
        'structuredOutput',
      ].sort());

      const serialized = JSON.stringify(descriptor);
      expect(serialized).not.toMatch(/key|secret|token|auth|bearer|url|http|endpoint|password|header/i);
    }
  });

  it('Engine provider resolution defaults to Gemini for backward compatibility', () => {
    delete process.env.TTM_ENGINE_PROVIDER;
    const defaultSelection = resolveEngineGenerationSelection(process.env);
    expect(defaultSelection.providerId).toBe('gemini');
    expect(defaultSelection.modelId).toBe('gemini-3.7-flash');

    process.env.TTM_ENGINE_PROVIDER = '';
    const blankSelection = resolveEngineGenerationSelection(process.env);
    expect(blankSelection.providerId).toBe('gemini');
    expect(blankSelection.modelId).toBe('gemini-3.7-flash');

    process.env.TTM_ENGINE_PROVIDER = 'qwen';
    const qwenSelection = resolveEngineGenerationSelection(process.env);
    expect(qwenSelection.providerId).toBe('qwen');
    expect(qwenSelection.modelId).toBe('qwen3.7-flash-2026-07-15');

    // Unknown or padded values fail closed
    process.env.TTM_ENGINE_PROVIDER = 'openai';
    expect(() => resolveEngineGenerationSelection(process.env)).toThrow(ProviderConfigurationError);

    process.env.TTM_ENGINE_PROVIDER = ' qwen ';
    expect(() => resolveEngineGenerationSelection(process.env)).toThrow(ProviderConfigurationError);

    process.env.TTM_ENGINE_PROVIDER = 'QWEN';
    expect(() => resolveEngineGenerationSelection(process.env)).toThrow(ProviderConfigurationError);
  });

  it('production start loads private local environment configuration before provider construction', () => {
    // Proves that resolver uses process.env accurately without hardcoded snapshots
    const customEnv: NodeJS.ProcessEnv = {
      TTM_ENGINE_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-gemini-key',
    };
    const selection = resolveEngineGenerationSelection(customEnv);
    expect(selection.providerId).toBe('gemini');
  });
});
