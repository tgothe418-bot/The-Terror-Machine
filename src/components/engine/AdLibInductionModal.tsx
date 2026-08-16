import React, { useState } from 'react';
import {
  Skull,
  User,
  Film,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  X,
  Plus,
  Trash2,
  Users,
  Lock,
} from 'lucide-react';
import {
  ParticipationMode,
  OppositionSeatKind,
  AdLibInductionSchema,
  AdLibProtagonistInduction,
  AdLibAntagonistInduction,
  AdLibDirectorInduction,
  VictimProfile,
} from '../../types/adLib';
import { initiateAdLibSession } from '../../lib/adLibCompiler';
import { forgeActions } from '../../store/useForgeStore';

interface AdLibInductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdLibInductionModal({
  isOpen,
  onClose,
  onSuccess,
}: AdLibInductionModalProps) {
  const [mode, setMode] = useState<ParticipationMode>('antagonist');

  // Shared scenario inputs
  const [placeSeed, setPlaceSeed] = useState('');
  const [goal, setGoal] = useState('');
  const [unsettlingDetail, setUnsettlingDetail] = useState('');

  // Protagonist inputs
  const [participantName, setParticipantName] = useState('');
  const [identity, setIdentity] = useState('');
  const [ability, setAbility] = useState('');
  const [limitation, setLimitation] = useState('');

  // Antagonist inputs
  const [antagonistKind, setAntagonistKind] = useState<OppositionSeatKind>('force');
  const [antagonistName, setAntagonistName] = useState('');
  const [antagonistDescription, setAntagonistDescription] = useState('');
  const [antagonistGoal, setAntagonistGoal] = useState('');

  // Authority & Limits (Phase 3B)
  const [authority, setAuthority] = useState('');
  const [limits, setLimits] = useState('');

  // Victim Field (Phase 3B)
  const [victimKind, setVictimKind] = useState<'individual' | 'group'>('group');
  // Individual victim
  const [individualVictimName, setIndividualVictimName] = useState('');
  const [individualVictimDesc, setIndividualVictimDesc] = useState('');
  const [individualVictimGoal, setIndividualVictimGoal] = useState('');
  const [individualVictimFact, setIndividualVictimFact] = useState('');
  // Group victim
  const [groupDesignation, setGroupDesignation] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<VictimProfile[]>([]);

  // Director inputs
  const [directorFocus, setDirectorFocus] = useState('');

  // Validation & state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const loadPreset = (presetMode: ParticipationMode) => {
    setMode(presetMode);
    setValidationError(null);

    if (presetMode === 'protagonist') {
      setPlaceSeed('Sub-Level 4 Cryogenic Vault');
      setGoal('Restore the cooling manifold before cryogenic stasis fails');
      setUnsettlingDetail('Frost patterns resembling grasping human fingers across the glass');
      setParticipantName('Sgt. David Ward');
      setIdentity('Night-shift Cryo-Tech Specialist');
      setAbility('Emergency thermal diagnostics & cybernetic bypass');
      setLimitation('Severe nitrogen narcosis vulnerability under deep pressure');
    } else if (presetMode === 'antagonist') {
      setPlaceSeed('Derelict Atmospheric Siphon');
      setGoal('Collapse structural bulkheads and isolate the maintenance cohort');
      setUnsettlingDetail('Metallic shrieking and localized barometric drops along the ductwork');
      setAntagonistKind('force');
      setAntagonistName('The Abyssal Pressure Anomaly');
      setAntagonistDescription(
        'An unseen sentience manifesting as deep-ocean hydraulic pressure and structural resonance.'
      );
      setAntagonistGoal('Crush exterior bulkhead seals and force the crew into flooded sub-sectors.');
      setAuthority(
        'Distributed barometric manipulation, structural crushing along external bulkheads, acoustic metal resonance, and rapid water vapor condensation.'
      );
      setLimits(
        'Cannot breach hermetic quartz bulkheads without mechanical failure; cannot manifest dry heat or electrical sparks; bound to continuous air volume.'
      );
      setVictimKind('group');
      setGroupDesignation('Sub-Level 4 Maintenance Shift');
      setGroupDescription('Three isolated engineers attempting manual hydraulic lockdown.');
      setGroupMembers([
        {
          id: 'victim-1',
          name: 'Chief Engineer Paul Lin',
          description: 'Veteran structural technician attempting manual hydraulic locks.',
          goal: 'Keep auxiliary door seals pressurized.',
          knownFact: 'Experiencing auditory distortion from nitrogen narcosis.',
        },
        {
          id: 'victim-2',
          name: 'Specialist Maya Chen',
          description: 'Life support operator monitoring emergency oxygen reserves.',
          goal: 'Reroute auxiliary power to the flood pumps.',
          knownFact: 'Holds the emergency override key for the pressure airlock.',
        },
      ]);
    } else {
      setPlaceSeed('Fog-Bound Pine Barrens Sanitarium');
      setGoal('Stage the slow unraveling of three isolated investigators');
      setUnsettlingDetail('Clock chimes echoing backwards from the empty clocktower');
      setDirectorFocus('Atmospheric escalation, dread-heavy scene framing, psychological fragmentation');
    }
  };

  const handleAddMember = () => {
    if (groupMembers.length >= 8) {
      setValidationError('Maximum of 8 named victim members allowed.');
      return;
    }
    setGroupMembers([
      ...groupMembers,
      {
        id: `victim-${groupMembers.length + 1}`,
        name: '',
        description: '',
        goal: '',
        knownFact: '',
      },
    ]);
  };

  const handleUpdateMember = (index: number, field: keyof VictimProfile, value: string) => {
    const updated = [...groupMembers];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setGroupMembers(updated);
  };

  const handleRemoveMember = (index: number) => {
    setGroupMembers(groupMembers.filter((_, i) => i !== index));
  };

  const handleLaunch = () => {
    setValidationError(null);
    setIsSubmitting(true);

    try {
      let rawPayload: unknown;

      if (mode === 'protagonist') {
        const payload: AdLibProtagonistInduction = {
          participationMode: 'protagonist',
          placeSeed: placeSeed.trim(),
          goal: goal.trim(),
          unsettlingDetail: unsettlingDetail.trim() || undefined,
          participantName: participantName.trim(),
          identity: identity.trim() || undefined,
          ability: ability.trim() || undefined,
          limitation: limitation.trim() || undefined,
        };
        rawPayload = payload;
      } else if (mode === 'antagonist') {
        let victimFieldPayload;
        if (victimKind === 'individual') {
          victimFieldPayload = {
            kind: 'individual' as const,
            name: individualVictimName.trim(),
            description: individualVictimDesc.trim() || undefined,
            goal: individualVictimGoal.trim() || undefined,
            knownFact: individualVictimFact.trim() || undefined,
          };
        } else {
          // Filter out completely blank member entries
          const validMembers = groupMembers
            .map((m) => ({
              id: m.id,
              name: m.name.trim(),
              description: m.description?.trim() || undefined,
              goal: m.goal?.trim() || undefined,
              knownFact: m.knownFact?.trim() || undefined,
            }))
            .filter((m) => m.name.length > 0);

          victimFieldPayload = {
            kind: 'group' as const,
            collectiveDesignation: groupDesignation.trim(),
            description: groupDescription.trim() || undefined,
            members: validMembers,
          };
        }

        const payload: AdLibAntagonistInduction = {
          participationMode: 'antagonist',
          placeSeed: placeSeed.trim(),
          goal: goal.trim(),
          unsettlingDetail: unsettlingDetail.trim() || undefined,
          oppositionSeat: {
            kind: antagonistKind,
            name: antagonistName.trim(),
            description: antagonistDescription.trim(),
            goal: antagonistGoal.trim() || goal.trim(),
          },
          authorityContract: {
            authority: authority.trim(),
            limits: limits.trim(),
          },
          victimField: victimFieldPayload,
        };
        rawPayload = payload;
      } else {
        const payload: AdLibDirectorInduction = {
          participationMode: 'director',
          placeSeed: placeSeed.trim(),
          goal: goal.trim(),
          unsettlingDetail: unsettlingDetail.trim() || undefined,
          directorFocus: directorFocus.trim() || undefined,
        };
        rawPayload = payload;
      }

      // 1. Zod parse validation with strict contract enforcement
      const parsed = AdLibInductionSchema.parse(rawPayload);

      // 2. Initialize session via canonical Ad Lib compiler
      const result = initiateAdLibSession(parsed);

      // 3. Set forge neural link mapping
      forgeActions.setActiveNeuralLink(
        mode === 'antagonist' ? 'ANTAGONIST' : mode === 'director' ? 'DIRECTOR' : 'PROTAGONIST'
      );
      forgeActions.startSimulation(result.blueprint);

      // 4. Trigger success callback & close
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setValidationError(err.message);
      } else {
        setValidationError(String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="ad-lib-modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md font-mono"
    >
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl xl:max-w-5xl max-h-[92vh] flex flex-col text-zinc-200 shadow-2xl overflow-hidden rounded-md">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <Skull className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <h2 className="text-sm uppercase font-bold tracking-[0.2em] text-white">
                Ad Lib Induction Terminal
              </h2>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">
                Phase 3B Procedural Induction // Authority & Victim Framing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-800 transition-colors rounded cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm custom-scrollbar">
          {/* Preset Bar */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/80 rounded">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Quick Archetype Presets:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadPreset('antagonist')}
                className="px-3 py-1 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 rounded text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                Antagonist Anomaly
              </button>
              <button
                type="button"
                onClick={() => loadPreset('protagonist')}
                className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 rounded text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                Protagonist Survivor
              </button>
              <button
                type="button"
                onClick={() => loadPreset('director')}
                className="px-3 py-1 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/50 rounded text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                Director Staging
              </button>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2 font-bold">
              1. Participation Seat & Mode Authority
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('antagonist');
                  setValidationError(null);
                }}
                className={`p-3.5 border text-left transition-all rounded cursor-pointer ${
                  mode === 'antagonist'
                    ? 'border-red-500 bg-red-950/20 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Antagonist
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Operate the threat entity or environmental force hunting victims.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('protagonist');
                  setValidationError(null);
                }}
                className={`p-3.5 border text-left transition-all rounded cursor-pointer ${
                  mode === 'protagonist'
                    ? 'border-emerald-500 bg-emerald-950/20 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Protagonist
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Embody a mortal character navigating survival under pressure.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('director');
                  setValidationError(null);
                }}
                className={`p-3.5 border text-left transition-all rounded cursor-pointer ${
                  mode === 'director'
                    ? 'border-purple-500 bg-purple-950/20 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Director
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Frame scene pacing, tension escalation, and dramatic pressure.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Shared Enclosure / Location Seed */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <label className="text-xs text-zinc-400 uppercase tracking-wider block font-bold">
              2. Scenario Enclosure & Primary Seed
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                  Location / Enclosure Seed *
                </label>
                <input
                  type="text"
                  value={placeSeed}
                  onChange={(e) => setPlaceSeed(e.target.value)}
                  placeholder="e.g. Derelict Atmospheric Siphon"
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                  Scenario Premise / Core Goal *
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Collapse structural bulkheads and isolate the maintenance cohort"
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                Unsettling Detail / Atmospheric Motif (Optional)
              </label>
              <input
                type="text"
                value={unsettlingDetail}
                onChange={(e) => setUnsettlingDetail(e.target.value)}
                placeholder="e.g. Metallic shrieking and localized barometric drops along the ductwork"
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Antagonist Framing (Phase 3B Reframed) */}
          {mode === 'antagonist' && (
            <div className="space-y-6 pt-2 border-t border-red-950/60">
              {/* Part A: You — The Antagonist */}
              <div className="space-y-3 p-4 bg-red-950/10 border border-red-900/40 rounded">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-red-400 uppercase tracking-wider font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    3A. You — The Antagonist
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAntagonistKind('force')}
                      className={`px-3 py-1 text-xs uppercase font-bold rounded border transition-colors cursor-pointer ${
                        antagonistKind === 'force'
                          ? 'bg-red-900/40 border-red-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Environmental / Unseen Force
                    </button>
                    <button
                      type="button"
                      onClick={() => setAntagonistKind('character')}
                      className={`px-3 py-1 text-xs uppercase font-bold rounded border transition-colors cursor-pointer ${
                        antagonistKind === 'character'
                          ? 'bg-red-900/40 border-red-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Embodied Physical Avatar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                      Antagonist Designation / Name *
                    </label>
                    <input
                      type="text"
                      value={antagonistName}
                      onChange={(e) => setAntagonistName(e.target.value)}
                      placeholder="e.g. The Abyssal Pressure Anomaly"
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                      Opposition Threat Goal *
                    </label>
                    <input
                      type="text"
                      value={antagonistGoal}
                      onChange={(e) => setAntagonistGoal(e.target.value)}
                      placeholder="e.g. Crush exterior bulkhead seals before repair pumps engage"
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                    Manifestation & Description *
                  </label>
                  <input
                    type="text"
                    value={antagonistDescription}
                    onChange={(e) => setAntagonistDescription(e.target.value)}
                    placeholder="e.g. An unseen sentience manifesting as deep-ocean hydraulic pressure and structural resonance"
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                  />
                </div>
              </div>

              {/* Part B: Authority & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Authority Scope */}
                <div className="p-4 bg-zinc-900/60 border border-amber-900/40 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      3B. Your Authority *
                    </label>
                    <span
                      className={`text-xs ${
                        authority.length > 500 ? 'text-red-400 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {authority.length}/500
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Specify your domain of perception, reach, supernatural vector, or environmental reach.
                  </p>
                  <textarea
                    rows={3}
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    placeholder="e.g. Distributed barometric manipulation, structural crushing along external bulkheads, acoustic metal resonance, and water vapor condensation."
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 p-2.5 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Operational Limits */}
                <div className="p-4 bg-zinc-900/60 border border-red-900/40 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-red-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      3C. Your Limits & Anchors *
                    </label>
                    <span
                      className={`text-xs ${
                        limits.length > 500 ? 'text-red-400 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {limits.length}/500
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Non-negotiable boundaries, forbidden transformations, physical anchors, or survivor counterplay.
                  </p>
                  <textarea
                    rows={3}
                    value={limits}
                    onChange={(e) => setLimits(e.target.value)}
                    placeholder="e.g. Cannot breach hermetic quartz bulkheads without mechanical failure; cannot manifest dry heat or electrical sparks; bound to continuous air volume."
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-red-500 p-2.5 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Part C: Victims Framing */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-200 uppercase tracking-wider font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    3D. Victims Framing
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVictimKind('group')}
                      className={`px-3 py-1 text-xs uppercase font-bold rounded border transition-colors cursor-pointer ${
                        victimKind === 'group'
                          ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Target Group / Collective
                    </button>
                    <button
                      type="button"
                      onClick={() => setVictimKind('individual')}
                      className={`px-3 py-1 text-xs uppercase font-bold rounded border transition-colors cursor-pointer ${
                        victimKind === 'individual'
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Individual Victim
                    </button>
                  </div>
                </div>

                {/* Individual Victim Form */}
                {victimKind === 'individual' ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                          Victim Name / Designation *
                        </label>
                        <input
                          type="text"
                          value={individualVictimName}
                          onChange={(e) => setIndividualVictimName(e.target.value)}
                          placeholder="e.g. Dr. Aris Thorne"
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                          Victim Immediate Goal (Optional)
                        </label>
                        <input
                          type="text"
                          value={individualVictimGoal}
                          onChange={(e) => setIndividualVictimGoal(e.target.value)}
                          placeholder="e.g. Reach the central communications terminal"
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                          Description / Role (Optional)
                        </label>
                        <input
                          type="text"
                          value={individualVictimDesc}
                          onChange={(e) => setIndividualVictimDesc(e.target.value)}
                          placeholder="e.g. Chief Systems Architect holding override protocols"
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                          Known Intel / Fact (Optional)
                        </label>
                        <input
                          type="text"
                          value={individualVictimFact}
                          onChange={(e) => setIndividualVictimFact(e.target.value)}
                          placeholder="e.g. Suffers from acute claustrophobia in confined corridors"
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Group Victim Form */
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                          Collective Group Designation *
                        </label>
                        <input
                          type="text"
                          value={groupDesignation}
                          onChange={(e) => setGroupDesignation(e.target.value)}
                          placeholder="e.g. Sub-Level 4 Maintenance Shift"
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                          Group Description / Context (Optional)
                        </label>
                        <input
                          type="text"
                          value={groupDescription}
                          onChange={(e) => setGroupDescription(e.target.value)}
                          placeholder="e.g. Three isolated engineers attempting manual hydraulic lockdown"
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Named Members Subsection */}
                    <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 uppercase font-semibold">
                          Optional Named Victim Profiles ({groupMembers.length}/8)
                        </span>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          disabled={groupMembers.length >= 8}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs uppercase tracking-wider text-amber-400 hover:text-white bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Member Profile
                        </button>
                      </div>

                      {groupMembers.length > 0 ? (
                        <div className="space-y-3">
                          {groupMembers.map((member, idx) => (
                            <div
                              key={member.id || idx}
                              className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2 relative"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-400 uppercase">
                                  Member #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(idx)}
                                  className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={member.name}
                                  onChange={(e) =>
                                    handleUpdateMember(idx, 'name', e.target.value)
                                  }
                                  placeholder="Member Name *"
                                  className="w-full bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 rounded focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={member.description || ''}
                                  onChange={(e) =>
                                    handleUpdateMember(idx, 'description', e.target.value)
                                  }
                                  placeholder="Role / Description (Optional)"
                                  className="w-full bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 rounded focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={member.goal || ''}
                                  onChange={(e) =>
                                    handleUpdateMember(idx, 'goal', e.target.value)
                                  }
                                  placeholder="Member Goal (Optional)"
                                  className="w-full bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 rounded focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={member.knownFact || ''}
                                  onChange={(e) =>
                                    handleUpdateMember(idx, 'knownFact', e.target.value)
                                  }
                                  placeholder="Intel / Known Fact (Optional)"
                                  className="w-full bg-zinc-900 border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100 rounded focus:outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">
                          No individual member profiles added; group will be simulated collectively.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Protagonist Framing */}
          {mode === 'protagonist' && (
            <div className="space-y-4 pt-2 border-t border-emerald-950/60">
              <label className="text-xs text-emerald-400 uppercase tracking-wider block font-bold">
                3. Protagonist Character Attributes
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                    Participant Character Name *
                  </label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="e.g. Sgt. David Ward"
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                    Identity / Role Context
                  </label>
                  <input
                    type="text"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="e.g. Night-shift Cryo-Tech Specialist"
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                    Specialized Aptitude / Vector
                  </label>
                  <input
                    type="text"
                    value={ability}
                    onChange={(e) => setAbility(e.target.value)}
                    placeholder="e.g. Emergency thermal diagnostics & cybernetic bypass"
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                    Limitation / Vulnerability
                  </label>
                  <input
                    type="text"
                    value={limitation}
                    onChange={(e) => setLimitation(e.target.value)}
                    placeholder="e.g. Severe nitrogen narcosis under deep pressure"
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Director Framing */}
          {mode === 'director' && (
            <div className="space-y-4 pt-2 border-t border-purple-950/60">
              <label className="text-xs text-purple-400 uppercase tracking-wider block font-bold">
                3. Director Scene Framing & Directives
              </label>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                  Director Staging Focus / Pressure Vector
                </label>
                <input
                  type="text"
                  value={directorFocus}
                  onChange={(e) => setDirectorFocus(e.target.value)}
                  placeholder="e.g. Atmospheric escalation, dread-heavy scene framing, psychological fragmentation"
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-purple-500 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-red-950/30 border border-red-800 text-red-400 text-xs flex items-center gap-2 rounded">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="launch-ad-lib-session-btn"
            onClick={handleLaunch}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-[0.2em] transition-all rounded shadow-lg shadow-red-950/30 cursor-pointer font-bold"
          >
            <span>Initialize Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
