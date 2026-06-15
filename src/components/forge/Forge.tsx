import React, { useState, useEffect } from 'react';
import { useForgeStore } from '../../store/useForgeStore';
import { useAppStore } from '../../store/useAppStore';
import { ArchitectChat } from './ArchitectChat';
import { BlueprintTester } from './BlueprintTester';
import { FileDropzone } from './FileDropzone';
import { MatrixSelector } from './MatrixSelector';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { 
    draftBlueprint,
    updateDraft,
    clearHistory
  } = useForgeStore();
  const [hydrated, setHydrated] = useState(() => useForgeStore.persist.hasHydrated());
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Handle hydration
  useEffect(() => {
    const unsub = useForgeStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useForgeStore.persist.onFinishHydration(() => setHydrated(true));
    
    return () => {
      unsub();
      unsubFinish();
    };
  }, []);

  const exportBlueprint = () => {
    const store = useForgeStore.getState();
    const draft = store.draftBlueprint;
    
    if (!draft || !draft.premise) {
      alert("Cannot export an empty blueprint. Please compile a scenario first.");
      return;
    }

    // Sanitize and format the payload
    const exportPayload = {
      id: draft.id || crypto.randomUUID(),
      title: draft.title || "Untitled Nightmare",
      premise: draft.premise,
      startingVector: draft.startingVector,
      startingTier: draft.startingTier,
      environmentalRules: draft.environmentalRules,
      cast: draft.cast || []
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `blueprint-${draft.startingVector}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (!hydrated) return null;

  return (
    <div className="forge-container w-[95vw] max-w-[2400px] mx-auto p-8 h-screen flex flex-col bg-black text-zinc-300 overflow-hidden">
      
      {/* HEADER AREA */}
      <div className="mb-6 flex justify-between items-center border-b border-zinc-800 pb-4 shrink-0">
        <h2 className="text-zinc-400 font-mono text-xl uppercase tracking-widest flex items-center gap-4">
          <button 
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] uppercase tracking-widest border border-zinc-800 px-3 py-1 rounded-sm"
          >
            <ArrowLeft className="w-3 h-3" />
            HUB
          </button>
          [ THE FORGE // ARCHITECTURAL DRAFTING ]
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            {isConfirmingClear ? (
              <div className="flex items-center gap-4 mr-4 animate-in fade-in slide-in-from-right-2 border border-red-900/50 bg-red-950/20 px-3 py-1 rounded-sm">
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-bold">Purge Memory?</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      clearHistory();
                      setIsConfirmingClear(false);
                    }}
                    className="text-[10px] uppercase tracking-widest text-white hover:text-red-400 transition-colors"
                  >
                    Yes
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button 
                    onClick={() => setIsConfirmingClear(false)}
                    className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="p-2 text-zinc-600 hover:text-red-500 transition-colors mr-2 border border-transparent hover:border-red-900/50 rounded-sm hover:bg-red-950/20"
                title="Purge Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <button 
            onClick={exportBlueprint}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700 rounded transition-colors"
          >
            [ EXPORT BLUEPRINT TO ENGINE ]
          </button>
        </div>
      </div>
      
      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-12 gap-8 flex-grow overflow-hidden">
          
        {/* LEFT COLUMN: Controls, Intake, Matrix (Spans 5 columns) */}
        <div className="col-span-5 flex flex-col space-y-6 overflow-y-auto pr-2 pb-8 custom-scrollbar">
          
          {/* Intake/Knowledgebase Dropzone */}
          <FileDropzone />
          
          {/* Matrix Coordinates */}
          <MatrixSelector />

          {/* Blueprint Tester Button */}
          <BlueprintTester />

        </div>
          
        {/* RIGHT COLUMN: The Architect Chat & Parameter Cards (Spans 7 columns) */}
        <div className="col-span-7 flex flex-col space-y-6 h-full overflow-hidden">
          
          {/* The Chat Area (Flex-grow ensures it takes up available vertical space) */}
          <div className="flex-grow flex flex-col min-h-[400px]">
            <ArchitectChat />
          </div>
          
          {/* Parameter Cards (Static bottom area) */}
          <div className="shrink-0 space-y-4 pb-8 overflow-y-auto custom-scrollbar max-h-[40vh]">
            
            {/* 4-COLUMN PARAMETER GRID */}
            <div className="grid grid-cols-4 gap-4">
              
              {/* 1. WHO */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                <label className="text-zinc-500 font-mono text-[10px] uppercase mb-2">SYSTEM SUBJECT (WHO)</label>
                <textarea 
                  value={draftBlueprint?.cast?.[0]?.description || ''}
                  onChange={(e) => {
                    const updatedCast = [...(draftBlueprint?.cast || [])];
                    if (!updatedCast[0]) updatedCast[0] = { id: 'char-1', name: 'Unknown', description: '', behaviorVector: 'ADAPTIVE' };
                    updatedCast[0].description = e.target.value;
                    updateDraft({ cast: updatedCast });
                  }}
                  className="flex-1 bg-transparent text-zinc-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar min-h-[80px]"
                  placeholder="Define the isolated entities..."
                />
              </div>

              {/* 2. WHAT */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                <label className="text-zinc-500 font-mono text-[10px] uppercase mb-2">CORE CONSTRAINT (WHAT)</label>
                <textarea 
                  value={draftBlueprint?.environmentalRules || ''}
                  onChange={(e) => updateDraft({ environmentalRules: e.target.value })}
                  className="flex-1 bg-transparent text-zinc-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar min-h-[80px]"
                  placeholder="Set the overarching dilemma..."
                />
              </div>

              {/* 3. WHERE */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                <label className="text-zinc-500 font-mono text-[10px] uppercase mb-2">ENCLOSURE ENVIRONMENT (WHERE)</label>
                <textarea 
                  value={draftBlueprint?.title || ''}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  className="flex-1 bg-transparent text-zinc-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar min-h-[80px]"
                  placeholder="Map out the explicit physical structures..."
                />
              </div>

              {/* 4. WHEN */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col relative overflow-hidden">
                <label className="text-zinc-500 font-mono text-[10px] uppercase mb-2">TEMPORAL ANCHOR (WHEN)</label>
                <div className="flex-1 flex items-start text-zinc-300 font-mono text-xs">
                   {draftBlueprint?.startingTier || <span className="text-zinc-600">AWAITING SELECTION...</span>}
                </div>
              </div>

            </div>

            {/* WHY / HOW */}
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
              <label className="text-zinc-500 font-mono text-[10px] uppercase mb-2">SYSTEMIC VECTOR DIRECTIVE (WHY / HOW)</label>
              <textarea 
                value={draftBlueprint?.premise || ''}
                onChange={(e) => updateDraft({ premise: e.target.value })}
                className="h-20 bg-transparent text-zinc-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar"
                placeholder="Calibrate the initial psychological or logic vectors..."
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

