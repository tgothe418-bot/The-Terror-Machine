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
    expect(activeBlueprint?.topology).toEqual({ nodes: [], connections: [] });
  });
});
