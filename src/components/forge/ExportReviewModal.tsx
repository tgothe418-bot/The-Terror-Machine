import React, { useState } from 'react';
import { useForgeState } from '../../store/useForgeStore';
import { validateForgeExportReadiness, ForgeExportReadinessResult } from '../../lib/forgeReadiness';
import { prepareBlueprintExport, BlueprintExportArtifact } from '../../lib/compileBlueprintDraft';
import {
  FileCheck2,
  FileX2,
  Download,
  Copy,
  Check,
  X,
  ShieldAlert,
  Layers,
  MapPin,
  Users,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface ExportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReviewSnapshot {
  artifact: BlueprintExportArtifact | null;
  validation: ForgeExportReadinessResult;
  draftRevision: number;
  sourceBaselineRevision: number;
}

export const ExportReviewModal: React.FC<ExportReviewModalProps> = ({ isOpen, onClose }) => {
  const { draftBlueprint, draftRevision, sourceBaselineRevision, sourceAnalyses } = useForgeState();
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const currentDraftRev = draftRevision || 1;
  const currentBaseRev = sourceBaselineRevision || 1;

  // Single compilation helper invoked only at the capture / refresh boundary
  const executeCompilation = (
    draft: typeof draftBlueprint,
    dRev: number,
    bRev: number
  ): BlueprintExportArtifact | null => {
    if (!draft) return null;
    return prepareBlueprintExport(draft, {
      draftRevision: dRev,
      sourceBaselineRevision: bRev,
    });
  };

  // Lazy snapshot initialization: captures exact revision-bound state when opened
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(() => {
    if (!isOpen) return null;
    const readiness = validateForgeExportReadiness({
      draft: draftBlueprint,
      sourceAnalyses,
    });

    if (!readiness.valid || !draftBlueprint) {
      return {
        artifact: null,
        validation: readiness,
        draftRevision: currentDraftRev,
        sourceBaselineRevision: currentBaseRev,
      };
    }

    try {
      const artifact = executeCompilation(draftBlueprint, currentDraftRev, currentBaseRev);
      return {
        artifact,
        validation: readiness,
        draftRevision: currentDraftRev,
        sourceBaselineRevision: currentBaseRev,
      };
    } catch {
      return {
        artifact: null,
        validation: readiness,
        draftRevision: currentDraftRev,
        sourceBaselineRevision: currentBaseRev,
      };
    }
  });

  if (!isOpen) return null;

  const activeSnapshot = snapshot || {
    artifact: null,
    validation: validateForgeExportReadiness({
      draft: draftBlueprint,
      sourceAnalyses,
    }),
    draftRevision: currentDraftRev,
    sourceBaselineRevision: currentBaseRev,
  };

  const { artifact, validation, draftRevision: capturedDraftRev, sourceBaselineRevision: capturedBaseRev } =
    activeSnapshot;

  const isStale =
    !!artifact &&
    (capturedDraftRev !== currentDraftRev || capturedBaseRev !== currentBaseRev);

  const handleRefresh = () => {
    const freshReadiness = validateForgeExportReadiness({
      draft: draftBlueprint,
      sourceAnalyses,
    });

    if (!freshReadiness.valid || !draftBlueprint) {
      setExportError('Cannot refresh: Forge draft or baseline is not export ready.');
      return;
    }

    try {
      const newArtifact = executeCompilation(draftBlueprint, currentDraftRev, currentBaseRev);
      if (newArtifact) {
        setSnapshot({
          artifact: newArtifact,
          validation: freshReadiness,
          draftRevision: currentDraftRev,
          sourceBaselineRevision: currentBaseRev,
        });
        setExportError(null);
      }
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Refresh compilation failed.');
    }
  };

  const handleDownload = () => {
    if (!artifact || isStale) return;
    try {
      setExportError(null);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(artifact.json);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', artifact.fileName);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e: unknown) {
      const error = e as { errors?: unknown; message?: string };
      if (error.errors) {
        setExportError(JSON.stringify(error.errors, null, 2));
      } else {
        setExportError(error.message || String(error));
      }
    }
  };

  const handleCopyJson = async () => {
    if (!artifact || isStale) return;
    try {
      await navigator.clipboard.writeText(artifact.json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const displayBlueprint = artifact?.blueprint || draftBlueprint;
  const effectiveTitle = displayBlueprint?.identity?.title || displayBlueprint?.title || '';
  const effectivePremise = displayBlueprint?.globalPremise || displayBlueprint?.premise || '';
  const effectiveLocation = displayBlueprint?.setting?.location || '';
  const castCount = displayBlueprint?.cast?.length || 0;
  const topologyNodeCount =
    displayBlueprint?.topology?.nodes?.length || Object.keys(displayBlueprint?.topology || {}).length;
  const contract = displayBlueprint?.depictionContract;
  const ambiguitiesCount = displayBlueprint?.ambiguities?.length || 0;
  const sourceSummary = validation.sourceSummary;

  return (
    <div
      id="export-review-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="export-review-modal-content"
        className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded border ${
                validation.valid
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400'
                  : 'bg-red-950/40 border-red-800/80 text-red-400'
              }`}
            >
              {validation.valid ? (
                <FileCheck2 className="w-5 h-5" />
              ) : (
                <FileX2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-100 flex items-center gap-2">
                Blueprint Export Pre-Flight Review
              </h2>
              <p className="text-[11px] text-zinc-500">
                Snapshot: Draft r{capturedDraftRev} / Base r{capturedBaseRev}
              </p>
            </div>
          </div>
          <button
            id="export-review-close-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-xs">
          {/* Stale Snapshot Notice */}
          {isStale && (
            <div
              id="export-review-stale-notice"
              className="border border-amber-800/80 bg-amber-950/30 p-4 rounded flex items-center justify-between gap-3 text-amber-200"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wider block text-amber-300">
                    Review Snapshot Is Stale
                  </span>
                  <span className="text-[11px] text-amber-300/90 block">
                    Captured draft r{capturedDraftRev} / base r{capturedBaseRev} vs current draft r
                    {currentDraftRev} / base r{currentBaseRev}.
                  </span>
                </div>
              </div>
              <button
                id="export-review-refresh-btn"
                onClick={handleRefresh}
                className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700 font-bold uppercase text-[10px] rounded tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Review</span>
              </button>
            </div>
          )}

          {/* Validation Status Banner */}
          {validation.valid ? (
            <div className="border border-emerald-800/60 bg-emerald-950/20 p-4 rounded flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300 uppercase tracking-wider block">
                    All Pre-Flight Contracts Satisfied
                  </span>
                  <span className="text-[11px] text-emerald-400/80">
                    Draft is normalized, valid, and ready for immutable engine compilation.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-900/60 text-emerald-200 border border-emerald-700 font-bold uppercase text-[10px] rounded tracking-wider">
                COMPLIANT
              </span>
            </div>
          ) : (
            <div className="border border-red-900/80 bg-red-950/20 p-4 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
                  <FileX2 className="w-4 h-4" />
                  <span>Validation Discrepancies Found ({Object.keys(validation.errors).length})</span>
                </div>
                <span className="px-2 py-0.5 bg-red-900/50 text-red-300 border border-red-800 font-bold uppercase text-[10px] rounded tracking-wider">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-[11px] text-red-300/80">
                The compilation pipeline requires all structural and Depiction Contract fields to be
                authored before export.
              </p>
              <div className="bg-black/60 border border-red-950 p-3 rounded space-y-1.5 mt-2">
                {Object.entries(validation.errors).map(([field, msgs]) => (
                  <div key={field} className="text-[11px] text-red-400">
                    <span className="font-bold text-red-300 uppercase tracking-wide">
                      {field}:
                    </span>{' '}
                    {msgs.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Baseline Readiness Totals Section */}
          <div className="space-y-3" id="export-readiness-totals-section">
            <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-[11px] border-b border-zinc-800/80 pb-1.5 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Source Baseline Readiness Summary</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Intake Sources
                </span>
                <span className="font-bold text-zinc-200 text-sm">
                  {sourceSummary.sourceCount} {sourceSummary.sourceCount === 1 ? 'source' : 'sources'}
                </span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Candidate Ledger
                </span>
                <span className="font-bold text-zinc-200 block text-xs">
                  Total: {sourceSummary.candidateTotal}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Applied: {sourceSummary.candidateApplied} · Staged: {sourceSummary.candidateStagedAccepted} · Rejected: {sourceSummary.candidateRejected}
                </span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Ambiguity Ledger
                </span>
                <span className="font-bold text-zinc-200 block text-xs">
                  Total: {sourceSummary.unknownTotal}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Resolved: {sourceSummary.unknownResolved} · Contextual: {sourceSummary.unknownContextual} · Open: {sourceSummary.unknownOpen}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Core Parameters Checklist */}
          <div className="space-y-3">
            <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-[11px] border-b border-zinc-800/80 pb-1.5 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Core Scenario Parameters</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Scenario Title
                </span>
                <span className="font-bold text-zinc-200 block">
                  {effectiveTitle || (
                    <span className="text-amber-500 italic">Missing Title</span>
                  )}
                </span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Starting Location
                </span>
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {effectiveLocation || (
                    <span className="text-amber-500 italic">Missing Location</span>
                  )}
                </span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Coordinates (Vector / Tier)
                </span>
                <span className="font-bold text-cyan-400">
                  {displayBlueprint?.startingVector || 'SOMATIC'} //{' '}
                  {displayBlueprint?.startingTier || 'GATEWAY'}
                </span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Cast & Spatial Manifest
                </span>
                <span className="font-bold text-zinc-200 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-500" />
                    {castCount} {castCount === 1 ? 'member' : 'members'}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span>{topologyNodeCount} spatial nodes</span>
                </span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded sm:col-span-2">
                <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                  Scenario Premise
                </span>
                <p className="font-normal text-zinc-300 line-clamp-2 leading-relaxed">
                  {effectivePremise || (
                    <span className="text-amber-500 italic">Missing Premise</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Depiction Contract Review */}
          <div className="space-y-3">
            <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-[11px] border-b border-zinc-800/80 pb-1.5 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Depiction Contract Parameters</span>
            </h3>
            <div className="space-y-2">
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">
                    1. Dramatic Register
                  </span>
                  {contract?.dramaticRegister ? (
                    <span className="text-emerald-400 text-[10px]">AUTHORED</span>
                  ) : (
                    <span className="text-red-400 text-[10px]">MISSING</span>
                  )}
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {contract?.dramaticRegister || (
                    <span className="text-zinc-600 italic">None specified</span>
                  )}
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">
                    2. Directness & Visceral Focus
                  </span>
                  {contract?.directness ? (
                    <span className="text-emerald-400 text-[10px]">AUTHORED</span>
                  ) : (
                    <span className="text-red-400 text-[10px]">MISSING</span>
                  )}
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {contract?.directness || (
                    <span className="text-zinc-600 italic">None specified</span>
                  )}
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">
                    3. Aftermath & Consequence
                  </span>
                  {contract?.aftermath ? (
                    <span className="text-emerald-400 text-[10px]">AUTHORED</span>
                  ) : (
                    <span className="text-red-400 text-[10px]">MISSING</span>
                  )}
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {contract?.aftermath || (
                    <span className="text-zinc-600 italic">None specified</span>
                  )}
                </p>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">
                    4. Ambiguity & Epistemic Limit
                  </span>
                  {contract?.ambiguityHandling ? (
                    <span className="text-emerald-400 text-[10px]">AUTHORED</span>
                  ) : (
                    <span className="text-red-400 text-[10px]">MISSING</span>
                  )}
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {contract?.ambiguityHandling || (
                    <span className="text-zinc-600 italic">None specified</span>
                  )}
                </p>
              </div>

              {contract?.specialBoundaries && (
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold block mb-1">
                    5. Special Boundaries (Optional)
                  </span>
                  <p className="text-zinc-300 leading-relaxed">{contract.specialBoundaries}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Ambiguities & Discretion Manifest */}
          {ambiguitiesCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-[11px] border-b border-zinc-800/80 pb-1.5 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ambiguity Decisions ({ambiguitiesCount})</span>
              </h3>
              <div className="space-y-2">
                {displayBlueprint?.ambiguities?.map((amb) => (
                  <div key={amb.id} className="bg-zinc-900/30 border border-zinc-800/70 p-3 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">
                        {amb.category}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          amb.resolutionMode === 'USER_DEFINED'
                            ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {amb.resolutionMode}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] font-medium mb-1">{amb.question}</p>
                    <p className="text-zinc-400 text-[11px] italic">
                      {amb.resolutionMode === 'USER_DEFINED'
                        ? amb.resolution
                        : amb.guidance || 'Contextual discretion enabled.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exportError && (
            <div className="bg-red-950/80 border border-red-900 p-4 rounded text-red-300 text-xs">
              <span className="font-bold block uppercase mb-1">Export Generation Error:</span>
              <pre className="whitespace-pre-wrap">{exportError}</pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <button
            id="export-review-cancel-btn"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs uppercase tracking-wider rounded font-bold transition-colors cursor-pointer"
          >
            Cancel / Edit Draft
          </button>
          <div className="flex items-center gap-3">
            <button
              id="export-review-copy-json-btn"
              disabled={!validation.valid || isStale || !artifact}
              onClick={handleCopyJson}
              className={`flex items-center gap-1.5 px-3 py-2 border text-xs uppercase tracking-wider rounded font-bold transition-colors ${
                validation.valid && !isStale && !!artifact
                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-cyan-300 cursor-pointer'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
            <button
              id="export-review-download-btn"
              disabled={!validation.valid || isStale || !artifact}
              onClick={handleDownload}
              className={`flex items-center gap-2 px-5 py-2 border text-xs uppercase tracking-widest rounded font-bold transition-all shadow-md ${
                validation.valid && !isStale && !!artifact
                  ? 'bg-cyan-950 hover:bg-cyan-900 border-cyan-600 text-cyan-200 hover:text-white cursor-pointer shadow-cyan-950/50'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Download Blueprint (.json)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
