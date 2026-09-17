import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APPROVED_ZAI_MODELS,
  DEFAULT_ZAI_BASE_URL,
  DEFAULT_ZAI_MODEL,
  ZAI_CODING_BASE_URL,
  getZaiBaseUrl,
  getZaiEndpointVariant,
  getZaiFallbackModelId,
  getZaiModel,
  getZaiThinking,
  setZaiEndpointVariant,
  setZaiModel,
} from './zaiPolicy';

describe('Z.ai model policy', () => {
  beforeEach(() => {
    setZaiModel(null);
    setZaiEndpointVariant(null);
    delete process.env.ZAI_MODEL;
    delete process.env.ZAI_ENDPOINT;
  });

  afterEach(() => {
    setZaiModel(null);
    setZaiEndpointVariant(null);
    delete process.env.ZAI_MODEL;
    delete process.env.ZAI_ENDPOINT;
  });

  it('resolves the default model from the approved list', () => {
    expect(APPROVED_ZAI_MODELS).toContain(DEFAULT_ZAI_MODEL);
    expect(getZaiModel()).toBe(DEFAULT_ZAI_MODEL);
  });

  it('accepts explicit overrides within the approved list and rejects unknown models', () => {
    setZaiModel('glm-5');
    expect(getZaiModel()).toBe('glm-5');

    expect(() => {
      // @ts-expect-error verify the runtime boundary rejects arbitrary model strings
      setZaiModel('not-a-glm-model');
    }).toThrow('not an approved Z.ai model');
  });

  it('falls back down the approved chain without leaving the approved list', () => {
    expect(getZaiFallbackModelId('glm-5')).toBe('glm-4.7');
    expect(getZaiFallbackModelId('glm-4.7')).toBe('glm-4.6');
    expect(getZaiFallbackModelId('glm-4.6')).toBe('glm-4.5-air');
    expect(getZaiFallbackModelId('glm-4.5-air')).toBe('glm-4.5-flash');
    expect(APPROVED_ZAI_MODELS).toContain(getZaiFallbackModelId('glm-4.5-flash'));
  });

  it('maps each purpose to the exact GLM thinking mode', () => {
    expect(getZaiThinking('ENGINE_TURN')).toBe('enabled');
    expect(getZaiThinking('ENGINE_INIT')).toBe('enabled');
    expect(getZaiThinking('FORGE_ARCHITECTURE')).toBe('enabled');
    expect(getZaiThinking('VOICE')).toBe('enabled');
    expect(getZaiThinking('AUTOPILOT_ACTION')).toBe('disabled');
  });

  it('selects the general or coding endpoint and exposes its base URL', () => {
    expect(getZaiEndpointVariant()).toBe('general');
    expect(getZaiBaseUrl()).toBe(DEFAULT_ZAI_BASE_URL);

    setZaiEndpointVariant('coding');
    expect(getZaiEndpointVariant()).toBe('coding');
    expect(getZaiBaseUrl()).toBe(ZAI_CODING_BASE_URL);

    expect(() => {
      // @ts-expect-error verify the runtime boundary rejects unknown variants
      setZaiEndpointVariant('turbo');
    }).toThrow('not supported');
  });
});
