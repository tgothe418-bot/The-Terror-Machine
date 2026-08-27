import { describe, expect, it } from 'vitest';
import {
  validateAndNormalizeDocumentAnalysis,
  applyCandidateToDraft,
  sortCandidatesForApplication,
} from './sourceBaseline';
import {
  buildArchitectAmbiguityResolutionRequest,
  validateAmbiguityResponse,
} from './architectProtocol';
import { compileForgeDraft } from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import { prepareBlueprintExport } from './compileBlueprintDraft';
import { normalizeBlueprint } from './normalizeBlueprint';
import { compileRuntimeTopology } from './compileRuntimeTopology';
import { buildCharacterPresence } from './castPresence';
import { resolvePerspectiveBinding } from './playerCharacterBinding';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import { selectCastActivityEligibility } from './castActivityEligibility';
import { ForgeDraft, ForgeSourceRecord, ForgeSourceAnalysis } from '../types/forge';
import { Blueprint, BlueprintSchema } from '../types';

describe('Forge 1C-4: Blueprint-to-Engine Compatibility and Stabilization (Vertical Integration)', () => {
  const sourceRecord: ForgeSourceRecord = {
    id: 'src-xenon-station',
    fileName: 'xenon_research_facility_manifest.json',
    mimeType: 'application/json',
    kind: 'document',
    receivedAt: 1700000000000,
    fileSizeBytes: 4096,
  };

  it('drives the full production chain from source document intake through first-turn context', () => {
    // 1. RAW DOCUMENT EXTRACTION OUTPUT
    const rawDocumentExtraction = {
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
            castMemberId: 'char-marcus',
            disposition: 'ACCEPTED_REFERENCE',
            aimText: 'Initiate thermal dampening on the reactor core.',
            provenance: {
              kind: 'REVIEWED_SOURCE',
              sourceId: 'src-xenon-station',
              evidenceIds: ['ev-aim-marcus'],
            },
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
    };

    // Step 1: Normalize document analysis
    const normalizedAnalysis: ForgeSourceAnalysis = validateAndNormalizeDocumentAnalysis(
      rawDocumentExtraction,
      sourceRecord
    );
    expect(normalizedAnalysis.status).toBe('completed');
    expect(normalizedAnalysis.candidates).toHaveLength(rawDocumentExtraction.candidates.length);
    expect(normalizedAnalysis.unknowns).toHaveLength(1);

    // Step 2: Initialize clean authoring draft
    let draft: ForgeDraft = {
      id: 'draft-xenon-01',
      title: '',
      premise: '',
      setting: { location: '', atmosphere: '', timePeriod: '' },
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      depictionContract: {
        dramaticRegister: 'Subterranean Hard Sci-Fi Horror',
        directness: 'Tactile environmental feedback',
        aftermath: 'Structural damage is persistent',
        ambiguityHandling: 'Entity nature is never explained as magic',
        specialBoundaries: 'None',
      },
      cast: [],
      topology: { nodes: [], connections: [], anchors: [] },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    // Step 3: Architect Interaction - Build ambiguity resolution request & validate proposal
    const unknown = normalizedAnalysis.unknowns[0];
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
      draft,
      draftRevision: 1,
      sourceAnalysis: normalizedAnalysis,
    });

    expect(architectReqResult.success).toBe(true);
    if (!architectReqResult.success) return;
    const architectRequest = architectReqResult.request;

    expect(architectRequest.kind).toBe('AMBIGUITY_RESOLUTION');
    expect(architectRequest.activeUnknown.unknownId).toBe('unk-strider-authority');

    // Simulate Architect returning a typed resolution proposal
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

    const validatedResult = validateAmbiguityResponse(
      mockModelProposal,
      'src-xenon-station',
      unknown.id
    );
    expect(validatedResult.kind).toBe('VALID_PROPOSAL');
    if (validatedResult.kind !== 'VALID_PROPOSAL') return;
    expect(validatedResult.unknownId).toBe('unk-strider-authority');

    // Step 4: Apply sorted candidates to draft in strict priority order
    const sorted = sortCandidatesForApplication(normalizedAnalysis.candidates);
    for (const cand of sorted) {
      const applyResult = applyCandidateToDraft(draft, cand, sourceRecord.fileName);
      expect(applyResult.success).toBe(true);
      if (applyResult.success) {
        draft = applyResult.draft;
      }
    }

    // Apply the Architect-resolved patch to entity description
    const striderInDraft = draft.cast?.find((c) => c.id === 'entity-strider');
    if (striderInDraft) {
      striderInDraft.description = mockModelProposal.proposal.draftPatch.operations[0].text;
    }

    // Step 5: Author explicit review states
    // Set Mercer (tertiary offstage) to REVIEWED_NONE (No readable intent)
    draft.horrorGrammar!.pursuitReviews['char-mercer'] = 'REVIEWED_NONE';
    // Set Strider (nonlocal entity) to REVIEWED_NONE (No readable intent)
    draft.horrorGrammar!.pursuitReviews['entity-strider'] = 'REVIEWED_NONE';

    // Step 6: Validate Export Readiness
    // Mark unknown as resolved in analysis
    normalizedAnalysis.unknowns[0].status = 'resolved';
    // Mark candidates as applied in analysis
    normalizedAnalysis.candidates.forEach((c) => {
      c.applicationState = 'applied';
    });

    const readiness = validateForgeExportReadiness({
      draft,
      sourceAnalyses: { [normalizedAnalysis.id]: normalizedAnalysis },
    });
    expect(readiness.valid).toBe(true);
    expect(readiness.errors).toEqual({});

    // Step 7: Compile Draft into Canonical Blueprint & Review Artifact
    const compileResult = compileForgeDraft(draft);
    expect(compileResult.success).toBe(true);
    if (!compileResult.success) return;

    const { blueprint, artifact } = compileResult;
    expect(artifact.fileName).toContain('xenon_sub_level_resonance.json');
    expect(artifact.sourceDraftId).toBe('draft-xenon-01');

    // Step 8: Serialize and Reparse through public Blueprint normalization/ingress schema
    const serializedJson = JSON.stringify(blueprint);
    const parsedRaw = JSON.parse(serializedJson);
    const normalizedBp: Blueprint = normalizeBlueprint(parsedRaw);

    expect(normalizedBp.identity.title).toBe('Xenon Sub-Level Resonance');
    expect(normalizedBp.topology.startingNodeId).toBe('NODE_CONTROL');
    expect(normalizedBp.topology.nodes).toEqual(['NODE_CONTROL', 'NODE_CORRIDOR', 'NODE_VAULT']);
    expect(normalizedBp.topology.anchors).toHaveLength(1);
    expect(normalizedBp.topology.anchors[0].id).toBe('anchor-vent-sublevel');
    expect(normalizedBp.cast).toHaveLength(4);

    // Step 9: Resolve player binding via Engine Setup logic
    const binding = resolvePerspectiveBinding(normalizedBp, 'protagonist', 'char-marcus');
    expect(binding.characterId).toBe('char-marcus');
    expect(binding.playerRole).toBe('protagonist');

    // Step 10: Compile Runtime Topology and Character Presence
    const runtimeTopology = compileRuntimeTopology({
      topology: normalizedBp.topology,
    });
    expect(runtimeTopology.startNodeId).toBe('NODE_CONTROL');
    expect(runtimeTopology.spatialGraph).toHaveLength(3);
    // Preserves readable node labels and descriptions
    const controlNode = runtimeTopology.spatialGraph.find((n) => n.id === 'NODE_CONTROL');
    expect(controlNode?.name).toBe('Control Sector');
    expect(controlNode?.description).toContain('Primary operations hub');
    // Directed edges only
    expect(controlNode?.exits).toEqual([
      {
        targetNodeId: 'NODE_CORRIDOR',
        kind: 'PHYSICAL',
        userInitiated: true,
        isOpen: true,
        description: 'NODE CORRIDOR',
        requires: undefined,
      },
    ]);
    // Expansion anchor is excluded from initial runtime nodes and exits
    expect(runtimeTopology.spatialGraph.some((n) => n.id === 'anchor-vent-sublevel')).toBe(false);

    const presence = buildCharacterPresence(
      normalizedBp.cast,
      {},
      runtimeTopology.spatialGraph.map((n) => n.id),
      'NODE_CONTROL',
      'char-marcus'
    );
    // User is at opening node
    expect(presence['char-marcus'].nodeId).toBe('NODE_CONTROL');
    // Sarah is situated in Seismic Vault (not co-located with user)
    expect(presence['char-sarah'].nodeId).toBe('NODE_VAULT');
    // Mercer is offstage (no physical node assigned)
    expect(presence['char-mercer']).toBeUndefined();
    // Strider is nonlocal (no physical node assigned)
    expect(presence['entity-strider']).toBeUndefined();

    // Step 11: Construct First Actual EngineTurnContext
    const engineContext = buildEngineTurnContext({
      blueprint: normalizedBp,
      selectedCharacterId: 'char-marcus',
      selectedRole: 'protagonist',
      runtimeState: {
        currentNodeId: 'NODE_CONTROL',
      },
    });

    // Player aim is read-only orientation context with strict sovereignty clause
    expect(engineContext.player.characterId).toBe('char-marcus');
    expect(engineContext.player.openingAim).toBe(
      'Initiate thermal dampening on the reactor core.'
    );
    expect(engineContext.player.sovereigntyInstruction).toContain('sovereignty');

    // Player aim produces NO CharacterPursuit or user activity opportunity
    const castPresenceMap: Record<string, string> = {};
    for (const [cId, rec] of Object.entries(presence)) {
      if (rec?.nodeId) castPresenceMap[cId] = rec.nodeId;
    }

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

    // Sarah Chen (in Vault) has offscreen pursuit opportunity
    const sarahOffscreen = eligibility.offscreenOpportunities.find((o) => o.castMemberId === 'char-sarah');
    expect(sarahOffscreen).toBeDefined();
    expect(sarahOffscreen?.objective).toBe('Lock down hydraulic blast doors in Seismic Vault.');

    // Mercer (offstage) has No readable intent (REVIEWED_NONE) -> No fabricated pursuit
    expect(eligibility.offscreenOpportunities.some((o) => o.castMemberId === 'char-mercer')).toBe(false);

    // Verify artifact export preparation and schema integrity
    const exportArtifact = prepareBlueprintExport(draft, {
      draftRevision: 1,
      sourceBaselineRevision: 1,
    });
    expect(exportArtifact.fileName).toContain('xenon_sub_level_resonance.json');
    expect(BlueprintSchema.safeParse(JSON.parse(exportArtifact.json)).success).toBe(true);
  });
});
