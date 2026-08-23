import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import {
  ForgeSourceAnalysis,
  ForgeSourceAnalysisSchema,
  ForgeSourceCandidate,
} from '../../types/forge';
import {
  FileText,
  Check,
  Edit2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  FileCode,
  Layers,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';

export const ScenarioBaselinePanel: React.FC = () => {
  const sourceAnalyses = useForgeState((state) => state.sourceAnalyses || {});

  const {
    setCandidateReviewDecision,
    editStagedCandidate,
    applyAcceptedCandidates,
    removeSourceAnalysis,
  } = forgeActions;

  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState<string>('');
  const [applicationError, setApplicationError] = useState<{ sourceId: string; message: string } | null>(null);

  const rawEntries = Object.entries(sourceAnalyses);
  const validAnalyses: ForgeSourceAnalysis[] = [];
  const invalidKeys: string[] = [];

  for (const [key, raw] of rawEntries) {
    const parse = ForgeSourceAnalysisSchema.safeParse(raw);
    if (parse.success) {
      validAnalyses.push(parse.data);
    } else {
      invalidKeys.push(key);
    }
  }

  if (validAnalyses.length === 0 && invalidKeys.length === 0) {
    return null;
  }

  const toggleSourceExpand = (sourceId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [sourceId]: prev[sourceId] === undefined ? false : !prev[sourceId],
    }));
  };

  const isExpanded = (sourceId: string) => {
    return expandedSources[sourceId] !== false;
  };

  const startEditCandidate = (cand: ForgeSourceCandidate) => {
    setEditingCandidateId(cand.id);
    if (typeof cand.proposedValue === 'object') {
      setEditingValueText(JSON.stringify(cand.proposedValue, null, 2));
    } else {
      setEditingValueText(String(cand.proposedValue ?? ''));
    }
  };

  const saveCandidateEdit = (sourceId: string, cand: ForgeSourceCandidate) => {
    let parsed: unknown = editingValueText;
    if (typeof cand.proposedValue === 'object' && cand.proposedValue !== null) {
      try {
        parsed = JSON.parse(editingValueText);
      } catch {
        parsed = editingValueText;
      }
    }
    editStagedCandidate(sourceId, cand.id, parsed);
    setEditingCandidateId(null);
    setEditingValueText('');
  };

  const handleApplyAllAccepted = (sourceId: string) => {
    setApplicationError(null);
    try {
      const result = applyAcceptedCandidates(sourceId);
      if (!result.success) {
        const errorMessages = Object.values(result.errors).join('; ');
        setApplicationError({
          sourceId,
          message: errorMessages || 'Failed to apply accepted candidates.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply accepted candidates.';
      setApplicationError({
        sourceId,
        message: msg,
      });
    }
  };

  const handleResolveInArchitect = () => {
    const architectInput = document.getElementById('architect-input');
    if (architectInput) {
      architectInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      architectInput.focus();
    }
  };

  return (
    <div
      id="scenario-baseline-panel"
      className="bg-zinc-950 border border-zinc-800 rounded flex flex-col p-5 shadow-lg space-y-5"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-zinc-200 font-mono text-xs uppercase tracking-widest font-bold">
            SOURCE BASELINE // SCENARIO INTAKE
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded">
            {validAnalyses.length} {validAnalyses.length === 1 ? 'Source' : 'Sources'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Independent Review · Draft Untouched Until Accepted & Applied
        </span>
      </div>

      {/* RECOVERY NOTICE FOR INVALID PERSISTED ENTRIES */}
      {invalidKeys.length > 0 && (
        <div
          id="source-baseline-recovery-notice"
          className="bg-amber-950/30 border border-amber-800/60 p-3 rounded flex items-center justify-between gap-3 text-xs font-mono text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Found {invalidKeys.length} legacy or malformed source intake{' '}
              {invalidKeys.length === 1 ? 'entry' : 'entries'}.
            </span>
          </div>
          <button
            id="dismiss-invalid-source-analyses-btn"
            onClick={() => {
              invalidKeys.forEach((k) => removeSourceAnalysis(k));
            }}
            className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer shrink-0"
          >
            Dismiss Invalid Entries
          </button>
        </div>
      )}

      {/* VALID ANALYSES CARDS */}
      {validAnalyses.length > 0 && (
        <div className="space-y-6">
          {validAnalyses.map((analysis) => {
            const expanded = isExpanded(analysis.id);

            // Metrics
            const stagedAccepted = analysis.candidates.filter(
              (c) => c.applicationState === 'staged' && c.reviewDecision === 'accepted'
            );
            const appliedCandidates = analysis.candidates.filter(
              (c) => c.applicationState === 'applied'
            );
            const rejectedCandidates = analysis.candidates.filter(
              (c) => c.reviewDecision === 'rejected'
            );

            // Unknowns metrics
            const totalUnknowns = analysis.unknowns?.length || 0;
            const openUnknowns = (analysis.unknowns || []).filter(
              (u) => u.status === 'queued' || u.status === 'awaiting_response' || u.status === 'awaiting_confirmation'
            ).length;
            const resolvedUnknowns = (analysis.unknowns || []).filter(
              (u) => u.status === 'resolved' || u.status === 'contextual_discretion'
            ).length;

            return (
              <div
                key={analysis.id}
                id={`source-card-${analysis.id}`}
                className="border border-zinc-800 bg-black/60 rounded overflow-hidden transition-colors shadow-sm"
              >
                {/* SOURCE HEADER */}
                <div className="p-3.5 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between gap-3">
                  <div
                    onClick={() => toggleSourceExpand(analysis.id)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <button
                      type="button"
                      aria-label={expanded ? 'Collapse source' : 'Expand source'}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      {expanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {analysis.sourceRecord.kind === 'native_blueprint' ? (
                      <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-xs text-zinc-200 font-bold truncate">
                        {analysis.sourceRecord.fileName}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {analysis.sourceRecord.kind === 'native_blueprint'
                          ? 'Native Blueprint'
                          : 'Document Reference'}
                        {analysis.sourceRecord.fileSizeBytes &&
                          ` · ${(analysis.sourceRecord.fileSizeBytes / 1024).toFixed(1)} KB`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status counts */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      {stagedAccepted.length > 0 && (
                        <span className="px-2 py-0.5 bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 rounded font-semibold">
                          {stagedAccepted.length} staged to apply
                        </span>
                      )}
                      {appliedCandidates.length > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded">
                          {appliedCandidates.length} applied
                        </span>
                      )}
                      {rejectedCandidates.length > 0 && (
                        <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded">
                          {rejectedCandidates.length} rejected
                        </span>
                      )}
                      {totalUnknowns > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            openUnknowns > 0
                              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {resolvedUnknowns}/{totalUnknowns} ambiguities
                        </span>
                      )}
                    </div>

                    {/* Batch Apply Button */}
                    {stagedAccepted.length > 0 && (
                      <button
                        id={`batch-apply-btn-${analysis.id}`}
                        onClick={() => handleApplyAllAccepted(analysis.id)}
                        className="px-2.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-black text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                        title="Commit all accepted candidate proposals to the Forge draft blueprint"
                      >
                        <Check className="w-3 h-3" />
                        Apply Accepted ({stagedAccepted.length})
                      </button>
                    )}

                    <button
                      onClick={() => removeSourceAnalysis(analysis.id)}
                      className="text-zinc-500 hover:text-red-400 px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-transparent hover:border-red-900/50 hover:bg-red-950/20 transition-colors"
                      title="Dismiss this source analysis"
                    >
                      [Dismiss]
                    </button>
                  </div>
                </div>

                {/* ERROR BANNER IF APPLICATION FAILED */}
                {applicationError && applicationError.sourceId === analysis.id && (
                  <div className="p-3 bg-red-950/40 border-b border-red-900/60 text-red-200 text-xs font-mono flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{applicationError.message}</span>
                    </div>
                    <button
                      onClick={() => setApplicationError(null)}
                      className="text-red-400 hover:text-red-200 text-[10px] uppercase font-bold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {expanded && (
                  <div className="p-4 space-y-5">
                    {/* EXTRACTION SUMMARY */}
                    {analysis.summary && (
                      <div className="text-xs font-mono text-zinc-400 bg-zinc-950/70 p-3 rounded border border-zinc-900 leading-relaxed">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-1 tracking-wider">
                          Extraction Summary
                        </span>
                        {analysis.summary}
                      </div>
                    )}

                    {/* CANDIDATES LIST */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2">
                          <span>Extracted Candidate Proposals</span>
                          <span className="text-[10px] text-zinc-500">
                            ({analysis.candidates.length} total)
                          </span>
                        </span>
                        {stagedAccepted.length > 0 && (
                          <span className="text-[10px] font-mono text-cyan-400">
                            {stagedAccepted.length} staged for blueprint draft
                          </span>
                        )}
                      </div>

                      {analysis.candidates.map((cand) => {
                        const isEditing = editingCandidateId === cand.id;
                        const isApplied = cand.applicationState === 'applied';
                        const isRejected = cand.reviewDecision === 'rejected';

                        // Find associated evidence claim
                        const evidenceItems = analysis.evidence.filter((e) =>
                          cand.evidenceIds?.includes(e.id)
                        );

                        return (
                          <div
                            key={cand.id}
                            id={`candidate-row-${cand.id}`}
                            className={`p-3.5 rounded border font-mono text-xs transition-colors space-y-2.5 ${
                              isApplied
                                ? 'bg-emerald-950/15 border-emerald-900/40 text-zinc-300'
                                : isRejected
                                ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600'
                                : 'bg-zinc-900/30 border-zinc-800/90 text-zinc-200'
                            }`}
                          >
                            {/* Candidate Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                    {cand.target}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                                      cand.classification === 'evidence'
                                        ? 'bg-blue-950/50 border-blue-800/60 text-blue-300'
                                        : 'bg-purple-950/50 border-purple-800/60 text-purple-300'
                                    }`}
                                  >
                                    {cand.classification}
                                  </span>

                                  {/* Review Status Badge */}
                                  {cand.reviewDecision === 'accepted' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-emerald-950/50 border border-emerald-800/60 text-emerald-300">
                                      Accepted
                                    </span>
                                  )}
                                  {cand.reviewDecision === 'rejected' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-red-950/50 border border-red-800/60 text-red-300">
                                      Rejected
                                    </span>
                                  )}
                                  {cand.reviewDecision === 'pending' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-amber-950/50 border border-amber-800/60 text-amber-300">
                                      Pending Review
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-zinc-100">{cand.label}</div>
                                {cand.explanation && (
                                  <div className="text-[11px] text-zinc-400">
                                    {cand.explanation}
                                  </div>
                                )}
                              </div>

                              {/* Review Action Controls */}
                              {!isApplied && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() =>
                                      setCandidateReviewDecision(
                                        analysis.id,
                                        cand.id,
                                        cand.reviewDecision === 'accepted' ? 'pending' : 'accepted'
                                      )
                                    }
                                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded border transition-colors cursor-pointer ${
                                      cand.reviewDecision === 'accepted'
                                        ? 'bg-emerald-900/60 border-emerald-700 text-emerald-200'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-emerald-300 hover:border-emerald-800'
                                    }`}
                                  >
                                    {cand.reviewDecision === 'accepted' ? '✓ Accepted' : 'Accept'}
                                  </button>

                                  <button
                                    onClick={() =>
                                      setCandidateReviewDecision(
                                        analysis.id,
                                        cand.id,
                                        cand.reviewDecision === 'rejected' ? 'pending' : 'rejected'
                                      )
                                    }
                                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded border transition-colors cursor-pointer ${
                                      cand.reviewDecision === 'rejected'
                                        ? 'bg-red-900/60 border-red-700 text-red-200'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-red-300 hover:border-red-800'
                                    }`}
                                  >
                                    {cand.reviewDecision === 'rejected' ? '✗ Rejected' : 'Reject'}
                                  </button>

                                  {!isEditing && (
                                    <button
                                      onClick={() => startEditCandidate(cand)}
                                      className="p-1 text-zinc-400 hover:text-cyan-300 rounded hover:bg-zinc-800 transition-colors"
                                      title="Edit proposed value"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Proposed Value Display / Editor */}
                            {isEditing ? (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  value={editingValueText}
                                  onChange={(e) => setEditingValueText(e.target.value)}
                                  className="w-full bg-zinc-950 border border-cyan-500/70 p-2 text-xs text-zinc-200 rounded font-mono focus:outline-none min-h-[60px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingCandidateId(null)}
                                    className="px-2.5 py-1 text-[10px] uppercase text-zinc-400 hover:text-white rounded border border-zinc-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveCandidateEdit(analysis.id, cand)}
                                    className="px-3 py-1 text-[10px] uppercase font-bold bg-cyan-400 text-black rounded hover:bg-cyan-300"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-900 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                                <span className="text-zinc-500 block text-[9px] uppercase font-bold mb-1">
                                  Proposed Payload:
                                </span>
                                {typeof cand.proposedValue === 'object' ? (
                                  <pre className="text-[11px] text-cyan-200/90 whitespace-pre-wrap">
                                    {JSON.stringify(cand.proposedValue, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="text-zinc-200">{String(cand.proposedValue)}</div>
                                )}
                              </div>
                            )}

                            {/* Evidence Excerpts */}
                            {evidenceItems.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {evidenceItems.map((ev) => (
                                  <div
                                    key={ev.id}
                                    className="text-[10px] text-zinc-500 italic flex items-start gap-1"
                                  >
                                    <span className="text-zinc-600 not-italic font-bold shrink-0">
                                      ↳ Source Evidence:
                                    </span>{' '}
                                    <span>"{ev.excerpt || ev.claim}"</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* UNKNOWNS / AMBIGUITY REVIEW LEDGER */}
                    {analysis.unknowns && analysis.unknowns.length > 0 && (
                      <div className="bg-zinc-950/80 border border-amber-900/40 rounded p-4 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-amber-900/30 pb-2.5">
                          <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>Identified Gaps & Ambiguities ({analysis.unknowns.length})</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Compact Review Ledger · Conversational Ownership in Architect
                          </span>
                        </div>

                        <div className="space-y-3">
                          {analysis.unknowns.map((unk) => {
                            const isQueued = unk.status === 'queued';
                            const isAwaitingResponse = unk.status === 'awaiting_response';
                            const isAwaitingConfirmation = unk.status === 'awaiting_confirmation';
                            const isResolved = unk.status === 'resolved';
                            const isDiscretion = unk.status === 'contextual_discretion';
                            const isNonterminal = !isResolved && !isDiscretion;

                            return (
                              <div
                                key={unk.id}
                                id={`unknown-card-${unk.id}`}
                                className={`p-3.5 rounded border font-mono text-xs space-y-2.5 transition-colors ${
                                  isResolved
                                    ? 'bg-emerald-950/15 border-emerald-900/40 text-zinc-300'
                                    : isDiscretion
                                    ? 'bg-indigo-950/20 border-indigo-900/40 text-zinc-300'
                                    : isAwaitingConfirmation
                                    ? 'bg-purple-950/20 border-purple-900/50 text-zinc-200'
                                    : 'bg-black/60 border-zinc-800 text-zinc-200'
                                }`}
                              >
                                {/* UNKNOWN HEADER & BADGES */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-amber-950/50 border border-amber-800/60 text-amber-300">
                                        [{unk.category}]
                                      </span>

                                      {/* Status Badge */}
                                      {isQueued && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-amber-900/30 border border-amber-700/50 text-amber-200">
                                          Pending Clarification
                                        </span>
                                      )}
                                      {isAwaitingResponse && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-blue-950/50 border border-blue-800/60 text-blue-300">
                                          Awaiting Follow-up
                                        </span>
                                      )}
                                      {isAwaitingConfirmation && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-purple-950/50 border border-purple-800/60 text-purple-300 flex items-center gap-1">
                                          <Sparkles className="w-3 h-3 text-purple-400" />
                                          Resolution Ready
                                        </span>
                                      )}
                                      {isResolved && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                          Resolved (Committed)
                                        </span>
                                      )}
                                      {isDiscretion && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 flex items-center gap-1">
                                          <ShieldCheck className="w-3 h-3 text-indigo-400" />
                                          Contextual Discretion
                                        </span>
                                      )}
                                    </div>

                                    {/* Question */}
                                    <p className="text-zinc-100 font-semibold text-xs leading-relaxed pt-1">
                                      {unk.question}
                                    </p>
                                  </div>

                                  {/* Resolve in Architect button for nonterminal items */}
                                  {isNonterminal && (
                                    <button
                                      onClick={handleResolveInArchitect}
                                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-[10px] uppercase font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                                      title="Open Architect conversation to clarify or resolve this ambiguity"
                                    >
                                      <span>Resolve in Architect</span>
                                      <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {/* TARGET EFFECT */}
                                <div className="text-[11px] text-zinc-400 bg-zinc-950/70 p-2 rounded border border-zinc-900 flex items-start gap-1.5">
                                  <span className="text-amber-500/90 font-bold uppercase text-[10px] shrink-0">
                                    Target Effect:
                                  </span>
                                  <span>{unk.targetEffect}</span>
                                </div>

                                {/* COMPACT SUMMARY OF SUBMITTED ANSWER OR ACCEPTED RESOLUTION */}
                                {isResolved && (
                                  <div className="text-[11px] text-emerald-300/90 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded leading-relaxed">
                                    <span className="font-bold text-emerald-400 block text-[10px] uppercase mb-0.5">
                                      Committed Resolution:
                                    </span>
                                    {unk.resolutionProposal?.resolution ||
                                      unk.submittedAnswer ||
                                      'Committed to Blueprint draft.'}
                                  </div>
                                )}

                                {isDiscretion && (
                                  <div className="text-[11px] text-indigo-300/90 bg-indigo-950/30 border border-indigo-900/50 p-2 rounded leading-relaxed">
                                    <span className="font-bold text-indigo-400 block text-[10px] uppercase mb-0.5">
                                      Discretion Policy:
                                    </span>
                                    Delegated to engine narrative and environmental discretion during simulation runtime.
                                  </div>
                                )}

                                {isAwaitingConfirmation && unk.resolutionProposal && (
                                  <div className="text-[11px] text-purple-300/90 bg-purple-950/20 border border-purple-900/40 p-2 rounded leading-relaxed">
                                    <span className="font-bold text-purple-400 block text-[10px] uppercase mb-0.5">
                                      Proposed Resolution:
                                    </span>
                                    {unk.resolutionProposal.resolution}
                                  </div>
                                )}

                                {!isResolved && !isDiscretion && !isAwaitingConfirmation && unk.submittedAnswer && (
                                  <div className="text-[11px] text-cyan-300/90 bg-cyan-950/20 border border-cyan-900/40 p-2 rounded leading-relaxed">
                                    <span className="font-bold text-cyan-400 block text-[10px] uppercase mb-0.5">
                                      Submitted Clarification:
                                    </span>
                                    {unk.submittedAnswer}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
