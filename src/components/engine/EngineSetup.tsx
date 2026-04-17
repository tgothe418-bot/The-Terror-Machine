import React, { useRef, useState } from 'react';
import { ArrowLeft, Upload, FileJson, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { ScenarioBlueprint } from '../../types';

export default function EngineSetup() {
  const setPhase = useAppStore((state) => state.setPhase);
  const setBlueprint = useEngineStore((state) => state.setBlueprint);
  const [error, setError] = useState<string | null>(null);
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

        // Validation: Check for required properties
        if (parsed.title && parsed.contentScale && parsed.setting && parsed.contentLevelDescription) {
          setBlueprint(parsed as ScenarioBlueprint);
        } else {
          setError('INVALID BLUEPRINT: REQUIRED PARAMETERS MISSING (TITLE, SCALE, SETTING, OR DESCRIPTION)');
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

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col p-8 font-mono selection:bg-white selection:text-black">
      <header className="flex items-center justify-between mb-24">
        <button 
          onClick={() => setPhase('hub')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]"
        >
          <ArrowLeft className="w-3 h-3" />
          Return to Hub
        </button>
        <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400">The Engine // Setup</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-light tracking-widest uppercase">Initialize Simulation</h2>
          <p className="text-zinc-500 text-xs tracking-tight uppercase leading-relaxed">
            Upload a strictly-typed Scenario Blueprint to begin the narrative simulation.
          </p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video border border-dashed border-zinc-800 hover:border-zinc-500 transition-all duration-500 bg-zinc-950/30 flex flex-col items-center justify-center cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <FileJson className="w-12 h-12 text-zinc-700 group-hover:text-white transition-colors mb-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 group-hover:text-zinc-300">
            Select Blueprint File
          </span>
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
      </div>
    </div>
  );
}
