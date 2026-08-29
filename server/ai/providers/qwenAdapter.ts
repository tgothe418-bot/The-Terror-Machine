import {
  AdapterStructuredRequest,
  GenerationProviderId,
  NormalizedProviderResponse,
  ProviderConfigurationError,
  ProviderRequestError,
  StructuredGenerationAdapter,
  StructuredOutputCapability,
} from '../providerTypes';

export const QWEN_PROVIDER_ID = 'qwen' as const;
export const QWEN_ENGINE_MODEL_ID = 'qwen3.7-flash-2026-07-15' as const;

export interface QwenAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
}

const EXPLICIT_QWEN_REFUSAL_REASONS = new Set([
  'content_filter',
  'safety',
  'refusal',
  'sensitive',
]);

function cleanConfigString(val?: string): string {
  if (!val || typeof val !== 'string') return '';
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeQwenBaseUrl(rawUrl?: string): string | null {
  const cleaned = cleanConfigString(rawUrl);
  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    let full = parsed.toString();
    if (full.endsWith('/')) {
      full = full.slice(0, -1);
    }
    return full;
  } catch {
    return null;
  }
}

export class QwenAdapter implements StructuredGenerationAdapter {
  readonly providerId: GenerationProviderId = QWEN_PROVIDER_ID;
  readonly displayName = 'Qwen';
  readonly defaultModelId = QWEN_ENGINE_MODEL_ID;
  readonly structuredOutput: StructuredOutputCapability = 'STRICT_JSON_SCHEMA';

  private readonly explicitApiKey?: string;
  private readonly explicitBaseUrl?: string;
  private readonly explicitFetch?: typeof fetch;

  constructor(options: QwenAdapterOptions = {}, fetchImpl?: typeof fetch) {
    this.explicitApiKey = options.apiKey;
    this.explicitBaseUrl = options.baseUrl;
    this.explicitFetch = fetchImpl;
  }

  private getFetch(): typeof fetch {
    return this.explicitFetch ?? globalThis.fetch;
  }

  private getApiKey(): string {
    return cleanConfigString(this.explicitApiKey ?? process.env.DASHSCOPE_API_KEY);
  }

  private getNormalizedEndpointUrl(): string | null {
    const raw = this.explicitBaseUrl ?? process.env.QWEN_BASE_URL;
    const base = normalizeQwenBaseUrl(raw);
    if (!base) return null;
    return `${base}/chat/completions`;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    const endpoint = this.getNormalizedEndpointUrl();
    return Boolean(key && endpoint);
  }

  async generateStructured(
    request: AdapterStructuredRequest
  ): Promise<NormalizedProviderResponse> {
    if (!this.isConfigured()) {
      throw new ProviderConfigurationError(this.providerId);
    }

    const apiKey = this.getApiKey();
    const endpoint = this.getNormalizedEndpointUrl()!;

    let response: Response;
    try {
      const fetchFunction = this.getFetch();
      response = await fetchFunction(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.modelId,
          messages: [{ role: 'user', content: request.prompt }],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: request.contractName.toLowerCase(),
              strict: true,
              schema: request.responseSchema,
            },
          },
          enable_thinking: false,
          stream: false,
        }),
      });
    } catch {
      throw new ProviderRequestError({
        providerId: this.providerId,
        providerCode: 'NETWORK_ERROR',
      });
    }

    if (!response.ok) {
      let code: string | undefined;
      try {
        const errorJson = await response.json();
        if (errorJson && typeof errorJson === 'object') {
          const errObj = (errorJson as Record<string, unknown>).error;
          if (errObj && typeof errObj === 'object') {
            const rawCode = (errObj as Record<string, unknown>).code;
            if (typeof rawCode === 'string') {
              code = rawCode;
            }
          }
        }
      } catch {
        // Body was not JSON
      }

      throw new ProviderRequestError({
        providerId: this.providerId,
        status: response.status,
        providerCode: code,
      });
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new ProviderRequestError({
        providerId: this.providerId,
        status: response.status,
        providerCode: 'INVALID_JSON_RESPONSE',
      });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ProviderRequestError({
        providerId: this.providerId,
        status: response.status,
        providerCode: 'MALFORMED_RESPONSE_OBJECT',
      });
    }

    const resObj = parsed as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
        finish_reason?: string | null;
      }>;
    };

    const firstChoice = resObj.choices?.[0];
    if (!firstChoice) {
      return { kind: 'EMPTY_PROVIDER_RESPONSE' };
    }

    const finishReason = firstChoice.finish_reason;
    if (finishReason && typeof finishReason === 'string') {
      const lower = finishReason.toLowerCase();
      if (EXPLICIT_QWEN_REFUSAL_REASONS.has(lower)) {
        return { kind: 'PROVIDER_REFUSAL', reason: finishReason };
      }
    }

    const content = firstChoice.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return { kind: 'EMPTY_PROVIDER_RESPONSE' };
    }

    return {
      kind: 'CONTENT',
      text: content,
    };
  }
}
