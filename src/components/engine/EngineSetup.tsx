import React, { useRef, useState } from 'react';
import { ArrowLeft, Upload, AlertCircle, Users, Shield, Skull, Activity, Play } from 'lucide-react';
import { useAppStore, normalizeBlueprint } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { forgeActions, useForgeState } from '../../store/useForgeStore';
import { ScenarioBlueprint, BlueprintSchema } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface EngineSetupProps {
  onContinue?: () => void;
}

export default function EngineSetup({ onContinue }: EngineSetupProps) {
  const setPhase = useAppStore((state) => state.setPhase);
  const activeCharacterId = useForgeState((state) => state.activeCharacterId);
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const setBlueprint = useEngineStore((state) => state.setBlueprint);
  const [error, setError] = useState<string | null>(null);
  const [previewBlueprint, setPreviewBlueprint] = useState<ScenarioBlueprint | null>(null);
  const [selectedRole, setSelectedRole] = useState<'protagonist' | 'antagonist'>('protagonist');
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
        const parsed = JSON.parse(content);
        
        try {
          const normalized = normalizeBlueprint(parsed);
          const validated = BlueprintSchema.parse(normalized);
          // @ts-expect-error - The blueprint schemas we just made might have minor divergence from legacy ScenarioBlueprint, forcing it through for now
          setPreviewBlueprint(validated as ScenarioBlueprint);
          forgeActions.setActiveCharacterId(null);
        } catch (validationErr: unknown) {
          console.error("Zod Validation Failed:", validationErr);
          const errorMsg = validationErr instanceof Error ? validationErr.message : String(validationErr);
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
      if (previewBlueprint.topology && previewBlueprint.topology.nodes && previewBlueprint.topology.nodes.length > 0) {
        const startNodeId = previewBlueprint.topology.nodes[0];
        compileTopology(previewBlueprint.topology, startNodeId);
      }
      forgeActions.setActiveNeuralLink(selectedRole.toUpperCase() as 'PROTAGONIST' | 'ANTAGONIST');
      forgeActions.startSimulation(previewBlueprint);
      setBlueprint(previewBlueprint, selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col p-8 font-mono selection:bg-white selection:text-black">
      <header className="flex items-center justify-between mb-12">
        <button 
          onClick={() => previewBlueprint ? setPreviewBlueprint(null) : setPhase('hub')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]"
        >
          <ArrowLeft className="w-3 h-3" />
          {previewBlueprint ? 'Cancel Initialization' : 'Return to Hub'}
        </button>
        <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400">The Engine // Setup</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {!previewBlueprint ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-light tracking-widest uppercase">Initialize Simulation</h2>
                <p className="text-zinc-500 text-xs tracking-tight uppercase leading-relaxed">
                  Start a fresh nightmare or resume the existing narrative link.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Option 1: Continue */}
                <button
                  onClick={onContinue}
                  disabled={!activeBlueprint}
                  className={`p-8 border flex flex-col items-center justify-center gap-4 transition-all duration-500 group ${
                    activeBlueprint 
                      ? 'border-white bg-white/5 hover:bg-white/10 cursor-pointer' 
                      : 'border-zinc-900 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Activity className={`w-10 h-10 ${activeBlueprint ? 'text-white animate-pulse' : 'text-zinc-700'}`} />
                  <div className="text-center">
                    <span className="text-[10px] uppercase tracking-[0.3em] block mb-1">Resume Link</span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest">
                      {activeBlueprint ? `Active: ${activeBlueprint.title}` : 'No Active Session'}
                    </span>
                  </div>
                </button>

                {/* Option 2: Upload New */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-zinc-800 hover:border-zinc-500 transition-all duration-500 bg-zinc-950/30 flex flex-col items-center justify-center cursor-pointer group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-zinc-700 group-hover:text-white transition-colors mb-4" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase tracking-[0.3em] block mb-1">New Blueprint</span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Override existing session</span>
                  </div>
                </div>
                
                {/* Option 3: Ad-Lib Mode */}
                <div 
                  onClick={() => {
                    import('../../data/references/haunted_house.json').then((module) => {
                      import('../../lib/adLibGenerator').then(({ bootstrapBlindEntry }) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        bootstrapBlindEntry(module.default as any);
                      });
                    });
                  }}
                  className="md:col-span-2 p-8 border border-zinc-800 hover:border-red-900 transition-all duration-500 bg-zinc-950/30 flex flex-col items-center justify-center cursor-pointer group hover:bg-red-950/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                >
                  <Skull className="w-10 h-10 text-zinc-700 group-hover:text-red-500 transition-colors mb-4" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase tracking-[0.3em] block mb-1 text-zinc-300 group-hover:text-white font-bold">Enter the House (Ad-Lib Mode)</span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest group-hover:text-red-400">Bypass Forge // JIT Procedural Generation</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-500/80 bg-red-500/5 border border-red-500/20 p-4 w-full">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] uppercase tracking-widest">{error}</span>
                </div>
              )}

              <div className="pt-12 text-center">
                <p className="text-[8px] text-zinc-800 uppercase tracking-[0.4em]">
                  Awaiting Valid JSON Payload // System Standby
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
                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1">Blueprint Loaded</span>
                    <h2 className="text-3xl font-bold tracking-tighter uppercase">{previewBlueprint.title}</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1">Scale {previewBlueprint.contentScale}</span>
                    <span className="text-xs text-zinc-400 uppercase tracking-widest">{previewBlueprint.contentLevelDescription}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-4">
                        <Users className="w-3 h-3" />
                        Cast Members
                      </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {previewBlueprint.cast?.map((char, i) => (
                            <div 
                              key={char.id || i}
                              onClick={() => forgeActions.setActiveCharacterId(char.id)}
                              className={`p-4 border cursor-pointer transition-all duration-200 ${
                                activeCharacterId === char.id 
                                  ? 'border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                                  : 'border-zinc-800 hover:border-zinc-600 bg-black opacity-60 hover:opacity-100'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h3 className={`font-bold ${activeCharacterId === char.id ? 'text-red-400' : 'text-zinc-100'}`}>
                                  {char.name}
                                </h3>
                                <div className="flex gap-2 items-center">
                                  {char.isEntity && (
                                    <span className="text-[10px] text-red-500 border border-red-900 px-1 font-mono uppercase">ENTITY</span>
                                  )}
                                  <span className="text-[10px] uppercase font-mono text-cyan-600 px-2 py-1 border border-cyan-900 rounded bg-cyan-950/30">
                                    {char.behaviorVector || char.behavioralVector || 'ADAPTIVE'}
                                  </span>
                                </div>
                              </div>
                              {char.description && (
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-mono">
                                  {char.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        {(!previewBlueprint.cast || previewBlueprint.cast.length === 0) && (
                          <div className="text-[10px] text-zinc-600 italic">No cast identified in blueprint.</div>
                        )}
                    </div>

                    <div>
                      <h3 className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-4">
                        <Activity className="w-3 h-3" />
                        Environmental Intel
                      </h3>
                      <div className="p-4 bg-zinc-950 border border-zinc-900 space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 uppercase">Location:</span>
                          <span className="text-zinc-400 uppercase">{previewBlueprint.setting.location}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 uppercase">Period:</span>
                          <span className="text-zinc-400 uppercase">{previewBlueprint.setting.timePeriod}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 border-t border-zinc-900 pt-2">
                          {previewBlueprint.setting.atmosphere}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-6">
                        <Activity className="w-3 h-3" />
                        Neural Link Identity
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setSelectedRole('protagonist')}
                          className={`p-6 border flex flex-col items-center gap-3 transition-all duration-300 ${
                            selectedRole === 'protagonist' 
                              ? 'border-white bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                              : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'
                          }`}
                        >
                          <Shield className="w-6 h-6" />
                          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Protagonist</span>
                        </button>
                        <button
                          onClick={() => setSelectedRole('antagonist')}
                          className={`p-6 border flex flex-col items-center gap-3 transition-all duration-300 ${
                            selectedRole === 'antagonist' 
                              ? 'border-fresh-blood bg-fresh-blood text-white shadow-[0_0_20px_rgba(200,30,30,0.3)]' 
                              : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'
                          }`}
                        >
                          <Skull className="w-6 h-6" />
                          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Antagonist</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-4 leading-relaxed uppercase tracking-widest text-center">
                        Select your orientation within the nightmare architecture.
                      </p>
                    </div>

                    <div className="pt-8">
                      <button
                        onClick={handleStart}
                        className="w-full py-6 bg-white text-black text-xs font-bold uppercase tracking-[0.5em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98]"
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
    </div>
  );
}
