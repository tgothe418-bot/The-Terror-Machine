import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import { DepictionContract } from '../../types/forge';
import { checkDepictionGenerationReadiness } from '../../lib/depictionContractContext';
import { requestDepictionContractProposal } from '../../lib/depictionProposalOrchestrator';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const isInvalidContractValue = (txt?: string) => {
  if (!txt) return true;
  const t = txt.trim().toLowerCase();
  return !t || t === 'unknown' || t === 'none' || t === 'n/a' || t === 'tbd';
};

export const DepictionContractPanel: React.FC = () => {
  const {
    forgeDraft,
    draftBlueprint,
    sourceAnalyses,
    pendingDepictionContractProposal,
    draftRevision,
    sourceBaselineRevision,
  } = useForgeState();

  const {
    updateDepictionContractField,
    setPendingDepictionContractProposal,
    applyPendingDepictionContractProposal,
    dismissPendingDepictionContractProposal,
  } = forgeActions;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentDraft = forgeDraft || draftBlueprint;
  const currentDraftRev = draftRevision || 1;
  const currentBaseRev = sourceBaselineRevision || 1;

  // If a proposal is pending, display staged proposal values in fields; otherwise display canonical contract
  const staged = pendingDepictionContractProposal?.contract;
  const canonical = currentDraft?.depictionContract;

  const displayedContract: DepictionContract = {
    dramaticRegister: staged?.dramaticRegister !== undefined ? staged.dramaticRegister : canonical?.dramaticRegister || '',
    directness: staged?.directness !== undefined ? staged.directness : canonical?.directness || '',
    aftermath: staged?.aftermath !== undefined ? staged.aftermath : canonical?.aftermath || '',
    ambiguityHandling: staged?.ambiguityHandling !== undefined ? staged.ambiguityHandling : canonical?.ambiguityHandling || '',
    specialBoundaries: staged?.specialBoundaries !== undefined ? staged.specialBoundaries : canonical?.specialBoundaries || '',
  };

  const isDramaticValid = !isInvalidContractValue(displayedContract.dramaticRegister);
  const isDirectnessValid = !isInvalidContractValue(displayedContract.directness);
  const isAftermathValid = !isInvalidContractValue(displayedContract.aftermath);
  const isAmbiguityValid = !isInvalidContractValue(displayedContract.ambiguityHandling);
  const isContractComplete =
    isDramaticValid && isDirectnessValid && isAftermathValid && isAmbiguityValid;

  const readiness = checkDepictionGenerationReadiness({ sourceAnalyses });

  const hasExistingContractOrProposal = Boolean(
    pendingDepictionContractProposal ||
      (canonical?.dramaticRegister && canonical?.directness && canonical?.aftermath && canonical?.ambiguityHandling)
  );

  const isProposalStale =
    !!pendingDepictionContractProposal &&
    (pendingDepictionContractProposal.sourceDraftRevision !== currentDraftRev ||
      pendingDepictionContractProposal.sourceBaselineRevision !== currentBaseRev);

  const handleGenerateOrRefresh = async () => {
    if (!readiness.ready) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const outcome = await requestDepictionContractProposal({ force: true });
      if (!outcome.success) {
        throw new Error(outcome.error || 'Failed to generate depiction contract proposal.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to generate depiction contract proposal.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    const outcome = applyPendingDepictionContractProposal();
    if (!outcome.success) {
      setErrorMessage((outcome as { success: false; error: string; stale?: boolean }).error);
    }
  };

  const handleFieldChange = (field: keyof DepictionContract, value: string) => {
    if (pendingDepictionContractProposal) {
      // If editing while proposal is pending, update the staged proposal contract
      setPendingDepictionContractProposal({
        ...pendingDepictionContractProposal,
        contract: {
          ...pendingDepictionContractProposal.contract,
          [field]: value,
        },
      });
    } else {
      // Otherwise update canonical contract field
      updateDepictionContractField(field, value);
    }
  };

  return (
    <div
      id="depiction-contract-panel"
      className="bg-zinc-950 border border-zinc-800 p-5 rounded flex flex-col shadow-lg space-y-4 transition-colors"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h3 className="text-zinc-300 font-mono text-xs uppercase tracking-widest font-bold">
            DEPICTION CONTRACT // NARRATIVE BOUNDARIES
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Draft r{currentDraftRev} / Base r{currentBaseRev}
          </span>
          <div
            className={`flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              isContractComplete
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
            }`}
          >
            {isContractComplete ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Export Compliant</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                <span>Missing Requirements</span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400 font-mono leading-relaxed">
        The Depiction Contract enforces explicit stylistic, dramatic, and sensory parameters
        governing how the simulation engine frames horror, aftermath, and ambiguity.
      </p>

      {/* Generation Bar / Controls (rendered ONLY when no pending proposal is staged) */}
      {!pendingDepictionContractProposal && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              Architect AI Synthesis
            </span>
            <button
              id="depiction-generate-btn"
              onClick={handleGenerateOrRefresh}
              disabled={!readiness.ready || isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                readiness.ready && !isLoading
                  ? 'bg-cyan-950/50 hover:bg-cyan-900 border-cyan-700 text-cyan-200 cursor-pointer'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{hasExistingContractOrProposal ? 'Regenerate Proposal' : 'Generate Proposal'}</span>
                </>
              )}
            </button>
          </div>

          {/* Blocked Reasons Notice */}
          {!readiness.ready && (
            <div
              id="depiction-generation-blocked-notice"
              className="bg-amber-950/20 border border-amber-900/60 p-2.5 rounded space-y-1 text-[11px] font-mono text-amber-300"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Generation Blocked by Baseline Prerequisites:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                {readiness.blockedReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Source-based defaults / Authoring status banner */}
      {!pendingDepictionContractProposal && isContractComplete && (
        <div
          id="depiction-source-defaults-banner"
          className="bg-emerald-950/20 border border-emerald-800/40 px-3 py-2 rounded text-[11px] font-mono text-emerald-300 flex items-center justify-between"
        >
          <span>SOURCE-BASED DEFAULTS APPLIED — EDIT ANY FIELD OR REGENERATE A REVIEW PROPOSAL</span>
        </div>
      )}

      {/* Error / Retry Bar */}
      {errorMessage && (
        <div
          id="depiction-generation-error"
          className="bg-rose-950/30 border border-rose-900/60 p-2.5 rounded flex items-center justify-between text-[11px] font-mono text-rose-300"
        >
          <span>{errorMessage}</span>
          <button
            onClick={handleGenerateOrRefresh}
            className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Architect Staged Proposal Banner */}
      {pendingDepictionContractProposal && (
        <div
          id="depiction-contract-proposal-banner"
          className={`border p-4 rounded space-y-3 animate-in fade-in transition-colors ${
            isProposalStale
              ? 'border-amber-800/80 bg-amber-950/20'
              : 'border-cyan-800/80 bg-cyan-950/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-4 h-4 ${
                  isProposalStale ? 'text-amber-400' : 'text-cyan-400 animate-pulse'
                }`}
              />
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  isProposalStale ? 'text-amber-300' : 'text-cyan-300'
                }`}
              >
                Architect Proposal
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                (Source draft r{pendingDepictionContractProposal.sourceDraftRevision} / base r
                {pendingDepictionContractProposal.sourceBaselineRevision})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isProposalStale ? (
                <button
                  id="depiction-contract-refresh-btn"
                  onClick={handleGenerateOrRefresh}
                  disabled={!readiness.ready || isLoading}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded font-bold uppercase tracking-wider border transition-colors ${
                    readiness.ready && !isLoading
                      ? 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-700 cursor-pointer'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              ) : (
                <button
                  id="depiction-contract-accept-btn"
                  onClick={handleApply}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 text-[11px] font-mono rounded font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Apply
                </button>
              )}
              <button
                id="depiction-contract-dismiss-btn"
                onClick={() => dismissPendingDepictionContractProposal()}
                className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-[11px] font-mono rounded uppercase tracking-wider transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Dismiss
              </button>
            </div>
          </div>

          {isProposalStale && (
            <div className="text-[11px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900/60 px-2.5 py-1 rounded">
              Stale Proposal: Target scenario state has advanced to draft r{currentDraftRev} /
              baseline r{currentBaseRev}. Refresh proposal to re-ground parameters before applying.
            </div>
          )}

          {pendingDepictionContractProposal.rationale && (
            <p className="text-xs text-cyan-200/90 font-mono italic">
              &quot;{pendingDepictionContractProposal.rationale}&quot;
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300 pt-1">
            {pendingDepictionContractProposal.contract.dramaticRegister && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Dramatic Register:
                </span>
                {pendingDepictionContractProposal.contract.dramaticRegister}
              </div>
            )}
            {pendingDepictionContractProposal.contract.directness && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Directness:
                </span>
                {pendingDepictionContractProposal.contract.directness}
              </div>
            )}
            {pendingDepictionContractProposal.contract.aftermath && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Aftermath:
                </span>
                {pendingDepictionContractProposal.contract.aftermath}
              </div>
            )}
            {pendingDepictionContractProposal.contract.ambiguityHandling && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Ambiguity Handling:
                </span>
                {pendingDepictionContractProposal.contract.ambiguityHandling}
              </div>
            )}
            {pendingDepictionContractProposal.contract.specialBoundaries && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950 col-span-full">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Special Boundaries:
                </span>
                {pendingDepictionContractProposal.contract.specialBoundaries}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Editor: 5 Textareas with Max Length & Counts */}
      <div className="space-y-3.5">
        {/* 1. Dramatic Register */}
        <div className="bg-black/40 border border-zinc-800/90 focus-within:border-zinc-700 p-3.5 rounded transition-colors">
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="contract-dramatic-register"
              className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold"
            >
              1. Dramatic Register *
            </label>
            <div className="flex items-center gap-2">
              {!isDramaticValid && (
                <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                  Required for Export
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-500">
                {(displayedContract.dramaticRegister || '').length}/1000
              </span>
            </div>
          </div>
          <textarea
            id="contract-dramatic-register"
            rows={2}
            maxLength={1000}
            value={displayedContract.dramaticRegister || ''}
            onChange={(e) => handleFieldChange('dramaticRegister', e.target.value)}
            placeholder="e.g. Grounded clinical dread; objective observational detachment without melodrama"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600 resize-none"
          />
        </div>

        {/* 2. Directness */}
        <div className="bg-black/40 border border-zinc-800/90 focus-within:border-zinc-700 p-3.5 rounded transition-colors">
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="contract-directness"
              className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold"
            >
              2. Directness & Visceral Focus *
            </label>
            <div className="flex items-center gap-2">
              {!isDirectnessValid && (
                <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                  Required for Export
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-500">
                {(displayedContract.directness || '').length}/1000
              </span>
            </div>
          </div>
          <textarea
            id="contract-directness"
            rows={2}
            maxLength={1000}
            value={displayedContract.directness || ''}
            onChange={(e) => handleFieldChange('directness', e.target.value)}
            placeholder="e.g. Explicit mechanical reality; somatic degradation is observed rather than euphemized"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600 resize-none"
          />
        </div>

        {/* 3. Aftermath */}
        <div className="bg-black/40 border border-zinc-800/90 focus-within:border-zinc-700 p-3.5 rounded transition-colors">
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="contract-aftermath"
              className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold"
            >
              3. Aftermath & Consequence *
            </label>
            <div className="flex items-center gap-2">
              {!isAftermathValid && (
                <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                  Required for Export
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-500">
                {(displayedContract.aftermath || '').length}/1000
              </span>
            </div>
          </div>
          <textarea
            id="contract-aftermath"
            rows={2}
            maxLength={1000}
            value={displayedContract.aftermath || ''}
            onChange={(e) => handleFieldChange('aftermath', e.target.value)}
            placeholder="e.g. Irreversible somatic consequences; no cinematic reset or magical restoration"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600 resize-none"
          />
        </div>

        {/* 4. Ambiguity Handling */}
        <div className="bg-black/40 border border-zinc-800/90 focus-within:border-zinc-700 p-3.5 rounded transition-colors">
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="contract-ambiguity"
              className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold"
            >
              4. Ambiguity & Epistemic Limit *
            </label>
            <div className="flex items-center gap-2">
              {!isAmbiguityValid && (
                <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                  Required for Export
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-500">
                {(displayedContract.ambiguityHandling || '').length}/1000
              </span>
            </div>
          </div>
          <textarea
            id="contract-ambiguity"
            rows={2}
            maxLength={1000}
            value={displayedContract.ambiguityHandling || ''}
            onChange={(e) => handleFieldChange('ambiguityHandling', e.target.value)}
            placeholder="e.g. Preserve cognitive blind spots; system never reveals entity origin or motives"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600 resize-none"
          />
        </div>

        {/* 5. Special Boundaries (Optional) */}
        <div className="bg-black/40 border border-zinc-800/90 focus-within:border-zinc-700 p-3.5 rounded transition-colors">
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="contract-special-boundaries"
              className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-bold"
            >
              5. Special Boundaries & Prohibitions (Optional)
            </label>
            <span className="text-[10px] font-mono text-zinc-500">
              {(displayedContract.specialBoundaries || '').length}/1000
            </span>
          </div>
          <textarea
            id="contract-special-boundaries"
            rows={2}
            maxLength={1000}
            value={displayedContract.specialBoundaries || ''}
            onChange={(e) => handleFieldChange('specialBoundaries', e.target.value)}
            placeholder="e.g. Strict environmental containment; no deus ex machina rescue events"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600 resize-none"
          />
        </div>
      </div>
    </div>
  );
};
