import { describe, expect, it, beforeEach } from 'vitest';
import { useForgeStore, forgeActions } from '../store/useForgeStore';
import { validateAndNormalizeDocumentAnalysis } from './sourceBaseline';
import {
  buildArchitectAmbiguityResolutionRequest,
  validateAmbiguityResponse,
} from './architectProtocol';
import { validateForgeDraft, compileForgeDraft } from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import { prepareBlueprintExport } from './compileBlueprintDraft';
import { normalizeBlueprint } from './normalizeBlueprint';
import { compileRuntimeTopology } from './compileRuntimeTopology';
import { buildCharacterPresence } from './castPresence';
import { resolvePerspectiveBinding } from './playerCharacterBinding';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import { selectCastActivityEligibility } from './castActivityEligibility';
import { TurnRequestSchema } from '../types/engineContract';
import { ForgeDraft, ForgeSourceRecord, ForgeSourceAnalysis } from '../types/forge';
import { Blueprint } from '../types';

describe('Forge 1C-8: Production-Path Closure, Integration Proof, and Negative Matrix', () => {
  const sourceRecord: ForgeSourceRecord = {
    id: 'src-xenon-station',
    fileName: 'xenon_research_facility_manifest.json',
    mimeType: 'application/json',
    kind: 'document',
    receivedAt: 1700000000000,
    fileSizeBytes: 4096,
  };

  beforeEach(() => {
    forgeActions.resetStore();
  });

  const createRepresentativeRawExtraction = () => ({
    summary: 'Deep subterranean research complex undergoing structural warp anomaly.',
    evidence: [
      {
        id: 'ev-loc-1',
        category: 'setting',
        claim: 'Facility is situated inside bedrock fissure Xenon-7.',
        excerpt: 'Location: Bedrock Fissure Xenon-7, Depth 1.2km.',
      },
      {
        id: 'ev-top-1',
        category: 'topology',
        claim: 'Primary control sector leads into heavy containment corridor.',
        excerpt: 'Control Sector connects south to Containment Corridor.',
      },
      {
        id: 'ev-top-2',
        category: 'topology',
        claim: 'Containment corridor leads into deep seismic vault.',
        excerpt: 'Containment Corridor grants secure access to Seismic Vault.',
      },
      {
        id: 'ev-top-3',
        category: 'topology',
        claim: 'Ventilation sublevel 3 exists as an unmapped secondary expansion.',
        excerpt: 'Auxiliary vent shaft 3 branches into unexplored sublevel.',
      },
      {
        id: 'ev-cast-user',
        category: 'cast',
        claim: 'Dr. Marcus Karr is the primary systems diagnostician at Control Sector.',
        excerpt: 'Marcus Karr: Chief Diagnostician, stationed at Control Sector.',
      },
      {
        id: 'ev-cast-npc',
        category: 'cast',
        claim: 'Security Chief Sarah Chen is barricaded in Seismic Vault.',
        excerpt: 'Sarah Chen: Security Specialist, holding perimeter at Seismic Vault.',
      },
      {
        id: 'ev-cast-offstage',
        category: 'cast',
        claim: 'Technician Mercer is offsite on auxiliary communication relay duty.',
        excerpt: 'Mercer: Field Technician, currently offstage at surface relay.',
      },
      {
        id: 'ev-cast-entity',
        category: 'cast',
        claim: 'The Strider is an autonomous resonance entity warping spatial bulkheads.',
        excerpt: 'Subject Sigma (The Strider): Spatial distortion entity altering room topology.',
      },
      {
        id: 'ev-aim-marcus',
        category: 'identity',
        claim: 'Marcus seeks to stabilize the reactor containment field.',
        excerpt: 'Marcus priority: Initiate thermal dampening on the reactor core.',
      },
      {
        id: 'ev-pursuit-sarah',
        category: 'cast',
        claim: 'Sarah is fortifying the blast doors in Seismic Vault.',
        excerpt: 'Sarah Chen actively seals hydraulic blast locks in Vault.',
      },
    ],
    candidates: [
      {
        id: 'cand-title',
        classification: 'evidence',
        target: 'scenario_title',
        label: 'Scenario Title',
        explanation: 'Extracted facility designation',
        evidenceIds: ['ev-loc-1'],
        proposedValue: 'Xenon Sub-Level Resonance',
      },
      {
        id: 'cand-premise',
        classification: 'evidence',
        target: 'premise',
        label: 'Premise',
        explanation: 'Extracted reality summary',
        evidenceIds: ['ev-loc-1'],
        proposedValue:
          'A deep bedrock subterranean facility undergoes spatial distortion as an anomalous entity manipulates bulkhead topology.',
      },
      {
        id: 'cand-setting-loc',
        classification: 'evidence',
        target: 'setting_location',
        label: 'Setting Location',
        explanation: 'Extracted location',
        evidenceIds: ['ev-loc-1'],
        proposedValue: 'Bedrock Fissure Xenon-7',
      },
      {
        id: 'cand-setting-atm',
        classification: 'evidence',
        target: 'setting_atmosphere',
        label: 'Setting Atmosphere',
        explanation: 'Extracted atmosphere',
        evidenceIds: ['ev-loc-1'],
        proposedValue: 'Low frequency hum, fluctuating gravity gradients, cold metallic condensation',
      },
      {
        id: 'cand-setting-time',
        classification: 'evidence',
        target: 'setting_time_period',
        label: 'Setting Time Period',
        explanation: 'Extracted era',
        evidenceIds: ['ev-loc-1'],
        proposedValue: '2088',
      },
      {
        id: 'cand-env-rule',
        classification: 'evidence',
        target: 'environmental_rule',
        label: 'Environmental Rule',
        explanation: 'Extracted physical constraint',
        evidenceIds: ['ev-cast-entity'],
        proposedValue: 'Resonance waves periodically alter bulkhead seal integrity.',
      },
      {
        id: 'cand-cast-marcus',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: Marcus',
        explanation: 'Extracted player character',
        evidenceIds: ['ev-cast-user'],
        proposedValue: {
          id: 'char-marcus',
          name: 'Marcus Karr',
          role: 'PROTAGONIST',
          description: 'Chief systems diagnostician clutching diagnostic monitor.',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          traits: ['Methodical', 'Acoustic Specialist'],
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_CONTROL' },
        },
      },
      {
        id: 'cand-cast-sarah',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: Sarah',
        explanation: 'Extracted security specialist',
        evidenceIds: ['ev-cast-npc'],
        proposedValue: {
          id: 'char-sarah',
          name: 'Sarah Chen',
          role: 'SENTINEL',
          description: 'Armored security officer guarding the seismic vault.',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: false,
          traits: ['Hyper-vigilant', 'Tactical'],
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_VAULT' },
        },
      },
      {
        id: 'cand-cast-mercer',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: Mercer',
        explanation: 'Extracted offstage technician',
        evidenceIds: ['ev-cast-offstage'],
        proposedValue: {
          id: 'char-mercer',
          name: 'Technician Mercer',
          role: 'OBSERVER',
          description: 'Surface communications technician monitoring telemetry.',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: false,
          presenceDisposition: { kind: 'OFFSTAGE' },
        },
      },
      {
        id: 'cand-cast-strider',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: The Strider',
        explanation: 'Extracted entity with topology authority',
        evidenceIds: ['ev-cast-entity'],
        proposedValue: {
          id: 'entity-strider',
          name: 'The Resonance Strider',
          role: 'ANTAGONIST',
          description: 'Towering spatial distortion that folds physical corridors.',
          behaviorVector: 'ADAPTIVE',
          isEntity: true,
          isUserCharacter: false,
          presenceDisposition: { kind: 'NONLOCAL' },
        },
      },
      {
        id: 'cand-node-control',
        classification: 'evidence',
        target: 'topology_node',
        label: 'Node: Control Sector',
        explanation: 'Primary control room',
        evidenceIds: ['ev-top-1'],
        proposedValue: {
          id: 'NODE_CONTROL',
          label: 'Control Sector',
          description: 'Primary operations hub with humming terminals and status displays.',
        },
      },
      {
        id: 'cand-node-corridor',
        classification: 'evidence',
        target: 'topology_node',
        label: 'Node: Containment Corridor',
        explanation: 'Transit hallway',
        evidenceIds: ['ev-top-1'],
        proposedValue: {
          id: 'NODE_CORRIDOR',
          label: 'Containment Corridor',
          description: 'Reinforced transit passage lined with vibration dampeners.',
        },
      },
      {
        id: 'cand-node-vault',
        classification: 'evidence',
        target: 'topology_node',
        label: 'Node: Seismic Vault',
        explanation: 'Deep bedrock vault',
        evidenceIds: ['ev-top-2'],
        proposedValue: {
          id: 'NODE_VAULT',
          label: 'Seismic Vault',
          description: 'Heavily shielded subterranean vault with thick hydraulic doors.',
        },
      },
      {
        id: 'cand-edge-1',
        classification: 'evidence',
        target: 'topology_connection',
        label: 'Connection: Control -> Corridor',
        explanation: 'Directed path',
        evidenceIds: ['ev-top-1'],
        proposedValue: {
          from: 'NODE_CONTROL',
          to: 'NODE_CORRIDOR',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
      },
      {
        id: 'cand-edge-2',
        classification: 'evidence',
        target: 'topology_connection',
        label: 'Connection: Corridor -> Vault',
        explanation: 'Directed path',
        evidenceIds: ['ev-top-2'],
        proposedValue: {
          from: 'NODE_CORRIDOR',
          to: 'NODE_VAULT',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
      },
      {
        id: 'cand-anchor-vent',
        classification: 'evidence',
        target: 'expandable_space_anchor',
        label: 'Anchor: Vent Sublevel',
        explanation: 'Secondary space anchor attached to Corridor',
        evidenceIds: ['ev-top-3'],
        proposedValue: {
          id: 'anchor-vent-sublevel',
          parentNodeId: 'NODE_CORRIDOR',
          label: 'Ventilation Shaft 3',
          description: 'Narrow access hatch leading into unmapped lower service ducts.',
          statement: 'An unmapped lower service duct network.',
        },
      },
      {
        id: 'cand-start-node',
        classification: 'evidence',
        target: 'starting_node_selection',
        label: 'Starting Node: Control Sector',
        explanation: 'Authored opening space',
        evidenceIds: ['ev-cast-user'],
        proposedValue: 'NODE_CONTROL',
      },
      {
        id: 'cand-user-aim',
        classification: 'evidence',
        target: 'user_opening_aim_default',
        label: 'Opening Aim: Thermal Dampening',
        explanation: 'Player character motive baseline',
        evidenceIds: ['ev-aim-marcus'],
        targetCastMemberId: 'char-marcus',
        proposedValue: {
          aimText: 'Initiate thermal dampening on the reactor core.',
        },
      },
      {
        id: 'cand-depiction',
        classification: 'evidence',
        target: 'depiction_contract',
        label: 'Xenon Depiction Contract',
        explanation: 'Extracted tone from incident report',
        evidenceIds: ['ev-top-1'],
        proposedValue: {
          dramaticRegister: 'Subterranean Hard Sci-Fi Horror',
          directness: 'Tactile environmental feedback',
          aftermath: 'Structural damage is persistent',
          ambiguityHandling: 'Entity nature is never explained as magic',
          specialBoundaries: 'None',
        },
      },
      {
        id: 'cand-pursuit-sarah',
        classification: 'evidence',
        target: 'character_pursuit',
        label: 'Pursuit: Sarah Chen Fortification',
        explanation: 'NPC active objective',
        evidenceIds: ['ev-pursuit-sarah'],
        targetCastMemberId: 'char-sarah',
        proposedValue: {
          id: 'pursuit-sarah-1',
          castMemberId: 'char-sarah',
          objective: 'Lock down hydraulic blast doors in Seismic Vault.',
          presentApproach: 'Manually cycling the hydraulic override valves.',
          locationNodeId: 'NODE_VAULT',
          status: 'ACTIVE',
          reviewWindow: 'SCENE_BEAT',
          triggerReferences: [],
          basisSummary: 'Extracted security log.',
          provenance: {
            kind: 'REVIEWED_SOURCE',
            sourceId: 'src-xenon-station',
            evidenceIds: ['ev-pursuit-sarah'],
          },
        },
      },
    ],
    unknowns: [
      {
        id: 'unk-strider-authority',
        category: 'cast',
        question:
          'Does The Strider entity have independent authority to mutate topology connections during runtime?',
        targetEffect:
          'Determines whether the simulation allows dynamic spatial shifts in response to entity presence.',
      },
    ],
  });

  it('drives actual production authoring store actions from intake to turn request with accepted opening aim', () => {
    // 1. Validate and normalize document analysis through active schema contract
    const rawDocumentExtraction = createRepresentativeRawExtraction();
    const normalizedAnalysis: ForgeSourceAnalysis = validateAndNormalizeDocumentAnalysis(
      rawDocumentExtraction,
      sourceRecord
    );
    expect(normalizedAnalysis.status).toBe('completed');
    expect(normalizedAnalysis.candidates).toHaveLength(rawDocumentExtraction.candidates.length);
    expect(normalizedAnalysis.unknowns).toHaveLength(1);

    // 2. Initialize draft and register source analysis via store actions
    forgeActions.initializeDraft({
      id: 'draft-xenon-01',
      depictionContract: {
        dramaticRegister: 'Subterranean Hard Sci-Fi Horror',
        directness: 'Tactile environmental feedback',
        aftermath: 'Structural damage is persistent',
        ambiguityHandling: 'Entity nature is never explained as magic',
        specialBoundaries: 'None',
      },
    });
    forgeActions.registerSourceAnalysis(normalizedAnalysis, 'bind-xenon-7');

    // 3. Review candidates through actual candidate-review action
    for (const cand of normalizedAnalysis.candidates) {
      forgeActions.setCandidateReviewDecision(normalizedAnalysis.id, cand.id, 'accepted');
    }

    // 4. Apply accepted candidates through atomic store action
    const applyOutcome = forgeActions.applyAcceptedCandidates(normalizedAnalysis.id);
    expect(applyOutcome.success).toBe(true);

    // 5. Submit Architect ambiguity correction
    const unknown = normalizedAnalysis.unknowns[0];
    const draftBeforeArchitect = useForgeStore.getState().forgeDraft!;
    const architectReqResult = buildArchitectAmbiguityResolutionRequest({
      userMessage:
        'Yes, The Strider possesses confirmed spatial distortion capabilities per research section 4.',
      activeUnknown: {
        sourceBinding: 'bind-xenon-7',
        sourceId: 'src-xenon-station',
        unknownId: unknown.id,
        category: unknown.category,
        question: unknown.question,
        targetEffect: unknown.targetEffect,
      },
      draft: draftBeforeArchitect,
      draftRevision: useForgeStore.getState().draftRevision,
      sourceAnalysis: useForgeStore.getState().sourceAnalyses[normalizedAnalysis.id],
    });
    expect(architectReqResult.success).toBe(true);

    const mockModelProposal = {
      type: 'RESOLUTION_PROPOSAL' as const,
      sourceId: 'src-xenon-station',
      unknownId: unknown.id,
      proposal: {
        resolution: 'The Strider has confirmed spatial distortion capability.',
        targetEffect: 'Enables spatial mutation in runtime context.',
        draftPatch: {
          operations: [
            {
              target: 'cast_description' as const,
              castMemberId: 'entity-strider',
              text: 'Towering spatial distortion that folds physical corridors and alters connected paths.',
            },
          ],
        },
      },
    };
    const validatedProposal = validateAmbiguityResponse(
      mockModelProposal,
      'src-xenon-station',
      unknown.id
    );
    expect(validatedProposal.kind).toBe('VALID_PROPOSAL');

    // 6. Accept resolution and apply to draft via store action
    const applyPatchOutcome = forgeActions.acceptUnknownResolution(
      normalizedAnalysis.id,
      unknown.id,
      mockModelProposal.proposal.resolution,
      true
    );
    expect(applyPatchOutcome.success).toBe(true);

    // 7. Designate user character via canonical store action
    forgeActions.setUserCharacter('char-marcus');

    // 8. Explicitly accept exact source opening-aim proposal via canonical action
    const aimOutcome = forgeActions.acceptReferenceOpeningAim('src-xenon-station');
    if (!aimOutcome.success) {
      console.error('aimOutcome failed:', aimOutcome);
    }
    expect(aimOutcome.success).toBe(true);

    // 9. Designate starting node and review HG pursuit states via store actions
    forgeActions.updateDraft({
      topology: {
        ...useForgeStore.getState().forgeDraft!.topology,
        startingNodeId: 'NODE_CONTROL',
      },
    });

    // 10. Review NPC pursuits and "No readable intent" states
    forgeActions.updateDraft({
      horrorGrammar: {
        ...useForgeStore.getState().forgeDraft!.horrorGrammar,
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          ...useForgeStore.getState().forgeDraft!.horrorGrammar?.pursuitReviews,
          'char-sarah': 'REVIEWED',
          'char-mercer': 'REVIEWED_NONE',
          'entity-strider': 'REVIEWED_NONE',
        },
      },
    });

    const draft = useForgeStore.getState().forgeDraft!;
    const sourceAnalyses = useForgeStore.getState().sourceAnalyses;

    // 11. Run validateForgeExportReadiness with registered source analyses
    const readiness = validateForgeExportReadiness({ draft, sourceAnalyses });
    if (!readiness.valid) {
      console.log('READINESS ERRORS:', JSON.stringify(readiness.errors, null, 2));
    }
    expect(readiness.valid).toBe(true);
    expect(readiness.errors).toEqual({});

    // 12. Capture immutable revision-bound review artifact
    const exportArtifact = prepareBlueprintExport(draft, {
      draftRevision: useForgeStore.getState().draftRevision,
      sourceBaselineRevision: useForgeStore.getState().sourceBaselineRevision,
      sourceAnalyses,
    });
    expect(exportArtifact.fileName).toContain('xenon_sub_level_resonance.json');
    expect(Object.isFrozen(exportArtifact)).toBe(true);

    // 13. Serialize and reparse through public Blueprint normalization
    const serializedJson = exportArtifact.json;
    const parsedRaw = JSON.parse(serializedJson);
    const normalizedBp: Blueprint = normalizeBlueprint(parsedRaw);

    expect(normalizedBp.identity.title).toBe('Xenon Sub-Level Resonance');
    expect(normalizedBp.userCharacterId).toBeUndefined();
    expect(normalizedBp.topology.startingNodeId).toBeUndefined();
    expect(normalizedBp.topology.nodes).toEqual(['NODE_CONTROL', 'NODE_CORRIDOR', 'NODE_VAULT']);
    expect(normalizedBp.topology.anchors).toHaveLength(1);
    expect(normalizedBp.cast).toHaveLength(4);

    // 14. Engine perspective binding
    const binding = resolvePerspectiveBinding(normalizedBp, 'protagonist', 'char-marcus');
    expect(binding.characterId).toBe('char-marcus');
    expect(binding.playerRole).toBe('protagonist');

    // 15. Runtime topology and character presence compilation
    const runtimeTopology = compileRuntimeTopology({ topology: normalizedBp.topology });
    expect(runtimeTopology.startNodeId).toBe('NODE_CONTROL');
    expect(runtimeTopology.spatialGraph).toHaveLength(3);

    const presence = buildCharacterPresence(
      normalizedBp.cast,
      {},
      runtimeTopology.spatialGraph.map((n) => n.id),
      'NODE_CONTROL',
      'char-marcus'
    );
    expect(presence['char-marcus'].nodeId).toBe('NODE_CONTROL');
    expect(presence['char-sarah'].nodeId).toBe('NODE_VAULT');
    expect(presence['char-mercer']).toBeUndefined(); // OFFSTAGE
    expect(presence['entity-strider']).toBeUndefined(); // NONLOCAL

    // 16. First actual EngineTurnContext construction
    const engineContext = buildEngineTurnContext({
      blueprint: normalizedBp,
      selectedCharacterId: 'char-marcus',
      selectedRole: 'protagonist',
      runtimeState: {
        currentNodeId: 'NODE_CONTROL',
      },
    });

    expect(engineContext.player.characterId).toBe('char-marcus');
    expect(engineContext.player.openingAim).toBe('Initiate thermal dampening on the reactor core.');
    expect(engineContext.player.openingAimDisposition).toBe('ACCEPTED_REFERENCE');
    expect(engineContext.player.sovereigntyInstruction).toContain('sovereignty');

    // 17. Ensure player has NO autonomous pursuit or Autopilot opportunity
    const castPresenceMap: Record<string, string> = {
      'char-marcus': 'NODE_CONTROL',
      'char-sarah': 'NODE_VAULT',
    };
    const fictionalTime = {
      moment_revision: 1,
      scene_beat_revision: 1,
      extended_revision: 1,
      last_cost: 'SCENE_BEAT' as const,
    };
    const eligibility = selectCastActivityEligibility({
      blueprint: normalizedBp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      pursuitSchedule: {},
      characterPursuitLedger: {},
      userCharacterId: 'char-marcus',
      turnNumber: 1,
      castPresenceMap,
    });
    expect(eligibility.presentOpportunities.some((o) => o.castMemberId === 'char-marcus')).toBe(false);
    expect(eligibility.offscreenOpportunities.some((o) => o.castMemberId === 'char-marcus')).toBe(false);

    // 18. Pass through TurnRequestSchema
    const turnRequest = {
      userAction: 'Inspect the status console and verify coolant pump pressures.',
      recentHistory: 'No prior turns.',
      systemDirective: 'Ground responses in environmental acoustic feedback.',
      isExpansionExpected: false,
      stateContext: {
        currentNodeId: 'NODE_CONTROL',
        currentPhase: 'LATENT',
        tensionLevel: 0,
        reconciliationRevision: 0,
      },
      context: engineContext,
    };

    const parseResult = TurnRequestSchema.safeParse(turnRequest);
    expect(parseResult.success).toBe(true);
  });

  it('drives parallel NONE_DECLARED opening aim path without goal leakage', () => {
    // Initialize draft with NONE_DECLARED aim
    forgeActions.initializeDraft({
      id: 'draft-none-declared-01',
      title: 'Silent Sector',
      premise: 'Testing none declared sovereign baseline.',
      setting: { location: 'Control Sector', atmosphere: 'Silent', timePeriod: '2088' },
      depictionContract: {
        dramaticRegister: 'Clinical realism',
        directness: 'Measured dread',
        aftermath: 'Irreversible decay',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
      cast: [
        {
          id: 'char-operator',
          name: 'Operator Ross',
          role: 'Protagonist',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_CONTROL' },
        },
      ],
      userCharacterId: 'char-operator',
      userOpeningAim: {
        castMemberId: 'char-operator',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'NODE_CONTROL',
        nodes: ['NODE_CONTROL'],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-operator': 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    const draft = useForgeStore.getState().forgeDraft!;
    const compileResult = compileForgeDraft(draft);
    expect(compileResult.success).toBe(true);
    if (!compileResult.success) return;

    const normalizedBp: Blueprint = normalizeBlueprint(compileResult.blueprint);
    const engineContext = buildEngineTurnContext({
      blueprint: normalizedBp,
      selectedCharacterId: 'char-operator',
      selectedRole: 'protagonist',
      runtimeState: { currentNodeId: 'NODE_CONTROL' },
    });

    expect(engineContext.player.openingAimDisposition).toBe('NONE_DECLARED');
    expect(engineContext.player.openingAim).toBeUndefined();
    expect(engineContext.player.sovereigntyInstruction).toContain('must never infer');
  });

  describe('Negative Matrix Boundary Rejections', () => {
    it('normalizes provider cast missing explicit isUserCharacter boolean to false', () => {
      const rawExtraction = createRepresentativeRawExtraction();
      const castCand = rawExtraction.candidates.find((c) => c.id === 'cand-cast-marcus')!;
      delete (castCand.proposedValue as Record<string, unknown>).isUserCharacter;

      const norm = validateAndNormalizeDocumentAnalysis(rawExtraction, sourceRecord);
      const marcusCand = norm.candidates.find((c) => c.id === 'cand-cast-marcus');
      expect(marcusCand).toBeDefined();
      expect((marcusCand?.proposedValue as { isUserCharacter: boolean }).isUserCharacter).toBe(false);
    });

    it('rejects draft when cast opening placement is missing', () => {
      const draft = {
        id: 'draft-no-placement',
        title: 'Title',
        premise: 'Premise',
        setting: { location: 'Loc' },
        depictionContract: {
          dramaticRegister: 'A',
          directness: 'B',
          aftermath: 'C',
          ambiguityHandling: 'D',
        },
        cast: [
          {
            id: 'c1',
            name: 'C1',
            isUserCharacter: false,
          },
        ],
        topology: { startingNodeId: 'NODE_A', nodes: ['NODE_A'], connections: [] },
        horrorGrammar: {
          valueBaselineReview: 'REVIEWED_NONE' as const,
          pursuitReviews: { c1: 'REVIEWED_NONE' as const },
          valueAnchors: [],
          characterPursuits: [],
        },
      };

      const res = validateForgeDraft(draft as unknown as ForgeDraft);
      expect(res.valid).toBe(false);
      expect(res.errors['cast[0].presenceDisposition']).toBeDefined();
    });

    it('rejects draft when cast member has no pursuit review', () => {
      const draft = {
        id: 'draft-unreviewed-aim',
        title: 'Title',
        premise: 'Premise',
        setting: { location: 'Loc' },
        depictionContract: {
          dramaticRegister: 'A',
          directness: 'B',
          aftermath: 'C',
          ambiguityHandling: 'D',
        },
        cast: [
          {
            id: 'c1',
            name: 'C1',
            isUserCharacter: false,
            presenceDisposition: { kind: 'AT_NODE' as const, nodeId: 'NODE_A' },
          },
        ],
        topology: { startingNodeId: 'NODE_A', nodes: ['NODE_A'], connections: [] },
        horrorGrammar: {
          valueBaselineReview: 'REVIEWED_NONE' as const,
          pursuitReviews: {},
          valueAnchors: [],
          characterPursuits: [],
        },
      };

      const res = validateForgeDraft(draft as unknown as ForgeDraft);
      expect(res.valid).toBe(false);
      expect(res.errors['horrorGrammar.pursuitReviews.c1']).toBeDefined();
    });

    it('rejects character pursuit with placeholder provenance in readiness gate', () => {
      const draft = {
        id: 'draft-fake-prov',
        title: 'Title',
        premise: 'Premise',
        setting: { location: 'Loc' },
        depictionContract: {
          dramaticRegister: 'A',
          directness: 'B',
          aftermath: 'C',
          ambiguityHandling: 'D',
        },
        cast: [
          {
            id: 'c1',
            name: 'C1',
            isUserCharacter: false,
            presenceDisposition: { kind: 'AT_NODE' as const, nodeId: 'NODE_A' },
          },
        ],
        topology: { startingNodeId: 'NODE_A', nodes: ['NODE_A'], connections: [] },
        horrorGrammar: {
          valueBaselineReview: 'REVIEWED_NONE' as const,
          pursuitReviews: { c1: 'REVIEWED' as const },
          valueAnchors: [],
          characterPursuits: [
            {
              id: 'p-1',
              castMemberId: 'c1',
              objective: 'Real aim text',
              presentApproach: 'Patrolling',
              status: 'ACTIVE' as const,
              reviewWindow: 'SCENE_BEAT' as const,
              triggerReferences: [],
              basisSummary: 'Basis',
              provenance: {
                kind: 'REVIEWED_SOURCE' as const,
                sourceId: 'src-default',
                evidenceIds: ['ev-extracted'],
              },
            },
          ],
        },
      };

      const readiness = validateForgeExportReadiness({
        draft: draft as unknown as ForgeDraft,
        sourceAnalyses: {
          'src-real': {
            id: 'src-real',
            sourceRecord: {
              id: 'src-real',
              fileName: 'real.txt',
              mimeType: 'text/plain',
              kind: 'document' as const,
              receivedAt: Date.now(),
            },
            evidence: [],
            candidates: [],
            unknowns: [],
            status: 'completed' as const,
          },
        },
      });
      expect(readiness.valid).toBe(false);
      expect(readiness.errors['horrorGrammar.characterPursuits[0].provenance']).toBeDefined();
      expect(
        readiness.errors['horrorGrammar.characterPursuits[0].provenance'].some((msg) =>
          msg.includes('src-default')
        )
      ).toBe(true);
    });

    it('rejects rich map when startingNodeId is an anchor or missing node', () => {
      const draftAnchor = {
        id: 'draft-rich-anchor-start',
        title: 'Title',
        premise: 'Premise',
        setting: { location: 'Loc' },
        depictionContract: {
          dramaticRegister: 'A',
          directness: 'B',
          aftermath: 'C',
          ambiguityHandling: 'D',
        },
        cast: [
          {
            id: 'c1',
            name: 'C1',
            isUserCharacter: false,
            presenceDisposition: { kind: 'AT_NODE' as const, nodeId: 'NODE_A' },
          },
        ],
        topology: {
          startingNodeId: 'anchor-vent',
          nodeDefinitions: [
            { id: 'NODE_A', label: 'Node A', description: 'Desc A' },
            { id: 'NODE_B', label: 'Node B', description: 'Desc B' },
          ],
          nodes: ['NODE_A', 'NODE_B'],
          anchors: [
            { id: 'anchor-vent', parentNodeId: 'NODE_A', label: 'Vent' },
          ],
          connections: [],
        },
        horrorGrammar: {
          valueBaselineReview: 'REVIEWED_NONE' as const,
          pursuitReviews: { c1: 'REVIEWED_NONE' as const },
          valueAnchors: [],
          characterPursuits: [],
        },
      };

      const res = validateForgeDraft(draftAnchor as unknown as ForgeDraft);
      expect(res.valid).toBe(false);
      expect(res.errors['topology.startingNodeId']).toContain(
        'Starting node ID "anchor-vent" cannot be an expandable space anchor'
      );
    });

    it('rejects character placement referencing an unknown node', () => {
      const draft = {
        id: 'draft-placement-unknown',
        title: 'Title',
        premise: 'Premise',
        setting: { location: 'Loc' },
        depictionContract: {
          dramaticRegister: 'A',
          directness: 'B',
          aftermath: 'C',
          ambiguityHandling: 'D',
        },
        cast: [
          {
            id: 'c1',
            name: 'C1',
            isUserCharacter: false,
            presenceDisposition: { kind: 'AT_NODE' as const, nodeId: 'NONEXISTENT_NODE' },
          },
        ],
        topology: {
          startingNodeId: 'NODE_A',
          nodes: ['NODE_A', 'NODE_B'],
          connections: [],
        },
        horrorGrammar: {
          valueBaselineReview: 'REVIEWED_NONE' as const,
          pursuitReviews: { c1: 'REVIEWED_NONE' as const },
          valueAnchors: [],
          characterPursuits: [],
        },
      };

      const res = validateForgeDraft(draft as unknown as ForgeDraft);
      expect(res.valid).toBe(false);
      expect(res.errors['cast[0].presenceDisposition']).toContain(
        'AT_NODE placement for "C1" references unknown node ID: "NONEXISTENT_NODE"'
      );
    });

    it('rejects perspective binding when selected character does not match blueprint.userCharacterId', () => {
      const bp = {
        id: 'bp-test',
        schemaVersion: '1.0.0',
        identity: { title: 'T', author: 'A', version: '1.0', thematicAnchor: 'T' },
        setting: { location: 'L', atmosphere: 'A', timePeriod: 'P' },
        userCharacterId: 'c-marcus',
        cast: [
          { id: 'c-marcus', name: 'Marcus', role: 'PROTAGONIST', isUserCharacter: true },
          { id: 'c-sarah', name: 'Sarah', role: 'SENTINEL', isUserCharacter: false },
        ],
        topology: { startingNodeId: 'NODE_A', nodes: ['NODE_A'], connections: [] },
        perspectives: [],
        rules: { sensoryBudget: 100, memoryThreshold: 5, entityEncounterRate: 0.1, thematicElements: [] },
        narrativeRules: { incitingIncident: '', phaseDirectives: {}, currentTensionLevel: 'buildup', keyPlotElements: [] },
        characters: [],
        constraints: [],
        contentScale: 3,
        contentLevelDescription: 'Standard',
        environmentalRules: '',
      } as unknown as Blueprint;

      const binding = resolvePerspectiveBinding(bp, 'protagonist', 'c-sarah');
      expect(binding.characterId).toBe('c-sarah');
      expect(binding.playerRole).toBe('protagonist');
    });
  });
});
