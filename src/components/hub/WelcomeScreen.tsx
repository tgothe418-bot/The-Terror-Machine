import React, { useState } from 'react';
import { Hammer, Play, Ghost, Target, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { forgeActions } from '../../store/useForgeStore';
import { useEngineStore } from '../../core/store';
import { motion, AnimatePresence } from 'motion/react';

export default function WelcomeScreen() {
  const setPhase = useAppStore((state) => state.setPhase);
  const clearVoice = useVoiceStore((state) => state.clearHistory);
  const { clearHistory: clearForge } = forgeActions;
  const clearEngine = useEngineStore((state) => state.clearBlueprint);

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const handleFullReset = () => {
    clearVoice();
    clearForge();
    clearEngine();
    useEngineStore.getState().resetEngine();
    useAppStore.getState().resetSession();
    setIsConfirmingReset(false);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 sm:p-8 font-sans overflow-hidden relative">
      {/* Background scanline effect */}
      <div className="scanline pointer-events-none" />

      <div className="max-w-5xl 2xl:max-w-7xl w-full space-y-12 2xl:space-y-20 relative z-10">
        {/* Header */}
        <header className="text-center space-y-6">
          <div className="flex justify-center items-center gap-4">
            <div className="h-[1px] w-16 bg-zinc-800" />
            <Ghost className="w-12 h-12 text-white animate-pulse" />
            <div className="h-[1px] w-16 bg-zinc-800" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.4em] uppercase text-white">
              NIGHTMARE <span className="text-zinc-500 font-light">MACHINE</span>
            </h1>
            <div className="flex items-center justify-center gap-3 text-zinc-500 font-mono text-xs sm:text-sm tracking-[0.25em] uppercase">
              <Activity className="w-4 h-4 text-red-500" />
              <span>System Version 2.0.4 // Narrative Simulation Engine</span>
            </div>
          </div>
        </header>

        {/* Phase Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* THE VOICE */}
          <button
            onClick={() => setPhase('voice')}
            className="group relative p-8 border-2 border-zinc-900 hover:border-white transition-all duration-500 text-left space-y-6 bg-zinc-950/70 backdrop-blur-sm rounded cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 border border-zinc-800 group-hover:border-white group-hover:bg-white/10 transition-all rounded">
                <Activity className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <span className="font-mono text-xs text-zinc-500 group-hover:text-white uppercase tracking-widest transition-colors font-semibold">
                [ HUB_PHASE ]
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase group-hover:text-white transition-colors text-zinc-100">
                The Voice
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                Chat with the system's friendly, curious intelligence. Explore ideas and find
                company.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
              <Activity className="w-3.5 h-3.5" />
              <span>Conversational Mode</span>
            </div>
          </button>

          {/* THE FORGE */}
          <button
            onClick={() => setPhase('forge')}
            className="group relative p-8 border-2 border-zinc-900 hover:border-fresh-blood transition-all duration-500 text-left space-y-6 bg-zinc-950/70 backdrop-blur-sm rounded cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 border border-zinc-800 group-hover:border-fresh-blood group-hover:bg-fresh-blood/10 transition-all rounded">
                <Hammer className="w-6 h-6 text-zinc-400 group-hover:text-fresh-blood transition-colors" />
              </div>
              <span className="font-mono text-xs text-zinc-500 group-hover:text-fresh-blood uppercase tracking-widest transition-colors font-semibold">
                [ ARCHITECT_PHASE ]
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase group-hover:text-white transition-colors text-zinc-100">
                The Forge
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                Collaborate with the Assistant to architect a new scenario and export your
                blueprint.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
              <Target className="w-3.5 h-3.5" />
              <span>Calibration Required</span>
            </div>
          </button>

          {/* THE ENGINE */}
          <button
            onClick={() => setPhase('engine')}
            className="group relative p-8 border-2 border-zinc-900 hover:border-system-green transition-all duration-500 text-left space-y-6 bg-zinc-950/70 backdrop-blur-sm rounded cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 border border-zinc-800 group-hover:border-system-green group-hover:bg-system-green/10 transition-all rounded">
                <Play className="w-6 h-6 text-zinc-400 group-hover:text-system-green transition-colors" />
              </div>
              <span className="font-mono text-xs text-zinc-500 group-hover:text-system-green uppercase tracking-widest transition-colors font-semibold">
                [ RUNTIME_PHASE ]
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase group-hover:text-white transition-colors text-zinc-100">
                The Engine
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                Load a scenario blueprint or launch a Haunted House simulation to begin execution.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2 text-xs font-mono text-system-green uppercase tracking-wider group-hover:text-green-300 transition-colors">
              <Activity className="w-3.5 h-3.5" />
              <span>Ready for Execution</span>
            </div>
          </button>
        </div>

        {/* Global Reset Option */}
        <div className="flex flex-col items-center pt-6">
          <AnimatePresence mode="wait">
            {!isConfirmingReset ? (
              <motion.button
                key="reset-trigger"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                whileHover={{ opacity: 1 }}
                onClick={() => setIsConfirmingReset(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-400 uppercase tracking-[0.25em] hover:text-red-400 transition-all group cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700" />
                Clear System Memory
              </motion.button>
            ) : (
              <motion.div
                key="reset-confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col items-center gap-4 p-6 border border-red-500/30 bg-red-950/20 backdrop-blur-md max-w-md text-center rounded"
              >
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.25em]">
                    Total Wipe Warning
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                  This will purge all history from The Voice, The Forge, and The Engine. This neural
                  link termination is permanent.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={() => setIsConfirmingReset(false)}
                    className="px-5 py-2 text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFullReset}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-mono uppercase tracking-[0.2em] transition-all rounded shadow-lg shadow-red-600/30 cursor-pointer font-bold"
                  >
                    Confirm Wipe
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="pt-12 border-t border-zinc-900">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 text-xs font-mono uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <span>Grounding: Active</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>Sensory: Enabled</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>Memory: Persistent</span>
            </div>
            <p className="text-zinc-600 tracking-[0.3em]">
              Zero Gamification Protocol
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
