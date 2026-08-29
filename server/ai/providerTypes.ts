import type { z } from 'zod';

export const GENERATION_PROVIDER_IDS = ['gemini', 'qwen'] as const;
export type GenerationProviderId = (typeof GENERATION_PROVIDER_IDS)[number];

export const STRUCTURED_OUTPUT_CAPABILITIES = [
  'STRICT_JSON_SCHEMA',
  'JSON_OBJECT',
  'TEXT_ONLY',
] as const;
export type StructuredOutputCapability =
  (typeof STRUCTURED_OUTPUT_CAPABILITIES)[number];

export interface GenerationSelection {
  readonly providerId: GenerationProviderId;
  readonly modelId: string;
}

export interface PublicProviderDescriptor {
  readonly providerId: GenerationProviderId;
  readonly displayName: string;
  readonly modelId: string;
  readonly structuredOutput: StructuredOutputCapability;
  readonly configured: boolean;
}

export interface StructuredResponseContract<T> {
  readonly name: string;
  readonly zodSchema: z.ZodType<T>;
  readonly providerSchemas: Readonly<
    Record<GenerationProviderId, Readonly<Record<string, unknown>>>
  >;
}

export type NormalizedProviderResponse =
  | { readonly kind: 'CONTENT'; readonly text: string }
  | { readonly kind: 'PROVIDER_REFUSAL'; readonly reason?: string }
  | { readonly kind: 'EMPTY_PROVIDER_RESPONSE' };

export interface AdapterStructuredRequest {
  readonly prompt: string;
  readonly modelId: string;
  readonly contractName: string;
  readonly responseSchema: Readonly<Record<string, unknown>>;
}

export interface StructuredGenerationAdapter {
  readonly providerId: GenerationProviderId;
  readonly displayName: string;
  readonly defaultModelId: string;
  readonly structuredOutput: StructuredOutputCapability;
  isConfigured(): boolean;
  generateStructured(
    request: AdapterStructuredRequest
  ): Promise<NormalizedProviderResponse>;
}

export class ProviderConfigurationError extends Error {
  readonly code = 'PROVIDER_CONFIGURATION_ERROR';
  readonly providerId: GenerationProviderId;

  constructor(providerId: GenerationProviderId) {
    super(`AI provider ${providerId} is not configured`);
    this.name = 'ProviderConfigurationError';
    this.providerId = providerId;
  }
}

export class ProviderRequestError extends Error {
  readonly code = 'PROVIDER_REQUEST_ERROR';
  readonly providerId: GenerationProviderId;
  readonly status?: number;
  readonly providerCode?: string;

  constructor(input: {
    providerId: GenerationProviderId;
    status?: number;
    providerCode?: string;
  }) {
    super(`AI provider ${input.providerId} request failed`);
    this.name = 'ProviderRequestError';
    this.providerId = input.providerId;
    this.status = input.status;
    this.providerCode = input.providerCode?.slice(0, 80);
  }
}

export class ProviderRefusalError extends Error {
  readonly code = 'PROVIDER_REFUSAL';
  readonly reason?: string;

  constructor(reason?: string) {
    super('AI provider declined turn generation');
    this.name = 'ProviderRefusalError';
    this.reason = reason;
  }
}

export class EmptyProviderResponseError extends Error {
  readonly code = 'EMPTY_PROVIDER_RESPONSE';

  constructor() {
    super('AI provider returned an empty response');
    this.name = 'EmptyProviderResponseError';
  }
}
