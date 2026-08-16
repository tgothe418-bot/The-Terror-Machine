import React, { useState } from 'react';
import {
  Skull,
  User,
  Film,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Users,
  Lock,
  Maximize2,
  Download,
  Eye,
} from 'lucide-react';
import { ZodError } from 'zod';
import {
  ParticipationMode,
  OppositionSeatKind,
  AdLibInductionSchema,
  AdLibProtagonistInduction,
  AdLibAntagonistInduction,
  AdLibDirectorInduction,
  AdLibInduction,
  VictimProfile,
  MAX_HAUNTED_HOUSE_PREMISE_LENGTH,
} from '../../types/adLib';
import { Blueprint, ParticipationContext, SpatialNode } from '../../types';
import { compileAdLibInduction, initiateCompiledAdLibSession } from '../../lib/adLibCompiler';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { downloadJson, generateHauntedHouseBlueprintFilename } from '../../lib/download';
import { forgeActions } from '../../store/useForgeStore';
import { WritingTerminalModal } from './WritingTerminalModal';

interface AdLibInductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface WritingTerminalConfig {
  isOpen: boolean;
  title: string;
  fieldLabel: string;
  guidance?: string;
  initialValue: string;
  maxLength: number;
  onApply: (value: string) => void;
  triggerElementRef?: React.RefObject<HTMLElement | null>;
}

function parseZodErrors(err: ZodError): {
  fieldErrors: Record<string, string>;
  firstErrorId: string | null;
  summaryMessage: string;
} {
  const fieldErrors: Record<string, string> = {};
  let firstErrorId: string | null = null;
  const messages: string[] = [];

  for (const issue of err.issues) {
    const pathStr = issue.path.join('.');
    let targetId: string | null = null;
    let message = issue.message;

    if (issue.path[0] === 'goal') {
      targetId = 'input-goal';
      if (issue.code === 'too_big') {
        message = `Scenario premise must be ${MAX_HAUNTED_HOUSE_PREMISE_LENGTH.toLocaleString()} characters or fewer.`;
      } else if (issue.code === 'too_small' || message === 'Required') {
        message = 'Scenario premise is required.';
      }
    } else if (issue.path[0] === 'placeSeed') {
      targetId = 'input-placeSeed';
      if (issue.code === 'too_small' || message === 'Required') {
        message = 'Location / enclosure seed is required.';
      }
    } else if (issue.path[0] === 'unsettlingDetail') {
      targetId = 'input-unsettlingDetail';
    } else if (issue.path[0] === 'participantName') {
      targetId = 'input-participantName';
    } else if (issue.path[0] === 'identity') {
      targetId = 'input-identity';
    } else if (issue.path[0] === 'ability') {
      targetId = 'input-ability';
    } else if (issue.path[0] === 'limitation') {
      targetId = 'input-limitation';
    } else if (issue.path[0] === 'oppositionSeat') {
      if (issue.path[1] === 'name') {
        targetId = 'input-antagonistName';
      } else if (issue.path[1] === 'description') {
        targetId = 'input-antagonistDescription';
      } else if (issue.path[1] === 'goal') {
        targetId = 'input-antagonistGoal';
        if (issue.code === 'too_small' || message === 'Required') {
          message = 'Opposition threat goal is required.';
        }
      }
    } else if (issue.path[0] === 'authorityContract') {
      if (issue.path[1] === 'authority') {
        targetId = 'input-authority';
        if (issue.code === 'too_small' || message === 'Required') {
          message = 'Authority scope is required.';
        }
      } else if (issue.path[1] === 'limits') {
        targetId = 'input-limits';
        if (issue.code === 'too_small' || message === 'Required') {
          message = 'Operational limits & anchors are required.';
        }
      }
    } else if (issue.path[0] === 'victimField') {
      if (issue.path[1] === 'name') {
        targetId = 'input-individualVictimName';
      } else if (issue.path[1] === 'collectiveDesignation') {
        targetId = 'input-groupDesignation';
        if (issue.code === 'too_small' || message === 'Required') {
          message = 'Collective group designation is required.';
        }
      } else if (issue.path[1] === 'members' && typeof issue.path[2] === 'number') {
        targetId = `input-member-${issue.path[2]}-name`;
      }
    } else if (issue.path[0] === 'directorFocus') {
      targetId = 'input-directorFocus';
    }

    if (!fieldErrors[pathStr]) {
      fieldErrors[pathStr] = message;
      if (issue.path[0]) {
        fieldErrors[String(issue.path[0])] = message;
      }
      if (issue.path[1]) {
        fieldErrors[`${String(issue.path[0])}.${String(issue.path[1])}`] = message;
      }
    }
    if (!firstErrorId && targetId) {
      firstErrorId = targetId;
    }
    if (!messages.includes(message)) {
      messages.push(message);
    }
  }

  const summaryMessage =
    messages.length > 0 ? messages.join(' • ') : 'Please correct the highlighted fields.';
  return { fieldErrors, firstErrorId, summaryMessage };
}

