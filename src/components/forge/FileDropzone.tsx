import React, { useState } from 'react';
import { useForgeState, forgeActions, setRuntimeSourceBinding } from '../../store/useForgeStore';
import { fileToBase64, parseBlueprintFile } from '../../lib/fileParser';
import {
  REFERENCE_IMPORT_MAX_FILE_BYTES,
  REFERENCE_IMPORT_ERROR_MESSAGE,
  REFERENCE_IMPORT_HUMAN_MAX_SIZE,
} from '../../lib/referenceImportPolicy';
import { readSafeResponseError } from '../../lib/responseErrorReader';
import { ForgeSourceAnalysisSchema, ForgeSourceAnalysis } from '../../types/forge';

export const FileDropzone = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [activeFileName, setActiveFileName] = useState('');

  const draftBlueprint = useForgeState((state) => state.draftBlueprint);
  const {
    registerSourceAnalysis,
    applyImportedSourceBaseline,
    removeSourceAnalysis,
    removeReference,
    addArchitectMessage,
  } = forgeActions;

  const applyBaselineAndNotify = (
    analysis: ForgeSourceAnalysis,
    sourceBinding: string,
    fileName: string
  ): boolean => {
    setRuntimeSourceBinding(analysis.id, sourceBinding);
    registerSourceAnalysis(analysis, sourceBinding);

    const outcome = applyImportedSourceBaseline(analysis.id);
    if (!outcome.success) {
      if (sourceBinding) {
        fetch('/api/revoke-source-binding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceBinding }),
        }).catch((e) => console.warn('[FORGE INTAKE] Binding revocation error:', e));
      }
      setRuntimeSourceBinding(analysis.id, undefined);
      removeSourceAnalysis(analysis.id);
      const errMsg = 'error' in outcome ? outcome.error : 'Failed to apply imported source baseline.';
      setError(errMsg || 'Failed to apply imported source baseline.');
      return false;
    }

    const issueCount =
      (analysis.validationIssues?.length || 0) + (analysis.omittedValidationIssueCount || 0);
    if (analysis.status === 'completed_with_issues') {
      addArchitectMessage({
        role: 'architect',
        content: `[SOURCE MATERIAL IMPORTED: ${fileName}]\nApplied source-based defaults to your active draft (${issueCount} malformed candidates were quarantined and cannot affect the Blueprint). You may edit any field or regenerate a review proposal.`,
      });
    } else {
      addArchitectMessage({
        role: 'architect',
        content: `[SOURCE MATERIAL IMPORTED: ${fileName}]\nApplied source-based defaults to your active draft. You may edit any field or regenerate a review proposal.`,
      });
    }
    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setActiveFileName(file.name);
    setIsProcessing(true);
    setError('');
    setProgressPercent(5);
    setProgressStage('Initializing file reader & intake...');

    let progressTimer: ReturnType<typeof setInterval> | null = null;

    try {
      // 1. JSON Blueprint Native Load (Local parsing + server normalization & binding)
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setProgressPercent(40);
        setProgressStage('Parsing native blueprint JSON structure...');
        const rawJson = await parseBlueprintFile(file);

        setProgressPercent(70);
        setProgressStage('Registering source baseline & binding...');
        const response = await fetch('/api/register-source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawBlueprint: rawJson,
            fileName: file.name,
            mimeType: file.type || 'application/json',
          }),
        });

        if (!response.ok) {
          const safeErrorMsg = await readSafeResponseError(response);
          throw new Error(safeErrorMsg);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (!data.sourceBinding) {
          throw new Error('Server response did not include a valid source binding.');
        }

        const parseRes = ForgeSourceAnalysisSchema.safeParse(data.analysis);
        if (!parseRes.success) {
          throw new Error(`Server returned an invalid source analysis: ${parseRes.error.issues.map((i) => i.message).join('; ')}`);
        }

        const analysis = parseRes.data;
        if (analysis.status === 'error') {
          if (data.sourceBinding) {
            fetch('/api/revoke-source-binding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceBinding: data.sourceBinding }),
            }).catch((e) => console.warn('[FORGE INTAKE] Binding revocation error:', e));
          }
          setError(analysis.errorMessage || 'Native Blueprint intake failed.');
          return;
        }

        setProgressPercent(100);
        setProgressStage('Intake complete! Applying baseline...');
        applyBaselineAndNotify(analysis, data.sourceBinding, file.name);
        return;
      }

      // 2. Document & Image Extraction Preflight Validation
      const supportedTypes = [
        'application/pdf',
        'text/plain',
        'text/html',
        'text/markdown',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
      ];
      const isSupportedExtension = /\.(md|txt|html|pdf|png|jpe?g|webp|gif)$/i.test(file.name);
      if (!supportedTypes.includes(file.type) && !isSupportedExtension) {
        throw new Error('Unsupported file type. Please upload JSON, PDF, TXT, HTML, MD, or Images (PNG, JPG, WEBP).');
      }

      // Client preflight size check before reading or Base64 encoding
      if (file.size > REFERENCE_IMPORT_MAX_FILE_BYTES) {
        throw new Error(REFERENCE_IMPORT_ERROR_MESSAGE);
      }

      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
      const estimatedDurationMs = isPdf
        ? Math.min(80000, Math.max(30000, Math.round((file.size / 1024) * 20)))
        : isImage
          ? 14000
          : 22000;

      const startTime = Date.now();
      progressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(1, elapsed / estimatedDurationMs);
        const current = Math.min(
          94,
          Math.max(8, Math.round(ratio * 88 + (elapsed > estimatedDurationMs ? Math.min(4, Math.round((elapsed - estimatedDurationMs) / 10000)) : 0)))
        );
        setProgressPercent(current);

        if (current < 18) {
          setProgressStage('Reading document structure & layout...');
        } else if (current < 42) {
          setProgressStage(
            isPdf || isImage
              ? 'Extracting text passages & rendering visual page layout...'
              : 'Parsing narrative text passages & scenes...'
          );
        } else if (current < 68) {
          setProgressStage('Analyzing dramatic register, themes & narrative tone...');
        } else if (current < 86) {
          setProgressStage('Extracting character roster, psychological profiles & topology...');
        } else {
          setProgressStage('Synthesizing evidence links & resolving candidate baseline...');
        }
      }, 250);

      const base64Data = await fileToBase64(file);

      const response = await fetch('/api/extract-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'text/plain',
          base64Data,
        }),
      });

      if (!response.ok) {
        const safeErrorMsg = await readSafeResponseError(response);
        throw new Error(safeErrorMsg);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);
      if (!data.sourceBinding) {
        throw new Error('Server response did not include a valid source binding.');
      }
      const parseRes = ForgeSourceAnalysisSchema.safeParse(data.analysis);
      if (!parseRes.success) {
        if (data.sourceBinding) {
          fetch('/api/revoke-source-binding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceBinding: data.sourceBinding }),
          }).catch((e) => console.warn('[FORGE INTAKE] Binding revocation error:', e));
        }
        setError(`Server returned an invalid source analysis payload: ${parseRes.error.issues.map((i) => i.message).join('; ')}`);
        return;
      }

      const analysis = parseRes.data;

      if (analysis.status === 'error') {
        if (data.sourceBinding) {
          fetch('/api/revoke-source-binding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceBinding: data.sourceBinding }),
          }).catch((e) => console.warn('[FORGE INTAKE] Binding revocation error:', e));
        }
        setError(analysis.errorMessage || 'Extraction failed to produce a valid source baseline.');
        return;
      }

      if (progressTimer) clearInterval(progressTimer);
      setProgressPercent(100);
      setProgressStage('Extraction complete! Applying baseline to draft...');

      applyBaselineAndNotify(analysis, data.sourceBinding, file.name);
    } catch (err: unknown) {
      console.error(
        'Knowledgebase extraction error:',
        err instanceof Error ? err.message : 'Unknown error'
      );
      setError(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStage('');
      setActiveFileName('');
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col space-y-2 mt-4">
      <div className="bg-zinc-950 border border-dashed border-zinc-700 hover:border-zinc-500 rounded p-6 flex flex-col items-center justify-center transition-colors relative min-h-[120px]">
        <input
          type="file"
          accept=".json,.pdf,.txt,.html,.md,.png,.jpg,.jpeg,.webp"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
        />

        {isProcessing ? (
          <div className="w-full max-w-md px-4 flex flex-col items-center justify-center space-y-3">
            <div className="text-zinc-300 font-mono text-xs font-semibold tracking-wider text-center truncate max-w-full">
              [ INTAKE: {activeFileName} ]
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-700/60 p-0.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full text-[11px] font-mono text-zinc-400">
              <span className="text-amber-300/90 animate-pulse truncate mr-2">
                {progressStage || 'Processing...'}
              </span>
              <span className="text-zinc-200 font-bold shrink-0">{progressPercent}%</span>
            </div>
          </div>
        ) : (
          <div className="text-zinc-400 font-mono text-sm text-center">
            DRAG & DROP SOURCE MATERIAL
            <br />
            <span className="text-xs text-zinc-600 mt-1 block">
              Supports: .JSON | .PDF, .MD, .TXT, .HTML, Images (.PNG, .JPG, .WEBP) (Max {REFERENCE_IMPORT_HUMAN_MAX_SIZE})
            </span>
          </div>
        )}
      </div>

      {/* Structured Error Display beneath dropzone in normal flow */}
      {error && (
        <div
          role="alert"
          className="text-red-400 bg-red-950/40 border border-red-900/60 rounded px-3 py-2 font-mono text-xs break-words"
        >
          {error}
        </div>
      )}

      {/* Reference Tracker UI */}
      {draftBlueprint?.references && draftBlueprint.references.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {draftBlueprint.references.map((ref, idx) => (
            <div
              key={idx}
              className="flex items-center bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
            >
              <span className="text-zinc-400 font-mono text-xs mr-2 border-r border-zinc-700 pr-2">
                🔗 {ref}
              </span>
              <button
                onClick={() => removeReference(ref)}
                className="text-red-500 hover:text-red-400 font-mono text-xs leading-none"
                title="Remove Reference from Active Context"
              >
                [X]
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
