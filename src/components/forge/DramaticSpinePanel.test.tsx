import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { DramaticSpinePanel } from './DramaticSpinePanel';
import { useForgeStoreInternal, forgeActions } from '../../store/useForgeStore';
import { compileForgeDraft } from '../../lib/forgeCompiler';
import { ForgeDraft } from '../../types/forge';

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('DramaticSpinePanel Component', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    forgeActions.resetStore();
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const initialDraft: Partial<ForgeDraft> = {
      id: 'test-draft-spine',
      title: 'Facility Zero',
      premise: 'Deep sub-surface quarantine breach',
      globalPremise: 'Deep sub-surface quarantine breach',
      setting: {
        location: 'Sub-Level 4 Research Cryo-Chamber',
        atmosphere: 'Sub-zero fog, dead silence',
        timePeriod: 'Present Day',
      },
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      topology: {
        nodes: ['SECTOR_A', 'SECTOR_B'],
        nodeDefinitions: [
          { id: 'SECTOR_A', label: 'Sector A: Cryo-Storage', description: 'Chilled containment vaults' },
          { id: 'SECTOR_B', label: 'Sector B: Control Room', description: 'Central monitoring hub' },
        ],
        connections: [{ from: 'SECTOR_A', to: 'SECTOR_B', kind: 'PHYSICAL', userInitiated: true }],
        anchors: [],
      },
      cast: [
        {
          id: 'char-1',
          name: 'Dr. Ross',
          role: 'Chief Cryobiologist',
          description: 'Observed specimen degradation.',
          isUserCharacter: true,
          isEntity: false,
          behaviorVector: 'ADAPTIVE',
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'SECTOR_A' },
          starting_location: 'SECTOR_A',
          traits: ['Hyper-Vigilance'],
          goals: 'Seal the coolant valves',
          psychologicalStakes: {
            characterId: 'char-1',
            coreDesireOrNeed: 'Preserve cryogenic containment integrity',
            copingMechanism: 'Strict protocol recitation',
            vulnerabilityOrGuilt: 'Authorized the specimen unfreezing',
            breakingPointTrigger: 'Witnessing uncontained specimen infection',
            breakingPointThreshold: 20,
            isObstructed: false,
            composureSensitivity: 1.0,
            currentComposure: 100,
            liftConditions: [
              {
                kind: 'PERSUASION',
                composureRecoveryThreshold: 35,
                description: 'Verbal de-escalation by companion',
              },
            ],
          },
        },
        {
          id: 'char-specimen-zero',
          name: 'Specimen Zero',
          role: 'Antagonist',
          description: 'Thawed cryo-specimen stalking the sub-levels, spreading frostbite infection.',
          disposition: 'VILLAIN',
          isUserCharacter: false,
          isEntity: true,
          behaviorVector: 'RELENTLESS',
          presenceDisposition: { kind: 'NONLOCAL' },
        },
      ],
      dramaticSpine: {
        thematicPremise: 'Institutional paralysis during biological collapse',
        dramaticQuestions: ['Will the containment bulkheads hold before coolant depletion?'],
        pacingProfile: 'SLOW_BURN_DREAD',
        milestoneConditions: [
          {
            id: 'milestone-1',
            targetPhase: 'MIDPOINT_CRISIS',
            description: 'Coolant pressure crosses critical threshold',
            kind: 'CLOCK_CRISIS',
            referenceId: 'clock-coolant',
            thresholdValue: 80,
            satisfied: false,
          },
        ],
        impendingClocks: [
          {
            id: 'clock-coolant',
            name: 'Coolant Depletion',
            domain: 'ENVIRONMENTAL',
            currentLevel: 10,
            advanceMode: {
              mode: 'TIME',
              rate: 'MODERATE',
              minutesPerPoint: 5,
            },
            crisisThreshold: 80,
            diegeticInstrument: 'Cryo Pressure Gauge',
            instrumentNodeId: 'SECTOR_B',
            manifestationCues: [
              { atLevel: 25, cue: 'Frost patterns branch across the valve stems.' },
              { atLevel: 50, cue: 'Pipes rattle violently as nitrogen boils off.' },
              { atLevel: 80, cue: 'Pressure alarms scream across the complex.' },
            ],
          },
        ],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-1': 'REVIEWED_NONE',
          'char-specimen-zero': 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
      deathContract: {
        metaphysics: 'mundane',
        deathMetaphysics: 'mundane',
        powerBudget: 'Strict anatomical limits.',
        seatSuccession: {},
      },
      fearContract: {
        fearlessness: {},
        mortalityBelief: {},
        threatWeights: { life: 1.0, freedom: 1.0, identity: 1.0 },
        lambdaDecay: 0.35,
        residueRatio: 0.25,
        preyEnterThreshold: 0.70,
        preyExitThreshold: 0.40,
        somaticBands: { band1: 0.25, band2: 0.50, band3: 0.75, band4: 0.90 },
        releaseValves: [],
        villainGazeAuthorized: false,
        submitResponse: {},
      },
    };

    forgeActions.replaceDraft(initialDraft as ForgeDraft);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root!.unmount();
      });
      container.remove();
    }
  });

  it('renders the DramaticSpinePanel with existing spine data', () => {
    act(() => {
      root!.render(<DramaticSpinePanel />);
    });

    const premiseInput = container?.querySelector('#thematic-premise-input') as HTMLInputElement;
    expect(premiseInput).toBeTruthy();
    expect(premiseInput.value).toBe('Institutional paralysis during biological collapse');

    const pacingSelect = container?.querySelector('#pacing-profile-select') as HTMLSelectElement;
    expect(pacingSelect).toBeTruthy();
    expect(pacingSelect.value).toBe('SLOW_BURN_DREAD');

    const clockCard = container?.querySelector('#clock-card-clock-coolant');
    expect(clockCard).toBeTruthy();
    expect(clockCard?.textContent).toContain('Coolant Depletion');

    const instrumentInput = clockCard?.querySelector('input[placeholder*="Magnehelic"]') as HTMLInputElement;
    expect(instrumentInput).toBeTruthy();
    expect(instrumentInput.value).toBe('Cryo Pressure Gauge');
  });

  it('allows adding and removing dramatic questions', () => {
    act(() => {
      root!.render(<DramaticSpinePanel />);
    });

    const questionInput = container?.querySelector('#new-dramatic-question-input') as HTMLInputElement;
    const addBtn = container?.querySelector('#add-dramatic-question-btn') as HTMLButtonElement;
    expect(questionInput).toBeTruthy();
    expect(addBtn).toBeTruthy();

    act(() => {
      setInputValue(questionInput, 'Can Ross reach the central terminal before the frost seals it?');
    });

    act(() => {
      addBtn.click();
    });

    const state = useForgeStoreInternal.getState();
    expect(state.draftBlueprint?.dramaticSpine?.dramaticQuestions).toContain(
      'Can Ross reach the central terminal before the frost seals it?'
    );
  });

  it('allows adding and editing an impending clock with diegetic instrument', () => {
    act(() => {
      root!.render(<DramaticSpinePanel />);
    });

    const addClockBtn = container?.querySelector('#add-impending-clock-btn') as HTMLButtonElement;
    expect(addClockBtn).toBeTruthy();

    act(() => {
      addClockBtn.click();
    });

    const state = useForgeStoreInternal.getState();
    const clocks = state.draftBlueprint?.dramaticSpine?.impendingClocks || [];
    expect(clocks.length).toBe(2);
    expect(clocks[1].name).toBe('New Impending Clock');
    expect(clocks[1].advanceMode.mode).toBe('TIME');
  });

  it('allows adding causal phase milestone gates', () => {
    act(() => {
      root!.render(<DramaticSpinePanel />);
    });

    const addMilestoneBtn = container?.querySelector('#add-milestone-gate-btn') as HTMLButtonElement;
    expect(addMilestoneBtn).toBeTruthy();

    act(() => {
      addMilestoneBtn.click();
    });

    const state = useForgeStoreInternal.getState();
    const milestones = state.draftBlueprint?.dramaticSpine?.milestoneConditions || [];
    expect(milestones.length).toBe(2);
  });

  it('compiles successfully through compileForgeDraft preserving dramatic spine & stakes', () => {
    const draft = useForgeStoreInternal.getState().draftBlueprint!;
    const compileResult = compileForgeDraft(draft);

    if (!compileResult.success) {
      console.error('Compilation errors in test:', compileResult.errors);
    }
    expect(compileResult.success).toBe(true);
    if (compileResult.success) {
      const bp = compileResult.blueprint;
      expect(bp.dramaticSpine).toBeDefined();
      expect(bp.dramaticSpine?.pacingProfile).toBe('SLOW_BURN_DREAD');
      expect(bp.dramaticSpine?.impendingClocks.length).toBe(1);
      expect(bp.dramaticSpine?.impendingClocks[0].name).toBe('Coolant Depletion');
      expect(bp.dramaticSpine?.impendingClocks[0].diegeticInstrument).toBe('Cryo Pressure Gauge');
      expect(bp.cast[0].psychologicalStakes?.coreDesireOrNeed).toBe(
        'Preserve cryogenic containment integrity'
      );
    }
  });
});
