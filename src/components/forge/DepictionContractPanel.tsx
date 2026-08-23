import React from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import { DepictionContract } from '../../types/forge';
import { ShieldAlert, CheckCircle2, AlertTriangle, Sparkles, Check, X } from 'lucide-react';

const isInvalidContractValue = (txt?: string) => {
  if (!txt) return true;
  const t = txt.trim().toLowerCase();
  return !t || t === 'unknown' || t === 'none' || t === 'n/a' || t === 'tbd';
};

export const DepictionContractPanel: React.FC = () => {
  const { draftBlueprint, pendingDepictionContractProposal, draftRevision } = useForgeState();
  const {
    updateDepictionContractField,
    applyPendingDepictionContractProposal,
    dismissPendingDepictionContractProposal,
  } = forgeActions;

  const contract: DepictionContract = draftBlueprint?.depictionContract || {
    dramaticRegister: '',
    directness: '',
    aftermath: '',
    ambiguityHandling: '',
    specialBoundaries: '',
  };

  const isDramaticValid = !isInvalidContractValue(contract.dramaticRegister);
  const isDirectnessValid = !isInvalidContractValue(contract.directness);
  const isAftermathValid = !isInvalidContractValue(contract.aftermath);
  const isAmbiguityValid = !isInvalidContractValue(contract.ambiguityHandling);
  const isContractComplete =
    isDramaticValid && isDirectnessValid && isAftermathValid && isAmbiguityValid;

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
            Rev #{draftRevision || 1}
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
        The Depiction Contract enforces explicit stylistic, mechanical, and sensory constraints on
        how the simulation engine frames horror, aftermath, and ambiguity. Required for blueprint
        compilation.
      </p>

      {/* Architect Proposal Isolated Banner */}
      {pendingDepictionContractProposal && (
        <div
          id="depiction-contract-proposal-banner"
          className="border border-cyan-800/80 bg-cyan-950/20 p-4 rounded space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                Architect Proposal: Depiction Parameters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="depiction-contract-accept-btn"
                onClick={() => applyPendingDepictionContractProposal()}
                className="flex items-center gap-1 px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 text-[11px] font-mono rounded font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Accept
              </button>
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

          {pendingDepictionContractProposal.rationale && (
            <p className="text-xs text-cyan-200/90 font-mono italic">
              &quot;{pendingDepictionContractProposal.rationale}&quot;
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300 pt-1">
            {pendingDepictionContractProposal.patch.dramaticRegister && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Dramatic Register:
                </span>
                {pendingDepictionContractProposal.patch.dramaticRegister}
              </div>
            )}
            {pendingDepictionContractProposal.patch.directness && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Directness:
                </span>
                {pendingDepictionContractProposal.patch.directness}
              </div>
            )}
            {pendingDepictionContractProposal.patch.aftermath && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Aftermath:
                </span>
                {pendingDepictionContractProposal.patch.aftermath}
              </div>
            )}
            {pendingDepictionContractProposal.patch.ambiguityHandling && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Ambiguity Handling:
                </span>
                {pendingDepictionContractProposal.patch.ambiguityHandling}
              </div>
            )}
            {pendingDepictionContractProposal.patch.specialBoundaries && (
              <div className="bg-black/50 p-2 rounded border border-cyan-950 col-span-full">
                <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                  Special Boundaries:
                </span>
                {pendingDepictionContractProposal.patch.specialBoundaries}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Fields Input Grid */}
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
            {!isDramaticValid && (
              <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                Required for Export
              </span>
            )}
          </div>
          <input
            id="contract-dramatic-register"
            type="text"
            value={contract.dramaticRegister || ''}
            onChange={(e) => updateDepictionContractField('dramaticRegister', e.target.value)}
            placeholder="e.g. Grounded clinical dread; objective observational detachment without melodrama"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
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
            {!isDirectnessValid && (
              <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                Required for Export
              </span>
            )}
          </div>
          <input
            id="contract-directness"
            type="text"
            value={contract.directness || ''}
            onChange={(e) => updateDepictionContractField('directness', e.target.value)}
            placeholder="e.g. Explicit mechanical reality; somatic degradation is observed rather than euphemized"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
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
            {!isAftermathValid && (
              <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                Required for Export
              </span>
            )}
          </div>
          <input
            id="contract-aftermath"
            type="text"
            value={contract.aftermath || ''}
            onChange={(e) => updateDepictionContractField('aftermath', e.target.value)}
            placeholder="e.g. Irreversible somatic consequences; no cinematic reset or magical restoration"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
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
            {!isAmbiguityValid && (
              <span className="text-amber-400 text-[10px] font-mono tracking-tight font-medium">
                Required for Export
              </span>
            )}
          </div>
          <input
            id="contract-ambiguity"
            type="text"
            value={contract.ambiguityHandling || ''}
            onChange={(e) => updateDepictionContractField('ambiguityHandling', e.target.value)}
            placeholder="e.g. Preserve cognitive blind spots; system never reveals entity origin or motives"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
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
          </div>
          <input
            id="contract-special-boundaries"
            type="text"
            value={contract.specialBoundaries || ''}
            onChange={(e) => updateDepictionContractField('specialBoundaries', e.target.value)}
            placeholder="e.g. Strict environmental containment; no deus ex machina rescue events"
            className="w-full bg-transparent text-zinc-200 font-mono text-xs focus:outline-none border-b border-zinc-800/80 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
          />
        </div>
      </div>
    </div>
  );
};
