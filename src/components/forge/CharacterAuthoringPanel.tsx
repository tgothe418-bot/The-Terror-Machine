import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import { AutopilotVector } from '../../types';
import {
  User,
  MapPin,
  Compass,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Ghost,
} from 'lucide-react';

export const CharacterAuthoringPanel: React.FC = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);
  const cast = blueprint?.cast || [];
  const topology = blueprint?.topology;

  const {
    addCastMember,
    updateCastMember,
    removeCastMember,
    setCastOpeningPlacement,
    setPursuitReview,
  } = forgeActions;

  // UI State
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Pursuit inline editing state: characterId -> form state
  const [pursuitForms, setPursuitForms] = useState<
    Record<
      string,
      {
        isOpen: boolean;
        objective: string;
        presentApproach: string;
        error?: string;
      }
    >
  >({});

  // Nodes list for placement selection
  const nodeDefs = topology?.nodeDefinitions || [];
  const rawNodes = topology?.nodes || [];
  const nodeMap = new Map<string, string>();
  nodeDefs.forEach((n) => {
    if (n.id) nodeMap.set(n.id, n.label || n.id);
  });
  rawNodes.forEach((n) => {
    if (n && !nodeMap.has(n)) nodeMap.set(n, n);
  });
  const availableNodes = Array.from(nodeMap.entries()).map(([id, label]) => ({ id, label }));

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCast = () => {
    const res = addCastMember({
      name: 'New Cast Member',
      role: 'Subject',
      description: '',
      isUserCharacter: false,
      isEntity: false,
      behaviorVector: 'ADAPTIVE',
      presenceDisposition: { kind: 'OFFSTAGE' },
    });
    if (res.characterId) {
      setExpandedCards((prev) => ({ ...prev, [res.characterId!]: true }));
    }
  };

  const handleSavePursuit = (charId: string) => {
    const form = pursuitForms[charId];
    if (!form || !form.objective.trim() || !form.presentApproach.trim()) {
      setPursuitForms((prev) => ({
        ...prev,
        [charId]: { ...prev[charId], error: 'Opening objective and current approach are required.' },
      }));
      return;
    }

    const outcome = setPursuitReview(charId, 'REVIEWED', {
      objective: form.objective.trim(),
      presentApproach: form.presentApproach.trim(),
    });

    if (!outcome.success) {
      setPursuitForms((prev) => ({
        ...prev,
        [charId]: { ...prev[charId], error: outcome.error || 'Failed to save opening objective.' },
      }));
      return;
    }

    setPursuitForms((prev) => ({
      ...prev,
      [charId]: { isOpen: false, objective: '', presentApproach: '' },
    }));
  };

  return (
    <div
      id="character-authoring-panel"
      className="flex-1 min-h-0 bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-5 rounded flex flex-col shadow-lg transition-colors overflow-hidden"
    >
      {/* Header & Add Button */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <label className="text-zinc-400 font-mono text-xs uppercase tracking-wider font-bold">
            CAST & CHARACTER ROSTER
          </label>
        </div>
        <button
          id="add-cast-member-btn"
          onClick={handleAddCast}
          className="flex items-center gap-1 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded border border-zinc-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>[+ ADD CAST MEMBER]</span>
        </button>
      </div>

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 min-h-0">
        {cast.map((char) => {
          const isExpanded = expandedCards[char.id] ?? true;
          const dispKind = char.presenceDisposition?.kind || (char.starting_location ? 'AT_NODE' : 'UNASSIGNED');
          const currentNodeId = char.presenceDisposition?.kind === 'AT_NODE' ? char.presenceDisposition.nodeId : char.starting_location || '';
          const pReview = blueprint?.horrorGrammar?.pursuitReviews?.[char.id] || 'UNREVIEWED';
          const memberPursuits = (blueprint?.horrorGrammar?.characterPursuits || []).filter(
            (p) => p.castMemberId === char.id
          );
          const pursuitForm = pursuitForms[char.id] || { isOpen: false, objective: '', presentApproach: '' };

          // Readiness flags for compact indicator
          const hasValidIdentity = Boolean(char.name && char.name.trim());
          const hasValidPlacement = Boolean(
            char.presenceDisposition?.kind === 'OFFSTAGE' ||
              (char.presenceDisposition?.kind === 'NONLOCAL' && char.isEntity) ||
              (char.presenceDisposition?.kind === 'AT_NODE' && char.presenceDisposition.nodeId)
          );
          const hasValidIntent = pReview === 'REVIEWED' || pReview === 'REVIEWED_NONE';

          return (
            <div
              key={char.id}
              id={`character-card-${char.id}`}
              className="p-3.5 bg-[#050505] border border-zinc-800/80 hover:border-zinc-700 rounded flex flex-col gap-3 relative shadow-inner transition-colors"
            >
              {/* Card Header Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                  <button
                    onClick={() => toggleCard(char.id)}
                    className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                    title={isExpanded ? 'Collapse card' : 'Expand card'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-bold text-zinc-200 text-xs sm:text-sm truncate">
                    {char.name || 'Unnamed Character'}
                  </span>
                  {char.isEntity && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-purple-900/60 border border-purple-700 text-purple-200 rounded font-bold uppercase shrink-0">
                      Entity
                    </span>
                  )}
                </div>

                {/* Status Badges & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[9px] font-mono">
                    <span
                      title={`Identity: ${hasValidIdentity ? 'Valid' : 'Name required'}`}
                      className={`w-2 h-2 rounded-full ${
                        hasValidIdentity ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span
                      title={`Placement: ${hasValidPlacement ? 'Assigned' : 'Unassigned'}`}
                      className={`w-2 h-2 rounded-full ${
                        hasValidPlacement ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span
                      title={`Opening Intent: ${hasValidIntent ? 'Reviewed' : 'Unreviewed'}`}
                      className={`w-2 h-2 rounded-full ${
                        hasValidIntent ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => removeCastMember(char.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                    title="Remove Cast Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="flex flex-col gap-3 font-mono">
                  {/* 1. Identity & Role Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={char.name || ''}
                        onChange={(e) => updateCastMember(char.id, { name: e.target.value })}
                        className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 text-xs p-1.5 rounded focus:outline-none focus:border-cyan-500"
                        placeholder="Character Name"
                      />
                      {!hasValidIdentity && (
                        <span className="text-[10px] text-amber-400 mt-0.5 block">
                          Name is required
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={char.role || ''}
                        onChange={(e) => updateCastMember(char.id, { role: e.target.value })}
                        className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-200 text-xs p-1.5 rounded focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. Chief Engineer, Subject"
                      />
                    </div>
                  </div>

                  {/* Description / Psychological Profile */}
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                      Description & Psychological Profile
                    </label>
                    <textarea
                      value={char.description || ''}
                      onChange={(e) => updateCastMember(char.id, { description: e.target.value })}
                      rows={2}
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs p-1.5 rounded resize-none focus:outline-none focus:border-cyan-500 leading-relaxed"
                      placeholder="Psychological baseline, narrative vulnerabilities, or somatic details..."
                    />
                  </div>

                  {/* Behavior Vector & Entity Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                        Behavior Vector
                      </label>
                      <select
                        id={`behavior-vector-select-${char.id}`}
                        value={char.behaviorVector || 'ADAPTIVE'}
                        onChange={(e) =>
                          updateCastMember(char.id, {
                            behaviorVector: e.target.value as AutopilotVector,
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs uppercase p-1.5 rounded focus:outline-none cursor-pointer"
                      >
                        <option value="ADAPTIVE">Vector: ADAPTIVE</option>
                        <option value="INSURGENT">Vector: INSURGENT</option>
                        <option value="PANIC">Vector: PANIC</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-3">
                      <input
                        type="checkbox"
                        id={`entity-toggle-${char.id}`}
                        checked={char.isEntity ?? false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateCastMember(char.id, { isEntity: checked });
                        }}
                        className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 checked:bg-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <label
                        htmlFor={`entity-toggle-${char.id}`}
                        className="text-xs text-zinc-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Ghost className="w-3 h-3 text-purple-400" />
                        <span>Antagonistic Entity (Non-Human)</span>
                      </label>
                    </div>
                  </div>

                  {/* Expression Profile (if present) */}
                  {char.expressionProfile && (
                    <div className="p-2 bg-zinc-900/40 border border-zinc-900 rounded space-y-1 text-[11px]">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block">
                        Expression Profile
                      </span>
                      {char.expressionProfile.expressionGuidance && (
                        <p className="text-zinc-300">{char.expressionProfile.expressionGuidance}</p>
                      )}
                      {char.expressionProfile.silenceGuidance && (
                        <p className="text-zinc-500 italic">
                          Silence: {char.expressionProfile.silenceGuidance}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 2. Opening Placement Section */}
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        Opening Placement
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <select
                          id={`placement-kind-select-${char.id}`}
                          value={dispKind}
                          onChange={(e) => {
                            const newKind = e.target.value;
                            if (newKind === 'AT_NODE') {
                              setCastOpeningPlacement(char.id, {
                                kind: 'AT_NODE',
                                nodeId: currentNodeId || availableNodes[0]?.id || 'NODE_INIT',
                              });
                            } else if (newKind === 'OFFSTAGE') {
                              setCastOpeningPlacement(char.id, { kind: 'OFFSTAGE' });
                            } else if (newKind === 'NONLOCAL') {
                              setCastOpeningPlacement(char.id, { kind: 'NONLOCAL' });
                            }
                          }}
                          className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 rounded p-1"
                        >
                          <option value="UNASSIGNED">Placement: Unassigned</option>
                          <option value="AT_NODE">At Node</option>
                          <option value="OFFSTAGE">Offstage</option>
                          {char.isEntity && <option value="NONLOCAL">Non-Local</option>}
                        </select>

                        {dispKind === 'AT_NODE' && (
                          <select
                            id={`placement-node-select-${char.id}`}
                            value={currentNodeId}
                            onChange={(e) =>
                              setCastOpeningPlacement(char.id, {
                                kind: 'AT_NODE',
                                nodeId: e.target.value,
                              })
                            }
                            className="bg-zinc-900 border border-zinc-800 text-[10px] text-cyan-300 rounded p-1 max-w-[120px] truncate"
                          >
                            {availableNodes.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Opening Objective Section */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider">
                          Opening Objective
                        </span>
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
                          ? `${memberPursuits.length} Objective(s)`
                          : pReview === 'REVIEWED_NONE'
                          ? 'No Readable Intent'
                          : 'Unreviewed'}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-500 italic">
                      Every authored cast member can carry an opening objective from source or creator intent. At runtime, the player&apos;s inhabited character is freed for player agency.
                    </p>

                    {/* Display pursuits or empty notice */}
                    {memberPursuits.length > 0 ? (
                      <div className="space-y-1.5 text-[11px] bg-black/40 p-2 rounded border border-zinc-900">
                        {memberPursuits.map((p) => (
                          <div key={p.id} className="space-y-0.5">
                            <div className="font-bold text-zinc-200">Opening Objective: {p.objective}</div>
                            <div className="text-zinc-500 text-[10px]">
                              Current Approach: {p.presentApproach}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic bg-black/40 p-2 rounded border border-zinc-900">
                        {pReview === 'REVIEWED_NONE'
                          ? 'Source establishes no active goal for this character at the opening threshold. The Engine will treat them as reactive to player and environmental intrusion.'
                          : 'Awaiting opening objective review before simulation start.'}
                      </div>
                    )}

                    {/* Inline Objective Edit Form */}
                    {pursuitForm.isOpen ? (
                      <div className="space-y-2 pt-1 border-t border-zinc-900">
                        {pursuitForm.error && (
                          <span className="text-[10px] text-rose-400 block">
                            {pursuitForm.error}
                          </span>
                        )}
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">
                            Opening Objective *
                          </label>
                          <input
                            type="text"
                            value={pursuitForm.objective}
                            onChange={(e) =>
                              setPursuitForms((prev) => ({
                                ...prev,
                                [char.id]: { ...prev[char.id], objective: e.target.value },
                              }))
                            }
                            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 p-1.5 rounded focus:outline-none"
                            placeholder="e.g. Inspect reactor telemetry"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">
                            Current Approach *
                          </label>
                          <input
                            type="text"
                            value={pursuitForm.presentApproach}
                            onChange={(e) =>
                              setPursuitForms((prev) => ({
                                ...prev,
                                [char.id]: { ...prev[char.id], presentApproach: e.target.value },
                              }))
                            }
                            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 p-1.5 rounded focus:outline-none"
                            placeholder="e.g. Accessing terminal console"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSavePursuit(char.id)}
                            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Save Objective
                          </button>
                          <button
                            onClick={() =>
                              setPursuitForms((prev) => ({
                                ...prev,
                                [char.id]: { isOpen: false, objective: '', presentApproach: '' },
                              }))
                            }
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-[10px] uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => setPursuitReview(char.id, 'REVIEWED_NONE')}
                          className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer"
                        >
                          No Readable Intent
                        </button>
                        <button
                          onClick={() =>
                            setPursuitForms((prev) => ({
                              ...prev,
                              [char.id]: {
                                isOpen: true,
                                objective: memberPursuits[0]?.objective || '',
                                presentApproach: memberPursuits[0]?.presentApproach || '',
                              },
                            }))
                          }
                          className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          {memberPursuits.length > 0 ? 'Edit Objective' : '+ Add Opening Objective'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {cast.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs italic font-mono border border-dashed border-zinc-800 rounded p-6">
            No cast members have been added yet. Click &quot;+ Add Cast Member&quot; to begin.
          </div>
        )}
      </div>
    </div>
  );
};
