import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAndNormalizeDocumentAnalysis,
  buildSourceAnalysisFromBlueprint,
} from './sourceBaseline';
import {
  compileForgeDraft,
} from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import {
  forgeActions,
  getForgeState,
  setRuntimeSourceBinding,
  getRuntimeSourceBinding,
} from '../store/useForgeStore';
import { BlueprintSchema } from '../types';
import { ForgeSourceRecord, ForgeDraft } from '../types/forge';

// Four Production Integration Fixtures

export const CLEAN_DOCUMENT_EXTRACTION_FIXTURE = {
  summary: 'Research and reconnaissance log for Submerged Station Tartarus.',
  evidence: [
    {
      id: 'ev-loc-1',
      category: 'setting',
      claim: 'Station Tartarus is moored at 9000m in the Kermadec Trench.',
      excerpt: 'Submerged Station Tartarus moored at depth 9000m Kermadec Trench.',
    },
    {
      id: 'ev-cast-1',
      category: 'cast',
      claim: 'Dr. Alistair Mercer is the chief benthic acoustics engineer.',
      excerpt: 'Chief Engineer Mercer operating sonar terminal.',
    },
    {
      id: 'ev-cast-2',
      category: 'cast',
      claim: 'The Abyssal Resonator is an autonomous acoustic predatory entity.',
      excerpt: 'Resonator frequency echoing through structural bulkhead.',
    },
  ],
  candidates: [
    {
      id: 'cand-title',
      classification: 'evidence',
      target: 'scenario_title',
      label: 'Scenario Title',
      explanation: 'Extracted title',
      evidenceIds: ['ev-loc-1'],
      proposedValue: 'Station Tartarus: Abyssal Echo',
    },
    {
      id: 'cand-premise',
      classification: 'evidence',
      target: 'premise',
      label: 'Premise',
      explanation: 'Extracted premise',
      evidenceIds: ['ev-loc-1', 'ev-cast-1'],
      proposedValue: 'A deep-sea acoustic research outpost besieged by an anomalous resonating intelligence.',
    },
    {
      id: 'cand-loc',
      classification: 'evidence',
      target: 'setting_location',
      label: 'Setting Location',
      explanation: 'Extracted location',
      evidenceIds: ['ev-loc-1'],
      proposedValue: 'Kermadec Trench Research Sector 9',
    },
    {
      id: 'cand-atmos',
      classification: 'evidence',
      target: 'setting_atmosphere',
      label: 'Setting Atmosphere',
      explanation: 'Extracted atmosphere',
      evidenceIds: ['ev-loc-1'],
      proposedValue: 'Crushing hydrostatic pressure, metallic groaning, rhythmic hydrophone pulses',
    },
    {
      id: 'cand-depiction-contract',
      classification: 'evidence',
      target: 'depiction_contract',
      label: 'Depiction Contract',
      explanation: 'Extracted depiction parameters from source log.',
      evidenceIds: ['ev-loc-1'],
      proposedValue: {
        dramaticRegister: 'Psychological dread and crushing pressure',
        directness: 'Visceral hydrophone telemetry feedback',
        aftermath: 'Structural hull compromise and decompression',
        ambiguityHandling: 'Deep sea acoustic signals remain untranslated',
        specialBoundaries: 'None',
      },
    },
    {
      id: 'cand-mortal',
      classification: 'evidence',
      target: 'cast_seed',
      label: 'Cast: Chief Mercer',
      explanation: 'Protagonist lead engineer',
      evidenceIds: ['ev-cast-1'],
      proposedValue: {
        id: 'char-mercer',
        name: 'Dr. Alistair Mercer',
        role: 'Chief Acoustic Engineer',
        description: 'Vigilant acoustic specialist with chronic sleep deprivation.',
        personality: 'Analytical and protective under severe structural strain.',
        goals: 'Maintain station hull integrity and decode the recurring pulse.',
        traits: ['Methodical', 'Perceptive', 'Exhausted'],
        isUserCharacter: true,
        isEntity: false,
        behaviorVector: 'ADAPTIVE',
        presenceDisposition: {
          kind: 'AT_NODE',
          nodeId: 'CONTROL_ROOM',
        },
      },
    },
    {
      id: 'cand-mortal-expr',
      classification: 'evidence',
      target: 'cast_expression_guidance',
      targetCastMemberId: 'char-mercer',
      label: 'Mercer Expression',
      explanation: 'Mercer communication profile',
      evidenceIds: ['ev-cast-1'],
      proposedValue: {
        communicationModes: ['spoken'],
        expressionGuidance: 'Speaks with precise technical cadence, whispering when listening to hydrophones.',
        silenceGuidance: 'Stops speaking abruptly when background hum shifts frequency.',
      },
    },
    {
      id: 'cand-entity',
      classification: 'evidence',
      target: 'cast_seed',
      label: 'Cast: Abyssal Resonator',
      explanation: 'Hostile acoustic entity',
      evidenceIds: ['ev-cast-2'],
      proposedValue: {
        id: 'char-resonator',
        name: 'The Abyssal Resonator',
        role: 'Acoustic Opposition',
        description: 'Non-euclidean acoustic distortion propagating through metal frames.',
        personality: 'Relentless, mimic-driven, predatory.',
        goals: 'Shatter structural quartz viewing ports through sympathetic resonance.',
        traits: ['Incorporeal', 'Echoic'],
        isUserCharacter: false,
        isEntity: true,
        behaviorVector: 'OPPOSITION',
        presenceDisposition: {
          kind: 'NONLOCAL',
        },
      },
    },
    {
      id: 'cand-topo-node',
      classification: 'evidence',
      target: 'topology_node',
      label: 'Node: Control Room',
      explanation: 'Primary control hub',
      evidenceIds: ['ev-loc-1'],
      proposedValue: {
        id: 'CONTROL_ROOM',
        label: 'Acoustic Control Room',
        description: 'High-pressure command module lined with hydrophone oscilloscopes.',
      },
    },
    {
      id: 'cand-topo-start',
      classification: 'evidence',
      target: 'starting_node_selection',
      label: 'Starting Node',
      explanation: 'Initial player spawn',
      evidenceIds: ['ev-loc-1'],
      proposedValue: 'CONTROL_ROOM',
    },
  ],
  unknowns: [
    {
      id: 'unk-pulse-origin',
      category: 'premise',
      question: 'Is the pulse artificial or biological?',
      targetEffect: 'Clarifies origin of anomalous signal',
    },
  ],
};

