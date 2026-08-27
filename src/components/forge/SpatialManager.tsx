import React, { useState } from 'react';
import { forgeActions, useForgeState } from '../../store/useForgeStore';
import { EdgeKind } from '../../types';
import {
  ForgeTopologyNode,
  ForgeExpandableAnchor,
  CharacterPresenceDisposition,
} from '../../types/forge';
import {
  Compass,
  ArrowRight,
  Plus,
  Trash2,
  Users,
  Anchor,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const SpatialManager: React.FC = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);
  const sourceAnalyses = useForgeState((state) => state.sourceAnalyses);
  const topology = blueprint?.topology;
  const cast = blueprint?.cast || [];
  const { updateDraft } = forgeActions;

  const [activeTab, setActiveTab] = useState<'flowchart' | 'textual'>('flowchart');
  const [expandedAnchors, setExpandedAnchors] = useState<Record<string, boolean>>({});
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showAddAnchor, setShowAddAnchor] = useState(false);

  // New Node Form State
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeDesc, setNewNodeDesc] = useState('');

  // New Edge Form State
  const [newEdgeFrom, setNewEdgeFrom] = useState('');
  const [newEdgeTo, setNewEdgeTo] = useState('');
  const [newEdgeKind, setNewEdgeKind] = useState<EdgeKind>('PHYSICAL');

  // New Anchor Form State
  const [newAnchorId, setNewAnchorId] = useState('');
  const [newAnchorParent, setNewAnchorParent] = useState('');
  const [newAnchorLabel, setNewAnchorLabel] = useState('');
  const [newAnchorDesc, setNewAnchorDesc] = useState('');

  // Derive normalized node list
  const nodeDefs: ForgeTopologyNode[] = topology?.nodeDefinitions || [];
  const rawNodes: string[] = topology?.nodes || [];

  // Build unified map of nodes
  const nodesMap = new Map<string, ForgeTopologyNode>();
  nodeDefs.forEach((d) => {
    if (d.id) nodesMap.set(d.id, d);
  });
  rawNodes.forEach((n) => {
    if (n && !nodesMap.has(n)) {
      nodesMap.set(n, {
        id: n,
        label: n.replace(/_/g, ' '),
        description: '',
      });
    }
  });

  const allNodes = Array.from(nodesMap.values());
  const validNodeIds = allNodes.map((n) => n.id);
  const startingNodeId = topology?.startingNodeId || validNodeIds[0] || '';
  const connections = topology?.connections || [];
  const anchors: ForgeExpandableAnchor[] = topology?.anchors || [];

  const toggleAnchorExpand = (anchorId: string) => {
    setExpandedAnchors((prev) => ({ ...prev, [anchorId]: !prev[anchorId] }));
  };

  const handleSetStartingNode = (nodeId: string) => {
    if (!topology) return;
    const userChar = cast.find((c) => c.isUserCharacter) || (blueprint?.userCharacterId ? cast.find((c) => c.id === blueprint.userCharacterId) : undefined);
    const updatedCast = userChar
      ? cast.map((m) =>
          m.id === userChar.id
            ? {
                ...m,
                presenceDisposition: { kind: 'AT_NODE' as const, nodeId },
                starting_location: nodeId,
              }
            : m
        )
      : cast;

    updateDraft({
      topology: {
        ...topology,
        startingNodeId: nodeId,
      },
      cast: updatedCast,
    });
  };

  const handleAddNode = () => {
    if (!newNodeId.trim() || !newNodeLabel.trim()) return;
    const cleanId = newNodeId.trim().toUpperCase().replace(/\s+/g, '_');
    if (validNodeIds.includes(cleanId)) return;

    const newDef: ForgeTopologyNode = {
      id: cleanId,
      label: newNodeLabel.trim(),
      description: newNodeDesc.trim(),
    };

    const nextDefs = [...nodeDefs, newDef];
    const nextNodes = Array.from(new Set([...rawNodes, cleanId]));

    updateDraft({
      topology: {
        ...(topology || { connections: [] }),
        nodes: nextNodes,
        nodeDefinitions: nextDefs,
        startingNodeId: startingNodeId || cleanId,
      },
    });

    setNewNodeId('');
    setNewNodeLabel('');
    setNewNodeDesc('');
    setShowAddNode(false);
  };

  const handleRemoveNode = (nodeId: string) => {
    if (!topology) return;
    const nextDefs = nodeDefs.filter((d) => d.id !== nodeId);
    const nextNodes = rawNodes.filter((n) => n !== nodeId);
    const nextConns = connections.filter((c) => {
      const from = typeof c === 'string' ? c.split('->')[0]?.trim() : c.from;
      const to = typeof c === 'string' ? c.split('->')[1]?.trim() : c.to;
      return from !== nodeId && to !== nodeId;
    });
    const nextAnchors = anchors.filter((a) => a.parentNodeId !== nodeId);

    let nextStart = startingNodeId;
    if (nextStart === nodeId) {
      nextStart = nextNodes[0] || (nextDefs[0] ? nextDefs[0].id : '');
    }

    updateDraft({
      topology: {
        ...topology,
        nodes: nextNodes,
        nodeDefinitions: nextDefs,
        connections: nextConns,
        anchors: nextAnchors,
        startingNodeId: nextStart,
      },
    });
  };

  const handleAddEdge = () => {
    if (!newEdgeFrom || !newEdgeTo || newEdgeFrom === newEdgeTo) return;
    const exists = connections.some((c) => {
      const f = typeof c === 'string' ? c.split('->')[0]?.trim() : c.from;
      const t = typeof c === 'string' ? c.split('->')[1]?.trim() : c.to;
      return f === newEdgeFrom && t === newEdgeTo;
    });
    if (exists) return;

    const newEdge = {
      from: newEdgeFrom,
      to: newEdgeTo,
      kind: newEdgeKind,
      userInitiated: true,
    };

    updateDraft({
      topology: {
        ...(topology || { nodes: [] }),
        connections: [...connections, newEdge],
      },
    });

    setNewEdgeFrom('');
    setNewEdgeTo('');
    setShowAddEdge(false);
  };

  const handleRemoveEdge = (index: number) => {
    if (!topology || !topology.connections) return;
    const updated = [...topology.connections];
    updated.splice(index, 1);
    updateDraft({
      topology: {
        ...topology,
        connections: updated,
      },
    });
  };

  const handleAddAnchor = () => {
    if (!newAnchorId.trim() || !newAnchorParent || !newAnchorLabel.trim()) return;
    const cleanId = newAnchorId.trim().toLowerCase().replace(/\s+/g, '-');
    const newAnchor: ForgeExpandableAnchor = {
      id: cleanId,
      parentNodeId: newAnchorParent,
      label: newAnchorLabel.trim(),
      description: newAnchorDesc.trim(),
      statement: 'Not yet a canonical runtime node or exit',
    };

    updateDraft({
      topology: {
        ...(topology || { nodes: [], connections: [] }),
        anchors: [...anchors, newAnchor],
      },
    });

    setNewAnchorId('');
    setNewAnchorParent('');
    setNewAnchorLabel('');
    setNewAnchorDesc('');
    setShowAddAnchor(false);
  };

  const handleRemoveAnchor = (anchorId: string) => {
    if (!topology) return;
    updateDraft({
      topology: {
        ...topology,
        anchors: anchors.filter((a) => a.id !== anchorId),
      },
    });
  };

  const handleUpdateCastPlacement = (
    castMemberId: string,
    disposition: CharacterPresenceDisposition
  ) => {
    const updatedCast = cast.map((m) => {
      if (m.id === castMemberId) {
        return {
          ...m,
          presenceDisposition: disposition,
          starting_location: disposition.kind === 'AT_NODE' ? disposition.nodeId : '',
        };
      }
      return m;
    });
    updateDraft({ cast: updatedCast });
  };

  if (allNodes.length === 0) {
    return (
      <div className="border border-zinc-800 p-6 text-center text-zinc-600 font-mono text-xs space-y-3">
        <div>[ AWAITING CANONICAL STORY MAP EXTRACTION ]</div>
        <button
          onClick={() => setShowAddNode(true)}
          className="px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 rounded font-bold uppercase text-[10px] hover:bg-cyan-900/60 transition-colors cursor-pointer"
        >
          + Add Opening Story Node
        </button>
      </div>
    );
  }

  // Cast members present per node
  const castAtNode = (nodeId: string) => {
    return cast.filter((c) => {
      if (c.presenceDisposition?.kind === 'AT_NODE') {
        return c.presenceDisposition.nodeId === nodeId;
      }
      return c.starting_location === nodeId;
    });
  };

  const unplacedCast = cast.filter(
    (c) =>
      !c.presenceDisposition &&
      (!c.starting_location || !validNodeIds.includes(c.starting_location))
  );

  return (
    <div id="spatial-manager" className="space-y-4 font-mono text-xs text-zinc-300">
      {/* HEADER & CONTROLS */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-zinc-100 uppercase tracking-widest text-[11px]">
            Story Map & Opening Placement
          </span>
          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            {allNodes.length} nodes · {connections.length} edges
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[10px]">
            <button
              onClick={() => setActiveTab('flowchart')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                activeTab === 'flowchart'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Flowchart View
            </button>
            <button
              onClick={() => setActiveTab('textual')}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                activeTab === 'textual'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Textual Editor
            </button>
          </div>

          <button
            onClick={() => setShowAddNode(!showAddNode)}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            Node
          </button>
          <button
            onClick={() => setShowAddEdge(!showAddEdge)}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            Edge
          </button>
          <button
            onClick={() => setShowAddAnchor(!showAddAnchor)}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-purple-400" />
            Anchor
          </button>
        </div>
      </div>

      {/* ADD NODE INLINE FORM */}
      {showAddNode && (
        <div className="p-3 bg-zinc-900/60 border border-cyan-900/60 rounded space-y-2">
          <div className="font-bold text-[10px] text-cyan-400 uppercase tracking-wider">
            Add Main Story Node
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Node ID (e.g. BRIDGE_DECK)"
              value={newNodeId}
              onChange={(e) => setNewNodeId(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-100"
            />
            <input
              type="text"
              placeholder="Display Label (e.g. Command Bridge)"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-100"
            />
          </div>
          <textarea
            placeholder="Spatial Description..."
            value={newNodeDesc}
            onChange={(e) => setNewNodeDesc(e.target.value)}
            rows={2}
            className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-100"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddNode(false)}
              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNode}
              className="px-2.5 py-1 bg-cyan-500 text-black font-bold text-[10px] rounded uppercase hover:bg-cyan-400 cursor-pointer"
            >
              Add Node
            </button>
          </div>
        </div>
      )}

      {/* ADD EDGE INLINE FORM */}
      {showAddEdge && (
        <div className="p-3 bg-zinc-900/60 border border-cyan-900/60 rounded space-y-2">
          <div className="font-bold text-[10px] text-cyan-400 uppercase tracking-wider">
            Add Directed Edge
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={newEdgeFrom}
              onChange={(e) => setNewEdgeFrom(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-200"
            >
              <option value="">From Node...</option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.id})
                </option>
              ))}
            </select>

            <select
              value={newEdgeTo}
              onChange={(e) => setNewEdgeTo(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-200"
            >
              <option value="">To Node...</option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.id})
                </option>
              ))}
            </select>

            <select
              value={newEdgeKind}
              onChange={(e) => setNewEdgeKind(e.target.value as EdgeKind)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-200"
            >
              <option value="PHYSICAL">PHYSICAL</option>
              <option value="FORCED_EVENT">FORCED_EVENT</option>
              <option value="MEMORY_RECONSTRUCTION">MEMORY_RECONSTRUCTION</option>
              <option value="HISTORICAL_REFERENCE">HISTORICAL_REFERENCE</option>
              <option value="TERMINAL_EJECTION">TERMINAL_EJECTION</option>
              <option value="AUTHORED_PARADOX">AUTHORED_PARADOX</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddEdge(false)}
              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddEdge}
              className="px-2.5 py-1 bg-cyan-500 text-black font-bold text-[10px] rounded uppercase hover:bg-cyan-400 cursor-pointer"
            >
              Add Connection
            </button>
          </div>
        </div>
      )}

      {/* ADD EXPANDABLE ANCHOR INLINE FORM */}
      {showAddAnchor && (
        <div className="p-3 bg-purple-950/40 border border-purple-900/60 rounded space-y-2">
          <div className="font-bold text-[10px] text-purple-300 uppercase tracking-wider">
            Add Secondary Expandable Anchor (Not yet an instantiated room)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Anchor ID (e.g. vent-shaft-3)"
              value={newAnchorId}
              onChange={(e) => setNewAnchorId(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-100"
            />
            <select
              value={newAnchorParent}
              onChange={(e) => setNewAnchorParent(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-200"
            >
              <option value="">Parent Node...</option>
              {allNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.id})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Anchor Label (e.g. Ventilation Shaft)"
              value={newAnchorLabel}
              onChange={(e) => setNewAnchorLabel(e.target.value)}
              className="bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-100"
            />
          </div>
          <textarea
            placeholder="Region boundary or sensory description..."
            value={newAnchorDesc}
            onChange={(e) => setNewAnchorDesc(e.target.value)}
            rows={2}
            className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-100"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddAnchor(false)}
              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAnchor}
              className="px-2.5 py-1 bg-purple-500 text-black font-bold text-[10px] rounded uppercase hover:bg-purple-400 cursor-pointer"
            >
              Add Anchor
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: FLOWCHART VIEW */}
      {activeTab === 'flowchart' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allNodes.map((node) => {
              const isStart = node.id === startingNodeId;
              const nodeCast = castAtNode(node.id);
              const nodeAnchors = anchors.filter((a) => a.parentNodeId === node.id);
              const outgoingEdges = connections.filter((c) => {
                const from = typeof c === 'string' ? c.split('->')[0]?.trim() : c.from;
                return from === node.id;
              });

              return (
                <div
                  key={node.id}
                  id={`story-node-card-${node.id}`}
                  className={`border rounded p-3.5 space-y-2.5 transition-all ${
                    isStart
                      ? 'bg-cyan-950/20 border-cyan-700/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Node Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-100 text-xs truncate">
                          {node.label}
                        </span>
                        {isStart && (
                          <span className="px-1.5 py-0.2 bg-cyan-500 text-black font-bold text-[9px] uppercase tracking-wider rounded">
                            START
                          </span>
                        )}
                        {node.classification && (
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-zinc-800 text-zinc-400">
                            {node.classification}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">
                        ID: {node.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isStart && (
                        <button
                          onClick={() => handleSetStartingNode(node.id)}
                          className="text-[9px] px-1.5 py-0.5 bg-zinc-900 hover:bg-cyan-950/80 border border-zinc-800 hover:border-cyan-800 text-zinc-400 hover:text-cyan-300 rounded cursor-pointer"
                          title="Set as opening start node"
                        >
                          Make Start
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveNode(node.id)}
                        className="text-zinc-600 hover:text-red-400 p-0.5 rounded cursor-pointer"
                        title="Remove node"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {node.description && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {node.description}
                    </p>
                  )}

                  {/* Cast Members Present */}
                  {nodeCast.length > 0 && (
                    <div className="space-y-1 bg-black/40 border border-zinc-800/80 rounded p-2 text-[10px]">
                      <div className="text-zinc-500 uppercase font-bold flex items-center gap-1">
                        <Users className="w-3 h-3 text-cyan-400" />
                        <span>Present Cast ({nodeCast.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {nodeCast.map((c) => (
                          <span
                            key={c.id}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                              c.isUserCharacter
                                ? 'bg-cyan-950/60 border-cyan-700 text-cyan-200'
                                : c.isEntity
                                ? 'bg-purple-950/60 border-purple-700 text-purple-200'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {c.name || 'Unknown'} {c.isUserCharacter ? '(You)' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outgoing Connections */}
                  {outgoingEdges.length > 0 && (
                    <div className="space-y-1 text-[10px]">
                      <span className="text-zinc-500 uppercase font-bold block">
                        Exits ({outgoingEdges.length}):
                      </span>
                      <div className="space-y-1">
                        {outgoingEdges.map((edge, eIdx) => {
                          const toId = typeof edge === 'string' ? edge.split('->')[1]?.trim() : edge.to;
                          const targetLabel = nodesMap.get(toId)?.label || toId;
                          const edgeKind = typeof edge === 'object' ? edge.kind : 'PHYSICAL';
                          return (
                            <div
                              key={eIdx}
                              className="flex items-center justify-between text-zinc-400 bg-zinc-900/40 px-2 py-0.5 rounded border border-zinc-800/50"
                            >
                              <span className="flex items-center gap-1 truncate">
                                <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                                <span className="text-zinc-200 font-bold">{targetLabel}</span>
                                <span className="text-zinc-500 text-[9px]">[{edgeKind}]</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expandable Anchors Secondary Branches */}
                  {nodeAnchors.length > 0 && (
                    <div className="border-t border-zinc-800/60 pt-2 space-y-1">
                      <div className="text-purple-400 text-[10px] uppercase font-bold flex items-center gap-1">
                        <Anchor className="w-3 h-3 text-purple-400" />
                        <span>Secondary Anchors ({nodeAnchors.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {nodeAnchors.map((anchor) => {
                          const isExpanded = expandedAnchors[anchor.id];
                          return (
                            <div
                              key={anchor.id}
                              className="bg-purple-950/20 border border-purple-900/40 rounded p-1.5 text-[10px]"
                            >
                              <div
                                onClick={() => toggleAnchorExpand(anchor.id)}
                                className="flex items-center justify-between cursor-pointer"
                              >
                                <span className="font-bold text-purple-200 flex items-center gap-1">
                                  {isExpanded ? (
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  ) : (
                                    <ChevronRight className="w-2.5 h-2.5" />
                                  )}
                                  {anchor.label}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAnchor(anchor.id);
                                  }}
                                  className="text-zinc-600 hover:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="mt-1 space-y-0.5 text-zinc-400 border-t border-purple-900/30 pt-1">
                                  <p>{anchor.description || 'No description provided.'}</p>
                                  <span className="text-[9px] text-purple-400/80 block italic">
                                    {anchor.statement || 'Not yet a canonical runtime node or exit.'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TEXTUAL EDITOR */}
      {activeTab === 'textual' && (
        <div className="space-y-4">
          {/* Main Nodes Table */}
          <div className="border border-zinc-800 rounded bg-black/60 overflow-hidden">
            <div className="bg-zinc-900/60 p-2.5 border-b border-zinc-800 font-bold text-[11px] text-zinc-300 uppercase">
              Authored Map Nodes ({allNodes.length})
            </div>
            <div className="divide-y divide-zinc-800">
              {allNodes.map((n) => (
                <div key={n.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100">{n.label}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">[{n.id}]</span>
                      {n.id === startingNodeId && (
                        <span className="px-1 py-0.2 bg-cyan-500 text-black text-[9px] font-bold rounded">
                          START
                        </span>
                      )}
                    </div>
                    {n.description && <p className="text-zinc-400 text-[11px]">{n.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.id !== startingNodeId && (
                      <button
                        onClick={() => handleSetStartingNode(n.id)}
                        className="px-2 py-1 bg-zinc-900 hover:bg-cyan-950 border border-zinc-700 text-zinc-300 text-[10px] rounded cursor-pointer"
                      >
                        Set Start
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveNode(n.id)}
                      className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Directed Connections Table */}
          <div className="border border-zinc-800 rounded bg-black/60 overflow-hidden">
            <div className="bg-zinc-900/60 p-2.5 border-b border-zinc-800 font-bold text-[11px] text-zinc-300 uppercase">
              Directed Connections ({connections.length})
            </div>
            <div className="divide-y divide-zinc-800">
              {connections.map((conn, idx) => {
                const from = typeof conn === 'string' ? conn.split('->')[0]?.trim() : conn.from;
                const to = typeof conn === 'string' ? conn.split('->')[1]?.trim() : conn.to;
                const kind = typeof conn === 'object' ? conn.kind : 'PHYSICAL';
                return (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 font-bold">{nodesMap.get(from)?.label || from}</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <span className="text-zinc-200 font-bold">{nodesMap.get(to)?.label || to}</span>
                      <span className="text-zinc-500 text-[10px]">[{kind}]</span>
                    </div>
                    <button
                      onClick={() => handleRemoveEdge(idx)}
                      className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CAST OPENING PLACEMENT MANIFEST */}
      <div className="border border-zinc-800 rounded bg-black/60 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-zinc-200 uppercase text-[11px]">
              Cast Opening Placement Manifest
            </span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Every character requires reviewed placement before simulation start
          </span>
        </div>

        {unplacedCast.length > 0 && (
          <div className="p-2.5 bg-amber-950/40 border border-amber-900/60 rounded text-amber-200 text-[11px]">
            ⚠️ {unplacedCast.length} cast member(s) have unassigned placement. Assign node or disposition to resolve export preflight.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cast.map((member) => {
            const currentDisp = member.presenceDisposition?.kind || (member.starting_location ? 'AT_NODE' : 'UNASSIGNED');
            const currentNodeId = member.presenceDisposition?.kind === 'AT_NODE' ? member.presenceDisposition.nodeId : member.starting_location || '';

            return (
              <div
                key={member.id}
                className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-bold text-zinc-200 truncate flex items-center gap-1.5">
                    <span>{member.name || 'Unknown'}</span>
                    {member.isUserCharacter && (
                      <span className="text-[9px] px-1 bg-cyan-900 text-cyan-200 rounded">
                        Player
                      </span>
                    )}
                    {member.isEntity && (
                      <span className="text-[9px] px-1 bg-purple-900 text-purple-200 rounded">
                        Entity
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500">Role: {member.role || 'Subject'}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={currentDisp}
                    onChange={(e) => {
                      const newKind = e.target.value;
                      if (newKind === 'AT_NODE') {
                        handleUpdateCastPlacement(member.id, {
                          kind: 'AT_NODE',
                          nodeId: currentNodeId || startingNodeId,
                        });
                      } else if (newKind === 'OFFSTAGE') {
                        handleUpdateCastPlacement(member.id, { kind: 'OFFSTAGE' });
                      } else if (newKind === 'NONLOCAL') {
                        handleUpdateCastPlacement(member.id, { kind: 'NONLOCAL' });
                      }
                    }}
                    className="bg-black border border-zinc-800 text-[10px] text-zinc-300 rounded p-1"
                  >
                    <option value="UNASSIGNED">Unassigned</option>
                    <option value="AT_NODE">At Node</option>
                    <option value="OFFSTAGE">Offstage</option>
                    {member.isEntity && <option value="NONLOCAL">Non-Local</option>}
                  </select>

                  {currentDisp === 'AT_NODE' && (
                    <select
                      value={currentNodeId}
                      onChange={(e) =>
                        handleUpdateCastPlacement(member.id, {
                          kind: 'AT_NODE',
                          nodeId: e.target.value,
                        })
                      }
                      className="bg-black border border-zinc-800 text-[10px] text-cyan-300 rounded p-1 max-w-[120px] truncate"
                    >
                      {allNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OPENING BASELINE (AIMS & PURSUITS) REVIEW */}
      <div className="border border-zinc-800 rounded bg-black/60 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-zinc-200 uppercase text-[11px]">
              Opening Motive Baseline & Intent Review
            </span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Player Opening Aim & HG1 NPC Pursuits
          </span>
        </div>

        {/* 1. PLAYER OPENING AIM SECTION */}
        {(() => {
          const eligibleMembers = cast.filter((c) => !c.isEntity);
          const userMember = cast.find((c) => c.isUserCharacter) || (blueprint?.userCharacterId ? cast.find((c) => c.id === blueprint.userCharacterId) : undefined);

          if (!userMember) {
            return (
              <div className="bg-zinc-900/40 border border-amber-800/60 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs uppercase tracking-wider">
                    Select User Character (Protagonist)
                  </span>
                  <span className="text-[10px] text-zinc-500">Exactly 1 required</span>
                </div>
                <p className="text-xs text-zinc-400">
                  No cast member is currently designated as the player-controlled character. Select an eligible mortal character below:
                </p>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {eligibleMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        const res = forgeActions.setUserCharacter(m.id);
                        if (!res.success && res.error) window.alert(res.error);
                      }}
                      className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-xs font-bold uppercase cursor-pointer"
                    >
                      Set {m.name || m.id} as Player
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          const userAim = blueprint?.userOpeningAim || blueprint?.horrorGrammar?.userOpeningAim;
          const disp = userAim?.disposition || 'UNREVIEWED';

          // Resolve proposed aim text and provenance from draft or sourceAnalyses
          let proposalText = userAim?.aimText || '';
          let hasValidProposal = Boolean(proposalText.trim());
          if (!hasValidProposal && sourceAnalyses) {
            for (const a of Object.values(sourceAnalyses)) {
              const cand = a.candidates?.find(
                (c) =>
                  c.target === 'user_opening_aim_default' &&
                  (c.targetCastMemberId === userMember.id || !c.targetCastMemberId)
              );
              if (cand) {
                const text =
                  typeof cand.proposedValue === 'string'
                    ? cand.proposedValue.trim()
                    : typeof cand.proposedValue === 'object' &&
                      cand.proposedValue !== null &&
                      'aimText' in cand.proposedValue &&
                      typeof cand.proposedValue.aimText === 'string'
                    ? cand.proposedValue.aimText.trim()
                    : '';
                if (text) {
                  proposalText = text;
                  hasValidProposal = true;
                  break;
                }
              }
            }
          }

          return (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-300 text-xs">
                    Player Character: {userMember.name || 'Protagonist'}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      disp === 'ACCEPTED_REFERENCE'
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                        : disp === 'CREATOR_OVERRIDE'
                        ? 'bg-blue-950/60 border border-blue-800 text-blue-300'
                        : disp === 'NONE_DECLARED'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-amber-950/60 border border-amber-800 text-amber-300'
                    }`}
                  >
                    {disp === 'ACCEPTED_REFERENCE'
                      ? 'Accepted Reference'
                      : disp === 'CREATOR_OVERRIDE'
                      ? 'Creator Override'
                      : disp === 'NONE_DECLARED'
                      ? 'None Declared'
                      : 'Unreviewed Proposal'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">Sovereignty: Player Discretion Only</span>
              </div>

              {disp === 'NONE_DECLARED' ? (
                <div className="text-[11px] text-zinc-400 italic bg-black/40 p-2 rounded border border-zinc-800">
                  No opening aim declared. (Engine will not infer or fabricate a player quest or goal).
                </div>
              ) : disp === 'UNREVIEWED' ? (
                <div className="text-xs bg-black/40 p-2 rounded border border-amber-900/50 space-y-1">
                  <span className="text-amber-400/80 text-[10px] uppercase font-bold block">
                    Unreviewed Source Proposal:
                  </span>
                  <div className="text-zinc-200">
                    {proposalText ? (
                      `"${proposalText}"`
                    ) : (
                      <span className="text-zinc-500 italic">No reference proposal available.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-200 bg-black/40 p-2 rounded border border-zinc-800">
                  {userAim?.aimText || (
                    <span className="text-amber-400 italic">No aim text specified yet.</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  disabled={!hasValidProposal}
                  onClick={() => {
                    const res = forgeActions.acceptReferenceOpeningAim();
                    if (!res.success && res.error) {
                      window.alert(res.error);
                    }
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    hasValidProposal
                      ? 'bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 cursor-pointer'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                  title={hasValidProposal ? 'Accept reference opening aim default' : 'No valid proposal to accept'}
                >
                  Accept Reference Default
                </button>

                <button
                  onClick={() => {
                    const customText = window.prompt(
                      'Enter your custom opening aim for ' + (userMember.name || 'player') + ':',
                      userAim?.aimText || proposalText || ''
                    );
                    if (customText !== null && customText.trim().length > 0) {
                      forgeActions.setCreatorOverrideOpeningAim(customText.trim());
                    }
                  }}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] font-bold uppercase cursor-pointer"
                >
                  Use My Own Aim
                </button>

                <button
                  onClick={() => {
                    forgeActions.setNoneDeclaredOpeningAim();
                  }}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[10px] uppercase cursor-pointer"
                >
                  None Declared
                </button>
              </div>
            </div>
          );
        })()}

        {/* 2. NON-USER CAST PURSUITS SECTION */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Non-User Character Pursuits (HG1 Machine Initiative)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {cast
              .filter((c) => !c.isUserCharacter)
              .map((member) => {
                const pReview = blueprint?.horrorGrammar?.pursuitReviews?.[member.id] || 'UNREVIEWED';
                const memberPursuits = (blueprint?.horrorGrammar?.characterPursuits || []).filter(
                  (p) => p.castMemberId === member.id
                );

                return (
                  <div
                    key={member.id}
                    className="p-3 bg-zinc-900/40 border border-zinc-800 rounded space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-zinc-200 text-xs">
                          {member.name || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-1.5">[{member.role}]</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          pReview === 'REVIEWED'
                            ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                            : pReview === 'REVIEWED_NONE'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-amber-950/60 border border-amber-800 text-amber-300'
                        }`}
                      >
                        {pReview === 'REVIEWED'
                          ? `${memberPursuits.length} Pursuit(s)`
                          : pReview === 'REVIEWED_NONE'
                          ? 'No Readable Intent'
                          : 'Unreviewed'}
                      </span>
                    </div>

                    {memberPursuits.length > 0 ? (
                      <div className="space-y-1 text-[11px] bg-black/40 p-2 rounded border border-zinc-800">
                        {memberPursuits.map((p) => (
                          <div key={p.id} className="space-y-0.5">
                            <div className="font-bold text-zinc-300">Obj: {p.objective}</div>
                            <div className="text-zinc-500 text-[10px]">
                              App: {p.presentApproach} · [{p.reviewWindow}]
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic">
                        {pReview === 'REVIEWED_NONE'
                          ? 'No opening intent in reference. Reacts situationally without independent pursuit.'
                          : 'Awaiting intent review.'}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          const currentHg = blueprint?.horrorGrammar || {
                            valueBaselineReview: 'UNREVIEWED',
                            pursuitReviews: {},
                            valueAnchors: [],
                            characterPursuits: [],
                          };
                          const updatedReviews = {
                            ...currentHg.pursuitReviews,
                            [member.id]: 'REVIEWED_NONE' as const,
                          };
                          const updatedPursuits = (currentHg.characterPursuits || []).filter(
                            (p) => p.castMemberId !== member.id
                          );
                          updateDraft({
                            horrorGrammar: {
                              ...currentHg,
                              pursuitReviews: updatedReviews,
                              characterPursuits: updatedPursuits,
                            },
                          });
                        }}
                        className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer"
                      >
                        No Readable Intent
                      </button>

                      <button
                        onClick={() => {
                          const obj = window.prompt(
                            'Enter objective for ' + (member.name || member.id) + ':',
                            member.goals || 'Maintain security perimeter'
                          );
                          if (!obj || !obj.trim()) return;

                          const app = window.prompt(
                            'Enter present approach for ' + (member.name || member.id) + ':',
                            'Patrolling immediate zone and checking seals'
                          );
                          if (!app || !app.trim()) return;

                          const newPursuit = {
                            id: `pursuit-${member.id}-${Date.now()}`,
                            castMemberId: member.id,
                            objective: obj.trim(),
                            presentApproach: app.trim(),
                            locationNodeId:
                              member.presenceDisposition?.kind === 'AT_NODE'
                                ? member.presenceDisposition.nodeId
                                : member.starting_location || startingNodeId,
                            status: 'ACTIVE' as const,
                            reviewWindow: 'SCENE_BEAT' as const,
                            triggerReferences: [],
                            basisSummary: 'Authored opening initiative.',
                            provenance: { kind: 'CREATOR_DEFINED' as const },
                          };

                          const currentHg = blueprint?.horrorGrammar || {
                            valueBaselineReview: 'UNREVIEWED',
                            pursuitReviews: {},
                            valueAnchors: [],
                            characterPursuits: [],
                          };
                          const updatedReviews = {
                            ...currentHg.pursuitReviews,
                            [member.id]: 'REVIEWED' as const,
                          };
                          const otherPursuits = (currentHg.characterPursuits || []).filter(
                            (p) => p.castMemberId !== member.id
                          );
                          updateDraft({
                            horrorGrammar: {
                              ...currentHg,
                              pursuitReviews: updatedReviews,
                              characterPursuits: [...otherPursuits, newPursuit],
                            },
                          });
                        }}
                        className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-[10px] font-bold cursor-pointer"
                      >
                        + Set Pursuit
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
