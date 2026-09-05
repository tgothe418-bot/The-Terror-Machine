import { describe, it, expect } from 'vitest';
import {
  compileForgeDraft,
  deriveDefaultDepictionContract,
} from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import { ForgeDraft, ForgeSourceAnalysis } from '../types/forge';
import { BlueprintSchema } from '../types';

describe('Packet 1D-5: Automatic Depiction Contract & One-Action Export', () => {
  const createValidBaseDraft = (): ForgeDraft => ({
    id: 'draft-depiction-test',
    title: 'Echoes of the Abyss',
    premise: 'Deep benthic research station anomaly.',
    globalPremise: 'Deep benthic research station anomaly.',
    identity: {
      title: 'Echoes of the Abyss',
      version: '1.0',
      author: 'Atmosphere Specialist',
      thematicAnchor: 'Hydrostatic pressure and epistemic void',
    },
    setting: {
      location: 'Challenger Node 7',
      atmosphere: 'Crushing ambient depth, rhythmic hull creaks',
      timePeriod: '2099',
    },
    startingVector: 'SOMATIC',
    startingTier: 'LATENT',
    topology: {
      nodeDefinitions: [
        { id: 'HAB_MODULE', label: 'Habitation Module', description: 'Living quarters' },
        { id: 'DRILL_CHAMBER', label: 'Drill Chamber', description: 'Benthic drill rig' },
      ],
      nodes: ['HAB_MODULE', 'DRILL_CHAMBER'],
      connections: [],
    },
    cast: [
      {
        id: 'char-eva',
        name: 'Dr. Eva Cross',
        role: 'PROTAGONIST',
        isEntity: false,
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'HAB_MODULE' },
      },
    ],
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED_NONE',
      pursuitReviews: {
        'char-eva': 'REVIEWED_NONE',
      },
      valueAnchors: [],
      characterPursuits: [],
    },
  });

  it('automatically derives default depiction contract when fields are omitted', () => {
    const draft = createValidBaseDraft();
    delete (draft as Record<string, unknown>).depictionContract;

    const derived = deriveDefaultDepictionContract(draft);
    expect(derived.dramaticRegister).toContain('Hydrostatic pressure and epistemic void');
    expect(derived.directness).toContain('Challenger Node 7');
    expect(derived.aftermath).toContain('Irreversible');
    expect(derived.ambiguityHandling).toContain('epistemic gaps');

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    expect(compiled.blueprint.depictionContract.dramaticRegister).toBe(derived.dramaticRegister);
    expect(compiled.blueprint.depictionContract.directness).toBe(derived.directness);
    expect(compiled.blueprint.depictionContract.aftermath).toBe(derived.aftermath);
    expect(compiled.blueprint.depictionContract.ambiguityHandling).toBe(derived.ambiguityHandling);
  });

  it('preserves authored depiction contract fields when provided', () => {
    const draft = createValidBaseDraft();
    draft.depictionContract = {
      dramaticRegister: 'Submersible clinical horror',
      directness: 'Brutal acoustic shockwaves',
      aftermath: 'Eardrum rupture and nitrogen narcosis',
      ambiguityHandling: 'Sonar signals remain untranslated',
      specialBoundaries: 'No physical escape',
    };

    const compiled = compileForgeDraft(draft);
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    expect(compiled.blueprint.depictionContract.dramaticRegister).toBe('Submersible clinical horror');
    expect(compiled.blueprint.depictionContract.directness).toBe('Brutal acoustic shockwaves');
    expect(compiled.blueprint.depictionContract.aftermath).toBe('Eardrum rupture and nitrogen narcosis');
    expect(compiled.blueprint.depictionContract.ambiguityHandling).toBe('Sonar signals remain untranslated');
    expect(compiled.blueprint.depictionContract.specialBoundaries).toBe('No physical escape');
  });

  it('atomically projects accepted staged candidates on export without manual repair', () => {
    const draft = createValidBaseDraft();

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'src-staged-1',
      sourceRecord: {
        id: 'src-rec-1',
        fileName: 'drill_manifest.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
      },
      summary: 'Drill telemetry',
      candidates: [
        {
          id: 'cand-loc-1',
          sourceId: 'src-staged-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Updated Setting Location',
          explanation: 'Extracted drill platform location',
          evidenceIds: ['ev-1'],
          proposedValue: 'Trench Abyss Core Platform',
          reviewDecision: 'accepted',
          applicationState: 'staged', // Staged, not yet manually applied
        },
        {
          id: 'cand-char-1',
          sourceId: 'src-staged-1',
          classification: 'evidence',
          target: 'cast_seed',
          label: 'New Cast Member',
          explanation: 'Extracted diving specialist',
          evidenceIds: ['ev-2'],
          proposedValue: {
            id: 'char-diver',
            name: 'Specialist Ren',
            description: 'Diving specialist',
            role: 'SENTINEL',
            personality: 'Pragmatic',
            goals: 'Survive the dive',
            traits: ['methodical'],
            behaviorVector: 'cautious',
            isEntity: false,
            isUserCharacter: false,
            presenceDisposition: { kind: 'AT_NODE', nodeId: 'DRILL_CHAMBER' },
          },
          reviewDecision: 'accepted',
          applicationState: 'staged', // Staged, not yet manually applied
        },
      ],
      evidence: [
        { id: 'ev-1', sourceId: 'src-staged-1', category: 'setting', claim: 'Core platform' },
        { id: 'ev-2', sourceId: 'src-staged-1', category: 'cast', claim: 'Ren on watch' },
      ],
      unknowns: [],
      status: 'completed',
    };

    // Staged accepted candidates do not block export readiness
    const readiness = validateForgeExportReadiness({
      draft,
      sourceAnalyses: { 'src-staged-1': mockAnalysis },
    });
    expect(readiness.valid).toBe(true);
    expect(readiness.sourceSummary.candidateStagedAccepted).toBe(2);

    // Compilation atomically projects staged accepted candidates into output blueprint
    const compiled = compileForgeDraft(draft, {
      sourceAnalyses: { 'src-staged-1': mockAnalysis },
    });
    expect(compiled.success).toBe(true);
    if (!compiled.success) return;

    expect(compiled.blueprint.setting.location).toBe('Trench Abyss Core Platform');
    expect(compiled.blueprint.cast.some((c) => c.name === 'Specialist Ren')).toBe(true);

    const schemaValidated = BlueprintSchema.safeParse(compiled.blueprint);
    expect(schemaValidated.success).toBe(true);
  });

  describe('Packet 1E-1: Perspective-Neutral Export and Default Closure', () => {
    it('valid source import fills all canonical depiction fields and exports without manual depiction editing', () => {
      const draft = createValidBaseDraft();
      // Set canonical depiction contract from source import
      draft.depictionContract = {
        dramaticRegister: 'Deep oceanic isolation and epistemic dread',
        directness: 'High direct sensory immersion',
        aftermath: 'Severe trauma and structural hull compromise',
        ambiguityHandling: 'Deep hydrothermal vent signals remain untranslated',
        specialBoundaries: '',
      };

      const readiness = validateForgeExportReadiness({ draft });
      expect(readiness.valid).toBe(true);

      const compiled = compileForgeDraft(draft);
      expect(compiled.success).toBe(true);
      if (!compiled.success) return;

      expect(compiled.blueprint.depictionContract.dramaticRegister).toBe('Deep oceanic isolation and epistemic dread');
      expect(compiled.blueprint.depictionContract.directness).toBe('High direct sensory immersion');
      expect(compiled.blueprint.depictionContract.aftermath).toBe('Severe trauma and structural hull compromise');
      expect(compiled.blueprint.depictionContract.ambiguityHandling).toBe('Deep hydrothermal vent signals remain untranslated');
    });

    it('source-derived character pursuits satisfy export review without Set Pursuit interaction', () => {
      const draft = createValidBaseDraft();
      draft.depictionContract = {
        dramaticRegister: 'Deep oceanic isolation and epistemic dread',
        directness: 'High direct sensory immersion',
        aftermath: 'Severe trauma and structural hull compromise',
        ambiguityHandling: 'Deep hydrothermal vent signals remain untranslated',
        specialBoundaries: '',
      };

      // Cast member with source-derived character pursuit
      draft.cast = [
        {
          id: 'char-eva',
          name: 'Dr. Eva Cross',
          role: 'Lead Biologist',
          isEntity: false,
          isUserCharacter: false,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'HAB_MODULE' },
        },
      ];

      draft.horrorGrammar = {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-eva': 'REVIEWED',
        },
        valueAnchors: [],
        characterPursuits: [
          {
            id: 'pursuit-eva-1',
            castMemberId: 'char-eva',
            objective: 'Collect hydrothermal vent sample',
            presentApproach: 'Calibrating robotic arm in airlock',
            status: 'ACTIVE',
            reviewWindow: 'SCENE_BEAT',
            triggerReferences: [],
            basisSummary: 'Mission log entry',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
      };

      const readiness = validateForgeExportReadiness({ draft });
      expect(readiness.valid).toBe(true);

      const compiled = compileForgeDraft(draft);
      expect(compiled.success).toBe(true);
      if (!compiled.success) return;

      expect(compiled.blueprint.horrorGrammar?.characterPursuits).toHaveLength(1);
      expect(compiled.blueprint.horrorGrammar?.characterPursuits?.[0].objective).toBe('Collect hydrothermal vent sample');
    });

    it('compiled Blueprint remains perspective-neutral with all isUserCharacter flags false and no userCharacterId, userOpeningAim, or startingNodeId', () => {
      const draft = createValidBaseDraft();
      draft.depictionContract = {
        dramaticRegister: 'Deep oceanic isolation and epistemic dread',
        directness: 'High direct sensory immersion',
        aftermath: 'Severe trauma and structural hull compromise',
        ambiguityHandling: 'Deep hydrothermal vent signals remain untranslated',
        specialBoundaries: '',
      };

      draft.cast = [
        {
          id: 'char-1',
          name: 'Officer A',
          role: 'SENTINEL',
          isEntity: false,
          isUserCharacter: false,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'HAB_MODULE' },
        },
        {
          id: 'char-2',
          name: 'Officer B',
          role: 'ENGINEER',
          isEntity: false,
          isUserCharacter: false,
          presenceDisposition: { kind: 'OFFSTAGE' },
        },
      ];

      draft.horrorGrammar = {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-1': 'REVIEWED_NONE',
          'char-2': 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      };

      // Ensure draft has no global startingNodeId, userCharacterId, or userOpeningAim
      delete (draft as Record<string, unknown>).userCharacterId;
      delete (draft as Record<string, unknown>).userOpeningAim;
      if (draft.topology) {
        delete (draft.topology as Record<string, unknown>).startingNodeId;
      }

      const compiled = compileForgeDraft(draft);
      expect(compiled.success).toBe(true);
      if (!compiled.success) return;

      const bp = compiled.blueprint;
      expect(bp.topology.startingNodeId).toBeUndefined();
      expect(bp.userCharacterId).toBeUndefined();
      expect(bp.userOpeningAim).toBeUndefined();

      // All cast members must have isUserCharacter: false
      for (const char of bp.cast) {
        expect(char.isUserCharacter).toBe(false);
      }

      const validated = BlueprintSchema.safeParse(bp);
      expect(validated.success).toBe(true);
    });

    describe('Packet 07: Depiction Contract Preservation Through Export', () => {
      it('compileForgeDraft protects complete authored depiction contract even if candidate is staged', () => {
        const draft = createValidBaseDraft();
        draft.depictionContract = {
          dramaticRegister: 'Authored Claustrophobic Reg',
          directness: 'Authored Sensory Directness',
          aftermath: 'Authored Irreversible Aftermath',
          ambiguityHandling: 'Authored Epistemic Silence',
          specialBoundaries: 'Authored Boundaries',
        };

        const mockAnalysis: ForgeSourceAnalysis = {
          id: 'src-analysis-depiction',
          sourceRecord: {
            id: 'rec-1',
            fileName: 'manifest.json',
            mimeType: 'application/json',
            kind: 'native_blueprint',
            receivedAt: Date.now(),
          },
          summary: 'Imported analysis',
          candidates: [
            {
              id: 'cand-dep-staged',
              sourceId: 'src-analysis-depiction',
              classification: 'evidence',
              target: 'depiction_contract',
              label: 'Imported Depiction',
              explanation: 'Imported tone',
              evidenceIds: [],
              proposedValue: {
                dramaticRegister: 'Imported Dread',
                directness: 'Imported Danger',
                aftermath: 'Imported Consequences',
                ambiguityHandling: 'Imported Ambiguity',
                specialBoundaries: '',
              },
              reviewDecision: 'accepted',
              applicationState: 'staged',
            },
          ],
          evidence: [],
          unknowns: [],
          status: 'completed',
        };

        const compiled = compileForgeDraft(draft, {
          sourceAnalyses: { 'src-analysis-depiction': mockAnalysis },
        });

        expect(compiled.success).toBe(true);
        if (!compiled.success) return;

        // Authored contract remains intact
        expect(compiled.blueprint.depictionContract.dramaticRegister).toBe('Authored Claustrophobic Reg');
        expect(compiled.blueprint.depictionContract.directness).toBe('Authored Sensory Directness');
        expect(compiled.blueprint.depictionContract.aftermath).toBe('Authored Irreversible Aftermath');
        expect(compiled.blueprint.depictionContract.ambiguityHandling).toBe('Authored Epistemic Silence');
      });

      it('compileForgeDraft applies staged depiction candidate when authored depiction is missing or partial', () => {
        const draft = createValidBaseDraft();
        delete (draft as Record<string, unknown>).depictionContract;

        const mockAnalysis: ForgeSourceAnalysis = {
          id: 'src-analysis-depiction-2',
          sourceRecord: {
            id: 'rec-2',
            fileName: 'manifest.json',
            mimeType: 'application/json',
            kind: 'native_blueprint',
            receivedAt: Date.now(),
          },
          summary: 'Imported analysis',
          candidates: [
            {
              id: 'cand-dep-staged-2',
              sourceId: 'src-analysis-depiction-2',
              classification: 'evidence',
              target: 'depiction_contract',
              label: 'Imported Depiction',
              explanation: 'Imported tone',
              evidenceIds: [],
              proposedValue: {
                dramaticRegister: 'Imported Dread',
                directness: 'Imported Danger',
                aftermath: 'Imported Consequences',
                ambiguityHandling: 'Imported Ambiguity',
                specialBoundaries: '',
              },
              reviewDecision: 'accepted',
              applicationState: 'staged',
            },
          ],
          evidence: [],
          unknowns: [],
          status: 'completed',
        };

        const compiled = compileForgeDraft(draft, {
          sourceAnalyses: { 'src-analysis-depiction-2': mockAnalysis },
        });

        expect(compiled.success).toBe(true);
        if (!compiled.success) return;

        // Imported contract populates missing contract
        expect(compiled.blueprint.depictionContract.dramaticRegister).toBe('Imported Dread');
        expect(compiled.blueprint.depictionContract.directness).toBe('Imported Danger');
      });

      it('superseded candidate is ignored during compilation and export readiness validation', () => {
        const draft = createValidBaseDraft();
        draft.depictionContract = {
          dramaticRegister: 'Authored Claustrophobic Reg',
          directness: 'Authored Sensory Directness',
          aftermath: 'Authored Irreversible Aftermath',
          ambiguityHandling: 'Authored Epistemic Silence',
          specialBoundaries: 'Authored Boundaries',
        };

        const mockAnalysis: ForgeSourceAnalysis = {
          id: 'src-analysis-depiction-3',
          sourceRecord: {
            id: 'rec-3',
            fileName: 'manifest.json',
            mimeType: 'application/json',
            kind: 'native_blueprint',
            receivedAt: Date.now(),
          },
          summary: 'Imported analysis',
          candidates: [
            {
              id: 'cand-dep-superseded',
              sourceId: 'src-analysis-depiction-3',
              classification: 'evidence',
              target: 'depiction_contract',
              label: 'Imported Depiction',
              explanation: 'Imported tone',
              evidenceIds: [],
              proposedValue: {
                dramaticRegister: 'Superseded Tone',
                directness: 'Superseded Directness',
                aftermath: 'Superseded Aftermath',
                ambiguityHandling: 'Superseded Ambiguity',
                specialBoundaries: '',
              },
              reviewDecision: 'accepted',
              applicationState: 'superseded',
            },
          ],
          evidence: [],
          unknowns: [],
          status: 'completed',
        };

        const readiness = validateForgeExportReadiness({
          draft,
          sourceAnalyses: { 'src-analysis-depiction-3': mockAnalysis },
        });
        expect(readiness.valid).toBe(true);
        expect(readiness.sourceSummary.candidateSuperseded).toBe(1);
        expect(readiness.sourceSummary.candidateStagedAccepted).toBe(0);

        const compiled = compileForgeDraft(draft, {
          sourceAnalyses: { 'src-analysis-depiction-3': mockAnalysis },
        });
        expect(compiled.success).toBe(true);
        if (!compiled.success) return;

        expect(compiled.blueprint.depictionContract.dramaticRegister).toBe('Authored Claustrophobic Reg');
      });
    });
  });
});
