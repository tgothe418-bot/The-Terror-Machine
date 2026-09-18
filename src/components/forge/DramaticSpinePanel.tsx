import React, { useState } from 'react';
import { useForgeState, forgeActions } from '../../store/useForgeStore';
import {
  DramaticSpine,
  ImpendingClock,
  DramaticMilestoneCondition,
  ClockManifestationCue,
  MacroPhase,
} from '../../types/dramaturgy';
import type { ForgeDraft } from '../../types/forge';
import {
  Clock,
  HelpCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sliders,
  AlertTriangle,
  Compass,
  Gauge,
  Sparkles,
} from 'lucide-react';

// The forge draft stores the *input* variant of the spine (fields with schema
// defaults such as pacingProfile/milestoneConditions are optional until the
// draft is parsed), so the panel works against that shape and only applies
// defaults for display fallbacks.
type DramaticSpineInput = NonNullable<ForgeDraft['dramaticSpine']>;

// `nodeDefinitions` is the raw input of a preprocess schema (unknown[] at the
// type level), so entries are narrowed with a structural guard before use.
const isNodeDefinitionSeed = (n: unknown): n is { id: string; label?: string } =>
  typeof n === 'object' && n !== null && 'id' in n && typeof n.id === 'string';

const DEFAULT_SPINE: DramaticSpine = {
  thematicPremise: '',
  dramaticQuestions: [],
  pacingProfile: 'BALANCED_HORROR',
  milestoneConditions: [],
  impendingClocks: [],
};

