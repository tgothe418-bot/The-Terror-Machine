import { z } from 'zod';
import {
  EmptyProviderResponseError,
  GenerationSelection,
  ProviderConfigurationError,
  ProviderRefusalError,
  StructuredResponseContract,
} from './providerTypes';
import { defaultProviderRegistry, ProviderRegistry, resolveEngineGenerationSelection } from './providerRegistry';

export function unwrapStrictJsonResponse(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseStructuredTurnResponse<T>(rawText: string, zodSchema: z.ZodType<T>): T {
  const unwrapped = unwrapStrictJsonResponse(rawText);
  if (!unwrapped || unwrapped.trim().length === 0) {
    throw new EmptyProviderResponseError();
  }
  const parsed = JSON.parse(unwrapped);
  return zodSchema.parse(parsed);
}

export interface GenerateStructuredResponseOptions {
  readonly selection?: GenerationSelection;
  readonly registry?: ProviderRegistry;
}

export async function generateStructuredResponse<T>(
  prompt: string,
  contract: StructuredResponseContract<T>,
  options: GenerateStructuredResponseOptions = {}
): Promise<T> {
  const selection = options.selection ?? resolveEngineGenerationSelection();
  const registry = options.registry ?? defaultProviderRegistry;

  const adapter = registry.getAdapter(selection.providerId);
  if (selection.modelId !== adapter.defaultModelId) {
    throw new ProviderConfigurationError(selection.providerId);
  }

  if (!adapter.isConfigured()) {
    throw new ProviderConfigurationError(selection.providerId);
  }

  const providerSchema = contract.providerSchemas[selection.providerId];
  if (!providerSchema) {
    throw new ProviderConfigurationError(selection.providerId);
  }

  const normalized = await adapter.generateStructured({
    prompt,
    modelId: selection.modelId,
    contractName: contract.name,
    responseSchema: providerSchema,
  });

  if (normalized.kind === 'PROVIDER_REFUSAL') {
    throw new ProviderRefusalError(normalized.reason);
  }

  if (normalized.kind === 'EMPTY_PROVIDER_RESPONSE') {
    throw new EmptyProviderResponseError();
  }

  return parseStructuredTurnResponse(normalized.text, contract.zodSchema);
}
