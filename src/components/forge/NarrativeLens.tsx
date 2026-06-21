import { useForgeState, forgeActions } from '../../store/useForgeStore';

export const NarrativeLens = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);
  const { updateDraft } = forgeActions;

  if (!blueprint?.perspectives || blueprint.perspectives.length === 0) return null;

  const handleRoleChange = (index: number, newRole: string) => {
    if (!blueprint.perspectives) return;
    const updatedPerspectives = [...blueprint.perspectives];
    const lens = updatedPerspectives[index];
    lens.role = newRole;
    
    if (newRole === 'DIRECTOR' || newRole === 'WITNESS') {
      lens.subjectCharacterId = undefined;
    }
    
    updateDraft({ perspectives: updatedPerspectives });
  };

  return (
    <div className="border border-zinc-800 bg-black p-4 mt-4 flex flex-col min-h-0 flex-shrink-0 max-h-[40vh]">
      <div className="text-zinc-500 text-xs font-bold tracking-[0.2em] mb-4 uppercase border-b border-zinc-800 pb-2">
        [ SUBJECTIVE PERSPECTIVE LENSES ]
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {blueprint.perspectives.map((lens, i) => (
          <div key={i} className="bg-zinc-900/30 p-3 border border-zinc-800/50">
            <div className="flex justify-between items-center mb-2 gap-2">
              <select
                value={lens.role}
                onChange={(e) => handleRoleChange(i, e.target.value)}
                className={`text-xs font-mono px-2 py-1 rounded outline-none w-32 ${
                  lens.role === 'ANTAGONIST' ? 'bg-red-900/30 text-red-500 border border-red-900' : 'bg-cyan-900/30 text-cyan-500 border border-cyan-900'
                }`}
              >
                <option value="PROTAGONIST">PROTAGONIST</option>
                <option value="ANTAGONIST">ANTAGONIST</option>
                <option value="DIRECTOR">DIRECTOR</option>
                <option value="WITNESS">WITNESS</option>
                <option value="POSSESSED">POSSESSED</option>
              </select>
              
              {lens.role !== 'DIRECTOR' && lens.role !== 'WITNESS' && (
                <div className="flex-1 flex items-center gap-2">
                   <span className="text-zinc-500 text-[10px] uppercase">Subject:</span>
                   <select 
                     value={lens.subjectCharacterId || ''}
                     onChange={(e) => {
                       const updatedPerspectives = [...blueprint.perspectives!];
                       updatedPerspectives[i].subjectCharacterId = e.target.value || undefined;
                       updateDraft({ perspectives: updatedPerspectives });
                     }}
                     className="bg-zinc-800 text-zinc-300 text-xs font-mono px-2 py-1 flex-1 border border-zinc-700 outline-none"
                   >
                     <option value="">-- Null Avatar --</option>
                     {blueprint.cast?.map((char: { id: string, name: string }) => (
                       <option value={char.id} key={char.id}>{char.name}</option>
                     ))}
                   </select>
                </div>
              )}
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
