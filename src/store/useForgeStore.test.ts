import { expect, test, describe, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { forgeActions, getForgeState, DraftCastMember, DraftPerspective } from './useForgeStore';
import { TopologyEdge } from '../types';

describe('useForgeStore - draft state and actions', () => {
  beforeEach(() => {
    // Reset the store before each test run
    forgeActions.resetStore();
  });

  test('1. initializeDraft creates a draft with the existing vector/tier defaults and an ID', () => {
    forgeActions.initializeDraft();
    const state = getForgeState();

    expect(state.draftBlueprint).not.toBeNull();
    expect(state.draftBlueprint?.id).toBeDefined();
    expect(typeof state.draftBlueprint?.id).toBe('string');
    expect(state.draftBlueprint?.id?.length).toBeGreaterThan(0);
    expect(state.draftBlueprint?.startingVector).toBe('COGNITIVE');
    expect(state.draftBlueprint?.startingTier).toBe('LATENT');
    expect(state.draftBlueprint?.title).toBe('');
    expect(state.draftBlueprint?.premise).toBe('');
    expect(state.draftBlueprint?.environmentalRules).toBe('');
  });

  test('2. updateDraft merges a typed patch without losing existing draft values', () => {
    forgeActions.initializeDraft();
    const initialDraft = getForgeState().draftBlueprint!;

    forgeActions.updateDraft({
      title: 'The Submerged Complex',
      environmentalRules: 'Pressure increases by 1 ATM per floor',
    });

    const updatedState = getForgeState();
    expect(updatedState.draftBlueprint?.id).toBe(initialDraft.id);
    expect(updatedState.draftBlueprint?.startingVector).toBe('COGNITIVE');
    expect(updatedState.draftBlueprint?.startingTier).toBe('LATENT');
    expect(updatedState.draftBlueprint?.title).toBe('The Submerged Complex');
    expect(updatedState.draftBlueprint?.environmentalRules).toBe(
      'Pressure increases by 1 ATM per floor'
    );

    // Further patch
    forgeActions.updateDraft({
      globalPremise: 'The facility is leaking containment fluid',
      startingTier: 'MANIFEST',
    });

    const secondPatchState = getForgeState();
    expect(secondPatchState.draftBlueprint?.title).toBe('The Submerged Complex');
    expect(secondPatchState.draftBlueprint?.startingVector).toBe('COGNITIVE');
    expect(secondPatchState.draftBlueprint?.startingTier).toBe('MANIFEST');
    expect(secondPatchState.draftBlueprint?.globalPremise).toBe(
      'The facility is leaking containment fluid'
    );
  });

  test('3. Updating nested cast or perspective data produces a new draft structure and does not mutate the prior state snapshot', () => {
    forgeActions.initializeDraft();
    const initialCast: DraftCastMember[] = [
      { id: 'c1', name: 'Dr. Aris', description: 'Lead Researcher', behaviorVector: 'ADAPTIVE' },
    ];
    const initialPerspectives: DraftPerspective[] = [
      {
        role: 'PROTAGONIST',
        framingDirective: 'First person claustrophobic',
        startingSemanticState: 'ISOLATED',
      },
    ];

    forgeActions.updateDraft({
      cast: initialCast,
      perspectives: initialPerspectives,
    });

    const snapshotBefore = getForgeState();
    const draftSnapshotBefore = snapshotBefore.draftBlueprint!;
    const castSnapshotBefore = draftSnapshotBefore.cast!;
    const perspectiveSnapshotBefore = draftSnapshotBefore.perspectives!;

    // Perform immutable nested cast update
    const updatedCast = castSnapshotBefore.map((c) =>
      c.id === 'c1' ? { ...c, name: 'Dr. Aris Thorne', behaviorVector: 'PANIC' } : c
    );
    const updatedPerspectives = perspectiveSnapshotBefore.map((p) =>
      p.role === 'PROTAGONIST' ? { ...p, startingSemanticState: 'TRAPPED' } : p
    );

    forgeActions.updateDraft({
      cast: updatedCast,
      perspectives: updatedPerspectives,
    });

    const snapshotAfter = getForgeState();
    const draftSnapshotAfter = snapshotAfter.draftBlueprint!;

    // Verify new state
    expect(draftSnapshotAfter.cast?.[0].name).toBe('Dr. Aris Thorne');
    expect(draftSnapshotAfter.cast?.[0].behaviorVector).toBe('PANIC');
    expect(draftSnapshotAfter.perspectives?.[0].startingSemanticState).toBe('TRAPPED');

    // Verify snapshotBefore was not mutated
    expect(castSnapshotBefore[0].name).toBe('Dr. Aris');
    expect(castSnapshotBefore[0].behaviorVector).toBe('ADAPTIVE');
    expect(perspectiveSnapshotBefore[0].startingSemanticState).toBe('ISOLATED');
    expect(draftSnapshotBefore).not.toBe(draftSnapshotAfter);
  });

  test('4. removeReference removes only the requested reference and leaves the other draft data intact', () => {
    forgeActions.initializeDraft();
    forgeActions.updateDraft({
      title: 'Facility Log Reference Test',
      startingVector: 'SOMATIC',
      startingTier: 'GATEWAY',
      references: ['manifest.pdf', 'security_briefing.txt', 'audio_log_04.md'],
    });

    forgeActions.removeReference('security_briefing.txt');

    const state = getForgeState();
    expect(state.draftBlueprint?.references).toEqual(['manifest.pdf', 'audio_log_04.md']);
    expect(state.draftBlueprint?.title).toBe('Facility Log Reference Test');
    expect(state.draftBlueprint?.startingVector).toBe('SOMATIC');
    expect(state.draftBlueprint?.startingTier).toBe('GATEWAY');

    // Removing a non-existent reference leaves array intact
    forgeActions.removeReference('non_existent.doc');
    expect(getForgeState().draftBlueprint?.references).toEqual(['manifest.pdf', 'audio_log_04.md']);
  });

  test('5. A draft containing both a legacy string connection and a canonical TopologyEdge is retained as authoring state', () => {
    forgeActions.initializeDraft();

    const mixedConnections: Array<TopologyEdge | string> = [
      'Airlock -> Decontamination',
      {
        from: 'Decontamination',
        to: 'Bio-Lab',
        kind: 'PHYSICAL',
        authority: 'user',
        userInitiated: true,
        legacyUpgraded: true,
      },
    ];

    forgeActions.updateDraft({
      topology: {
        nodes: ['Airlock', 'Decontamination', 'Bio-Lab'],
        connections: mixedConnections,
      },
    });

    const state = getForgeState();
    expect(state.draftBlueprint?.topology).toBeDefined();
    expect(state.draftBlueprint?.topology?.nodes).toEqual([
      'Airlock',
      'Decontamination',
      'Bio-Lab',
    ]);
    expect(state.draftBlueprint?.topology?.connections).toHaveLength(2);
    expect(state.draftBlueprint?.topology?.connections?.[0]).toBe('Airlock -> Decontamination');
    expect(state.draftBlueprint?.topology?.connections?.[1]).toEqual({
      from: 'Decontamination',
      to: 'Bio-Lab',
      kind: 'PHYSICAL',
      authority: 'user',
      userInitiated: true,
      legacyUpgraded: true,
    });
  });

  test('should add a character to the cast correctly', () => {
    const testChar = {
      id: '1',
      name: 'Test Victim',
      description: 'A test victim for cast ledger insertion.',
      role: 'Target',
      personality: 'Anxious',
      goals: 'Survive',
      traits: ['Nervous'],
      isUserCharacter: false,
    };

    forgeActions.addCharacterToCast(testChar);

    const state = getForgeState();
    expect(state.selectedCharacters.length).toBe(1);
    expect(state.selectedCharacters[0].name).toBe('Test Victim');
  });
});
