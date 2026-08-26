import { describe, it, expect } from 'vitest';
import {
  createInitialValueStateLedger,
  resolveValueState,
} from './valueState';
import { normalizeBlueprint } from './normalizeBlueprint';
import { Blueprint } from '../types';

describe('valueState unit tests', () => {
  const createMockBlueprint = (): Blueprint =>
    normalizeBlueprint({
      id: 'bp_1',
      title: 'Research Station Epsilon',
      userCharacterId: 'char_player',
      cast: [
        {
          id: 'char_player',
          name: 'Dr. Evans',
          isUserCharacter: true,
          role: 'Lead',
          description: 'Lead researcher',
          personality: 'Stoic',
          goals: 'Finish project',
          traits: ['Focused'],
          isEntity: false,
          behaviorVector: 'COGNITIVE',
          starting_location: 'LAB_A',
        },
        {
          id: 'char_ally',
          name: 'Dr. Aris',
          isUserCharacter: false,
          role: 'Technician',
          description: 'Engineer',
          personality: 'Cautious',
          goals: 'Keep power running',
          traits: ['Analytical'],
          isEntity: false,
          behaviorVector: 'COGNITIVE',
          starting_location: 'LAB_A',
        },
      ],
      topology: { nodes: ['LAB_A'], connections: [] },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED',
        pursuitReviews: {},
        valueAnchors: [
          {
            id: 'val_user_sanity',
            label: 'Dr. Evans Mind',
            description: 'Cognitive integrity of the primary researcher.',
            holder: { kind: 'CHARACTER', castMemberId: 'char_player' },
            basisSummary: 'Psychological profile',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
          {
            id: 'val_station_power',
            label: 'Auxiliary Core',
            description: 'Geothermal power feed.',
            holder: { kind: 'SCENARIO' },
            basisSummary: 'Facility engineering',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
        characterPursuits: [],
      },
    }) as Blueprint;

  it('initializes runtime value state ledger from blueprint without mutating blueprint', () => {
    const bp = createMockBlueprint();
    const ledger = createInitialValueStateLedger(bp);
    expect(ledger.val_user_sanity).toBeDefined();
    expect(ledger.val_user_sanity.condition).toBe('ESTABLISHED');
    expect(ledger.val_user_sanity.lifecycle).toBe('ACTIVE');
    expect(ledger.val_station_power.condition).toBe('ESTABLISHED');
  });

  it('applies valid SET_CONDITION transition citing accepted cause', () => {
    const bp = createMockBlueprint();
    const preState = createInitialValueStateLedger(bp);
    const receipt = resolveValueState({
      proposal: {
        changes: [
          {
            anchorId: 'val_station_power',
            operation: 'SET_CONDITION',
            expectedBeforeCondition: 'ESTABLISHED',
            proposedCondition: 'THREATENED',
            proposedLifecycle: 'ACTIVE',
            proposedFormNote: null,
            causeReference: 'act-1-core-overload',
            rationale: 'Core temperature spiking due to accepted generator fault.',
          },
        ],
      },
      preState,
      currentTurn: 1,
      blueprint: bp,
      userCharacterId: 'char_player',
      validCauses: ['act-1-core-overload'],
    });

    expect(receipt.decisions[0].outcome).toBe('APPLIED');
    expect(receipt.postState.val_station_power.condition).toBe('THREATENED');
    expect(receipt.postState.val_station_power.lastChangedTurn).toBe(1);
    expect(receipt.postState.val_station_power.lastCauseReference).toBe('act-1-core-overload');
  });

  it('rejects revision or retirement of User character value anchor to protect subjectivity', () => {
    const bp = createMockBlueprint();
    const preState = createInitialValueStateLedger(bp);
    const receipt = resolveValueState({
      proposal: {
        changes: [
          {
            anchorId: 'val_user_sanity',
            operation: 'REVISE',
            proposedCondition: 'TRANSFORMED',
            proposedLifecycle: 'REVISED',
            proposedFormNote: 'Obsessed with the machine now.',
            causeReference: 'USER_ACTION',
            rationale: 'Changing player beliefs.',
          },
        ],
      },
      preState,
      currentTurn: 1,
      blueprint: bp,
      userCharacterId: 'char_player',
      validCauses: ['USER_ACTION'],
    });

    expect(receipt.decisions[0].outcome).toBe('REJECTED');
    expect(receipt.decisions[0].reasonCode).toBe('USER_VALUE_SUBJECTIVITY_PROTECTED');
    expect(receipt.postState.val_user_sanity.condition).toBe('ESTABLISHED');
  });

  it('rejects transition citing unsupported or rejected cause', () => {
    const bp = createMockBlueprint();
    const preState = createInitialValueStateLedger(bp);
    const receipt = resolveValueState({
      proposal: {
        changes: [
          {
            anchorId: 'val_station_power',
            operation: 'SET_CONDITION',
            proposedCondition: 'LOST',
            proposedLifecycle: 'ACTIVE',
            proposedFormNote: null,
            causeReference: 'fabricated-cause-999',
            rationale: 'Total power loss.',
          },
        ],
      },
      preState,
      currentTurn: 1,
      blueprint: bp,
      userCharacterId: 'char_player',
      validCauses: ['act-1-core-overload'],
    });

    expect(receipt.decisions[0].outcome).toBe('REJECTED');
    expect(receipt.decisions[0].reasonCode).toBe('UNSUPPORTED_CAUSE_REFERENCE');
    expect(receipt.postState.val_station_power.condition).toBe('ESTABLISHED');
  });
});
