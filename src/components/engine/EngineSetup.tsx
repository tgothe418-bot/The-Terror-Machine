import React, { useRef, useState } from 'react';
import { ArrowLeft, Upload, AlertCircle, Users, Shield, Skull, Activity, Play, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { forgeActions, useForgeState } from '../../store/useForgeStore';
import { Blueprint } from '../../types';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { motion, AnimatePresence } from 'motion/react';
import AdLibInductionModal from './AdLibInductionModal';

interface EngineSetupProps {
  onContinue?: () => void;
}

export default function EngineSetup({ onContinue }: EngineSetupProps) {
  const setPhase = useAppStore((state) => state.setPhase);
  const activeCharacterId = useForgeState((state) => state.activeCharacterId);
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const setBlueprint = useEngineStore((state) => state.setBlueprint);
  const [error, setError] = useState<string | null>(null);
  const [previewBlueprint, setPreviewBlueprint] = useState<Blueprint | null>(null);
  const [selectedRole, setSelectedRole] = useState<'protagonist' | 'antagonist'>('protagonist');
  const [isAdLibModalOpen, setIsAdLibModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compileTopology = useAppStore((state) => state.compileTopology);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed: unknown = JSON.parse(content);

        try {
          const validated = normalizeBlueprint(parsed);
          setPreviewBlueprint(validated);
          forgeActions.setActiveCharacterId(null);
        } catch (validationErr: unknown) {
          console.error('Zod Validation Failed:', validationErr);
          const errorMsg =
            validationErr instanceof Error ? validationErr.message : String(validationErr);
          setError(`INVALID BLUEPRINT SCHEMA: ${errorMsg}`);
        }
      } catch (err) {
        setError('PARSING ERROR: FILE CORRUPTED OR NOT VALID JSON');
        console.error('Blueprint load error:', err);
      }
    };

    reader.onerror = () => {
      setError('READ ERROR: SYSTEM UNABLE TO ACCESS FILE');
    };

    reader.readAsText(file);
  };

  const handleStart = () => {
    if (previewBlueprint) {
      if (
        previewBlueprint.topology &&
        previewBlueprint.topology.nodes &&
        previewBlueprint.topology.nodes.length > 0
      ) {
        const startNodeId = previewBlueprint.topology.nodes[0];
        compileTopology(previewBlueprint.topology, startNodeId);
      }
      forgeActions.setActiveNeuralLink(selectedRole.toUpperCase() as 'PROTAGONIST' | 'ANTAGONIST');
      forgeActions.startSimulation(previewBlueprint);
      setBlueprint(previewBlueprint, selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col p-6 sm:p-8 font-mono selection:bg-white selection:text-black">
      <header className="flex items-center justify-between mb-8 sm:mb-12">
        <button
          onClick={() => (previewBlueprint ? setPreviewBlueprint(null) : setPhase('hub'))}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors uppercase text-xs tracking-[0.2em] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {previewBlueprint ? 'Cancel Initialization' : 'Return to Hub'}
        </button>
        <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-zinc-400">
          The Engine // Setup
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {!previewBlueprint ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-10"
            >
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-light tracking-widest uppercase text-white">
                  Initialize Simulation
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm tracking-tight uppercase leading-relaxed">
                  Start a procedural Ad Lib session, load a blueprint, or resume active link.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1: Continue */}
                <button
                  onClick={onContinue}
                  disabled={!activeBlueprint}
                  className={`p-8 border flex flex-col items-center justify-center gap-4 transition-all duration-500 rounded group ${
                    activeBlueprint
                      ? 'border-white bg-white/5 hover:bg-white/10 cursor-pointer'
                      : 'border-zinc-900 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Activity
                    className={`w-10 h-10 ${activeBlueprint ? 'text-white animate-pulse' : 'text-zinc-700'}`}
                  />
                  <div className="text-center space-y-1">
                    <span className="text-xs uppercase tracking-[0.25em] block font-bold text-white">
                      Resume Link
                    </span>
                    <span className="text-xs text-zinc-400 uppercase tracking-wider block">
                      {activeBlueprint ? `Active: ${activeBlueprint.title}` : 'No Active Session'}
                    </span>
                  </div>
                </button>

                {/* Option 2: Upload New */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-zinc-800 hover:border-zinc-500 transition-all duration-500 bg-zinc-950/40 rounded flex flex-col items-center justify-center cursor-pointer group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-zinc-600 group-hover:text-white transition-colors mb-3" />
                  <div className="text-center space-y-1">
                    <span className="text-xs uppercase tracking-[0.25em] block font-bold text-white">
                      Upload Blueprint
                    </span>
                    <span className="text-xs text-zinc-400 uppercase tracking-wider block">
                      Import structured JSON scenario
                    </span>
                  </div>
                </div>

                {/* Option 3: Ad-Lib Mode */}
                <div className="md:col-span-2 p-8 border border-red-950/80 bg-zinc-950/60 rounded flex flex-col items-center justify-center gap-5 shadow-[inset_0_0_25px_rgba(239,68,68,0.05)]">
                  <div className="text-center">
                    <Skull className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <span className="text-sm uppercase tracking-[0.25em] block mb-1 text-zinc-100 font-bold">
                      Ad-Lib Induction Terminal
                    </span>
                    <span className="text-xs text-zinc-400 uppercase tracking-wider">
                      Phase 3B Procedural Opposition & Victim Framing
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 max-w-xl text-center leading-relaxed font-sans">
                    Induct a fresh simulation directly by configuring your participation mode (Antagonist Avatar/Force, Protagonist, or Director) with bounded Authority, non-negotiable Limits, and authored Victims.
                  </p>

                  <button
                    onClick={() => setIsAdLibModalOpen(true)}
                    className="border-2 border-red-600 bg-red-950/40 hover:bg-red-600 hover:text-white text-red-300 px-8 py-3 text-xs tracking-[0.2em] uppercase font-bold transition-all duration-300 flex items-center gap-2 rounded cursor-pointer shadow-lg shadow-red-950/40 hover:shadow-red-600/30"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Launch Ad Lib Induction Terminal</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-400 bg-red-950/30 border border-red-800 p-4 w-full rounded">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-xs uppercase tracking-wider">{error}</span>
                </div>
              )}

              <div className="pt-6 text-center">
                <p className="text-xs text-zinc-600 uppercase tracking-[0.3em]">
                  System Ready // Standby
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-end justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">
                      Blueprint Loaded
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-white">
                      {previewBlueprint.title}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">
                      Scale {previewBlueprint.contentScale}
                    </span>
                    <span className="text-xs text-zinc-400 uppercase tracking-widest">
                      {previewBlueprint.contentLevelDescription}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-[0.2em] mb-4 font-bold">
                        <Users className="w-4 h-4 text-zinc-300" />
                        Cast Members
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {previewBlueprint.cast?.map((char, i) => (
                          <div
                            key={char.id || i}
                            onClick={() => forgeActions.setActiveCharacterId(char.id)}
                            className={`p-4 border cursor-pointer transition-all duration-200 rounded ${
                              activeCharacterId === char.id
                                ? 'border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                : 'border-zinc-800 hover:border-zinc-600 bg-black opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h3
                                className={`font-bold text-sm ${activeCharacterId === char.id ? 'text-red-400' : 'text-zinc-100'}`}
                              >
                                {char.name}
                              </h3>
                              <div className="flex gap-2 items-center">
                                {char.isEntity && (
                                  <span className="text-xs text-red-400 border border-red-900 px-1.5 py-0.5 rounded font-mono uppercase bg-red-950/30">
                                    ENTITY
                                  </span>
                                )}
                                <span className="text-xs uppercase font-mono text-cyan-400 px-2 py-0.5 border border-cyan-900 rounded bg-cyan-950/30">
                                  {char.behaviorVector || 'ADAPTIVE'}
                                </span>
                              </div>
                            </div>
                            {char.description && (
                              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                                {char.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {(!previewBlueprint.cast || previewBlueprint.cast.length === 0) && (
                        <div className="text-xs text-zinc-500 italic">
                          No cast identified in blueprint.
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-[0.2em] mb-4 font-bold">
                        <Activity className="w-4 h-4 text-zinc-300" />
                        Environmental Intel
                      </h3>
                      <div className="p-4 bg-zinc-950 border border-zinc-800 space-y-2 rounded">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 uppercase">Location:</span>
                          <span className="text-zinc-300 uppercase font-semibold">
                            {previewBlueprint.setting.location}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 uppercase">Period:</span>
                          <span className="text-zinc-300 uppercase font-semibold">
                            {previewBlueprint.setting.timePeriod}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-2 border-t border-zinc-800 pt-2 leading-relaxed">
                          {previewBlueprint.setting.atmosphere}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-[0.2em] mb-6 font-bold">
                        <Activity className="w-4 h-4 text-zinc-300" />
                        Neural Link Identity
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setSelectedRole('protagonist')}
                          className={`p-6 border flex flex-col items-center gap-3 transition-all duration-300 rounded cursor-pointer ${
                            selectedRole === 'protagonist'
                              ? 'border-white bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                              : 'border-zinc-800 bg-black text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          <Shield className="w-6 h-6" />
                          <span className="text-xs uppercase font-bold tracking-[0.2em]">
                            Protagonist
                          </span>
                        </button>
                        <button
                          onClick={() => setSelectedRole('antagonist')}
                          className={`p-6 border flex flex-col items-center gap-3 transition-all duration-300 rounded cursor-pointer ${
                            selectedRole === 'antagonist'
                              ? 'border-fresh-blood bg-fresh-blood text-white shadow-[0_0_20px_rgba(200,30,30,0.3)]'
                              : 'border-zinc-800 bg-black text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          <Skull className="w-6 h-6" />
                          <span className="text-xs uppercase font-bold tracking-[0.2em]">
                            Antagonist
                          </span>
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-4 leading-relaxed uppercase tracking-wider text-center">
                        Select your orientation within the nightmare architecture.
                      </p>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleStart}
                        className="w-full py-5 bg-white text-black text-xs font-bold uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98] rounded cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                        Initialize Neural Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AdLibInductionModal
        isOpen={isAdLibModalOpen}
        onClose={() => setIsAdLibModalOpen(false)}
        onSuccess={onContinue}
      />
    </div>
  );
}
