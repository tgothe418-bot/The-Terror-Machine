import React, { useState } from 'react';
import { useEngineStore } from '../../core/store';
import { useAppStore } from '../../store/useAppStore';
import { useHydratedStores } from '../../lib/sessionReconciliation';
import EngineSetup from './EngineSetup';
import Runtime from './Runtime';

export default function Engine() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const phase = useAppStore((state) => state.phase);
  const [forcingSetup, setForcingSetup] = useState(false);
  const { isHydrated, isCoherent } = useHydratedStores();

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <span className="text-[10px] text-zinc-800 uppercase tracking-[0.4em] animate-pulse">
          Synchronizing Neural Link...
        </span>
      </div>
    );
  }

  // If stores are incoherent or failed closed to clean setup, route to EngineSetup
  if (!isCoherent) {
    return <EngineSetup onContinue={() => setForcingSetup(false)} />;
  }

  // Always show Setup if forcing it, OR if no blueprint exists AND we aren't in Ad-Lib.
  if ((!activeBlueprint && phase !== 'ENGINE' && phase !== 'LATENT') || forcingSetup) {
    return <EngineSetup onContinue={() => setForcingSetup(false)} />;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black">
      <Runtime />
    </div>
  );
}
