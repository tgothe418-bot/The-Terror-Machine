import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { Router } from 'express';

const execAsync = util.promisify(exec);
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
  ENGINE_PROVIDERS,
  type EngineProvider,
  getEngineProvider,
  setEngineProvider,
} from '../ai/modelPolicy';
import { pingAiProvider, resetAiClient } from '../utils/aiClient';
import {
  APPROVED_OPENAI_VOICE_MODELS,
  DEFAULT_OPENAI_VOICE_MODEL,
  DEFAULT_LOCAL_VOICE_BASE_URL,
  VOICE_PROVIDERS,
  getLocalAutopilotModel,
  getLocalEngineModel,
  getLocalForgeModel,
  getLocalVoiceBaseUrl,
  getLocalVoiceModel,
  getOpenAiVoiceModel,
  getVoiceProvider,
  setLocalAutopilotModel,
  setLocalEngineModel,
  setLocalForgeModel,
  setLocalVoiceBaseUrl,
  setLocalVoiceModel,
  setOpenAiVoiceModel,
  setVoiceProvider,
  type OpenAiVoiceModelId,
  type VoiceProvider,
} from '../ai/voiceProviderPolicy';
import { hasOpenAiApiKey, pingOpenAiVoice, resetOpenAiApiKey } from '../utils/openaiVoiceClient';
import { discoverLocalVoiceModels, pingLocalVoice, normalizeLocalBaseUrl } from '../utils/localVoiceClient';
import {
  APPROVED_ZAI_MODELS,
  DEFAULT_ZAI_MODEL,
  getZaiEndpointVariant,
  getZaiModel,
  setZaiEndpointVariant,
  setZaiModel,
  type ZaiEndpointVariant,
  type ZaiModelId,
} from '../ai/zaiPolicy';
import { hasZaiApiKey, pingZai, resetZaiApiKey } from '../utils/zaiClient';
import {
  APPROVED_HEMMINGWAY_MODELS,
  DEFAULT_HEMMINGWAY_MODEL,
  getHemmingwayModel,
  setHemmingwayModel,
  type HemmingwayModelId,
} from '../ai/hemmingwayPolicy';
import { hasHemmingwayApiKey, pingHemmingway, resetHemmingwayApiKey } from '../utils/hemmingwayClient';
import {
  DEFAULT_REASONING_EFFORT,
  REASONING_EFFORTS,
  type ReasoningEffort,
  getReasoningEffort,
  setReasoningEffort,
} from '../ai/reasoningPolicy';


export const aiConfigRouter = Router();

function persistEnvUpdates(updates: Record<string, string | undefined>) {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    const lines = content.split(/\r?\n/);
    const updatedKeys = new Set<string>();

    const newLines = lines.map((line) => {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=/);
      if (match) {
        const key = match[1];
        if (key in updates) {
          updatedKeys.add(key);
          const val = updates[key];
          return val !== undefined && val !== null ? `${key}=${val}` : line;
        }
      }
      return line;
    });

    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key) && val !== undefined && val !== null) {
        newLines.push(`${key}=${val}`);
      }
    }

    const newContent = newLines.filter(Boolean).join('\n') + '\n';
    if (!fs.existsSync(envPath) || fs.readFileSync(envPath, 'utf8').trim() !== newContent.trim()) {
      fs.writeFileSync(envPath, newContent, 'utf8');
    }
  } catch (err) {
    console.warn('[AI Config] Failed to persist updates to .env:', err);
  }
}

