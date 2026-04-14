import { Hammer, Play, Ghost, Target, Activity } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import TheVoice from './TheVoice';

export default function WelcomeScreen() {
  const setPhase = useAppStore((state) => state.setPhase);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* Background scanline effect */}
      <div className="scanline pointer-events-none" />
      
      <div className="max-w-4xl w-full space-y-16 relative z-10">
        {/* ... existing header ... */}
        <header className="text-center space-y-6">
          <div className="flex justify-center items-center gap-4">
            <div className="h-[1px] w-12 bg-zinc-800" />
            <Ghost className="w-12 h-12 text-white animate-pulse" />
            <div className="h-[1px] w-12 bg-zinc-800" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-[0.5em] uppercase text-white">
              NIGHTMARE <span className="text-zinc-500 font-light">MACHINE</span>
            </h1>
            <div className="flex items-center justify-center gap-3 text-zinc-600 font-mono text-[10px] tracking-[0.3em] uppercase">
              <Activity className="w-3 h-3" />
              <span>System Version 2.0.4 // Narrative Simulation Engine</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* THE VOICE */}
          <button
            onClick={() => setPhase('voice')}
            className="group relative p-8 border-2 border-zinc-900 hover:border-white transition-all duration-500 text-left space-y-6 bg-zinc-950/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 border border-zinc-800 group-hover:border-white group-hover:bg-white/10 transition-all">
                <Activity className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <span className="font-mono text-[10px] text-zinc-600 group-hover:text-white uppercase tracking-widest transition-colors">
                [ HUB_PHASE ]
              </span>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase group-hover:text-white transition-colors">The Voice</h2>
              <p className="text-sm text-zinc-500 leading-relaxed font-mono opacity-80">
                Chat with the system's friendly, curious intelligence. Explore ideas and find company.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2 text-[9px] font-mono text-zinc-700 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
              <Activity className="w-3 h-3" />
              <span>Conversational Mode</span>
            </div>
          </button>

          {/* THE FORGE */}
          <button
            onClick={() => setPhase('forge')}
            className="group relative p-8 border-2 border-zinc-900 hover:border-fresh-blood transition-all duration-500 text-left space-y-6 bg-zinc-950/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 border border-zinc-800 group-hover:border-fresh-blood group-hover:bg-fresh-blood/10 transition-all">
                <Hammer className="w-6 h-6 text-zinc-400 group-hover:text-fresh-blood transition-colors" />
              </div>
              <span className="font-mono text-[10px] text-zinc-600 group-hover:text-fresh-blood uppercase tracking-widest transition-colors">
                [ ARCHITECT_PHASE ]
              </span>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase group-hover:text-white transition-colors">The Forge</h2>
              <p className="text-sm text-zinc-500 leading-relaxed font-mono opacity-80">
                Collaborate with the Assistant to architect a new scenario and export your blueprint.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2 text-[9px] font-mono text-zinc-700 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
              <Target className="w-3 h-3" />
              <span>Calibration Required</span>
            </div>
          </button>

          {/* THE ENGINE */}
          <button
            onClick={() => setPhase('engine')}
            className="group relative p-8 border-2 border-zinc-900 hover:border-system-green transition-all duration-500 text-left space-y-6 bg-zinc-950/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 border border-zinc-800 group-hover:border-system-green group-hover:bg-system-green/10 transition-all">
                <Play className="w-6 h-6 text-zinc-400 group-hover:text-system-green transition-colors" />
              </div>
              <span className="font-mono text-[10px] text-zinc-600 group-hover:text-system-green uppercase tracking-widest transition-colors">
                [ RUNTIME_PHASE ]
              </span>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase group-hover:text-white transition-colors">The Engine</h2>
              <p className="text-sm text-zinc-500 leading-relaxed font-mono opacity-80">
                Load a scenario blueprint and initialize the simulation.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2 text-[9px] font-mono text-zinc-700 uppercase tracking-widest group-hover:text-zinc-400 transition-colors text-system-green/50">
              <Activity className="w-3 h-3" />
              <span>Ready for Execution</span>
            </div>
          </button>
        </div>

        <footer className="pt-16 border-t border-zinc-900/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 hover:opacity-100 transition-opacity duration-700">
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-4">
              <span>Grounding: Active</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>Sensory: Enabled</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>Memory: Persistent</span>
            </div>
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.4em]">
              Zero Gamification Protocol
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

