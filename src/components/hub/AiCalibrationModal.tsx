import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Key,
  Cpu,
  ShieldCheck,
  Eye,
} from 'lucide-react';

import { motion } from 'motion/react';

interface AiConfigResponse {
  tier: 'free' | 'paid';
  model: string;
  approvedModels: string[];
  defaultFreeModel: string;
  defaultPaidModel: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  engineProvider: 'gemini' | 'zai' | 'hemmingway' | 'local';
  engineProviders?: Array<'gemini' | 'zai' | 'hemmingway' | 'local'>;
  voiceProvider: 'gemini' | 'openai' | 'zai' | 'hemmingway' | 'local';
  voiceProviders: Array<'gemini' | 'openai' | 'zai' | 'hemmingway' | 'local'>;
  openAiModel: string;
  approvedOpenAiModels: string[];
  defaultOpenAiModel: string;
  hasOpenAiApiKey: boolean;
  maskedOpenAiApiKey: string;
  zaiModel: string;
  approvedZaiModels?: string[];
  defaultZaiModel: string;
  zaiEndpoint?: 'general' | 'coding';
  hasZaiApiKey: boolean;
  maskedZaiApiKey: string;
  hemmingwayModel?: string;
  approvedHemmingwayModels?: string[];
  defaultHemmingwayModel?: string;
  hasHemmingwayApiKey?: boolean;
  maskedHemmingwayApiKey?: string;
  reasoningEffort?: 'default' | 'minimal' | 'low' | 'medium' | 'high';
  reasoningEfforts?: Array<'default' | 'minimal' | 'low' | 'medium' | 'high'>;
  defaultReasoningEffort?: string;
  localBaseUrl: string;
  localModel: string;
  localEngineModel?: string;
  localAutopilotModel?: string;
  localVoiceModel?: string;
  localForgeModel?: string;
  defaultLocalBaseUrl: string;
}

interface AiPingResponse {
  ok: boolean;
  provider?: 'gemini' | 'openai' | 'zai' | 'hemmingway' | 'local';
  model: string;
  models?: string[];
  latencyMs: number;
  status?: number;
  code?: string;
  message?: string;
}

interface AiCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

