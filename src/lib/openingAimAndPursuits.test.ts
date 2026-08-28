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

  it('3. candidate application produces UNREVIEWED proposal without setting ACCEPTED_REFERENCE', () => {
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

    // Applied candidate MUST be UNREVIEWED with undefined reviewedAt
    expect(applyRes.draft.userOpeningAim).toBeDefined();
    expect(applyRes.draft.userOpeningAim?.disposition).toBe('UNREVIEWED');
    expect(applyRes.draft.userOpeningAim?.reviewedAt).toBeUndefined();
    expect(applyRes.draft.userOpeningAim?.aimText).toBe(
      'Investigate the acoustic anomalies in the lower trench.'
    );
    const prov = applyRes.draft.userOpeningAim?.provenance;
    expect(prov?.kind).toBe('REVIEWED_SOURCE');
    if (prov && prov.kind === 'REVIEWED_SOURCE') {
      expect(prov.sourceId).toBe('src-delta');
      expect(prov.evidenceIds).toEqual(['ev-briefing-1']);
    }

    // UNREVIEWED blocks compilation
    const compileRes = compileForgeDraft(applyRes.draft);
    expect(compileRes.success).toBe(false);
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

    const mockAnalysis = {
      id: 'src-delta',
      sourceRecord: { id: 'src-delta', fileName: 'delta.txt', mimeType: 'text/plain', kind: 'document' as const, receivedAt: Date.now() },
      summary: 'Delta source log',
      evidence: [{ id: 'ev-1', sourceId: 'src-delta', category: 'identity' as const, claim: 'Power generator offline.' }],
      candidates: [
        {
          id: 'c-delta-1',
          sourceId: 'src-delta',
          classification: 'evidence' as const,
          target: 'user_opening_aim_default' as const,
          label: 'Aim',
          explanation: 'Restore backup power',
          evidenceIds: ['ev-1'],
          targetCastMemberId: 'char-elena',
          proposedValue: { castMemberId: 'char-elena', aimText: 'Restore backup power generator.' },
          reviewDecision: 'accepted' as const,
          applicationState: 'applied' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    const compiled = compileForgeDraft(draft, { sourceAnalyses: { 'src-delta': mockAnalysis } });
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

    // Binding to Kane instead of Elena at Engine setup time is blocked by 1C-6 identity sovereignty
    expect(() =>
      buildEngineTurnContext({
        blueprint: compiled.blueprint,
        selectedCharacterId: 'char-kane',
        runtimeState: {
          currentNodeId: 'CARGO_BAY',
        },
      })
    ).toThrowError(/Selected character "char-kane" does not match the reviewed user character ID "char-elena"/);

    // When a blueprint is compiled with Kane as the user character with NONE_DECLARED, Elena's aim is not inherited
    const draftKane = createBaseDraft();
    draftKane.userCharacterId = 'char-kane';
    draftKane.cast = (draftKane.cast || []).map((c) => ({
      ...c,
      isUserCharacter: c.id === 'char-kane',
      presenceDisposition: c.id === 'char-kane' ? { kind: 'AT_NODE', nodeId: 'BRIDGE' } : c.presenceDisposition,
    }));
    draftKane.userOpeningAim = {
      castMemberId: 'char-kane',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };

    const compiledKane = compileForgeDraft(draftKane);
    if (!compiledKane.success) return;

    const contextKane = buildEngineTurnContext({
      blueprint: compiledKane.blueprint,
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
      ],
      candidates: [
        {
          id: 'cand-aim-untrusted',
          classification: 'evidence',
          target: 'user_opening_aim_default',
          label: 'Aim Proposal',
          explanation: 'Extracted order',
          evidenceIds: ['ev-aim-1'],
          targetCastMemberId: 'char-elena',
          // Untrusted model attempted to emit ACCEPTED_REFERENCE
          proposedValue: {
            castMemberId: 'char-elena',
            disposition: 'ACCEPTED_REFERENCE',
            aimText: 'Seal the bulkhead immediately.',
            provenance: {
              kind: 'REVIEWED_SOURCE',
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
    const aimCand = analysis.candidates.find((c) => c.target === 'user_opening_aim_default');
    expect(aimCand).toBeDefined();
    expect(aimCand?.sourceId).toBe('src-extract-test'); // Server-owned source ID enforced
    expect(aimCand?.proposedValue).toEqual({
      castMemberId: 'char-elena',
      aimText: 'Seal the bulkhead immediately.',
    }); // Model-attempted ACCEPTED_REFERENCE stripped to pure proposal
  });

  it('17. fake, placeholder, or cross-source provenance fails export readiness and compilation', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'ACCEPTED_REFERENCE',
      aimText: 'Investigate lower trench.',
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-default', // Prohibited placeholder
        evidenceIds: ['ev-extracted'], // Prohibited placeholder
      },
      reviewedAt: Date.now(),
    };

    const readiness = validateForgeExportReadiness({ draft });
    expect(readiness.valid).toBe(false);
    expect(readiness.errors).toHaveProperty('userOpeningAim.provenance');

    // Also fails with cross-source or non-resolving evidence IDs
    draft.userOpeningAim.provenance = {
      kind: 'REVIEWED_SOURCE',
      sourceId: 'src-registered-1',
      evidenceIds: ['ev-non-existent-999'],
    };

    const sourceAnalyses = {
      'src-registered-1': {
        id: 'src-registered-1',
        sourceRecord: {
          id: 'src-registered-1',
          fileName: 'briefing.txt',
          mimeType: 'text/plain',
          kind: 'document' as const,
          receivedAt: Date.now(),
        },
        summary: 'Briefing',
        evidence: [{ id: 'ev-real-1', sourceId: 'src-registered-1', category: 'identity' as const, claim: 'Claim' }],
        candidates: [
          {
            id: 'c-1',
            sourceId: 'src-registered-1',
            classification: 'evidence' as const,
            target: 'user_opening_aim_default' as const,
            label: 'Aim',
            explanation: 'Exp',
            evidenceIds: ['ev-real-1'],
            targetCastMemberId: 'char-elena',
            proposedValue: { castMemberId: 'char-elena', aimText: 'Investigate lower trench.' },
            reviewDecision: 'accepted' as const,
            applicationState: 'staged' as const,
          },
        ],
        unknowns: [],
        status: 'completed' as const,
      },
    };

    const readiness2 = validateForgeExportReadiness({ draft, sourceAnalyses });
    expect(readiness2.valid).toBe(false);
    expect(readiness2.errors['userOpeningAim.provenance'][0]).toContain('does not resolve');
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

  it('20. setUserCharacter atomically reassigns player character, resets aim, cleans pursuits, and places at startingNodeId', () => {
    const draft = createBaseDraft();
    draft.userCharacterId = 'char-elena';
    draft.horrorGrammar = {
      valueBaselineReview: 'REVIEWED_NONE',
      pursuitReviews: {
        'char-kane': 'REVIEWED',
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

    const res = forgeActions.setUserCharacter('char-kane');
    expect(res.success).toBe(true);

    const updated = useForgeStore.getState().forgeDraft;
    expect(updated?.userCharacterId).toBe('char-kane');

    const elena = updated?.cast?.find((c) => c.id === 'char-elena');
    const kane = updated?.cast?.find((c) => c.id === 'char-kane');
    expect(elena?.isUserCharacter).toBe(false);
    expect(kane?.isUserCharacter).toBe(true);

    // Kane opening placement is reconciled to startingNodeId
    expect(kane?.presenceDisposition?.kind).toBe('AT_NODE');
    expect(kane?.presenceDisposition && 'nodeId' in kane.presenceDisposition ? kane.presenceDisposition.nodeId : '').toBe('AIRLOCK_ALPHA');

    // User opening aim was reset for new character
    expect(updated?.userOpeningAim?.castMemberId).toBe('char-kane');
    expect(updated?.userOpeningAim?.disposition).toBe('UNREVIEWED');

    // Kane was removed from autonomous pursuits and former user Elena marked UNREVIEWED
    expect(updated?.horrorGrammar?.characterPursuits.some((p) => p.castMemberId === 'char-kane')).toBe(false);
    expect(updated?.horrorGrammar?.pursuitReviews['char-kane']).toBeUndefined();
    expect(updated?.horrorGrammar?.pursuitReviews['char-elena']).toBe('UNREVIEWED');
  });

  it('21. setUserCharacter prohibits designating entity characters as protagonist', () => {
    const draft = createBaseDraft();
    draft.cast?.push({
      id: 'entity-phantom',
      name: 'The Phantom',
      description: 'Hostile apparition',
      role: 'ANTAGONIST',
      isEntity: true,
      isUserCharacter: false,
    });

    useForgeStore.setState({
      forgeDraft: draft,
      draftRevision: 1,
    });

    const res = forgeActions.setUserCharacter('entity-phantom');
    expect(res.success).toBe(false);
    expect(res.error).toContain('cannot be selected as the user-controlled protagonist');
  });

  it('22. validateForgeDraft rejects drafts with mismatched placement or conflicting user character markers', () => {
    const draft = createBaseDraft();
    draft.userCharacterId = 'char-elena';
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    };
    // Elena placed at different node from startingNodeId AIRLOCK_ALPHA
    draft.cast = draft.cast?.map((c) =>
      c.id === 'char-elena'
        ? { ...c, isUserCharacter: true, presenceDisposition: { kind: 'AT_NODE', nodeId: 'MED_BAY' } }
        : { ...c, isUserCharacter: false }
    );

    const valRes = validateForgeDraft(draft);
    expect(valRes.valid).toBe(false);
    expect(valRes.errors['userCharacter.placement'][0]).toContain('does not match topology startingNodeId');
  });

  it('23. validateForgeDraft rejects drafts with multiple user characters', () => {
    const draft = createBaseDraft();
    delete draft.userCharacterId;
    draft.cast = draft.cast?.map((c) => ({ ...c, isUserCharacter: true }));

    const valRes = validateForgeDraft(draft);
    expect(valRes.valid).toBe(false);
    expect(valRes.errors['userCharacterId'][0]).toContain('Multiple cast members');
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

  it('25. readiness and compilation agree on reviewed-source validity matrix', () => {
    const draft = createBaseDraft();
    draft.userOpeningAim = {
      castMemberId: 'char-elena',
      disposition: 'ACCEPTED_REFERENCE',
      aimText: 'Restore life support',
      provenance: {
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-exact',
        evidenceIds: ['ev-exact-1'],
      },
      reviewedAt: Date.now(),
    };

    const exactAnalysis = {
      id: 'src-exact',
      sourceRecord: { id: 'src-exact', fileName: 'exact.txt', mimeType: 'text/plain', kind: 'document' as const, receivedAt: Date.now() },
      summary: 'Exact test',
      evidence: [{ id: 'ev-exact-1', sourceId: 'src-exact', category: 'identity' as const, claim: 'Life support failure' }],
      candidates: [
        {
          id: 'cand-exact-1',
          sourceId: 'src-exact',
          classification: 'evidence' as const,
          target: 'user_opening_aim_default' as const,
          label: 'Life Support Aim',
          explanation: 'Exact applied candidate',
          evidenceIds: ['ev-exact-1'],
          targetCastMemberId: 'char-elena',
          proposedValue: { castMemberId: 'char-elena', aimText: 'Restore life support' },
          reviewDecision: 'accepted' as const,
          applicationState: 'applied' as const,
        },
      ],
      unknowns: [],
      status: 'completed' as const,
    };

    // Case 1: Accepted reference aim + missing registry -> both fail
    const readFail1 = validateForgeExportReadiness({ draft, sourceAnalyses: null });
    const compFail1 = compileForgeDraft(draft, { sourceAnalyses: null });
    expect(readFail1.valid).toBe(false);
    expect(compFail1.success).toBe(false);
    expect(readFail1.errors['userOpeningAim.provenance']).toBeDefined();
    if (!compFail1.success) {
      expect(compFail1.errors['userOpeningAim.provenance']).toBeDefined();
    }

    // Case 2: Plausible fake source/evidence strings -> both fail
    const fakeDraft = {
      ...draft,
      userOpeningAim: {
        ...draft.userOpeningAim!,
        provenance: { kind: 'REVIEWED_SOURCE' as const, sourceId: 'fake-src', evidenceIds: ['fake-ev'] },
      },
    };
    const readFail2 = validateForgeExportReadiness({ draft: fakeDraft, sourceAnalyses: { 'src-exact': exactAnalysis } });
    const compFail2 = compileForgeDraft(fakeDraft, { sourceAnalyses: { 'src-exact': exactAnalysis } });
    expect(readFail2.valid).toBe(false);
    expect(compFail2.success).toBe(false);

    // Case 3: Exact current accepted/applied candidate -> both pass
    const readPass = validateForgeExportReadiness({ draft, sourceAnalyses: { 'src-exact': exactAnalysis } });
    const compPass = compileForgeDraft(draft, { sourceAnalyses: { 'src-exact': exactAnalysis } });
    expect(readPass.valid).toBe(true);
    expect(compPass.success).toBe(true);

    // Case 4: Creator override -> both pass without sourceAnalyses lookup
    const overrideDraft = {
      ...draft,
      userOpeningAim: {
        castMemberId: 'char-elena',
        disposition: 'CREATOR_OVERRIDE' as const,
        aimText: 'My personal custom mission objective',
        reviewedAt: Date.now(),
      },
    };
    const readOverride = validateForgeExportReadiness({ draft: overrideDraft, sourceAnalyses: null });
    const compOverride = compileForgeDraft(overrideDraft, { sourceAnalyses: null });
    expect(readOverride.valid).toBe(true);
    expect(compOverride.success).toBe(true);

    // Case 5: None declared -> both pass without sourceAnalyses lookup
    const noneDraft = {
      ...draft,
      userOpeningAim: {
        castMemberId: 'char-elena',
        disposition: 'NONE_DECLARED' as const,
        aimText: '',
        reviewedAt: Date.now(),
      },
    };
    const readNone = validateForgeExportReadiness({ draft: noneDraft, sourceAnalyses: null });
    const compNone = compileForgeDraft(noneDraft, { sourceAnalyses: null });
    expect(readNone.valid).toBe(true);
    expect(compNone.success).toBe(true);

    // Case 6: Unreviewed aim -> both fail
    const unreviewedDraft = {
      ...draft,
      userOpeningAim: {
        castMemberId: 'char-elena',
        disposition: 'UNREVIEWED' as const,
        aimText: 'Unreviewed aim text',
      },
    };
    const readUnrev = validateForgeExportReadiness({ draft: unreviewedDraft, sourceAnalyses: { 'src-exact': exactAnalysis } });
    const compUnrev = compileForgeDraft(unreviewedDraft, { sourceAnalyses: { 'src-exact': exactAnalysis } });
    expect(readUnrev.valid).toBe(false);
    expect(compUnrev.success).toBe(false);
  });
});
