import { Router } from 'express';
import {
  APPROVED_GEMINI_MODELS,
  DEFAULT_FREE_MODEL,
  DEFAULT_PAID_MODEL,
  getActiveModelId,
  getActiveTier,
  setActiveModelId,
  setActiveTier,
  type GeminiModelId,
  type GeminiTier,
} from '../ai/modelPolicy';
import { pingAiProvider, resetAiClient } from '../utils/aiClient';
import {
  APPROVED_OPENAI_VOICE_MODELS,
  DEFAULT_OPENAI_VOICE_MODEL,
  VOICE_PROVIDERS,
  getOpenAiVoiceModel,
  getVoiceProvider,
  setOpenAiVoiceModel,
  setVoiceProvider,
  type OpenAiVoiceModelId,
  type VoiceProvider,
} from '../ai/voiceProviderPolicy';
import { hasOpenAiApiKey, pingOpenAiVoice, resetOpenAiApiKey } from '../utils/openaiVoiceClient';

export const aiConfigRouter = Router();

function maskApiKey(key?: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function getConfigResponse() {
  const currentKey = process.env.GEMINI_API_KEY;
  const currentOpenAiKey = process.env.OPENAI_API_KEY;
  return {
    tier: getActiveTier(),
    model: getActiveModelId(),
    approvedModels: APPROVED_GEMINI_MODELS,
    defaultFreeModel: DEFAULT_FREE_MODEL,
    defaultPaidModel: DEFAULT_PAID_MODEL,
    hasApiKey: Boolean(currentKey && currentKey.trim().length > 0),
    maskedApiKey: maskApiKey(currentKey),
    engineProvider: 'gemini' as const,
    voiceProvider: getVoiceProvider(),
    voiceProviders: VOICE_PROVIDERS,
    openAiModel: getOpenAiVoiceModel(),
    approvedOpenAiModels: APPROVED_OPENAI_VOICE_MODELS,
    defaultOpenAiModel: DEFAULT_OPENAI_VOICE_MODEL,
    hasOpenAiApiKey: hasOpenAiApiKey(),
    maskedOpenAiApiKey: maskApiKey(currentOpenAiKey),
  };
}

aiConfigRouter.get('/config', (req, res) => {
  res.json(getConfigResponse());
});

aiConfigRouter.post('/config', (req, res) => {
  const { tier, model, apiKey, voiceProvider, openAiModel, openAiApiKey } = req.body || {};

  // Validate every field before changing process-level settings so one malformed
  // value cannot leave the calibration in a partially updated state.
  if (tier !== undefined && tier !== 'free' && tier !== 'paid') {
    return res.status(400).json({ error: 'Tier must be "free" or "paid"' });
  }

  if (
    model !== undefined &&
    model !== null &&
    model !== '' &&
    !APPROVED_GEMINI_MODELS.includes(model as GeminiModelId)
  ) {
    return res.status(400).json({
      error: `Model must be one of: ${APPROVED_GEMINI_MODELS.join(', ')}`,
    });
  }

  if (voiceProvider !== undefined && !VOICE_PROVIDERS.includes(voiceProvider as VoiceProvider)) {
    return res.status(400).json({ error: 'Voice provider must be "gemini" or "openai"' });
  }

  if (
    openAiModel !== undefined &&
    !APPROVED_OPENAI_VOICE_MODELS.includes(openAiModel as OpenAiVoiceModelId)
  ) {
    return res.status(400).json({
      error: `OpenAI Voice model must be one of: ${APPROVED_OPENAI_VOICE_MODELS.join(', ')}`,
    });
  }

  if (tier !== undefined) setActiveTier(tier as GeminiTier);
  if (model !== undefined) {
    setActiveModelId(model === null || model === '' ? null : (model as GeminiModelId));
  }
  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    resetAiClient(apiKey.trim());
  }
  if (voiceProvider !== undefined) setVoiceProvider(voiceProvider as VoiceProvider);
  if (openAiModel !== undefined) setOpenAiVoiceModel(openAiModel as OpenAiVoiceModelId);

  if (typeof openAiApiKey === 'string' && openAiApiKey.trim().length > 0) {
    resetOpenAiApiKey(openAiApiKey);
  }

  return res.json({
    ok: true,
    ...getConfigResponse(),
  });
});

aiConfigRouter.post('/ping', async (req, res) => {
  const requestedProvider = req.body?.provider ?? getVoiceProvider();
  if (!VOICE_PROVIDERS.includes(requestedProvider as VoiceProvider)) {
    return res.status(400).json({ error: 'Provider must be "gemini" or "openai"' });
  }

  let pingResult;
  if (requestedProvider === 'openai') {
    const requestedModel = req.body?.model ?? getOpenAiVoiceModel();
    if (!APPROVED_OPENAI_VOICE_MODELS.includes(requestedModel as OpenAiVoiceModelId)) {
      return res.status(400).json({
        error: `OpenAI Voice model must be one of: ${APPROVED_OPENAI_VOICE_MODELS.join(', ')}`,
      });
    }
    pingResult = await pingOpenAiVoice({
      model: requestedModel as OpenAiVoiceModelId,
      apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : undefined,
    });
  } else {
    pingResult = { provider: 'gemini' as const, ...(await pingAiProvider()) };
  }
  if (!pingResult.ok) {
    return res.status(pingResult.status || 502).json(pingResult);
  }
  return res.json(pingResult);
});
