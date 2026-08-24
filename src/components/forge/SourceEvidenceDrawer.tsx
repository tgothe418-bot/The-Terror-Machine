import React, { useEffect, useRef } from 'react';
import { ForgeSourceEvidence } from '../../types/forge';
import { X, FileText, Tag, Quote } from 'lucide-react';

export interface SourceEvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateLabel: string;
  sourceFileName: string;
  evidence: ForgeSourceEvidence[];
  triggerElementId?: string;
  drawerId?: string;
}

export const SourceEvidenceDrawer: React.FC<SourceEvidenceDrawerProps> = ({
  isOpen,
  onClose,
  candidateLabel,
  sourceFileName,
  evidence,
  triggerElementId,
  drawerId = 'source-evidence-drawer',
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
    return () => {
      if (triggerElementId) {
        const el = document.getElementById(triggerElementId);
        el?.focus();
      }
    };
  }, [isOpen, triggerElementId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      id={drawerId}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
      aria-describedby="evidence-drawer-desc"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col h-full shadow-2xl overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <h3
                id="evidence-drawer-title"
                className="text-zinc-200 font-mono text-xs uppercase tracking-widest font-bold truncate"
              >
                Source Evidence Review
              </h3>
            </div>
            <p id="evidence-drawer-desc" className="text-[11px] font-mono text-zinc-400 truncate">
              {candidateLabel} · {sourceFileName}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            id="close-evidence-drawer-btn"
            onClick={onClose}
            aria-label="Close evidence drawer"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Evidence Records List */}
        <div className="space-y-4 flex-1">
          {evidence.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 italic">
              No linked evidence claims found for this candidate.
            </p>
          ) : (
            evidence.map((ev) => (
              <div
                key={ev.id}
                id={`evidence-record-${ev.id}`}
                className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded space-y-2.5 font-mono text-xs"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {ev.category}
                  </span>
                  <span className="text-zinc-500 truncate max-w-[200px]" title={sourceFileName}>
                    {sourceFileName}
                  </span>
                </div>

                <div className="text-xs text-zinc-200 leading-relaxed font-sans">
                  <span className="font-mono text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                    Claim
                  </span>
                  {ev.claim}
                </div>

                {ev.excerpt && (
                  <div className="text-xs text-zinc-300 bg-black/50 p-2.5 rounded border border-zinc-900/80 italic font-serif leading-relaxed">
                    <span className="font-mono text-[9px] uppercase text-zinc-500 font-bold not-italic block mb-1 flex items-center gap-1">
                      <Quote className="w-2.5 h-2.5 text-zinc-600" /> Excerpt
                    </span>
                    &quot;{ev.excerpt}&quot;
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
