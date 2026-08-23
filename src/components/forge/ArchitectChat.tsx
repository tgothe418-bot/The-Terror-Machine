import React, { useState, useRef, useMemo } from 'react';
import {
  useForgeState,
  forgeActions,
  selectActiveUnknown,
  ArchitectMessage,
  ForgeState,
} from '../../store/useForgeStore';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Check,
  Send,
  ArrowRight,
} from 'lucide-react';

export const ArchitectChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingProposal, setEditingProposal] = useState(false);
  const [editedResolution, setEditedResolution] = useState('');
  const [editedTargetEffect, setEditedTargetEffect] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    addArchitectMessage,
    submitUnknownAnswer,
    receiveUnknownFollowUp,
    receiveUnknownProposal,
    acceptUnknownResolution,
    editUnknownProposal,
    leaveUnknownUncertain,
    setUnknownError,
    retryUnknown,
  } = forgeActions;

  const messages = useForgeState((state) => state.architectMessages || []);
  const draft = useForgeState((state) => state.draftBlueprint);
  const draftRevision = useForgeState((state) => state.draftRevision);
  const sourceAnalyses = useForgeState((state) => state.sourceAnalyses);

  const activeUnknownContext = useMemo(() => {
    return selectActiveUnknown({ sourceAnalyses } as unknown as ForgeState);
  }, [sourceAnalyses]);

  const activeUnk = activeUnknownContext?.unknown;
  const sourceId = activeUnknownContext?.sourceId;

  const handleStartEditProposal = () => {
    if (!activeUnk?.resolutionProposal) return;
    setEditedResolution(activeUnk.resolutionProposal.resolution);
    setEditedTargetEffect(activeUnk.resolutionProposal.targetEffect || activeUnk.targetEffect);
    setEditingProposal(true);
  };

  const handleSaveProposalEdit = () => {
    if (!sourceId || !activeUnk || !editedResolution.trim()) return;
    editUnknownProposal(
      sourceId,
      activeUnk.id,
      editedResolution.trim(),
      editedTargetEffect.trim() || activeUnk.targetEffect
    );
    setEditingProposal(false);
  };

  const handleApplyResolution = () => {
    if (!sourceId || !activeUnk) return;
    acceptUnknownResolution(sourceId, activeUnk.id);
  };

  const handleLeaveUncertain = () => {
    if (!sourceId || !activeUnk) return;
    leaveUnknownUncertain(
      sourceId,
      activeUnk.id,
      'Creator chose runtime contextual discretion'
    );
  };

  const handleRetry = () => {
    if (!sourceId || !activeUnk) return;
    retryUnknown(sourceId, activeUnk.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMsg: ArchitectMessage = { role: 'user', content: userText };
    addArchitectMessage(userMsg);
    setInput('');
    setIsLoading(true);

    const historyPayload = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

    const draftContext = {
      title: draft?.identity?.title || draft?.title || '',
      premise: draft?.globalPremise || draft?.premise || '',
      setting: draft?.setting || {},
      cast: draft?.cast || [],
      environmentalRules: draft?.environmentalRules || [],
      draftRevision: draftRevision || 1,
    };

    if (activeUnknownContext && activeUnk && sourceId) {
      // Ambiguity resolution routing
      submitUnknownAnswer(sourceId, activeUnk.id, userText);

      try {
        const response = await fetch('/api/architect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'AMBIGUITY_RESOLUTION',
            userMessage: userText,
            activeUnknown: {
              sourceId,
              unknownId: activeUnk.id,
              category: activeUnk.category,
              question: activeUnk.question,
              targetEffect: activeUnk.targetEffect,
              submittedAnswer: userText,
              followUps: activeUnk.followUps || [],
            },
            draftContext,
            history: historyPayload,
          }),
        });

        if (!response.ok) {
          throw new Error(`Architect resolution failed with status ${response.status}`);
        }

        const data = await response.json();

        // Validate response identity
        if (data.sourceId !== sourceId || data.unknownId !== activeUnk.id) {
          const mismatchMsg = `Mismatched ambiguity response: received source=${data.sourceId} unknown=${data.unknownId}, expected source=${sourceId} unknown=${activeUnk.id}`;
          setUnknownError(sourceId, activeUnk.id, mismatchMsg);
          addArchitectMessage({
            role: 'architect',
            content: `Architect response validation failed: ID mismatch.`,
          });
          return;
        }

        if (data.type === 'FOLLOW_UP') {
          const followUpQ = data.followUpQuestion || data.message;
          receiveUnknownFollowUp(sourceId, activeUnk.id, followUpQ);
          addArchitectMessage({
            role: 'architect',
            content: followUpQ,
          });
        } else if (data.type === 'RESOLUTION_PROPOSAL' && data.proposal) {
          receiveUnknownProposal(sourceId, activeUnk.id, data.proposal);
          addArchitectMessage({
            role: 'architect',
            content: data.message || `Resolution Proposal: ${data.proposal.resolution}`,
          });
        } else {
          setUnknownError(sourceId, activeUnk.id, 'Unrecognized architect response format.');
          addArchitectMessage({
            role: 'architect',
            content: 'Received an unrecognized response structure from the Architect.',
          });
        }
      } catch (error) {
        const errStr = error instanceof Error ? error.message : 'Architect communication error.';
        setUnknownError(sourceId, activeUnk.id, errStr);
        addArchitectMessage({
          role: 'architect',
          content: `Neural link interrupted during ambiguity resolution: ${errStr}`,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // General message routing
      try {
        const response = await fetch('/api/architect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'GENERAL_MESSAGE',
            userMessage: userText,
            draftContext,
            history: historyPayload,
          }),
        });

        const data = await response.json();

        const replyText = data.message || data.text || 'Architect acknowledged.';
        addArchitectMessage({ role: 'architect', content: replyText });

        // Packet 1B: Depiction Contract proposal isolation
        if (data.type === 'DEPICTION_CONTRACT_PROPOSAL' && data.proposal) {
          forgeActions.setPendingDepictionContractProposal({
            patch: data.proposal.contract,
            rationale: data.proposal.rationale || data.message || '',
            createdAt: data.proposal.createdAt || Date.now(),
          });
        } else if (data.depictionContractProposal) {
          forgeActions.setPendingDepictionContractProposal(data.depictionContractProposal);
        }
      } catch (error) {
        console.error(error);
        addArchitectMessage({
          role: 'architect',
          content: 'Neural link interrupted. Please retry.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      id="architect-chat-container"
      className="flex flex-col h-[520px] bg-zinc-950 border border-zinc-800 rounded shadow-lg overflow-hidden"
    >
      {/* ACTIVE AMBIGUITY BANNER / WORKFLOW STAGE */}
      {activeUnknownContext && activeUnk && (
        <div
          id="architect-ambiguity-queue-banner"
          className="border-b border-amber-900/50 bg-amber-950/20 p-3.5 space-y-2.5 shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-amber-400" />
                Ambiguity {activeUnknownContext.queueIndex} of {activeUnknownContext.totalCount}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]" title={activeUnknownContext.sourceFileName}>
                {activeUnknownContext.sourceFileName || 'Imported Source'}
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                [{activeUnk.category}]
              </span>
            </div>

            {/* Lifecycle Status Badge */}
            <div className="text-[10px] font-mono font-bold uppercase">
              {activeUnk.status === 'queued' && (
                <span className="text-amber-300 px-1.5 py-0.5 rounded bg-amber-900/30 border border-amber-700/50">
                  Pending Clarification
                </span>
              )}
              {activeUnk.status === 'awaiting_response' && (
                <span className="text-blue-300 px-1.5 py-0.5 rounded bg-blue-950/50 border border-blue-800/60">
                  Awaiting Follow-up
                </span>
              )}
              {activeUnk.status === 'awaiting_confirmation' && (
                <span className="text-purple-300 px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-800/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Resolution Ready
                </span>
              )}
              {activeUnk.status === 'resolved' && (
                <span className="text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Resolved
                </span>
              )}
              {activeUnk.status === 'contextual_discretion' && (
                <span className="text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950/50 border border-indigo-800/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Contextual Discretion
                </span>
              )}
            </div>
          </div>

          {/* Question & Target Effect */}
          <div className="space-y-1 font-mono text-xs">
            <p className="text-zinc-100 font-semibold leading-snug">{activeUnk.question}</p>
            <p className="text-[11px] text-zinc-400">
              <span className="text-amber-500/90 font-bold uppercase text-[10px] mr-1.5">
                Target Effect:
              </span>
              {activeUnk.targetEffect}
            </p>
          </div>

          {/* Visible Error State */}
          {activeUnk.lastError && (
            <div className="p-2 bg-red-950/40 border border-red-900/60 rounded text-red-200 text-[11px] font-mono flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">{activeUnk.lastError}</span>
              </div>
              <button
                onClick={handleRetry}
                className="px-2 py-0.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-100 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Retry
              </button>
            </div>
          )}

          {/* Follow-up dialogue display */}
          {activeUnk.followUps && activeUnk.followUps.length > 0 && (
            <div className="space-y-1.5 border-l-2 border-amber-800/50 pl-2.5 py-1 text-[11px] font-mono">
              <span className="text-[10px] uppercase font-bold text-amber-400/90 block">
                Clarification Dialogue:
              </span>
              {activeUnk.followUps.map((fu, idx) => (
                <div key={fu.id || idx} className="space-y-0.5">
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

          {/* Resolution Proposal Stage */}
          {activeUnk.status === 'awaiting_confirmation' && activeUnk.resolutionProposal && (
            <div className="p-3 bg-purple-950/30 border border-purple-800/50 rounded font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-purple-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Synthesized Resolution Proposal:
                </span>
                {!editingProposal && (
                  <button
                    onClick={handleStartEditProposal}
                    className="text-[10px] text-purple-300 hover:text-purple-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                    Edit Proposal
                  </button>
                )}
              </div>

              {editingProposal ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">
                      Resolution Text:
                    </label>
                    <textarea
                      value={editedResolution}
                      onChange={(e) => setEditedResolution(e.target.value)}
                      className="w-full bg-zinc-950 border border-purple-500/70 p-2 text-xs text-zinc-200 rounded focus:outline-none min-h-[50px] font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingProposal(false)}
                      className="px-2 py-1 text-[10px] uppercase text-zinc-400 hover:text-white rounded border border-zinc-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProposalEdit}
                      className="px-2.5 py-1 text-[10px] uppercase font-bold bg-purple-500 text-black rounded hover:bg-purple-400 cursor-pointer"
                    >
                      Save Proposal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-200 text-xs leading-relaxed bg-zinc-950/60 p-2 rounded border border-purple-900/30">
                  {activeUnk.resolutionProposal.resolution}
                </div>
              )}

              {/* Action Controls for Resolution */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleLeaveUncertain}
                  className="text-[10px] text-zinc-400 hover:text-indigo-300 uppercase font-bold cursor-pointer"
                >
                  Leave Uncertain (Discretion)
                </button>

                <button
                  onClick={handleApplyResolution}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] uppercase font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Check className="w-3 h-3" />
                  Apply Resolution
                </button>
              </div>
            </div>
          )}

          {/* Quick Leave Uncertain from initial question */}
          {activeUnk.status === 'queued' && (
            <div className="flex justify-end pt-0.5">
              <button
                onClick={handleLeaveUncertain}
                className="text-[10px] text-zinc-500 hover:text-indigo-300 uppercase font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Leave Uncertain (Contextual Discretion)</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role === 'user' ? 'text-zinc-400' : 'text-blue-400'}>
            <span className="font-bold">{msg.role === 'user' ? 'YOU: ' : 'ARCHITECT: '}</span>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="text-zinc-600 font-mono text-xs animate-pulse">Architect is analyzing...</div>}
      </div>

      {/* INPUT BAR */}
      <div className="p-2.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center gap-2">
        <input
          id="architect-input"
          ref={inputRef}
          type="text"
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-black text-zinc-200 px-3 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500 font-mono text-xs rounded disabled:opacity-50"
          placeholder={
            activeUnknownContext
              ? `Clarify ambiguity: "${activeUnk?.question?.slice(0, 45)}..."`
              : "Direct the Architect or type scenario instructions..."
          }
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-mono text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