function maskApiKey(key?: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function getConfigResponse() {
  const currentKey = process.env.GEMINI_API_KEY;
  const currentOpenAiKey = process.env.OPENAI_API_KEY;
  const currentZaiKey = process.env.ZAI_API_KEY;
  const currentHemmingwayKey = process.env.HEMMINGWAY_API_KEY;
  return {
    tier: getActiveTier(),
    model: getActiveModelId(),
    approvedModels: APPROVED_GEMINI_MODELS,
    defaultFreeModel: DEFAULT_FREE_MODEL,
    defaultPaidModel: DEFAULT_PAID_MODEL,
    hasApiKey: Boolean(currentKey && currentKey.trim().length > 0),
    maskedApiKey: maskApiKey(currentKey),
    engineProvider: getEngineProvider(),
    engineProviders: ENGINE_PROVIDERS,
    voiceProvider: getVoiceProvider(),
    voiceProviders: VOICE_PROVIDERS,
    openAiModel: getOpenAiVoiceModel(),
    approvedOpenAiModels: APPROVED_OPENAI_VOICE_MODELS,
    defaultOpenAiModel: DEFAULT_OPENAI_VOICE_MODEL,
    hasOpenAiApiKey: hasOpenAiApiKey(),
    maskedOpenAiApiKey: maskApiKey(currentOpenAiKey),
    zaiModel: getZaiModel(),
    approvedZaiModels: APPROVED_ZAI_MODELS,
    defaultZaiModel: DEFAULT_ZAI_MODEL,
    zaiEndpoint: getZaiEndpointVariant(),
    hasZaiApiKey: hasZaiApiKey(),
    maskedZaiApiKey: maskApiKey(currentZaiKey),
    hemmingwayModel: getHemmingwayModel(),
    approvedHemmingwayModels: APPROVED_HEMMINGWAY_MODELS,
    defaultHemmingwayModel: DEFAULT_HEMMINGWAY_MODEL,
    hasHemmingwayApiKey: hasHemmingwayApiKey(),
    maskedHemmingwayApiKey: maskApiKey(currentHemmingwayKey),
    reasoningEffort: getReasoningEffort(),
    reasoningEfforts: REASONING_EFFORTS,
    defaultReasoningEffort: DEFAULT_REASONING_EFFORT,
    localBaseUrl: getLocalVoiceBaseUrl(),
    localModel: getLocalVoiceModel(),
    localEngineModel: getLocalEngineModel(),
    localAutopilotModel: getLocalAutopilotModel(),
    localVoiceModel: getLocalVoiceModel(),
    localForgeModel: getLocalForgeModel(),
    defaultLocalBaseUrl: DEFAULT_LOCAL_VOICE_BASE_URL,
  };
}

aiConfigRouter.get('/config', (req, res) => {
  res.json(getConfigResponse());
});

aiConfigRouter.post('/config', (req, res) => {
  const {
    tier,
    model,
    apiKey,
    engineProvider,
    voiceProvider,
    openAiModel,
    openAiApiKey,
    zaiModel,
    zaiApiKey,
    zaiEndpoint,
    hemmingwayModel,
    hemmingwayApiKey,
    reasoningEffort,
    localBaseUrl,
    localModel,
    localEngineModel,
    localAutopilotModel,
    localVoiceModel,
    localForgeModel,
  } = req.body || {};

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

  if (
    engineProvider !== undefined &&
    !ENGINE_PROVIDERS.includes(engineProvider as EngineProvider)
  ) {
    return res
      .status(400)
      .json({ error: 'Engine provider must be "gemini", "zai", "hemmingway", or "local"' });
  }

  if (voiceProvider !== undefined && !VOICE_PROVIDERS.includes(voiceProvider as VoiceProvider)) {
    return res
      .status(400)
      .json({ error: 'Voice provider must be "gemini", "openai", "zai", "hemmingway", or "local"' });
  }

  if (
    zaiModel !== undefined &&
    zaiModel !== null &&
    zaiModel !== '' &&
    !APPROVED_ZAI_MODELS.includes(zaiModel as ZaiModelId)
  ) {
    return res.status(400).json({
      error: `Z.ai model must be one of: ${APPROVED_ZAI_MODELS.join(', ')}`,
    });
  }

  if (
    zaiEndpoint !== undefined &&
    zaiEndpoint !== null &&
    zaiEndpoint !== 'general' &&
    zaiEndpoint !== 'coding'
  ) {
    return res.status(400).json({ error: 'Z.ai endpoint must be "general" or "coding"' });
  }

  if (
    hemmingwayModel !== undefined &&
    hemmingwayModel !== null &&
    hemmingwayModel !== '' &&
    !APPROVED_HEMMINGWAY_MODELS.includes(hemmingwayModel as HemmingwayModelId)
  ) {
    return res.status(400).json({
      error: `Hemmingway model must be one of: ${APPROVED_HEMMINGWAY_MODELS.join(', ')}`,
    });
  }

  if (
    reasoningEffort !== undefined &&
    reasoningEffort !== null &&
    reasoningEffort !== '' &&
    !REASONING_EFFORTS.includes(reasoningEffort as ReasoningEffort)
  ) {
    return res.status(400).json({
      error: `Reasoning effort must be one of: ${REASONING_EFFORTS.join(', ')}`,
    });
  }

  if (
    openAiModel !== undefined &&
    !APPROVED_OPENAI_VOICE_MODELS.includes(openAiModel as OpenAiVoiceModelId)
  ) {
    return res.status(400).json({
      error: `OpenAI Voice model must be one of: ${APPROVED_OPENAI_VOICE_MODELS.join(', ')}`,
    });
  }

  if (localBaseUrl !== undefined && typeof localBaseUrl !== 'string') {
    return res.status(400).json({ error: 'Local provider URL must be a string.' });
  }
  if (localModel !== undefined && typeof localModel !== 'string') {
    return res.status(400).json({ error: 'Local provider model must be a string.' });
  }
  if (localEngineModel !== undefined && typeof localEngineModel !== 'string') {
    return res.status(400).json({ error: 'Local engine model must be a string.' });
  }
  if (localAutopilotModel !== undefined && typeof localAutopilotModel !== 'string') {
    return res.status(400).json({ error: 'Local autopilot model must be a string.' });
  }
  if (localVoiceModel !== undefined && typeof localVoiceModel !== 'string') {
    return res.status(400).json({ error: 'Local voice model must be a string.' });
  }
  if (localForgeModel !== undefined && typeof localForgeModel !== 'string') {
    return res.status(400).json({ error: 'Local forge model must be a string.' });
  }

  if (tier !== undefined) setActiveTier(tier as GeminiTier);
  if (model !== undefined) {
    setActiveModelId(model === null || model === '' ? null : (model as GeminiModelId));
  }
  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    resetAiClient(apiKey.trim());
  }
  if (engineProvider !== undefined) setEngineProvider(engineProvider as EngineProvider);
  if (voiceProvider !== undefined) setVoiceProvider(voiceProvider as VoiceProvider);
  if (openAiModel !== undefined) setOpenAiVoiceModel(openAiModel as OpenAiVoiceModelId);
  if (localBaseUrl !== undefined) setLocalVoiceBaseUrl(localBaseUrl);
  if (localModel !== undefined) setLocalVoiceModel(localModel);
  if (localVoiceModel !== undefined) setLocalVoiceModel(localVoiceModel);
  if (localEngineModel !== undefined) setLocalEngineModel(localEngineModel);
  if (localAutopilotModel !== undefined) setLocalAutopilotModel(localAutopilotModel);
  if (localForgeModel !== undefined) setLocalForgeModel(localForgeModel);

  if (typeof openAiApiKey === 'string' && openAiApiKey.trim().length > 0) {
    resetOpenAiApiKey(openAiApiKey);
  }

  if (zaiModel !== undefined) {
    setZaiModel(zaiModel === null || zaiModel === '' ? null : (zaiModel as ZaiModelId));
  }
  if (zaiEndpoint !== undefined) {
    setZaiEndpointVariant(
      zaiEndpoint === null || zaiEndpoint === '' ? null : (zaiEndpoint as ZaiEndpointVariant)
    );
  }
  if (typeof zaiApiKey === 'string' && zaiApiKey.trim().length > 0) {
    resetZaiApiKey(zaiApiKey);
  }

  if (hemmingwayModel !== undefined) {
    setHemmingwayModel(
      hemmingwayModel === null || hemmingwayModel === ''
        ? null
        : (hemmingwayModel as HemmingwayModelId)
    );
  }
  if (typeof hemmingwayApiKey === 'string' && hemmingwayApiKey.trim().length > 0) {
    resetHemmingwayApiKey(hemmingwayApiKey);
  }

  if (reasoningEffort !== undefined && reasoningEffort !== null && reasoningEffort !== '') {
    setReasoningEffort(reasoningEffort as ReasoningEffort);
  }

  const envUpdates: Record<string, string | undefined> = {};
  if (engineProvider !== undefined) envUpdates.ENGINE_AI_PROVIDER = engineProvider;
  if (voiceProvider !== undefined) envUpdates.VOICE_AI_PROVIDER = voiceProvider;
  if (zaiModel !== undefined) envUpdates.ZAI_MODEL = zaiModel;
  if (zaiEndpoint !== undefined) envUpdates.ZAI_ENDPOINT = zaiEndpoint;
  if (typeof zaiApiKey === 'string' && zaiApiKey.trim().length > 0) {
    envUpdates.ZAI_API_KEY = zaiApiKey.trim();
  }
  if (hemmingwayModel !== undefined) envUpdates.HEMMINGWAY_MODEL = hemmingwayModel;
  if (typeof hemmingwayApiKey === 'string' && hemmingwayApiKey.trim().length > 0) {
    envUpdates.HEMMINGWAY_API_KEY = hemmingwayApiKey.trim();
  }
  if (reasoningEffort !== undefined) envUpdates.REASONING_EFFORT = reasoningEffort;
  if (localModel !== undefined) envUpdates.LOCAL_AI_MODEL = localModel;
  if (localVoiceModel !== undefined) envUpdates.LOCAL_VOICE_MODEL = localVoiceModel;
  if (localEngineModel !== undefined) envUpdates.LOCAL_ENGINE_MODEL = localEngineModel;
  if (localAutopilotModel !== undefined) envUpdates.LOCAL_AUTOPILOT_MODEL = localAutopilotModel;
  if (localForgeModel !== undefined) envUpdates.LOCAL_FORGE_MODEL = localForgeModel;
  if (localBaseUrl !== undefined) envUpdates.LOCAL_AI_BASE_URL = localBaseUrl;
  if (openAiModel !== undefined) envUpdates.OPENAI_VOICE_MODEL = openAiModel;
  if (tier !== undefined) envUpdates.GEMINI_TIER = tier;
  if (model !== undefined) envUpdates.GEMINI_MODEL = model;
  if (typeof apiKey === 'string' && apiKey.trim().length > 0) envUpdates.GEMINI_API_KEY = apiKey.trim();
  if (typeof openAiApiKey === 'string' && openAiApiKey.trim().length > 0) envUpdates.OPENAI_API_KEY = openAiApiKey.trim();

  // Defer .env persistence so the Vite restart triggered by the file change
  // does not kill the in-flight warmup request the client sends immediately
  // after receiving this response.  In-memory config is already live above.
  setTimeout(() => persistEnvUpdates(envUpdates), 3000);

  return res.json({
    ok: true,
    ...getConfigResponse(),
  });
});

