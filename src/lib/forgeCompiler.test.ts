import { describe, it, expect } from 'vitest';
import {
  compileForgeDraft,
  compileForgeDraftOrThrow,
  validateForgeDraft,
  ForgeCompilationError,
} from './forgeCompiler';
import { ForgeDraft } from '../types/forge';

describe('forgeCompiler Voice & Acoustic Dossier Compilation', () => {
  const baseValidDraft: ForgeDraft = {
    id: 'draft-mortuary-voice',
    title: 'The Black Iron Mortuary',
    premise: 'A quarantined subterranean mortuary where the dead whisper through copper drains.',
    globalPremise: 'A quarantined subterranean mortuary where the dead whisper through copper drains.',
    identity: {
      title: 'The Black Iron Mortuary',
      version: '1.0',
      author: 'Acoustic Archivist',
      thematicAnchor: 'Somatopsychic acoustic terror',
    },
    setting: {
      location: 'Black Iron Subterranean Complex',
      atmosphere: 'Sulfurous cold and hum of copper conduit pipes',
      timePeriod: '1948 Post-War Quarantine',
    },
    startingVector: 'SOMATIC',
    startingTier: 'GATEWAY',
    topology: {
      startingNodeId: 'AUTOPSY_THEATRE',
      nodes: ['AUTOPSY_THEATRE', 'DRAINAGE_CRYPT', 'REFRIGERATION_VAULT'],
      nodeDefinitions: [
        {
          id: 'AUTOPSY_THEATRE',
          label: 'Autopsy Theatre',
          description: 'Surgical amphitheatre lined with tiered slate seats and blood drains.',
        },
        {
          id: 'DRAINAGE_CRYPT',
          label: 'Drainage Crypt',
          description: 'Low-ceilinged sump collecting wash-off from the zinc tables.',
        },
        {
          id: 'REFRIGERATION_VAULT',
          label: 'Refrigeration Vault',
          description: 'Heavy insulated steel doors humming with ammonia coolant.',
        },
      ],
      connections: [
        { from: 'AUTOPSY_THEATRE', to: 'DRAINAGE_CRYPT', kind: 'PHYSICAL' },
        { from: 'DRAINAGE_CRYPT', to: 'REFRIGERATION_VAULT', kind: 'PHYSICAL' },
      ],
      anchors: [],
    },
    depictionContract: {
      dramaticRegister: 'Somatopsychic dread grounded in physical pathology',
      directness: 'Visceral surgical and acoustic directness within subterranean chambers',
      aftermath: 'Irreversible necrotic contamination and sensory rot',
      ambiguityHandling: 'Preserve mechanical acoustic provenance without explaining origin',
      specialBoundaries: 'None',
    },
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED_NONE',
      valueAnchors: [],
      characterPursuits: [],
      pursuitReviews: {
        'char-ross': 'REVIEWED_NONE',
        'char-holt': 'REVIEWED_NONE',
        'char-entity-41': 'REVIEWED_NONE',
      },
    },
    cast: [
      {
        id: 'char-ross',
        name: 'Dr. Ross',
        role: 'Chief Pathologist',
        description: 'Exhausted medical officer documenting anomalies under surgical lights.',
        isUserCharacter: false,
        isEntity: false,
        behaviorVector: 'ADAPTIVE',
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'AUTOPSY_THEATRE' },
        starting_location: 'AUTOPSY_THEATRE',
        traits: ['Hyper-Vigilance', 'Somatic Tremor'],
        goals: 'Isolate the resonant frequency in the bone marrow',
        personality: 'Fastidious, speaks only to clarify autopsy findings',
        psychological_status: 'Tremor in surgical hands when sound stops',
        expressionProfile: {
          communicationModes: ['spoken', 'mediated'],
          expressionGuidance: 'Precise clinical cadence, speaking into overhead dictation microphone.',
          silenceGuidance: 'Falls abruptly silent when background hum shifts pitch.',
          cadenceNotes: 'Rapid, clipped terminal clauses; breath inhalations caught mid-throat.',
          voiceTone: 'Dry academic gravel with strained vocal cord compression.',
          vocalTells: ['swallows dryly between incisions', 'sibilant whistling on s-sounds'],
          lexiconNotes: 'Rigid anatomical terminology, refuses colloquial descriptors.',
          camouflageLeakGuidance:
            'When panic breaches threshold, clinical vocabulary dissolves into rhythmic counting.',
        },
      },
      {
        id: 'char-holt',
        name: 'Officer Holt',
        role: 'Quarantine Guard',
        description: 'Sentry stationed at the decontamination bulkhead.',
        isUserCharacter: false,
        isEntity: false,
        behaviorVector: 'INSURGENT',
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'DRAINAGE_CRYPT' },
        starting_location: 'DRAINAGE_CRYPT',
        traits: ['Paranoia', 'Claustrophobia'],
        goals: 'Prevent any specimen from ascending the hoist',
        personality: 'Gripping service revolver through rubberized glove',
        psychological_status: 'Ear canals bleeding from subsonic resonance',
        // Holt has NO expression profile to test graceful defaults
      },
      {
        id: 'char-entity-41',
        name: 'Entity-41',
        role: 'Acoustic Aberration',
        description: 'Translucent vibrational mass vibrating within the drainage grates.',
        isUserCharacter: false,
        isEntity: true,
        behaviorVector: 'ADAPTIVE',
        presenceDisposition: { kind: 'NONLOCAL' },
        traits: ['Epistemic Dread'],
        goals: 'Mimic human vocal registers to draw personnel deeper into the drains',
        expressionProfile: {
          communicationModes: ['nonverbal', 'mediated'],
          expressionGuidance: 'Echoing playback of dead crew members through ventilation ducting.',
          silenceGuidance: 'Complete sonic vacuum preceding a pressure stroke.',
          cadenceNotes: 'Erratic tempo shifting from 0.5x crawl to 3x hyper-speed.',
          voiceTone: 'Metallic tape-decay distortion with resonant room flutter.',
          vocalTells: ['splices phonemes unnaturally', 'reproduces dead relatives radio calls'],
          lexiconNotes: 'Fragmentary quotes extracted from historical mortuary logs.',
          camouflageLeakGuidance:
            'Acoustic mask tears during visceral climax to reveal deafening pressurized steam hiss.',
        },
      },
    ],
  };

  it('compiles a Forge draft and preserves all authored Voice & Acoustic Dossier fields', () => {
    const result = compileForgeDraft(baseValidDraft);
    expect(result.success).toBe(true);
    expect(result.blueprint).toBeDefined();

    const compiledCast = result.blueprint?.cast;
    expect(compiledCast).toHaveLength(3);

    // Dr. Ross voice dossier verification
    const ross = compiledCast?.find((c) => c.id === 'char-ross');
    expect(ross).toBeDefined();
    expect(ross?.expressionProfile).toEqual({
      communicationModes: ['spoken', 'mediated'],
      expressionGuidance: 'Precise clinical cadence, speaking into overhead dictation microphone.',
      silenceGuidance: 'Falls abruptly silent when background hum shifts pitch.',
      cadenceNotes: 'Rapid, clipped terminal clauses; breath inhalations caught mid-throat.',
      voiceTone: 'Dry academic gravel with strained vocal cord compression.',
      vocalTells: ['swallows dryly between incisions', 'sibilant whistling on s-sounds'],
      lexiconNotes: 'Rigid anatomical terminology, refuses colloquial descriptors.',
      camouflageLeakGuidance:
        'When panic breaches threshold, clinical vocabulary dissolves into rhythmic counting.',
    });

    // Officer Holt (no expression profile) verification
    const holt = compiledCast?.find((c) => c.id === 'char-holt');
    expect(holt).toBeDefined();
    expect(holt?.expressionProfile).toBeUndefined();

    // Entity-41 voice dossier verification
    const entity = compiledCast?.find((c) => c.id === 'char-entity-41');
    expect(entity).toBeDefined();
    expect(entity?.expressionProfile).toEqual({
      communicationModes: ['nonverbal', 'mediated'],
      expressionGuidance: 'Echoing playback of dead crew members through ventilation ducting.',
      silenceGuidance: 'Complete sonic vacuum preceding a pressure stroke.',
      cadenceNotes: 'Erratic tempo shifting from 0.5x crawl to 3x hyper-speed.',
      voiceTone: 'Metallic tape-decay distortion with resonant room flutter.',
      vocalTells: ['splices phonemes unnaturally', 'reproduces dead relatives radio calls'],
      lexiconNotes: 'Fragmentary quotes extracted from historical mortuary logs.',
      camouflageLeakGuidance:
        'Acoustic mask tears during visceral climax to reveal deafening pressurized steam hiss.',
    });
  });

  it('compiles minimal expression profile with default vocalTells: []', () => {
    const minimalDraft: ForgeDraft = {
      ...baseValidDraft,
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        valueAnchors: [],
        characterPursuits: [],
        pursuitReviews: {
          'char-minimal': 'REVIEWED_NONE',
        },
      },
      cast: [
        {
          id: 'char-minimal',
          name: 'Surgeon Bell',
          role: 'Surgeon',
          description: 'Junior autopsy prosector.',
          isUserCharacter: false,
          isEntity: false,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'AUTOPSY_THEATRE' },
          expressionProfile: {
            communicationModes: ['spoken'],
            expressionGuidance: 'Subdued whispering.',
          },
        },
      ],
    };

    const result = compileForgeDraft(minimalDraft);
    expect(result.success).toBe(true);

    const compiledBell = result.blueprint?.cast[0];
    expect(compiledBell?.expressionProfile).toEqual({
      communicationModes: ['spoken'],
      expressionGuidance: 'Subdued whispering.',
    });
  });

  it('compileForgeDraftOrThrow returns deeply frozen artifact with compiled blueprint', () => {
    const artifact = compileForgeDraftOrThrow(baseValidDraft);
    expect(artifact).toBeDefined();
    expect(artifact.blueprint).toBeDefined();
    expect(artifact.fileName).toContain('mortuary');
    expect(Object.isFrozen(artifact)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint)).toBe(true);
  });

  it('rejects invalid cast member names (empty, whitespace, or banned cliches)', () => {
    const emptyNameDraft: ForgeDraft = {
      ...baseValidDraft,
      cast: [
        {
          id: 'char-empty',
          name: '   ',
          description: 'Empty name test.',
        },
      ],
    };
    const validationEmpty = validateForgeDraft(emptyNameDraft);
    expect(validationEmpty.valid).toBe(false);
    expect(validationEmpty.errors['cast[0].name']).toBeDefined();

    const bannedNameDraft: ForgeDraft = {
      ...baseValidDraft,
      cast: [
        {
          id: 'char-cliche',
          name: 'Arthur Penhaligon',
          description: 'Cliché name test.',
        },
      ],
    };
    const validationBanned = validateForgeDraft(bannedNameDraft);
    expect(validationBanned.valid).toBe(false);
    expect(validationBanned.errors['cast[0].name']).toBeDefined();
    expect(validationBanned.errors['cast[0].name'][0]).toContain('Banned AI cliché name');
  });

  it('throws ForgeCompilationError when compileForgeDraftOrThrow is called with invalid draft', () => {
    const brokenDraft = {
      ...baseValidDraft,
      cast: [],
    };
    expect(() => compileForgeDraftOrThrow(brokenDraft)).toThrow(ForgeCompilationError);
  });
});
