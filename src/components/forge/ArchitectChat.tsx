import React, { useState } from 'react';
import { useForgeStore } from '../../store/useForgeStore';

export const ArchitectChat = () => {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'architect', content: "I am the Architect. Tell me what kind of nightmare we are building today." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const updateDraft = useForgeStore(state => state.updateDraft);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const newHistory = [...messages, { role: 'user', content: input }];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory })
      });
      
      const data = await response.json();
      
      setMessages([...newHistory, { role: 'architect', content: data.text }]);

      // CRITICAL: Auto-fill the Forge form if the Architect compiled a blueprint
      if (data.compiledBlueprint) {
        updateDraft({
          title: data.compiledBlueprint.title,
          premise: data.compiledBlueprint.premise,
          startingVector: data.compiledBlueprint.startingVector,
          startingTier: data.compiledBlueprint.startingTier,
          environmentalRules: data.compiledBlueprint.environmentalRules,
          cast: data.compiledBlueprint.cast
        });
      }
    } catch (error) {
      console.error(error);
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
