import React, { useRef, useState } from 'react';
import { ArrowLeft, Upload, FileJson, AlertCircle, Users, Shield, Skull, Activity, Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { ScenarioBlueprint } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface EngineSetupProps {
  onContinue?: () => void;
}

export default function EngineSetup({ onContinue }: EngineSetupProps) {
  const setPhase = useAppStore((state) => state.setPhase);
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const setBlueprint = useEngineStore((state) => state.setBlueprint);
  const [error, setError] = useState<string | null>(null);
  const [previewBlueprint, setPreviewBlueprint] = useState<ScenarioBlueprint | null>(null);
  const [selectedRole, setSelectedRole] = useState<'protagonist' | 'antagonist'>('protagonist');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Validation: Check for minimum required properties for the engine to operate
        if (parsed.title && parsed.setting && parsed.narrativeRules) {
          setPreviewBlueprint(parsed as ScenarioBlueprint);
        } else {
          setError('INVALID BLUEPRINT: CORE STRUCTURAL MARKERS MISSING (TITLE, SETTING, OR NARRATIVE RULES)');
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
                      <div className="space-y-3">
                        {previewBlueprint.characters.map((char, i) => (
                          <div key={i} className="group">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-sm font-medium">{char.name}</span>
                              <span className="text-[10px] text-zinc-600 uppercase">{char.role}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed italic border-l border-zinc-900 pl-3">
                              {char.psychologicalState}
                            </p>
                          </div>
                        ))}
                      </div>
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
