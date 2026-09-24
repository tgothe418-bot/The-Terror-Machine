import React, { useState, useEffect, useCallback } from 'react';
import {
  Hammer,
  Eye,
  BookOpen,
  Settings,
  AlertTriangle,
  RefreshCw,
  Flame,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { forgeActions, useForgeState } from '../../store/useForgeStore';
import { useEngineStore } from '../../core/store';
import { motion, AnimatePresence } from 'motion/react';
import AiCalibrationModal from './AiCalibrationModal';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import type { ForgeDraftCastMember, ForgeDraftTopology } from '../../types/forge';
import blackIronMortuary from '../../data/blueprints/black_iron_mortuary.json';
import silverRestLodge from '../../data/blueprints/silver_rest_lodge.json';
import theRefinement from '../../data/blueprints/the_refinement.json';

export default function WelcomeScreen() {
  const setPhase = useAppStore((state) => state.setPhase);
  const clearVoice = useVoiceStore((state) => state.clearHistory);
  const { clearHistory: clearForge, updateDraft } = forgeActions;
  const clearEngine = useEngineStore((state) => state.clearBlueprint);
  const setEngineBlueprint = useEngineStore((state) => state.setBlueprint);
  const { draftBlueprint, draftRevision } = useForgeState();

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTier, setAiTier] = useState<'free' | 'paid'>('free');
  const [aiModel, setAiModel] = useState<string>('gemini-3.6-flash');
  const fetchAiConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        const data = await res.json();
        setAiTier(data.tier || 'free');
        setAiModel(data.model || 'gemini-3.6-flash');
      }
    } catch {
      // ignore network blips on initial render
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/ai/config');
        if (res.ok && !ignore) {
          const data = await res.json();
          setAiTier(data.tier || 'free');
          setAiModel(data.model || 'gemini-3.6-flash');
        }
      } catch {
        // ignore initial network error
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleFullReset = () => {
    clearVoice();
    clearForge();
    clearEngine();
    useAppStore.getState().resetSession();
    setIsConfirmingReset(false);
  };

  const handleLaunchBlackIron = () => {
    try {
      const validated = normalizeBlueprint(blackIronMortuary);
      setEngineBlueprint(validated, 'protagonist');
      setPhase('engine');
    } catch (err) {
      console.error('[WELCOME] Failed to load Black Iron Mortuary:', err);
      setPhase('engine');
    }
  };

  const handleInspectBlackIronInForge = () => {
    updateDraft({
      title: blackIronMortuary.title,
      identity: blackIronMortuary.identity,
      setting: blackIronMortuary.setting,
      premise: blackIronMortuary.premise,
      globalPremise: blackIronMortuary.globalPremise,
      environmentalRules: Array.isArray(blackIronMortuary.environmentalRules)
        ? blackIronMortuary.environmentalRules.join('\n')
        : (blackIronMortuary.environmentalRules || ''),
      cast: blackIronMortuary.cast as unknown as ForgeDraftCastMember[],
      topology: blackIronMortuary.topology as unknown as ForgeDraftTopology,
    });
    setPhase('forge');
  };

  const handleLaunchSilverRest = () => {
    try {
      const validated = normalizeBlueprint(silverRestLodge);
      setEngineBlueprint(validated, 'protagonist');
      setPhase('engine');
    } catch (err) {
      console.error('[WELCOME] Failed to load The Silver Rest Lodge:', err);
      setPhase('engine');
    }
  };

  const handleInspectSilverRestInForge = () => {
    updateDraft({
      title: silverRestLodge.title,
      identity: silverRestLodge.identity,
      setting: silverRestLodge.setting,
      premise: silverRestLodge.premise,
      globalPremise: silverRestLodge.globalPremise,
      environmentalRules: Array.isArray(silverRestLodge.environmentalRules)
        ? silverRestLodge.environmentalRules.join('\n')
        : (silverRestLodge.environmentalRules || ''),
      cast: silverRestLodge.cast as unknown as ForgeDraftCastMember[],
      topology: silverRestLodge.topology as unknown as ForgeDraftTopology,
    });
    setPhase('forge');
  };

  const handleLaunchTheRefinement = () => {
    try {
      const validated = normalizeBlueprint(theRefinement);
      setEngineBlueprint(validated, 'protagonist');
      setPhase('engine');
    } catch (err) {
      console.error('[WELCOME] Failed to load The Refinement:', err);
      setPhase('engine');
    }
  };

  const handleInspectTheRefinementInForge = () => {
    updateDraft({
      title: theRefinement.title,
      identity: theRefinement.identity,
      setting: theRefinement.setting,
      premise: theRefinement.premise,
      globalPremise: theRefinement.globalPremise,
      environmentalRules: Array.isArray(theRefinement.environmentalRules)
        ? theRefinement.environmentalRules.join('\n')
        : (theRefinement.environmentalRules || ''),
      cast: theRefinement.cast as unknown as ForgeDraftCastMember[],
      topology: theRefinement.topology as unknown as ForgeDraftTopology,
    });
    setPhase('forge');
  };

  const handleLaunchDraftInEngine = () => {
    if (!draftBlueprint) {
      setPhase('engine');
      return;
    }
    try {
      const validated = normalizeBlueprint(draftBlueprint);
      setEngineBlueprint(validated, 'protagonist');
      setPhase('engine');
    } catch {
      setPhase('forge');
    }
  };

  const handleLoadArchetypeInForge = () => {
    updateDraft({
      title: 'Sub-Level 4 Containment',
      identity: {
        title: 'Sub-Level 4 Containment',
        version: '1.0',
        author: 'The Terror Machine Forge',
        thematicAnchor: 'Deep Biosphere Quarantine & High-Friction Atmospheric Depletion',
      },
      setting: {
        location: 'Sub-Level 4 Bio-Isolation Ward',
        atmosphere: 'Stale pressurized air, emergency amber strobes, dripping condensation, silent airlock hydraulics',
        timePeriod: 'Present Day Subterranean Complex',
      },
      environmentalRules: 'Atmospheric scrubber failure induces carbon monoxide buildup.\nEmergency bulkheads require physical manual crank to open.\nPneumatic doors seal upon biological pathogen alarm.',
      globalPremise: 'The subterranean research biosphere has lost primary life support. With the containment seals locked down, surviving personnel must navigate the unlit facility before atmospheric scrubbers exhaust.',
      premise: 'The subterranean research biosphere has lost primary life support. With the containment seals locked down, surviving personnel must navigate the unlit facility before atmospheric scrubbers exhaust.',
    });
    setPhase('forge');
  };

  const activeDraftTitle = draftBlueprint?.identity?.title || draftBlueprint?.title || '';

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100 flex flex-col justify-between p-6 sm:p-10 2xl:p-12 font-sans overflow-x-hidden relative selection:bg-red-950 selection:text-white">
      {/* ========================================================================= */}
      {/* Austin Osman Spare Automatic Drawing Linework - Extending to Margins     */}
      {/* ========================================================================= */}

      {/* Left Margin Wing Linework (Spans from x:0 toward the canvas center) */}
      <svg
        className="absolute top-0 left-0 w-[520px] h-full text-zinc-800/20 pointer-events-none stroke-current hidden xl:block"
        viewBox="0 0 520 1440"
        fill="none"
        strokeWidth="0.85"
      >
        {/* Esoteric Automatic Drawing Curves */}
        <path
          d="M 60 0 C 140 180, 20 320, 180 480 S 320 680, 160 840 S 40 1020, 220 1200 S 360 1340, 180 1440"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 140 60 C 260 220, 110 380, 310 540 S 210 740, 290 920 S 90 1140, 240 1380"
          vectorEffect="non-scaling-stroke"
          className="text-amber-500/10"
        />
        <path
          d="M 20 200 C 180 280, 80 440, 240 600 S 140 820, 340 1000 S 60 1240, 280 1440"
          vectorEffect="non-scaling-stroke"
        />
        {/* Austin Osman Spare Concentric Sigil Nodes */}
        <circle cx="210" cy="480" r="80" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <circle cx="210" cy="480" r="32" vectorEffect="non-scaling-stroke" />
        <circle cx="210" cy="480" r="6" fill="currentColor" />
        <line x1="80" y1="480" x2="340" y2="480" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        <line x1="210" y1="350" x2="210" y2="610" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />

        {/* Mid-Lower Talismanic Glyph */}
        <circle cx="240" cy="980" r="95" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
        <circle cx="240" cy="980" r="22" vectorEffect="non-scaling-stroke" />
        <path
          d="M 160 980 C 200 930, 280 930, 320 980 S 280 1030, 160 980 Z"
          vectorEffect="non-scaling-stroke"
          className="text-red-900/20"
        />
        <line x1="90" y1="980" x2="390" y2="980" vectorEffect="non-scaling-stroke" />

        {/* Marginal Talismanic Tick Lines */}
        <line x1="10" y1="120" x2="45" y2="120" vectorEffect="non-scaling-stroke" />
        <line x1="10" y1="360" x2="55" y2="360" vectorEffect="non-scaling-stroke" />
        <line x1="10" y1="720" x2="65" y2="720" vectorEffect="non-scaling-stroke" />
        <line x1="10" y1="1080" x2="45" y2="1080" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Right Margin Wing Linework (Spans from x:3440 toward the canvas center) */}
      <svg
        className="absolute top-0 right-0 w-[520px] h-full text-zinc-800/20 pointer-events-none stroke-current hidden xl:block"
        viewBox="0 0 520 1440"
        fill="none"
        strokeWidth="0.85"
      >
        {/* Complementary Organic Curves */}
        <path
          d="M 460 0 C 380 180, 500 320, 340 480 S 200 680, 360 840 S 480 1020, 300 1200 S 160 1340, 340 1440"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 380 60 C 260 220, 410 380, 210 540 S 310 740, 230 920 S 430 1140, 280 1380"
          vectorEffect="non-scaling-stroke"
          className="text-amber-500/10"
        />
        <path
          d="M 500 200 C 340 280, 440 440, 280 600 S 380 820, 180 1000 S 460 1240, 240 1440"
          vectorEffect="non-scaling-stroke"
        />
        {/* Right Talismanic Sigil Nodes */}
        <circle cx="310" cy="480" r="80" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <circle cx="310" cy="480" r="32" vectorEffect="non-scaling-stroke" />
        <circle cx="310" cy="480" r="6" fill="currentColor" />
        <line x1="180" y1="480" x2="440" y2="480" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        <line x1="310" y1="350" x2="310" y2="610" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />

        {/* Lower Right Scrying Lens */}
        <circle cx="280" cy="980" r="95" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />
        <circle cx="280" cy="980" r="22" vectorEffect="non-scaling-stroke" />
        <path
          d="M 200 980 C 240 930, 320 930, 360 980 S 320 1030, 200 980 Z"
          vectorEffect="non-scaling-stroke"
          className="text-red-900/20"
        />
        <line x1="130" y1="980" x2="430" y2="980" vectorEffect="non-scaling-stroke" />

        {/* Marginal Talismanic Tick Lines */}
        <line x1="510" y1="120" x2="475" y2="120" vectorEffect="non-scaling-stroke" />
        <line x1="510" y1="360" x2="465" y2="360" vectorEffect="non-scaling-stroke" />
        <line x1="510" y1="720" x2="455" y2="720" vectorEffect="non-scaling-stroke" />
        <line x1="510" y1="1080" x2="475" y2="1080" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Top Margin Interconnecting Runic Ribbon */}
      <div className="absolute top-0 left-0 w-full h-8 pointer-events-none overflow-hidden opacity-30">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mt-4" />
      </div>

      {/* Top Left: Settings Cogwheel (Tradition) */}
      <div className="absolute top-8 left-8 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          title="Apparatus Calibration & Intelligence Tiers"
          className="p-3.5 border border-zinc-800/80 bg-zinc-950/80 hover:border-amber-500/60 hover:bg-zinc-900 text-zinc-400 hover:text-amber-400 rounded-lg transition-all duration-300 shadow-2xl cursor-pointer group backdrop-blur-md flex items-center gap-2.5"
        >
          <Settings className="w-5 h-5 transition-transform duration-700 group-hover:rotate-90" />
          <span className="font-mono text-xs tracking-widest uppercase hidden md:inline text-zinc-400 group-hover:text-amber-300">
            Calibration
          </span>
        </button>
      </div>

      {/* Top Right: Telemetry Jewels */}
      <div className="absolute top-8 right-8 z-30 hidden sm:flex items-center gap-4 px-5 py-2.5 border border-zinc-800/80 bg-zinc-950/80 rounded-full font-mono text-[11px] tracking-wider text-zinc-400 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2">
          <span className="jewel-amber w-2 h-2 rounded-full inline-block bg-amber-500 animate-pulse" />
          <span className="uppercase tracking-widest text-zinc-300 font-medium">{aiModel}</span>
        </div>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-500 uppercase tracking-wider">
          {aiTier === 'free' ? 'Tier I (Free)' : 'Tier II (Pro)'}
        </span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Neural Link: Bound
        </span>
      </div>

      {/* Primary Ultrawide Altar Canvas (Maximized for 3440px Ultrawide) */}
      <div className="w-full max-w-[3440px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 my-auto py-8 relative z-10 space-y-10 2xl:space-y-14">
        {/* Altar Master Header */}
        <header className="text-center space-y-4">
          <div className="flex justify-center items-center gap-6">
            <div className="h-[1px] w-36 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
            <div className="w-9 h-9 rounded-full border border-amber-600/50 bg-zinc-950 flex items-center justify-center shadow-xl shadow-amber-950/30">
              <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div className="h-[1px] w-36 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
          </div>

          <div className="space-y-2.5">
            <h1 className="text-4xl sm:text-6xl 2xl:text-7xl font-display font-black tracking-[0.35em] sm:tracking-[0.45em] uppercase text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              THE TERROR <span className="text-red-600">MACHINE</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-400 font-mono text-xs sm:text-sm tracking-[0.25em] uppercase">
              <span>Grimoire of the Unmade</span>
              <span className="text-zinc-600">//</span>
              <span>Ritual Apparatus</span>
              <span className="text-zinc-600">//</span>
              <span>Causal Scrying Chamber</span>
            </div>
          </div>

          {/* Mechanical Rolling Tape Counter & Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-1">
            <div className="flex items-center gap-3 border border-stone-800/80 bg-zinc-950/80 px-4 py-1 rounded-full shadow-inner">
              <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-400">
                RECORDED CYCLES
              </span>
              <div className="tape-counter inline-flex px-1.5 py-0.5 rounded text-sm font-mono tracking-widest text-zinc-200">
                <span className="tape-counter-digit px-2 py-0.5">0</span>
                <span className="tape-counter-digit px-2 py-0.5">0</span>
                <span className="tape-counter-digit px-2 py-0.5">2</span>
                <span className="tape-counter-digit px-2 py-0.5">3</span>
                <span className="tape-counter-digit px-2 py-0.5 text-amber-400 font-bold">8</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4 text-[11px] font-mono uppercase tracking-widest text-stone-500">
              <span>CAUSAL ANCHOR: <strong className="text-stone-300">LOCKED</strong></span>
              <span>•</span>
              <span>SPATIAL CHOROGRAPHY: <strong className="text-stone-300">COHERENT</strong></span>
              <span>•</span>
              <span>MORTAL LEDGER: <strong className="text-stone-300">ACTIVE</strong></span>
            </div>
          </div>
        </header>

        {/* Three Altar Portals (Spread across the 3440px Ultrawide Canvas) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 2xl:gap-10 w-full items-stretch">
          {/* PORTAL 1: THE FORGE */}
          <button
            type="button"
            onClick={() => setPhase('forge')}
            className="group relative p-8 2xl:p-10 border border-zinc-800/80 hover:border-amber-500/80 transition-all duration-700 text-left obsidian-panel rounded-xl cursor-pointer hover:shadow-2xl hover:shadow-amber-950/30 overflow-hidden flex flex-col justify-between min-h-[380px] 2xl:min-h-[420px]"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-bl-full pointer-events-none transition-transform duration-700 group-hover:scale-125" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-4 border border-zinc-800/80 bg-zinc-950 rounded-lg group-hover:border-amber-500/60 group-hover:bg-amber-950/20 transition-all shadow-md">
                  <Hammer className="w-7 h-7 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-widest uppercase bg-amber-950/40 text-amber-400 border border-amber-800/40 px-2.5 py-1 rounded">
                    STUDIO ARMED
                  </span>
                  <span className="font-mono text-xs text-zinc-400 group-hover:text-amber-400 uppercase tracking-[0.25em] transition-colors font-semibold">
                    [ INSCRIBE BLUEPRINT ]
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl 2xl:text-4xl font-serif font-bold tracking-wider uppercase text-zinc-100 group-hover:text-amber-200 transition-colors">
                  The Forge
                </h2>
                <p className="text-xs sm:text-sm font-mono tracking-widest text-amber-500/80 uppercase">
                  Scenario Architecture & Spatial Chorography
                </p>
                <p className="text-sm 2xl:text-base text-zinc-400 leading-relaxed font-mono">
                  Architect unsparing scenario blueprints. Inscribe spatial chambers, bind mortal cast members, define psychological fault lines, and establish inviolable environmental constraints.
                </p>
              </div>

              {/* Architectural Feature Pillars */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono text-zinc-400 border-t border-zinc-900/80">
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">CHOROGRAPHY</span>
                  <span className="font-medium text-zinc-300">Topology Canvas</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">MORTALS</span>
                  <span className="font-medium text-zinc-300">Cast Dossiers</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">PROVENANCE</span>
                  <span className="font-medium text-zinc-300">Source Baseline</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors border-t border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="jewel-amber w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>3-Column Ultrawide Studio // Intake, Topology & Dossiers</span>
              </div>
              <span className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                ENTER FORGE <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          {/* PORTAL 2: THE ENGINE */}
          <button
            type="button"
            onClick={() => setPhase('engine')}
            className="group relative p-8 2xl:p-10 border border-zinc-800/80 hover:border-red-600/80 transition-all duration-700 text-left obsidian-panel rounded-xl cursor-pointer hover:shadow-2xl hover:shadow-red-950/40 overflow-hidden flex flex-col justify-between min-h-[380px] 2xl:min-h-[420px]"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/5 rounded-bl-full pointer-events-none transition-transform duration-700 group-hover:scale-125" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-4 border border-zinc-800/80 bg-zinc-950 rounded-lg group-hover:border-red-600/60 group-hover:bg-red-950/30 transition-all shadow-md">
                  <Eye className="w-7 h-7 text-zinc-400 group-hover:text-red-500 transition-colors" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-widest uppercase bg-red-950/40 text-red-400 border border-red-800/40 px-2.5 py-1 rounded">
                    SCRYING ARMED
                  </span>
                  <span className="font-mono text-xs text-zinc-400 group-hover:text-red-400 uppercase tracking-[0.25em] transition-colors font-semibold">
                    [ COMMENCE RITUAL ]
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl 2xl:text-4xl font-serif font-bold tracking-wider uppercase text-zinc-100 group-hover:text-red-200 transition-colors">
                  The Engine
                </h2>
                <p className="text-xs sm:text-sm font-mono tracking-widest text-red-500/80 uppercase">
                  Literary Horror Narrative & Causal Runtime
                </p>
                <p className="text-sm 2xl:text-base text-zinc-400 leading-relaxed font-mono">
                  Enter the scrying chamber. Unsparing literary horror narrative, unforgiving physical causality, non-consensual somatic decay, and deep social friction.
                </p>
              </div>

              {/* Engine Feature Pillars */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono text-zinc-400 border-t border-zinc-900/80">
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">NARRATIVE</span>
                  <span className="font-medium text-zinc-300">Obsidian Slate</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">CAUSALITY</span>
                  <span className="font-medium text-zinc-300">Inviolable Law</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">TELEMETRY</span>
                  <span className="font-medium text-zinc-300">Prey Cohort</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider group-hover:text-red-300 transition-colors border-t border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="jewel-crimson w-2 h-2 rounded-full bg-red-600 inline-block" />
                <span>Obsidian Slate // Participant Turn Ratification</span>
              </div>
              <span className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                COMMENCE RITUAL <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          {/* PORTAL 3: THE HISTORIAN */}
          <button
            type="button"
            onClick={() => setPhase('voice')}
            className="group relative p-8 2xl:p-10 border border-zinc-800/80 hover:border-zinc-400/80 transition-all duration-700 text-left obsidian-panel rounded-xl cursor-pointer hover:shadow-2xl hover:shadow-zinc-800/30 overflow-hidden flex flex-col justify-between min-h-[380px] 2xl:min-h-[420px]"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full pointer-events-none transition-transform duration-700 group-hover:scale-125" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-4 border border-zinc-800/80 bg-zinc-950 rounded-lg group-hover:border-zinc-400/60 group-hover:bg-zinc-800/40 transition-all shadow-md">
                  <BookOpen className="w-7 h-7 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-widest uppercase bg-zinc-900 text-zinc-300 border border-zinc-700/50 px-2.5 py-1 rounded">
                    ORACLE SYNCHRONIZED
                  </span>
                  <span className="font-mono text-xs text-zinc-400 group-hover:text-zinc-300 uppercase tracking-[0.25em] transition-colors font-semibold">
                    [ CONSULT THE ORACLE ]
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl 2xl:text-4xl font-serif font-bold tracking-wider uppercase text-zinc-100 group-hover:text-zinc-200 transition-colors">
                  The Historian
                </h2>
                <p className="text-xs sm:text-sm font-mono tracking-widest text-zinc-400 uppercase">
                  Meta-Oracle & Cross-System Chronicler
                </p>
                <p className="text-sm 2xl:text-base text-zinc-400 leading-relaxed font-mono">
                  Commune with the keeper of records. Direct oracle chat with full systemic visibility across Engine runtime states, casualty ledgers, and Forge blueprints.
                </p>
              </div>

              {/* Historian Feature Pillars */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono text-zinc-400 border-t border-zinc-900/80">
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">MEMORY</span>
                  <span className="font-medium text-zinc-300">Cross-Session</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">SYNTHESIS</span>
                  <span className="font-medium text-zinc-300">The Historian</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/60 rounded">
                  <span className="block text-zinc-500 text-[9px] uppercase">HERMENEUTICS</span>
                  <span className="font-medium text-zinc-300">Canon Inquiry</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors border-t border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />
                <span>Meta-Oracle // Autonomous Knowledge Preservation</span>
              </div>
              <span className="flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                CONSULT ORACLE <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* Scenario Preview Shelf / Recent Grimoires (Ultrawide Horizontal Showcase) */}
        {/* ========================================================================= */}
        <section className="space-y-4 pt-2">
          {/* Shelf Section Title */}
          <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="jewel-amber w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <h3 className="font-serif font-bold text-sm sm:text-base uppercase tracking-[0.25em] text-[#e6e4dc]">
                SCENARIO PREVIEW SHELF <span className="text-stone-500 font-mono text-xs font-normal">// RECENT & CANONICAL GRIMOIRES</span>
              </h3>
            </div>
            <span className="text-stone-500 font-mono text-[11px] uppercase tracking-widest hidden sm:inline">
              Instant Scrying Bind // Forge Architectural Inspection
            </span>
          </div>

          {/* Grimoire Cards Grid Across 3440px Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 2xl:gap-6">
            {/* GRIMOIRE 1: The Black Iron Mortuary (Canonical Artifact) */}
            <div className="obsidian-panel border border-stone-800/90 hover:border-amber-600/70 p-5 2xl:p-6 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-300 group shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-amber-950/40 text-amber-400 border border-amber-800/40 font-bold">
                    CANONICAL ARTIFACT
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    4 Chambers // 3 Cast
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-lg 2xl:text-xl text-stone-100 group-hover:text-amber-200 transition-colors">
                    The Black Iron Mortuary
                  </h4>
                  <p className="text-xs font-mono text-amber-500/80 tracking-wide">
                    Sub-Basement 7 Autopsy Theater
                  </p>
                </div>

                <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-3">
                  Locked beneath four thousand tons of reinforced sea-wall concrete. Decompression bulkheads have failed into lockdown, while automated surgical cradle Entity-41 methodically seeks warm living tissue.
                </p>

                <div className="pt-2 border-t border-stone-900 flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                  <span>Vector: Somatic</span>
                  <span>•</span>
                  <span>Exposure: Latent</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  id="shelf-launch-black-iron-btn"
                  type="button"
                  onClick={handleLaunchBlackIron}
                  className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/60 hover:border-red-600 text-red-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  SCRY
                </button>
                <button
                  id="shelf-forge-black-iron-btn"
                  type="button"
                  onClick={handleInspectBlackIronInForge}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 text-stone-300 hover:text-amber-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  FORGE
                </button>
              </div>
            </div>

            {/* GRIMOIRE 1B: The Silver Rest Lodge (Interaction Artifact) */}
            <div className="obsidian-panel border border-stone-800/90 hover:border-amber-600/70 p-5 2xl:p-6 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-300 group shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-amber-950/40 text-amber-400 border border-amber-800/40 font-bold">
                    INTERACTION BLUEPRINT
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    7 Chambers // 8 Cast
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-lg 2xl:text-xl text-stone-100 group-hover:text-amber-200 transition-colors">
                    The Silver Rest Lodge
                  </h4>
                  <p className="text-xs font-mono text-amber-500/80 tracking-wide">
                    Avalanche-Sealed Alpine Hotel, 1991
                  </p>
                </div>

                <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-3">
                  Seven souls snowbound in a fading grand hotel — a host with something sealed in the cellar, a dying boiler, a diabetic&apos;s clock, and the politest predator in the valley. Full voice dossiers, stakes, and arrivals.
                </p>

                <div className="pt-2 border-t border-stone-900 flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                  <span>Vector: Somatic</span>
                  <span>•</span>
                  <span>Exposure: Latent</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  id="shelf-launch-silver-rest-btn"
                  type="button"
                  onClick={handleLaunchSilverRest}
                  className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/60 hover:border-red-600 text-red-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  SCRY
                </button>
                <button
                  id="shelf-forge-silver-rest-btn"
                  type="button"
                  onClick={handleInspectSilverRestInForge}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 text-stone-300 hover:text-amber-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  FORGE
                </button>
              </div>
            </div>

            {/* GRIMOIRE 1C: The Refinement (Extreme Testing Blueprint) */}
            <div className="obsidian-panel border border-stone-800/90 hover:border-red-600/70 p-5 2xl:p-6 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-300 group shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-red-950/50 text-red-400 border border-red-800/50 font-bold">
                    EXTREME EXPERIMENTAL
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    8 Chambers // 8 Cast
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-lg 2xl:text-xl text-stone-100 group-hover:text-red-200 transition-colors">
                    The Refinement
                  </h4>
                  <p className="text-xs font-mono text-red-400/80 tracking-wide">
                    Subcarpathian Research Compound, Present Day
                  </p>
                </div>

                <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-3">
                  Six travelers processed into a decommissioned Soviet facility where a former surgeon pursues the Threshold state under private observation. Full psychological stakes, 3 clocks, and a single unsealed exit.
                </p>

                <div className="pt-2 border-t border-stone-900 flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                  <span>Vector: Somatic</span>
                  <span>•</span>
                  <span>Scale: Extreme (5)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  id="shelf-launch-refinement-btn"
                  type="button"
                  onClick={handleLaunchTheRefinement}
                  className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/60 hover:border-red-600 text-red-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  SCRY
                </button>
                <button
                  id="shelf-forge-refinement-btn"
                  type="button"
                  onClick={handleInspectTheRefinementInForge}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-red-500/60 text-stone-300 hover:text-red-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  FORGE
                </button>
              </div>
            </div>

            {/* GRIMOIRE 2: Active Workspace Draft */}
            <div className="obsidian-panel border border-stone-800/90 hover:border-amber-500/70 p-5 2xl:p-6 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-300 group shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-stone-900 text-amber-300 border border-amber-600/30 font-bold flex items-center gap-1.5">
                    <span className="jewel-amber w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    WORKSPACE DRAFT
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    Rev #{draftRevision || 1}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-lg 2xl:text-xl text-stone-100 group-hover:text-amber-200 transition-colors">
                    {activeDraftTitle || 'Untitled Inscription'}
                  </h4>
                  <p className="text-xs font-mono text-amber-500/80 tracking-wide">
                    {draftBlueprint?.setting?.location || 'Unassigned Starting Location'}
                  </p>
                </div>

                <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-3">
                  {draftBlueprint?.premise || draftBlueprint?.globalPremise || 'Active architectural blueprint under construction in The Forge. Spatial topology and mortal cast members configured in studio.'}
                </p>

                <div className="pt-2 border-t border-stone-900 flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                  <span>Cast: {draftBlueprint?.cast?.length || 0}</span>
                  <span>•</span>
                  <span>Nodes: {draftBlueprint?.topology?.nodes?.length || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleLaunchDraftInEngine}
                  disabled={!activeDraftTitle}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-700 hover:border-red-600/60 text-stone-300 hover:text-red-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  SCRY
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('forge')}
                  className="px-3 py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 hover:border-amber-500 text-amber-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  RESUME
                </button>
              </div>
            </div>

            {/* GRIMOIRE 3: Sub-Level 4 Containment Archetype */}
            <div className="obsidian-panel border border-stone-800/90 hover:border-stone-600 p-5 2xl:p-6 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-300 group shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-zinc-900 text-zinc-300 border border-zinc-700/50 font-bold">
                    ARCHIVAL ARCHETYPE
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    5 Chambers // Bio-Isolation
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-lg 2xl:text-xl text-stone-100 group-hover:text-stone-200 transition-colors">
                    Sub-Level 4 Containment
                  </h4>
                  <p className="text-xs font-mono text-stone-400 tracking-wide">
                    Decommissioned Subterranean Biosphere
                  </p>
                </div>

                <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-3">
                  Atmospheric scrubbing systems offline. Asphyxiation countdown begins in sealed deep-rock facility while anomalous pathogen samples thaw in broken cryo-dewars.
                </p>

                <div className="pt-2 border-t border-stone-900 flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                  <span>Vector: Cognitive / Somatic</span>
                  <span>•</span>
                  <span>High Friction</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleLoadArchetypeInForge}
                  className="col-span-2 px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  LOAD ARCHETYPE IN FORGE
                </button>
              </div>
            </div>

            {/* GRIMOIRE 4: Emergent Ad-Lib Induction */}
            <div className="obsidian-panel border border-stone-800/90 hover:border-red-900/60 p-5 2xl:p-6 rounded-xl flex flex-col justify-between space-y-4 transition-all duration-300 group shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-red-950/30 text-red-400 border border-red-900/40 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-red-400" />
                    LIVE SYNTHESIS
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    Emergent Nightmare
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-lg 2xl:text-xl text-stone-100 group-hover:text-red-200 transition-colors">
                    Ad-Lib Induction
                  </h4>
                  <p className="text-xs font-mono text-red-500/80 tracking-wide">
                    Spontaneous Occult Manifestation
                  </p>
                </div>

                <p className="text-xs text-stone-400 font-mono leading-relaxed line-clamp-3">
                  Summon an unscripted reality from occult seeds. Define bespoke parameters, allow Gemini neural synthesis to inscribe the chambers, and scry immediate consequences.
                </p>

                <div className="pt-2 border-t border-stone-900 flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                  <span>Procedural Chorography</span>
                  <span>•</span>
                  <span>Emergent Cast</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('engine')}
                  className="w-full px-3 py-2 bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-red-700/80 text-stone-300 hover:text-red-200 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-red-500" />
                  INITIATE AD-LIB INDUCTION
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Banish Inscriptions / State Reset */}
        <div className="flex flex-col items-center pt-2">
          <AnimatePresence mode="wait">
            {!isConfirmingReset ? (
              <motion.button
                key="reset-trigger"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                whileHover={{ opacity: 1 }}
                onClick={() => setIsConfirmingReset(true)}
                className="flex items-center gap-2.5 px-5 py-2 text-xs font-mono text-zinc-400 uppercase tracking-[0.25em] hover:text-red-400 transition-all group cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700" />
                Banish Inscriptions // Reset State
              </motion.button>
            ) : (
              <motion.div
                key="reset-confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col items-center gap-4 p-6 border border-red-900/60 bg-zinc-950/95 backdrop-blur-xl max-w-lg text-center rounded-xl shadow-2xl"
              >
                <div className="flex items-center gap-3 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.25em]">
                    Rite of Oblivion
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  This will dissolve all active memory from The Historian, The Forge, and The Engine. The thread will be severed permanently.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => setIsConfirmingReset(false)}
                    className="px-5 py-2 text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Preserve
                  </button>
                  <button
                    onClick={handleFullReset}
                    className="px-5 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-mono uppercase tracking-[0.2em] transition-all rounded shadow-lg shadow-red-950/60 cursor-pointer font-bold"
                  >
                    Confirm Banishment
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Altar Footer */}
      <footer className="w-full max-w-[3440px] mx-auto pt-6 border-t border-zinc-900/80 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-400 text-xs font-mono uppercase tracking-wider">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Causal Anchor: Bound</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Topological Scrying: Enabled</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Mortal Ledger: Persistent</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Spare Automatic Linework: Margins Staged</span>
          </div>
          <p className="text-zinc-400 tracking-[0.3em]">The Inviolable Law // Unsparing Reality</p>
        </div>
      </footer>

      {/* AI Calibration Modal */}
      <AiCalibrationModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onConfigChanged={fetchAiConfig}
      />
    </div>
  );
}
