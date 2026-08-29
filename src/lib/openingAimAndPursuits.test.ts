import { describe, expect, it } from 'vitest';
import {
  buildSourceAnalysisFromBlueprint,
  applyCandidateToDraft,
  getCandidateApplicationPriority,
  validateAndNormalizeDocumentAnalysis,
  resolveSourceEvidenceProvenance,
} from './sourceBaseline';
import { validateForgeDraft, compileForgeDraft } from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import { selectCastActivityEligibility } from './castActivityEligibility';
import { createInitialFictionalTimeLedger } from './fictionalTime';
import { ForgeDraft, ForgeSourceCandidate, ForgeSourceRecord } from '../types/forge';
import { Blueprint, BlueprintSchema } from '../types';
import { useForgeStore, forgeActions } from '../store/useForgeStore';

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
    topology: {
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
    },
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
        'char-elena': 'REVIEWED_NONE',
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
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-elena': 'REVIEWED',
        },
        valueAnchors: [],
        characterPursuits: [
          {
            id: 'pursuit-elena',
            castMemberId: 'char-elena',
            objective: 'Investigate the acoustic anomalies in the lower trench.',
            presentApproach: 'Listening to hydrophone telemetry',
            status: 'ACTIVE',
            reviewWindow: 'SCENE_BEAT',
            triggerReferences: [],
            basisSummary: 'Mission objective',
            provenance: {
              kind: 'REVIEWED_SOURCE',
              sourceId: 'src-1',
              evidenceIds: ['ev-1'],
            },
          },
        ],
      },
      depictionContract: {
        dramaticRegister: 'Deep dread',
        directness: 'High directness',
        aftermath: 'Severe aftermath',
        ambiguityHandling: 'Uncertain boundaries',
        specialBoundaries: '',
      },
    });

    const analysis = buildSourceAnalysisFromBlueprint(rawBp, 'delta_manifest.json');
    const pursuitCand = analysis.candidates.find((c) => c.target === 'character_pursuit');
    expect(pursuitCand).toBeDefined();
    expect(pursuitCand?.targetCastMemberId).toBe('char-elena');
    expect(pursuitCand?.evidenceIds.length).toBeGreaterThan(0);
    expect(analysis.evidence.some((e) => pursuitCand?.evidenceIds.includes(e.id))).toBe(true);

    // Perspective-neutral: no user_opening_aim_default candidate is emitted
    const aimCand = analysis.candidates.find((c) => c.target === 'user_opening_aim_default');
    expect(aimCand).toBeUndefined();
  });

  it('2. unreviewed cast opening objectives fail validation and block export', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'UNREVIEWED';

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveProperty('horrorGrammar.pursuitReviews.char-elena');
    expect(validation.errors['horrorGrammar.pursuitReviews.char-elena'][0]).toContain('Opening objective review is required');
  });

  it('3. legacy user aim candidate application is safely ignored to preserve perspective neutrality', () => {
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
        aimText: 'Investigate the acoustic anomalies in the lower trench.',
      },
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const applyRes = applyCandidateToDraft(draft, candidate, 'mission_briefing.json');
    expect(applyRes.success).toBe(true);
    if (!applyRes.success) return;

    // Legacy target is ignored - userOpeningAim remains undefined
    expect(applyRes.draft.userOpeningAim).toBeUndefined();
  });

  it('4. custom replacement creates creator-defined provenance and removes false source attribution', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'REVIEWED';
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'p-elena-1',
        castMemberId: 'char-elena',
        objective: 'Secure personal research logs before the bulkhead collapses.',
        presentApproach: 'Searching terminals',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Authored',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(true);
  });

  it('5. None declared is valid, explicit, and produces no fallback aim', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'REVIEWED_NONE';

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
    expect(engineContext.player.openingAimDisposition).toBe('NONE_DECLARED');
  });

  it('6. Engine context receives matching character opening objective as read-only context with sovereignty clause', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'REVIEWED';
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'p-elena-1',
        castMemberId: 'char-elena',
        objective: 'Restore backup power generator.',
        presentApproach: 'Connecting bypass conduit',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Authored objective',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];

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

  it('7. player opening aim never produces a CharacterPursuit or activity opportunity for player in simulation', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'REVIEWED';
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'p-elena-1',
        castMemberId: 'char-elena',
        objective: 'Restore backup power generator.',
        presentApproach: 'Connecting bypass conduit',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Authored objective',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];

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

  it('8. binding another playable character does not inherit the first character opening objective', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-elena'] = 'REVIEWED';
    draft.horrorGrammar!.pursuitReviews['char-kane'] = 'REVIEWED_NONE';
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'p-elena-1',
        castMemberId: 'char-elena',
        objective: 'Investigate lower trench.',
        presentApproach: 'Checking telemetry',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Authored',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    // When player chooses Kane at Engine setup, Kane has no opening objective and does NOT inherit Elena's
    const engineContext = buildEngineTurnContext({
      blueprint: compiled.blueprint,
      selectedCharacterId: 'char-kane',
      runtimeState: {
        currentNodeId: 'CARGO_BAY',
      },
    });

    expect(engineContext.player.openingAim).toBeUndefined();
    expect(engineContext.player.openingAimDisposition).toBe('NONE_DECLARED');
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

  it('14. character pursuits cannot reference unknown cast member IDs', () => {
    const draft = createBaseDraft();

    // Attempting to assign unknown cast member an HG1 pursuit
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'pursuit-ghost-illegal',
        castMemberId: 'char-nonexistent-ghost',
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

    const validation = validateForgeDraft(draft);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveProperty('horrorGrammar.characterPursuits[0].castMemberId');
  });

  it('15. candidate application priority strictly orders dependencies', () => {
    expect(getCandidateApplicationPriority('cast_seed')).toBe(1);
    expect(getCandidateApplicationPriority('topology_node')).toBe(1);
    expect(getCandidateApplicationPriority('topology_connection')).toBe(2);
    expect(getCandidateApplicationPriority('expandable_space_anchor')).toBe(2);
    expect(getCandidateApplicationPriority('cast_opening_placement')).toBe(3);
    expect(getCandidateApplicationPriority('value_anchor')).toBe(4);
    expect(getCandidateApplicationPriority('character_pursuit')).toBe(4);
    expect(getCandidateApplicationPriority('depiction_contract')).toBe(5);
  });

  it('16. document extraction payload attempting ACCEPTED_REFERENCE is normalized to proposal-only', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-extract-test',
      fileName: 'manifest.txt',
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
    };

    const rawExtractionPayload = {
      summary: 'Deep sea salvage record',
      evidence: [
        {
          id: 'ev-aim-1',
          category: 'identity',
          claim: 'Elena is ordered to seal the bulkhead.',
          excerpt: 'Seal the bulkhead immediately.',
        },
        {
          id: 'ev-dep',
          category: 'other',
          claim: 'Depiction parameters',
        },
      ],
      candidates: [
        {
          id: 'cand-dep',
          classification: 'evidence',
          target: 'depiction_contract',
          label: 'Depiction Contract',
          explanation: 'Depiction contract',
          evidenceIds: ['ev-dep'],
          proposedValue: {
            dramaticRegister: 'Deep sea dread',
            directness: 'High directness',
            aftermath: 'Severe trauma',
            ambiguityHandling: 'High uncertainty',
          },
        },
        {
          id: 'cand-aim-untrusted',
          classification: 'evidence',
          target: 'character_pursuit',
          label: 'Aim Proposal',
          explanation: 'Extracted order',
          evidenceIds: ['ev-aim-1'],
          targetCastMemberId: 'char-elena',
          proposedValue: {
            id: 'pursuit-elena',
            castMemberId: 'char-elena',
            objective: 'Seal the bulkhead immediately.',
            presentApproach: 'Running to the manual seal valve.',
            status: 'ACTIVE',
            reviewWindow: 'SCENE_BEAT',
            triggerReferences: [],
            basisSummary: 'Duty order',
            provenance: {
              kind: 'UNTRUSTED_MODEL_AUTHOR',
              sourceId: 'model-fake-source',
              evidenceIds: ['ev-aim-1'],
            },
          },
        },
      ],
      unknowns: [],
    };

    const analysis = validateAndNormalizeDocumentAnalysis(rawExtractionPayload, sourceRecord);
    expect(analysis.status).toBe('completed');
    const pursuitCand = analysis.candidates.find((c) => c.target === 'character_pursuit');
    expect(pursuitCand).toBeDefined();
    expect(pursuitCand?.sourceId).toBe('src-extract-test'); // Server-owned source ID enforced
    const val = pursuitCand?.proposedValue as Record<string, unknown>;
    expect(val.provenance).toEqual({
      kind: 'REVIEWED_SOURCE',
      sourceId: 'src-extract-test',
      evidenceIds: ['ev-aim-1'],
    }); // Model-attempted untrusted provenance normalized to authoritative server provenance
  });

  it('17. fake, placeholder, or cross-source provenance on topology fails export readiness and compilation', () => {
    const draft = createBaseDraft();
    draft.topology.nodeDefinitions = [
      {
        id: 'AIRLOCK_ALPHA',
        label: 'Airlock Alpha',
        description: 'Pressurized entry vestibule.',
        sourceId: 'src-registered-1',
        evidenceIds: ['placeholder-1'],
      },
    ];

    const readiness = validateForgeExportReadiness({ draft });
    expect(readiness.valid).toBe(false);
    expect(readiness.errors).toHaveProperty('topology.nodeDefinitions[0].provenance');
  });

  it('18. changed proposal text fails provenance resolution against accepted aim', () => {
    const provRes = resolveSourceEvidenceProvenance({
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-test',
        evidenceIds: ['ev-1'],
      },
      sourceAnalyses: {
        'src-test': {
          id: 'src-test',
          sourceRecord: { id: 'src-test', fileName: 'test.txt', mimeType: 'text/plain', kind: 'document', receivedAt: Date.now() },
          summary: 'Summary',
          evidence: [{ id: 'ev-1', sourceId: 'src-test', category: 'identity', claim: 'Claim' }],
          candidates: [
            {
              id: 'c-1',
              sourceId: 'src-test',
              classification: 'evidence',
              target: 'user_opening_aim_default',
              label: 'Aim',
              explanation: 'Exp',
              evidenceIds: ['ev-1'],
              targetCastMemberId: 'char-elena',
              proposedValue: { castMemberId: 'char-elena', aimText: 'Original proposal text.' },
              reviewDecision: 'accepted',
              applicationState: 'applied',
            },
          ],
          unknowns: [],
          status: 'completed',
        },
      },
      expectedText: 'Tampered different text that does not match proposal',
      expectedCastMemberId: 'char-elena',
    });

    expect(provRes.valid).toBe(false);
    expect(provRes.errors[0]).toContain('does not match candidate proposal text');
  });

  it('19. buildEngineTurnContext sets openingAimDisposition and sovereignty instruction for NONE_DECLARED', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
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

    expect(engineContext.player.openingAimDisposition).toBe('NONE_DECLARED');
    expect(engineContext.player.openingAim).toBeUndefined();
    expect(engineContext.player.sovereigntyInstruction).toContain('never infer, fabricate, or supply');
  });

  it('20. setPursuitReview updates character opening objective and marks review status REVIEWED', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar = {
      valueBaselineReview: 'REVIEWED_NONE',
      pursuitReviews: {
        'char-elena': 'REVIEWED_NONE',
        'char-kane': 'REVIEWED',
        'char-cook': 'REVIEWED_NONE',
      },
      valueAnchors: [],
      characterPursuits: [
        {
          id: 'pursuit-kane',
          castMemberId: 'char-kane',
          objective: 'Guard reactor',
          presentApproach: 'Standing watch',
          status: 'ACTIVE',
          reviewWindow: 'SCENE_BEAT',
          triggerReferences: [],
          basisSummary: 'Duty',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
    };

    useForgeStore.setState({
      forgeDraft: draft,
      draftRevision: 1,
      sourceAnalyses: {},
    });

    const res = forgeActions.setPursuitReview('char-kane', 'REVIEWED', {
      objective: 'Seal the pressure hatch',
      presentApproach: 'Rotating manual bypass wheel',
    });
    expect(res.success).toBe(true);

    const updated = useForgeStore.getState().forgeDraft;
    expect(updated?.horrorGrammar?.pursuitReviews['char-kane']).toBe('REVIEWED');
    const kanePursuits = updated?.horrorGrammar?.characterPursuits.filter((p) => p.castMemberId === 'char-kane') || [];
    expect(kanePursuits).toHaveLength(1);
    expect(kanePursuits[0].objective).toBe('Seal the pressure hatch');
  });

  it('21. setPursuitReview with REVIEWED_NONE clears active character objectives', () => {
    const draft = createBaseDraft();
    draft.horrorGrammar!.characterPursuits = [
      {
        id: 'p-kane',
        castMemberId: 'char-kane',
        objective: 'Patrol',
        presentApproach: 'Walking',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Manual',
        provenance: { kind: 'CREATOR_DEFINED' },
      },
    ];
    draft.horrorGrammar!.pursuitReviews['char-kane'] = 'REVIEWED';

    useForgeStore.setState({
      forgeDraft: draft,
      draftRevision: 1,
    });

    const res = forgeActions.setPursuitReview('char-kane', 'REVIEWED_NONE');
    expect(res.success).toBe(true);

    const updated = useForgeStore.getState().forgeDraft;
    expect(updated?.horrorGrammar?.pursuitReviews['char-kane']).toBe('REVIEWED_NONE');
    expect(updated?.horrorGrammar?.characterPursuits.filter((p) => p.castMemberId === 'char-kane')).toHaveLength(0);
  });

  it('22. validateForgeDraft rejects cast member with AT_NODE placement referencing unknown node ID', () => {
    const draft = createBaseDraft();
    draft.cast = draft.cast?.map((c) =>
      c.id === 'char-elena'
        ? { ...c, presenceDisposition: { kind: 'AT_NODE' as const, nodeId: 'NON_EXISTENT_MED_BAY' } }
        : c
    );

    const valRes = validateForgeDraft(draft);
    expect(valRes.valid).toBe(false);
    expect(valRes.errors['cast[0].presenceDisposition'][0]).toContain('references unknown node ID');
  });

  it('23. validateForgeDraft rejects NONLOCAL placement for non-entity cast members', () => {
    const draft = createBaseDraft();
    draft.cast = draft.cast?.map((c) =>
      c.id === 'char-elena'
        ? { ...c, isEntity: false, presenceDisposition: { kind: 'NONLOCAL' as const } }
        : c
    );

    const valRes = validateForgeDraft(draft);
    expect(valRes.valid).toBe(false);
    expect(valRes.errors['cast[0].presenceDisposition'][0]).toContain('NONLOCAL placement is only permitted for Entity cast members');
  });

  it('24. rejected and staged opening-aim candidates cannot be accepted via provenance resolver', () => {
    const rejectedCandAnalysis = {
      id: 'src-rejected',
      sourceRecord: { id: 'src-rejected', fileName: 'rejected.txt', mimeType: 'text/plain', kind: 'document' as const, receivedAt: Date.now() },
      summary: 'Rejected aim test',
      evidence: [{ id: 'ev-1', sourceId: 'src-rejected', category: 'identity' as const, claim: 'Claim' }],
      candidates: [
        {
          id: 'cand-rej',
          sourceId: 'src-rejected',
          classification: 'evidence' as const,
          target: 'user_opening_aim_default' as const,
          label: 'Aim',
          explanation: 'Rejected',
          evidenceIds: ['ev-1'],
          targetCastMemberId: 'char-elena',
          proposedValue: { castMemberId: 'char-elena', aimText: 'Fix engine' },
          reviewDecision: 'rejected' as const,
          applicationState: 'staged' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    const res = resolveSourceEvidenceProvenance({
      provenance: { kind: 'REVIEWED_SOURCE', sourceId: 'src-rejected', evidenceIds: ['ev-1'] },
      sourceAnalyses: { 'src-rejected': rejectedCandAnalysis },
      expectedText: 'Fix engine',
      expectedCastMemberId: 'char-elena',
    });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('has not been accepted and applied');
  });

  it('25. readiness and compilation agree on reviewed-source validity matrix for topology node definitions', () => {
    const draft = createBaseDraft();
    draft.topology.nodeDefinitions = [
      {
        id: 'AIRLOCK_ALPHA',
        label: 'Airlock Alpha',
        description: 'Pressurized entry vestibule.',
        sourceId: 'src-exact',
        evidenceIds: ['ev-exact-1'],
      },
      {
        id: 'CARGO_BAY',
        label: 'Cargo Bay',
        description: 'Debris-strewn storage area.',
      },
      {
        id: 'REACTOR_CORE',
        label: 'Reactor Core',
        description: 'Sub-level containment zone.',
      },
    ];

    const exactAnalysis = {
      id: 'src-exact',
      sourceRecord: { id: 'src-exact', fileName: 'exact.txt', mimeType: 'text/plain', kind: 'document' as const, receivedAt: Date.now() },
      summary: 'Exact test',
      evidence: [{ id: 'ev-exact-1', sourceId: 'src-exact', category: 'topology' as const, claim: 'Airlock description' }],
      candidates: [],
      unknowns: [],
      status: 'completed' as const,
    };

    // Case 1: missing registry -> both fail
    const readFail1 = validateForgeExportReadiness({ draft, sourceAnalyses: null });
    const compFail1 = compileForgeDraft(draft, { sourceAnalyses: null });
    expect(readFail1.valid).toBe(false);
    expect(compFail1.success).toBe(false);
    expect(readFail1.errors['topology.nodeDefinitions[0].provenance']).toBeDefined();

    // Case 2: Exact registered analysis -> both pass
    const readPass = validateForgeExportReadiness({ draft, sourceAnalyses: { 'src-exact': exactAnalysis } });
    const compPass = compileForgeDraft(draft, { sourceAnalyses: { 'src-exact': exactAnalysis } });
    expect(readPass.valid).toBe(true);
    expect(compPass.success).toBe(true);
  });
});
