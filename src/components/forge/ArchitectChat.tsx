import React, { useState } from 'react';
import { useForgeState, forgeActions, ArchitectMessage } from '../../store/useForgeStore';

export const ArchitectChat = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addArchitectMessage } = forgeActions;

  const messages = useForgeState((state) => state.architectMessages);
  const draft = useForgeState((state) => state.draftBlueprint);
  const draftRevision = useForgeState((state) => state.draftRevision);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ArchitectMessage = { role: 'user', content: input };
    addArchitectMessage(userMsg);
    setInput('');
    setIsLoading(true);

    const newHistory = [...messages, userMsg];

    try {
      const response = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'GENERAL_MESSAGE',
          userMessage: userMsg.content,
          draftContext: {
            title: draft?.identity?.title || draft?.title || '',
            premise: draft?.globalPremise || draft?.premise || '',
            setting: draft?.setting || {},
            cast: draft?.cast || [],
            environmentalRules: draft?.environmentalRules || [],
            draftRevision: draftRevision || 1,
          },
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      const replyText = data.message || data.text || 'Architect acknowledged.';
      addArchitectMessage({ role: 'architect', content: replyText });

      // Packet 1B: Architect proposal isolation for Depiction Contract
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
      addArchitectMessage({ role: 'architect', content: 'Neural link interrupted. Please retry.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96 bg-zinc-950 border border-zinc-800 rounded">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role === 'user' ? 'text-zinc-500' : 'text-blue-400'}>
            <span className="font-bold">{msg.role === 'user' ? 'YOU: ' : 'ARCHITECT: '}</span>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="text-zinc-700">Architect is thinking...</div>}
      </div>
      <div className="p-2 border-t border-zinc-800 flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-black text-zinc-300 px-3 py-2 border border-zinc-800 focus:outline-none focus:border-zinc-500"
          placeholder="Describe the vibe or type 'compile it'..."
        />
      </div>
    </div>
  );
};
