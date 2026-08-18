import { describe, expect, it } from 'vitest';
import { buildEngineTurnContext, buildContextReceipt } from './buildEngineTurnContext';

describe('buildEngineTurnContext & buildContextReceipt', () => {
  const mockBlueprint = {
    id: 'bp-sanatorium-99',
    title: 'The Blackwood Sanatorium',
    premise: 'An abandoned hospital that recalibrates geometry.',
    environmentalRules: [
      'Clocks run backwards near mirrors.',
      'Shadows cannot detach in darkness.',
    ],
    setting: {
      location: 'Ward 4B',
      atmosphere: 'Sterile ammonia smell',
      timePeriod: '1932',
    },
    startingVector: 'SOMATIC',
    startingTier: 'MANIFEST',
    incitingIncident: 'The exit stairs vanished.',
    pacingDirectives: 'Accelerate delirium upon inspection.',
    keyPlotElements: ['The rusted syringe', 'The ledger of wardens'],
    cast: [
      {
        id: 'char-clara',
        name: 'Nurse Clara Reed',
        role: 'Protagonist',
        description: 'Night shift nurse.',
        personality: 'Methodical and protective under acute duress.',
        goals: 'Locate the missing ward records and escort patients to safety.',
        traits: ['Clinical', 'Vigilant', 'Insomniac'],
        isUserCharacter: true,
        isEntity: false,
        expressionProfile: {
          communicationModes: ['spoken'],
          expressionGuidance: 'Speaks with clipped clinical precision.',
          silenceGuidance: 'Hesitates when asked about the basement.',
        },
      },
      {
        id: 'char-warden',
        name: 'The Quiet Warden',
        role: 'Antagonist',
        description: 'Faceless entity in surgeon coat.',
        personality: 'Relentless, patient, and surgically detached.',
        goals: 'Contain the quarantine breach and sever external communication.',
        traits: ['Implacable', 'Observant'],
        isUserCharacter: false,
        isEntity: true,
        expressionProfile: {
          communicationModes: ['mediated'],
          expressionGuidance: 'Uses short transmissions through the ward intercom.',
          silenceGuidance: 'A closed channel is not consent or absence.',
        },
      },
      {
        id: 'char-orderly',
        name: 'Orderly Thomas',
        role: 'Custodian',
        description: 'Night orderly.',
        isUserCharacter: false,
        isEntity: false,
      },
    ],
    topology: {
      nodes: ['WARD_4B', 'STAIRWELL', 'OPERATING_THEATRE'],
      connections: [
        {
          from: 'WARD_4B',
          to: 'STAIRWELL',
          kind: 'PHYSICAL',
          requires: ['WARD_KEY'],
          userInitiated: true,
        },
      ],
    },
  };

  it('builds a complete authoritative EngineTurnContext for the protagonist', () => {
    const context = buildEngineTurnContext({
      blueprint: mockBlueprint,
      selectedRole: 'protagonist',
      runtimeState: {
        currentNodeId: 'WARD_4B',
        phase: 'MANIFEST',
        tension: 5,
        coherence: 0.7,
        reconciliationRevision: 1,
        activeVector: 'SOMATIC',
        activeTier: 'MANIFEST',
      },
    });

    expect(context.version).toBe(1);
    expect(context.scenario.title).toBe('The Blackwood Sanatorium');
    expect(context.scenario.worldRules).toEqual([
      'Clocks run backwards near mirrors.',
      'Shadows cannot detach in darkness.',
    ]);
    expect(context.player.role).toBe('protagonist');
    expect(context.player.name).toBe('Nurse Clara Reed');
    expect(context.player.characterId).toBe('char-clara');
    expect(context.player.isEntity).toBe(false);

    // Cast roster includes ALL cast (including antagonist)
    expect(context.cast).toHaveLength(3);
    expect(context.cast.find((c) => c.name === 'The Quiet Warden')).toBeDefined();

    const clara = context.cast.find((member) => member.id === 'char-clara');
    expect(clara?.isUserCharacter).toBe(true);
    expect(clara?.personality).toBe('Methodical and protective under acute duress.');
    expect(clara?.goals).toBe('Locate the missing ward records and escort patients to safety.');
    expect(clara?.traits).toEqual(['Clinical', 'Vigilant', 'Insomniac']);

    const warden = context.cast.find((member) => member.id === 'char-warden');
    expect(warden?.personality).toBe('Relentless, patient, and surgically detached.');
    expect(warden?.goals).toBe('Contain the quarantine breach and sever external communication.');
    expect(warden?.traits).toEqual(['Implacable', 'Observant']);
    expect(warden?.expressionProfile).toEqual({
      communicationModes: ['mediated'],
      expressionGuidance: 'Uses short transmissions through the ward intercom.',
      silenceGuidance: 'A closed channel is not consent or absence.',
    });

    const orderly = context.cast.find((member) => member.id === 'char-orderly');
    expect(orderly?.personality).toBe('');
    expect(orderly?.goals).toBe('');
    expect(orderly?.traits).toEqual([]);
    expect(orderly?.skepticism).toBe(0.5);

    // Topology boundaries
    expect(context.topology.currentNodeId).toBe('WARD_4B');
    expect(context.topology.allowedOutgoingExits).toHaveLength(1);
    expect(context.topology.allowedOutgoingExits[0].to).toBe('STAIRWELL');
    expect(context.topology.allowedOutgoingExits[0].requires).toEqual(['WARD_KEY']);

    // Runtime conditions
    expect(context.runtime.phase).toBe('MANIFEST');
    expect(context.runtime.tension).toBe(5);
    expect(context.runtime.coherence).toBe(0.7);
    expect(context.runtime.activeVector).toBe('SOMATIC');
  });

  it('binds antagonist perspective correctly', () => {
    const context = buildEngineTurnContext({
      blueprint: mockBlueprint,
      selectedRole: 'antagonist',
      runtimeState: {
        currentNodeId: 'WARD_4B',
      },
    });

    expect(context.player.role).toBe('antagonist');
    expect(context.player.name).toBe('The Quiet Warden');
    expect(context.player.characterId).toBe('char-warden');
    expect(context.player.isEntity).toBe(true);
  });

  it('builds a ContextReceipt accurately from context and blueprint', () => {
    const context = buildEngineTurnContext({
      blueprint: mockBlueprint,
      selectedRole: 'protagonist',
      runtimeState: { currentNodeId: 'WARD_4B' },
    });
    const receipt = buildContextReceipt(context, mockBlueprint);

    expect(receipt.version).toBe(1);
    expect(receipt.scenarioTitle).toBe('The Blackwood Sanatorium');
    expect(receipt.blueprintId).toBe('bp-sanatorium-99');
    expect(receipt.selectedRole).toBe('protagonist');
    expect(receipt.resolvedPlayerName).toBe('Nurse Clara Reed');
    expect(receipt.castCount).toBe(3);
    expect(receipt.worldRuleCount).toBe(2);
    expect(receipt.topologyNodeCount).toBe(3);
    expect(receipt.topologyConnectionCount).toBe(1);
  });

  it('maps resolved character continuity onto cast members', () => {
    const blueprintWithVulnerability = {
      ...mockBlueprint,
      cast: [
        {
          id: 'char-1',
          name: 'Alice',
          vulnerabilityBase: { skepticism: 0.35 },
        },
        {
          id: 'char-2',
          name: 'Bob',
          vulnerabilityBase: { skepticism: 0.4 },
        },
      ],
    };

    const context = buildEngineTurnContext({
      blueprint: blueprintWithVulnerability,
      characterContinuity: {
        'char-1': { skepticism: 0.85 },
      },
    });

    const alice = context.cast.find((c) => c.id === 'char-1');
    const bob = context.cast.find((c) => c.id === 'char-2');

    // Alice prefers persisted (0.85) over vulnerabilityBase (0.35)
    expect(alice?.skepticism).toBe(0.85);
    // Bob falls back to vulnerabilityBase (0.4)
    expect(bob?.skepticism).toBe(0.4);
  });

  it('falls back to DEFAULT_SKEPTICISM for legacy blueprints with no continuity or vulnerability', () => {
    const legacyBlueprint = {
      title: 'Legacy',
      cast: [{ id: 'char-legacy', name: 'Old Ghost' }],
    };

    const context = buildEngineTurnContext({
      blueprint: legacyBlueprint,
    });

    const ghost = context.cast.find((c) => c.id === 'char-legacy');
    expect(ghost?.skepticism).toBe(0.5);
  });

  it('resolves isPresent based on player binding, characterPresence, and starting_location', () => {
    const blueprint = {
      ...mockBlueprint,
      topology: {
        nodes: ['WARD_4B', 'STAIRWELL', 'OPERATING_THEATRE'],
      },
      cast: [
        {
          id: 'char-clara',
          name: 'Nurse Clara Reed',
          isUserCharacter: true,
          starting_location: 'OPERATING_THEATRE',
        },
        {
          id: 'char-warden',
          name: 'The Quiet Warden',
          starting_location: 'STAIRWELL',
        },
        {
          id: 'char-orderly',
          name: 'Orderly Thomas',
          starting_location: 'OPERATING_THEATRE',
        },
      ],
    };

    const context = buildEngineTurnContext({
      blueprint,
      selectedRole: 'protagonist',
      characterPresence: {
        'char-orderly': { nodeId: 'WARD_4B' }, // Overrides starting_location
      },
      runtimeState: {
        currentNodeId: 'WARD_4B',
      },
    });

    const clara = context.cast.find((c) => c.id === 'char-clara');
    const warden = context.cast.find((c) => c.id === 'char-warden');
    const orderly = context.cast.find((c) => c.id === 'char-orderly');

    // Player character is always at currentNodeId (WARD_4B)
    expect(clara?.isPresent).toBe(true);
    // Warden is at STAIRWELL (starting_location), not WARD_4B
    expect(warden?.isPresent).toBe(false);
    // Orderly is at WARD_4B (persisted), matching currentNodeId
    expect(orderly?.isPresent).toBe(true);
  });
});