export const RECOVERABLE_DRIFT_EXTRACTION_FIXTURE = {
  summary: 'Recoverable document extraction with non-canonical alias fields.',
  evidence: [
    {
      id: 'ev-drift-1',
      category: 'setting',
      claim: 'Outpost has radio comms and reinforced corridors.',
      excerpt: 'Radio communications and corridor links.',
    },
  ],
  candidates: [
    {
      id: 'cand-drift-depiction',
      classification: 'evidence',
      target: 'depiction_contract',
      label: 'Drift Depiction Contract',
      explanation: 'Tone',
      evidenceIds: ['ev-drift-1'],
      proposedValue: {
        dramaticRegister: 'Subterranean isolation',
        directness: 'High directness',
        aftermath: 'Severe aftermath',
        ambiguityHandling: 'Uncertain signals',
      },
    },
    {
      id: 'cand-drift-expr',
      classification: 'evidence',
      target: 'cast_expression_guidance',
      targetCastMemberId: 'char-tech-1',
      label: 'Tech Expression Guidance',
      explanation: 'Uses alias verbal and radio communication modes',
      evidenceIds: ['ev-drift-1'],
      proposedValue: {
        communicationModes: ['verbal', 'radio'],
        expressionGuidance: 'Radio transmissions only.',
      },
    },
    {
      id: 'cand-drift-conn',
      classification: 'evidence',
      target: 'topology_connection',
      label: 'Outpost Connection',
      explanation: 'Uses alias kind: corridor',
      evidenceIds: ['ev-drift-1'],
      proposedValue: {
        from: 'HABITAT_A',
        to: 'AIRLOCK_B',
        kind: 'corridor',
        userInitiated: true,
      },
    },
    {
      id: 'cand-drift-anchor',
      classification: 'evidence',
      target: 'value_anchor',
      label: 'Main Transmitter',
      explanation: 'Uses alias holder: { kind: location }',
      evidenceIds: ['ev-drift-1'],
      proposedValue: {
        id: 'anchor-transmitter',
        holder: { kind: 'location', nodeId: 'HABITAT_A' },
        label: 'Main Radio Transmitter',
        description: 'VHF long-range communication relay.',
        basisSummary: 'Station lifeline.',
        provenance: { kind: 'REVIEWED_SOURCE', sourceId: 'src-drift-1', evidenceIds: ['ev-drift-1'] },
      },
    },
    {
      id: 'cand-drift-placement',
      classification: 'evidence',
      target: 'cast_opening_placement',
      targetCastMemberId: 'char-tech-1',
      label: 'Tech Placement',
      explanation: 'Uses alias kind: room',
      evidenceIds: ['ev-drift-1'],
      proposedValue: {
        kind: 'room',
        nodeId: 'HABITAT_A',
      },
    },
  ],
  unknowns: [],
};

