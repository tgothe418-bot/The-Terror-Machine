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

export const aiConfigRouter = Router();

function maskApiKey(key?: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

aiConfigRouter.get('/config', (req, res) => {
  const currentKey = process.env.GEMINI_API_KEY;
  res.json({
    tier: getActiveTier(),
    model: getActiveModelId(),
    approvedModels: APPROVED_GEMINI_MODELS,
    defaultFreeModel: DEFAULT_FREE_MODEL,
    defaultPaidModel: DEFAULT_PAID_MODEL,
    hasApiKey: Boolean(currentKey && currentKey.trim().length > 0),
    maskedApiKey: maskApiKey(currentKey),
  });
});

aiConfigRouter.post('/config', (req, res) => {
  const { tier, model, apiKey } = req.body || {};

  if (tier !== undefined) {
    if (tier !== 'free' && tier !== 'paid') {
      return res.status(400).json({ error: 'Tier must be "free" or "paid"' });
    }
    setActiveTier(tier as GeminiTier);
  }

  if (model !== undefined) {
    if (model === null || model === '') {
      setActiveModelId(null);
    } else {
      if (!APPROVED_GEMINI_MODELS.includes(model as GeminiModelId)) {
        return res.status(400).json({
          error: `Model must be one of: ${APPROVED_GEMINI_MODELS.join(', ')}`,
        });
      }
      setActiveModelId(model as GeminiModelId);
    }
  }

  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    resetAiClient(apiKey.trim());
  }

  const currentKey = process.env.GEMINI_API_KEY;
  return res.json({
    ok: true,
    tier: getActiveTier(),
    model: getActiveModelId(),
    approvedModels: APPROVED_GEMINI_MODELS,
    defaultFreeModel: DEFAULT_FREE_MODEL,
    defaultPaidModel: DEFAULT_PAID_MODEL,
    hasApiKey: Boolean(currentKey && currentKey.trim().length > 0),
    maskedApiKey: maskApiKey(currentKey),
  });
});

aiConfigRouter.post('/ping', async (req, res) => {
  const pingResult = await pingAiProvider();
  if (!pingResult.ok) {
    return res.status(pingResult.status || 502).json(pingResult);
  }
  return res.json(pingResult);
});
