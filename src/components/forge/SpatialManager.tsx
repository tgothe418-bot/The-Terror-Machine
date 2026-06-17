import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';

export const SpatialManager: React.FC = () => {
  const { topology } = useForgeState();
  const [newNodeId, setNewNodeId] = useState('');

  const nodes = Object.keys(topology);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedId = newNodeId.trim().toUpperCase().replace(/\s+/g, '_');
    if (!formattedId) return;
    
    forgeActions.addSpatialNode(formattedId);
    setNewNodeId('');
  };

  return (
    <div className="w-full flex flex-col gap-6 text-zinc-300 font-mono">
      <div className="border border-zinc-800 bg-black/40 p-4">
        <h2 className="text-xs tracking-[0.2em] text-zinc-500 uppercase mb-4 border-b border-zinc-800 pb-2">
          [ Forge // Euclidean Topology Grid ]
        </h2>
        
        <form onSubmit={handleAddNode} className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="e.g., ROOM_1408 or BASEMENT_HALL" 
            value={newNodeId}
            onChange={(e) => setNewNodeId(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-sm focus:outline-none focus:border-zinc-500 uppercase"
          />
          <button 
            type="submit" 
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 px-6 py-2 text-xs tracking-widest uppercase transition-colors"
          >
            Inject Node
          </button>
        </form>

        {nodes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-800 text-xs text-center">
              <thead>
                <tr>
                  <th className="border border-zinc-800 bg-zinc-950 p-2 text-zinc-500">ROOT \ ADJACENT</th>
                  {nodes.map(node => (
                    <th key={`col-${node}`} className="border border-zinc-800 bg-zinc-900 p-2 font-normal">
                      {node}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodes.map(rowNode => (
                  <tr key={`row-${rowNode}`}>
                    <td className="border border-zinc-800 bg-zinc-900 p-2 text-left flex justify-between items-center group">
                      <span>{rowNode}</span>
                      {rowNode !== 'NODE_INIT' && (
                        <button 
                          onClick={() => forgeActions.removeSpatialNode(rowNode)}
                          className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          [X]
                        </button>
                      )}
                    </td>
                    {nodes.map(colNode => {
                      const isSelf = rowNode === colNode;
                      const isConnected = topology[rowNode].includes(colNode);
                      
                      return (
                        <td 
                          key={`cell-${rowNode}-${colNode}`} 
                          className={`border border-zinc-800 p-0 transition-colors ${isSelf ? 'bg-zinc-950' : 'bg-black/20 hover:bg-zinc-800'}`}
                        >
                          {!isSelf && (
                            <button
                              onClick={() => forgeActions.toggleSpatialEdge(rowNode, colNode)}
                              className={`w-full h-full p-2 ${isConnected ? 'text-green-500' : 'text-zinc-700'}`}
                            >
                              {isConnected ? '[ LINKED ]' : '---'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-zinc-800 text-zinc-600 text-sm">
            TOPOLOGY EMPTY. AWAITING NODE INJECTION.
          </div>
        )}
      </div>
    </div>
  );
};
