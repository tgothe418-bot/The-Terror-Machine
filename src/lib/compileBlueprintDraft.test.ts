import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { compileBlueprintDraft, prepareBlueprintExport } from './compileBlueprintDraft';
import { BlueprintSchema, Blueprint } from '../types';

describe('compileBlueprintDraft and prepareBlueprintExport', () => {
  it('compiles a partial legacy Forge draft into a Blueprint accepted by BlueprintSchema', () => {
    const rawDraft = {
      title: 'Obsidian Keep',
      globalPremise: 'Survive the eternal night.',
    };

    const compiled: Blueprint = compileBlueprintDraft(rawDraft);
    const parsed = BlueprintSchema.parse(compiled);

    expect(parsed.identity.title).toBe('Obsidian Keep');
    expect(parsed.title).toBe('Obsidian Keep');
    expect(parsed.premise).toBe('Survive the eternal night.');
    expect(parsed.setting.location).toBe('Unknown');
    expect(parsed.cast).toHaveLength(1);
  });

  it('transforms legacy string connection to canonical PHYSICAL with userInitiated: true and legacyUpgraded: true', () => {
    const rawDraft = {
      identity: { title: 'Catacombs' },
      topology: {
        nodes: ['ENTRY', 'HALL', 'TOMB'],
        connections: ['ENTRY -> HALL', 'HALL -> TOMB'],
      },
    };

    const compiled: Blueprint = compileBlueprintDraft(rawDraft);
    expect(compiled.topology.connections).toEqual([
      {
        from: 'ENTRY',
        to: 'HALL',
        kind: 'PHYSICAL',
        userInitiated: true,
        legacyUpgraded: true,
      },
      {
        from: 'HALL',
        to: 'TOMB',
        kind: 'PHYSICAL',
        userInitiated: true,
        legacyUpgraded: true,
      },
    ]);
  });

  it('ensures schema defaults missing from raw draft are present in both compiled object and parsed export JSON', () => {
    const rawDraft = {
      identity: { title: 'Minimal Draft' },
    };

    const artifact = prepareBlueprintExport(rawDraft);
    const parsedExport = JSON.parse(artifact.json);

    expect(artifact.blueprint.identity.version).toBe('1.0');
    expect(artifact.blueprint.contentScale).toBe(3);
    expect(artifact.blueprint.setting.timePeriod).toBe('Present');
    expect(artifact.blueprint.topology.nodes).toEqual([]);
    expect(artifact.blueprint.topology.connections).toEqual([]);

    expect(parsedExport.identity.version).toBe('1.0');
    expect(parsedExport.contentScale).toBe(3);
    expect(parsedExport.setting.timePeriod).toBe('Present');
    expect(parsedExport.topology.nodes).toEqual([]);
    expect(parsedExport.topology.connections).toEqual([]);
  });

  it('produces export JSON that deep-equals the compiled Blueprint and is not the raw draft representation', () => {
    const rawDraft = {
      title: 'Legacy Representation',
      globalPremise: 'Old premise field',
      topology: {
        nodes: ['A', 'B'],
        connections: ['A -> B'],
      },
    };

    const artifact = prepareBlueprintExport(rawDraft);
    const parsedFromJson = JSON.parse(artifact.json);

    expect(parsedFromJson).toEqual(artifact.blueprint);
    expect(parsedFromJson).not.toEqual(rawDraft);
    expect(artifact.blueprint.topology.connections[0]).toHaveProperty('kind', 'PHYSICAL');
  });

  it('generates filename using compiled identity title and compiled references with lowercase/underscore sanitization', () => {
    const rawDraftWithRefs = {
      identity: { title: 'The Old Church & Bell Tower!' },
      references: ['Silent Hill 2', 'The Thing (1982)'],
    };

    const artifact = prepareBlueprintExport(rawDraftWithRefs);
    expect(artifact.fileName).toBe('silent_hill_2_the_thing_1982__the_old_church_bell_tower_.json');

    const rawDraftWithoutRefs = {
      identity: { title: 'Cold Chamber' },
    };
    const artifactNoRefs = prepareBlueprintExport(rawDraftWithoutRefs);
    expect(artifactNoRefs.fileName).toBe('cold_chamber.json');
  });

  it('throws ZodError and produces no export artifact for explicitly malformed values', () => {
    const malformedDraft1 = {
      identity: 42,
    };
    expect(() => compileBlueprintDraft(malformedDraft1)).toThrow(ZodError);
    expect(() => prepareBlueprintExport(malformedDraft1)).toThrow(ZodError);

    const malformedDraft2 = {
      identity: { title: 'Valid' },
      topology: {
        connections: 'bad',
      },
    };
    expect(() => compileBlueprintDraft(malformedDraft2)).toThrow(ZodError);
    expect(() => prepareBlueprintExport(malformedDraft2)).toThrow(ZodError);
  });

  it('does not mutate the source draft', () => {
    const rawDraft = {
      title: 'Immutable Draft',
      topology: {
        nodes: ['ROOM_A', 'ROOM_B'],
        connections: ['ROOM_A -> ROOM_B'],
      },
    };

    const snapshot = JSON.parse(JSON.stringify(rawDraft));
    compileBlueprintDraft(rawDraft);
    prepareBlueprintExport(rawDraft);

    expect(rawDraft).toEqual(snapshot);
    expect(typeof rawDraft.topology.connections[0]).toBe('string');
  });

  it('is value-idempotent when compiling an already compiled Blueprint', () => {
    const rawDraft = {
      title: 'Idempotence Check',
      globalPremise: 'Checking idempotence.',
    };

    const firstPass = compileBlueprintDraft(rawDraft);
    const secondPass = compileBlueprintDraft(firstPass);

    expect(secondPass).toEqual(firstPass);
  });
});
