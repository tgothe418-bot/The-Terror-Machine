import React, { useState } from 'react';
import { Download, Copy, Check, X, Skull, RotateCcw } from 'lucide-react';
import type { Chronicle } from '../../types/death';
import { formatChronicleToMarkdown, downloadChronicleAsMarkdown } from '../../lib/deathChronicle';

export interface ChronicleModalProps {
  chronicle: Chronicle;
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  onRetake?: () => void;
  canRetake?: boolean;
}

export const ChronicleModal: React.FC<ChronicleModalProps> = ({
  chronicle,
  isOpen,
  onClose,
  onReset,
  onRetake,
  canRetake,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      const text = formatChronicleToMarkdown(chronicle);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy chronicle:', err);
    }
  };

  const handleDownload = () => {
    downloadChronicleAsMarkdown(chronicle);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chronicle-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl text-zinc-100 overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Skull className="w-5 h-5 text-red-500" />
            <div>
              <h2 id="chronicle-modal-title" className="text-lg font-bold tracking-wider uppercase text-zinc-200">
                CHRONICLE // {chronicle.scenarioTitle}
              </h2>
              <p className="text-xs text-zinc-400">
                Turns: {chronicle.turnCount} &bull; Fictional Duration: {chronicle.fictionalDurationText}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {/* Cast Fates */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-1">
              Cast Fates
            </h3>
            <ul className="space-y-1.5 text-zinc-300">
              {chronicle.castFates.map((fate, idx) => (
                <li key={idx} className="flex flex-col sm:flex-row sm:justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{fate.name}</span>
                  <span className="text-zinc-400">{fate.fate}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Cohort Progression */}
          {chronicle.cohortPhaseHistory.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-1">
                Cohort Phase Progression
              </h3>
              <div className="p-2.5 bg-zinc-900/60 rounded border border-zinc-800 text-xs text-amber-400">
                {chronicle.cohortPhaseHistory.join(' → ')}
              </div>
            </section>
          )}

          {/* Deaths */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-1">
              Recorded Casualties ({chronicle.deaths.length})
            </h3>
            {chronicle.deaths.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No mortal terminations recorded in this timeline.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {chronicle.deaths.map((death) => (
                  <li
                    key={death.id}
                    className="p-2.5 bg-red-950/20 border border-red-900/40 rounded flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300">{death.characterName}</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-200">
                        {death.valence}
                      </span>
                    </div>
                    <div className="text-zinc-400 text-[11px]">
                      Declared turn {death.declaredAtTurn} (Primary causal wound: {death.primaryWoundFactId})
                      {death.isSacrifice && ' [INTERPOSITION SACRIFICE]'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Key Evidence */}
          {chronicle.keyEvidence.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-1">
                Key Evidence Traces
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {chronicle.keyEvidence.map((ev, idx) => (
                  <li
                    key={idx}
                    className="p-2 bg-zinc-900/40 border border-zinc-800 rounded text-zinc-300 text-[11px]"
                  >
                    {ev}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Closing Line */}
          <section className="p-4 bg-zinc-900/80 border-l-2 border-red-500 rounded text-xs italic text-zinc-300">
            &ldquo;{chronicle.closingLine}&rdquo;
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Markdown
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex gap-2">
            {onRetake && (
              <button
                onClick={onRetake}
                disabled={canRetake === false}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake Turn
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Timeline
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs rounded bg-zinc-200 hover:bg-white text-zinc-950 font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChronicleModal;
