import { beforeEach, describe, expect, it } from 'vitest';
import { BlueprintSchema } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from './store';

describe('Engine blueprint ingress', () => {
  beforeEach(() => {
    useEngineStore.getState().resetEngine();
    useAppStore.getState().resetSession();
  });

  it('preserves the exact reference for an already canonical Blueprint', () => {
    const reviewedBlueprint = BlueprintSchema.parse({
      id: 'reviewed-blueprint',
      title: 'Reviewed Enclosure',
      identity: {
        title: 'Reviewed Enclosure',
        version: '1.0',
        author: 'Author',
        thematicAnchor: 'Containment',
      },
      setting: {
        location: 'Observation Deck',
        atmosphere: 'Cold fluorescents',
        timePeriod: 'Present',
      },
      cast: [],
      topology: { nodes: [], connections: [] },
    });

    useEngineStore.getState().setBlueprint(reviewedBlueprint, 'protagonist');

    expect(useEngineStore.getState().activeBlueprint).toBe(reviewedBlueprint);
  });

  it('normalizes a partial payload even when BlueprintSchema can supply defaults', () => {
    const partialBlueprint = { title: 'Legacy Intake' };

    expect(BlueprintSchema.safeParse(partialBlueprint).success).toBe(true);

    useEngineStore.getState().setBlueprint(partialBlueprint, 'protagonist');

    const activeBlueprint = useEngineStore.getState().activeBlueprint;
    expect(activeBlueprint).not.toBe(partialBlueprint);
    expect(activeBlueprint?.identity.title).toBe('Legacy Intake');
    expect(activeBlueprint?.cast).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Unknown', role: 'Subject' }),
      ])
    );
    expect(activeBlueprint?.topology).toEqual({
      nodes: [],
      nodeDefinitions: [],
      connections: [],
      anchors: [],
    });
  });

  it('binds explicit selectedCharacterId correctly on setBlueprint', () => {
    const blueprint = BlueprintSchema.parse({
      id: 'bp-multi-cast',
      title: 'Multi-Cast Scenario',
      identity: {
        title: 'Multi-Cast Scenario',
        version: '1.0',
        author: 'Author',
        thematicAnchor: 'Testing',
      },
      setting: {
        location: 'Hall',
        atmosphere: 'Cold',
        timePeriod: 'Present',
      },
      cast: [
        {
          id: 'char-1',
          name: 'First Cast',
          role: 'Guard',
          description: 'Guard',
          personality: 'Alert',
          goals: 'Protect',
          traits: [],
          isEntity: false,
        },
        {
          id: 'char-2',
          name: 'Second Cast',
          role: 'Medic',
          description: 'Medic',
          personality: 'Gentle',
          goals: 'Heal',
          traits: [],
          isEntity: false,
        },
      ],
      topology: { nodes: ['HALL'], connections: [] },
    });

    useEngineStore.getState().setBlueprint(blueprint, 'protagonist', null, 'char-2');

    const gameState = useEngineStore.getState().gameState;
    expect(gameState?.player_role).toBe('protagonist');
    expect(gameState?.player_character_id).toBe('char-2');
    expect(gameState?.perspective_mode).toBe('embodied');
  });

  it('fails closed and preserves prior state if binding validation throws', () => {
    const blueprint = BlueprintSchema.parse({
      id: 'bp-multi-cast',
      title: 'Multi-Cast Scenario',
      identity: {
        title: 'Multi-Cast Scenario',
        version: '1.0',
        author: 'Author',
        thematicAnchor: 'Testing',
      },
      setting: {
        location: 'Hall',
        atmosphere: 'Cold',
        timePeriod: 'Present',
      },
      cast: [
        {
          id: 'char-1',
          name: 'First Cast',
          role: 'Guard',
          description: 'Guard',
          personality: 'Alert',
          goals: 'Protect',
          traits: [],
          isEntity: false,
        },
      ],
      topology: { nodes: ['HALL'], connections: [] },
    });

    expect(() => {
      useEngineStore.getState().setBlueprint(blueprint, 'protagonist', null, 'nonexistent-id');
    }).toThrow();

    // Store state remains null/unmutated
    expect(useEngineStore.getState().activeBlueprint).toBeNull();
    expect(useEngineStore.getState().gameState).toBeNull();
  });
});
