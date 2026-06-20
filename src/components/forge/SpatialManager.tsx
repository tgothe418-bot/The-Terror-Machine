import { useForgeState } from '../../store/useForgeStore';
import { TopologyEdge } from '../../types';

export const SpatialManager = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);
  const topology = blueprint?.topology;

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
          {topology.connections.map((conn: TopologyEdge | string, i: number) => {
             const displayStr = typeof conn === 'string' ? conn : `${conn.from} -> ${conn.to} (${conn.kind})`;
             return <div key={i} className="text-zinc-400 text-xs font-mono">- {displayStr}</div>
          })}
        </div>
      )}
    </div>
  );
};
