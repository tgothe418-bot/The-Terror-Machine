import { describe, expect, it } from 'vitest';
import { buildEngineTurnContext, buildContextReceipt } from './buildEngineTurnContext';
import { SpatialNode } from '../types';

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

  it('rejects authored or persisted locations absent from a populated runtime graph', () => {
    const blueprint = {
      ...mockBlueprint,
      topology: {
        nodes: ['BLUEPRINT_OLD_VAULT', 'BLUEPRINT_ATTIC'],
      },
      cast: [
        {
          id: 'char-player',
          name: 'Player Investgator',
          isUserCharacter: true,
          starting_location: 'BLUEPRINT_OLD_VAULT',
        },
        {
          id: 'char-companion',
          name: 'Companion Scholar',
          starting_location: 'BLUEPRINT_OLD_VAULT', // Authored in blueprint node that is absent from runtime graph
        },
        {
          id: 'char-ghost',
          name: 'Haunting Spirit',
          starting_location: 'RUNTIME_NODE_CHAMBER',
        },
      ],
    };

    // Populated runtime graph with nodes: ['RUNTIME_NODE_CHAMBER', 'RUNTIME_NODE_HALLWAY']
    const spatialGraph: SpatialNode[] = [
      {
        id: 'RUNTIME_NODE_CHAMBER',
        type: 'physical',
        name: 'Chamber',
        description: 'A stone chamber.',
        sensoryProfile: [],
        exits: [],
        environmentalHazards: [],
        linkedCharacters: [],
        structuralAnomalies: [],
      },
      {
        id: 'RUNTIME_NODE_HALLWAY',
        type: 'physical',
        name: 'Hallway',
        description: 'A narrow hallway.',
        sensoryProfile: [],
        exits: [],
        environmentalHazards: [],
        linkedCharacters: [],
        structuralAnomalies: [],
      },
    ];

    const context = buildEngineTurnContext({
      blueprint,
      selectedRole: 'protagonist',
      spatialGraph,
      characterPresence: {
        'char-companion': { nodeId: 'BLUEPRINT_OLD_VAULT' }, // Persisted to a stale Blueprint-only node
      },
      runtimeState: {
        currentNodeId: 'RUNTIME_NODE_CHAMBER',
      },
    });

    const player = context.cast.find((c) => c.id === 'char-player');
    const companion = context.cast.find((c) => c.id === 'char-companion');
    const ghost = context.cast.find((c) => c.id === 'char-ghost');

    // Player character remains present at the actual current runtime node
    expect(player?.isPresent).toBe(true);

    // Companion's stale location (BLUEPRINT_OLD_VAULT) is absent from runtime graph and rejected;
    // buildCharacterPresence falls back to currentNodeId ('RUNTIME_NODE_CHAMBER') for invalid node
    expect(companion?.isPresent).toBe(true);

    // Haunting spirit at RUNTIME_NODE_CHAMBER is at current node
    expect(ghost?.isPresent).toBe(true);
  });

  it('proves runtime graph authority over blueprint topology and blueprint fallback when no runtime graph exists', () => {
    const blueprint = {
      ...mockBlueprint,
      topology: {
        nodes: ['BP_NODE_A', 'BP_NODE_B'],
      },
      cast: [
        {
          id: 'char-protagonist',
          name: 'Protagonist',
          isUserCharacter: true,
          starting_location: 'BP_NODE_A',
        },
        {
          id: 'char-npc1',
          name: 'NPC 1',
          starting_location: 'BP_NODE_B', // Valid in blueprint, invalid in runtime graph
        },
        {
          id: 'char-npc2',
          name: 'NPC 2',
          starting_location: 'RUNTIME_NODE_2',
        },
      ],
    };

    // Case 1: Populated runtime graph provided -> runtime graph is authoritative
    const runtimeContext = buildEngineTurnContext({
      blueprint,
      selectedRole: 'protagonist',
      spatialGraph: [
        {
          id: 'RUNTIME_NODE_1',
          type: 'physical',
          name: 'Runtime Node 1',
          description: 'First node.',
          sensoryProfile: [],
          exits: [],
          environmentalHazards: [],
          linkedCharacters: [],
          structuralAnomalies: [],
        },
        {
          id: 'RUNTIME_NODE_2',
          type: 'physical',
          name: 'Runtime Node 2',
          description: 'Second node.',
          sensoryProfile: [],
          exits: [],
          environmentalHazards: [],
          linkedCharacters: [],
          structuralAnomalies: [],
        },
      ],
      runtimeState: {
        currentNodeId: 'RUNTIME_NODE_1',
      },
    });

    const runtimeProtagonist = runtimeContext.cast.find((c) => c.id === 'char-protagonist');
    const runtimeNpc1 = runtimeContext.cast.find((c) => c.id === 'char-npc1');
    const runtimeNpc2 = runtimeContext.cast.find((c) => c.id === 'char-npc2');

    // Player remains present at actual current runtime node
    expect(runtimeProtagonist?.isPresent).toBe(true);
    // NPC 1's starting_location 'BP_NODE_B' is rejected because runtime graph is authoritative and does not contain 'BP_NODE_B'
    // Fallback in buildCharacterPresence makes presenceNodeId = currentNodeId ('RUNTIME_NODE_1')
    expect(runtimeNpc1?.isPresent).toBe(true);
    // NPC 2's starting_location 'RUNTIME_NODE_2' is valid in runtime graph, so it resolves to 'RUNTIME_NODE_2' (not current node RUNTIME_NODE_1)
    expect(runtimeNpc2?.isPresent).toBe(false);

    // Case 2: No runtime graph provided -> Blueprint topology remains the fallback source
    const fallbackContext = buildEngineTurnContext({
      blueprint,
      selectedRole: 'protagonist',
      spatialGraph: undefined,
      runtimeState: {
        currentNodeId: 'BP_NODE_A',
      },
    });

    const fallbackProtagonist = fallbackContext.cast.find((c) => c.id === 'char-protagonist');
    const fallbackNpc1 = fallbackContext.cast.find((c) => c.id === 'char-npc1');
    const fallbackNpc2 = fallbackContext.cast.find((c) => c.id === 'char-npc2');

    // Player remains present at actual current runtime node
    expect(fallbackProtagonist?.isPresent).toBe(true);
    // NPC 1's starting_location 'BP_NODE_B' is valid in blueprint topology (not current node BP_NODE_A)
    expect(fallbackNpc1?.isPresent).toBe(false);
    // NPC 2's starting_location 'RUNTIME_NODE_2' is NOT in blueprint topology, so it falls back to BP_NODE_A
    expect(fallbackNpc2?.isPresent).toBe(true);
  });

  describe('consequenceState pre-state integration (Phase 3H.1B)', () => {
    it('defaults consequenceState to empty inventory, empty player_injuries, and STABLE when omitted or null', () => {
      const context = buildEngineTurnContext({
        blueprint: mockBlueprint,
        selectedRole: 'protagonist',
      });

      expect(context.consequenceState).toEqual({
        inventory: [],
        player_injuries: [],
        psychological_status: 'STABLE',
      });
    });

    it('normalizes, deduplicates, and caps consequenceState pre-state from authoritative input', () => {
      const context = buildEngineTurnContext({
        blueprint: mockBlueprint,
        selectedRole: 'protagonist',
        consequenceState: {
          inventory: ['  Rusted Key  ', 'rusted key', 'Flashlight'],
          player_injuries: [' lacerated arm ', 'LACERATED ARM', 'Broken Rib'],
          psychological_status: 'distressed',
        },
      });

      expect(context.consequenceState).toEqual({
        inventory: ['Rusted Key', 'Flashlight'],
        player_injuries: ['lacerated arm', 'Broken Rib'],
        psychological_status: 'DISTRESSED',
      });
    });

    it('performs a deep copy of consequenceState so external mutation has no effect', () => {
      const rawInventory = ['Brass Key', 'Bandage'];
      const rawInjuries = ['Sprained Ankle'];
      const context = buildEngineTurnContext({
        blueprint: mockBlueprint,
        selectedRole: 'protagonist',
        consequenceState: {
          inventory: rawInventory,
          player_injuries: rawInjuries,
          psychological_status: 'PANICKED',
        },
      });

      rawInventory.push('Unauthorized Mutation');
      rawInjuries.push('Unauthorized Fracture');

      expect(context.consequenceState.inventory).toEqual(['Brass Key', 'Bandage']);
      expect(context.consequenceState.player_injuries).toEqual(['Sprained Ankle']);
    });
  });

  describe('characterStance context integration (Phase 3H.2B)', () => {
    it('defaults cast member stance to null when characterStance is omitted, null, or empty', () => {
      const context = buildEngineTurnContext({
        blueprint: mockBlueprint,
        selectedRole: 'protagonist',
      });

      expect(context.version).toBe(1);
      for (const member of context.cast) {
        expect(member.stance).toBeNull();
      }
    });

    it('binds exact per-character stance and leaves other cast members null', () => {
      const context = buildEngineTurnContext({
        blueprint: mockBlueprint,
        selectedRole: 'protagonist',
        characterStance: {
          'char-warden': { focus: 'PLAYER', stance: 'HOSTILE' },
        },
      });

      const clara = context.cast.find((c) => c.id === 'char-clara');
      const warden = context.cast.find((c) => c.id === 'char-warden');
      const orderly = context.cast.find((c) => c.id === 'char-orderly');

      expect(clara?.stance).toBeNull();
      expect(orderly?.stance).toBeNull();
      expect(warden?.stance).toEqual({
        focus: 'PLAYER',
        stance: 'HOSTILE',
      });
    });

    it('does not expose stance for unknown character IDs or derive from personality/skepticism', () => {
      const context = buildEngineTurnContext({
        blueprint: mockBlueprint,
        selectedRole: 'protagonist',
        characterStance: {
          'char-ghost': { focus: 'SITUATION', stance: 'AFRAID' },
        },
      });

      for (const member of context.cast) {
        expect(member.stance).toBeNull();
      }
    });
  });
});
