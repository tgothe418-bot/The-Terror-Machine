import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import {
  ForgeSourceAnalysis,
  ForgeSourceAnalysisSchema,
  ForgeSourceCandidate,
  ForgeSourceUnknown,
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
  Send,
  Sparkles,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export const ScenarioBaselinePanel: React.FC = () => {
  const sourceAnalyses = useForgeState((state) => state.sourceAnalyses || {});
  const draft = useForgeState((state) => state.draftBlueprint);
  const draftRevision = useForgeState((state) => state.draftRevision);
  const architectMessages = useForgeState((state) => state.architectMessages || []);

  const {
    setCandidateReviewDecision,
    editStagedCandidate,
    applyAcceptedCandidates,
    acceptCandidate,
    removeSourceAnalysis,
    submitUnknownAnswer,
    receiveUnknownFollowUp,
    receiveUnknownProposal,
    acceptUnknownResolution,
    editUnknownProposal,
    leaveUnknownUncertain,
    setUnknownError,
    retryUnknown,
  } = forgeActions;

  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState<string>('');
  
  // Ambiguity resolution state
  const [unknownAnswers, setUnknownAnswers] = useState<Record<string, string>>({});
  const [isSubmittingUnknown, setIsSubmittingUnknown] = useState<Record<string, boolean>>({});
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editedProposalResolution, setEditedProposalResolution] = useState<string>('');
  const [editedProposalEffect, setEditedProposalEffect] = useState<string>('');
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
      applyAcceptedCandidates(sourceId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply accepted candidates.';
      setApplicationError({
        sourceId,
        message: msg,
      });
    }
  };

  const handleUnknownAnswerChange = (unknownId: string, value: string) => {
    setUnknownAnswers((prev) => ({ ...prev, [unknownId]: value }));
  };

  const handleSubmitAnswer = async (sourceId: string, unknownId: string) => {
    const answer = unknownAnswers[unknownId]?.trim();
    if (!answer) return;

    const analysis = sourceAnalyses[sourceId];
    const unk = analysis?.unknowns?.find((u) => u.id === unknownId);
    if (!unk) return;

    submitUnknownAnswer(sourceId, unknownId, answer);
    setUnknownAnswers((prev) => {
      const next = { ...prev };
      delete next[unknownId];
      return next;
    });

    setIsSubmittingUnknown((prev) => ({ ...prev, [unknownId]: true }));

    try {
      const response = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'AMBIGUITY_RESOLUTION',
          userMessage: answer,
          activeUnknown: {
            sourceId,
            unknownId: unk.id,
            category: unk.category,
            question: unk.question,
            targetEffect: unk.targetEffect,
            submittedAnswer: answer,
            followUps: unk.followUps || [],
          },
          draftContext: {
            title: draft?.identity?.title || draft?.title || '',
            premise: draft?.globalPremise || draft?.premise || '',
            setting: draft?.setting || {},
            cast: draft?.cast || [],
            environmentalRules: draft?.environmentalRules || [],
            draftRevision: draftRevision || 1,
          },
          history: (architectMessages || []).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Architect request failed with status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.type === 'FOLLOW_UP') {
        receiveUnknownFollowUp(sourceId, unknownId, resData.followUpQuestion || resData.message);
      } else if (resData.type === 'RESOLUTION_PROPOSAL' && resData.proposal) {
        receiveUnknownProposal(sourceId, unknownId, resData.proposal);
      } else {
        receiveUnknownProposal(sourceId, unknownId, {
          resolution: answer,
          targetEffect: unk.targetEffect,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Architect resolution failed.';
      setUnknownError(sourceId, unknownId, msg);
    } finally {
      setIsSubmittingUnknown((prev) => ({ ...prev, [unknownId]: false }));
    }
  };

  const startEditProposal = (unk: ForgeSourceUnknown) => {
    setEditingProposalId(unk.id);
    setEditedProposalResolution(unk.resolutionProposal?.resolution || '');
    setEditedProposalEffect(unk.resolutionProposal?.targetEffect || unk.targetEffect || '');
  };

  const saveProposalEdit = (sourceId: string, unknownId: string) => {
    if (!editedProposalResolution.trim()) return;
    editUnknownProposal(sourceId, unknownId, {
      resolution: editedProposalResolution.trim(),
      targetEffect: editedProposalEffect.trim() || 'Customized creator resolution',
    });
    setEditingProposalId(null);
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
                      className="text-red-400 hover:text-red-200 text-[10px] uppercase font-bold"
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
                        const isAccepted = cand.reviewDecision === 'accepted';
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
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider border font-bold ${
                                    cand.classification === 'evidence'
                                      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                                      : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                                  }`}
                                >
                                  {cand.classification}
                                </span>
                                <span className="font-bold text-zinc-100">{cand.label}</span>
                                <span className="text-[10px] text-zinc-500 uppercase">
                                  [{cand.target.replace(/_/g, ' ')}]
                                </span>
                              </div>

                              {/* Candidate Decision & Application Controls */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isApplied ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Applied to Draft
                                  </span>
                                ) : (
                                  <>
                                    {!isEditing && (
                                      <button
                                        onClick={() => startEditCandidate(cand)}
                                        className="p-1 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded cursor-pointer"
                                        title="Edit candidate proposed value before applying"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}

                                    {/* Reject / Accept Decision Toggles */}
                                    <button
                                      onClick={() =>
                                        setCandidateReviewDecision(
                                          analysis.id,
                                          cand.id,
                                          isRejected ? 'accepted' : 'rejected'
                                        )
                                      }
                                      className={`px-2 py-1 text-[10px] rounded uppercase font-bold cursor-pointer transition-colors border ${
                                        isRejected
                                          ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/60'
                                      }`}
                                    >
                                      {isRejected ? 'Un-Reject' : 'Reject'}
                                    </button>

                                    {isAccepted && !isEditing && (
                                      <button
                                        onClick={() => acceptCandidate(analysis.id, cand.id)}
                                        className="px-2.5 py-1 text-[10px] text-black bg-cyan-400 hover:bg-cyan-300 rounded uppercase font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                                        title="Apply this single proposal to the Forge draft blueprint"
                                      >
                                        <Check className="w-3 h-3" />
                                        Apply
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Candidate Explanation */}
                            {cand.explanation && (
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                {cand.explanation}
                              </p>
                            )}

                            {/* Inline Edit Form OR Value Preview */}
                            {isEditing ? (
                              <div className="space-y-2 pt-2 border-t border-zinc-800">
                                <label className="text-[10px] uppercase font-bold text-cyan-400 block">
                                  Edit Proposed Candidate Value:
                                </label>
                                <textarea
                                  value={editingValueText}
                                  onChange={(e) => setEditingValueText(e.target.value)}
                                  className="w-full bg-zinc-950 border border-cyan-500/60 p-2 text-xs font-mono text-zinc-200 rounded focus:outline-none min-h-[80px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingCandidateId(null)}
                                    className="px-2 py-1 text-[10px] uppercase text-zinc-400 hover:text-white rounded border border-zinc-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveCandidateEdit(analysis.id, cand)}
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold bg-cyan-500 text-black rounded hover:bg-cyan-400"
                                  >
                                    Save Value
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-black/80 rounded p-2.5 border border-zinc-900 text-zinc-300 text-[11px] overflow-x-auto max-h-36">
                                {typeof cand.proposedValue === 'object' ? (
                                  <pre className="whitespace-pre-wrap font-mono">
                                    {JSON.stringify(cand.proposedValue, null, 2)}
                                  </pre>
                                ) : (
                                  <span>{String(cand.proposedValue)}</span>
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

                    {/* UNKNOWNS / AMBIGUITY RESOLUTION WORKFLOW */}
                    {analysis.unknowns && analysis.unknowns.length > 0 && (
                      <div className="bg-zinc-950/80 border border-amber-900/40 rounded p-4 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-amber-900/30 pb-2.5">
                          <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>Identified Gaps & Ambiguities ({analysis.unknowns.length})</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Creator Clarification & Target Effect Calibration
                          </span>
                        </div>

                        <div className="space-y-3.5">
                          {analysis.unknowns.map((unk) => {
                            const isQueued = unk.status === 'queued';
                            const isAwaitingResponse = unk.status === 'awaiting_response';
                            const isAwaitingConfirmation = unk.status === 'awaiting_confirmation';
                            const isResolved = unk.status === 'resolved';
                            const isDiscretion = unk.status === 'contextual_discretion';
                            const isEditingProp = editingProposalId === unk.id;

                            const answerInput = unknownAnswers[unk.id] ?? '';

                            return (
                              <div
                                key={unk.id}
                                id={`unknown-card-${unk.id}`}
                                className={`p-3.5 rounded border font-mono text-xs space-y-3 transition-colors ${
                                  isResolved
                                    ? 'bg-emerald-950/15 border-emerald-900/40 text-zinc-300'
                                    : isDiscretion
                                    ? 'bg-indigo-950/20 border-indigo-900/40 text-zinc-300'
                                    : isAwaitingConfirmation
                                    ? 'bg-purple-950/20 border-purple-900/50 text-zinc-200'
                                    : 'bg-black/60 border-zinc-800 text-zinc-200'
                                }`}
                              >
                                {/* UNKNOWN HEADER */}
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
                                          Resolved (Committed to Blueprint)
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
                                </div>

                                {/* TARGET EFFECT EXPLANATION */}
                                <div className="text-[11px] text-zinc-400 bg-zinc-950/70 p-2 rounded border border-zinc-900 flex items-start gap-1.5">
                                  <span className="text-amber-500/90 font-bold uppercase text-[10px] shrink-0">
                                    Impact on Simulation:
                                  </span>
                                  <span>{unk.targetEffect}</span>
                                </div>

                                {/* ERROR DISPLAY IF ANY */}
                                {unk.lastError && (
                                  <div className="p-2 bg-red-950/30 border border-red-900/50 rounded text-red-300 text-[11px] flex items-center justify-between gap-2">
                                    <span>{unk.lastError}</span>
                                    <button
                                      onClick={() => retryUnknown(analysis.id, unk.id)}
                                      className="px-2 py-0.5 bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-100 rounded text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      Retry
                                    </button>
                                  </div>
                                )}

                                {/* FOLLOW-UPS HISTORY */}
                                {unk.followUps && unk.followUps.length > 0 && (
                                  <div className="space-y-2 border-l-2 border-amber-800/40 pl-3 pt-1">
                                    <span className="text-[10px] uppercase font-bold text-amber-400/80 block">
                                      Clarification Dialogue:
                                    </span>
                                    {unk.followUps.map((fu, idx) => (
                                      <div key={fu.id || idx} className="space-y-1 text-[11px]">
                                        <div className="text-zinc-400">
                                          <span className="font-bold text-zinc-500">Q: </span>
                                          {fu.question}
                                        </div>
                                        {fu.answer && (
                                          <div className="text-cyan-300">
                                            <span className="font-bold text-cyan-500">A: </span>
                                            {fu.answer}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ACTIVE STATE: QUEUED / AWAITING RESPONSE */}
                                {(isQueued || isAwaitingResponse) && (
                                  <div className="space-y-2 pt-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-400 block">
                                      Creator Clarification / Directive:
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={answerInput}
                                        disabled={!!isSubmittingUnknown[unk.id]}
                                        onChange={(e) =>
                                          handleUnknownAnswerChange(unk.id, e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && answerInput.trim() && !isSubmittingUnknown[unk.id]) {
                                            handleSubmitAnswer(analysis.id, unk.id);
                                          }
                                        }}
                                        placeholder="e.g. The entity's origin is extraterrestrial, strictly reacting to sound..."
                                        className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500/70 p-2 text-xs text-zinc-200 rounded focus:outline-none font-mono disabled:opacity-50"
                                      />
                                      <button
                                        onClick={() => handleSubmitAnswer(analysis.id, unk.id)}
                                        disabled={!answerInput.trim() || !!isSubmittingUnknown[unk.id]}
                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black text-[10px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                      >
                                        <Send className="w-3 h-3" />
                                        {isSubmittingUnknown[unk.id] ? 'Consulting...' : 'Clarify'}
                                      </button>
                                    </div>

                                    <div className="flex justify-between items-center pt-1">
                                      <span className="text-[10px] text-zinc-500">
                                        Prefer to let the engine decide organically during runtime?
                                      </span>
                                      <button
                                        onClick={() =>
                                          leaveUnknownUncertain(
                                            analysis.id,
                                            unk.id,
                                            'Creator delegated to engine contextual discretion'
                                          )
                                        }
                                        className="text-[10px] text-zinc-400 hover:text-indigo-300 hover:underline uppercase font-bold cursor-pointer"
                                      >
                                        Leave Uncertain (Contextual Discretion) →
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* RESOLUTION PROPOSAL STAGE */}
                                {isAwaitingConfirmation && unk.resolutionProposal && (
                                  <div className="space-y-2.5 pt-1">
                                    <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-purple-300">
                                          Synthesized Resolution Proposal:
                                        </span>
                                        {!isEditingProp && (
                                          <button
                                            onClick={() => startEditProposal(unk)}
                                            className="text-[10px] text-purple-300 hover:text-purple-100 flex items-center gap-1"
                                          >
                                            <Edit2 className="w-2.5 h-2.5" />
                                            Edit Proposal
                                          </button>
                                        )}
                                      </div>

                                      {isEditingProp ? (
                                        <div className="space-y-2 pt-1">
                                          <div>
                                            <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">
                                              Resolution Text:
                                            </label>
                                            <textarea
                                              value={editedProposalResolution}
                                              onChange={(e) =>
                                                setEditedProposalResolution(e.target.value)
                                              }
                                              className="w-full bg-zinc-950 border border-purple-500/70 p-2 text-xs text-zinc-200 rounded focus:outline-none min-h-[60px]"
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <button
                                              onClick={() => setEditingProposalId(null)}
                                              className="px-2 py-1 text-[10px] uppercase text-zinc-400 hover:text-white rounded border border-zinc-800"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              onClick={() => saveProposalEdit(analysis.id, unk.id)}
                                              className="px-2.5 py-1 text-[10px] uppercase font-bold bg-purple-500 text-black rounded hover:bg-purple-400"
                                            >
                                              Save Proposal
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-zinc-200 text-xs leading-relaxed">
                                          {unk.resolutionProposal.resolution}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons for Resolution */}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                      <button
                                        onClick={() =>
                                          leaveUnknownUncertain(
                                            analysis.id,
                                            unk.id,
                                            'Creator chose runtime contextual discretion'
                                          )
                                        }
                                        className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase font-bold"
                                      >
                                        Leave Uncertain
                                      </button>

                                      <button
                                        onClick={() =>
                                          acceptUnknownResolution(analysis.id, unk.id)
                                        }
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                      >
                                        <Check className="w-3 h-3" />
                                        Commit Resolution to Blueprint
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* RESOLVED STATE SUMMARY */}
                                {isResolved && (
                                  <div className="text-[11px] text-emerald-300/90 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded leading-relaxed">
                                    <span className="font-bold text-emerald-400 block text-[10px] uppercase mb-0.5">
                                      Committed Resolution:
                                    </span>
                                    {unk.resolutionProposal?.resolution ||
                                      unk.submittedAnswer ||
                                      'Integrated into Blueprint ambiguity ledger.'}
                                  </div>
                                )}

                                {/* DISCRETION STATE SUMMARY */}
                                {isDiscretion && (
                                  <div className="text-[11px] text-indigo-300/90 bg-indigo-950/30 border border-indigo-900/50 p-2.5 rounded leading-relaxed">
                                    <span className="font-bold text-indigo-400 block text-[10px] uppercase mb-0.5">
                                      Engine Runtime Rule:
                                    </span>
                                    This gap will be resolved dynamically at simulation runtime
                                    under narrative and environmental contextual discretion.
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
