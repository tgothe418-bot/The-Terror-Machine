import { forgeActions, useForgeState } from '../../store/useForgeStore';
import { TopologyEdge, EdgeAuthority } from '../../types';

export const SpatialManager = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);
  const topology = blueprint?.topology;
  const { updateDraft } = forgeActions;

  const handleAuthorityChange = (index: number, newAuthority: EdgeAuthority) => {
    if (!topology || !topology.connections) return;
    
    // Create deep copy to update
    const updatedConnections = [...topology.connections];
    const targetEdge = updatedConnections[index];
    
    // Normalize if it's currently a string
    if (typeof targetEdge === 'string') {
      const parts = targetEdge.split('->').map(s => s.trim());
      updatedConnections[index] = {
        from: parts[0] || "",
        to: parts[1] || "",
        kind: "physical",
        userInitiated: true,
        legacyUpgraded: true,
        authority: newAuthority
      };
    } else {
      updatedConnections[index] = {
        ...targetEdge,
        authority: newAuthority
      };
    }
    
    updateDraft({
      topology: {
        ...topology,
        connections: updatedConnections
      }
    });
  };

  if (!topology || !topology.nodes || topology.nodes.length === 0) {
    return (
      <div className="border border-zinc-800 p-6 text-center text-zinc-600 font-mono text-sm">
        [ AWAITING TOPOLOGY EXTRACTION ]
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase border-b border-zinc-800 pb-2">
        [ EUCLIDEAN TOPOLOGY GRID ]
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {topology.nodes.map((node: string, i: number) => (
          <div key={i} className="border border-zinc-700 bg-zinc-900/40 p-3 text-center">
            <span className="text-cyan-500 font-mono text-xs">{node}</span>
          </div>
        ))}
      </div>
      {topology.connections && topology.connections.length > 0 && (
        <div className="mt-4 p-3 border border-zinc-800 bg-black">
          <div className="text-zinc-600 text-xs font-mono mb-2">KNOWN VECTORS:</div>
          <div className="space-y-2">
            {topology.connections.map((conn: TopologyEdge | string, i: number) => {
               const displayStr = typeof conn === 'string' ? conn : `${conn.from} -> ${conn.to}`;
               const authority = typeof conn === 'object' && conn.authority ? conn.authority : 'user';
               
               return (
                 <div key={i} className="flex items-center justify-between group py-1 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/30 px-2 transition-colors">
                   <div className="flex items-center gap-3">
                     <span className="text-zinc-400 text-xs font-mono">{displayStr}</span>
                     {authority !== 'user' && (
                       <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${authority === 'system' ? 'bg-red-900/40 text-red-400' : 'bg-purple-900/40 text-purple-400'}`}>
                         [{authority}]
                       </span>
                     )}
                   </div>
                   <select 
                     value={authority}
                     onChange={(e) => handleAuthorityChange(i, e.target.value as EdgeAuthority)}
                     className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 rounded px-1 py-0.5 outline-none focus:border-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity uppercase"
                   >
                     <option value="user">USER</option>
                     <option value="engine">ENGINE</option>
                     <option value="system">SYSTEM</option>
                   </select>
                 </div>
               );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
