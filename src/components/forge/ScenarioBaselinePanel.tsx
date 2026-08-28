import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import {
  ForgeSourceAnalysis,
  ForgeSourceAnalysisSchema,
  ForgeSourceCandidate,
  ForgeSourceEvidence,
} from '../../types/forge';
import { SourceEvidenceDrawer } from './SourceEvidenceDrawer';
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
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState<string>('');
  const [applicationError, setApplicationError] = useState<{ sourceId: string; message: string } | null>(null);
  const [activeEvidenceDrawer, setActiveEvidenceDrawer] = useState<{
    candidateId: string;
    candidateLabel: string;
    sourceFileName: string;
    evidence: ForgeSourceEvidence[];
  } | null>(null);

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
      if (result.success === false) {
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

                    {/* QUARANTINE SUMMARY & EXTRACTION ISSUES */}
                    {analysis.validationIssues && analysis.validationIssues.length > 0 && (
                      <div
                        id={`quarantine-summary-${analysis.id}`}
                        className="bg-amber-950/30 border border-amber-800/60 p-3 rounded text-xs font-mono text-amber-200 flex flex-col space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Imported with {analysis.candidates.length} reviewable candidate{analysis.candidates.length === 1 ? '' : 's'}; {analysis.validationIssues.length} malformed candidate{analysis.validationIssues.length === 1 ? ' was' : 's were'} quarantined and cannot affect the Blueprint.
                            </span>
                          </div>
                          <button
                            type="button"
                            id={`toggle-issues-btn-${analysis.id}`}
                            onClick={() =>
                              setExpandedIssues((prev) => ({
                                ...prev,
                                [analysis.id]: !prev[analysis.id],
                              }))
                            }
                            className="px-2 py-1 bg-amber-900/50 hover:bg-amber-800 border border-amber-700 text-amber-100 rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <span>{expandedIssues[analysis.id] ? 'Hide Issues' : 'View Issues'}</span>
                            {expandedIssues[analysis.id] ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {expandedIssues[analysis.id] && (
                          <div className="space-y-2 pt-2 border-t border-amber-900/40">
                            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                              Quarantined Noncanonical Candidates ({analysis.validationIssues.length})
                            </div>
                            {analysis.validationIssues.map((issue) => (
                              <div
                                key={issue.id}
                                id={`quarantine-issue-${issue.id}`}
                                className="p-2.5 bg-zinc-950/80 border border-amber-900/40 rounded text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-bold text-zinc-200">
                                    Candidate #{issue.candidateIndex} · {issue.candidateTarget || 'Unknown target'}
                                    {issue.label ? ` (${issue.label})` : ''}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-red-950/60 border border-red-800/80 text-red-300 text-[9px] uppercase font-bold rounded">
                                    {issue.disposition} — NONCANONICAL
                                  </span>
                                </div>
                                <div className="text-zinc-400 text-[10px]">
                                  Field: <span className="text-zinc-300 font-mono">{issue.fieldPath}</span> · Code: <span className="text-zinc-300 font-mono">{issue.code}</span>
                                </div>
                                <div className="text-amber-200/90 text-xs">
                                  {issue.message}
                                </div>
                                {issue.allowedValues && issue.allowedValues.length > 0 && (
                                  <div className="text-[10px] text-zinc-500 font-mono">
                                    Allowed values: [{issue.allowedValues.join(', ')}]
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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

                        // Find associated evidence claims
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
                                    type="button"
                                    id={`accept-cand-${cand.id}`}
                                    disabled={cand.reviewDecision === 'accepted'}
                                    onClick={() => {
                                      if (cand.reviewDecision !== 'accepted') {
                                        setCandidateReviewDecision(
                                          analysis.id,
                                          cand.id,
                                          'accepted'
                                        );
                                      }
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${
                                      cand.reviewDecision === 'accepted'
                                        ? 'bg-emerald-900/60 border-emerald-700 text-emerald-200 cursor-default opacity-90'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-emerald-300 hover:border-emerald-800 cursor-pointer'
                                    }`}
                                  >
                                    {cand.reviewDecision === 'accepted' ? '✓ Accepted' : 'Accept'}
                                  </button>

                                  <button
                                    type="button"
                                    id={`reject-cand-${cand.id}`}
                                    disabled={cand.reviewDecision === 'rejected'}
                                    onClick={() => {
                                      if (cand.reviewDecision !== 'rejected') {
                                        setCandidateReviewDecision(
                                          analysis.id,
                                          cand.id,
                                          'rejected'
                                        );
                                      }
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${
                                      cand.reviewDecision === 'rejected'
                                        ? 'bg-red-900/60 border-red-700 text-red-200 cursor-default opacity-90'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-red-300 hover:border-red-800 cursor-pointer'
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

                            {/* Linked Evidence Compact Control */}
                            {evidenceItems.length > 0 && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  id={`view-evidence-btn-${cand.id}`}
                                  aria-expanded={activeEvidenceDrawer?.candidateId === cand.id}
                                  aria-controls={`evidence-drawer-${cand.id}`}
                                  aria-label={`View ${evidenceItems.length} evidence items for ${cand.label}`}
                                  onClick={() => {
                                    setActiveEvidenceDrawer({
                                      candidateId: cand.id,
                                      candidateLabel: cand.label,
                                      sourceFileName: analysis.sourceRecord.fileName,
                                      evidence: evidenceItems,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-900/80 hover:bg-zinc-800 text-cyan-300 border border-zinc-700/80 hover:border-cyan-700 text-[11px] font-mono rounded cursor-pointer transition-colors"
                                >
                                  <FileText className="w-3 h-3 text-cyan-400" />
                                  <span>Evidence · {evidenceItems.length}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* SOURCE UNKNOWNS / AMBIGUITIES */}
                    {analysis.unknowns && analysis.unknowns.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-zinc-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ambiguities & Knowledge Gaps</span>
                            <span className="text-[10px] text-zinc-500 font-normal">
                              ({analysis.unknowns.length})
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {resolvedUnknowns} resolved
                          </span>
                        </div>

                        <div className="space-y-2">
                          {analysis.unknowns.map((unk) => {
                            const isResolved =
                              unk.status === 'resolved' || unk.status === 'contextual_discretion';

                            return (
                              <div
                                key={unk.id}
                                className={`p-3 rounded border font-mono text-xs space-y-2 transition-colors ${
                                  isResolved
                                    ? 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
                                    : 'bg-amber-950/15 border-amber-900/40 text-zinc-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        {unk.category}
                                      </span>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                                          isResolved
                                            ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                                            : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                                        }`}
                                      >
                                        {unk.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <div className="font-semibold text-zinc-100">{unk.question}</div>
                                    <div className="text-[11px] text-zinc-400">
                                      Target impact: {unk.targetEffect}
                                    </div>
                                  </div>

                                  {!isResolved && (
                                    <button
                                      type="button"
                                      onClick={handleResolveInArchitect}
                                      className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                      title="Open Architect Chat to resolve this ambiguity"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-300" />
                                      <span>Resolve in Chat</span>
                                      <ArrowUpRight className="w-3 h-3 text-amber-400" />
                                    </button>
                                  )}
                                </div>

                                {/* Resolution Details */}
                                {unk.resolutionProposal && (
                                  <div className="bg-zinc-950/70 p-2.5 rounded border border-zinc-900 text-[11px] space-y-1">
                                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Resolution:</span>
                                    </div>
                                    <p className="text-zinc-300">{unk.resolutionProposal.resolution}</p>
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

      {/* SOURCE EVIDENCE DRAWER OVERLAY */}
      {activeEvidenceDrawer && (
        <SourceEvidenceDrawer
          isOpen={!!activeEvidenceDrawer}
          onClose={() => setActiveEvidenceDrawer(null)}
          candidateLabel={activeEvidenceDrawer.candidateLabel}
          sourceFileName={activeEvidenceDrawer.sourceFileName}
          evidence={activeEvidenceDrawer.evidence}
          triggerElementId={`view-evidence-btn-${activeEvidenceDrawer.candidateId}`}
          drawerId={`evidence-drawer-${activeEvidenceDrawer.candidateId}`}
        />
      )}
    </div>
  );
};