aiConfigRouter.get('/local-models', async (req, res) => {
  const baseUrl =
    typeof req.query.baseUrl === 'string' ? req.query.baseUrl : getLocalVoiceBaseUrl();
  try {
    const models = await discoverLocalVoiceModels(baseUrl);
    return res.json({ models });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'The Local provider could not be inspected.';
    const status =
      typeof error === 'object' && error && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 502;
    return res.status(status).json({ error: message });
  }
});

aiConfigRouter.post('/ping', async (req, res) => {
  const requestedProvider = req.body?.provider ?? getVoiceProvider();
  if (!VOICE_PROVIDERS.includes(requestedProvider as VoiceProvider)) {
    return res
      .status(400)
      .json({ error: 'Provider must be "gemini", "openai", "zai", "hemmingway", or "local"' });
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
  } else if (requestedProvider === 'zai') {
    const requestedModel = req.body?.model ?? getZaiModel();
    if (!APPROVED_ZAI_MODELS.includes(requestedModel as ZaiModelId)) {
      return res.status(400).json({
        error: `Z.ai model must be one of: ${APPROVED_ZAI_MODELS.join(', ')}`,
      });
    }
    pingResult = await pingZai({
      model: requestedModel as ZaiModelId,
      apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : undefined,
    });
  } else if (requestedProvider === 'hemmingway') {
    const requestedModel = req.body?.model ?? getHemmingwayModel();
    if (!APPROVED_HEMMINGWAY_MODELS.includes(requestedModel as HemmingwayModelId)) {
      return res.status(400).json({
        error: `Hemmingway model must be one of: ${APPROVED_HEMMINGWAY_MODELS.join(', ')}`,
      });
    }
    pingResult = await pingHemmingway({
      model: requestedModel as HemmingwayModelId,
      apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : undefined,
    });
  } else if (requestedProvider === 'local') {
    pingResult = await pingLocalVoice({
      baseUrl: typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : undefined,
      model: typeof req.body?.model === 'string' ? req.body.model : undefined,
    });
  } else {
    pingResult = { provider: 'gemini' as const, ...(await pingAiProvider()) };
  }
  if (!pingResult.ok) {
    return res.status(pingResult.status || 502).json(pingResult);
  }
  return res.json(pingResult);
});

