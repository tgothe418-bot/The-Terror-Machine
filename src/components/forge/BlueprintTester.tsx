import React, { useState } from 'react';
import {  useForgeState, forgeActions, getForgeState  } from '../../store/useForgeStore'; 

export const BlueprintTester = () => {
  const draftBlueprint = useForgeState((state) => state.draftBlueprint);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [testBlocks, setTestBlocks] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async () => {
    if (!draftBlueprint || !draftBlueprint.premise) {
      alert("Blueprint premise is empty. Talk to the Architect first.");
      return;
    }
    
    setIsTesting(true);
    setTestBlocks([]);

    try {
      const response = await fetch('/api/test-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint: draftBlueprint })
      });
      const data = await response.json();
      if (data.blocks) {
        setTestBlocks(data.blocks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
          [ Atmospheric Validation ]
        </h3>
        <button 
          onClick={runTest}
          disabled={isTesting}
          className="px-3 py-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-mono border border-red-900/50 rounded transition-colors disabled:opacity-50"
        >
          {isTesting ? 'COMPILING SCENE...' : 'TEST OPENING SCENE'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black border border-zinc-900 p-4 rounded min-h-[200px]">
        {testBlocks.length === 0 && !isTesting && (
          <div className="text-zinc-700 text-xs font-mono text-center mt-10">
            Awaiting test initialization...
          </div>
        )}
        
        {testBlocks.length > 0 && (
          <div className="space-y-4">
            {testBlocks.map((block, idx) => (
              <div key={idx} className={`block-${block.type} text-sm font-mono ${block.type === 'system_voice' ? 'text-red-500 font-bold' : 'text-zinc-300'}`}>
                {block.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
