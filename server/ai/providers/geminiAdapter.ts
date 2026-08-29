import {
  AdapterStructuredRequest,
  GenerationProviderId,
  NormalizedProviderResponse,
  StructuredGenerationAdapter,
  StructuredOutputCapability,
} from '../providerTypes';
import { GEMINI_MODEL_ID, getGeminiPolicy } from '../modelPolicy';
import { getAiClient, classifyProviderResponse } from '../../utils/aiClient';

export class GeminiAdapter implements StructuredGenerationAdapter {
  readonly providerId: GenerationProviderId = 'gemini';
  readonly displayName = 'Gemini';
  readonly defaultModelId = GEMINI_MODEL_ID;
  readonly structuredOutput: StructuredOutputCapability = 'STRICT_JSON_SCHEMA';

  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  async generateStructured(
    request: AdapterStructuredRequest
  ): Promise<NormalizedProviderResponse> {
    const contents = [{ role: 'user', parts: [{ text: request.prompt }] }];
    const policy = getGeminiPolicy('ENGINE_TURN');

    const response = await getAiClient().models.generateContent({
      model: policy.model,
      contents,
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
        responseMimeType: 'application/json',
        responseSchema: request.responseSchema,
      },
    });

    const classification = classifyProviderResponse(response);
    if (classification.kind === 'PROVIDER_REFUSAL') {
      return { kind: 'PROVIDER_REFUSAL', reason: classification.reason };
    }
    if (classification.kind === 'EMPTY_PROVIDER_RESPONSE') {
      return { kind: 'EMPTY_PROVIDER_RESPONSE' };
    }
    return { kind: 'CONTENT', text: classification.text };
  }
}
