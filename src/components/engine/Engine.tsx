import { useEngineStore } from '../../core/store';
import EngineSetup from './EngineSetup';
import Runtime from './Runtime';

export default function Engine() {
  const activeBlueprint = useEngineStore((state) => state.activeBlueprint);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black">
      {!activeBlueprint ? <EngineSetup /> : <Runtime />}
    </div>
  );
}

