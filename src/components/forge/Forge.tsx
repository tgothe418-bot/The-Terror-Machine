import React, { useState, useEffect } from 'react';
import { useForgeState, forgeActions, useForgeStoreInternal } from '../../store/useForgeStore';
import { useAppStore } from '../../store/useAppStore';
import { ArchitectChat } from './ArchitectChat';
import { FileDropzone } from './FileDropzone';
import { CastManager } from './CastManager';
import { SpatialManager } from './SpatialManager';
import { ArrowLeft, Trash2, MapPin, Compass, Shield, Settings } from 'lucide-react';

import { CampaignTopologyPanel } from './CampaignTopologyPanel';
import { ScenarioBaselinePanel } from './ScenarioBaselinePanel';
import { DepictionContractPanel } from './DepictionContractPanel';
import { ExportReviewModal } from './ExportReviewModal';
import { DramaticSpinePanel } from './DramaticSpinePanel';
import AiCalibrationModal from '../hub/AiCalibrationModal';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { draftBlueprint, draftRevision } = useForgeState();
  const { updateDraft, clearHistory } = forgeActions;
  const [hydrated, setHydrated] = useState(() => useForgeStoreInternal.persist.hasHydrated());
  const [timedOut, setTimedOut] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'dramatic_spine' | 'campaign'>('blueprint');
  const [isExportReviewOpen, setIsExportReviewOpen] = useState(false);
  const [isAiCalibrationOpen, setIsAiCalibrationOpen] = useState(false);

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
        className="w-full max-w-[3440px] px-8 sm:px-12 mx-auto h-screen flex flex-col items-center justify-center bg-black text-[#e6e4dc] font-mono relative overflow-hidden selection:bg-red-950 selection:text-white"
      >
        {/* Background Sigils */}
        <svg
          className="absolute top-1/2 -left-20 -translate-y-1/2 w-96 h-[600px] text-zinc-800/15 pointer-events-none stroke-current"
          viewBox="0 0 200 400"
          fill="none"
          strokeWidth="0.75"
        >
          <path d="M100 20 C60 80, 140 120, 100 180 S40 240, 100 300 S160 360, 100 380" />
          <path d="M120 40 C70 90, 130 150, 80 200 S120 270, 70 340" />
          <circle cx="100" cy="180" r="45" strokeDasharray="3 3" />
          <circle cx="100" cy="180" r="15" />
          <line x1="30" y1="180" x2="170" y2="180" />
          <line x1="100" y1="110" x2="100" y2="250" />
        </svg>

        <div className="obsidian-panel border border-stone-800 bg-[#0a0a0e] p-8 rounded-xl max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-5 relative z-10">
          <div className="w-10 h-10 border-2 border-amber-600/30 border-t-amber-400 rounded-full animate-spin shadow-lg shadow-amber-950/40" />
          <div className="space-y-1.5">
            <h3 className="text-[#e6e4dc] font-serif text-base font-bold uppercase tracking-[0.25em]">
              Restoring Forge Memory…
            </h3>
            <p className="text-xs text-stone-400 font-mono">
              Hydrating local draft and occult source baseline state.
            </p>
          </div>

          {timedOut && (
            <div className="pt-4 border-t border-stone-800/80 w-full flex flex-col items-center space-y-3 animate-in fade-in">
              <p className="text-[11px] text-amber-400/90 font-mono leading-relaxed">
                Persisted memory is taking longer than expected to resolve or may be stale.
              </p>
              <button
                id="forge-clean-start-btn"
                onClick={handleCleanStart}
                className="px-4 py-2 bg-amber-950/70 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
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
    <div className="forge-container w-full max-w-[3440px] px-6 sm:px-10 2xl:px-12 mx-auto h-screen flex flex-col bg-black text-[#e6e4dc] overflow-hidden relative selection:bg-red-950 selection:text-white">
      {/* ========================================================================= */}
      {/* Austin Osman Spare Automatic Drawing Linework Extending to Screen Margins */}
      {/* ========================================================================= */}
      <svg
        className="absolute top-0 left-0 w-[440px] h-full text-zinc-800/20 pointer-events-none stroke-current hidden xl:block"
        viewBox="0 0 440 1440"
        fill="none"
        strokeWidth="0.8"
      >
        <path
          d="M 40 0 C 120 200, 20 380, 160 560 S 260 760, 120 960 S 30 1160, 180 1340 S 240 1420, 140 1440"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 120 80 C 220 260, 80 440, 240 640 S 160 840, 220 1060 S 60 1280, 200 1440"
          vectorEffect="non-scaling-stroke"
          className="text-amber-500/10"
        />
        <circle cx="160" cy="560" r="60" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <circle cx="160" cy="560" r="18" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="560" x2="270" y2="560" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <circle cx="180" cy="1060" r="70" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
        <line x1="10" y1="200" x2="45" y2="200" vectorEffect="non-scaling-stroke" />
        <line x1="10" y1="800" x2="50" y2="800" vectorEffect="non-scaling-stroke" />
      </svg>

      <svg
        className="absolute top-0 right-0 w-[440px] h-full text-zinc-800/20 pointer-events-none stroke-current hidden xl:block"
        viewBox="0 0 440 1440"
        fill="none"
        strokeWidth="0.8"
      >
        <path
          d="M 400 0 C 320 200, 420 380, 280 560 S 180 760, 320 960 S 410 1160, 260 1340 S 200 1420, 300 1440"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 320 80 C 220 260, 360 440, 200 640 S 280 840, 220 1060 S 380 1280, 240 1440"
          vectorEffect="non-scaling-stroke"
          className="text-amber-500/10"
        />
        <circle cx="280" cy="560" r="60" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <circle cx="280" cy="560" r="18" vectorEffect="non-scaling-stroke" />
        <line x1="170" y1="560" x2="390" y2="560" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <circle cx="260" cy="1060" r="70" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
        <line x1="430" y1="200" x2="395" y2="200" vectorEffect="non-scaling-stroke" />
        <line x1="430" y1="800" x2="390" y2="800" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* HEADER AREA */}
      <header className="mb-4 2xl:mb-5 pt-4 pl-12 sm:pl-14 flex justify-between items-center border-b border-stone-800/80 pb-3 2xl:pb-4 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsAiCalibrationOpen(true)}
            className="p-2 border border-stone-800 hover:border-amber-500/60 bg-stone-950/80 hover:bg-stone-900 text-stone-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer shadow-sm group flex items-center justify-center"
            title="Apparatus Calibration & Intelligence Tiers"
          >
            <Settings className="w-4 h-4 transition-transform duration-500 group-hover:rotate-90" />
          </button>
          <button
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-stone-400 hover:text-amber-300 transition-colors text-xs 2xl:text-sm font-mono uppercase tracking-widest border border-stone-800 hover:border-amber-500/60 bg-stone-950/80 px-4 py-2 rounded-lg cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            HUB
          </button>
          <div className="flex items-center gap-3">
            <span className="jewel-amber w-2.5 h-2.5 rounded-full inline-block bg-amber-500" />
            <h2 className="text-[#e6e4dc] font-serif font-bold text-lg sm:text-2xl 2xl:text-3xl uppercase tracking-[0.25em]">
              THE FORGE <span className="text-stone-500 font-mono text-xs sm:text-sm 2xl:text-base tracking-widest font-normal">// ARCHITECTURAL DRAFTING STUDIO</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Mode Tabs */}
          <div className="flex items-center gap-1.5 border border-stone-800 rounded-lg p-1 bg-black/60 shadow-inner">
            <button
              id="forge-tab-blueprint"
              onClick={() => setActiveTab('blueprint')}
              className={`px-4 2xl:px-5 py-1.5 2xl:py-2 text-xs 2xl:text-sm font-mono tracking-widest uppercase transition-all rounded-md ${
                activeTab === 'blueprint'
                  ? 'bg-stone-900 border border-amber-600/60 text-amber-300 font-bold shadow-[0_0_12px_rgba(217,119,6,0.25)]'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Blueprint Studio
            </button>
            <button
              id="forge-tab-dramatic-spine"
              onClick={() => setActiveTab('dramatic_spine')}
              className={`px-4 2xl:px-5 py-1.5 2xl:py-2 text-xs 2xl:text-sm font-mono tracking-widest uppercase transition-all rounded-md ${
                activeTab === 'dramatic_spine'
                  ? 'bg-stone-900 border border-amber-600/60 text-amber-300 font-bold shadow-[0_0_12px_rgba(217,119,6,0.25)]'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Dramatic Spine
            </button>
            <button
              id="forge-tab-campaign"
              onClick={() => setActiveTab('campaign')}
              className={`px-4 2xl:px-5 py-1.5 2xl:py-2 text-xs 2xl:text-sm font-mono tracking-widest uppercase transition-all rounded-md ${
                activeTab === 'campaign'
                  ? 'bg-stone-900 border border-amber-600/60 text-amber-300 font-bold shadow-[0_0_12px_rgba(217,119,6,0.25)]'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Campaign Topology
            </button>
          </div>

          {/* Purge Memory Button */}
          <div className="flex items-center">
            {isConfirmingClear ? (
              <div className="flex items-center gap-4 mr-4 animate-in fade-in slide-in-from-right-2 border border-red-900/50 bg-red-950/20 px-3.5 py-1.5 rounded-lg">
                <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold">
                  Purge Memory?
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      clearHistory();
                      setIsConfirmingClear(false);
                    }}
                    className="text-xs font-mono uppercase tracking-widest text-white hover:text-red-400 transition-colors font-bold cursor-pointer"
                  >
                    Yes
                  </button>
                  <span className="text-stone-700">|</span>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="text-xs font-mono uppercase tracking-widest text-stone-400 hover:text-white transition-colors cursor-pointer"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="p-2 text-stone-500 hover:text-red-400 transition-colors mr-2 border border-transparent hover:border-red-900/50 rounded-lg hover:bg-red-950/20 cursor-pointer"
                title="Purge Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Export Review Button */}
          <button
            id="forge-open-export-review-btn"
            onClick={() => setIsExportReviewOpen(true)}
            className="px-5 2xl:px-6 py-2 2xl:py-2.5 bg-stone-950 border border-stone-700 hover:border-amber-500/80 text-[#e6e4dc] hover:text-amber-300 font-mono text-xs 2xl:text-sm transition-all relative rounded-lg cursor-pointer font-bold flex items-center gap-2.5 shadow-lg hover:shadow-amber-950/40"
          >
            <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span>[ REVIEW & EXPORT BLUEPRINT ]</span>
            <span className="text-[10px] 2xl:text-xs bg-stone-900 border border-stone-800 text-amber-400 px-2 py-0.5 rounded">
              Rev #{draftRevision || 1}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* BALANCED 3-COLUMN ULTRAWIDE STUDIO LAYOUT (3440x1440)                     */}
      {/* Left: 27% (Source Baseline & Document Extraction Contract)               */}
      {/* Center: 44% (Blueprint Editor, Setting Chorography & Topology Canvas)     */}
      {/* Right: 29% (Cast Dossiers & Architect Advisory Chat)                     */}
      {/* ========================================================================= */}
      <div className="flex-grow overflow-hidden relative z-10 pb-4">
        {activeTab === 'campaign' ? (
          <CampaignTopologyPanel />
        ) : activeTab === 'dramatic_spine' ? (
          <div className="h-full max-w-5xl mx-auto overflow-hidden p-2">
            <DramaticSpinePanel />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[27fr_44fr_29fr] gap-6 2xl:gap-8 h-full overflow-hidden">
            {/* =================================================================== */}
            {/* COLUMN 1: LEFT (25-28% -> 27%)                                     */}
            {/* Source Baseline & Document Extraction Contract                      */}
            {/* =================================================================== */}
            <div className="flex flex-col h-full overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              {/* Sector Header */}
              <div className="border-b border-stone-800/80 pb-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  <h3 className="font-serif text-xs 2xl:text-sm font-bold uppercase tracking-widest text-[#e6e4dc]">
                    [ SECTOR I // SOURCE BASELINE & EXTRACTION CONTRACT ]
                  </h3>
                </div>
                <span className="text-[10px] 2xl:text-xs font-mono text-stone-500 uppercase tracking-wider">
                  Intake & Provenance
                </span>
              </div>

              {/* Intake / Knowledgebase Dropzone */}
              <FileDropzone />

              {/* Source Baseline & Scenario Intake Candidate Review */}
              <ScenarioBaselinePanel />

              {/* Document Extraction & Depiction Contract Authoring (Packet 1B) */}
              <DepictionContractPanel />
            </div>

            {/* =================================================================== */}
            {/* COLUMN 2: CENTER (42-45% -> 44%)                                   */}
            {/* Blueprint Editor, Setting Chorography & Topology Canvas             */}
            {/* =================================================================== */}
            <div className="flex flex-col h-full overflow-y-auto space-y-6 px-1 pr-2 custom-scrollbar">
              {/* Sector Header */}
              <div className="border-b border-stone-800/80 pb-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  <h3 className="font-serif text-xs 2xl:text-sm font-bold uppercase tracking-widest text-[#e6e4dc]">
                    [ SECTOR II // BLUEPRINT ARCHITECTURE & CHOROGRAPHY ]
                  </h3>
                </div>
                <span className="text-[10px] 2xl:text-xs font-mono text-stone-500 uppercase tracking-wider">
                  Topology & Spatial Matrix
                </span>
              </div>

              {/* SCENARIO IDENTITY & SETTING CHOROGRAPHY */}
              <div className="obsidian-panel border border-stone-800/80 p-5 2xl:p-6 rounded-lg space-y-5 shadow-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* SCENARIO TITLE */}
                  <div className="flex flex-col">
                    <label className="text-[#e6e4dc] font-serif text-xs 2xl:text-sm uppercase tracking-widest mb-2 font-bold flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                        SCENARIO TITLE
                      </span>
                      {!draftBlueprint?.identity?.title && !draftBlueprint?.title && (
                        <span className="text-amber-400 font-mono text-[10px] 2xl:text-xs tracking-normal font-normal">
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
                      className="w-full h-11 2xl:h-12 bg-[#0c0c10] border border-stone-800/90 text-[#e6e4dc] font-mono text-xs sm:text-sm 2xl:text-base focus:outline-none focus:border-amber-500/80 px-3.5 rounded-lg placeholder:text-stone-600 transition-colors"
                    />
                  </div>

                  {/* STARTING LOCATION */}
                  <div className="flex flex-col">
                    <label className="text-[#e6e4dc] font-serif text-xs 2xl:text-sm uppercase tracking-widest mb-2 font-bold flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        STARTING LOCATION
                      </span>
                      {!draftBlueprint?.setting?.location && (
                        <span className="text-amber-400 font-mono text-[10px] 2xl:text-xs tracking-normal font-normal">
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
                      className="w-full h-11 2xl:h-12 bg-[#0c0c10] border border-stone-800/90 text-[#e6e4dc] font-mono text-xs sm:text-sm 2xl:text-base focus:outline-none focus:border-amber-500/80 px-3.5 rounded-lg placeholder:text-stone-600 transition-colors"
                    />
                  </div>
                </div>

                {/* SETTING CHOROGRAPHY: ATMOSPHERE & TIME PERIOD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-800/60">
                  {/* ATMOSPHERE */}
                  <div className="flex flex-col">
                    <label className="text-stone-400 font-serif text-xs 2xl:text-sm uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-stone-500" />
                      ATMOSPHERE & SENSORY ENVIRONMENT
                    </label>
                    <input
                      type="text"
                      value={draftBlueprint?.setting?.atmosphere || ''}
                      onChange={(e) =>
                        updateDraft({
                          setting: {
                            ...(draftBlueprint?.setting || {
                              location: '',
                              timePeriod: '',
                            }),
                            atmosphere: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Sub-zero chill, humming 4000K fluorescents, smell of formalin"
                      className="w-full h-11 2xl:h-12 bg-[#0c0c10] border border-stone-800/90 text-[#e6e4dc] font-mono text-xs sm:text-sm 2xl:text-base focus:outline-none focus:border-amber-500/80 px-3.5 rounded-lg placeholder:text-stone-600 transition-colors"
                    />
                  </div>

                  {/* TIME PERIOD */}
                  <div className="flex flex-col">
                    <label className="text-stone-400 font-serif text-xs 2xl:text-sm uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-stone-500" />
                      TIME PERIOD & TEMPORAL CONTEXT
                    </label>
                    <input
                      type="text"
                      value={draftBlueprint?.setting?.timePeriod || ''}
                      onChange={(e) =>
                        updateDraft({
                          setting: {
                            ...(draftBlueprint?.setting || {
                              location: '',
                              atmosphere: '',
                            }),
                            timePeriod: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Present / Isolated Deep Research Complex"
                      className="w-full h-11 2xl:h-12 bg-[#0c0c10] border border-stone-800/90 text-[#e6e4dc] font-mono text-xs sm:text-sm 2xl:text-base focus:outline-none focus:border-amber-500/80 px-3.5 rounded-lg placeholder:text-stone-600 transition-colors"
                    />
                  </div>
                </div>

                {/* SCENARIO PERSPECTIVE & VILLAIN PROTAGONIST MODE */}
                <div className="pt-3 border-t border-stone-800/80 flex flex-col gap-1.5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="forge-villain-protagonist-toggle"
                      checked={Boolean(draftBlueprint?.villainProtagonist)}
                      onChange={(e) => updateDraft({ villainProtagonist: e.target.checked })}
                      className="w-4 h-4 rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                    />
                    <span className="font-serif text-xs 2xl:text-sm uppercase tracking-wider text-[#e6e4dc] font-bold group-hover:text-amber-300 transition-colors">
                      Villain protagonist — the player character is the villain.
                    </span>
                  </label>
                  {draftBlueprint?.villainProtagonist && (
                    <p className="text-[11px] font-mono text-amber-400/90 pl-7 leading-relaxed">
                      The protagonist seat will bind your VILLAIN cast member; the antagonist seat becomes the investigator.
                    </p>
                  )}
                </div>
              </div>

              {/* Spatial Topology Matrix & Chorography Canvas */}
              <SpatialManager />

              {/* DRAMATIC SPINE & PACING OVERVIEW (HG2) */}
              <div className="obsidian-panel border border-stone-800/80 p-4 2xl:p-5 rounded-lg flex items-center justify-between shadow-2xl transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    <span className="font-serif text-xs 2xl:text-sm font-bold uppercase tracking-widest text-[#e6e4dc]">
                      DRAMATIC SPINE & PACING
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-amber-300">
                      {draftBlueprint?.dramaticSpine?.pacingProfile || 'BALANCED_HORROR'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-stone-400">
                    {(draftBlueprint?.dramaticSpine?.impendingClocks || []).length} Impending Clock(s) &bull; {(draftBlueprint?.dramaticSpine?.milestoneConditions || []).length} Causal Gate(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dramatic_spine')}
                  className="px-3.5 py-1.5 bg-stone-950 hover:bg-stone-900 border border-amber-600/70 text-amber-300 text-xs font-mono rounded cursor-pointer transition-all font-bold"
                >
                  [ CONFIGURE SPINE ]
                </button>
              </div>

              {/* WORLD RULES & ESOTERIC CONSTRAINTS */}
              <div className="obsidian-panel border border-stone-800/80 focus-within:border-amber-500/60 p-5 2xl:p-6 rounded-lg flex flex-col shadow-2xl transition-all">
                <label className="text-[#e6e4dc] font-serif text-xs 2xl:text-sm uppercase tracking-widest mb-2.5 font-bold flex items-center gap-2">
                  <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  WORLD RULES & ESOTERIC CONSTRAINTS
                </label>
                <textarea
                  value={draftBlueprint?.environmentalRules || ''}
                  onChange={(e) => updateDraft({ environmentalRules: e.target.value })}
                  className="w-full bg-[#0c0c10] border border-stone-800/90 text-[#e6e4dc] font-mono text-xs sm:text-sm 2xl:text-base resize-none focus:outline-none focus:border-amber-500/80 p-3.5 rounded-lg custom-scrollbar min-h-[120px] 2xl:min-h-[150px] leading-relaxed placeholder:text-stone-600 transition-colors"
                  placeholder="Define the rules this world must obey: limits, conditions, places, and systemic behavior."
                />
              </div>

              {/* SCENARIO PREMISE & INCITING SHOCK */}
              <div className="obsidian-panel border border-stone-800/80 focus-within:border-amber-500/60 p-5 2xl:p-6 rounded-lg flex flex-col shadow-2xl transition-all">
                <label className="text-[#e6e4dc] font-serif text-xs 2xl:text-sm uppercase tracking-widest mb-2.5 font-bold flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    SCENARIO PREMISE & INCITING SHOCK
                  </span>
                  {!draftBlueprint?.globalPremise && !draftBlueprint?.premise && (
                    <span className="text-amber-400 font-mono text-[10px] 2xl:text-xs tracking-normal font-normal">
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
                  className="w-full bg-[#0c0c10] border border-stone-800/90 text-[#e6e4dc] font-mono text-xs sm:text-sm 2xl:text-base resize-none focus:outline-none focus:border-amber-500/80 p-3.5 rounded-lg custom-scrollbar min-h-[120px] 2xl:min-h-[150px] leading-relaxed placeholder:text-stone-600 transition-colors"
                  placeholder="Calibrate primary narrative trajectories, logic overrides, or operational vector conditions..."
                />
              </div>
            </div>

            {/* =================================================================== */}
            {/* COLUMN 3: RIGHT (28-30% -> 29%)                                    */}
            {/* Cast Dossiers & Architect Advisory Chat                             */}
            {/* =================================================================== */}
            <div className="flex flex-col h-full overflow-y-auto space-y-6 pl-1 custom-scrollbar">
              {/* Sector Header */}
              <div className="border-b border-stone-800/80 pb-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  <h3 className="font-serif text-xs 2xl:text-sm font-bold uppercase tracking-widest text-[#e6e4dc]">
                    [ SECTOR III // CAST DOSSIERS & ARCHITECT ADVISORY ]
                  </h3>
                </div>
                <span className="text-[10px] 2xl:text-xs font-mono text-stone-500 uppercase tracking-wider">
                  Mortal Cohort & AI Studio
                </span>
              </div>

              {/* Architect Analytical Companion Box (Advisory Chat) */}
              <div className="h-[380px] 2xl:h-[440px] flex flex-col border border-stone-800/80 rounded-lg obsidian-panel shadow-2xl overflow-hidden shrink-0">
                <ArchitectChat />
              </div>

              {/* Cast Dossiers Manager */}
              <div className="flex-grow">
                <CastManager />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Review & Compilation Modal (Packet 1B / 06B) */}
      {isExportReviewOpen && (
        <ExportReviewModal
          isOpen={true}
          onClose={() => setIsExportReviewOpen(false)}
        />
      )}

      {/* AI Calibration Modal */}
      <AiCalibrationModal
        isOpen={isAiCalibrationOpen}
        onClose={() => setIsAiCalibrationOpen(false)}
      />
    </div>
  );
}
