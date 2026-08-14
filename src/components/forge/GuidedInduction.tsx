/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { AuthoritativeBlueprint } from '../../lib/schemaCompactor';

export const GuidedInduction: React.FC = () => {
  const [step, setStep] = useState(1);
  const [blueprintDraft, setBlueprintDraft] = useState<Partial<AuthoritativeBlueprint>>({
    identity: { title: '', version: '1.0.0', author: 'System', thematicAnchor: '' },
    topology: { nodes: ['ROOM_START'], connections: [] },
    constraints: [],
    terminalConditions: {
      somaticTerminal: { fatalThresholdTags: [], narrativeResolution: '' },
      narrativeConvergence: { requiredStateFlags: [], resolutionSequence: '' },
      cognitiveCollapse: { maxWebDensity: 5, collapseResolution: '' },
    },
  });

  const handleUpdateIdentity = (fields: Partial<typeof blueprintDraft.identity>) => {
    setBlueprintDraft((prev) => ({
      ...prev,
      identity: { ...prev.identity, ...fields } as any,
    }));
  };

  const handleUpdateTerminal = (
    vector: 'somaticTerminal' | 'narrativeConvergence' | 'cognitiveCollapse',
    fields: any
  ) => {
    setBlueprintDraft((prev) => ({
      ...prev,
      terminalConditions: {
        ...prev.terminalConditions,
        [vector]: { ...prev.terminalConditions?.[vector], ...fields },
      } as any,
    }));
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 h-full bg-black text-zinc-300 font-mono select-none">
      {/* LEFT COLUMN: GUIDED QUESTIONS */}
      <div className="col-span-5 border border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between rounded">
        <div>
          <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-4">
            [ GUIDED INDUCTION SYSTEM // STEP {step} OF 3 ]
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Phase 1: Thematic Anchor
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Define the inescapable psychological truth or prime vector that governs this
                scenario loop.
              </p>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">SCENARIO TITLE</label>
                <input
                  type="text"
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm focus:outline-none focus:border-zinc-600 font-mono text-zinc-200"
                  value={blueprintDraft.identity?.title}
                  onChange={(e) => handleUpdateIdentity({ title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  THEMATIC ANCHOR (THE SYSTEM TRUTH)
                </label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm focus:outline-none focus:border-zinc-600 h-24 font-mono text-zinc-200 resize-none"
                  placeholder="e.g., The subject cannot decouple their identity from the trauma of the accident."
                  value={blueprintDraft.identity?.thematicAnchor}
                  onChange={(e) => handleUpdateIdentity({ thematicAnchor: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Phase 2: Somatic Boundaries
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Establish the strict conditions under which the protagonist's physical shell
                systemically fails.
              </p>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  FATAL DEBUFF TAGS (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., concussed_unconscious, hemorrhaging, shattered_spine"
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm focus:outline-none focus:border-zinc-600 font-mono text-zinc-200"
                  onChange={(e) =>
                    handleUpdateTerminal('somaticTerminal', {
                      fatalThresholdTags: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  SOMATIC TERMINAL RESOLUTION PROSE
                </label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm focus:outline-none focus:border-zinc-600 h-24 font-mono text-zinc-200 resize-none"
                  placeholder="Describe the cold cessation of the system when physical capacity drops to zero."
                  onChange={(e) =>
                    handleUpdateTerminal('somaticTerminal', { narrativeResolution: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Phase 3: Narrative Convergence
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Define the strict, pyrrhic conditions that allow survival at an absolute semantic
                cost.
              </p>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  REQUIRED CONVERGENCE FLAGS (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., sacrifice_accepted, anchor_severed"
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm focus:outline-none focus:border-zinc-600 font-mono text-zinc-200"
                  onChange={(e) =>
                    handleUpdateTerminal('narrativeConvergence', {
                      requiredStateFlags: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  PYRRHIC CLOSURE PROSE
                </label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm focus:outline-none focus:border-zinc-600 h-24 font-mono text-zinc-200 resize-none"
                  placeholder="Describe the state of reality-neutralization once the loop satisfies its cost."
                  onChange={(e) =>
                    handleUpdateTerminal('narrativeConvergence', {
                      resolutionSequence: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-900 mt-6">
          <button
            disabled={step === 1}
            onClick={() => setStep((p) => p - 1)}
            className="px-4 py-2 border border-zinc-800 hover:border-zinc-600 text-xs disabled:opacity-30 disabled:hover:border-zinc-800 transition-colors uppercase"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((p) => p + 1)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs transition-colors uppercase font-bold"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() =>
                console.log('[FORGE COMPILER] Compiling Guided Blueprint State...', blueprintDraft)
              }
              className="px-4 py-2 bg-emerald-950 border border-emerald-700 text-emerald-400 hover:bg-emerald-900 text-xs transition-colors uppercase font-bold"
            >
              Inject Blueprint
            </button>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: RAW SYSTEM PAYLOAD PREVIEW */}
      <div className="col-span-7 border border-zinc-800 bg-zinc-950/20 p-6 flex flex-col rounded">
        <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-4">
          [ AUTHENTIC_BLUEPRINT_SCHEMA // PERSISTENT DRAFT PREVIEW ]
        </div>
        <pre className="flex-1 bg-black p-4 text-xs text-emerald-500 border border-zinc-900 rounded overflow-auto font-mono leading-relaxed select-text">
          {JSON.stringify(blueprintDraft, null, 2)}
        </pre>
      </div>
    </div>
  );
};
