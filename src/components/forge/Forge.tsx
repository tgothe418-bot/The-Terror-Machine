import React, { useState, useEffect } from 'react';
import {  useForgeState, forgeActions, useForgeStoreInternal  } from '../../store/useForgeStore';
import { useAppStore } from '../../store/useAppStore';
import { ArchitectChat } from './ArchitectChat';
import { NarrativeLens } from './NarrativeLens';
import { BlueprintTester } from './BlueprintTester';
import { FileDropzone } from './FileDropzone';
import { MatrixSelector } from './MatrixSelector';
import { SpatialManager } from './SpatialManager';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { AutopilotVector } from '../../types';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const compileTopology = useAppStore((state) => state.compileTopology);
  const { draftBlueprint } = useForgeState();
  const { updateDraft, clearHistory } = forgeActions;
  const [hydrated, setHydrated] = useState(() => useForgeStoreInternal.persist.hasHydrated());
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Handle hydration
  useEffect(() => {
    const unsub = useForgeStoreInternal.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useForgeStoreInternal.persist.onFinishHydration(() => setHydrated(true));
    
    return () => {
      unsub();
      unsubFinish();
    };
  }, []);

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
            onClick={() => {
              const startNodeid = draftBlueprint?.topology?.nodes?.[0] || 'NODE_INIT';
              compileTopology(draftBlueprint?.topology, startNodeid);
              setPhase('engine');
            }}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 font-mono text-xs hover:bg-zinc-800 hover:text-cyan-400 transition-colors"
          >
            [ EXPORT BLUEPRINT TO ENGINE ]
          </button>
        </div>
      </div>
      
      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-12 gap-8 flex-grow overflow-hidden">
          
        {/* LEFT COLUMN: Expanded Parameter Console & Selectors (Spans 7 columns for direct typing depth) */}
        <div className="col-span-7 flex flex-col space-y-6 overflow-y-auto pr-4 pb-8 custom-scrollbar">
          
          {/* Intake/Knowledgebase Dropzone */}
          <FileDropzone />
          
          {/* Matrix Coordinates */}
          <MatrixSelector />

          {/* Spatial Topology Matrix */}
          <SpatialManager />

          {/* EXPANDED PARAMETER CARDS DECK */}
          <div className="space-y-6 pt-4 border-t border-zinc-900 flex-grow">
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* 1. WHO // MULTI-ENTITY SYSTEM SUBJECTS */}
              <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-4 rounded flex flex-col shadow-lg transition-colors h-[250px]">
                
                {/* Header & Add Button */}
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">SYSTEM SUBJECTS (WHO)</label>
                  <button 
                    onClick={() => {
                      const currentCast = draftBlueprint?.cast || [];
                      updateDraft({ 
                        cast: [...currentCast, { id: `char-${Date.now()}`, name: 'New Entity', description: '', behaviorVector: 'ADAPTIVE' }] 
                      });
                    }}
                    className="text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded border border-zinc-700 transition-colors shadow-sm"
                  >
                    [+ ADD ENTITY]
                  </button>
                </div>

                {/* Dynamic Roster List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                  {draftBlueprint?.cast?.map((char, index) => (
                    <div key={char.id} className="p-3 bg-[#050505] border border-zinc-800/80 rounded flex flex-col gap-2 relative group shadow-inner">
                      
                      {/* Delete Button (Appears on Hover) */}
                      <button 
                        onClick={() => {
                          const updatedCast = draftBlueprint.cast.filter(c => c.id !== char.id);
                          updateDraft({ cast: updatedCast });
                        }}
                        className="absolute top-2 right-2 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/50 rounded px-1"
                        title="Remove Entity"
                      >
                        ✕
                      </button>

                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={char.name}
                          onChange={(e) => {
                            const updatedCast = [...draftBlueprint.cast];
                            updatedCast[index].name = e.target.value;
                            updateDraft({ cast: updatedCast });
                          }}
                          className="bg-transparent border-b border-zinc-800 text-zinc-300 font-bold text-xs focus:outline-none w-1/2 focus:border-zinc-500 pb-1"
                          placeholder="Entity Name"
                        />
                        <select
                          value={char.behaviorVector || 'ADAPTIVE'}
                          onChange={(e) => {
                            const updatedCast = [...draftBlueprint.cast];
                            updatedCast[index].behaviorVector = e.target.value as AutopilotVector;
                            updateDraft({ cast: updatedCast });
                          }}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] uppercase tracking-wider p-1 rounded focus:outline-none w-1/2 cursor-pointer"
                        >
                          <option value="ADAPTIVE">Vector: ADAPTIVE</option>
                          <option value="INSURGENT">Vector: INSURGENT</option>
                          <option value="PANIC">Vector: PANIC</option>
                        </select>
                      </div>
                      
                      <textarea 
                        value={char.description}
                        onChange={(e) => {
                          const updatedCast = [...draftBlueprint.cast];
                          updatedCast[index].description = e.target.value;
                          updateDraft({ cast: updatedCast });
                        }}
                        className="w-full bg-transparent text-zinc-400 font-mono text-[10px] resize-none focus:outline-none custom-scrollbar min-h-[40px] leading-relaxed mt-1"
                        placeholder="Psychological profile, inventory, or narrative vulnerability..."
                      />
                    </div>
                  ))}
                  
                  {(!draftBlueprint?.cast || draftBlueprint.cast.length === 0) && (
                    <div className="flex items-center justify-center h-full text-zinc-700 text-xs italic font-mono border border-dashed border-zinc-800 rounded p-4">
                      No entities assigned to simulation.
                    </div>
                  )}
                </div>

              </div>

              {/* 2. WHAT // CORE CONSTRAINT */}
              <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-4 rounded flex flex-col shadow-lg transition-colors">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">CORE CONSTRAINT (WHAT)</label>
                <textarea 
                  value={draftBlueprint?.environmentalRules || ''}
                  onChange={(e) => updateDraft({ environmentalRules: e.target.value })}
                  className="w-full bg-transparent text-zinc-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar min-h-[120px] leading-relaxed"
                  placeholder="Establish structural containment limits or systemic behavioral loops..."
                />
              </div>

              {/* 3. WHERE // ENCLOSURE ENVIRONMENT */}
              <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-4 rounded flex flex-col shadow-lg transition-colors">
                <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">ENCLOSURE ENVIRONMENT (WHERE)</label>
                <div className="text-zinc-400 text-sm font-mono whitespace-pre-wrap h-full overflow-y-auto min-h-[120px]">
                  {Array.isArray(draftBlueprint?.environmentalRules) && draftBlueprint?.environmentalRules.length 
                    ? draftBlueprint.environmentalRules.map((rule: string) => `• ${rule}`).join('\n') 
                    : draftBlueprint?.environmentalRules || "Map out localized architectures, environmental geometry, or matrix space rules..."}
                </div>
              </div>

              {/* 4. WHEN // TEMPORAL ANCHOR */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col justify-between shadow-lg">
                <div>
                  <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">TEMPORAL ANCHOR (WHEN)</label>
                  <p className="text-zinc-600 font-mono text-[11px] leading-relaxed mt-1">
                    Initial simulation entry stage. Coordinates are calculated dynamically based on active selection vectors.
                  </p>
                </div>
                <div className="text-zinc-400 font-mono text-xs pt-4 border-t border-zinc-900 flex justify-between items-center">
                  <span className="text-zinc-600 uppercase text-[9px] tracking-wider">CURRENT SYNC:</span>
                  <span className="text-cyan-400 tracking-widest font-bold">
                    {draftBlueprint?.startingTier ? `[ ${draftBlueprint.startingTier} ]` : 'AWAITING SELECTION'}
                  </span>
                </div>
              </div>

            </div>

            {/* 5. WHY / HOW // SYSTEMIC VECTOR DIRECTIVE */}
            <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-4 rounded flex flex-col shadow-lg transition-colors">
              <label className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-2">SYSTEMIC VECTOR DIRECTIVE (WHY / HOW)</label>
              <div className="text-zinc-400 text-sm font-mono whitespace-pre-wrap min-h-[140px]">
                {draftBlueprint?.globalPremise || draftBlueprint?.premise || "Calibrate primary narrative trajectories, logic overrides, or operational vector conditions..."}
              </div>
            </div>
          </div>

        </div>
          
        {/* RIGHT COLUMN: Unified Utility Tower (Spans 5 columns - Houses Chat & Validation) */}
        <div className="col-span-5 flex flex-col h-full overflow-hidden space-y-6">
          
          {/* Architect Analytical Companion Box */}
          <div className="flex-1 min-h-[300px] flex flex-col border border-zinc-900 rounded bg-zinc-950/20 shadow-xl overflow-hidden">
            <ArchitectChat />
          </div>
          
          <NarrativeLens />
          
          {/* Atmospheric Validation (Blueprint Tester) Panel */}
          <div className="shrink-0 border border-zinc-900 rounded bg-zinc-950/30 p-2 shadow-xl">
            <BlueprintTester />
          </div>

        </div>

      </div>
    </div>
  );
}

