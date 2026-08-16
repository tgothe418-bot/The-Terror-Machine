import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import { ForgeSourceCandidate } from '../../types/forge';
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
} from 'lucide-react';

export const ScenarioBaselinePanel: React.FC = () => {
  const sourceAnalyses = useForgeState((state) => state.sourceAnalyses || {});
  const { acceptCandidate, rejectCandidate, editPendingCandidate, removeSourceAnalysis } =
    forgeActions;

  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState<string>('');

  const sourceList = Object.values(sourceAnalyses);

  if (sourceList.length === 0) {
    return null;
  }

  const toggleSourceExpand = (sourceId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [sourceId]: prev[sourceId] === undefined ? false : !prev[sourceId],
    }));
  };

  const isExpanded = (sourceId: string) => {
    // Default to expanded
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
        // Leave as string if not JSON
        parsed = editingValueText;
      }
    }
    editPendingCandidate(sourceId, cand.id, parsed);
    setEditingCandidateId(null);
    setEditingValueText('');
  };

  return (
    <div
      id="scenario-baseline-panel"
      className="bg-zinc-950 border border-zinc-800 rounded flex flex-col p-5 shadow-lg space-y-4"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-zinc-200 font-mono text-xs uppercase tracking-widest font-bold">
            SOURCE BASELINE // SCENARIO INTAKE
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded">
            {sourceList.length} {sourceList.length === 1 ? 'Source' : 'Sources'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Independent Review · Draft Untouched Until Accepted
        </span>
      </div>

      <div className="space-y-4">
        {sourceList.map((analysis) => {
          const expanded = isExpanded(analysis.id);
          const pendingCount = analysis.candidates.filter((c) => c.reviewState === 'pending').length;
          const acceptedCount = analysis.candidates.filter((c) => c.reviewState === 'accepted').length;
          const rejectedCount = analysis.candidates.filter((c) => c.reviewState === 'rejected').length;

          return (
            <div
              key={analysis.id}
              id={`source-card-${analysis.id}`}
              className="border border-zinc-800/80 bg-black/60 rounded overflow-hidden transition-colors"
            >
              {/* SOURCE HEADER */}
              <div className="p-3.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center justify-between gap-3">
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
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {pendingCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded font-semibold">
                        {pendingCount} pending
                      </span>
                    )}
                    {acceptedCount > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded">
                        {acceptedCount} accepted
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded">
                        {rejectedCount} rejected
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => removeSourceAnalysis(analysis.id)}
                    className="text-zinc-500 hover:text-red-400 px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-transparent hover:border-red-900/50 hover:bg-red-950/20 transition-colors"
                    title="Dismiss this source analysis"
                  >
                    [Dismiss]
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="p-4 space-y-4">
                  {/* SUMMARY */}
                  {analysis.summary && (
                    <div className="text-xs font-mono text-zinc-400 bg-zinc-950/50 p-2.5 rounded border border-zinc-900 leading-relaxed">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-1">
                        Extraction Summary
                      </span>
                      {analysis.summary}
                    </div>
                  )}

                  {/* CANDIDATES LIST */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        Extracted Candidates ({analysis.candidates.length})
                      </span>
                    </div>

                    {analysis.candidates.map((cand) => {
                      const isEditing = editingCandidateId === cand.id;
                      const isPending = cand.reviewState === 'pending';
                      const isAccepted = cand.reviewState === 'accepted';
                      const isRejected = cand.reviewState === 'rejected';

                      // Find associated evidence claim
                      const evidenceItems = analysis.evidence.filter((e) =>
                        cand.evidenceIds?.includes(e.id)
                      );

                      return (
                        <div
                          key={cand.id}
                          id={`candidate-row-${cand.id}`}
                          className={`p-3 rounded border font-mono text-xs transition-colors ${
                            isAccepted
                              ? 'bg-emerald-950/10 border-emerald-900/40 text-zinc-300'
                              : isRejected
                              ? 'bg-zinc-950/30 border-zinc-900 text-zinc-600'
                              : 'bg-zinc-900/40 border-zinc-800 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
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
                              <span className="font-bold text-zinc-200">{cand.label}</span>
                              <span className="text-[10px] text-zinc-500 uppercase">
                                [{cand.target.replace('_', ' ')}]
                              </span>
                            </div>

                            {/* Candidate State Badge / Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isAccepted && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded uppercase tracking-wider">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Applied to Draft
                                </span>
                              )}
                              {isRejected && (
                                <span className="text-[10px] text-zinc-600 bg-zinc-900/50 border border-zinc-800 px-2 py-0.5 rounded uppercase tracking-wider">
                                  Rejected
                                </span>
                              )}
                              {isPending && !isEditing && (
                                <>
                                  <button
                                    onClick={() => startEditCandidate(cand)}
                                    className="p-1 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded cursor-pointer"
                                    title="Edit candidate before accepting"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => rejectCandidate(analysis.id, cand.id)}
                                    className="px-2 py-1 text-[10px] text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/60 bg-zinc-900 rounded uppercase font-bold cursor-pointer transition-colors"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => acceptCandidate(analysis.id, cand.id)}
                                    className="px-2.5 py-1 text-[10px] text-black bg-cyan-400 hover:bg-cyan-300 rounded uppercase font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                                  >
                                    <Check className="w-3 h-3" />
                                    Accept & Apply
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Explanation */}
                          {cand.explanation && (
                            <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                              {cand.explanation}
                            </p>
                          )}

                          {/* Inline Edit or Value Preview */}
                          {isEditing ? (
                            <div className="space-y-2 mt-2 pt-2 border-t border-zinc-800">
                              <label className="text-[10px] uppercase font-bold text-cyan-400 block">
                                Edit Candidate Value:
                              </label>
                              <textarea
                                value={editingValueText}
                                onChange={(e) => setEditingValueText(e.target.value)}
                                className="w-full bg-zinc-950 border border-cyan-500/60 p-2 text-xs font-mono text-zinc-200 rounded focus:outline-none min-h-[70px]"
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
                                  Save Proposal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-black/80 rounded p-2 border border-zinc-900 text-zinc-300 text-[11px] overflow-x-auto max-h-32">
                              {typeof cand.proposedValue === 'object' ? (
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(cand.proposedValue, null, 2)}
                                </pre>
                              ) : (
                                <span>{String(cand.proposedValue)}</span>
                              )}
                            </div>
                          )}

                          {/* Evidence Excerpts */}
                          {evidenceItems.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {evidenceItems.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="text-[10px] text-zinc-500 italic flex items-start gap-1"
                                >
                                  <span className="text-zinc-600 not-italic font-bold">↳ Source Evidence:</span>{' '}
                                  "{ev.excerpt || ev.claim}"
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* UNKNOWNS / AMBIGUITIES */}
                  {analysis.unknowns && analysis.unknowns.length > 0 && (
                    <div className="bg-amber-950/20 border border-amber-900/40 rounded p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Identified Gaps & Ambiguities ({analysis.unknowns.length})
                      </div>
                      <ul className="space-y-1 text-xs font-mono text-amber-300/80 list-disc list-inside">
                        {analysis.unknowns.map((unk) => (
                          <li key={unk.id} className="leading-relaxed">
                            <span className="font-bold text-amber-400/90 capitalize">
                              [{unk.category}]
                            </span>{' '}
                            {unk.question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
