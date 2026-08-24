import { expect, test, describe, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  forgeActions,
  getForgeState,
  DraftCastMember,
  DraftPerspective,
  sanitizeSourceAnalyses,
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

  test('8. Legacy-compatible cast actions write directly to canonical forgeDraft and keep castLedger synchronized', () => {
    forgeActions.initializeDraft();

    // Add cast member via legacy action
    forgeActions.addCastMember({
      name: 'Dr. John Croft',
      role: 'PROTAGONIST',
      psychological_status: 'Hyper-vigilant and experiencing auditory anomalies.',
      starting_location: 'Sub-Level 3 Security Airlock',
      isEntity: false,
    });

    const stateAfterAdd = getForgeState();
    expect(stateAfterAdd.forgeDraft?.cast).toHaveLength(1);
    expect(stateAfterAdd.forgeDraft?.cast?.[0].name).toBe('Dr. John Croft');
    expect(stateAfterAdd.forgeDraft?.cast?.[0].role).toBe('PROTAGONIST');
    expect(stateAfterAdd.forgeDraft?.cast?.[0].isUserCharacter).toBe(true);
    expect(stateAfterAdd.forgeDraft?.cast?.[0].starting_location).toBe('Sub-Level 3 Security Airlock');

    // castLedger should match canonical draft
    expect(stateAfterAdd.castLedger).toHaveLength(1);
    expect(stateAfterAdd.castLedger[0].name).toBe('Dr. John Croft');
    expect(stateAfterAdd.castLedger[0].id).toBe(stateAfterAdd.forgeDraft?.cast?.[0].id);

    // Update cast member via legacy action
    const castId = stateAfterAdd.castLedger[0].id;
    forgeActions.updateCastMember(castId, {
      name: 'Dr. Jonathan Croft',
      psychological_status: 'Auditory hallucinations escalating rapidly.',
    });

    const stateAfterUpdate = getForgeState();
    expect(stateAfterUpdate.forgeDraft?.cast?.[0].name).toBe('Dr. Jonathan Croft');
    expect(stateAfterUpdate.forgeDraft?.cast?.[0].psychological_status).toBe(
      'Auditory hallucinations escalating rapidly.'
    );
    expect(stateAfterUpdate.castLedger[0].name).toBe('Dr. Jonathan Croft');

    // Remove cast member via legacy action
    forgeActions.removeCastMember(castId);
    const stateAfterRemove = getForgeState();
    expect(stateAfterRemove.forgeDraft?.cast).toHaveLength(0);
    expect(stateAfterRemove.castLedger).toHaveLength(0);
  });

  test('9. Legacy-compatible topology actions write directly to canonical forgeDraft and keep topology synchronized', () => {
    forgeActions.initializeDraft();

    // Add nodes via legacy action
    forgeActions.addSpatialNode('NODE_VAULT');
    forgeActions.addSpatialNode('NODE_CONTROL');

    const stateAfterNodes = getForgeState();
    expect(stateAfterNodes.forgeDraft?.topology?.nodes).toContain('NODE_VAULT');
    expect(stateAfterNodes.forgeDraft?.topology?.nodes).toContain('NODE_CONTROL');
    expect(stateAfterNodes.topology['NODE_VAULT']).toBeDefined();
    expect(stateAfterNodes.topology['NODE_CONTROL']).toBeDefined();

    // Toggle edge between nodes
    forgeActions.toggleSpatialEdge('NODE_VAULT', 'NODE_CONTROL');
    const stateAfterEdge = getForgeState();
    expect(stateAfterEdge.forgeDraft?.topology?.connections).toHaveLength(1);
    expect(stateAfterEdge.topology['NODE_VAULT']).toContain('NODE_CONTROL');
    expect(stateAfterEdge.topology['NODE_CONTROL']).toContain('NODE_VAULT');

    // Remove node cleans up connections in canonical draft and derived topology
    forgeActions.removeSpatialNode('NODE_CONTROL');
    const stateAfterRemoveNode = getForgeState();
    expect(stateAfterRemoveNode.forgeDraft?.topology?.nodes).not.toContain('NODE_CONTROL');
    expect(stateAfterRemoveNode.forgeDraft?.topology?.connections).toHaveLength(0);
    expect(stateAfterRemoveNode.topology['NODE_CONTROL']).toBeUndefined();
  });

  test('10. draftBlueprint remains strictly identical to forgeDraft with no separate authoring fork', () => {
    forgeActions.initializeDraft();
    forgeActions.updateDraft({ title: 'Single Authority Confirmation' });

    const state = getForgeState();
    expect(state.draftBlueprint).toBe(state.forgeDraft);
    expect(state.draftBlueprint?.title).toBe('Single Authority Confirmation');
  });

  test('11. registerSourceAnalysis registers analysis without mutating forgeDraft', () => {
    forgeActions.initializeDraft({ title: 'Untouched Title', premise: 'Untouched Premise' });
    const draftBefore = getForgeState().forgeDraft;

    const mockAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'src-1',
        fileName: 'imported.json',
        mimeType: 'application/json',
        kind: 'native_blueprint' as const,
        receivedAt: Date.now(),
      },
      summary: 'Imported test scenario',
      evidence: [
        {
          id: 'ev-1',
          sourceId: 'src-1',
          category: 'identity' as const,
          claim: 'Title is Overwrite Attempt',
        },
      ],
      candidates: [
        {
          id: 'cand-1',
          sourceId: 'src-1',
          classification: 'evidence' as const,
          target: 'scenario_title' as const,
          label: 'Scenario Title',
          explanation: 'Extracted title',
          evidenceIds: ['ev-1'],
          proposedValue: 'Overwrite Attempt',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const state = getForgeState();
    expect(state.sourceAnalyses['analysis-1']).toBeDefined();
    // Invariant 1: Uploading must never mutate or overwrite forgeDraft
    expect(state.forgeDraft?.title).toBe('Untouched Title');
    expect(state.forgeDraft?.premise).toBe('Untouched Premise');
    expect(state.forgeDraft).toEqual(draftBefore);
  });

  test('12. applyAcceptedCandidates is the canonical path updating forgeDraft atomically with provenance', () => {
    forgeActions.initializeDraft({ title: 'Initial Title' });
    const initialRevision = getForgeState().draftRevision || 0;

    const mockAnalysis = {
      id: 'analysis-2',
      sourceRecord: {
        id: 'src-2',
        fileName: 'story_notes.pdf',
        mimeType: 'application/pdf',
        kind: 'document' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-setting',
          sourceId: 'src-2',
          classification: 'evidence' as const,
          target: 'setting_location' as const,
          label: 'Location',
          explanation: 'Extracted setting',
          evidenceIds: [],
          proposedValue: 'The Sunken Crypt',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);
    expect(getForgeState().forgeDraft?.setting?.location).toBe('');

    // Atomic apply of accepted candidates
    const result = forgeActions.applyAcceptedCandidates('analysis-2');
    expect(result.success).toBe(true);

    const stateAfterApply = getForgeState();
    expect(stateAfterApply.forgeDraft?.setting?.location).toBe('The Sunken Crypt');
    expect(stateAfterApply.forgeDraft?.references).toContain('story_notes.pdf');
    expect(stateAfterApply.draftRevision).toBe(initialRevision + 1);
    expect(stateAfterApply.sourceAnalyses['analysis-2'].candidates[0].reviewDecision).toBe('accepted');
    expect(stateAfterApply.sourceAnalyses['analysis-2'].candidates[0].applicationState).toBe('applied');

    // Removing analysis does NOT roll back accepted draft content
    forgeActions.removeSourceAnalysis('analysis-2');
    const stateAfterRemove = getForgeState();
    expect(stateAfterRemove.sourceAnalyses['analysis-2']).toBeUndefined();
    expect(stateAfterRemove.forgeDraft?.setting?.location).toBe('The Sunken Crypt');
    expect(stateAfterRemove.forgeDraft?.references).toContain('story_notes.pdf');
  });

  test('12b. A batch containing valid candidates plus one invalid candidate performs no mutations (atomic rollback)', () => {
    forgeActions.initializeDraft({ title: 'Initial Title' });
    const baselineDraft = JSON.parse(JSON.stringify(getForgeState().forgeDraft));
    const initialRevision = getForgeState().draftRevision || 0;

    const mockAnalysis = {
      id: 'analysis-batch-fail',
      sourceRecord: {
        id: 'src-fail',
        fileName: 'batch_test.pdf',
        mimeType: 'application/pdf',
        kind: 'document' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-valid-loc',
          sourceId: 'src-fail',
          classification: 'evidence' as const,
          target: 'setting_location' as const,
          label: 'Location',
          explanation: 'Extracted setting',
          evidenceIds: [],
          proposedValue: 'Valid Trench Location',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
        {
          id: 'cand-invalid-expr',
          sourceId: 'src-fail',
          classification: 'evidence' as const,
          target: 'cast_expression_guidance' as const,
          targetCastMemberId: 'non-existent-cast-member-id',
          label: 'Cast Expression Guidance',
          explanation: 'Guidance for missing cast member',
          evidenceIds: [],
          proposedValue: {
            communicationModes: ['spoken' as const],
            expressionGuidance: 'Radio chatter',
          },
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    // Apply batch with invalid candidate
    const result = forgeActions.applyAcceptedCandidates('analysis-batch-fail');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors['cand-invalid-expr']).toBeDefined();
      expect(result.errors['cand-invalid-expr']).toContain('not found in active draft');
    }

    const stateAfterFail = getForgeState();
    // 1. draftBlueprint / forgeDraft unchanged
    expect(stateAfterFail.forgeDraft).toEqual(baselineDraft);
    expect(stateAfterFail.draftBlueprint).toEqual(baselineDraft);
    expect(stateAfterFail.forgeDraft?.setting?.location).toBe('');
    // 2. draftRevision unchanged
    expect(stateAfterFail.draftRevision).toBe(initialRevision);
    // 3. candidate applicationState values unchanged (still staged)
    const analysisAfter = stateAfterFail.sourceAnalyses['analysis-batch-fail'];
    expect(analysisAfter.candidates[0].applicationState).toBe('staged');
    expect(analysisAfter.candidates[1].applicationState).toBe('staged');
    // 4. candidate provenance or applied-source ledgers unchanged
    expect(stateAfterFail.forgeDraft?.references).not.toContain('batch_test.pdf');
  });

  test('12c. A successful batch applies every accepted staged candidate exactly once and advances draftRevision once', () => {
    forgeActions.initializeDraft({ title: 'Initial Title' });
    const initialRevision = getForgeState().draftRevision || 0;

    const mockAnalysis = {
      id: 'analysis-batch-success',
      sourceRecord: {
        id: 'src-success',
        fileName: 'batch_success.json',
        mimeType: 'application/json',
        kind: 'native_blueprint' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-1-loc',
          sourceId: 'src-success',
          classification: 'evidence' as const,
          target: 'setting_location' as const,
          label: 'Location',
          explanation: 'Extracted setting',
          evidenceIds: [],
          proposedValue: 'Deep Ocean Rig',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
        {
          id: 'cand-2-atmos',
          sourceId: 'src-success',
          classification: 'evidence' as const,
          target: 'setting_atmosphere' as const,
          label: 'Atmosphere',
          explanation: 'Extracted atmosphere',
          evidenceIds: [],
          proposedValue: 'Humid, metallic scent',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
        {
          id: 'cand-3-cast',
          sourceId: 'src-success',
          classification: 'evidence' as const,
          target: 'cast_seed' as const,
          label: 'Cast Member',
          explanation: 'Extracted cast',
          evidenceIds: [],
          proposedValue: {
            id: 'char-batch-1',
            name: 'Engineer Hayes',
            role: 'PROTAGONIST',
            description: 'Lead Technician',
            isEntity: false,
          },
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const result = forgeActions.applyAcceptedCandidates('analysis-batch-success');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.appliedCandidateIds).toEqual(['cand-3-cast', 'cand-1-loc', 'cand-2-atmos']);
    }

    const state = getForgeState();
    expect(state.draftRevision).toBe(initialRevision + 1);
    expect(state.forgeDraft?.setting?.location).toBe('Deep Ocean Rig');
    expect(state.forgeDraft?.setting?.atmosphere).toBe('Humid, metallic scent');
    expect(state.forgeDraft?.cast?.find((c) => c.id === 'char-batch-1')).toBeDefined();
    expect(state.sourceAnalyses['analysis-batch-success'].candidates.every((c) => c.applicationState === 'applied')).toBe(true);
  });

  test('12d. Rejected candidates remain staged ledger entries and are not applied during applyAcceptedCandidates', () => {
    forgeActions.initializeDraft({ title: 'Initial Title' });
    const initialRevision = getForgeState().draftRevision || 0;

    const mockAnalysis = {
      id: 'analysis-reject-test',
      sourceRecord: {
        id: 'src-rej',
        fileName: 'reject_notes.txt',
        mimeType: 'text/plain',
        kind: 'document' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-keep',
          sourceId: 'src-rej',
          classification: 'evidence' as const,
          target: 'setting_location' as const,
          label: 'Location',
          explanation: 'Extracted location',
          evidenceIds: [],
          proposedValue: 'Kept Location',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
        {
          id: 'cand-rejected',
          sourceId: 'src-rej',
          classification: 'evidence' as const,
          target: 'setting_atmosphere' as const,
          label: 'Atmosphere',
          explanation: 'Extracted atmosphere',
          evidenceIds: [],
          proposedValue: 'Unwanted Atmosphere',
          reviewDecision: 'rejected' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const result = forgeActions.applyAcceptedCandidates('analysis-reject-test');
    expect(result.success).toBe(true);

    const state = getForgeState();
    expect(state.draftRevision).toBe(initialRevision + 1);
    expect(state.forgeDraft?.setting?.location).toBe('Kept Location');
    // Rejected candidate was NOT applied
    expect(state.forgeDraft?.setting?.atmosphere).toBe('');

    const analysis = state.sourceAnalyses['analysis-reject-test'];
    const keptCand = analysis.candidates.find((c) => c.id === 'cand-keep')!;
    const rejectedCand = analysis.candidates.find((c) => c.id === 'cand-rejected')!;

    expect(keptCand.reviewDecision).toBe('accepted');
    expect(keptCand.applicationState).toBe('applied');

    // Rejected candidate remains staged ledger entry
    expect(rejectedCand.reviewDecision).toBe('rejected');
    expect(rejectedCand.applicationState).toBe('staged');
  });

  test('13. rejectCandidate and editPendingCandidate do not mutate forgeDraft', () => {
    forgeActions.initializeDraft({ title: 'Authored Title' });

    const mockAnalysis = {
      id: 'analysis-3',
      sourceRecord: {
        id: 'src-3',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        kind: 'document' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-premise',
          sourceId: 'src-3',
          classification: 'inference' as const,
          target: 'premise' as const,
          label: 'Premise',
          explanation: 'Inferred premise',
          evidenceIds: [],
          proposedValue: 'Inferred Premise text',
          reviewDecision: 'accepted' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    // Edit candidate proposal
    forgeActions.editPendingCandidate('analysis-3', 'cand-premise', 'Polished Inferred Premise');
    const stateAfterEdit = getForgeState();
    expect(stateAfterEdit.sourceAnalyses['analysis-3'].candidates[0].proposedValue).toBe(
      'Polished Inferred Premise'
    );
    expect(stateAfterEdit.forgeDraft?.premise).toBe('');

    // Reject candidate
    forgeActions.rejectCandidate('analysis-3', 'cand-premise');
    const stateAfterReject = getForgeState();
    expect(stateAfterReject.sourceAnalyses['analysis-3'].candidates[0].reviewDecision).toBe('rejected');
    expect(stateAfterReject.forgeDraft?.premise).toBe('');
    expect(stateAfterReject.forgeDraft?.title).toBe('Authored Title');
  });

  test('14. sanitizeSourceAnalyses normalizes dual-keyed entries into one canonical entry and discards malformed entries', () => {
    const validAnalysis = {
      id: 'analysis-canon-1',
      sourceRecord: {
        id: 'src-rec-1',
        fileName: 'blueprint.json',
        mimeType: 'application/json',
        kind: 'native_blueprint' as const,
        receivedAt: 1234567890,
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-title-1',
          sourceId: 'src-rec-1',
          classification: 'evidence' as const,
          target: 'scenario_title' as const,
          label: 'Scenario Title',
          explanation: 'Extracted title',
          evidenceIds: [],
          proposedValue: 'Canonical Scenario',
          reviewState: 'pending' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    const malformedAnalysis = {
      id: 'analysis-bad',
      // missing sourceRecord
      candidates: 'not-an-array',
    };

    // State persisted under dual keys: analysis.id and sourceRecord.id
    const legacyPersisted = {
      'analysis-canon-1': validAnalysis,
      'src-rec-1': validAnalysis,
      'analysis-bad': malformedAnalysis,
      'not-even-an-object': 'random string',
    };

    const sanitized = sanitizeSourceAnalyses(legacyPersisted);

    // Should only have exactly 1 entry keyed under 'analysis-canon-1'
    expect(Object.keys(sanitized)).toEqual(['analysis-canon-1']);
    expect(sanitized['analysis-canon-1']).toBeDefined();
    expect(sanitized['analysis-canon-1'].id).toBe('analysis-canon-1');
    expect(sanitized['analysis-canon-1'].candidates[0].proposedValue).toBe('Canonical Scenario');
    expect(sanitized['src-rec-1']).toBeUndefined();
    expect(sanitized['analysis-bad']).toBeUndefined();

    // Handling of non-object values
    expect(sanitizeSourceAnalyses(null)).toEqual({});
    expect(sanitizeSourceAnalyses(undefined)).toEqual({});
    expect(sanitizeSourceAnalyses([])).toEqual({});
    expect(sanitizeSourceAnalyses('string')).toEqual({});
  });

  test('15. Ambiguity Resolution Flow: follow-up, proposal receiving, editing, and transactional draft commit', () => {
    forgeActions.initializeDraft();
    forgeActions.updateDraft({
      identity: { title: 'Atmospheric Research Station' },
      premise: 'Initial premise on orbital facility.',
      setting: { location: 'Orbital Ring', atmosphere: 'Sterile', timePeriod: '2150' },
      cast: [
        {
          id: 'cast-1',
          name: 'Dr. Sterling',
          role: 'Lead Researcher',
          description: 'Senior planetary scientist.',
          personality: 'Stoic and meticulous.',
        },
      ],
    });

    const mockAnalysis = {
      id: 'analysis-ambiguity-test',
      sourceRecord: {
        id: 'src-rec-ambiguity',
        fileName: 'station_log.txt',
        mimeType: 'text/plain',
        kind: 'native_blueprint' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-atmospheric-pressure',
          sourceId: 'analysis-ambiguity-test',
          category: 'setting' as const,
          question: 'What is the exact ambient atmospheric pressure in Sector 4?',
          targetEffect: 'Clarifies whether helmets are required in Sector 4.',
          status: 'queued' as const,
          followUps: [],
        },
      ],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    // 1. Submit initial answer
    forgeActions.submitUnknownAnswer(
      'analysis-ambiguity-test',
      'unk-atmospheric-pressure',
      'The pressure is reduced to 0.4 atm following a coolant rupture.'
    );

    let state = getForgeState();
    let unk = state.sourceAnalyses['analysis-ambiguity-test'].unknowns[0];
    expect(unk.submittedAnswer).toBe('The pressure is reduced to 0.4 atm following a coolant rupture.');
    expect(unk.status).toBe('awaiting_response');

    // 2. Receive follow-up question
    forgeActions.receiveUnknownFollowUp(
      'analysis-ambiguity-test',
      'unk-atmospheric-pressure',
      'Does this require emergency re-breathers?'
    );

    state = getForgeState();
    unk = state.sourceAnalyses['analysis-ambiguity-test'].unknowns[0];
    expect(unk.followUps).toHaveLength(1);
    expect(unk.followUps[0].question).toBe('Does this require emergency re-breathers?');

    // 3. Receive proposal with structured draftPatch
    forgeActions.receiveUnknownProposal('analysis-ambiguity-test', 'unk-atmospheric-pressure', {
      resolution: 'Sector 4 pressure is at 0.4 atm; emergency re-breathers are mandatory.',
      targetEffect: 'Clarifies atmospheric setting and adds environmental rule.',
      draftPatch: {
        operations: [
          {
            target: 'setting_atmosphere',
            text: 'Low-pressure hazard in Sector 4 (0.4 atm).',
          },
          {
            target: 'environmental_rule',
            text: 'Re-breathers mandatory in Sector 4.',
          },
          {
            target: 'cast_description',
            castMemberId: 'cast-1',
            text: 'Carries a modified re-breather kit.',
          },
        ],
      },
    });

    state = getForgeState();
    unk = state.sourceAnalyses['analysis-ambiguity-test'].unknowns[0];
    expect(unk.status).toBe('awaiting_confirmation');
    expect(unk.resolutionProposal?.draftPatch?.operations).toHaveLength(3);

    // 4. Accept resolution and verify draft commit
    const commitResult = forgeActions.acceptUnknownResolution(
      'analysis-ambiguity-test',
      'unk-atmospheric-pressure'
    );
    expect(commitResult.success).toBe(true);

    state = getForgeState();
    unk = state.sourceAnalyses['analysis-ambiguity-test'].unknowns[0];
    expect(unk.status).toBe('resolved');

    // Verify draft was patched deterministically
    expect(state.forgeDraft?.setting?.atmosphere).toContain('Sterile Low-pressure hazard in Sector 4 (0.4 atm).');
    expect(state.forgeDraft?.environmentalRules).toContain('Re-breathers mandatory in Sector 4.');
    expect(state.forgeDraft?.cast?.[0].description).toContain('Senior planetary scientist.\n\nCarries a modified re-breather kit.');

    // Verify canonical ambiguity was recorded
    expect(state.forgeDraft?.ambiguities).toHaveLength(1);
    expect(state.forgeDraft?.ambiguities?.[0].id).toBe('unk-atmospheric-pressure');
    expect(state.forgeDraft?.ambiguities?.[0].resolution).toBe(
      'Sector 4 pressure is at 0.4 atm; emergency re-breathers are mandatory.'
    );
  });

  test('16. Transactional rollback when patch references non-existent cast member', () => {
    forgeActions.initializeDraft();
    forgeActions.updateDraft({
      premise: 'Unchanged premise',
      cast: [],
    });

    const mockAnalysis = {
      id: 'analysis-rollback-test',
      sourceRecord: {
        id: 'src-rec-rollback',
        fileName: 'station_log.txt',
        mimeType: 'text/plain',
        kind: 'native_blueprint' as const,
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-cast-invalid',
          sourceId: 'analysis-rollback-test',
          category: 'cast' as const,
          question: 'What is the motive of nonexistent agent?',
          targetEffect: 'Modifies nonexistent character.',
          status: 'awaiting_confirmation' as const,
          followUps: [],
          resolutionProposal: {
            resolution: 'Agent goes rogue.',
            targetEffect: 'Modifies nonexistent character.',
            draftPatch: {
              operations: [
                {
                  target: 'cast_personality' as const,
                  castMemberId: 'nonexistent-cast-id',
                  text: 'Rogue personality.',
                },
              ],
            },
          },
        },
      ],
      status: 'completed' as const,
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const initialRevision = getForgeState().draftRevision;
    const initialPremise = getForgeState().forgeDraft?.premise;

    const commitResult = forgeActions.acceptUnknownResolution(
      'analysis-rollback-test',
      'unk-cast-invalid'
    );

    expect(commitResult.success).toBe(false);
    if (!commitResult.success) {
      expect(commitResult.error).toContain('nonexistent-cast-id');
    }

    const state = getForgeState();
    expect(state.sourceAnalyses['analysis-rollback-test']).toBeDefined();
    const unk = state.sourceAnalyses['analysis-rollback-test'].unknowns[0];

    // Status remains awaiting_confirmation
    expect(unk.status).toBe('awaiting_confirmation');
    expect(unk.lastError).toContain('nonexistent-cast-id');

    // Draft unchanged
    expect(state.draftRevision).toBe(initialRevision);
    expect(state.forgeDraft?.premise).toBe(initialPremise);
    expect(state.forgeDraft?.ambiguities || []).toHaveLength(0);
  });
});