export default function AdLibInductionModal({
  isOpen,
  onClose,
  onSuccess,
}: AdLibInductionModalProps) {
  const [stage, setStage] = useState<'editing' | 'review'>('editing');
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
  const [victimKind, setVictimKind] = useState<'individual' | 'group'>('individual');
  const [individualVictimName, setIndividualVictimName] = useState('');
  const [individualVictimDesc, setIndividualVictimDesc] = useState('');
  const [individualVictimGoal, setIndividualVictimGoal] = useState('');
  const [individualVictimFact, setIndividualVictimFact] = useState('');

  const [groupDesignation, setGroupDesignation] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<VictimProfile[]>([
    {
      id: 'victim-1',
      name: '',
      description: '',
      goal: '',
      knownFact: '',
    },
    {
      id: 'victim-2',
      name: '',
      description: '',
      goal: '',
      knownFact: '',
    },
  ]);

  // Director inputs
  const [directorFocus, setDirectorFocus] = useState('');

  // State management
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compiledReviewData, setCompiledReviewData] = useState<{
    blueprint: Blueprint;
    participationContext: ParticipationContext;
    initialSpatialNode: SpatialNode;
    parsed: AdLibInduction;
  } | null>(null);

  // Reusable writing terminal state
  const [writingTerminal, setWritingTerminal] = useState<WritingTerminalConfig>({
    isOpen: false,
    title: '',
    fieldLabel: '',
    initialValue: '',
    maxLength: 1000,
    onApply: () => {},
  });

  const openWritingTerminal = (config: Omit<WritingTerminalConfig, 'isOpen'>) => {
    setWritingTerminal({
      ...config,
      isOpen: true,
    });
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

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const buildCurrentPayload = (): unknown => {
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
      return payload;
    }

    if (mode === 'antagonist') {
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
          goal: antagonistGoal.trim(),
        },
        authorityContract: {
          authority: authority.trim(),
          limits: limits.trim(),
        },
        victimField: victimFieldPayload,
      };
      return payload;
    }

    const payload: AdLibDirectorInduction = {
      participationMode: 'director',
      placeSeed: placeSeed.trim(),
      goal: goal.trim(),
      unsettlingDetail: unsettlingDetail.trim() || undefined,
      directorFocus: directorFocus.trim() || undefined,
    };
    return payload;
  };

  const handleReview = () => {
    setValidationError(null);
    setFieldErrors({});

    try {
      const rawPayload = buildCurrentPayload();
      const parsed = AdLibInductionSchema.parse(rawPayload);
      const compiled = compileAdLibInduction(parsed);
      const normalized = normalizeBlueprint(compiled.blueprint);

      setCompiledReviewData({
        blueprint: normalized,
        participationContext: compiled.participationContext,
        initialSpatialNode: compiled.initialSpatialNode,
        parsed,
      });
      setStage('review');
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const { fieldErrors: errs, firstErrorId, summaryMessage } = parseZodErrors(err);
        setFieldErrors(errs);
        setValidationError(summaryMessage);
        if (firstErrorId) {
          setTimeout(() => {
            const el = document.getElementById(firstErrorId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
            }
          }, 50);
        }
      } else if (err instanceof Error) {
        setValidationError(err.message);
      } else {
        setValidationError(String(err));
      }
    }
  };

  const handleDownloadBlueprint = () => {
    if (!compiledReviewData) return;
    const filename = generateHauntedHouseBlueprintFilename(
      compiledReviewData.blueprint.identity?.title ||
        compiledReviewData.blueprint.title ||
        compiledReviewData.blueprint.setting?.location
    );
    downloadJson(compiledReviewData.blueprint, filename);
  };

  const handleLaunchFromReview = () => {
    if (!compiledReviewData) return;
    setIsSubmitting(true);
    try {
      const result = initiateCompiledAdLibSession({
        blueprint: compiledReviewData.blueprint,
        participationContext: compiledReviewData.participationContext,
        initialSpatialNode: compiledReviewData.initialSpatialNode,
      });
      forgeActions.setActiveNeuralLink(
        mode === 'antagonist' ? 'ANTAGONIST' : mode === 'director' ? 'DIRECTOR' : 'PROTAGONIST'
      );
      forgeActions.startSimulation(result.blueprint);

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

  if (!isOpen) return null;

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
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-100">
                  Haunted House Induction Terminal
                </h2>
                <span className="text-[10px] px-2 py-0.5 border border-red-800/80 bg-red-950/40 text-red-300 font-bold uppercase rounded tracking-wider">
                  Phase 3C
                </span>
                {stage === 'review' && (
                  <span className="text-[10px] px-2 py-0.5 border border-amber-800/80 bg-amber-950/40 text-amber-300 font-bold uppercase rounded tracking-wider">
                    Review Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                {stage === 'editing'
                  ? 'Author procedural opposition, authority boundaries, and victim framing.'
                  : 'Verify compiled Haunted House Blueprint before download or simulation launch.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terminal"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {stage === 'editing' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Mode Selection */}
            <div className="space-y-3">
              <label className="text-xs text-zinc-400 uppercase tracking-wider block font-bold">
                1. Select Orientation & Participation Seat *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode('antagonist');
                    setValidationError(null);
                    setFieldErrors({});
                  }}
                  className={`p-3.5 border text-left transition-all rounded cursor-pointer ${
                    mode === 'antagonist'
                      ? 'border-red-500 bg-red-950/20 text-white shadow-sm'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Skull className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Antagonist
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-snug">
                    Operate opposition agency with explicit authority and operational limits.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('protagonist');
                    setValidationError(null);
                    setFieldErrors({});
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
                    Embody a mortal operative navigating containment and psychological pressure.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('director');
                    setValidationError(null);
                    setFieldErrors({});
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
                    Frame scene pacing, tension escalation, and dramatic withholding.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 2: Shared Enclosure / Location Seed */}
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              <label className="text-xs text-zinc-400 uppercase tracking-wider block font-bold">
                2. Scenario Enclosure & Primary Seed
              </label>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="input-placeSeed"
                    className="text-xs text-zinc-400 uppercase tracking-wide block mb-1 font-bold"
                  >
                    Location / Enclosure Seed *
                  </label>
                  <input
                    id="input-placeSeed"
                    type="text"
                    value={placeSeed}
                    onChange={(e) => {
                      setPlaceSeed(e.target.value);
                      clearFieldError('placeSeed');
                    }}
                    placeholder="e.g. Derelict Atmospheric Siphon"
                    aria-invalid={Boolean(fieldErrors['placeSeed'])}
                    aria-describedby={fieldErrors['placeSeed'] ? 'input-placeSeed-error' : undefined}
                    className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                      fieldErrors['placeSeed']
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-zinc-700 focus:border-zinc-400'
                    }`}
                  />
                  {fieldErrors['placeSeed'] && (
                    <p
                      id="input-placeSeed-error"
                      role="alert"
                      className="text-xs text-red-400 mt-1 font-mono"
                    >
                      {fieldErrors['placeSeed']}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="input-goal"
                      className="text-xs text-zinc-400 uppercase tracking-wide font-bold"
                    >
                      Scenario Premise / Core Objective *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openWritingTerminal({
                            title: 'Scenario Premise / Core Objective',
                            fieldLabel: `Enclosure: ${placeSeed || 'Unspecified'}`,
                            guidance: 'Define the central narrative premise, containment stakes, and objective.',
                            initialValue: goal,
                            maxLength: MAX_HAUNTED_HOUSE_PREMISE_LENGTH,
                            onApply: (val) => {
                              setGoal(val);
                              clearFieldError('goal');
                            },
                          })
                        }
                        title="Open expanded writing terminal"
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Expand Editor</span>
                      </button>
                      <span
                        className={`text-xs font-mono ${
                          goal.length > MAX_HAUNTED_HOUSE_PREMISE_LENGTH
                            ? 'text-red-400 font-bold'
                            : 'text-zinc-500'
                        }`}
                      >
                        {goal.length}/{MAX_HAUNTED_HOUSE_PREMISE_LENGTH}
                      </span>
                    </div>
                  </div>
                  <textarea
                    id="input-goal"
                    rows={3}
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      clearFieldError('goal');
                    }}
                    placeholder="e.g. Mary and Joseph are in a manger behind a sold-out hotel in Bethlehem..."
                    aria-invalid={
                      Boolean(fieldErrors['goal']) ||
                      goal.length > MAX_HAUNTED_HOUSE_PREMISE_LENGTH
                    }
                    aria-describedby={fieldErrors['goal'] ? 'input-goal-error' : undefined}
                    className={`w-full bg-zinc-900 border p-2.5 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none leading-relaxed ${
                      goal.length > MAX_HAUNTED_HOUSE_PREMISE_LENGTH || fieldErrors['goal']
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-zinc-700 focus:border-zinc-400'
                    }`}
                  />
                  {fieldErrors['goal'] && (
                    <p
                      id="input-goal-error"
                      role="alert"
                      className="text-xs text-red-400 mt-1 font-mono"
                    >
                      {fieldErrors['goal']}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="input-unsettlingDetail"
                      className="text-xs text-zinc-400 uppercase tracking-wide block"
                    >
                      Unsettling Detail / Atmospheric Motif (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openWritingTerminal({
                          title: 'Unsettling Detail / Atmospheric Motif',
                          fieldLabel: `Enclosure: ${placeSeed || 'Unspecified'}`,
                          guidance: 'Atmospheric sensory bias, environmental contradiction, or structural omen.',
                          initialValue: unsettlingDetail,
                          maxLength: 200,
                          onApply: (val) => {
                            setUnsettlingDetail(val);
                            clearFieldError('unsettlingDetail');
                          },
                        })
                      }
                      title="Open expanded writing terminal"
                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Expand Editor</span>
                    </button>
                  </div>
                  <input
                    id="input-unsettlingDetail"
                    type="text"
                    value={unsettlingDetail}
                    onChange={(e) => {
                      setUnsettlingDetail(e.target.value);
                      clearFieldError('unsettlingDetail');
                    }}
                    placeholder="e.g. Metallic shrieking and localized barometric drops along the ductwork"
                    aria-invalid={Boolean(fieldErrors['unsettlingDetail'])}
                    aria-describedby={
                      fieldErrors['unsettlingDetail']
                        ? 'input-unsettlingDetail-error'
                        : undefined
                    }
                    className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                      fieldErrors['unsettlingDetail']
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-zinc-700 focus:border-zinc-400'
                    }`}
                  />
                  {fieldErrors['unsettlingDetail'] && (
                    <p
                      id="input-unsettlingDetail-error"
                      role="alert"
                      className="text-xs text-red-400 mt-1 font-mono"
                    >
                      {fieldErrors['unsettlingDetail']}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Antagonist Framing (Phase 3B Reframed) */}
            {mode === 'antagonist' && (
              <div className="space-y-6 pt-2 border-t border-red-950/60">
                {/* Part A: You — The Antagonist */}
                <div className="space-y-3 p-4 bg-red-950/10 border border-red-900/40 rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                      <label
                        htmlFor="input-antagonistName"
                        className="text-xs text-zinc-400 uppercase tracking-wide block mb-1"
                      >
                        Antagonist Designation / Name *
                      </label>
                      <input
                        id="input-antagonistName"
                        type="text"
                        value={antagonistName}
                        onChange={(e) => {
                          setAntagonistName(e.target.value);
                          clearFieldError('oppositionSeat.name');
                        }}
                        placeholder="e.g. The Abyssal Pressure Anomaly"
                        aria-invalid={Boolean(fieldErrors['oppositionSeat.name'])}
                        aria-describedby={
                          fieldErrors['oppositionSeat.name']
                            ? 'input-antagonistName-error'
                            : undefined
                        }
                        className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                          fieldErrors['oppositionSeat.name']
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-zinc-700 focus:border-red-500'
                        }`}
                      />
                      {fieldErrors['oppositionSeat.name'] && (
                        <p
                          id="input-antagonistName-error"
                          role="alert"
                          className="text-xs text-red-400 mt-1 font-mono"
                        >
                          {fieldErrors['oppositionSeat.name']}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="input-antagonistGoal"
                        className="text-xs text-zinc-400 uppercase tracking-wide block mb-1"
                      >
                        Opposition Threat Goal *
                      </label>
                      <input
                        id="input-antagonistGoal"
                        type="text"
                        value={antagonistGoal}
                        onChange={(e) => {
                          setAntagonistGoal(e.target.value);
                          clearFieldError('oppositionSeat.goal');
                        }}
                        placeholder="e.g. Force structural collapse before breach containment seals"
                        aria-invalid={Boolean(fieldErrors['oppositionSeat.goal'])}
                        aria-describedby={
                          fieldErrors['oppositionSeat.goal']
                            ? 'input-antagonistGoal-error'
                            : undefined
                        }
                        className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                          fieldErrors['oppositionSeat.goal']
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-zinc-700 focus:border-red-500'
                        }`}
                      />
                      {fieldErrors['oppositionSeat.goal'] && (
                        <p
                          id="input-antagonistGoal-error"
                          role="alert"
                          className="text-xs text-red-400 mt-1 font-mono"
                        >
                          {fieldErrors['oppositionSeat.goal']}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="input-antagonistDescription"
                        className="text-xs text-zinc-400 uppercase tracking-wide block"
                      >
                        Description / Manifestation
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          openWritingTerminal({
                            title: 'Antagonist Description / Manifestation',
                            fieldLabel: `Designation: ${antagonistName || 'Unspecified'}`,
                            guidance: 'Describe sensory form, environmental signature, or eerie physical manifestation.',
                            initialValue: antagonistDescription,
                            maxLength: 300,
                            onApply: (val) => {
                              setAntagonistDescription(val);
                              clearFieldError('oppositionSeat.description');
                            },
                          })
                        }
                        title="Open expanded writing terminal"
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Expand Editor</span>
                      </button>
                    </div>
                    <textarea
                      id="input-antagonistDescription"
                      rows={2}
                      value={antagonistDescription}
                      onChange={(e) => {
                        setAntagonistDescription(e.target.value);
                        clearFieldError('oppositionSeat.description');
                      }}
                      placeholder="e.g. A hyperbaric distortion that bends acoustic reverberation and freezes metal rivets."
                      className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 p-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                    />
                  </div>
                </div>

                {/* Part B: Authority & Limits Contract (Phase 3B) */}
                <div className="space-y-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <label className="text-xs text-amber-400 uppercase tracking-wider font-bold">
                      3B. Authority & Limits Contract (Enforced)
                    </label>
                  </div>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    Explicitly contracts what your opposition force controls versus where its reach
                    ends. The engine binds turn resolution strictly to these terms.
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="input-authority"
                          className="text-xs text-zinc-300 uppercase tracking-wide font-bold"
                        >
                          Authority Scope *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openWritingTerminal({
                                title: 'Authority Scope',
                                fieldLabel: 'Opposition Contract',
                                guidance: 'Specify exactly what you can affect (e.g. valves, lights, shadows, temperature).',
                                initialValue: authority,
                                maxLength: 500,
                                onApply: (val) => {
                                  setAuthority(val);
                                  clearFieldError('authorityContract.authority');
                                },
                              })
                            }
                            title="Open expanded writing terminal"
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Expand Editor</span>
                          </button>
                          <span
                            className={`text-xs font-mono ${
                              authority.length > 500 ? 'text-red-400 font-bold' : 'text-zinc-500'
                            }`}
                          >
                            {authority.length}/500
                          </span>
                        </div>
                      </div>
                      <textarea
                        id="input-authority"
                        rows={2}
                        value={authority}
                        onChange={(e) => {
                          setAuthority(e.target.value);
                          clearFieldError('authorityContract.authority');
                        }}
                        placeholder="e.g. Can alter air pressure, jam mechanical latches, and extinguish chemical flares within 15 meters."
                        aria-invalid={
                          Boolean(fieldErrors['authorityContract.authority']) ||
                          authority.length > 500
                        }
                        aria-describedby={
                          fieldErrors['authorityContract.authority']
                            ? 'input-authority-error'
                            : undefined
                        }
                        className={`w-full bg-zinc-900 border p-2.5 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none leading-relaxed ${
                          authority.length > 500 || fieldErrors['authorityContract.authority']
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-zinc-700 focus:border-amber-500'
                        }`}
                      />
                      {fieldErrors['authorityContract.authority'] && (
                        <p
                          id="input-authority-error"
                          role="alert"
                          className="text-xs text-red-400 mt-1 font-mono"
                        >
                          {fieldErrors['authorityContract.authority']}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="input-limits"
                          className="text-xs text-zinc-300 uppercase tracking-wide font-bold"
                        >
                          Operational Limits & Anchors *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openWritingTerminal({
                                title: 'Operational Limits & Anchors',
                                fieldLabel: 'Opposition Contract',
                                guidance: 'Specify physical boundaries, sealed bulkheads, line of sight limits, or vulnerabilities.',
                                initialValue: limits,
                                maxLength: 500,
                                onApply: (val) => {
                                  setLimits(val);
                                  clearFieldError('authorityContract.limits');
                                },
                              })
                            }
                            title="Open expanded writing terminal"
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Expand Editor</span>
                          </button>
                          <span
                            className={`text-xs font-mono ${
                              limits.length > 500 ? 'text-red-400 font-bold' : 'text-zinc-500'
                            }`}
                          >
                            {limits.length}/500
                          </span>
                        </div>
                      </div>
                      <textarea
                        id="input-limits"
                        rows={2}
                        value={limits}
                        onChange={(e) => {
                          setLimits(e.target.value);
                          clearFieldError('authorityContract.limits');
                        }}
                        placeholder="e.g. Cannot penetrate hermetically sealed vault doors or manipulate items in direct UV radiation."
                        aria-invalid={
                          Boolean(fieldErrors['authorityContract.limits']) ||
                          limits.length > 500
                        }
                        aria-describedby={
                          fieldErrors['authorityContract.limits']
                            ? 'input-limits-error'
                            : undefined
                        }
                        className={`w-full bg-zinc-900 border p-2.5 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none leading-relaxed ${
                          limits.length > 500 || fieldErrors['authorityContract.limits']
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-zinc-700 focus:border-amber-500'
                        }`}
                      />
                      {fieldErrors['authorityContract.limits'] && (
                        <p
                          id="input-limits-error"
                          role="alert"
                          className="text-xs text-red-400 mt-1 font-mono"
                        >
                          {fieldErrors['authorityContract.limits']}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Part C: Victim Field Framing (Phase 3B) */}
                <div className="space-y-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs text-zinc-200 uppercase tracking-wider font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-400" />
                      3C. The Victim Field (Your Target)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVictimKind('individual')}
                        className={`px-3 py-1 text-xs uppercase font-bold rounded border transition-colors cursor-pointer ${
                          victimKind === 'individual'
                            ? 'bg-zinc-800 border-zinc-400 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Single Victim
                      </button>
                      <button
                        type="button"
                        onClick={() => setVictimKind('group')}
                        className={`px-3 py-1 text-xs uppercase font-bold rounded border transition-colors cursor-pointer ${
                          victimKind === 'group'
                            ? 'bg-zinc-800 border-zinc-400 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Survivor Group
                      </button>
                    </div>
                  </div>

                  {victimKind === 'individual' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="input-individualVictimName"
                            className="text-xs text-zinc-400 uppercase tracking-wide block mb-1 font-bold"
                          >
                            Victim Name *
                          </label>
                          <input
                            id="input-individualVictimName"
                            type="text"
                            value={individualVictimName}
                            onChange={(e) => {
                              setIndividualVictimName(e.target.value);
                              clearFieldError('victimField.name');
                            }}
                            placeholder="e.g. Chief Engineer"
                            aria-invalid={Boolean(fieldErrors['victimField.name'])}
                            aria-describedby={
                              fieldErrors['victimField.name']
                                ? 'input-individualVictimName-error'
                                : undefined
                            }
                            className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                              fieldErrors['victimField.name']
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-zinc-700 focus:border-zinc-400'
                            }`}
                          />
                          {fieldErrors['victimField.name'] && (
                            <p
                              id="input-individualVictimName-error"
                              role="alert"
                              className="text-xs text-red-400 mt-1 font-mono"
                            >
                              {fieldErrors['victimField.name']}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="input-individualVictimGoal"
                            className="text-xs text-zinc-400 uppercase tracking-wide block mb-1"
                          >
                            Victim Immediate Goal
                          </label>
                          <input
                            id="input-individualVictimGoal"
                            type="text"
                            value={individualVictimGoal}
                            onChange={(e) => setIndividualVictimGoal(e.target.value)}
                            placeholder="e.g. Reach the escape pod array before the pressure bulkhead fails"
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor="input-individualVictimDesc"
                              className="text-xs text-zinc-400 uppercase tracking-wide block"
                            >
                              Victim Profile / Psychological State
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                openWritingTerminal({
                                  title: 'Victim Profile / Psychological State',
                                  fieldLabel: `Victim: ${individualVictimName || 'Unspecified'}`,
                                  guidance: 'Physical description, psychological vulnerabilities, current injuries.',
                                  initialValue: individualVictimDesc,
                                  maxLength: 300,
                                  onApply: (val) => setIndividualVictimDesc(val),
                                })
                              }
                              title="Open expanded writing terminal"
                              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Expand Editor</span>
                            </button>
                          </div>
                          <textarea
                            id="input-individualVictimDesc"
                            rows={2}
                            value={individualVictimDesc}
                            onChange={(e) => setIndividualVictimDesc(e.target.value)}
                            placeholder="e.g. Exhausted, hyperventilating, clutching a ruptured breathing manifold."
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 p-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="input-individualVictimFact"
                            className="text-xs text-zinc-400 uppercase tracking-wide block mb-1"
                          >
                            Known Victim Fact / Key Secret
                          </label>
                          <textarea
                            id="input-individualVictimFact"
                            rows={2}
                            value={individualVictimFact}
                            onChange={(e) => setIndividualVictimFact(e.target.value)}
                            placeholder="e.g. Knows the primary valve override code (4921) but has blurred vision."
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 p-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="input-groupDesignation"
                            className="text-xs text-zinc-400 uppercase tracking-wide block mb-1 font-bold"
                          >
                            Collective Group Designation *
                          </label>
                          <input
                            id="input-groupDesignation"
                            type="text"
                            value={groupDesignation}
                            onChange={(e) => {
                              setGroupDesignation(e.target.value);
                              clearFieldError('victimField.collectiveDesignation');
                            }}
                            placeholder="e.g. Station Engineering Crew (Echo Shift)"
                            aria-invalid={Boolean(fieldErrors['victimField.collectiveDesignation'])}
                            aria-describedby={
                              fieldErrors['victimField.collectiveDesignation']
                                ? 'input-groupDesignation-error'
                                : undefined
                            }
                            className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                              fieldErrors['victimField.collectiveDesignation']
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-zinc-700 focus:border-zinc-400'
                            }`}
                          />
                          {fieldErrors['victimField.collectiveDesignation'] && (
                            <p
                              id="input-groupDesignation-error"
                              role="alert"
                              className="text-xs text-red-400 mt-1 font-mono"
                            >
                              {fieldErrors['victimField.collectiveDesignation']}
                            </p>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor="input-groupDescription"
                              className="text-xs text-zinc-400 uppercase tracking-wide block"
                            >
                              Group Cohesion & Psychological State
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                openWritingTerminal({
                                  title: 'Group Cohesion & Psychological State',
                                  fieldLabel: `Group: ${groupDesignation || 'Unspecified'}`,
                                  guidance: 'Group panic level, leadership hierarchy, or splintering trust.',
                                  initialValue: groupDescription,
                                  maxLength: 300,
                                  onApply: (val) => setGroupDescription(val),
                                })
                              }
                              title="Open expanded writing terminal"
                              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Expand Editor</span>
                            </button>
                          </div>
                          <input
                            id="input-groupDescription"
                            type="text"
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="e.g. Fractured trust, rising hypoxia, two operatives refusing orders."
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-400 px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Group Members List */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold">
                            Named Victims ({groupMembers.length}/8)
                          </label>
                          <button
                            type="button"
                            onClick={handleAddMember}
                            disabled={groupMembers.length >= 8}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 disabled:hover:text-red-400 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Named Victim</span>
                          </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {groupMembers.map((member, idx) => (
                            <div
                              key={member.id || idx}
                              className="p-3 bg-black/40 border border-zinc-800 rounded space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1">
                                  <input
                                    id={`input-member-${idx}-name`}
                                    type="text"
                                    value={member.name}
                                    onChange={(e) => {
                                      handleUpdateMember(idx, 'name', e.target.value);
                                      clearFieldError(`victimField.members.${idx}.name`);
                                    }}
                                    placeholder={`Victim #${idx + 1} Name (e.g. Lead Specialist)`}
                                    className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 rounded focus:outline-none focus:border-zinc-400"
                                  />
                                </div>
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={member.goal || ''}
                                    onChange={(e) =>
                                      handleUpdateMember(idx, 'goal', e.target.value)
                                    }
                                    placeholder="Personal Goal (e.g. Save battery pack)"
                                    className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 rounded focus:outline-none focus:border-zinc-400"
                                  />
                                </div>
                                {groupMembers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(idx)}
                                    title="Remove victim"
                                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={member.description || ''}
                                    onChange={(e) =>
                                      handleUpdateMember(idx, 'description', e.target.value)
                                    }
                                    placeholder="Profile (e.g. Lead researcher, concussed)"
                                    className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 rounded focus:outline-none focus:border-zinc-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openWritingTerminal({
                                        title: `Victim Profile: ${member.name || `Victim #${idx + 1}`}`,
                                        fieldLabel: `Member of ${groupDesignation || 'Group'}`,
                                        initialValue: member.description || '',
                                        maxLength: 300,
                                        onApply: (val) => handleUpdateMember(idx, 'description', val),
                                      })
                                    }
                                    title="Expand description editor"
                                    className="p-1 text-zinc-500 hover:text-zinc-200"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={member.knownFact || ''}
                                  onChange={(e) =>
                                    handleUpdateMember(idx, 'knownFact', e.target.value)
                                  }
                                  placeholder="Known Fact (e.g. Has the emergency flare key)"
                                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-zinc-100 rounded focus:outline-none focus:border-zinc-400"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
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
                  3. Protagonist Identity & Limits
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="input-participantName"
                      className="text-xs text-zinc-400 uppercase tracking-wide block mb-1 font-bold"
                    >
                      Protagonist Name *
                    </label>
                    <input
                      id="input-participantName"
                      type="text"
                      value={participantName}
                      onChange={(e) => {
                        setParticipantName(e.target.value);
                        clearFieldError('participantName');
                      }}
                      placeholder="e.g. Field Operative"
                      aria-invalid={Boolean(fieldErrors['participantName'])}
                      aria-describedby={
                        fieldErrors['participantName']
                          ? 'input-participantName-error'
                          : undefined
                      }
                      className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                        fieldErrors['participantName']
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-700 focus:border-emerald-500'
                      }`}
                    />
                    {fieldErrors['participantName'] && (
                      <p
                        id="input-participantName-error"
                        role="alert"
                        className="text-xs text-red-400 mt-1 font-mono"
                      >
                        {fieldErrors['participantName']}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="input-identity"
                        className="text-xs text-zinc-400 uppercase tracking-wide block"
                      >
                        Background / Psychological State
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          openWritingTerminal({
                            title: 'Protagonist Background & State',
                            fieldLabel: `Protagonist: ${participantName || 'Unspecified'}`,
                            guidance: 'Professional training, psychological trauma, or current physical status.',
                            initialValue: identity,
                            maxLength: 200,
                            onApply: (val) => {
                              setIdentity(val);
                              clearFieldError('identity');
                            },
                          })
                        }
                        title="Open expanded writing terminal"
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Expand Editor</span>
                      </button>
                    </div>
                    <input
                      id="input-identity"
                      type="text"
                      value={identity}
                      onChange={(e) => {
                        setIdentity(e.target.value);
                        clearFieldError('identity');
                      }}
                      placeholder="e.g. Deep-salvage specialist suffering from acoustic paranoia"
                      aria-invalid={Boolean(fieldErrors['identity'])}
                      aria-describedby={
                        fieldErrors['identity'] ? 'input-identity-error' : undefined
                      }
                      className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                        fieldErrors['identity']
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="input-ability"
                        className="text-xs text-zinc-400 uppercase tracking-wide block"
                      >
                        Primary Competence / Unique Asset
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          openWritingTerminal({
                            title: 'Primary Competence / Unique Asset',
                            fieldLabel: `Protagonist: ${participantName || 'Unspecified'}`,
                            guidance: 'Specialized gear, manual overrides, biometric knowledge.',
                            initialValue: ability,
                            maxLength: 200,
                            onApply: (val) => {
                              setAbility(val);
                              clearFieldError('ability');
                            },
                          })
                        }
                        title="Open expanded writing terminal"
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Expand Editor</span>
                      </button>
                    </div>
                    <input
                      id="input-ability"
                      type="text"
                      value={ability}
                      onChange={(e) => {
                        setAbility(e.target.value);
                        clearFieldError('ability');
                      }}
                      placeholder="e.g. Manual pneumatic override knowledge"
                      aria-invalid={Boolean(fieldErrors['ability'])}
                      aria-describedby={
                        fieldErrors['ability'] ? 'input-ability-error' : undefined
                      }
                      className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                        fieldErrors['ability']
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="input-limitation"
                        className="text-xs text-zinc-400 uppercase tracking-wide block"
                      >
                        Mortal Limit / Vulnerability
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          openWritingTerminal({
                            title: 'Mortal Limit / Vulnerability',
                            fieldLabel: `Protagonist: ${participantName || 'Unspecified'}`,
                            guidance: 'Phobias, medical dependencies, sensory impairments, or oxygen limits.',
                            initialValue: limitation,
                            maxLength: 200,
                            onApply: (val) => {
                              setLimitation(val);
                              clearFieldError('limitation');
                            },
                          })
                        }
                        title="Open expanded writing terminal"
                        className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Expand Editor</span>
                      </button>
                    </div>
                    <input
                      id="input-limitation"
                      type="text"
                      value={limitation}
                      onChange={(e) => {
                        setLimitation(e.target.value);
                        clearFieldError('limitation');
                      }}
                      placeholder="e.g. Severe nitrogen narcosis under deep pressure"
                      aria-invalid={Boolean(fieldErrors['limitation'])}
                      aria-describedby={
                        fieldErrors['limitation'] ? 'input-limitation-error' : undefined
                      }
                      className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                        fieldErrors['limitation']
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-zinc-700 focus:border-emerald-500'
                      }`}
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
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="input-directorFocus"
                      className="text-xs text-zinc-400 uppercase tracking-wide block"
                    >
                      Director Staging Focus / Pressure Vector
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        openWritingTerminal({
                          title: 'Director Staging Focus / Pressure Vector',
                          fieldLabel: 'Director Perspective',
                          guidance: 'Specify scene framing, tension escalations, and dramatic pacing rules.',
                          initialValue: directorFocus,
                          maxLength: 200,
                          onApply: (val) => {
                            setDirectorFocus(val);
                            clearFieldError('directorFocus');
                          },
                        })
                      }
                      title="Open expanded writing terminal"
                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Expand Editor</span>
                    </button>
                  </div>
                  <input
                    id="input-directorFocus"
                    type="text"
                    value={directorFocus}
                    onChange={(e) => {
                      setDirectorFocus(e.target.value);
                      clearFieldError('directorFocus');
                    }}
                    placeholder="e.g. Atmospheric escalation, dread-heavy scene framing, psychological fragmentation"
                    aria-invalid={Boolean(fieldErrors['directorFocus'])}
                    aria-describedby={
                      fieldErrors['directorFocus'] ? 'input-directorFocus-error' : undefined
                    }
                    className={`w-full bg-zinc-900 border px-3 py-2 text-xs sm:text-sm text-zinc-100 rounded focus:outline-none ${
                      fieldErrors['directorFocus']
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-zinc-700 focus:border-purple-500'
                    }`}
                  />
                  {fieldErrors['directorFocus'] && (
                    <p
                      id="input-directorFocus-error"
                      role="alert"
                      className="text-xs text-red-400 mt-1 font-mono"
                    >
                      {fieldErrors['directorFocus']}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 bg-red-950/30 border border-red-800 text-red-400 text-xs flex items-center gap-2 rounded"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* STAGE 2: HAUNTED HOUSE SCENARIO REVIEW TERMINAL                           */
          /* ========================================================================= */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {compiledReviewData && (
              <div className="space-y-6">
                {/* Top Dossier Banner */}
                <div className="p-4 bg-zinc-900/70 border border-zinc-700 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-300">
                        Haunted House Blueprint (v1)
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                        {compiledReviewData.blueprint.startingVector} // {compiledReviewData.blueprint.startingTier}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-wide">
                      {compiledReviewData.blueprint.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 font-sans">
                      {compiledReviewData.blueprint.setting?.location} • {compiledReviewData.blueprint.setting?.timePeriod}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className="text-xs text-zinc-400 uppercase font-mono">Recommended Seat:</span>
                    <span className="text-xs uppercase font-bold px-2.5 py-1 rounded bg-zinc-800 border border-zinc-600 text-white flex items-center gap-1.5">
                      {mode === 'antagonist' ? (
                        <>
                          <Skull className="w-3.5 h-3.5 text-red-400" /> Antagonist
                        </>
                      ) : mode === 'director' ? (
                        <>
                          <Film className="w-3.5 h-3.5 text-purple-400" /> Director
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-emerald-400" /> Protagonist
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Grid of details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Narrative Intel & Atmosphere */}
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-zinc-300" /> Scenario Identity & Inciting Incident
                      </h4>
                      <p className="text-xs text-zinc-200 font-mono leading-relaxed bg-black/40 p-3 border border-zinc-800/80 rounded">
                        {compiledReviewData.blueprint.globalPremise || compiledReviewData.blueprint.narrativeRules?.incitingIncident}
                      </p>
                      {compiledReviewData.blueprint.setting?.atmosphere && (
                        <div className="text-xs text-zinc-400">
                          <span className="text-zinc-500 uppercase">Atmosphere: </span>
                          <span className="text-zinc-300">{compiledReviewData.blueprint.setting.atmosphere}</span>
                        </div>
                      )}
                    </div>

                    {/* Authority and Limits (if Antagonist) or Director Framing or Protagonist Rules */}
                    {compiledReviewData.participationContext.authorityContract && (
                      <div className="p-4 bg-red-950/15 border border-red-900/40 rounded space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-400" /> Enforced Authority Contract
                        </h4>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="p-2.5 bg-black/50 border border-amber-900/30 rounded">
                            <span className="text-amber-400 block font-semibold mb-0.5">AUTHORITY SCOPE:</span>
                            <span className="text-zinc-200">{compiledReviewData.participationContext.authorityContract.authority}</span>
                          </div>
                          <div className="p-2.5 bg-black/50 border border-amber-900/30 rounded">
                            <span className="text-amber-400 block font-semibold mb-0.5">OPERATIONAL LIMITS:</span>
                            <span className="text-zinc-200">{compiledReviewData.participationContext.authorityContract.limits}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Cast & Victim Dossier */}
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-zinc-300" /> Cast & Target Dossier
                      </h4>

                      {compiledReviewData.participationContext.victimField ? (
                        <div className="space-y-2">
                          {compiledReviewData.participationContext.victimField.kind === 'individual' ? (
                            <div className="p-3 bg-black/40 border border-zinc-800 rounded space-y-1 text-xs font-mono">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-red-300">
                                  {compiledReviewData.participationContext.victimField.name}
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase">Single Target</span>
                              </div>
                              {compiledReviewData.participationContext.victimField.description && (
                                <p className="text-zinc-400 text-[11px]">{compiledReviewData.participationContext.victimField.description}</p>
                              )}
                              {compiledReviewData.participationContext.victimField.goal && (
                                <p className="text-zinc-300 text-[11px]">
                                  <span className="text-zinc-500">Goal:</span> {compiledReviewData.participationContext.victimField.goal}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs font-mono">
                              <div className="p-2.5 bg-black/40 border border-zinc-800 rounded">
                                <div className="font-bold text-red-300">
                                  {compiledReviewData.participationContext.victimField.collectiveDesignation}
                                </div>
                                {compiledReviewData.participationContext.victimField.description && (
                                  <p className="text-zinc-400 text-[11px] mt-0.5">{compiledReviewData.participationContext.victimField.description}</p>
                                )}
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {compiledReviewData.participationContext.victimField.members?.map((m, idx) => (
                                  <div key={m.id || idx} className="p-2 bg-zinc-950/80 border border-zinc-800/80 rounded text-[11px]">
                                    <div className="font-semibold text-zinc-200">{m.name}</div>
                                    {m.goal && <div className="text-zinc-400"><span className="text-zinc-500">Goal:</span> {m.goal}</div>}
                                    {m.knownFact && <div className="text-zinc-400"><span className="text-zinc-500">Fact:</span> {m.knownFact}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {compiledReviewData.blueprint.cast && compiledReviewData.blueprint.cast.length > 0 ? (
                            compiledReviewData.blueprint.cast.map((c, i) => (
                              <div key={c.id || i} className="p-2.5 bg-black/40 border border-zinc-800 rounded text-xs font-mono">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-zinc-200">{c.name}</span>
                                  <span className="text-[10px] text-zinc-500 uppercase">{c.role}</span>
                                </div>
                                {c.description && <p className="text-zinc-400 text-[11px] mt-1">{c.description}</p>}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-zinc-500 italic p-3 bg-black/20 rounded border border-zinc-800/50">
                              Director framing active. No pre-bound mortal cast members required.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          {stage === 'editing' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="review-haunted-house-session-btn"
                onClick={handleReview}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-mono uppercase tracking-[0.2em] transition-all rounded shadow-lg shadow-red-950/30 cursor-pointer font-bold"
              >
                <span>Review Scenario</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStage('editing')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadBlueprint}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Download Blueprint</span>
                </button>
                <button
                  type="button"
                  id="launch-ad-lib-session-btn"
                  onClick={handleLaunchFromReview}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-[0.2em] transition-all rounded shadow-lg shadow-red-950/30 cursor-pointer font-bold"
                >
                  <span>Initialize Simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Writing Terminal Modal */}
      <WritingTerminalModal
        isOpen={writingTerminal.isOpen}
        onClose={() => setWritingTerminal((prev) => ({ ...prev, isOpen: false }))}
        onApply={writingTerminal.onApply}
        title={writingTerminal.title}
        fieldLabel={writingTerminal.fieldLabel}
        guidance={writingTerminal.guidance}
        initialValue={writingTerminal.initialValue}
        maxLength={writingTerminal.maxLength}
        triggerElementRef={writingTerminal.triggerElementRef}
      />
    </div>
  );
}
