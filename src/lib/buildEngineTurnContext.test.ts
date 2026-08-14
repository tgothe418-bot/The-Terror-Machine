import { describe, expect, it } from 'vitest';
import { buildEngineTurnContext, buildContextReceipt } from './buildEngineTurnContext';

describe('buildEngineTurnContext & buildContextReceipt', () => {
  const mockBlueprint = {
    id: 'bp-sanatorium-99',
    title: 'The Blackwood Sanatorium',
    premise: 'An abandoned hospital that recalibrates geometry.',
    environmentalRules: ['Clocks run backwards near mirrors.', 'Shadows cannot detach in darkness.'],
    setting: {
      location: 'Ward 4B',
      atmosphere: 'Sterile ammonia smell',
      timePeriod: '1932'
    },
    startingVector: 'SOMATIC',
    startingTier: 'MANIFEST',
    incitingIncident: 'The exit stairs vanished.',
    pacingDirectives: 'Accelerate delirium upon inspection.',
    keyPlotElements: ['The rusted syringe', 'The ledger of wardens'],
    cast: [
      {
        id: 'char-elena',
        name: 'Elena Rostova',
        role: 'Protagonist',
        description: 'Night shift nurse.',
        isUserCharacter: true,
        isEntity: false
      },
      {
        id: 'char-warden',
        name: 'The Quiet Warden',
        role: 'Antagonist',
        description: 'Faceless entity in surgeon coat.',
        isUserCharacter: false,
        isEntity: true
      }
    ],
    topology: {
      nodes: ['WARD_4B', 'STAIRWELL', 'OPERATING_THEATRE'],
      connections: [
        {
          from: 'WARD_4B',
          to: 'STAIRWELL',
          kind: 'PHYSICAL',
          requires: ['WARD_KEY'],
          userInitiated: true
        }
      ]
    }
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
        activeTier: 'MANIFEST'
      }
    });

    expect(context.version).toBe(1);
    expect(context.scenario.title).toBe('The Blackwood Sanatorium');
    expect(context.scenario.worldRules).toEqual([
      'Clocks run backwards near mirrors.',
      'Shadows cannot detach in darkness.'
    ]);
    expect(context.player.role).toBe('protagonist');
    expect(context.player.name).toBe('Elena Rostova');
    expect(context.player.characterId).toBe('char-elena');
    expect(context.player.isEntity).toBe(false);

    // Cast roster includes ALL cast (including antagonist)
    expect(context.cast).toHaveLength(2);
    expect(context.cast.find((c) => c.name === 'The Quiet Warden')).toBeDefined();

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
        currentNodeId: 'WARD_4B'
      }
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
      runtimeState: { currentNodeId: 'WARD_4B' }
    });
    const receipt = buildContextReceipt(context, mockBlueprint);

    expect(receipt.version).toBe(1);
    expect(receipt.scenarioTitle).toBe('The Blackwood Sanatorium');
    expect(receipt.blueprintId).toBe('bp-sanatorium-99');
    expect(receipt.selectedRole).toBe('protagonist');
    expect(receipt.resolvedPlayerName).toBe('Elena Rostova');
    expect(receipt.castCount).toBe(2);
    expect(receipt.worldRuleCount).toBe(2);
    expect(receipt.topologyNodeCount).toBe(3);
    expect(receipt.topologyConnectionCount).toBe(1);
  });
});
