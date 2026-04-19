import React, { useState, useEffect } from 'react';
import { useEngineStore } from '../../core/store';
import EngineSetup from './EngineSetup';
import Runtime from './Runtime';

export default function Engine() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useEngineStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useEngineStore.persist.onFinishHydration(() => setHydrated(true));
    
    if (useEngineStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsub();
      unsubFinish();
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <span className="text-[10px] text-zinc-800 uppercase tracking-[0.4em] animate-pulse">
          Synchronizing Neural Link...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black">
      {!activeBlueprint ? <EngineSetup /> : <Runtime />}
    </div>
  );
}

