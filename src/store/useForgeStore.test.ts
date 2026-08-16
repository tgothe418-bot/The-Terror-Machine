import { expect, test, describe, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  forgeActions,
  getForgeState,
  DraftCastMember,
  DraftPerspective,
} from './useForgeStore';
import { TopologyEdge } from '../types';
import { useAppStore } from './useAppStore';

describe('useForgeStore - draft state and actions', () => {
  beforeEach(() => {
    // Reset the store before each test run
    forgeActions.resetStore();
  });

  test('1. initializeDraft creates a draft with the existing vector/tier defaults and an ID', () => {
    forgeActions.initializeDraft();
    const state = getForgeState();

    expect(state.forgeDraft).not.toBeNull();
    expect(state.draftBlueprint).toBe(state.forgeDraft);
    expect(state.forgeDraft?.id).toBeDefined();
    expect(typeof state.forgeDraft?.id).toBe('string');
    expect(state.forgeDraft?.id?.length).toBeGreaterThan(0);
    expect(state.forgeDraft?.startingVector).toBe('COGNITIVE');
    expect(state.forgeDraft?.startingTier).toBe('LATENT');
    expect(state.forgeDraft?.title).toBe('');
    expect(state.forgeDraft?.premise).toBe('');
    expect(state.forgeDraft?.environmentalRules).toBe('');
  });

  test('2. updateDraft merges a typed patch without losing existing draft values', () => {
    forgeActions.initializeDraft();
    const initialDraft = getForgeState().forgeDraft!;

    forgeActions.updateDraft({
      title: 'The Submerged Complex',
      environmentalRules: 'Pressure increases by 1 ATM per floor',
      setting: {
        location: 'Deep Trench Station',
        atmosphere: 'High humidity',
        timePeriod: '2099',
      },
    });

    const updatedState = getForgeState();
    expect(updatedState.forgeDraft?.id).toBe(initialDraft.id);
    expect(updatedState.forgeDraft?.startingVector).toBe('COGNITIVE');
    expect(updatedState.forgeDraft?.startingTier).toBe('LATENT');
    expect(updatedState.forgeDraft?.title).toBe('The Submerged Complex');
    expect(updatedState.forgeDraft?.identity?.title).toBe('The Submerged Complex');
    expect(updatedState.forgeDraft?.setting?.location).toBe('Deep Trench Station');
    expect(updatedState.forgeDraft?.environmentalRules).toBe(
      'Pressure increases by 1 ATM per floor'
    );

    // Further patch preserves existing setting and rules
    forgeActions.updateDraft({
      globalPremise: 'The facility is leaking containment fluid',
      startingTier: 'MANIFEST',
    });

    const secondPatchState = getForgeState();
    expect(secondPatchState.forgeDraft?.title).toBe('The Submerged Complex');
    expect(secondPatchState.forgeDraft?.startingVector).toBe('COGNITIVE');
    expect(secondPatchState.forgeDraft?.startingTier).toBe('MANIFEST');
    expect(secondPatchState.forgeDraft?.setting?.location).toBe('Deep Trench Station');
    expect(secondPatchState.forgeDraft?.globalPremise).toBe(
      'The facility is leaking containment fluid'
    );
  });

  test('3. Updating nested cast or perspective data produces a new draft structure and does not mutate the prior state snapshot', () => {
    forgeActions.initializeDraft();
    const initialCast: DraftCastMember[] = [
      {
        id: 'c1',
        name: 'Lead Researcher',
        description: 'Station Scientific Lead',
        behaviorVector: 'ADAPTIVE',
      },
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
    const draftSnapshotBefore = snapshotBefore.forgeDraft!;
    const castSnapshotBefore = draftSnapshotBefore.cast!;
    const perspectiveSnapshotBefore = draftSnapshotBefore.perspectives!;

    // Perform immutable nested cast update
    const updatedCast = castSnapshotBefore.map((c) =>
      c.id === 'c1' ? { ...c, name: 'Senior Specialist', behaviorVector: 'PANIC' } : c
    );
    const updatedPerspectives = perspectiveSnapshotBefore.map((p) =>
      p.role === 'PROTAGONIST' ? { ...p, startingSemanticState: 'TRAPPED' } : p
    );

    forgeActions.updateDraft({
      cast: updatedCast,
      perspectives: updatedPerspectives,
    });

    const snapshotAfter = getForgeState();
    const draftSnapshotAfter = snapshotAfter.forgeDraft!;

    // Verify new state
    expect(draftSnapshotAfter.cast?.[0].name).toBe('Senior Specialist');
    expect(draftSnapshotAfter.cast?.[0].behaviorVector).toBe('PANIC');
    expect(draftSnapshotAfter.perspectives?.[0].startingSemanticState).toBe('TRAPPED');

    // Verify snapshotBefore was not mutated
    expect(castSnapshotBefore[0].name).toBe('Lead Researcher');
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
    expect(state.forgeDraft?.references).toEqual(['manifest.pdf', 'audio_log_04.md']);
    expect(state.forgeDraft?.title).toBe('Facility Log Reference Test');
    expect(state.forgeDraft?.startingVector).toBe('SOMATIC');
    expect(state.forgeDraft?.startingTier).toBe('GATEWAY');

    // Removing a non-existent reference leaves array intact
    forgeActions.removeReference('non_existent.doc');
    expect(getForgeState().forgeDraft?.references).toEqual(['manifest.pdf', 'audio_log_04.md']);
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
    expect(state.forgeDraft?.topology).toBeDefined();
    expect(state.forgeDraft?.topology?.nodes).toEqual([
      'Airlock',
      'Decontamination',
      'Bio-Lab',
    ]);
    expect(state.forgeDraft?.topology?.connections).toHaveLength(2);
    expect(state.forgeDraft?.topology?.connections?.[0]).toBe('Airlock -> Decontamination');
    expect(state.forgeDraft?.topology?.connections?.[1]).toEqual({
      from: 'Decontamination',
      to: 'Bio-Lab',
      kind: 'PHYSICAL',
      authority: 'user',
      userInitiated: true,
      legacyUpgraded: true,
    });
  });

  test('6. replaceDraft completely replaces the current draft with a clean deep clone', () => {
    forgeActions.initializeDraft();
    const externalDraft = {
      id: 'ext-draft-99',
      title: 'Imported Scenario',
      premise: 'Imported premise content',
      globalPremise: 'Imported premise content',
      startingVector: 'COSMIC' as const,
      startingTier: 'MANIFEST' as const,
      environmentalRules: 'Total silence',
      constraints: ['No artificial light'],
      contentScale: 5,
      contentLevelDescription: 'Extreme',
      identity: {
        title: 'Imported Scenario',
        version: '2.0',
        author: 'Unknown Author',
        thematicAnchor: 'Void',
      },
      setting: {
        location: 'Derelict Deep Space Array',
        atmosphere: 'Vacuum frost',
        timePeriod: '3022',
      },
      cast: [],
      perspectives: [],
      topology: { nodes: [], connections: [] },
      narrativeRules: {
        incitingIncident: '',
        phaseDirectives: {},
        currentTensionLevel: 'buildup',
        keyPlotElements: [],
      },
      references: [],
      characters: [],
    };

    forgeActions.replaceDraft(externalDraft);

    const state = getForgeState();
    expect(state.forgeDraft?.id).toBe('ext-draft-99');
    expect(state.forgeDraft?.title).toBe('Imported Scenario');
    expect(state.forgeDraft?.startingVector).toBe('COSMIC');
    expect(state.draftBlueprint).toEqual(state.forgeDraft);
  });

  test('7. Forge draft actions never mutate or reset App runtime state', () => {
    const appBefore = useAppStore.getState();

    forgeActions.initializeDraft();
    forgeActions.updateDraft({ title: 'New Scenario Draft' });
    forgeActions.resetStore();

    const appAfter = useAppStore.getState();

    expect(appAfter.sessionId).toBe(appBefore.sessionId);
    expect(appAfter.phase).toBe(appBefore.phase);
  });
});
