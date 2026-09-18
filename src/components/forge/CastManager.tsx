import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import { AutopilotVector } from '../../types';
import { CharacterExpressionProfile } from '../../types/forge';
import {
  Compass,
  MapPin,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Ghost,
  Shield,
  Skull,
  Coffee,
  Activity,
  Key,
  Flame,
  FileText,
  AlertCircle,
  Volume2,
} from 'lucide-react';

const COMMON_PSYCH_FLAGS = [
  'Paranoia',
  'Claustrophobia',
  'Epistemic Dread',
  'Hyper-Vigilance',
  'Somatic Tremor',
  'Obsessive Delusion',
  'Dissociation',
];

export const CastManager: React.FC = () => {
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
  const [customFlagInput, setCustomFlagInput] = useState<Record<string, string>>({});

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
    setExpandedCards((prev) => {
      const current = prev[id] ?? true;
      return { ...prev, [id]: !current };
    });
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
      traits: [],
      goals: '',
      personality: '',
      psychological_status: '',
    });
    if (res.characterId) {
      setExpandedCards((prev) => ({ ...prev, [res.characterId!]: true }));
    }
  };

  const togglePsychFlag = (charId: string, flag: string, currentTraits: string[] = []) => {
    const exists = currentTraits.includes(flag);
    const updated = exists ? currentTraits.filter((t) => t !== flag) : [...currentTraits, flag];
    updateCastMember(charId, { traits: updated });
  };

  const handleAddCustomFlag = (charId: string, currentTraits: string[] = []) => {
    const val = (customFlagInput[charId] || '').trim();
    if (!val) return;
    if (!currentTraits.includes(val)) {
      updateCastMember(charId, { traits: [...currentTraits, val] });
    }
    setCustomFlagInput((prev) => ({ ...prev, [charId]: '' }));
  };

  const handleUpdateVoiceDossier = (
    charId: string,
    existingProfile: CharacterExpressionProfile | undefined,
    fieldUpdates: Partial<CharacterExpressionProfile>
  ) => {
    const currentModes = fieldUpdates.communicationModes ?? existingProfile?.communicationModes ?? ['spoken'];
    const currentGuidance = (fieldUpdates.expressionGuidance !== undefined
      ? fieldUpdates.expressionGuidance
      : existingProfile?.expressionGuidance) ?? '';
    const currentSilence = (fieldUpdates.silenceGuidance !== undefined
      ? fieldUpdates.silenceGuidance
      : existingProfile?.silenceGuidance) ?? '';
    const currentCadence = (fieldUpdates.cadenceNotes !== undefined
      ? fieldUpdates.cadenceNotes
      : existingProfile?.cadenceNotes) ?? '';
    const currentTone = (fieldUpdates.voiceTone !== undefined
      ? fieldUpdates.voiceTone
      : existingProfile?.voiceTone) ?? '';
    const currentTells = fieldUpdates.vocalTells ?? existingProfile?.vocalTells ?? [];
    const currentLexicon = (fieldUpdates.lexiconNotes !== undefined
      ? fieldUpdates.lexiconNotes
      : existingProfile?.lexiconNotes) ?? '';
    const currentLeak = (fieldUpdates.camouflageLeakGuidance !== undefined
      ? fieldUpdates.camouflageLeakGuidance
      : existingProfile?.camouflageLeakGuidance) ?? '';

    const hasAnyContent =
      currentGuidance.trim().length > 0 ||
      currentSilence.trim().length > 0 ||
      currentCadence.trim().length > 0 ||
      currentTone.trim().length > 0 ||
      currentTells.length > 0 ||
      currentLexicon.trim().length > 0 ||
      currentLeak.trim().length > 0 ||
      currentModes.some((m) => m !== 'spoken');

    if (!hasAnyContent) {
      updateCastMember(charId, { expressionProfile: undefined });
    } else {
      updateCastMember(charId, {
        expressionProfile: {
          communicationModes: currentModes.length > 0 ? currentModes : ['spoken'],
          expressionGuidance: currentGuidance.trim() || 'Direct verbal response.',
          silenceGuidance: currentSilence.trim() || undefined,
          cadenceNotes: currentCadence.trim() || undefined,
          voiceTone: currentTone.trim() || undefined,
          vocalTells: currentTells,
          lexiconNotes: currentLexicon.trim() || undefined,
          camouflageLeakGuidance: currentLeak.trim() || undefined,
        },
      });
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

    // Also mirror to goals if empty
    const currentMember = cast.find((c) => c.id === charId);
    if (currentMember && !currentMember.goals) {
      updateCastMember(charId, { goals: form.objective.trim() });
    }

    setPursuitForms((prev) => ({
      ...prev,
      [charId]: { isOpen: false, objective: '', presentApproach: '' },
    }));
  };

  return (
    <div
      id="character-authoring-panel"
      className="flex-1 min-h-0 obsidian-panel border border-stone-800/80 focus-within:border-amber-600/50 p-5 rounded-lg flex flex-col shadow-2xl transition-all overflow-hidden relative selection:bg-red-950 selection:text-white"
    >
      {/* Background Sigil Linework */}
      <svg
        className="absolute top-2 right-2 w-32 h-32 text-stone-800/20 pointer-events-none stroke-current"
        viewBox="0 0 100 100"
        fill="none"
        strokeWidth="0.75"
      >
        <circle cx="50" cy="50" r="40" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="20" />
        <path d="M50 10 L50 90 M10 50 L90 50" />
        <path d="M22 22 L78 78 M22 78 L78 22" strokeDasharray="2 2" />
      </svg>

      {/* Header & Inscribe Button */}
      <div className="flex justify-between items-center mb-4 shrink-0 border-b border-stone-800/80 pb-3">
        <div className="flex items-center gap-3">
          <span className="jewel-amber w-2.5 h-2.5 rounded-full inline-block bg-amber-500" />
          <div>
            <h3 className="text-[#e6e4dc] font-serif font-bold text-sm sm:text-base uppercase tracking-[0.2em] flex items-center gap-2">
              CAST DOSSIERS <span className="text-stone-500 font-mono text-xs tracking-wider font-normal">// CAST & CHARACTER ROSTER</span>
            </h3>
            <p className="text-[10px] font-mono text-stone-400 tracking-wider">
              HIGH-DENSITY PSYCHOLOGICAL & MOTIVE PROFILES · NO PORTRAIT RECORDINGS
            </p>
          </div>
        </div>
        <button
          id="add-cast-member-btn"
          onClick={handleAddCast}
          className="flex items-center gap-1.5 text-xs font-mono font-bold bg-stone-900/90 hover:bg-stone-800 text-[#e6e4dc] hover:text-amber-300 px-3 py-1.5 rounded border border-stone-700 hover:border-amber-500/70 transition-all shadow-md cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-90 transition-transform duration-300" />
          <span>[+ ADD CAST MEMBER]</span>
        </button>
      </div>

      {/* Cast Dossier List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 min-h-0">
        {cast.map((char) => {
          const isExpanded = expandedCards[char.id] ?? true;
          const dispKind =
            char.presenceDisposition?.kind || (char.starting_location ? 'AT_NODE' : 'UNASSIGNED');
          const currentNodeId =
            char.presenceDisposition?.kind === 'AT_NODE'
              ? char.presenceDisposition.nodeId
              : char.starting_location || '';
          const pReview = blueprint?.horrorGrammar?.pursuitReviews?.[char.id] || 'UNREVIEWED';
          const memberPursuits = (blueprint?.horrorGrammar?.characterPursuits || []).filter(
            (p) => p.castMemberId === char.id
          );
          const pursuitForm = pursuitForms[char.id] || { isOpen: false, objective: '', presentApproach: '' };

          // Readiness flags for indicators
          const hasValidIdentity = Boolean(char.name && char.name.trim());
          const hasValidPlacement = Boolean(
            char.presenceDisposition?.kind === 'OFFSTAGE' ||
              (char.presenceDisposition?.kind === 'NONLOCAL' && char.isEntity) ||
              (char.presenceDisposition?.kind === 'AT_NODE' && char.presenceDisposition.nodeId)
          );
          const hasValidIntent = pReview === 'REVIEWED' || pReview === 'REVIEWED_NONE';

          const traits = char.traits || [];
          const archetype = char.role || 'Subject';
          const motive = char.goals || memberPursuits[0]?.objective || '';
          const fear = char.psychological_status || '';
          const secret = char.personality || '';

          return (
            <div
              key={char.id}
              id={`character-card-${char.id}`}
              className="bg-[#0a0a0e] border border-stone-800/90 hover:border-amber-600/50 rounded-lg p-4 flex flex-col gap-3 relative shadow-xl transition-all group/card"
            >
              {/* Top Dossier Title Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-stone-900 pb-2.5 flex-wrap">
                <div className="flex items-center gap-2.5 flex-grow min-w-0">
                  <button
                    onClick={() => toggleCard(char.id)}
                    className="text-stone-400 hover:text-amber-300 p-1 rounded hover:bg-stone-900/60 transition-colors cursor-pointer"
                    title={isExpanded ? 'Collapse dossier' : 'Expand dossier'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Character Name in Antique Bone-Ivory */}
                  <span className="font-serif font-bold text-[#e6e4dc] text-sm sm:text-base tracking-wide truncate">
                    {char.name || 'Unnamed Character'}
                  </span>

                  {/* Archetype Dossier Tag */}
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded font-semibold shrink-0">
                    [ ARCHETYPE: {archetype} ]
                  </span>

                  {/* Disposition Pill */}
                  {((char as any).disposition === 'VILLAIN' || char.isEntity) ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-red-950/70 border border-red-800 text-red-300 rounded font-bold uppercase shrink-0 flex items-center gap-1 shadow-sm">
                      <Skull className="w-2.5 h-2.5" /> VILLAIN
                    </span>
                  ) : (char as any).disposition === 'BYSTANDER' ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-950/70 border border-amber-800 text-amber-300 rounded font-bold uppercase shrink-0 flex items-center gap-1 shadow-sm">
                      <Coffee className="w-2.5 h-2.5" /> BYSTANDER
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-stone-900 border border-stone-700 text-stone-300 rounded font-bold uppercase shrink-0 flex items-center gap-1 shadow-sm">
                      <Shield className="w-2.5 h-2.5 text-stone-400" /> SURVIVOR
                    </span>
                  )}

                  {char.isEntity && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-purple-950/60 border border-purple-800 text-purple-200 rounded font-bold uppercase shrink-0">
                      ENTITY
                    </span>
                  )}

                  {char.isUserCharacter && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-cyan-950/60 border border-cyan-800 text-cyan-300 rounded font-bold uppercase shrink-0">
                      [ PLAYER INHABITED ]
                    </span>
                  )}
                </div>

                {/* Status Indicator Jewels & Delete */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 px-2 py-1 bg-black/60 border border-stone-800 rounded font-mono text-[9px] text-stone-400">
                    <span className="text-[8px] uppercase tracking-wider text-stone-500">DOSSIER STATUS:</span>
                    <span
                      title={`Identity: ${hasValidIdentity ? 'Valid' : 'Name required'}`}
                      className={`w-2 h-2 rounded-full inline-block ${
                        hasValidIdentity
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                          : 'jewel-amber bg-amber-500'
                      }`}
                    />
                    <span
                      title={`Placement: ${hasValidPlacement ? 'Assigned' : 'Unassigned'}`}
                      className={`w-2 h-2 rounded-full inline-block ${
                        hasValidPlacement
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                          : 'jewel-amber bg-amber-500'
                      }`}
                    />
                    <span
                      title={`Opening Intent: ${hasValidIntent ? 'Reviewed' : 'Unreviewed'}`}
                      className={`w-2 h-2 rounded-full inline-block ${
                        hasValidIntent
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                          : 'jewel-amber bg-amber-500'
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => removeCastMember(char.id)}
                    className="text-stone-500 hover:text-red-400 p-1.5 rounded hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Remove Cast Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Collapsed High-Density Text Ribbon */}
              {!isExpanded && (
                <div className="text-[11px] font-mono text-stone-400 flex flex-wrap items-center gap-3 pt-1 border-t border-stone-900/60">
                  <span className="text-[#e6e4dc]">
                    <strong className="text-amber-400/90 font-serif uppercase tracking-wider">Motive:</strong>{' '}
                    {motive || 'Reactive / Emergent'}
                  </span>
                  <span className="text-stone-600">·</span>
                  <span>
                    <strong className="text-amber-400/90 font-serif uppercase tracking-wider">Fear:</strong>{' '}
                    {fear || 'Unstated'}
                  </span>
                  <span className="text-stone-600">·</span>
                  <span>
                    <strong className="text-amber-400/90 font-serif uppercase tracking-wider">Placement:</strong>{' '}
                    {dispKind === 'AT_NODE' ? currentNodeId || 'At Node' : dispKind}
                  </span>
                  {traits.length > 0 && (
                    <>
                      <span className="text-stone-600">·</span>
                      <span className="text-stone-300">
                        <strong className="text-amber-400/90 font-serif uppercase tracking-wider">Flags:</strong>{' '}
                        {traits.slice(0, 3).join(', ')}
                        {traits.length > 3 ? ` +${traits.length - 3}` : ''}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Expanded Pure Text Dossier Body */}
              {isExpanded && (
                <div className="flex flex-col gap-4 font-mono">
                  {/* 1. ARCHETYPE & IDENTITY PROFILE */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1.5 flex items-center justify-between">
                        <span>Name *</span>
                        {!hasValidIdentity && (
                          <span className="text-[9px] text-amber-400 tracking-normal font-normal">
                            Required
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={char.name || ''}
                        onChange={(e) => updateCastMember(char.id, { name: e.target.value })}
                        className="w-full bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-xs p-2 rounded focus:outline-none focus:border-amber-500/80 transition-colors"
                        placeholder="Character Name"
                      />
                      {!hasValidIdentity && (
                        <span className="text-[10px] text-amber-400 mt-1 block">
                          Name is required
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1.5">
                        Archetype / Role
                      </label>
                      <input
                        type="text"
                        value={char.role || ''}
                        onChange={(e) => updateCastMember(char.id, { role: e.target.value })}
                        className="w-full bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-xs p-2 rounded focus:outline-none focus:border-amber-500/80 transition-colors"
                        placeholder="e.g. Occult Scholar, Chief Engineer, Subject"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1.5">
                        Disposition
                      </label>
                      <select
                        value={(char as any).disposition || (char.isEntity ? 'VILLAIN' : 'SURVIVOR')}
                        onChange={(e) => updateCastMember(char.id, { disposition: e.target.value as any })}
                        className="w-full bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-xs p-2 rounded focus:outline-none focus:border-amber-500/80 transition-colors cursor-pointer"
                      >
                        <option value="SURVIVOR">🛡️ SURVIVOR</option>
                        <option value="VILLAIN">💀 VILLAIN</option>
                        <option value="BYSTANDER">☕ BYSTANDER</option>
                      </select>
                    </div>
                  </div>

                  {/* 2. MOTIVE, FEAR & SECRET (HIGH-DENSITY PSYCHOLOGICAL MATRIX) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-black/40 border border-stone-900 rounded-lg">
                    {/* Motive */}
                    <div>
                      <label className="text-[10px] text-amber-300/90 font-serif uppercase font-bold tracking-wider block mb-1 flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>Motive / Core Aim</span>
                      </label>
                      <input
                        type="text"
                        value={char.goals || ''}
                        onChange={(e) => updateCastMember(char.id, { goals: e.target.value })}
                        className="w-full bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-xs p-2 rounded focus:outline-none focus:border-amber-500/80 transition-colors"
                        placeholder="e.g. Retrieve missing expedition logs"
                      />
                    </div>

                    {/* Fear */}
                    <div>
                      <label className="text-[10px] text-amber-300/90 font-serif uppercase font-bold tracking-wider block mb-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span>Fear / Vulnerability</span>
                      </label>
                      <input
                        type="text"
                        value={char.psychological_status || ''}
                        onChange={(e) => updateCastMember(char.id, { psychological_status: e.target.value })}
                        className="w-full bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-xs p-2 rounded focus:outline-none focus:border-amber-500/80 transition-colors"
                        placeholder="e.g. Claustrophobia, Total darkness"
                      />
                    </div>

                    {/* Secret */}
                    <div>
                      <label className="text-[10px] text-amber-300/90 font-serif uppercase font-bold tracking-wider block mb-1 flex items-center gap-1.5">
                        <Key className="w-3 h-3 text-amber-500" />
                        <span>Secret / Concealed Agenda</span>
                      </label>
                      <input
                        type="text"
                        value={char.personality || ''}
                        onChange={(e) => updateCastMember(char.id, { personality: e.target.value })}
                        className="w-full bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-xs p-2 rounded focus:outline-none focus:border-amber-500/80 transition-colors"
                        placeholder="e.g. Sabotaged the airlock before ascent"
                      />
                    </div>
                  </div>

                  {/* 3. PSYCHOLOGICAL FLAGS & CHIPS */}
                  <div className="p-3 bg-black/40 border border-stone-900 rounded-lg space-y-2">
                    <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-amber-400" />
                        <span>Psychological Flags & Behavioral Fault Lines</span>
                      </span>
                      <span className="text-[9px] text-stone-500">{traits.length} active flag(s)</span>
                    </label>

                    {/* Quick Toggle Flag Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_PSYCH_FLAGS.map((flag) => {
                        const isSelected = traits.includes(flag);
                        return (
                          <button
                            key={flag}
                            type="button"
                            onClick={() => togglePsychFlag(char.id, flag, traits)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-950/70 border-amber-600/80 text-amber-300 font-bold shadow-[0_0_8px_rgba(217,119,6,0.3)]'
                                : 'bg-[#0c0c10] border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {flag}
                          </button>
                        );
                      })}
                      {traits
                        .filter((t) => !COMMON_PSYCH_FLAGS.includes(t))
                        .map((custom) => (
                          <button
                            key={custom}
                            type="button"
                            onClick={() => togglePsychFlag(char.id, custom, traits)}
                            className="text-[10px] px-2 py-0.5 rounded border bg-amber-950/70 border-amber-600/80 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>✓ {custom}</span>
                            <span className="text-amber-500 hover:text-white">×</span>
                          </button>
                        ))}
                    </div>

                    {/* Add Custom Flag */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customFlagInput[char.id] || ''}
                        onChange={(e) =>
                          setCustomFlagInput((prev) => ({ ...prev, [char.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomFlag(char.id, traits);
                          }
                        }}
                        placeholder="Add custom psychological flag..."
                        className="bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] text-[11px] px-2.5 py-1 rounded focus:outline-none focus:border-amber-500/80 flex-grow"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomFlag(char.id, traits)}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-[10px] uppercase font-bold cursor-pointer"
                      >
                        + Add Flag
                      </button>
                    </div>
                  </div>

                  {/* 4. SOMATIC BASELINE & DESCRIPTION */}
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-stone-500" />
                      <span>Description & Psychological Profile</span>
                    </label>
                    <textarea
                      value={char.description || ''}
                      onChange={(e) => updateCastMember(char.id, { description: e.target.value })}
                      rows={2}
                      className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs p-2 rounded resize-none focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600 transition-colors"
                      placeholder="Psychological baseline, narrative vulnerabilities, or somatic details..."
                    />
                  </div>

                  {/* 5. BEHAVIOR VECTOR & ANTAGONISTIC ENTITY TOGGLE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center p-3 bg-black/40 border border-stone-900 rounded-lg">
                    <div>
                      <label className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1.5">
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
                        className="w-full bg-[#0c0c10] border border-stone-800 text-stone-300 text-xs uppercase p-2 rounded focus:outline-none focus:border-amber-500/80 cursor-pointer"
                      >
                        <option value="ADAPTIVE">Vector: ADAPTIVE</option>
                        <option value="INSURGENT">Vector: INSURGENT</option>
                        <option value="PANIC">Vector: PANIC</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-4 sm:pt-0">
                      <input
                        type="checkbox"
                        id={`entity-toggle-${char.id}`}
                        checked={char.isEntity ?? false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateCastMember(char.id, { isEntity: checked });
                        }}
                        className="w-4 h-4 rounded border-stone-700 bg-stone-900 checked:bg-purple-700 focus:ring-purple-500 cursor-pointer"
                      />
                      <label
                        htmlFor={`entity-toggle-${char.id}`}
                        className="text-xs text-stone-300 flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <Ghost className="w-3.5 h-3.5 text-purple-400" />
                        <span>Antagonistic Entity (Non-Human)</span>
                      </label>
                    </div>
                  </div>

                  {/* 6. VOICE & ACOUSTIC DOSSIER */}
                  <div
                    id={`voice-dossier-${char.id}`}
                    className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider font-serif">
                          Voice & Acoustic Dossier
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(['spoken', 'nonverbal', 'mediated'] as const).map((mode) => {
                          const activeModes = char.expressionProfile?.communicationModes || ['spoken'];
                          const isActive = activeModes.includes(mode);
                          return (
                            <button
                              key={mode}
                              id={`comm-mode-${char.id}-${mode}`}
                              type="button"
                              onClick={() => {
                                const nextModes = isActive
                                  ? activeModes.filter((m) => m !== mode)
                                  : [...activeModes, mode];
                                if (nextModes.length === 0) return; // min 1 mode required
                                handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                                  communicationModes: nextModes,
                                });
                              }}
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
                              }`}
                              title={`Toggle ${mode} communication mode`}
                            >
                              {mode}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expression Guidance */}
                    <div>
                      <label
                        htmlFor={`voice-expression-${char.id}`}
                        className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                      >
                        Expression Guidance
                      </label>
                      <input
                        id={`voice-expression-${char.id}`}
                        type="text"
                        value={char.expressionProfile?.expressionGuidance || ''}
                        onChange={(e) =>
                          handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                            expressionGuidance: e.target.value,
                          })
                        }
                        placeholder="Dramatic verbal delivery guidance (e.g., clipped sentences, guarded tone)..."
                        className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                      />
                    </div>

                    {/* Cadence Notes (Amendment 5) & Voice Tone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor={`voice-cadence-${char.id}`}
                          className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                        >
                          Cadence & Rhythm Notes
                        </label>
                        <input
                          id={`voice-cadence-${char.id}`}
                          type="text"
                          value={char.expressionProfile?.cadenceNotes || ''}
                          onChange={(e) =>
                            handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                              cadenceNotes: e.target.value,
                            })
                          }
                          placeholder="Clipped, staccato syllables; breathless pauses..."
                          className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`voice-tone-${char.id}`}
                          className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                        >
                          Voice Tone & Texture
                        </label>
                        <input
                          id={`voice-tone-${char.id}`}
                          type="text"
                          value={char.expressionProfile?.voiceTone || ''}
                          onChange={(e) =>
                            handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                              voiceTone: e.target.value,
                            })
                          }
                          placeholder="Low rasp, strained authority, dry gravel..."
                          className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                        />
                      </div>
                    </div>

                    {/* Vocal Tells & Lexicon Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor={`voice-tells-${char.id}`}
                          className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                        >
                          Vocal Tells (Acoustic quirks)
                        </label>
                        <input
                          id={`voice-tells-${char.id}`}
                          type="text"
                          value={(char.expressionProfile?.vocalTells || []).join(', ')}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const tells = raw
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean);
                            handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                              vocalTells: tells,
                            });
                          }}
                          placeholder="whistle on sibilants, swallows hard (comma-separated)..."
                          className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`voice-lexicon-${char.id}`}
                          className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                        >
                          Lexicon & Dialect Notes
                        </label>
                        <input
                          id={`voice-lexicon-${char.id}`}
                          type="text"
                          value={char.expressionProfile?.lexiconNotes || ''}
                          onChange={(e) =>
                            handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                              lexiconNotes: e.target.value,
                            })
                          }
                          placeholder="Clinical terminology, archaic diction..."
                          className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                        />
                      </div>
                    </div>

                    {/* Silence Guidance & Camouflage Leak Guidance (Amendment 3) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor={`voice-silence-${char.id}`}
                          className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                        >
                          Silence Guidance
                        </label>
                        <input
                          id={`voice-silence-${char.id}`}
                          type="text"
                          value={char.expressionProfile?.silenceGuidance || ''}
                          onChange={(e) =>
                            handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                              silenceGuidance: e.target.value,
                            })
                          }
                          placeholder="Evades direct queries with tactile distraction..."
                          className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`voice-camouflage-${char.id}`}
                          className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1"
                        >
                          Camouflage Leak Guidance (Climax Escalation)
                        </label>
                        <input
                          id={`voice-camouflage-${char.id}`}
                          type="text"
                          value={char.expressionProfile?.camouflageLeakGuidance || ''}
                          onChange={(e) =>
                            handleUpdateVoiceDossier(char.id, char.expressionProfile, {
                              camouflageLeakGuidance: e.target.value,
                            })
                          }
                          placeholder="Vocal mask slips into unmodulated monotone..."
                          className="w-full bg-[#0c0c10] border border-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-amber-500/80 leading-relaxed placeholder:text-stone-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. OPENING PLACEMENT (SPATIAL CHOROGRAPHY) */}
                  <div className="p-3 bg-black/40 border border-stone-900 rounded-lg space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span>Opening Placement</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
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
                          className="bg-[#0c0c10] border border-stone-800 text-[11px] text-stone-300 rounded p-1.5 focus:border-amber-500/80"
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
                            className="bg-[#0c0c10] border border-stone-800 text-[11px] text-amber-300 rounded p-1.5 max-w-[140px] truncate focus:border-amber-500/80"
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

                  {/* 8. OPENING OBJECTIVE & PURSUITS */}
                  <div className="p-3.5 bg-black/40 border border-stone-900 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400" />
                        <span className="font-serif font-bold text-[#e6e4dc] text-xs uppercase tracking-wider">
                          Opening Objective
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold font-mono ${
                          pReview === 'REVIEWED'
                            ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                            : pReview === 'REVIEWED_NONE'
                            ? 'bg-stone-900 border border-stone-800 text-stone-400'
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

                    <p className="text-[10px] text-stone-400 italic">
                      Every authored cast member can carry an opening objective from source or creator intent. At runtime, the player&apos;s inhabited character is freed for player agency.
                    </p>

                    {/* Display pursuits or empty notice */}
                    {memberPursuits.length > 0 ? (
                      <div className="space-y-2 text-[11px] bg-[#0c0c10] p-2.5 rounded border border-stone-800">
                        {memberPursuits.map((p) => (
                          <div key={p.id} className="space-y-0.5">
                            <div className="font-bold text-[#e6e4dc]">Opening Objective: {p.objective}</div>
                            <div className="text-stone-400 text-[10px]">
                              Current Approach: {p.presentApproach}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-stone-500 italic bg-[#0c0c10] p-2 rounded border border-stone-900">
                        {pReview === 'REVIEWED_NONE'
                          ? 'Source establishes no active goal for this character at the opening threshold. The Engine will treat them as reactive to player and environmental intrusion.'
                          : 'Awaiting opening objective review before simulation start.'}
                      </div>
                    )}

                    {/* Inline Objective Edit Form */}
                    {pursuitForm.isOpen ? (
                      <div className="space-y-2.5 pt-2 border-t border-stone-900">
                        {pursuitForm.error && (
                          <span className="text-[10px] text-rose-400 block">
                            {pursuitForm.error}
                          </span>
                        )}
                        <div>
                          <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
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
                            className="w-full bg-[#0c0c10] border border-stone-700 text-xs text-[#e6e4dc] p-2 rounded focus:outline-none focus:border-amber-500"
                            placeholder="e.g. Inspect reactor telemetry"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
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
                            className="w-full bg-[#0c0c10] border border-stone-700 text-xs text-[#e6e4dc] p-2 rounded focus:outline-none focus:border-amber-500"
                            placeholder="e.g. Accessing terminal console"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSavePursuit(char.id)}
                            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
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
                            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-400 rounded text-[10px] uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setPursuitReview(char.id, 'REVIEWED_NONE')}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-[10px] font-mono transition-colors cursor-pointer"
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
                          className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
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
          <div className="flex flex-col items-center justify-center h-48 text-stone-500 text-xs italic font-mono border border-dashed border-stone-800 rounded-lg p-6 space-y-2">
            <span className="font-serif uppercase tracking-widest text-stone-400 not-italic font-bold">
              Grimoire Cast Registry Empty
            </span>
            <span>No cast members have been inscribed yet. Click &quot;+ Add Cast Member&quot; to begin.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export { CastManager as CharacterAuthoringPanel };
export default CastManager;
