import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Maximize2, AlertCircle } from 'lucide-react';

export interface WritingTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: string) => void;
  title: string;
  fieldLabel: string;
  guidance?: string;
  initialValue: string;
  maxLength: number;
  minRows?: number;
  placeholder?: string;
  triggerElementRef?: React.RefObject<HTMLElement | null>;
}

function WritingTerminalModalContent({
  onClose,
  onApply,
  title,
  fieldLabel,
  guidance,
  initialValue,
  maxLength,
  minRows = 10,
  placeholder,
  triggerElementRef,
}: Omit<WritingTerminalModalProps, 'isOpen'>) {
  const [draft, setDraft] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClose = useCallback(() => {
    onClose();
    if (triggerElementRef?.current) {
      triggerElementRef.current.focus();
    }
  }, [onClose, triggerElementRef]);

  // Handle ESC key to cancel/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Auto-focus textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleApply = () => {
    if (draft.length > maxLength) return;
    onApply(draft);
    handleClose();
  };

  const charCount = draft.length;
  const isOverLimit = charCount > maxLength;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="writing-terminal-title"
    >
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-red-950/40 border border-red-800/60 rounded text-red-400">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="writing-terminal-title"
                className="text-sm font-semibold tracking-wider uppercase text-zinc-100 font-mono"
              >
                {title}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">{fieldLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cancel and close expanded editor"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guidance bar */}
        {guidance && (
          <div className="px-6 py-2.5 bg-zinc-900/30 border-b border-zinc-800/60 text-xs text-zinc-300 font-sans">
            {guidance}
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col space-y-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={minRows}
            placeholder={placeholder}
            aria-label={fieldLabel}
            className={`w-full flex-1 min-h-[220px] p-4 bg-zinc-900/90 text-zinc-100 border rounded-lg font-mono text-sm leading-relaxed resize-y focus:outline-none transition-colors ${
              isOverLimit
                ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                : 'border-zinc-700/80 focus:border-red-600 focus:ring-1 focus:ring-red-600/50'
            }`}
          />

          <div className="flex items-center justify-between text-xs font-mono">
            <div>
              {isOverLimit ? (
                <span className="text-red-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Character limit exceeded by{' '}
                  {charCount - maxLength} characters
                </span>
              ) : (
                <span className="text-zinc-400">Preserves line breaks and authored formatting.</span>
              )}
            </div>
            <div className={`font-semibold ${isOverLimit ? 'text-red-400' : 'text-zinc-400'}`}>
              {charCount} / {maxLength}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isOverLimit}
            className="px-4 py-2 text-xs font-mono font-semibold flex items-center space-x-1.5 text-white bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors shadow-lg shadow-red-950/50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const WritingTerminalModal: React.FC<WritingTerminalModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <WritingTerminalModalContent key={props.title + props.fieldLabel} {...props} />;
};
