import React, { useState, useEffect } from 'react';
import { useForgeState, forgeActions, useForgeStoreInternal } from '../../store/useForgeStore';
import { useAppStore } from '../../store/useAppStore';
import { ArchitectChat } from './ArchitectChat';
import { FileDropzone } from './FileDropzone';
import { MatrixSelector } from './MatrixSelector';
import { SpatialManager } from './SpatialManager';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { AutopilotVector } from '../../types';

import { CampaignTopologyPanel } from './CampaignTopologyPanel';
import { ScenarioBaselinePanel } from './ScenarioBaselinePanel';
import { prepareBlueprintExport } from '../../lib/compileBlueprintDraft';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { draftBlueprint } = useForgeState();
  const { updateDraft, clearHistory } = forgeActions;
  const [hydrated, setHydrated] = useState(() => useForgeStoreInternal.persist.hasHydrated());
  const [timedOut, setTimedOut] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'campaign'>('blueprint');
  const [exportError, setExportError] = useState<string | null>(null);

  // Handle hydration with fallback recovery timeout
  useEffect(() => {
    const unsub = useForgeStoreInternal.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useForgeStoreInternal.persist.onFinishHydration(() => setHydrated(true));

    const timer = setTimeout(() => {
      if (!useForgeStoreInternal.persist.hasHydrated()) {
        setTimedOut(true);
      }
    }, 2500);

    return () => {
      unsub();
      unsubFinish();
      clearTimeout(timer);
    };
  }, []);

  const handleCleanStart = async () => {
    try {
      await useForgeStoreInternal.persist.clearStorage();
    } catch (e) {
      console.warn('[FORGE RECOVERY] Failed to clear storage:', e);
    }
    clearHistory();
    setHydrated(true);
  };

  if (!hydrated) {
    return (
      <div
        id="forge-restoring-memory-screen"
        className="w-[95vw] max-w-[2560px] mx-auto p-8 h-screen flex flex-col items-center justify-center bg-black text-zinc-300 font-mono"
      >
        <div className="border border-zinc-800 bg-zinc-950 p-8 rounded max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="space-y-1">
            <h3 className="text-zinc-200 text-sm font-bold uppercase tracking-widest">
              Restoring Forge memory…
            </h3>
            <p className="text-xs text-zinc-500">
              Hydrating local draft and source baseline state.
            </p>
          </div>

          {timedOut && (
            <div className="pt-4 border-t border-zinc-800/80 w-full flex flex-col items-center space-y-3 animate-in fade-in">
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                Persisted memory is taking longer than expected to resolve or may be stale.
              </p>
              <button
                id="forge-clean-start-btn"
                onClick={handleCleanStart}
                className="px-4 py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-200 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Start with a clean Forge
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="forge-container w-[95vw] max-w-[2560px] mx-auto p-8 h-screen flex flex-col bg-black text-zinc-300 overflow-hidden">
      {/* HEADER AREA */}
      <div className="mb-6 flex justify-between items-center border-b border-zinc-800 pb-4 shrink-0">
        <h2 className="text-zinc-400 font-mono text-lg sm:text-xl uppercase tracking-widest flex items-center gap-4">
          <button
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs uppercase tracking-widest border border-zinc-800 px-3 py-1.5 rounded cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            HUB
          </button>
          [ THE FORGE // ARCHITECTURAL DRAFTING ]
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-zinc-800 rounded p-1 bg-zinc-950">
            <button
              onClick={() => setActiveTab('blueprint')}
              className={`px-3.5 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors rounded ${activeTab === 'blueprint' ? 'bg-zinc-800 text-cyan-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Blueprint
            </button>
            <button
              onClick={() => setActiveTab('campaign')}
              className={`px-3.5 py-1.5 text-xs font-mono tracking-widest uppercase transition-colors rounded ${activeTab === 'campaign' ? 'bg-zinc-800 text-cyan-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Campaign
            </button>
          </div>
          <div className="flex items-center">
            {isConfirmingClear ? (
              <div className="flex items-center gap-4 mr-4 animate-in fade-in slide-in-from-right-2 border border-red-900/50 bg-red-950/20 px-3.5 py-1.5 rounded">
                <span className="text-xs uppercase tracking-widest text-red-500 font-bold">
                  Purge Memory?
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      clearHistory();
                      setIsConfirmingClear(false);
                    }}
                    className="text-xs uppercase tracking-widest text-white hover:text-red-400 transition-colors font-bold cursor-pointer"
                  >
                    Yes
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="p-2 text-zinc-500 hover:text-red-500 transition-colors mr-2 border border-transparent hover:border-red-900/50 rounded hover:bg-red-950/20 cursor-pointer"
                title="Purge Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (draftBlueprint) {
                try {
                  setExportError(null);
                  const artifact = prepareBlueprintExport(draftBlueprint);

                  const dataStr =
                    'data:text/json;charset=utf-8,' + encodeURIComponent(artifact.json);
                  const downloadAnchorNode = document.createElement('a');
                  downloadAnchorNode.setAttribute('href', dataStr);
                  downloadAnchorNode.setAttribute('download', artifact.fileName);
                  document.body.appendChild(downloadAnchorNode); // required for firefox
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                } catch (e: unknown) {
                  const error = e as { errors?: unknown; message?: string };
                  if (error.errors) {
                    setExportError(JSON.stringify(error.errors, null, 2));
                  } else {
                    setExportError(error.message || String(error));
                  }
                }
              }
            }}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs hover:bg-zinc-800 hover:text-cyan-400 transition-colors relative rounded cursor-pointer font-bold"
          >
            [ EXPORT BLUEPRINT TO ENGINE ]
            {exportError && (
              <div className="absolute top-full mt-2 right-0 bg-red-950/90 border border-red-900 text-red-400 text-xs font-mono p-4 rounded z-50 max-w-lg max-h-96 overflow-y-auto w-max text-left shadow-2xl backdrop-blur-md">
                <div className="flex justify-between items-center mb-4 font-bold shrink-0 border-b border-red-900/50 pb-2">
                  <span className="text-red-500 uppercase tracking-widest">
                    [ EXPORT VALIDATION FAILED ]
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportError(null);
                    }}
                    className="text-red-500 hover:text-white px-2 py-1 bg-red-900/30 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-xs">{exportError}</pre>
                <div className="mt-4 pt-2 border-t border-red-900/50 text-red-400 italic">
                  Fix the highlighted discrepancies in the Forge UI before exporting.
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-12 gap-8 flex-grow overflow-hidden">
        {activeTab === 'campaign' ? (
          <CampaignTopologyPanel />
        ) : (
          <>
            {/* LEFT COLUMN: Expanded Parameter Console & Selectors (Spans 7 columns for direct typing depth) */}
            <div className="col-span-7 flex flex-col space-y-6 overflow-y-auto pr-4 pb-8 custom-scrollbar">
              {/* Intake/Knowledgebase Dropzone */}
              <FileDropzone />

              {/* Source Baseline & Scenario Intake Candidate Review */}
              <ScenarioBaselinePanel />

              {/* SCENARIO IDENTITY (TITLE & STARTING LOCATION) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SCENARIO TITLE */}
                <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-4 rounded flex flex-col shadow-lg transition-colors">
                  <label className="text-zinc-400 font-mono text-xs uppercase tracking-wider mb-2 font-bold flex justify-between items-center">
                    <span>SCENARIO TITLE</span>
                    {!draftBlueprint?.identity?.title && !draftBlueprint?.title && (
                      <span className="text-amber-500/80 font-normal text-[10px] tracking-normal">
                        Required
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={draftBlueprint?.identity?.title || draftBlueprint?.title || ''}
                    onChange={(e) =>
                      updateDraft({
                        title: e.target.value,
                        identity: {
                          ...(draftBlueprint?.identity || {
                            version: '1.0',
                            author: '',
                            thematicAnchor: '',
                          }),
                          title: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Sub-Level 4 Containment"
                    className="w-full bg-transparent text-zinc-200 font-mono text-xs sm:text-sm focus:outline-none border-b border-zinc-800 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
                  />
                </div>

                {/* STARTING LOCATION */}
                <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-4 rounded flex flex-col shadow-lg transition-colors">
                  <label className="text-zinc-400 font-mono text-xs uppercase tracking-wider mb-2 font-bold flex justify-between items-center">
                    <span>STARTING LOCATION</span>
                    {!draftBlueprint?.setting?.location && (
                      <span className="text-amber-500/80 font-normal text-[10px] tracking-normal">
                        Required
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={draftBlueprint?.setting?.location || ''}
                    onChange={(e) =>
                      updateDraft({
                        setting: {
                          ...(draftBlueprint?.setting || {
                            atmosphere: '',
                            timePeriod: '',
                          }),
                          location: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Observation Room Delta"
                    className="w-full bg-transparent text-zinc-200 font-mono text-xs sm:text-sm focus:outline-none border-b border-zinc-800 focus:border-cyan-500/80 pb-1 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Matrix Coordinates */}
              <MatrixSelector />

              {/* Spatial Topology Matrix */}
              <SpatialManager />

              {/* WORLD RULES */}
              <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-5 rounded flex flex-col shadow-lg transition-colors">
                <label className="text-zinc-400 font-mono text-xs uppercase tracking-wider mb-2 font-bold">
                  WORLD RULES
                </label>
                <textarea
                  value={draftBlueprint?.environmentalRules || ''}
                  onChange={(e) => updateDraft({ environmentalRules: e.target.value })}
                  className="w-full bg-transparent text-zinc-200 font-mono text-xs sm:text-sm resize-none focus:outline-none custom-scrollbar min-h-[100px] leading-relaxed placeholder:text-zinc-600"
                  placeholder="Define the rules this world must obey: limits, conditions, places, and systemic behavior."
                />
              </div>

              {/* SCENARIO PREMISE */}
              <div className="bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-5 rounded flex flex-col shadow-lg transition-colors">
                <label className="text-zinc-400 font-mono text-xs uppercase tracking-widest mb-2 font-bold flex justify-between items-center">
                  <span>SCENARIO PREMISE</span>
                  {!draftBlueprint?.globalPremise && !draftBlueprint?.premise && (
                    <span className="text-amber-500/80 font-normal text-[10px] tracking-normal">
                      Required
                    </span>
                  )}
                </label>
                <textarea
                  value={draftBlueprint?.globalPremise || draftBlueprint?.premise || ''}
                  onChange={(e) =>
                    updateDraft({
                      premise: e.target.value,
                      globalPremise: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full bg-transparent text-zinc-200 font-mono text-xs sm:text-sm resize-none focus:outline-none custom-scrollbar min-h-[100px] leading-relaxed placeholder:text-zinc-600"
                  placeholder="Calibrate primary narrative trajectories, logic overrides, or operational vector conditions..."
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Unified Utility Tower (Spans 5 columns - Houses Architect & Cast) */}
            <div className="col-span-5 flex flex-col h-full overflow-hidden space-y-6">
              {/* Architect Analytical Companion Box */}
              <div className="min-h-[300px] max-h-[45vh] flex flex-col border border-zinc-900 rounded bg-zinc-950/20 shadow-xl overflow-hidden shrink-0">
                <ArchitectChat />
              </div>

              {/* Cast Authoring Card */}
              <div className="flex-1 min-h-0 bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-5 rounded flex flex-col shadow-lg transition-colors overflow-hidden">
                {/* Header & Add Button */}
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <label className="text-zinc-400 font-mono text-xs uppercase tracking-wider font-bold">
                    CAST
                  </label>
                  <button
                    onClick={() => {
                      const currentCast = draftBlueprint?.cast || [];
                      updateDraft({
                        cast: [
                          ...currentCast,
                          {
                            id: `char-${Date.now()}`,
                            name: 'New Entity',
                            description: '',
                            behaviorVector: 'ADAPTIVE',
                          },
                        ],
                      });
                    }}
                    className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded border border-zinc-700 transition-colors shadow-sm cursor-pointer"
                  >
                    [+ ADD CAST MEMBER]
                  </button>
                </div>

                {/* Dynamic Roster List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 min-h-0">
                  {draftBlueprint?.cast?.map((char, index) => (
                    <div
                      key={char.id}
                      className="p-3.5 bg-[#050505] border border-zinc-800/80 rounded flex flex-col gap-2.5 relative group shadow-inner"
                    >
                      {/* Delete Button (Appears on Hover) */}
                      <button
                        onClick={() => {
                          const updatedCast = (draftBlueprint.cast || []).filter(
                            (c) => c.id !== char.id
                          );
                          updateDraft({ cast: updatedCast });
                        }}
                        className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/70 rounded px-1.5 py-0.5 cursor-pointer"
                        title="Remove Cast Member"
                      >
                        ✕
                      </button>

                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={char.name}
                          onChange={(e) => {
                            const updatedCast = (draftBlueprint.cast || []).map((c, i) =>
                              i === index ? { ...c, name: e.target.value } : c
                            );
                            updateDraft({ cast: updatedCast });
                          }}
                          className="bg-transparent border-b border-zinc-800 text-zinc-200 font-bold text-xs sm:text-sm focus:outline-none w-1/2 focus:border-zinc-500 pb-1"
                          placeholder="Entity Name"
                        />
                        <select
                          value={char.behaviorVector || 'ADAPTIVE'}
                          onChange={(e) => {
                            const updatedCast = (draftBlueprint.cast || []).map((c, i) =>
                              i === index
                                ? { ...c, behaviorVector: e.target.value as AutopilotVector }
                                : c
                            );
                            updateDraft({ cast: updatedCast });
                          }}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs uppercase tracking-wider p-1.5 rounded focus:outline-none w-1/2 cursor-pointer font-mono"
                        >
                          <option value="ADAPTIVE">Vector: ADAPTIVE</option>
                          <option value="INSURGENT">Vector: INSURGENT</option>
                          <option value="PANIC">Vector: PANIC</option>
                        </select>
                      </div>

                      <textarea
                        value={char.description || ''}
                        onChange={(e) => {
                          const updatedCast = (draftBlueprint.cast || []).map((c, i) =>
                            i === index ? { ...c, description: e.target.value } : c
                          );
                          updateDraft({ cast: updatedCast });
                        }}
                        className="w-full bg-transparent text-zinc-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar min-h-[44px] leading-relaxed mt-1"
                        placeholder="Psychological profile, inventory, or narrative vulnerability..."
                      />

                      {/* Cast Expression Profile Guidance (if present) */}
                      {char.expressionProfile && (
                        <div className="mt-1 pt-2 border-t border-zinc-900 flex flex-col gap-1.5 text-[11px] font-mono text-zinc-400">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-cyan-400">
                              Expression Guidance
                            </span>
                            {char.expressionProfile.communicationModes &&
                              char.expressionProfile.communicationModes.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {char.expressionProfile.communicationModes.map((mode, mi) => (
                                    <span
                                      key={mi}
                                      className="text-[9px] px-1.5 py-0.2 bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 rounded uppercase"
                                    >
                                      {mode}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                          {char.expressionProfile.expressionGuidance && (
                            <p className="text-[10px] text-zinc-300 leading-snug">
                              {char.expressionProfile.expressionGuidance}
                            </p>
                          )}
                          {char.expressionProfile.silenceGuidance && (
                            <p className="text-[10px] text-zinc-500 italic leading-snug">
                              Silence: {char.expressionProfile.silenceGuidance}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {(!draftBlueprint?.cast || draftBlueprint.cast.length === 0) && (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-xs italic font-mono border border-dashed border-zinc-800 rounded p-6">
                      No cast members have been added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
