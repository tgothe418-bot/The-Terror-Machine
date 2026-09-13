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
}

interface AiPingResponse {
  ok: boolean;
  model: string;
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
    onClose();
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload: { tier: 'free' | 'paid'; model: string; apiKey?: string } = {
        tier,
        model,
      };
      if (apiKeyInput.trim().length > 0) {
        payload.apiKey = apiKeyInput.trim();
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
        setStatusMessage('AI Configuration saved successfully.');
        onConfigChanged?.();
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

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/ai/ping', { method: 'POST' });
      const data: AiPingResponse = await res.json();
      setPingResult(data);
    } catch {
      setPingResult({
        ok: false,
        model,
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
        className="max-w-2xl w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-6 sm:p-8 space-y-6 text-zinc-100 font-sans relative"
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
            Configure Gemini operating tier, active model, and API authentication.
          </p>
        </div>

        {/* Operating Tier Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Operating Tier
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
            Active Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-white transition-colors"
          >
            <option value="gemini-2.5-flash">
              gemini-2.5-flash (Fast, Reliable, High Free Quota - Recommended)
            </option>
            <option value="gemini-2.5-flash-lite">
              gemini-2.5-flash-lite (Ultra-Fast, Lightest Token Overhead)
            </option>
            <option value="gemini-3.7-flash">
              gemini-3.7-flash (Deep Reasoning - Paid / Standard Free)
            </option>
            <option value="gemini-3.5-flash-lite">
              gemini-3.5-flash-lite (High-throughput execution)
            </option>
          </select>
        </div>

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
              <span>Connectivity Diagnostic</span>
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
                    Connection verified with <strong>{pingResult.model}</strong>. Latency:{' '}
                    {pingResult.latencyMs}ms.
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