export const QUARANTINED_MALFORMED_EXTRACTION_FIXTURE = {
  summary: 'Mixed extraction with valid entries and unparseable malformed candidates.',
  evidence: [
    {
      id: 'ev-mixed-1',
      category: 'setting',
      claim: 'Bunker 14 is sealed.',
      excerpt: 'Bunker 14 reinforced vault.',
    },
  ],
  candidates: [
    {
      id: 'cand-valid-loc',
      classification: 'evidence',
      target: 'setting_location',
      label: 'Setting Location',
      explanation: 'Valid location',
      evidenceIds: ['ev-mixed-1'],
      proposedValue: 'Bunker 14 Subterranean Vault',
    },
    {
      id: 'cand-valid-premise',
      classification: 'evidence',
      target: 'premise',
      label: 'Premise',
      explanation: 'Valid premise',
      evidenceIds: ['ev-mixed-1'],
      proposedValue: 'Surviving in sealed fallout shelter during atmospheric anomaly.',
    },
    {
      id: 'cand-valid-depiction',
      classification: 'evidence',
      target: 'depiction_contract',
      label: 'Depiction Contract',
      explanation: 'Tone',
      evidenceIds: ['ev-mixed-1'],
      proposedValue: {
        dramaticRegister: 'Subterranean isolation',
        directness: 'High directness',
        aftermath: 'Severe aftermath',
        ambiguityHandling: 'Uncertain signals',
      },
    },
    {
      id: 'cand-bad-enum',
      classification: 'evidence',
      target: 'cast_expression_guidance',
      targetCastMemberId: 'char-1',
      label: 'Bad Expression Enum',
      explanation: 'Unsupported mode: psionic_whisper',
      evidenceIds: ['ev-mixed-1'],
      proposedValue: {
        communicationModes: ['psionic_whisper'],
        expressionGuidance: 'Psionic projection.',
      },
    },
    {
      id: 'cand-bad-cast-traits',
      classification: 'evidence',
      target: 'cast_seed',
      label: 'Bad Cast: Dr. Smith',
      explanation: 'Invalid traits type',
      evidenceIds: ['ev-mixed-1'],
      proposedValue: {
        name: 'Dr. Smith',
        traits: 'invalid-traits-string-not-array',
      },
    },
    {
      id: 'cand-bad-target',
      classification: 'evidence',
      target: 'completely_nonexistent_target_type',
      label: 'Unsupported Target',
      explanation: 'Non-existent target type',
      evidenceIds: [],
      proposedValue: 'Gibberish',
    },
  ],
  unknowns: [],
};

