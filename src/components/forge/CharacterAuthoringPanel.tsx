import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import { AutopilotVector } from '../../types';
import {
  User,
  UserCheck,
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
  const sourceAnalyses = useForgeState((state) => state.sourceAnalyses);
  const cast = blueprint?.cast || [];
  const topology = blueprint?.topology;
  const userCharacterId = blueprint?.userCharacterId || cast.find((c) => c.isUserCharacter)?.id;
  const userAim = blueprint?.userOpeningAim;

  const {
    addCastMember,
    updateCastMember,
    removeCastMember,
    setUserCharacter,
    setCastOpeningPlacement,
    acceptReferenceOpeningAim,
    setCreatorOverrideOpeningAim,
    setNoneDeclaredOpeningAim,
    setPursuitReview,
  } = forgeActions;

  // UI State
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [aimEditMode, setAimEditMode] = useState(false);
  const [customAimText, setCustomAimText] = useState('');
  const [aimError, setAimError] = useState<string | null>(null);

  // Non-user pursuit inline editing state: characterId -> form state
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
  const startingNodeId = topology?.startingNodeId || availableNodes[0]?.id || '';

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCast = () => {
    const defaultPlacementNode = startingNodeId || (availableNodes[0]?.id ?? '');
    const res = addCastMember({
      name: 'New Cast Member',
      role: 'Subject',
      description: '',
      isUserCharacter: false,
      isEntity: false,
      behaviorVector: 'ADAPTIVE',
      presenceDisposition: defaultPlacementNode
        ? { kind: 'AT_NODE', nodeId: defaultPlacementNode }
        : { kind: 'OFFSTAGE' },
    });
    if (res.characterId) {
      setExpandedCards((prev) => ({ ...prev, [res.characterId!]: true }));
    }
  };

  // Resolve reference opening aim proposal for the user character
  const userMember = cast.find((c) => c.id === userCharacterId);
  let proposalText = userAim?.aimText || '';
  let hasValidProposal = Boolean(proposalText.trim());
  let proposalSourceId = '';

  if (userMember && sourceAnalyses) {
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
          proposalSourceId = a.id;
          break;
        }
      }
    }
  }

  const handleSaveCustomAim = () => {
    if (!customAimText.trim()) {
      setAimError('Opening aim text cannot be empty.');
      return;
    }
    const outcome = setCreatorOverrideOpeningAim(customAimText.trim());
    if (!outcome.success) {
      setAimError(outcome.error || 'Failed to save creator aim.');
      return;
    }
    setAimError(null);
    setAimEditMode(false);
  };

  const handleSavePursuit = (charId: string) => {
    const form = pursuitForms[charId];
    if (!form || !form.objective.trim() || !form.presentApproach.trim()) {
      setPursuitForms((prev) => ({
        ...prev,
        [charId]: { ...prev[charId], error: 'Objective and present approach are required.' },
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
        [charId]: { ...prev[charId], error: outcome.error || 'Failed to save pursuit.' },
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
          const isUser = char.id === userCharacterId || char.isUserCharacter;
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
          const hasValidIntent = isUser
            ? userAim?.disposition && userAim.disposition !== 'UNREVIEWED'
            : pReview === 'REVIEWED' || pReview === 'REVIEWED_NONE';

          return (
            <div
              key={char.id}
              id={`character-card-${char.id}`}
              className={`p-3.5 bg-[#050505] border rounded flex flex-col gap-3 relative shadow-inner transition-colors ${
                isUser
                  ? 'border-cyan-800/80 bg-cyan-950/10'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
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
                  {isUser && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-cyan-900/60 border border-cyan-700 text-cyan-200 rounded font-bold uppercase shrink-0">
                      Player Character
                    </span>
                  )}
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

                  {/* 2. Player Designation & Opening Placement Section */}
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {/* Player Designation Button */}
                      {!char.isEntity ? (
                        <button
                          type="button"
                          id={`designate-player-btn-${char.id}`}
                          onClick={() => {
                            if (!isUser) {
                              const res = setUserCharacter(char.id);
                              if (!res.success && res.error) {
                                setAimError(res.error);
                              }
                            }
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase transition-colors cursor-pointer ${
                            isUser
                              ? 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                              : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isUser ? 'Player Controlled' : 'Designate as Player'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">
                          Entity cannot be designated as player.
                        </span>
                      )}

                      {/* Opening Placement Control */}
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
                                nodeId: currentNodeId || startingNodeId || availableNodes[0]?.id || 'NODE_INIT',
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

                  {/* 3. Opening Intent Section */}
                  {isUser ? (
                    /* PLAYER OPENING AIM SECTION */
                    <div className="p-3 bg-zinc-950 border border-cyan-900/60 rounded space-y-2.5">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold text-cyan-300 text-xs uppercase">
                            Player Opening Aim
                          </span>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                            userAim?.disposition === 'ACCEPTED_REFERENCE'
                              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                              : userAim?.disposition === 'CREATOR_OVERRIDE'
                              ? 'bg-blue-950/60 border border-blue-800 text-blue-300'
                              : userAim?.disposition === 'NONE_DECLARED'
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-amber-950/60 border border-amber-800 text-amber-300'
                          }`}
                        >
                          {userAim?.disposition === 'ACCEPTED_REFERENCE'
                            ? 'Accepted Reference'
                            : userAim?.disposition === 'CREATOR_OVERRIDE'
                            ? 'Creator Override'
                            : userAim?.disposition === 'NONE_DECLARED'
                            ? 'None Declared'
                            : 'Unreviewed Proposal'}
                        </span>
                      </div>

                      {aimError && (
                        <div className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-900 p-1.5 rounded">
                          {aimError}
                        </div>
                      )}

                      {/* Display Aim Content or Form */}
                      {aimEditMode ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            id="custom-aim-textarea"
                            value={customAimText}
                            onChange={(e) => {
                              setCustomAimText(e.target.value);
                              setAimError(null);
                            }}
                            rows={2}
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs p-2 rounded focus:outline-none focus:border-cyan-500"
                            placeholder="Enter custom historical opening orientation..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              id="save-aim-btn"
                              onClick={handleSaveCustomAim}
                              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Save Aim
                            </button>
                            <button
                              id="cancel-aim-btn"
                              onClick={() => {
                                setAimEditMode(false);
                                setAimError(null);
                              }}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-[10px] uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : userAim?.disposition === 'NONE_DECLARED' ? (
                        <div className="text-[11px] text-zinc-400 italic bg-black/40 p-2 rounded border border-zinc-900">
                          No opening aim declared. (Engine will not infer or fabricate a player goal).
                        </div>
                      ) : userAim?.disposition === 'UNREVIEWED' ? (
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
                        <div className="text-xs text-zinc-200 bg-black/40 p-2 rounded border border-zinc-900">
                          &quot;{userAim?.aimText || ''}&quot;
                        </div>
                      )}

                      {/* Aim Action Buttons */}
                      {!aimEditMode && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <button
                            id="accept-aim-btn"
                            disabled={!hasValidProposal}
                            onClick={() => {
                              const res = acceptReferenceOpeningAim(proposalSourceId || undefined);
                              if (!res.success && res.error) {
                                setAimError(res.error);
                              } else {
                                setAimError(null);
                              }
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                              hasValidProposal
                                ? 'bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 cursor-pointer'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                            title={
                              hasValidProposal
                                ? 'Accept reference opening aim default'
                                : 'No valid reference proposal to accept'
                            }
                          >
                            Accept Reference Default
                          </button>

                          <button
                            id="use-own-aim-btn"
                            onClick={() => {
                              setCustomAimText(userAim?.aimText || proposalText || '');
                              setAimEditMode(true);
                              setAimError(null);
                            }}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Use My Own Aim
                          </button>

                          <button
                            id="none-aim-btn"
                            onClick={() => {
                              setNoneDeclaredOpeningAim();
                              setAimError(null);
                            }}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[10px] uppercase cursor-pointer"
                          >
                            None Declared
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* NON-USER PURSUIT REVIEW SECTION */
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                        <span className="font-bold text-zinc-300 text-xs uppercase">
                          Non-User Opening Intent
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
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

                      {/* Display pursuits or empty notice */}
                      {memberPursuits.length > 0 ? (
                        <div className="space-y-1.5 text-[11px] bg-black/40 p-2 rounded border border-zinc-900">
                          {memberPursuits.map((p) => (
                            <div key={p.id} className="space-y-0.5">
                              <div className="font-bold text-zinc-200">Obj: {p.objective}</div>
                              <div className="text-zinc-500 text-[10px]">
                                Approach: {p.presentApproach}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-500 italic">
                          {pReview === 'REVIEWED_NONE'
                            ? 'No opening intent in reference. Reacts situationally.'
                            : 'Awaiting intent review before simulation start.'}
                        </div>
                      )}

                      {/* Inline Pursuit Edit Form */}
                      {pursuitForm.isOpen ? (
                        <div className="space-y-2 pt-1 border-t border-zinc-900">
                          {pursuitForm.error && (
                            <span className="text-[10px] text-rose-400 block">
                              {pursuitForm.error}
                            </span>
                          )}
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">
                              Objective *
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
                              Present Approach *
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
                              Save Pursuit
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
                            + Set Pursuit
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