function getLmsCliPath(): string {
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const candidatePaths = [
    path.join(userProfile, '.lmstudio', 'bin', 'lms.exe'),
    path.join(userProfile, '.cache', 'lm-studio', 'bin', 'lms.exe'),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return 'lms';
}

aiConfigRouter.post('/warmup', async (req, res) => {
  const models: unknown = req.body?.models;
  const baseUrl: string = typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : getLocalVoiceBaseUrl();

  if (!Array.isArray(models) || models.length === 0) {
    return res.json({ ok: true, results: [] });
  }

  const modelList = Array.from(
    new Set(models.filter((m): m is string => typeof m === 'string' && m.trim().length > 0))
  );
  let normalizedBase = 'http://127.0.0.1:1234/v1';
  try {
    normalizedBase = normalizeLocalBaseUrl(baseUrl);
  } catch {
    // fallback if unparseable
  }

  console.log(`[WARMUP] Starting instance preloading for ${modelList.length} model(s):`, modelList);

  // 1. Resolve lms CLI binary and inspect currently loaded models
  const lmsCli = getLmsCliPath();
  let lmsLoadedModels: Set<string> | null = null;
  if (process.env.DISABLE_LMS_CLI !== 'true' && req.body?.method !== 'http') {
    try {
      console.log(`[WARMUP] Inspecting LM Studio loaded models via CLI: "${lmsCli}" ps`);
      const { stdout, stderr } = await execAsync(`"${lmsCli}" ps`, { timeout: 10000 });
      const rawOutput = (stdout || '') + '\n' + (stderr || '');
      const lines = rawOutput.split('\n');
      lmsLoadedModels = new Set<string>();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] !== 'IDENTIFIER') {
          lmsLoadedModels.add(parts[0].toLowerCase());
          lmsLoadedModels.add(parts[1].toLowerCase());
        }
      }
      console.log(`[WARMUP] Currently loaded models in LM Studio:`, Array.from(lmsLoadedModels));
    } catch (err: any) {
      console.warn(`[WARMUP] Could not query "lms ps" (using fallback):`, err?.message || err);
      lmsLoadedModels = null;
    }
  }

  const results: Array<{
    model: string;
    ok: boolean;
    status?: number;
    error?: string;
    latencyMs: number;
    method: 'already-loaded' | 'lms-cli' | 'http';
  }> = [];

  // 2. Sequential loading to prevent LM Studio load-lock and 500 errors
  for (const model of modelList) {
    const start = Date.now();
    const modelLower = model.toLowerCase();

    // Check if already loaded in LM Studio
    if (
      lmsLoadedModels &&
      (lmsLoadedModels.has(modelLower) || lmsLoadedModels.has(modelLower.split('/').pop() || ''))
    ) {
      console.log(`[WARMUP] Model already loaded in LM Studio: "${model}"`);
      results.push({
        model,
        ok: true,
        status: 200,
        latencyMs: 0,
        method: 'already-loaded',
      });
      continue;
    }

    // Try loading via lms CLI first if available
    let loadedViaCli = false;
    if (lmsLoadedModels !== null) {
      try {
        console.log(`[WARMUP] Instructing LM Studio to load model instance: "${lmsCli}" load "${model}" -y`);
        const { stdout, stderr } = await execAsync(`"${lmsCli}" load "${model}" -y`, { timeout: 90000 });
        console.log(`[WARMUP] LMS CLI load completed for "${model}":`, (stdout || stderr || 'OK').trim().slice(0, 200));
        results.push({
          model,
          ok: true,
          status: 200,
          latencyMs: Date.now() - start,
          method: 'lms-cli',
        });
        loadedViaCli = true;
      } catch (cliErr: any) {
        console.warn(`[WARMUP] LMS CLI load failed for "${model}":`, cliErr?.message || cliErr);
      }
    }

    if (loadedViaCli) continue;

    // Fallback: sequential 1-token HTTP request
    try {
      console.log(`[WARMUP] Fallback HTTP pinging: ${normalizedBase}/chat/completions for "${model}"`);
      const response = await fetch(`${normalizedBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          max_completion_tokens: 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });
      console.log(`[WARMUP] HTTP ping response for "${model}": status=${response.status} ok=${response.ok}`);
      results.push({
        model,
        ok: response.ok,
        status: response.status,
        latencyMs: Date.now() - start,
        method: 'http',
      });
    } catch (err: any) {
      console.warn(`[WARMUP] HTTP ping failed for "${model}":`, err?.message || err);
      results.push({
        model,
        ok: false,
        error: err.message || 'Request failed',
        latencyMs: Date.now() - start,
        method: 'http',
      });
    }
  }

  console.log(
    `[WARMUP] Preloading complete. ${results.filter((r) => r.ok).length}/${results.length} models ready.`,
    results.map((r) => `${r.model.split('/').pop()} [${r.method}: ${r.ok ? 'OK' : r.error || r.status}]`).join(', ')
  );

  return res.json({ ok: true, results });
});