export default function AiCalibrationModal({
  isOpen,
  onClose,
  onConfigChanged,
}: AiCalibrationModalProps) {
  const [config, setConfig] = useState<AiConfigResponse | null>(null);
  const [tier, setTier] = useState<'free' | 'paid'>('free');
  const [model, setModel] = useState<string>('gemini-3.6-flash');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [engineProvider, setEngineProvider] = useState<'gemini' | 'zai' | 'hemmingway' | 'local'>('gemini');
  const [voiceProvider, setVoiceProvider] = useState<'gemini' | 'openai' | 'zai' | 'hemmingway' | 'local'>('openai');
  const [openAiModel, setOpenAiModel] = useState<string>('gpt-5.6-luna');
  const [openAiApiKeyInput, setOpenAiApiKeyInput] = useState<string>('');
  const [zaiModel, setZaiModel] = useState<string>('glm-4.6');
  const [zaiEndpoint, setZaiEndpoint] = useState<'general' | 'coding'>('general');
  const [zaiApiKeyInput, setZaiApiKeyInput] = useState<string>('');
  const [hemmingwayModel, setHemmingwayModel] = useState<string>('hemmingway-27b');
  const [hemmingwayApiKeyInput, setHemmingwayApiKeyInput] = useState<string>('');
  const [reasoningEffort, setReasoningEffort] = useState<'default' | 'minimal' | 'low' | 'medium' | 'high'>('default');
  const [localBaseUrl, setLocalBaseUrl] = useState<string>('http://127.0.0.1:1234/v1');
  const [localModel, setLocalModel] = useState<string>('');
  const [localEngineModel, setLocalEngineModel] = useState<string>('');
  const [localAutopilotModel, setLocalAutopilotModel] = useState<string>('');
  const [localVoiceModel, setLocalVoiceModel] = useState<string>('');
  const [localForgeModel, setLocalForgeModel] = useState<string>('');
  const [useDedicatedSubsystemModels, setUseDedicatedSubsystemModels] = useState<boolean>(false);
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [isDiscoveringLocalModels, setIsDiscoveringLocalModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<AiPingResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/ai/config');
        if (res.ok && !ignore) {
          const data: AiConfigResponse = await res.json();
          setConfig(data);
          setTier(data.tier);
          setModel(data.model);
          setEngineProvider(data.engineProvider || 'gemini');
          setVoiceProvider(data.voiceProvider || 'gemini');
          setOpenAiModel(data.openAiModel || data.defaultOpenAiModel || 'gpt-6-astra');
          setZaiModel(data.zaiModel || data.defaultZaiModel || 'glm-4.6');
          setZaiEndpoint(data.zaiEndpoint || 'general');
          setHemmingwayModel(data.hemmingwayModel || data.defaultHemmingwayModel || 'hemmingway-27b');
          setReasoningEffort(data.reasoningEffort || 'default');
          setLocalBaseUrl(
            data.localBaseUrl || data.defaultLocalBaseUrl || 'http://127.0.0.1:1234/v1'
          );
          setLocalModel(data.localModel || '');
          setLocalEngineModel(data.localEngineModel || data.localModel || '');
          setLocalAutopilotModel(data.localAutopilotModel || data.localModel || '');
          setLocalVoiceModel(data.localVoiceModel || data.localModel || '');
          setLocalForgeModel(data.localForgeModel || data.localModel || '');
          if (
            (data.localEngineModel && data.localEngineModel !== data.localModel) ||
            (data.localAutopilotModel && data.localAutopilotModel !== data.localModel) ||
            (data.localForgeModel && data.localForgeModel !== data.localModel)
          ) {
            setUseDedicatedSubsystemModels(true);
          }
        }
      } catch (err) {
        console.error('Failed to load AI config:', err);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const handleClose = () => {
    setPingResult(null);
    setStatusMessage(null);
    setApiKeyInput('');
    setOpenAiApiKeyInput('');
    setZaiApiKeyInput('');
    setHemmingwayApiKeyInput('');
    onClose();
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload: {
        tier: 'free' | 'paid';
        model: string;
        apiKey?: string;
        engineProvider: 'gemini' | 'zai' | 'hemmingway' | 'local';
        voiceProvider: 'gemini' | 'openai' | 'zai' | 'hemmingway' | 'local';
        openAiModel: string;
        openAiApiKey?: string;
        zaiModel: string;
        zaiEndpoint?: 'general' | 'coding';
        zaiApiKey?: string;
        hemmingwayModel?: string;
        hemmingwayApiKey?: string;
        reasoningEffort?: 'default' | 'minimal' | 'low' | 'medium' | 'high';
        localBaseUrl: string;
        localModel: string;
        localEngineModel?: string;
        localAutopilotModel?: string;
        localVoiceModel?: string;
        localForgeModel?: string;
      } = {
        tier,
        model,
        engineProvider,
        voiceProvider,
        openAiModel,
        zaiModel,
        zaiEndpoint,
        hemmingwayModel,
        reasoningEffort,
        localBaseUrl,
        localModel,
        localEngineModel: useDedicatedSubsystemModels ? localEngineModel : localModel,
        localAutopilotModel: useDedicatedSubsystemModels ? localAutopilotModel : localModel,
        localVoiceModel: useDedicatedSubsystemModels ? localVoiceModel : localModel,
        localForgeModel: useDedicatedSubsystemModels ? localForgeModel : localModel,
      };
      if (apiKeyInput.trim().length > 0) {
        payload.apiKey = apiKeyInput.trim();
      }
      if (openAiApiKeyInput.trim().length > 0) {
        payload.openAiApiKey = openAiApiKeyInput.trim();
      }
      if (zaiApiKeyInput.trim().length > 0) {
        payload.zaiApiKey = zaiApiKeyInput.trim();
      }
      if (hemmingwayApiKeyInput.trim().length > 0) {
        payload.hemmingwayApiKey = hemmingwayApiKeyInput.trim();
      }

      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        setApiKeyInput('');
        setOpenAiApiKeyInput('');
        setZaiApiKeyInput('');
        setHemmingwayApiKeyInput('');
        onConfigChanged?.();

        const modelsToWarmup = Array.from(
          new Set(
            [
              payload.localModel,
              payload.localEngineModel,
              payload.localAutopilotModel,
              payload.localVoiceModel,
              payload.localForgeModel,
            ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
          )
        );

        if (modelsToWarmup.length > 0 && (engineProvider === 'local' || voiceProvider === 'local' || Boolean(localModel))) {
          setStatusMessage(`AI Configuration saved. Preloading ${modelsToWarmup.length} local model(s) into Bionic memory...`);
          try {
            const warmupRes = await fetch('/api/ai/warmup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                models: modelsToWarmup,
                baseUrl: payload.localBaseUrl,
              }),
            });
            const warmupData = await warmupRes.json();
            const loadedCount = warmupData?.results
              ? warmupData.results.filter((r: any) => r.ok).length
              : 0;
            const loadedNames = warmupData?.results
              ?.filter((r: any) => r.ok)
              ?.map((r: any) => r.model.split('/').pop())
              ?.join(', ');
            setStatusMessage(
              `AI Configuration saved. ${loadedCount}/${modelsToWarmup.length} local model(s) preloaded & ready in Bionic${loadedNames ? ` (${loadedNames})` : ''}.`
            );
          } catch {
            setStatusMessage('AI Configuration saved. (Local model preload ping completed)');
          }
        } else {
          setStatusMessage('AI Configuration saved successfully.');
        }
      } else {
        const err = await res.json();
        setStatusMessage(`Error: ${err.error || 'Failed to save configuration'}`);
      }
    } catch {
      setStatusMessage('Network error while saving AI configuration.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleDiscoverLocalModels = async () => {
    setIsDiscoveringLocalModels(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/ai/local-models?baseUrl=${encodeURIComponent(localBaseUrl)}`);
      const data: { models?: string[]; error?: string } = await res.json();
      if (!res.ok || !data.models?.length) {
        setStatusMessage(
          `Error: ${data.error || 'No models were reported by the Local provider.'}`
        );
        return;
      }
      setLocalModels(data.models);
      const chosen = (!localModel || !data.models.includes(localModel))
        ? (data.models.find((candidate) => /qwen3\.8-27b/i.test(candidate)) || data.models[0])
        : localModel;
      if (!localModel || !data.models.includes(localModel)) {
        setLocalModel(chosen);
      }
      if (!localEngineModel) setLocalEngineModel(chosen);
      if (!localAutopilotModel) setLocalAutopilotModel(chosen);
      if (!localVoiceModel) setLocalVoiceModel(chosen);
      if (!localForgeModel) setLocalForgeModel(chosen);
      setStatusMessage(
        `${data.models.length} local model${data.models.length === 1 ? '' : 's'} discovered.`
      );
    } catch {
      setStatusMessage(
        'Could not reach the Local provider. Start its API server and verify the URL.'
      );
    } finally {
      setIsDiscoveringLocalModels(false);
    }
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/ai/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: voiceProvider,
          ...(voiceProvider === 'openai'
            ? {
                model: openAiModel,
                ...(openAiApiKeyInput.trim() ? { apiKey: openAiApiKeyInput.trim() } : {}),
              }
            : voiceProvider === 'zai'
              ? {
                  model: zaiModel,
                  ...(zaiApiKeyInput.trim() ? { apiKey: zaiApiKeyInput.trim() } : {}),
                }
            : voiceProvider === 'hemmingway'
              ? {
                  model: hemmingwayModel,
                  ...(hemmingwayApiKeyInput.trim() ? { apiKey: hemmingwayApiKeyInput.trim() } : {}),
                }
              : voiceProvider === 'local'
                ? { model: localModel, baseUrl: localBaseUrl }
                : {}),
        }),
      });
      const data: AiPingResponse = await res.json();
      setPingResult(data);
    } catch {
      setPingResult({
        ok: false,
        model:
          voiceProvider === 'openai'
            ? openAiModel
            : voiceProvider === 'zai'
              ? zaiModel
              : voiceProvider === 'hemmingway'
                ? hemmingwayModel
                : voiceProvider === 'local'
                  ? localModel
                  : model,
        latencyMs: 0,
        code: 'NETWORK_ERROR',
        message: 'Could not connect to /api/ai/ping',
      });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-6 sm:p-8 space-y-6 text-zinc-100 font-sans relative"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
            <Cpu className="w-4 h-4 text-system-green" />
            <span>AI Calibration // Simulation Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight uppercase text-white">
            Provider & Tier Settings
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Configure providers and model settings for both the Simulation Engine and The Historian.
          </p>
        </div>

        {/* Simulation Engine Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Simulation Engine Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['gemini', 'zai', 'hemmingway', 'local'] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setEngineProvider(provider)}
                className={`p-4 text-left border rounded transition-all cursor-pointer ${
                  engineProvider === provider
                    ? 'border-emerald-500 bg-emerald-950/20 text-white'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {provider === 'gemini'
                      ? 'Google Gemini'
                      : provider === 'zai'
                        ? 'Z.ai GLM'
                        : provider === 'hemmingway'
                          ? 'Hemmingway.io'
                          : 'Local Model'}
                  </span>
                  {engineProvider === provider && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-xs text-zinc-300 font-mono">
                  {provider === 'gemini'
                    ? 'Uses the cloud Gemini baseline for turns and initialization.'
                    : provider === 'zai'
                      ? 'Uses Z.ai GLM models with your API key for turns and initialization.'
                      : provider === 'hemmingway'
                        ? 'Uses Hemmingway.io models with your API key for simulation turns.'
                        : 'Uses the active local API server (LM Studio / Ollama) below.'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            The Historian Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(['gemini', 'openai', 'zai', 'hemmingway', 'local'] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setVoiceProvider(provider)}
                className={`p-4 text-left border rounded transition-all cursor-pointer ${
                  voiceProvider === provider
                    ? 'border-blue-500 bg-blue-950/20 text-white'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-300">
                    {provider === 'gemini'
                      ? 'Google Gemini'
                      : provider === 'openai'
                        ? 'OpenAI'
                        : provider === 'zai'
                          ? 'Z.ai GLM'
                          : provider === 'hemmingway'
                            ? 'Hemmingway'
                            : 'Local'}
                  </span>
                  {voiceProvider === provider && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-xs text-zinc-300 font-mono">
                  {provider === 'gemini'
                    ? 'Uses the active Gemini baseline below.'
                    : provider === 'openai'
                      ? 'Uses the Responses API for The Historian only.'
                      : provider === 'zai'
                        ? 'Uses Z.ai GLM models with your API key.'
                        : provider === 'hemmingway'
                          ? 'Uses Hemmingway.io with your API key.'
                          : 'Uses an API server running on this computer.'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Reasoning / Thinking Effort Dial */}
        <div className="space-y-2 p-4 border border-zinc-800 bg-zinc-900/30 rounded">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Reasoning & Thinking Effort
            </label>
            <span className="text-[11px] font-mono text-zinc-400">
              Dial: <code className="text-amber-300 uppercase">{reasoningEffort}</code>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['default', 'minimal', 'low', 'medium', 'high'] as const).map((effort) => (
              <button
                key={effort}
                type="button"
                onClick={() => setReasoningEffort(effort)}
                className={`px-3 py-2 rounded text-xs font-mono text-center border transition-all cursor-pointer ${
                  reasoningEffort === effort
                    ? 'border-amber-500 bg-amber-950/40 text-amber-200 font-bold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="capitalize">{effort}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">
            Applies to models supporting reasoning/thinking (Gemini, Z.ai GLM, Hemmingway). &apos;default&apos; defers to purpose-derived policy; explicit levels override across simulation turns, architecture, and voice.
          </p>
        </div>

        {/* Operating Tier Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Gemini Baseline Tier
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Free Tier */}
            <button
              type="button"
              onClick={() => {
                setTier('free');
                setModel('gemini-3.6-flash');
              }}
              className={`p-4 text-left border rounded transition-all cursor-pointer ${
                tier === 'free'
                  ? 'border-system-green bg-system-green/10 text-white'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-system-green flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Free Tier (Zero Cost)
                </span>
                {tier === 'free' && <CheckCircle2 className="w-4 h-4 text-system-green" />}
              </div>
              <p className="text-xs text-zinc-300 font-mono">
                Optimized for standard Google AI Studio free quotas (15 RPM / 1M TPM). Recommended.
              </p>
            </button>

            {/* Paid Tier */}
            <button
              type="button"
              onClick={() => {
                setTier('paid');
                setModel('gemini-3.7-flash');
              }}
              className={`p-4 text-left border rounded transition-all cursor-pointer ${
                tier === 'paid'
                  ? 'border-red-500 bg-red-950/20 text-white'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Paid / Pro Tier
                </span>
                {tier === 'paid' && <CheckCircle2 className="w-4 h-4 text-red-400" />}
              </div>
              <p className="text-xs text-zinc-300 font-mono">
                Uses gemini-3.7-flash. Requires active AI Studio billing or prepayment credits.
              </p>
            </button>
          </div>
        </div>

        {/* Active Model Selector */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Gemini Baseline Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-white transition-colors"
          >
            {(config?.approvedModels || [model]).map((approvedModel) => (
              <option key={approvedModel} value={approvedModel}>
                {approvedModel}
              </option>
            ))}
          </select>
        </div>

        {voiceProvider === 'openai' && (
          <div className="space-y-4 p-4 border border-blue-900/50 bg-blue-950/10 rounded">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                OpenAI Voice Model
              </label>
              <select
                value={openAiModel}
                onChange={(e) => setOpenAiModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                {(
                  config?.approvedOpenAiModels || ['gpt-5.6-luna', 'gpt-6-astra', 'gpt-5.6-terra']
                ).map((approvedModel) => (
                  <option key={approvedModel} value={approvedModel}>
                    {approvedModel}
                    {approvedModel === (config?.defaultOpenAiModel || 'gpt-5.6-luna')
                      ? ' (Recommended)'
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  OpenAI API Key
                </label>
                {config?.hasOpenAiApiKey && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    Active: <code className="text-zinc-300">{config.maskedOpenAiApiKey}</code>
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="Paste a new OpenAI API key to update (optional)..."
                value={openAiApiKeyInput}
                onChange={(e) => setOpenAiApiKeyInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 font-mono">
                The key stays on the server process and is never returned to the browser.
              </p>
            </div>
          </div>
        )}

        {(voiceProvider === 'zai' || engineProvider === 'zai') && (
          <div className="space-y-4 p-4 border border-violet-900/50 bg-violet-950/10 rounded">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Z.ai GLM Model
              </label>
              <select
                value={zaiModel}
                onChange={(e) => setZaiModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
              >
                {(
                  config?.approvedZaiModels || ['glm-5', 'glm-4.7', 'glm-4.6', 'glm-4.5-air', 'glm-4.5-flash']
                ).map((approvedModel) => (
                  <option key={approvedModel} value={approvedModel}>
                    {approvedModel}
                    {approvedModel === (config?.defaultZaiModel || 'glm-4.6')
                      ? ' (Recommended)'
                      : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 font-mono">
                Applies to every Z.ai subsystem. GLM runs your Engine contracts through JSON mode + the same fail-closed ratification as every other provider.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Z.ai Endpoint
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setZaiEndpoint('general')}
                  className={`px-3 py-2 rounded text-xs font-mono text-left border transition-all cursor-pointer ${
                    zaiEndpoint === 'general'
                      ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-zinc-200">General API</div>
                  <div className="text-[10px] text-zinc-500 truncate">api.z.ai/api/paas/v4</div>
                </button>
                <button
                  type="button"
                  onClick={() => setZaiEndpoint('coding')}
                  className={`px-3 py-2 rounded text-xs font-mono text-left border transition-all cursor-pointer ${
                    zaiEndpoint === 'coding'
                      ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-zinc-200">Coding Plan</div>
                  <div className="text-[10px] text-zinc-500 truncate">api.z.ai/api/coding/paas/v4</div>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Select &apos;Coding Plan&apos; if you have a Z.ai GLM Coding subscription; otherwise use &apos;General API&apos;.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Z.ai API Key
                </label>
                {config?.hasZaiApiKey && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    Active: <code className="text-zinc-300">{config.maskedZaiApiKey}</code>
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="Paste a new Z.ai API key to update (optional)..."
                value={zaiApiKeyInput}
                onChange={(e) => setZaiApiKeyInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 font-mono">
                Create a key at z.ai → API Keys. The key stays on the server process and is never returned to the browser.
              </p>
            </div>
          </div>
        )}

        {(voiceProvider === 'hemmingway' || engineProvider === 'hemmingway') && (
          <div className="space-y-4 p-4 border border-teal-900/50 bg-teal-950/10 rounded">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Hemmingway Model
              </label>
              <select
                value={hemmingwayModel}
                onChange={(e) => setHemmingwayModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500 transition-colors"
              >
                {(
                  config?.approvedHemmingwayModels || ['hemmingway-27b']
                ).map((approvedModel) => (
                  <option key={approvedModel} value={approvedModel}>
                    {approvedModel}
                    {approvedModel === (config?.defaultHemmingwayModel || 'hemmingway-27b')
                      ? ' (Recommended)'
                      : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 font-mono">
                Hemmingway.io runs Engine contracts through JSON mode with the same fail-closed ratification as every other provider.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Hemmingway API Key
                </label>
                {config?.hasHemmingwayApiKey && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    Active: <code className="text-zinc-300">{config.maskedHemmingwayApiKey}</code>
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="Paste a new Hemmingway API key to update (optional)..."
                value={hemmingwayApiKeyInput}
                onChange={(e) => setHemmingwayApiKeyInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 font-mono">
                The key stays on the server process and is never returned to the browser.
              </p>
            </div>
          </div>
        )}

        {(voiceProvider === 'local' || engineProvider === 'local') && (
          <div className="space-y-4 p-4 border border-amber-900/50 bg-amber-950/10 rounded">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Local / Tunnel API Server URL
              </label>
              <input
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                placeholder="http://127.0.0.1:1234/v1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 font-mono">
                Connect to local LM Studio (1234) or Ollama (11434). For cloud instances (Render), enter a secure tunnel URL (e.g. ngrok / Cloudflare).
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Local Model
                </label>
                <button
                  type="button"
                  onClick={handleDiscoverLocalModels}
                  disabled={isDiscoveringLocalModels}
                  className="text-[11px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-100 disabled:opacity-50"
                >
                  {isDiscoveringLocalModels ? 'Discovering...' : 'Discover Models'}
                </button>
              </div>
              {localModels.length > 0 ? (
                <select
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {localModels.map((candidate) => {
                    const isVlm = /vl|vision|minicpm-v|llava|pixtral|omni/i.test(candidate);
                    return (
                      <option key={candidate} value={candidate}>
                        {candidate}{isVlm ? ' [👁️ Vision Ready]' : ''}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder="Discover automatically, or enter the model ID"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              )}
              {/vl|vision|minicpm-v|llava|pixtral|omni/i.test(localModel) && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono pt-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Vision-capable VLM — can inspect PDF covers, artwork, and visual maps</span>
                </div>
              )}
              <p className="text-[11px] text-zinc-500 font-mono">
                Primary model used across subsystems by default.
              </p>
            </div>

            <div className="pt-3 border-t border-amber-900/30 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useDedicatedSubsystemModels}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseDedicatedSubsystemModels(checked);
                    if (checked) {
                      if (!localEngineModel) setLocalEngineModel(localModel);
                      if (!localAutopilotModel) setLocalAutopilotModel(localModel);
                      if (!localVoiceModel) setLocalVoiceModel(localModel);
                      if (!localForgeModel) setLocalForgeModel(localModel);
                    }
                  }}
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-mono uppercase tracking-wider text-amber-200">
                  Assign Independent Models per Subsystem
                </span>
              </label>

              {useDedicatedSubsystemModels ? (
                <div className="space-y-3 pt-2 pl-3 border-l-2 border-amber-800/40">
                  {/* The Engine */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-300 font-semibold">The Engine</span>
                      <span className="text-[10px] font-mono text-zinc-500">Narrative & Spatial Turns</span>
                    </div>
                    {localModels.length > 0 ? (
                      <select
                        value={localEngineModel || localModel}
                        onChange={(e) => setLocalEngineModel(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        {localModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={localEngineModel}
                        onChange={(e) => setLocalEngineModel(e.target.value)}
                        placeholder="e.g. mistralai/mistral-nemo-instruct-2407"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    )}
                  </div>

                  {/* Autopilot */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-300 font-semibold">Autopilot</span>
                      <span className="text-[10px] font-mono text-zinc-500">Player Simulation (fast 3B–8B recommended)</span>
                    </div>
                    {localModels.length > 0 ? (
                      <select
                        value={localAutopilotModel || localModel}
                        onChange={(e) => setLocalAutopilotModel(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        {localModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={localAutopilotModel}
                        onChange={(e) => setLocalAutopilotModel(e.target.value)}
                        placeholder="e.g. google/gemma-4-e4b"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    )}
                  </div>

                  {/* The Historian */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-300 font-semibold">The Historian</span>
                      <span className="text-[10px] font-mono text-zinc-500">Continuity Oracle & Script Inscriptions</span>
                    </div>
                    {localModels.length > 0 ? (
                      <select
                        value={localVoiceModel || localModel}
                        onChange={(e) => setLocalVoiceModel(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        {localModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={localVoiceModel}
                        onChange={(e) => setLocalVoiceModel(e.target.value)}
                        placeholder="e.g. mistralai/mistral-nemo-instruct-2407"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    )}
                  </div>

                    {/* The Forge */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-zinc-300 font-semibold">The Forge</span>
                        <span className="text-[10px] font-mono text-zinc-500">Scenario Blueprints & World Architecture</span>
                      </div>
                      {localModels.length > 0 ? (
                        <select
                          value={localForgeModel || localModel}
                          onChange={(e) => setLocalForgeModel(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors"
                        >
                          {localModels.map((m) => {
                            const isVlm = /vl|vision|minicpm-v|llava|pixtral|omni/i.test(m);
                            return (
                              <option key={m} value={m}>
                                {m}{isVlm ? ' [👁️ Vision Ready]' : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          value={localForgeModel}
                          onChange={(e) => setLocalForgeModel(e.target.value)}
                          placeholder="e.g. qwen/qwen3.8-27b"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      )}
                      {/vl|vision|minicpm-v|llava|pixtral|omni/i.test(localForgeModel || localModel) ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono pt-0.5">
                          <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Vision-capable VLM — can inspect PDF covers, artwork, and visual maps</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono pt-0.5">
                          <span>Text-only LLM — will parse text content and structure</span>
                        </div>
                      )}
                    </div>
                  </div>

              ) : (
                <p className="text-[11px] text-zinc-500 font-mono italic">
                  All four subsystems inherit the primary local model above.
                </p>
              )}
            </div>
          </div>
        )}

        {/* API Key Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Gemini API Key
            </label>
            {config?.hasApiKey && (
              <span className="text-[11px] font-mono text-zinc-400">
                Active: <code className="text-zinc-300">{config.maskedApiKey}</code>
              </span>
            )}
          </div>
          <input
            type="password"
            placeholder="Paste new Gemini API Key to update (optional)..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Diagnostics / Ping Section */}
        <div className="p-4 border border-zinc-800 bg-zinc-900/40 rounded space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <span>Voice Provider Diagnostic</span>
            </div>
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
              {isPinging ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {pingResult && (
            <div
              className={`p-3 rounded text-xs font-mono border ${
                pingResult.ok
                  ? 'bg-green-950/30 border-green-800/60 text-green-300'
                  : 'bg-red-950/30 border-red-800/60 text-red-300'
              }`}
            >
              {pingResult.ok ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>
                    Connection verified with <strong>{pingResult.provider || voiceProvider}</strong>{' '}
                    / <strong>{pingResult.model}</strong>. Latency: {pingResult.latencyMs}ms.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Provider Error: {pingResult.code || 'FAILURE'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-300">
                    {pingResult.code === 'PREPAYMENT_DEPLETED'
                      ? 'Your Google AI Studio project prepayment credits are depleted. To use Free Tier, create an API key in a project with no billing linked at aistudio.google.com/apikey.'
                      : pingResult.message || 'API request failed.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {statusMessage && (
          <p className="text-xs font-mono text-system-green text-center">{statusMessage}</p>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Applying...' : 'Apply & Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
