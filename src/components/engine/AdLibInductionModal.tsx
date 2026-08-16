import React, { useState } from 'react';
import {
  Skull,
  User,
  Film,
  ShieldAlert,
  MapPin,
  Target,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  ParticipationMode,
  OppositionSeatKind,
  AdLibInductionSchema,
  AdLibProtagonistInduction,
  AdLibAntagonistInduction,
  AdLibDirectorInduction,
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
  const [mode, setMode] = useState<ParticipationMode>('protagonist');

  // Shared inputs
  const [placeSeed, setPlaceSeed] = useState('Derelict Deep-Sea Research Trench');
  const [goal, setGoal] = useState('Recover the lost black box and seal the breach');
  const [unsettlingDetail, setUnsettlingDetail] = useState(
    'Rhythmic metallic knocking from the outer hull'
  );

  // Protagonist inputs
  const [participantName, setParticipantName] = useState('Dr. Elena Vance');
  const [identity, setIdentity] = useState('Chief Marine Biologist & Saturation Diver');
  const [ability, setAbility] = useState('Atmospheric pressure calculations and manual bypass');
  const [limitation, setLimitation] = useState('Crippling oxygen toxicity tremors under stress');

  // Antagonist inputs
  const [antagonistKind, setAntagonistKind] = useState<OppositionSeatKind>('force');
  const [antagonistName, setAntagonistName] = useState('The Abyssal Siphon');
  const [antagonistDescription, setAntagonistDescription] = useState(
    'A sentient oceanic pressure anomaly that crushes structural bulkheads and mimics drowned voices.'
  );
  const [antagonistGoal, setAntagonistGoal] = useState(
    'Collapse the habitat domes and consume the survivors into the trench depth.'
  );
  const [antagonistAbility, setAntagonistAbility] = useState(
    'Pressure manipulation, structural fatigue induction, biometric echo distortion'
  );
  const [antagonistLimitation, setAntagonistLimitation] = useState(
    'Cannot penetrate active hermetic quartz seals without physical decompression'
  );

  // Director inputs
  const [directorFocus, setDirectorFocus] = useState(
    'Claustrophobic acoustic tension, creeping isolation, slow-burn structural dread'
  );

  // Error handling
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
      setLimitation('Severe nitrogen narcosis vulnerability in zero-gravity');
    } else if (presetMode === 'antagonist') {
      setPlaceSeed('Abandoned Orbital Telemetry Array');
      setGoal('Sever the escape beacon and purge life support');
      setUnsettlingDetail('Static transmissions whispering personal childhood memories');
      setAntagonistKind('force');
      setAntagonistName('Signal Echo Protocol 09');
      setAntagonistDescription(
        'An autonomous necrotic machine signal infecting the station broadcast array.'
      );
      setAntagonistGoal('Infiltrate auditory implants and induce terminal panic.');
      setAntagonistAbility('Acoustic neuro-frequency overriding, circuit frying');
      setAntagonistLimitation('Requires uninterrupted line of sight to transmitter coils');
    } else {
      setPlaceSeed('Fog-Bound Pine Barrens Sanitarium');
      setGoal('Stage the slow unraveling of three isolated investigators');
      setUnsettlingDetail('Clock chimes echoing backwards from the empty clocktower');
      setDirectorFocus('Atmospheric escalation, dread-heavy scene framing, psychological fragmentation');
    }
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
            ability: antagonistAbility.trim() || undefined,
            limitation: antagonistLimitation.trim() || undefined,
          },
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

      // 1. Zod parse validation
      const parsed = AdLibInductionSchema.parse(rawPayload);

      // 2. Initialize session via canonical Ad Lib compiler
      const result = initiateAdLibSession(parsed);

      // 3. Set forge links for compatibility
      forgeActions.setActiveNeuralLink(
        mode === 'antagonist' ? 'ANTAGONIST' : mode === 'director' ? 'DIRECTOR' : 'PROTAGONIST'
      );
      forgeActions.startSimulation(result.blueprint);

      // 4. Trigger success callback
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl max-h-[90vh] flex flex-col font-mono text-zinc-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Skull className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-white">
                Ad Lib Induction Terminal
              </h2>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                Deterministic Procedural Induction & Participation Framing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Mode Selector Tabs */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-2 font-bold">
              1. Participation Seat & Mode Authority
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('protagonist');
                  setValidationError(null);
                }}
                className={`p-3 border text-left transition-all ${
                  mode === 'protagonist'
                    ? 'border-white bg-white/10 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Protagonist
                  </span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Mortal operative seat. Action attempts adjudicated with survival stakes.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('antagonist');
                  setValidationError(null);
                }}
                className={`p-3 border text-left transition-all ${
                  mode === 'antagonist'
                    ? 'border-red-500 bg-red-950/20 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Antagonist</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Opposition threat seat (Avatar or Ambient Environmental Force).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('director');
                  setValidationError(null);
                }}
                className={`p-3 border text-left transition-all ${
                  mode === 'director'
                    ? 'border-cyan-500 bg-cyan-950/20 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Director</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Scene framing, tension pacing, and environmental staging authority.
                </p>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-between py-2 border-y border-zinc-900">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
              Quick Calibration Presets:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadPreset('protagonist')}
                className="px-2 py-1 text-[8px] border border-zinc-800 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-300 uppercase tracking-wider"
              >
                Cryo Vault (Protagonist)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('antagonist')}
                className="px-2 py-1 text-[8px] border border-zinc-800 hover:border-red-500/50 text-zinc-400 hover:text-red-300 uppercase tracking-wider"
              >
                Signal Echo (Antagonist Force)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('director')}
                className="px-2 py-1 text-[8px] border border-zinc-800 hover:border-cyan-500/50 text-zinc-400 hover:text-cyan-300 uppercase tracking-wider"
              >
                Sanitarium (Director)
              </button>
            </div>
          </div>

          {/* Core Spatial & Narrative Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1 mb-1 font-bold">
                  <MapPin className="w-3 h-3 text-red-400" />
                  Place Seed / Haunted Enclosure *
                </label>
                <input
                  type="text"
                  value={placeSeed}
                  onChange={(e) => setPlaceSeed(e.target.value)}
                  placeholder="e.g. Sub-Level 4 Cryogenic Vault"
                  maxLength={200}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1 mb-1 font-bold">
                  <Target className="w-3 h-3 text-red-400" />
                  Core Goal / Inciting Objective *
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Seal the hydraulic breach before total collapse"
                  maxLength={200}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-zinc-500" />
                Unsettling Detail / Sensory Motif (Optional)
              </label>
              <input
                type="text"
                value={unsettlingDetail}
                onChange={(e) => setUnsettlingDetail(e.target.value)}
                placeholder="e.g. Rhythmic knocking echoing through the bulkhead walls"
                maxLength={200}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Mode-Specific Fields */}
          {mode === 'protagonist' && (
            <div className="p-4 border border-emerald-900/30 bg-emerald-950/10 space-y-4">
              <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold block">
                Protagonist Seat Specifications
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1 font-bold">
                    Participant Character Name *
                  </label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="e.g. Dr. Elena Vance"
                    maxLength={100}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">
                    Identity / Role
                  </label>
                  <input
                    type="text"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="e.g. Chief Marine Biologist & Deep-Sea Diver"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">
                    Aptitude / Special Ability
                  </label>
                  <input
                    type="text"
                    value={ability}
                    onChange={(e) => setAbility(e.target.value)}
                    placeholder="e.g. Atmospheric pressure calculation, manual override"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">
                    Vulnerability / Physical Limitation
                  </label>
                  <input
                    type="text"
                    value={limitation}
                    onChange={(e) => setLimitation(e.target.value)}
                    placeholder="e.g. Oxygen narcosis sensitivity under stress"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'antagonist' && (
            <div className="p-4 border border-red-900/30 bg-red-950/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-red-400 uppercase tracking-widest font-bold block">
                  Opposition Seat Specifications
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="antagonistKind"
                      checked={antagonistKind === 'force'}
                      onChange={() => setAntagonistKind('force')}
                      className="accent-red-500"
                    />
                    <span className="text-[9px] text-zinc-300 uppercase">
                      Environmental Force
                    </span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="antagonistKind"
                      checked={antagonistKind === 'character'}
                      onChange={() => setAntagonistKind('character')}
                      className="accent-red-500"
                    />
                    <span className="text-[9px] text-zinc-300 uppercase">Physical Avatar</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1 font-bold">
                    Opposition Designation / Name *
                  </label>
                  <input
                    type="text"
                    value={antagonistName}
                    onChange={(e) => setAntagonistName(e.target.value)}
                    placeholder="e.g. The Abyssal Siphon"
                    maxLength={100}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1 font-bold">
                    Opposition Threat Goal *
                  </label>
                  <input
                    type="text"
                    value={antagonistGoal}
                    onChange={(e) => setAntagonistGoal(e.target.value)}
                    placeholder="e.g. Collapse the habitat domes"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1 font-bold">
                  Opposition Description & Manifestation *
                </label>
                <textarea
                  value={antagonistDescription}
                  onChange={(e) => setAntagonistDescription(e.target.value)}
                  placeholder="Describe how the opposition presence manifests and acts upon the enclosure..."
                  rows={2}
                  maxLength={300}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">
                    Threat Vector / Ability
                  </label>
                  <input
                    type="text"
                    value={antagonistAbility}
                    onChange={(e) => setAntagonistAbility(e.target.value)}
                    placeholder="e.g. Pressure manipulation, biometric echo distortion"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">
                    Operational Limit / Boundary
                  </label>
                  <input
                    type="text"
                    value={antagonistLimitation}
                    onChange={(e) => setAntagonistLimitation(e.target.value)}
                    placeholder="e.g. Cannot penetrate active hermetic quartz seals"
                    maxLength={200}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'director' && (
            <div className="p-4 border border-cyan-900/30 bg-cyan-950/10 space-y-4">
              <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-bold block">
                Director Authority Specifications
              </span>
              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">
                  Atmospheric & Pacing Focus
                </label>
                <input
                  type="text"
                  value={directorFocus}
                  onChange={(e) => setDirectorFocus(e.target.value)}
                  placeholder="e.g. Claustrophobic acoustic tension, slow-burn structural dread"
                  maxLength={200}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                In Director Mode, the simulation will not bind you to an in-world mortal avatar.
                Your actions will steer environmental staging, sensory cues, and narrative pacing,
                while the Engine maintains world consistency and adjudicates consequences.
              </p>
            </div>
          )}

          {/* Validation Error Box */}
          {validationError && (
            <div className="p-3 border border-red-500/50 bg-red-950/30 text-red-400 flex items-start gap-2 text-[10px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white uppercase tracking-widest text-[9px] px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleLaunch}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-[10px] px-6 py-2.5 transition-all shadow-lg hover:shadow-red-600/30 disabled:opacity-50 cursor-pointer"
          >
            <span>{isSubmitting ? 'Compiling Induction...' : 'Induct Session'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
