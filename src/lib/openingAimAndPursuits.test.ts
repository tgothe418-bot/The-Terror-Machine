import { describe, expect, it } from 'vitest';
import {
  buildSourceAnalysisFromBlueprint,
  applyCandidateToDraft,
  getCandidateApplicationPriority,
} from './sourceBaseline';
import { validateForgeDraft, compileForgeDraft } from './forgeCompiler';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import { selectCastActivityEligibility } from './castActivityEligibility';
import { createInitialFictionalTimeLedger } from './fictionalTime';
import { ForgeDraft, ForgeSourceCandidate } from '../types/forge';
import { Blueprint, BlueprintSchema } from '../types';

describe('Forge 1C-3: Opening Aims, Goals, and Pursuit Convergence', () => {
  const baseTopology = {
    startingNodeId: 'AIRLOCK_ALPHA',
    nodes: ['AIRLOCK_ALPHA', 'CARGO_BAY', 'REACTOR_CORE'],
    nodeDefinitions: [
      { id: 'AIRLOCK_ALPHA', label: 'Airlock Alpha', description: 'Pressurized entry vestibule.' },
      { id: 'CARGO_BAY', label: 'Cargo Bay', description: 'Debris-strewn storage area.' },
      { id: 'REACTOR_CORE', label: 'Reactor Core', description: 'Sub-level containment zone.' },
    ],
    connections: [
      { from: 'AIRLOCK_ALPHA', to: 'CARGO_BAY', kind: 'PHYSICAL' as const, userInitiated: true },
      { from: 'CARGO_BAY', to: 'REACTOR_CORE', kind: 'PHYSICAL' as const, userInitiated: true },
    ],
    anchors: [],
  };

  const createBaseDraft = (): ForgeDraft => ({
    id: 'draft-aim-test',
    title: 'Outpost Deep Delta',
    premise: 'Isolated deep-sea containment station suffering structural failure.',
    globalPremise: 'Isolated deep-sea containment station suffering structural failure.',
    identity: {
      title: 'Outpost Deep Delta',
      version: '1.0',
      author: 'Submersible Ops',
      thematicAnchor: 'Hydrostatic pressure and isolation',
    },
    setting: {
      location: 'Sub-Trench Habitation Node',
      atmosphere: 'Hum of pumps, condensation dripping down bulkheads',
      timePeriod: '2091',
    },
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    environmentalRules: 'Hull stress increases when external vents seal.',
    constraints: ['No unpressurized eva'],
    contentScale: 3,
    contentLevelDescription: 'Psychological Tension',
    depictionContract: {
      dramaticRegister: 'Submersible Realism',
      directness: 'Measured technical directness',
      aftermath: 'System degradation persists',
      ambiguityHandling: 'Unexplained sonar echoes remain unexplained',
      specialBoundaries: 'None',
    },
    topology: baseTopology,
    cast: [
      {
        id: 'char-elena',
        name: 'Elena Rostova',
        role: 'PROTAGONIST',
        description: 'Lead oceanographer monitoring trench anomalies.',
        isUserCharacter: true,
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'AIRLOCK_ALPHA' },
      },
      {
        id: 'char-kane',
        name: 'Chief Kane',
        role: 'SENTINEL',
        description: 'Station security officer securing flood barriers.',
        isUserCharacter: false,
        goals: 'Maintain station integrity at all costs.',
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'CARGO_BAY' },
      },
      {
        id: 'char-cook',
        name: 'Quartermaster Novak',
        role: 'OBSERVER',
        description: 'Distracted commissary officer taking inventory.',
        isUserCharacter: false,
        presenceDisposition: { kind: 'OFFSTAGE' },
      },
    ],
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED_NONE',
      pursuitReviews: {
        'char-kane': 'REVIEWED_NONE',
        'char-cook': 'REVIEWED_NONE',
      },
      valueAnchors: [],
      characterPursuits: [],
    },
  });

  it('1. reference extraction proposes a player opening aim candidate with evidence citation', () => {
    const rawBp: Blueprint = BlueprintSchema.parse({
      id: 'bp-deep-delta',
      identity: { title: 'Deep Delta', version: '1.0', author: 'Author', thematicAnchor: 'Tension' },
      title: 'Deep Delta',
      premise: 'Deep sea disaster.',
      topology: baseTopology,
      cast: [
        {
          id: 'char-elena',
          name: 'Elena Rostova',
          role: 'PROTAGONIST',
          description: 'Lead oceanographer.',
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'AIRLOCK_ALPHA' },
        },
      ],
      userOpeningAim: {
        castMemberId: 'char-elena',
        disposition: 'ACCEPTED_REFERENCE',
        aimText: 'Investigate the acoustic anomalies in the lower trench.',
        provenance: {
          kind: 'REVIEWED_SOURCE',
          sourceId: 'src-1',
          evidenceIds: ['ev-1'],
        },
      },
    });

    const analysis = buildSourceAnalysisFromBlueprint(rawBp, 'delta_manifest.json');
    const aimCand = analysis.candidates.find((c) => c.target === 'user_opening_aim_default');
    expect(aimCand).toBeDefined();
    expect(aimCand?.targetCastMemberId).toBe('char-elena');
    expect(aimCand?.evidenceIds.length).toBeGreaterThan(0);
    expect(analysis.evidence.some((e) => aimCand?.evidenceIds.includes(e.id))).toBe(true);
  });

  it('2. extraction alone leaves the user opening aim unreviewed in draft validation and blocks export', () => {
    const draft = createBaseDraft();
    // User character exists, but userOpeningAim is unreviewed
    draft.userOpeningAim = undefined;

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveProperty('userOpeningAim');
    expect(validation.errors['userOpeningAim'][0]).toContain('review disposition is required');

    // Also unreviewed disposition explicitly blocks
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'UNREVIEWED',
      aimText: 'Unreviewed text',
    };
    const validation2 = validateForgeDraft(draft);
    expect(validation2.valid).toBe(false);
    expect(validation2.errors).toHaveProperty('userOpeningAim');
  });

  it('3. explicit Accept creates a reviewed source-grounded baseline with valid provenance', () => {
    const draft = createBaseDraft();
    const candidate: ForgeSourceCandidate = {
      id: 'cand-aim-1',
      sourceId: 'src-delta',
      classification: 'evidence',
      target: 'user_opening_aim_default',
      label: 'Opening Aim: Investigate acoustic anomalies',
      explanation: 'Extracted from mission briefing.',
      evidenceIds: ['ev-briefing-1'],
      targetCastMemberId: 'char-elena',
      proposedValue: {
        castMemberId: 'char-elena',
        disposition: 'ACCEPTED_REFERENCE',
        aimText: 'Investigate the acoustic anomalies in the lower trench.',
        provenance: {
          kind: 'REVIEWED_SOURCE',
          sourceId: 'src-delta',
          evidenceIds: ['ev-briefing-1'],
        },
      },
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const applyRes = applyCandidateToDraft(draft, candidate, 'mission_briefing.json');
    expect(applyRes.success).toBe(true);
    if (!applyRes.success) return;

    expect(applyRes.draft.userOpeningAim).toBeDefined();
    expect(applyRes.draft.userOpeningAim?.disposition).toBe('ACCEPTED_REFERENCE');
    expect(applyRes.draft.userOpeningAim?.aimText).toBe(
      'Investigate the acoustic anomalies in the lower trench.'
    );
    expect(applyRes.draft.userOpeningAim?.provenance?.kind).toBe('REVIEWED_SOURCE');

    const compileRes = compileForgeDraft(applyRes.draft);
    expect(compileRes.success).toBe(true);
  });

  it('4. custom replacement creates creator-defined provenance and removes false source attribution', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'CREATOR_OVERRIDE',
      aimText: 'Secure personal research logs before the bulkhead collapses.',
      provenance: { kind: 'CREATOR_DEFINED' },
      reviewedAt: Date.now(),
    };

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(true);

    // If a creator override retained false source attribution, compiler rejects
    draft.userOpeningAim.provenance = {
      kind: 'REVIEWED_SOURCE',
      sourceId: 'src-fake',
      evidenceIds: ['ev-fake'],
    };
    const invalidValidation = validateForgeDraft(draft);
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.errors).toHaveProperty('userOpeningAim.provenance');
    expect(invalidValidation.errors['userOpeningAim.provenance'][0]).toContain(
      'must not retain false source-evidence attribution'
    );
  });

  it('5. None declared is valid, explicit, and produces no fallback aim', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(true);

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    const engineContext = buildEngineTurnContext({
      blueprint: compiled.blueprint,
      characterId: 'char-elena',
      runtimeState: {
        currentNodeId: 'AIRLOCK_ALPHA',
      },
    });

    expect(engineContext.player.openingAim).toBeUndefined();
  });

  it('6. Engine context receives matching accepted aim as read-only context with sovereignty clause', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'ACCEPTED_REFERENCE',
      aimText: 'Restore backup power generator.',
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-delta',
        evidenceIds: ['ev-1'],
      },
      reviewedAt: Date.now(),
    };

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    const engineContext = buildEngineTurnContext({
      blueprint: compiled.blueprint,
      characterId: 'char-elena',
      runtimeState: {
        currentNodeId: 'AIRLOCK_ALPHA',
      },
    });

    expect(engineContext.player.openingAim).toBe('Restore backup power generator.');
    expect(engineContext.player.sovereigntyInstruction).toContain('sovereignty');
  });

  it('7. player opening aim never produces a CharacterPursuit or activity opportunity', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'ACCEPTED_REFERENCE',
      aimText: 'Restore backup power generator.',
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-delta',
        evidenceIds: ['ev-1'],
      },
      reviewedAt: Date.now(),
    };

    const compiled = compileForgeDraft(draft);
    if (!compiled.success) return;

    const fictionalTime = createInitialFictionalTimeLedger();
    const eligibility = selectCastActivityEligibility({
      blueprint: compiled.blueprint,
      currentTopologyNode: 'AIRLOCK_ALPHA',
      fictionalTime,
      pursuitSchedule: {},
      characterPursuitLedger: {},
      userCharacterId: 'char-elena',
      turnNumber: 1,
    });

    expect(eligibility.presentOpportunities.some((o) => o.castMemberId === 'char-elena')).toBe(false);
    expect(eligibility.offscreenOpportunities.some((o) => o.castMemberId === 'char-elena')).toBe(false);
  });

  it('8. binding another playable character does not inherit the first character opening aim', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'ACCEPTED_REFERENCE',
      aimText: 'Investigate lower trench.',
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-delta',
        evidenceIds: ['ev-1'],
      },
      reviewedAt: Date.now(),
    };

    const compiled = compileForgeDraft(draft);
    if (!compiled.success) return;

    // Binding to Kane instead of Elena at Engine setup time
    const contextKane = buildEngineTurnContext({
      blueprint: compiled.blueprint,
      selectedCharacterId: 'char-kane',
      runtimeState: {
        currentNodeId: 'CARGO_BAY',
      },
    });

    expect(contextKane.player.characterId).toBe('char-kane');
    expect(contextKane.player.openingAim).toBeUndefined();
  });

  it('9. director/witness participation receives no fabricated aim', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'ACCEPTED_REFERENCE',
      aimText: 'Investigate lower trench.',
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-delta',
        evidenceIds: ['ev-1'],
      },
      reviewedAt: Date.now(),
    };

    const compiled = compileForgeDraft(draft);
    if (!compiled.success) return;

    const contextDirector = buildEngineTurnContext({
      blueprint: compiled.blueprint,
      selectedRole: 'director',
      runtimeState: {
        currentNodeId: 'AIRLOCK_ALPHA',
      },
    });

    expect(contextDirector.player.role).toBe('director');
    expect(contextDirector.player.openingAim).toBeUndefined();
  });

  it('10. source-grounded NPC objective and present approach compile to existing HG1 baseline and initial ledger', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };

    draft.horrorGrammar!.pursuitReviews['char-kane'] = 'REVIEWED';
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'pursuit-kane-1',
        castMemberId: 'char-kane',
        objective: 'Weld emergency pressure seal on bulkhead B.',
        presentApproach: 'Using pneumatic torch in Cargo Bay.',
        locationNodeId: 'CARGO_BAY',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Extracted from security logs.',
        provenance: {
          kind: 'REVIEWED_SOURCE',
          sourceId: 'src-delta',
          evidenceIds: ['ev-1'],
        },
      },
    ];

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    expect(compiled.blueprint.horrorGrammar?.characterPursuits).toHaveLength(1);
    expect(compiled.blueprint.horrorGrammar?.characterPursuits[0].objective).toBe(
      'Weld emergency pressure seal on bulkhead B.'
    );
  });

  it('11. No readable intent maps to REVIEWED_NONE, contains no pursuit, and does not block export', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };

    draft.horrorGrammar!.pursuitReviews['char-kane'] = 'REVIEWED_NONE';
    draft.horrorGrammar!.pursuitReviews['char-cook'] = 'REVIEWED_NONE';
    draft.horrorGrammar!.characterPursuits = [];

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
  });

  it('12. cast.goals alone does not authorize independent HG1 initiative without reviewed pursuit', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };
    // Kane has descriptive goals in cast, but pursuitReviews is REVIEWED_NONE
    draft.cast![1].goals = 'Lock down station sectors.';
    draft.horrorGrammar!.pursuitReviews['char-kane'] = 'REVIEWED_NONE';
    draft.horrorGrammar!.characterPursuits = [];

    const compiled = compileForgeDraft(draft);
    if (!compiled.success) return;

    const fictionalTime = createInitialFictionalTimeLedger();
    const eligibility = selectCastActivityEligibility({
      blueprint: compiled.blueprint,
      currentTopologyNode: 'CARGO_BAY',
      fictionalTime,
      pursuitSchedule: {},
      characterPursuitLedger: {},
      userCharacterId: 'char-elena',
      turnNumber: 1,
    });

    const kaneOpp = eligibility.presentOpportunities.find((o) => o.castMemberId === 'char-kane');
    expect(kaneOpp).toBeDefined();
    // Proves descriptive cast.goals was NOT transformed into an active pursuit or objective
    expect(kaneOpp?.pursuitId).toBeNull();
    expect(kaneOpp?.objective).toBeNull();
    expect(kaneOpp?.presentApproach).toBeNull();
    expect(eligibility.offscreenOpportunities.some((o) => o.castMemberId === 'char-kane')).toBe(false);
  });

  it('13. pursuit placement references must agree with accepted topology nodes', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };

    draft.horrorGrammar!.pursuitReviews['char-kane'] = 'REVIEWED';
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'pursuit-kane-1',
        castMemberId: 'char-kane',
        objective: 'Patrol sectors',
        presentApproach: 'Moving cautiously',
        locationNodeId: 'NON_EXISTENT_NODE_999',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Authored',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveProperty('horrorGrammar.characterPursuits[0].locationNodeId');
    expect(
      validation.errors['horrorGrammar.characterPursuits[0].locationNodeId'][0]
    ).toContain('unknown topology node ID');
  });

  it('14. user character cannot appear in HG1 character pursuits or pursuit reviews', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };

    // Attempting to assign Elena an HG1 pursuit
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'pursuit-elena-illegal',
        castMemberId: 'char-elena',
        objective: 'Illegal machine goal',
        presentApproach: 'Forced action',
        locationNodeId: 'AIRLOCK_ALPHA',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Illegal',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'REVIEWED';

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveProperty('horrorGrammar.pursuitReviews.char-elena');
    expect(validation.errors).toHaveProperty('horrorGrammar.characterPursuits[0].castMemberId');
  });

  it('15. candidate application priority strictly orders dependencies', () => {
    expect(getCandidateApplicationPriority('cast_seed')).toBe(1);
    expect(getCandidateApplicationPriority('topology_node')).toBe(1);
    expect(getCandidateApplicationPriority('topology_connection')).toBe(2);
    expect(getCandidateApplicationPriority('expandable_space_anchor')).toBe(2);
    expect(getCandidateApplicationPriority('starting_node_selection')).toBe(3);
    expect(getCandidateApplicationPriority('cast_opening_placement')).toBe(3);
    expect(getCandidateApplicationPriority('value_anchor')).toBe(4);
    expect(getCandidateApplicationPriority('character_pursuit')).toBe(4);
    expect(getCandidateApplicationPriority('user_opening_aim_default')).toBe(4);
  });
});
