import { describe, it, expect } from 'vitest';
import { EngineTurnContextSchema } from '../types/engineContract';
import {
  buildAuditoryContext,
  validateAndNormalizeVocalization,
  formatVocalizationPromptDirective,
  isRecognizedAmbientSpeaker,
} from './vocalizationEngine';

describe('vocalizationEngine', () => {
  const baseContext = EngineTurnContextSchema.parse({
    scenario: {
      title: 'Sub-Level 4 Research Lab',
      premise: 'Isolated containment deep underground.',
      worldRules: ['Atmospheric pressure differentials apply.'],
      setting: {
        location: 'Containment Control Hub',
        atmosphere: 'Oppressive cold, distant pipe groans',
        timePeriod: '1987',
      },
    },
    player: {
      role: 'protagonist',
      characterId: 'char-aria',
      name: 'Dr. Aria Bell',
      description: 'Senior research director.',
      isEntity: false,
    },
    cast: [
      {
        id: 'char-aria',
        name: 'Dr. Aria Bell',
        role: 'Protagonist',
        description: 'Lead researcher.',
        isUserCharacter: true,
        isEntity: false,
        expressionProfile: {
          communicationModes: ['spoken'],
          expressionGuidance: 'Precise and controlled.',
        },
      },
      {
        id: 'char-jules',
        name: 'Jules Mercer',
        role: 'Technician',
        description: 'Systems engineer trapped in duct maintenance.',
        isUserCharacter: false,
        isEntity: false,
        isPresent: true,
        expressionProfile: {
          communicationModes: ['spoken', 'mediated'],
          expressionGuidance: 'Nervous staccato cadence.',
        },
      },
      {
        id: 'char-marcus',
        name: 'Dr. Marcus Sterling',
        role: 'Biologist',
        description: 'Lead pathologist behind the reinforced observation port.',
        isUserCharacter: false,
        isEntity: false,
        isPresent: false,
        expressionProfile: {
          communicationModes: ['spoken'],
          expressionGuidance: 'Cold clinical detachment.',
        },
      },
      {
        id: 'char-mute-specimen',
        name: 'Specimen 9',
        role: 'Anomaly',
        description: 'Chittering bio-mass.',
        isUserCharacter: false,
        isEntity: true,
        isPresent: true,
        expressionProfile: {
          communicationModes: ['nonverbal'],
          expressionGuidance: 'Wet clicking and throat-vibrations.',
        },
      },
    ],
    topology: {
      currentNodeId: 'node-hub',
      readableNodeLabel: 'Containment Control Hub (Observation Port to Holding Cell)',
      allowedOutgoingExits: [
        {
          from: 'node-hub',
          to: 'node-cell',
          kind: 'PHYSICAL',
          requires: ['airlock-keycard'],
          userInitiated: true,
        },
      ],
    },
    runtime: {
      phase: 'LATENT',
      tension: 0,
      coherence: 1.0,
      reconciliationRevision: 0,
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      activeFlags: [],
      turnNumber: 0,
    },
  });

  describe('buildAuditoryContext', () => {
    it('accurately categorizes co-present vs elsewhere characters and solitary status', () => {
      const auditory = buildAuditoryContext(baseContext);

      expect(auditory.isSolitary).toBe(false);
      expect(auditory.presentSpeakerNames).toEqual(['Jules Mercer']);
      expect(auditory.coPresentCharacters.map((c) => c.name)).toContain('Jules Mercer');
      expect(auditory.coPresentCharacters.map((c) => c.name)).toContain('Specimen 9');
      expect(auditory.adjacentOrElsewhereCharacters.map((c) => c.name)).toContain('Dr. Marcus Sterling');
      expect(auditory.hasActiveRemoteChannel).toBe(false);
      expect(auditory.hasAcousticTopologyLinks).toBe(true);
      expect(auditory.detectedAcousticLinkMedium).toBe('port_observation');
    });

    it('detects solitary condition when no speaking companions are present', () => {
      const solitaryContext = EngineTurnContextSchema.parse({
        ...baseContext,
        cast: baseContext.cast.map((c) =>
          c.id === 'char-jules' ? { ...c, isPresent: false } : c
        ),
      });

      const auditory = buildAuditoryContext(solitaryContext);
      // Jules is absent, and Specimen 9 is nonverbal only, so solitary is true
      expect(auditory.isSolitary).toBe(true);
      expect(auditory.presentSpeakerNames).toHaveLength(0);
    });

    it('detects active remote communication channels from user action or history', () => {
      const radioAuditory = buildAuditoryContext(
        baseContext,
        'I speak into my walkie radio: Jules, do you copy?'
      );
      expect(radioAuditory.hasActiveRemoteChannel).toBe(true);
      expect(radioAuditory.remoteChannelMedium).toBe('radio');

      const intercomAuditory = buildAuditoryContext(
        baseContext,
        'I press the intercom button on the security console.'
      );
      expect(intercomAuditory.hasActiveRemoteChannel).toBe(true);
      expect(intercomAuditory.remoteChannelMedium).toBe('intercom');

      const historyAuditory = buildAuditoryContext(
        baseContext,
        'What was that sound?',
        [
          { role: 'user', content: 'I dial the internal telephone line.' },
          { role: 'assistant', content: 'Static clicks across the receiver.' },
        ]
      );
      expect(historyAuditory.hasActiveRemoteChannel).toBe(true);

      const hungUpAuditory = buildAuditoryContext(
        baseContext,
        'I hang up the phone receiver.',
        [
          { role: 'user', content: 'I dial the internal telephone line.' },
          { role: 'assistant', content: 'Static clicks across the receiver.' },
        ]
      );
      expect(hungUpAuditory.hasActiveRemoteChannel).toBe(false);
    });

    it('identifies cast arrivals from arrivedCastIds', () => {
      const arrivalSet = new Set(['char-marcus']);
      const auditory = buildAuditoryContext(
        baseContext,
        'I wait by the vault door.',
        undefined,
        arrivalSet
      );
      expect(auditory.hasArrivals).toBe(true);
      expect(auditory.arrivedCastIds.has('char-marcus')).toBe(true);
    });
  });

  describe('validateAndNormalizeVocalization', () => {
    it('allows internal monologue for player character and normalizes medium to internal and target to self', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'internal_monologue',
          speaker: 'Dr. Aria Bell',
          content: 'Dr. Aria Bell: If the seals rupture, none of us survive.',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(1);
      expect(normalizedBlocks[0]).toMatchObject({
        type: 'internal_monologue',
        speaker: 'Dr. Aria Bell',
        medium: 'internal',
        target: 'self',
        content: 'If the seals rupture, none of us survive.',
      });
    });

    it('allows internal monologue for companion character without requiring co-presence', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'internal_monologue',
          speaker: 'Dr. Marcus Sterling',
          content: 'Dr. Marcus Sterling: "The antigen is failing."',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(1);
      expect(normalizedBlocks[0]).toMatchObject({
        type: 'internal_monologue',
        speaker: 'Dr. Marcus Sterling',
        medium: 'internal',
        target: 'self',
        content: 'The antigen is failing.',
      });
    });

    it('allows solitary character muttering/soliloquy when alone', () => {
      const solitaryContext = EngineTurnContextSchema.parse({
        ...baseContext,
        cast: baseContext.cast.map((c) =>
          c.id === 'char-jules' ? { ...c, isPresent: false } : c
        ),
      });
      const auditory = buildAuditoryContext(solitaryContext);

      // Soliloquy block
      const blocks = [
        {
          type: 'soliloquy',
          speaker: 'Dr. Aria Bell',
          content: 'Dr. Aria Bell: Just breathe. Keep your hands steady.',
        },
      ];
      const res1 = validateAndNormalizeVocalization(blocks, auditory);
      expect(res1.error).toBeNull();
      expect(res1.normalizedBlocks[0]).toMatchObject({
        type: 'soliloquy',
        speaker: 'Dr. Aria Bell',
        delivery: 'mutter',
        target: 'self',
        content: 'Just breathe. Keep your hands steady.',
      });

      // Player speech emitted as dialogue when solitary auto-normalizes to soliloquy
      const dialogueBlocks = [
        {
          type: 'dialogue',
          speaker: 'Dr. Aria Bell',
          content: 'There has to be a secondary bypass valve.',
        },
      ];
      const res2 = validateAndNormalizeVocalization(dialogueBlocks, auditory);
      expect(res2.error).toBeNull();
      expect(res2.normalizedBlocks[0]).toMatchObject({
        type: 'soliloquy',
        speaker: 'Dr. Aria Bell',
        target: 'self',
        delivery: 'mutter',
        content: 'There has to be a secondary bypass valve.',
      });
    });

    it('allows interpersonal dialogue when companions are present', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Jules Mercer',
          content: 'Jules Mercer: "The auxiliary power line is completely severed!"',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(1);
      expect(normalizedBlocks[0]).toMatchObject({
        type: 'dialogue',
        speaker: 'Jules Mercer',
        medium: 'direct',
        delivery: 'spoken',
        target: 'addressed',
        content: 'The auxiliary power line is completely severed!',
      });
    });

    it('rejects player dialogue when companions are present and delivery is not muttering', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Dr. Aria Bell',
          delivery: 'spoken',
          content: 'Cover the vents!',
        },
      ];

      const { error } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toContain('player-controlled');
    });

    it('allows ambient extra speech and cleans duplicate name prefixes', () => {
      const auditory = buildAuditoryContext(baseContext);
      expect(isRecognizedAmbientSpeaker('Orderly')).toBe(true);
      expect(isRecognizedAmbientSpeaker('Technician')).toBe(true);
      expect(isRecognizedAmbientSpeaker('Hostess')).toBe(true);

      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Technician',
          content: 'Technician: Core temperature rising rapidly in sector 3.',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks[0]).toMatchObject({
        type: 'dialogue',
        speaker: 'Technician',
        content: 'Core temperature rising rapidly in sector 3.',
      });
    });

    it('auto-resolves absent character speech to acoustic bleed or transmission rather than failing with 502 error', () => {
      // Dr. Marcus Sterling is absent (isPresent: false) and no active phone call
      const auditory = buildAuditoryContext(
        baseContext,
        'I listen against the reinforced bulkhead glass.'
      );
      expect(auditory.hasActiveRemoteChannel).toBe(false);

      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Dr. Marcus Sterling',
          content: 'Dr. Marcus Sterling: "Aria! Can you hear me through the observation glass?"',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(1);
      // Gracefully auto-remediated into transmission rather than 502 crash
      expect(normalizedBlocks[0].type).toBe('transmission');
      expect(normalizedBlocks[0].speaker).toBe('Dr. Marcus Sterling');
      expect(normalizedBlocks[0].medium).toBe('port_observation');
      expect(normalizedBlocks[0].content).toBe(
        'Aria! Can you hear me through the observation glass?'
      );
    });

    it('rejects completely hallucinated arbitrary characters not in cast or ambient extra list', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Grand Inquisitor Malakor',
          content: 'Kneel before the entity!',
        },
      ];

      const { error } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBe('Dialogue speaker "Grand Inquisitor Malakor" is not in the authorized cast.');
    });

    it('enforces at most one dialogue block per turn', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        { type: 'dialogue', speaker: 'Jules Mercer', content: 'Step back!' },
        { type: 'dialogue', speaker: 'Jules Mercer', content: 'I said step back!' },
      ];

      const { error } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toContain('at most one dialogue block');
    });

    it('rejects nonverbal characters attempting spoken dialogue', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Specimen 9',
          content: 'Leave us.',
        },
      ];

      const { error } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBe('Dialogue speaker "Specimen 9" lacks spoken or mediated communication.');
    });

    it('allows facility transmissions and automated system voices', () => {
      const auditory = buildAuditoryContext(baseContext);
      const blocks = [
        {
          type: 'system_voice',
          speaker: 'Facility PA',
          content: 'Facility PA: Decontamination cycle initiating in ten seconds.',
        },
        {
          type: 'transmission',
          speaker: 'Distress Beacon',
          content: 'Distress Beacon: SOS... repeater offline.',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(2);
      expect(normalizedBlocks[0]).toMatchObject({
        type: 'system_voice',
        speaker: 'Facility PA',
        medium: 'intercom',
        content: 'Decontamination cycle initiating in ten seconds.',
      });
      expect(normalizedBlocks[1]).toMatchObject({
        type: 'transmission',
        speaker: 'Distress Beacon',
        medium: 'radio',
        content: 'SOS... repeater offline.',
      });
    });
  });

  describe('formatVocalizationPromptDirective', () => {
    it('formats solitary vocalization directive when character is alone', () => {
      const solitaryContext = EngineTurnContextSchema.parse({
        ...baseContext,
        cast: baseContext.cast.map((c) =>
          c.id === 'char-jules' ? { ...c, isPresent: false } : c
        ),
      });
      const auditory = buildAuditoryContext(solitaryContext);
      const directive = formatVocalizationPromptDirective(auditory);

      expect(directive).toContain('[SOLITARY VOCALIZATION DIRECTIVE]');
      expect(directive).toContain('SOLITARY in this chamber');
      expect(directive).toContain('INTERNAL MONOLOGUE ALLOWED');
      expect(directive).toContain('SOLILOQUY MUTTERING ALLOWED');
      expect(directive).toContain('TRANSMISSIONS / SYSTEM VOICES');
    });

    it('formats living dialogue mandate when companions are present', () => {
      const auditory = buildAuditoryContext(baseContext);
      const directive = formatVocalizationPromptDirective(auditory);

      expect(directive).toContain('[MANDATORY DIALOGUE REQUIREMENT]');
      expect(directive).toContain('Jules Mercer');
      expect(directive).toContain('VOCALIZATION FORMATS');
    });

    it('formats explicitly addressed dialogue mandate when cast member was targeted', () => {
      const auditory = buildAuditoryContext(
        baseContext,
        'I shout to Jules.',
        undefined,
        undefined,
        'char-jules'
      );
      const directive = formatVocalizationPromptDirective(auditory);

      expect(directive).toContain('[MANDATORY DIALOGUE REQUIREMENT]');
      expect(directive).toContain('The user explicitly spoke to Jules Mercer');
    });

    it('gracefully normalizes player dialogue on SYSTEM_INIT opening turn for verbal characters', () => {
      const auditory = buildAuditoryContext(baseContext, 'SYSTEM_INIT');
      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Dr. Aria Bell',
          delivery: 'spoken',
          content: 'The air in this ward is freezing.',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(1);
      expect(normalizedBlocks[0].type).toBe('dialogue');
      expect(normalizedBlocks[0].speaker).toBe('Dr. Aria Bell');
      expect(normalizedBlocks[0].content).toBe('The air in this ward is freezing.');
    });

    it('gracefully converts player dialogue on SYSTEM_INIT to prose for nonverbal entities', () => {
      const nonverbalContext = EngineTurnContextSchema.parse({
        ...baseContext,
        player: {
          name: 'Entity-41',
          characterId: 'char-entity-41',
          role: 'antagonist',
          isEntity: true,
        },
        cast: [
          {
            id: 'char-entity-41',
            name: 'Entity-41',
            role: 'antagonist',
            isUserCharacter: true,
            isEntity: true,
            isPresent: true,
            expressionProfile: {
              communicationModes: ['nonverbal'],
              expressionGuidance: 'Silent mechanical movements only.',
            },
          },
        ],
      });

      const auditory = buildAuditoryContext(nonverbalContext, 'SYSTEM_INIT');
      const blocks = [
        {
          type: 'dialogue',
          speaker: 'Entity-41',
          content: 'Pneumatic valves hiss along the ceiling track.',
        },
      ];

      const { error, normalizedBlocks } = validateAndNormalizeVocalization(blocks, auditory);
      expect(error).toBeNull();
      expect(normalizedBlocks).toHaveLength(1);
      expect(normalizedBlocks[0].type).toBe('prose');
      expect(normalizedBlocks[0].content).toBe('Pneumatic valves hiss along the ceiling track.');
    });
  });
});