export const DramaticSpinePanel: React.FC = () => {
  const blueprint = useForgeState((state) => state.draftBlueprint);
  const spine: DramaticSpineInput = blueprint?.dramaticSpine || DEFAULT_SPINE;
  const cast = blueprint?.cast || [];
  const topology = blueprint?.topology;

  // Extract topology node IDs for diegetic instrument placement
  const availableNodes: Array<{ id: string; label: string }> = [];
  if (topology?.nodeDefinitions && topology.nodeDefinitions.length > 0) {
    topology.nodeDefinitions.forEach((n) => {
      if (isNodeDefinitionSeed(n) && n.id) availableNodes.push({ id: n.id, label: n.label || n.id });
    });
  } else if (topology?.nodes) {
    topology.nodes.forEach((n) => {
      if (n) availableNodes.push({ id: n, label: n });
    });
  }

  // Local UI state
  const [expandedClocks, setExpandedClocks] = useState<Record<string, boolean>>({});
  const [newQuestionText, setNewQuestionText] = useState('');

  const updateSpine = (patch: Partial<DramaticSpineInput>) => {
    const updatedSpine: DramaticSpineInput = {
      ...spine,
      ...patch,
    };
    forgeActions.updateDraft({ dramaticSpine: updatedSpine });
  };

  const toggleClockExpand = (clockId: string) => {
    setExpandedClocks((prev) => ({
      ...prev,
      [clockId]: prev[clockId] === undefined ? false : !prev[clockId],
    }));
  };

  // Dramatic Questions Handlers
  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const questions = [...(spine.dramaticQuestions || []), newQuestionText.trim()];
    updateSpine({ dramaticQuestions: questions });
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (idx: number) => {
    const questions = (spine.dramaticQuestions || []).filter((_, i) => i !== idx);
    updateSpine({ dramaticQuestions: questions });
  };

  // Clock Handlers
  const handleAddClock = () => {
    const newId = `clock-${Date.now().toString(36)}`;
    const newClock: ImpendingClock = {
      id: newId,
      name: 'New Impending Clock',
      domain: 'ENVIRONMENTAL',
      currentLevel: 0,
      advanceMode: {
        mode: 'TIME',
        rate: 'MODERATE',
        minutesPerPoint: 5,
      },
      manifestationCues: [
        { atLevel: 25, cue: 'A faint rhythmic tremor rattles the conduits overhead.' },
        { atLevel: 50, cue: 'Acoustic resonance reaches an audible low drone in the bulkheads.' },
        { atLevel: 75, cue: 'Condensation drips heavily from overhead rivets as pressure spikes.' },
        { atLevel: 100, cue: 'Violent pressure blowouts tear through seal gaskets.' },
      ],
      crisisThreshold: 80,
      accumulatedMinutes: 0,
    };
    updateSpine({ impendingClocks: [...(spine.impendingClocks || []), newClock] });
    setExpandedClocks((prev) => ({ ...prev, [newId]: true }));
  };

  const handleUpdateClock = (clockId: string, patch: Partial<ImpendingClock>) => {
    const updated = (spine.impendingClocks || []).map((c) => {
      if (c.id !== clockId) return c;
      return { ...c, ...patch };
    });
    updateSpine({ impendingClocks: updated });
  };

  const handleRemoveClock = (clockId: string) => {
    const updated = (spine.impendingClocks || []).filter((c) => c.id !== clockId);
    updateSpine({ impendingClocks: updated });
  };

  const handleAddCue = (clockId: string) => {
    const clock = spine.impendingClocks?.find((c) => c.id === clockId);
    if (!clock) return;
    const existingCues = clock.manifestationCues || [];
    const highestLevel = existingCues.length > 0
      ? Math.min(100, Math.max(...existingCues.map((c) => c.atLevel)) + 20)
      : 25;
    const newCue: ClockManifestationCue = {
      atLevel: highestLevel,
      cue: 'The environment begins manifesting subtle deterioration.',
    };
    handleUpdateClock(clockId, { manifestationCues: [...existingCues, newCue] });
  };

  const handleUpdateCue = (
    clockId: string,
    cueIdx: number,
    patch: Partial<ClockManifestationCue>
  ) => {
    const clock = spine.impendingClocks?.find((c) => c.id === clockId);
    if (!clock) return;
    const updatedCues = (clock.manifestationCues || []).map((cue, idx) => {
      if (idx !== cueIdx) return cue;
      return { ...cue, ...patch };
    });
    handleUpdateClock(clockId, { manifestationCues: updatedCues });
  };

  const handleRemoveCue = (clockId: string, cueIdx: number) => {
    const clock = spine.impendingClocks?.find((c) => c.id === clockId);
    if (!clock) return;
    const updatedCues = (clock.manifestationCues || []).filter((_, idx) => idx !== cueIdx);
    handleUpdateClock(clockId, { manifestationCues: updatedCues });
  };

  // Milestone Handlers
  const handleAddMilestone = () => {
    const newId = `milestone-${Date.now().toString(36)}`;
    const newMilestone: DramaticMilestoneCondition = {
      id: newId,
      targetPhase: 'INCITING_RUPTURE',
      description: 'The primary threat breaks containment or crisis escalates.',
      kind: 'CLOCK_CRISIS',
      referenceId: spine.impendingClocks?.[0]?.id || '',
      thresholdValue: 80,
      satisfied: false,
    };
    updateSpine({ milestoneConditions: [...(spine.milestoneConditions || []), newMilestone] });
  };

  const handleUpdateMilestone = (
    milestoneId: string,
    patch: Partial<DramaticMilestoneCondition>
  ) => {
    const updated = (spine.milestoneConditions || []).map((m) => {
      if (m.id !== milestoneId) return m;
      return { ...m, ...patch };
    });
    updateSpine({ milestoneConditions: updated });
  };

  const handleRemoveMilestone = (milestoneId: string) => {
    const updated = (spine.milestoneConditions || []).filter((m) => m.id !== milestoneId);
    updateSpine({ milestoneConditions: updated });
  };

  return (
    <div
      id="dramatic-spine-panel"
      className="flex flex-col h-full overflow-y-auto space-y-6 pr-2 custom-scrollbar text-[#e6e4dc]"
    >
      {/* Sector Header */}
      <div className="border-b border-stone-800/80 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="jewel-amber w-2 h-2 rounded-full bg-amber-500 inline-block" />
          <h3 className="font-serif text-sm 2xl:text-base font-bold uppercase tracking-widest text-[#e6e4dc]">
            [ DRAMATIC SPINE & PACING GOVERNOR ]
          </h3>
        </div>
        <span className="text-[10px] 2xl:text-xs font-mono text-stone-500 uppercase tracking-wider">
          HG2 Pacing, Clocks & Causal Gates
        </span>
      </div>

      {/* 1. THEMATIC PREMISE & PACING PROFILE */}
      <div className="obsidian-panel border border-stone-800/80 p-5 rounded-lg space-y-4 shadow-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 flex flex-col">
            <label className="text-[#e6e4dc] font-serif text-xs uppercase tracking-widest mb-1.5 font-bold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              THEMATIC PREMISE & DRAMATIC CORE
            </label>
            <input
              id="thematic-premise-input"
              type="text"
              value={spine.thematicPremise || ''}
              onChange={(e) => updateSpine({ thematicPremise: e.target.value })}
              placeholder="e.g. Fragility of corporate institutional protocol under biological terror"
              className="w-full h-10 bg-[#0c0c10] border border-stone-800 text-[#e6e4dc] font-mono text-xs px-3 rounded focus:outline-none focus:border-amber-500/80 placeholder:text-stone-600 transition-colors"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[#e6e4dc] font-serif text-xs uppercase tracking-widest mb-1.5 font-bold flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              PACING PROFILE
            </label>
            <select
              id="pacing-profile-select"
              value={spine.pacingProfile || 'BALANCED_HORROR'}
              onChange={(e) => updateSpine({ pacingProfile: e.target.value as DramaticSpine['pacingProfile'] })}
              className="w-full h-10 bg-[#0c0c10] border border-stone-800 text-stone-300 font-mono text-xs px-3 rounded focus:outline-none focus:border-amber-500/80 cursor-pointer"
            >
              <option value="SLOW_BURN_DREAD">SLOW BURN DREAD (Deliberate escalation)</option>
              <option value="RELENTLESS_PURSUIT">RELENTLESS PURSUIT (High urgency)</option>
              <option value="GOTHIC_PSYCHOLOGICAL">GOTHIC PSYCHOLOGICAL (Heavy lulls & dread)</option>
              <option value="BALANCED_HORROR">BALANCED HORROR (Standard tension cycle)</option>
            </select>
          </div>
        </div>

        {/* Dramatic Questions */}
        <div className="pt-2 border-t border-stone-800/60 space-y-2">
          <label className="text-stone-400 font-serif text-xs uppercase tracking-widest font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
              DRAMATIC QUESTIONS (UNRESOLVED ENCOUNTERS)
            </span>
            <span className="text-[10px] font-mono text-stone-500">
              {(spine.dramaticQuestions || []).length} registered
            </span>
          </label>

          <div className="space-y-1.5">
            {(spine.dramaticQuestions || []).map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 bg-[#0a0a0d] border border-stone-800/80 rounded"
              >
                <span className="text-xs font-mono text-stone-300 flex-grow">{q}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="text-stone-600 hover:text-red-400 p-1 cursor-pointer transition-colors"
                  title="Remove question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="new-dramatic-question-input"
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuestion();
                }
              }}
              placeholder="e.g. Will Dr. Ross maintain professional detachment when confronting Subject 41?"
              className="flex-grow h-9 bg-[#0c0c10] border border-stone-800 text-xs font-mono px-3 rounded focus:outline-none focus:border-amber-500/80 placeholder:text-stone-600"
            />
            <button
              id="add-dramatic-question-btn"
              type="button"
              onClick={handleAddQuestion}
              className="h-9 px-3.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono text-xs rounded uppercase font-bold cursor-pointer transition-colors"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* 2. IMPENDING CLOCKS (A4, D2) */}
      <div className="obsidian-panel border border-stone-800/80 p-5 rounded-lg space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-800/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h4 className="text-[#e6e4dc] font-serif text-xs uppercase tracking-widest font-bold">
              IMPENDING CLOCKS (SYSTEMIC ESCALATION)
            </h4>
          </div>
          <button
            id="add-impending-clock-btn"
            type="button"
            onClick={handleAddClock}
            className="flex items-center gap-1.5 px-3 py-1 bg-stone-950 hover:bg-stone-900 border border-amber-600/70 text-amber-300 hover:text-amber-200 text-xs font-mono rounded cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>[ + ADD CLOCK ]</span>
          </button>
        </div>

        {(!spine.impendingClocks || spine.impendingClocks.length === 0) ? (
          <p className="text-xs font-mono text-stone-500 italic py-2">
            No impending clocks authored. Add a clock to drive environmental, biological, or structural dread.
          </p>
        ) : (
          <div className="space-y-3">
            {spine.impendingClocks.map((clock) => {
              const isExpanded = expandedClocks[clock.id] ?? true;
              return (
                <div
                  key={clock.id}
                  id={`clock-card-${clock.id}`}
                  className="border border-stone-800 bg-[#09090d] rounded-lg overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    className="p-3 bg-stone-950/80 flex items-center justify-between cursor-pointer select-none hover:bg-stone-900/60 transition-colors"
                    onClick={() => toggleClockExpand(clock.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                      <span className="font-serif text-xs font-bold uppercase tracking-wider text-amber-300">
                        {clock.name || 'Unnamed Clock'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                        {clock.domain}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-800/40">
                        {clock.advanceMode.mode === 'TIME' ? `TIME (${clock.advanceMode.rate})` : 'EVENT'}
                      </span>
                      {clock.diegeticInstrument && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          <span>DIEGETIC</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveClock(clock.id);
                      }}
                      className="p-1 text-stone-600 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete clock"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Body */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-stone-800/60 bg-[#07070a]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                            Clock Name
                          </label>
                          <input
                            type="text"
                            value={clock.name}
                            onChange={(e) => handleUpdateClock(clock.id, { name: e.target.value })}
                            className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-2 rounded focus:outline-none focus:border-amber-500/80"
                            placeholder="e.g. Sub-Level Coolant Failure"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                            Domain
                          </label>
                          <select
                            value={clock.domain}
                            onChange={(e) =>
                              handleUpdateClock(clock.id, {
                                domain: e.target.value as ImpendingClock['domain'],
                              })
                            }
                            className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-2 rounded focus:outline-none focus:border-amber-500/80"
                          >
                            <option value="ENVIRONMENTAL">ENVIRONMENTAL</option>
                            <option value="STRUCTURAL">STRUCTURAL</option>
                            <option value="SOMATIC">SOMATIC</option>
                            <option value="BEHAVIORAL">BEHAVIORAL</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                            Crisis Threshold (0-100)
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={clock.crisisThreshold ?? 80}
                            onChange={(e) =>
                              handleUpdateClock(clock.id, {
                                crisisThreshold: Math.max(0, Math.min(100, Number(e.target.value))),
                              })
                            }
                            className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-2 rounded focus:outline-none focus:border-amber-500/80"
                          />
                        </div>
                      </div>

                      {/* Advance Mode Configuration (Amendment 4) */}
                      <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">
                            Advance Mode Calibration
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateClock(clock.id, {
                                  advanceMode: {
                                    mode: 'TIME',
                                    rate: 'MODERATE',
                                    minutesPerPoint: 5,
                                  },
                                })
                              }
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                clock.advanceMode.mode === 'TIME'
                                  ? 'bg-amber-950/70 border-amber-600 text-amber-300 font-bold'
                                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
                              }`}
                            >
                              TIME-BASED
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateClock(clock.id, {
                                  advanceMode: {
                                    mode: 'EVENT',
                                    consequencePatterns: ['CONTAINMENT_BREACH', 'STRUCTURAL_FAIL'],
                                    pointsPerEvent: 15,
                                  },
                                })
                              }
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                clock.advanceMode.mode === 'EVENT'
                                  ? 'bg-amber-950/70 border-amber-600 text-amber-300 font-bold'
                                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
                              }`}
                            >
                              EVENT-DRIVEN
                            </button>
                          </div>
                        </div>

                        {clock.advanceMode.mode === 'TIME' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                                Escalation Rate
                              </label>
                              <select
                                value={clock.advanceMode.rate}
                                onChange={(e) => {
                                  const rate = e.target.value as 'SLOW' | 'MODERATE' | 'RAPID';
                                  const mpp = rate === 'SLOW' ? 10 : rate === 'MODERATE' ? 5 : 2;
                                  handleUpdateClock(clock.id, {
                                    advanceMode: { mode: 'TIME', rate, minutesPerPoint: mpp },
                                  });
                                }}
                                className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                              >
                                <option value="SLOW">SLOW (10 min / point)</option>
                                <option value="MODERATE">MODERATE (5 min / point)</option>
                                <option value="RAPID">RAPID (2 min / point)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                                Minutes Per Point
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={60}
                                value={clock.advanceMode.minutesPerPoint}
                                onChange={(e) =>
                                  handleUpdateClock(clock.id, {
                                    advanceMode: {
                                      mode: 'TIME',
                                      rate: clock.advanceMode.mode === 'TIME' ? clock.advanceMode.rate : 'MODERATE',
                                      minutesPerPoint: Math.max(1, Number(e.target.value)),
                                    },
                                  })
                                }
                                className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                                Consequence Match Patterns (Comma-separated)
                              </label>
                              <input
                                type="text"
                                value={clock.advanceMode.consequencePatterns.join(', ')}
                                onChange={(e) => {
                                  const patterns = e.target.value
                                    .split(',')
                                    .map((p) => p.trim())
                                    .filter(Boolean);
                                  handleUpdateClock(clock.id, {
                                    advanceMode: {
                                      mode: 'EVENT',
                                      consequencePatterns: patterns.length > 0 ? patterns : ['BREACH'],
                                      pointsPerEvent:
                                        clock.advanceMode.mode === 'EVENT'
                                          ? clock.advanceMode.pointsPerEvent
                                          : 15,
                                    },
                                  });
                                }}
                                className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                                placeholder="CONTAINMENT_BREACH, ALARM_TRIGGER"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                                Points Advanced Per Event Match
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={clock.advanceMode.pointsPerEvent}
                                onChange={(e) =>
                                  handleUpdateClock(clock.id, {
                                    advanceMode: {
                                      mode: 'EVENT',
                                      consequencePatterns:
                                        clock.advanceMode.mode === 'EVENT'
                                          ? clock.advanceMode.consequencePatterns
                                          : ['BREACH'],
                                      pointsPerEvent: Math.max(1, Number(e.target.value)),
                                    },
                                  })
                                }
                                className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Diegetic Instrument Carve-Out (D2) */}
                      <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded space-y-2">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider">
                            Diegetic Physical Instrument (D2 Carve-Out)
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-stone-400 leading-relaxed">
                          No floating HUD gauges exist. Specific clock numbers are strictly revealed only if the character is located at an in-world instrument.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                              In-World Physical Instrument
                            </label>
                            <input
                              type="text"
                              value={clock.diegeticInstrument || ''}
                              onChange={(e) =>
                                handleUpdateClock(clock.id, {
                                  diegeticInstrument: e.target.value || undefined,
                                })
                              }
                              placeholder="e.g. Magnehelic Differential Pressure Gauge"
                              className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                              Situated Topology Node
                            </label>
                            <select
                              value={clock.instrumentNodeId || ''}
                              onChange={(e) =>
                                handleUpdateClock(clock.id, {
                                  instrumentNodeId: e.target.value || undefined,
                                })
                              }
                              className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                            >
                              <option value="">-- No specific node (Any / None) --</option>
                              {availableNodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.label} ({n.id})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Manifestation Cues (A3 Hysteresis) */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-stone-400 font-mono flex items-center gap-1.5">
                            <Compass className="w-3 h-3 text-amber-500" />
                            <span>Manifestation Cues (Sensory World Descriptions)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddCue(clock.id)}
                            className="text-[10px] font-mono text-amber-400 hover:text-amber-200 cursor-pointer"
                          >
                            + Add Cue
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {(clock.manifestationCues || []).map((cue, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center gap-2 p-2 bg-[#0c0c10] border border-stone-800 rounded"
                            >
                              <div className="w-16 shrink-0">
                                <label className="text-[8px] uppercase text-stone-500 block">Level %</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={cue.atLevel}
                                  onChange={(e) =>
                                    handleUpdateCue(clock.id, cIdx, {
                                      atLevel: Math.max(0, Math.min(100, Number(e.target.value))),
                                    })
                                  }
                                  className="w-full bg-black border border-stone-800 text-xs font-mono px-1 py-0.5 rounded text-center text-amber-300"
                                />
                              </div>
                              <div className="flex-grow">
                                <label className="text-[8px] uppercase text-stone-500 block">Prose Manifestation</label>
                                <input
                                  type="text"
                                  value={cue.cue}
                                  onChange={(e) =>
                                    handleUpdateCue(clock.id, cIdx, { cue: e.target.value })
                                  }
                                  className="w-full bg-black border border-stone-800 text-xs font-mono px-2 py-0.5 rounded text-stone-200"
                                  placeholder="Sensory indication when clock crosses this threshold..."
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCue(clock.id, cIdx)}
                                className="text-stone-600 hover:text-red-400 p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. CAUSAL PHASE-TRANSITION MILESTONES (A5) */}
      <div className="obsidian-panel border border-stone-800/80 p-5 rounded-lg space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-800/60 pb-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-[#e6e4dc] font-serif text-xs uppercase tracking-widest font-bold">
              CAUSAL PHASE-TRANSITION GATES (A5)
            </h4>
          </div>
          <button
            id="add-milestone-gate-btn"
            type="button"
            onClick={handleAddMilestone}
            className="flex items-center gap-1.5 px-3 py-1 bg-stone-950 hover:bg-stone-900 border border-amber-600/70 text-amber-300 hover:text-amber-200 text-xs font-mono rounded cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>[ + ADD MILESTONE ]</span>
          </button>
        </div>

        <p className="text-[10px] font-mono text-stone-400 leading-relaxed">
          Macro-phase transitions fire strictly on causal gates (milestones satisfied or clocks crossed), never on elapsed turns or time alone.
        </p>

        {(!spine.milestoneConditions || spine.milestoneConditions.length === 0) ? (
          <p className="text-xs font-mono text-stone-500 italic py-2">
            No causal milestones authored. Add a gate to regulate macro-phase transitions.
          </p>
        ) : (
          <div className="space-y-3">
            {spine.milestoneConditions.map((milestone) => (
              <div
                key={milestone.id}
                id={`milestone-card-${milestone.id}`}
                className="border border-stone-800 bg-[#09090d] rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xs font-bold uppercase text-amber-300">
                      Phase Gate: {milestone.targetPhase}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                      {milestone.kind}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMilestone(milestone.id)}
                    className="p-1 text-stone-600 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-stone-400 block mb-1">
                      Target Phase
                    </label>
                    <select
                      value={milestone.targetPhase}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, {
                          targetPhase: e.target.value as MacroPhase,
                        })
                      }
                      className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                    >
                      <option value="EXPOSITION_BASELINE">EXPOSITION_BASELINE (Orientation)</option>
                      <option value="INCITING_RUPTURE">INCITING_RUPTURE (Breach/Anomaly)</option>
                      <option value="COMPLICATION_ENCLOSURE">COMPLICATION_ENCLOSURE (Vise tightening)</option>
                      <option value="MIDPOINT_CRISIS">MIDPOINT_CRISIS (Pivotal horror turn)</option>
                      <option value="ESCALATING_VISE">ESCALATING_VISE (Severe attrition)</option>
                      <option value="CLIMACTIC_CONFRONTATION">CLIMACTIC_CONFRONTATION (Final gambit)</option>
                      <option value="AFTERMATH_DENOUEMENT">AFTERMATH_DENOUEMENT (Survival tally)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-stone-400 block mb-1">
                      Causal Trigger Kind
                    </label>
                    <select
                      value={milestone.kind}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, {
                          kind: e.target.value as DramaticMilestoneCondition['kind'],
                        })
                      }
                      className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                    >
                      <option value="CLOCK_CRISIS">CLOCK_CRISIS (Clock crosses threshold)</option>
                      <option value="COMPOSURE_THRESHOLD">COMPOSURE_THRESHOLD (Cast member breaks)</option>
                      <option value="DISCOVERY">DISCOVERY (Evidence revealed)</option>
                      <option value="AUTHORED_TRIGGER">AUTHORED_TRIGGER (Consequence tag)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-stone-400 block mb-1">
                      Reference Target
                    </label>
                    {milestone.kind === 'CLOCK_CRISIS' ? (
                      <select
                        value={milestone.referenceId || ''}
                        onChange={(e) =>
                          handleUpdateMilestone(milestone.id, { referenceId: e.target.value })
                        }
                        className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                      >
                        <option value="">-- Select Impending Clock --</option>
                        {(spine.impendingClocks || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.id})
                          </option>
                        ))}
                      </select>
                    ) : milestone.kind === 'COMPOSURE_THRESHOLD' ? (
                      <select
                        value={milestone.referenceId || ''}
                        onChange={(e) =>
                          handleUpdateMilestone(milestone.id, { referenceId: e.target.value })
                        }
                        className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                      >
                        <option value="">-- Select Cast Member --</option>
                        {cast.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={milestone.referenceId || ''}
                        onChange={(e) =>
                          handleUpdateMilestone(milestone.id, { referenceId: e.target.value })
                        }
                        placeholder="Tag, event identifier, or clue ID"
                        className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                      Narrative Rationale & Description
                    </label>
                    <input
                      type="text"
                      value={milestone.description}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, { description: e.target.value })
                      }
                      placeholder="Why this causal event precipitates a macro-phase shift..."
                      className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-stone-500 block mb-1">
                      Threshold Value
                    </label>
                    <input
                      type="number"
                      value={milestone.thresholdValue ?? 80}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, {
                          thresholdValue: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#0c0c10] border border-stone-800 text-xs font-mono p-1.5 rounded focus:outline-none focus:border-amber-500/80"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