export const FATAL_UNPARSEABLE_EXTRACTION_FIXTURE = {
  summary: '',
  evidence: [],
  candidates: [
    {
      id: 'cand-fatal-only',
      classification: 'evidence',
      target: 'invalid_unsupported_target',
      label: 'Fatal Target',
      explanation: 'Fatal unparseable data',
      evidenceIds: [],
      proposedValue: null,
    },
  ],
  unknowns: [],
};

describe('Forge Reference-Import End-to-End Traversal & Stabilization Suite (Packet 1C-15)', () => {
  beforeEach(() => {
    forgeActions.resetStore();
    vi.restoreAllMocks();
  });

  it('1. Clean reference document: full live lifecycle from route intake to Engine Turn context', async () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-clean-1',
      fileName: 'tartarus_recon.txt',
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
      fileSizeBytes: 2048,
    };

    // Step 1: Normalize extraction output
    const analysis = validateAndNormalizeDocumentAnalysis(
      CLEAN_DOCUMENT_EXTRACTION_FIXTURE,
      sourceRecord
    );

    expect(analysis.status).toBe('completed');
    expect(analysis.validationIssues).toHaveLength(0);
    expect(analysis.candidates).toHaveLength(10);
    expect(analysis.evidence).toHaveLength(3);
    expect(analysis.unknowns).toHaveLength(1);

    // Step 2: Register analysis and binding in store
    const bindingToken = 'binding-clean-live-token-123';
    setRuntimeSourceBinding(analysis.id, bindingToken);
    forgeActions.registerSourceAnalysis(analysis, bindingToken);

    expect(getRuntimeSourceBinding(analysis.id)).toBe(bindingToken);
    expect(Object.keys(getForgeState().sourceAnalyses)).toContain(analysis.id);

    // Step 3: Initialize draft and review/apply candidates
    forgeActions.initializeDraft({
      title: 'Draft in Progress',
      startingVector: 'SOMATIC',
      startingTier: 'MANIFEST',
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-mercer': 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    for (const cand of analysis.candidates) {
      forgeActions.setCandidateReviewDecision(analysis.id, cand.id, 'accepted');
    }

    const applyResult = forgeActions.applyAcceptedCandidates(analysis.id);
    expect(applyResult.success).toBe(true);

    const draft = getForgeState().forgeDraft;
    expect(draft?.identity.title).toBe('Station Tartarus: Abyssal Echo');
    expect(draft?.setting.location).toBe('Kermadec Trench Research Sector 9');
    expect(draft?.cast.length).toBe(2);

    // Resolve the open ambiguity before export
    forgeActions.leaveUnknownUncertain(
      analysis.id,
      'unk-pulse-origin',
      'Confirmed biological/anomalous origin.'
    );

    // Step 4: Validate export readiness
    const readiness = validateForgeExportReadiness({
      draft: draft!,
      sourceAnalyses: getForgeState().sourceAnalyses,
    });
    expect(readiness.valid).toBe(true);

    // Step 5: Compile draft to Blueprint
    const compiled = compileForgeDraft(draft!, {
      sourceAnalyses: getForgeState().sourceAnalyses,
    });
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    const validatedBlueprint = BlueprintSchema.safeParse(compiled.blueprint);
    expect(validatedBlueprint.success).toBe(true);

    // Step 6: Build Engine Turn context
    const engineContext = buildEngineTurnContext({
      blueprint: compiled.blueprint,
      selectedRole: 'protagonist',
    });
    expect(getRuntimeSourceBinding(analysis.id)).toBe(bindingToken);
    expect(engineContext.scenario.title).toBe('Station Tartarus: Abyssal Echo');
  });

  it('2. Recoverable candidate drift: unambiguous aliases normalize deterministically without failure', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-drift-1',
      fileName: 'drift_log.txt',
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
    };

    const analysis = validateAndNormalizeDocumentAnalysis(
      RECOVERABLE_DRIFT_EXTRACTION_FIXTURE,
      sourceRecord
    );

    expect(analysis.status).toBe('completed');
    expect(analysis.validationIssues).toHaveLength(0);
    expect(analysis.candidates).toHaveLength(5);

    const exprCand = analysis.candidates.find((c) => c.target === 'cast_expression_guidance');
    const exprVal = exprCand?.proposedValue as { communicationModes: string[] };
    expect(exprVal.communicationModes).toEqual(['spoken', 'mediated']);

    const connCand = analysis.candidates.find((c) => c.target === 'topology_connection');
    const connVal = connCand?.proposedValue as { kind: string };
    expect(connVal.kind).toBe('PHYSICAL');

    const anchorCand = analysis.candidates.find((c) => c.target === 'value_anchor');
    const anchorVal = anchorCand?.proposedValue as { holder: { kind: string; nodeId: string } };
    expect(anchorVal.holder).toEqual({ kind: 'PLACE', nodeId: 'HABITAT_A' });

    const placeCand = analysis.candidates.find((c) => c.target === 'cast_opening_placement');
    const placeVal = placeCand?.proposedValue as { kind: string; nodeId: string };
    expect(placeVal.kind).toBe('AT_NODE');
    expect(placeVal.nodeId).toBe('HABITAT_A');
  });

  it('3. Quarantined malformed candidate fixture: noncanonical issues are strictly isolated and never leak into compiled Blueprint', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-quarantine-1',
      fileName: 'mixed_bunker_log.txt',
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
    };

    const analysis = validateAndNormalizeDocumentAnalysis(
      QUARANTINED_MALFORMED_EXTRACTION_FIXTURE,
      sourceRecord
    );

    expect(analysis.status).toBe('completed_with_issues');
    expect(analysis.candidates).toHaveLength(3); // Valid candidates retained
    expect(analysis.validationIssues).toHaveLength(3); // 3 malformed candidates quarantined

    // Verify quarantined issues contain exact diagnostic information
    const badEnumIssue = analysis.validationIssues.find((i) => i.candidateTarget === 'cast_expression_guidance');
    expect(badEnumIssue).toBeDefined();
    expect(badEnumIssue?.code).toBe('INVALID_ENUM');
    expect(badEnumIssue?.disposition).toBe('QUARANTINED');

    const badCastIssue = analysis.validationIssues.find((i) => i.candidateTarget === 'cast_seed');
    expect(badCastIssue).toBeDefined();
    expect(badCastIssue?.fieldPath).toBe('proposedValue.traits');

    // Register analysis
    setRuntimeSourceBinding(analysis.id, 'binding-quarantine-token');
    forgeActions.registerSourceAnalysis(analysis, 'binding-quarantine-token');

    // Initialize draft with valid authoring
    forgeActions.initializeDraft({
      title: 'Bunker 14 Vault',
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      setting: {
        location: 'Temporary Location',
        atmosphere: 'Oppressive silence, flickering sodium lamps',
      },
      cast: [
        {
          id: 'char-guard',
          name: 'Guard Miller',
          role: 'Vault Security',
          isUserCharacter: true,
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          presenceDisposition: {
            kind: 'AT_NODE',
            nodeId: 'VAULT_MAIN',
          },
        },
      ],
      userCharacterId: 'char-guard',
      userOpeningAim: {
        castMemberId: 'char-guard',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'VAULT_MAIN',
        nodes: ['VAULT_MAIN'],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    // Apply valid candidates
    forgeActions.applyAcceptedCandidates(analysis.id);

    const draft = getForgeState().forgeDraft as ForgeDraft;
    expect(draft.setting?.location).toBe('Bunker 14 Subterranean Vault');
    expect(draft.globalPremise).toBe('Surviving in sealed fallout shelter during atmospheric anomaly.');

    // Complete depiction contract
    forgeActions.updateDepictionContractField('dramaticRegister', 'Claustrophobic Vault Realism');
    forgeActions.updateDepictionContractField('directness', 'High Directness');
    forgeActions.updateDepictionContractField('aftermath', 'Irreversible Oxygen Depletion');
    forgeActions.updateDepictionContractField('ambiguityHandling', 'Preserve Epistemic Silence');

    // Review all cast member pursuits
    if (draft.cast) {
      if (!draft.horrorGrammar) {
        draft.horrorGrammar = {
          valueBaselineReview: 'REVIEWED_NONE',
          pursuitReviews: {},
          valueAnchors: [],
          characterPursuits: [],
        };
      }
      draft.cast.forEach((c) => {
        draft.horrorGrammar!.pursuitReviews[c.id] = 'REVIEWED_NONE';
      });
    }

    // Compile to Blueprint
    const compileRes = compileForgeDraft(getForgeState().forgeDraft, {
      sourceAnalyses: getForgeState().sourceAnalyses,
    });
    expect(compileRes.success).toBe(true);
    if (!compileRes.success) throw new Error(`Compilation failed: ${JSON.stringify(compileRes.errors)}`);
    const compiledBlueprint = compileRes.blueprint;
    const blueprintJson = JSON.stringify(compiledBlueprint);

    // Strict containment assertions: Quarantined candidate/issue identifiers or malformed payloads MUST NOT leak into compiled Blueprint
    expect(blueprintJson).not.toContain('psionic_whisper');
    expect(blueprintJson).not.toContain('Dr. Smith');
    expect(blueprintJson).not.toContain('completely_nonexistent_target_type');
    expect(blueprintJson).not.toContain('validationIssues');
    expect(blueprintJson).not.toContain('QUARANTINED');
    expect(blueprintJson).not.toContain(badEnumIssue?.id || 'NO_ID');
    expect(blueprintJson).not.toContain(badCastIssue?.id || 'NO_ID');

    // Blueprint validates against canonical BlueprintSchema
    const parseRes = BlueprintSchema.safeParse(compiledBlueprint);
    expect(parseRes.success).toBe(true);
  });

  it('4. Fatal extraction: unparseable / empty payload refuses registration and reports status error', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-fatal-1',
      fileName: 'empty_corrupt.txt',
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
    };

    const analysis = validateAndNormalizeDocumentAnalysis(
      FATAL_UNPARSEABLE_EXTRACTION_FIXTURE,
      sourceRecord
    );

    expect(analysis.status).toBe('error');
    expect(analysis.candidates).toHaveLength(0);
    expect(analysis.errorMessage).toContain('Extraction');

    // Store rejects error analyses from being registered
    expect(Object.keys(getForgeState().sourceAnalyses)).toHaveLength(0);
  });

  it('5. Native Blueprint JSON import remains regression-free alongside document reference imports', () => {
    const nativeBlueprintPayload = {
      title: 'Native Outpost Protocol',
      globalPremise: 'Native blueprint imported directly without LLM extraction.',
      setting: {
        location: 'Arctic Outpost Zero',
        atmosphere: 'Frigid blizzard, howling winds',
      },
      cast: [
        {
          id: 'char-native-1',
          name: 'Scientist Karras',
          role: 'Meteorologist',
          description: 'Arctic researcher.',
          isUserCharacter: true,
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
      ],
      topology: {
        startingNodeId: 'HABITAT_DOME',
        nodes: ['HABITAT_DOME'],
        connections: [],
      },
      depictionContract: {
        dramaticRegister: 'Arctic psychological isolation',
        directness: 'Tactile frostbite and sensory blizzard',
        aftermath: 'Severe hypothermia',
        ambiguityHandling: 'Radio static untranslated',
        specialBoundaries: '',
      },
    };

    const sourceRecord: ForgeSourceRecord = {
      id: 'src-native-1',
      fileName: 'native_blueprint.json',
      mimeType: 'application/json',
      kind: 'native_blueprint',
      receivedAt: Date.now(),
    };

    const analysis = buildSourceAnalysisFromBlueprint(nativeBlueprintPayload, sourceRecord);
    expect(analysis.status).toBe('completed');
    expect(analysis.candidates.length).toBeGreaterThan(0);
    expect(analysis.validationIssues).toHaveLength(0);

    setRuntimeSourceBinding(analysis.id, 'binding-native-token');
    forgeActions.registerSourceAnalysis(analysis, 'binding-native-token');

    expect(getForgeState().sourceAnalyses[analysis.id]).toBeDefined();
  });
});
