import { useForgeState } from '../../store/useForgeStore';

export const NarrativeLens = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);

  if (!blueprint?.perspectives || blueprint.perspectives.length === 0) return null;

  return (
    <div className="border border-zinc-800 bg-black p-4 mt-4 flex flex-col min-h-0 flex-shrink-0 max-h-[40vh]">
      <div className="text-zinc-500 text-xs font-bold tracking-[0.2em] mb-4 uppercase border-b border-zinc-800 pb-2">
        [ SUBJECTIVE PERSPECTIVE LENSES ]
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {blueprint.perspectives.map((lens, i) => (
          <div key={i} className="bg-zinc-900/30 p-3 border border-zinc-800/50">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                lens.role === 'ANTAGONIST' ? 'bg-red-900/30 text-red-500 border border-red-900' : 'bg-cyan-900/30 text-cyan-500 border border-cyan-900'
              }`}>
                {lens.role}
              </span>
            </div>
            <p className="text-zinc-400 text-sm font-serif mb-2">{lens.framingDirective}</p>
            <div className="text-xs font-mono text-zinc-500">
              <span className="text-green-500">STARTING_STATE:</span> {lens.startingSemanticState}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
