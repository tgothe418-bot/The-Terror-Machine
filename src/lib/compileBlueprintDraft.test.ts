import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { compileBlueprintDraft, prepareBlueprintExport } from './compileBlueprintDraft';
import { BlueprintSchema, Blueprint } from '../types';
import { ForgeDraft } from '../types/forge';
import { ForgeCompilationError } from './forgeCompiler';

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

  it('ensures schema defaults missing from raw draft are present in compiled object', () => {
    const rawDraft = {
      identity: { title: 'Minimal Draft' },
    };

    const compiled = compileBlueprintDraft(rawDraft);
    expect(compiled.identity.version).toBe('1.0');
    expect(compiled.contentScale).toBe(3);
    expect(compiled.setting.timePeriod).toBe('Present');
    expect(compiled.topology.nodes).toEqual([]);
    expect(compiled.topology.connections).toEqual([]);
  });

  it('produces export JSON that deep-equals the compiled Blueprint and is not the raw draft representation', () => {
    const validDraft: ForgeDraft = {
      id: 'draft-export-test',
      title: 'Legacy Representation',
      premise: 'Old premise field',
      globalPremise: 'Old premise field',
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      setting: {
        location: 'Research Facility',
      },
      cast: [
        {
          id: 'c1',
          name: 'Subject Alpha',
          role: 'Subject',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
      ],
      topology: {
        nodes: ['A', 'B'],
        connections: ['A -> B'],
      },
      perspectives: [],
      references: [],
      narrativeRules: {
        incitingIncident: '',
        phaseDirectives: {},
        currentTensionLevel: 'buildup',
        keyPlotElements: [],
      },
      characters: [],
      constraints: [],
      contentScale: 3,
      contentLevelDescription: 'Standard',
      environmentalRules: '',
    };

    const artifact = prepareBlueprintExport(validDraft);
    const parsedFromJson = JSON.parse(artifact.json);

    expect(parsedFromJson).toEqual(artifact.blueprint);
    expect(parsedFromJson).not.toEqual(validDraft);
    expect(artifact.blueprint.topology.connections[0]).toHaveProperty('kind', 'PHYSICAL');
  });

  it('generates filename using compiled identity title and compiled references with lowercase/underscore sanitization', () => {
    const validDraftWithRefs: ForgeDraft = {
      id: 'draft-refs-test',
      title: 'The Old Church & Bell Tower!',
      premise: 'Explore the bell tower.',
      startingVector: 'COSMIC',
      startingTier: 'MANIFEST',
      setting: {
        location: 'The Old Church',
      },
      cast: [
        {
          id: 'c1',
          name: 'Keeper Thomas',
          role: 'Keeper',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
      ],
      perspectives: [],
      topology: { nodes: [], connections: [] },
      references: ['Silent Hill 2', 'The Thing (1982)'],
      narrativeRules: {
        incitingIncident: '',
        phaseDirectives: {},
        currentTensionLevel: 'buildup',
        keyPlotElements: [],
      },
      characters: [],
      constraints: [],
      contentScale: 3,
      contentLevelDescription: 'Standard',
      environmentalRules: '',
    };

    const artifact = prepareBlueprintExport(validDraftWithRefs);
    expect(artifact.fileName).toBe('silent_hill_2_the_thing_1982__the_old_church_bell_tower_.json');

    const validDraftWithoutRefs: ForgeDraft = {
      ...validDraftWithRefs,
      id: 'draft-norefs-test',
      title: 'Cold Chamber',
      references: [],
    };
    const artifactNoRefs = prepareBlueprintExport(validDraftWithoutRefs);
    expect(artifactNoRefs.fileName).toBe('cold_chamber.json');
  });

  it('throws ZodError and produces no export artifact for explicitly malformed values', () => {
    const malformedDraft1 = {
      identity: 42,
    };
    expect(() => compileBlueprintDraft(malformedDraft1)).toThrow(ZodError);
    expect(() => prepareBlueprintExport(malformedDraft1)).toThrow(ForgeCompilationError);

    const malformedDraft2 = {
      identity: { title: 'Valid' },
      topology: {
        connections: 'bad',
      },
    };
    expect(() => compileBlueprintDraft(malformedDraft2)).toThrow(ZodError);
    expect(() => prepareBlueprintExport(malformedDraft2)).toThrow(ForgeCompilationError);
  });

  it('does not mutate the source draft', () => {
    const validDraft: ForgeDraft = {
      id: 'draft-immutable-test',
      title: 'Immutable Draft',
      premise: 'Test premise.',
      startingVector: 'SOMATIC',
      startingTier: 'GATEWAY',
      setting: {
        location: 'Storage Bay',
      },
      cast: [
        {
          id: 'c1',
          name: 'Officer Cole',
          role: 'Officer',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
      ],
      topology: {
        nodes: ['ROOM_A', 'ROOM_B'],
        connections: ['ROOM_A -> ROOM_B'],
      },
      perspectives: [],
      references: [],
      narrativeRules: {
        incitingIncident: '',
        phaseDirectives: {},
        currentTensionLevel: 'buildup',
        keyPlotElements: [],
      },
      characters: [],
      constraints: [],
      contentScale: 3,
      contentLevelDescription: 'Standard',
      environmentalRules: '',
    };

    const snapshot = JSON.parse(JSON.stringify(validDraft));
    compileBlueprintDraft(validDraft);
    prepareBlueprintExport(validDraft);

    expect(validDraft).toEqual(snapshot);
    expect(typeof validDraft.topology?.connections?.[0]).toBe('string');
  });

  it('deep-freezes review artifact and compiled Blueprint so nested structures cannot be mutated, while source draft remains mutable', () => {
    const validDraft: ForgeDraft = {
      id: 'draft-deepfreeze-test',
      title: 'Deep Freeze Scenario',
      premise: 'Testing deep immutability of compiled artifacts.',
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      setting: {
        location: 'Secure Sub-level 9',
      },
      cast: [
        {
          id: 'c1',
          name: 'Archivist Thorne',
          role: 'Observer',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
      ],
      topology: {
        nodes: ['NODE_A', 'NODE_B'],
        connections: ['NODE_A -> NODE_B'],
      },
      perspectives: [],
      references: [],
      narrativeRules: {
        incitingIncident: '',
        phaseDirectives: {},
        currentTensionLevel: 'buildup',
        keyPlotElements: [],
      },
      characters: [],
      constraints: [],
      contentScale: 3,
      contentLevelDescription: 'Standard',
      environmentalRules: '',
    };

    const artifact = prepareBlueprintExport(validDraft);

    // 1. Verify artifact and nested compiled objects are frozen
    expect(Object.isFrozen(artifact)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.cast)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.cast[0])).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.setting)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.topology)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.topology.connections)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.topology.connections[0])).toBe(true);

    // 2. Mutations to nested properties on compiled artifact should throw in strict mode
    expect(() => {
      (artifact.blueprint.cast[0] as unknown as Record<string, unknown>).name = 'Tampered Name';
    }).toThrow();

    expect(() => {
      (artifact.blueprint.setting as unknown as Record<string, unknown>).location = 'Tampered Location';
    }).toThrow();

    expect(() => {
      (artifact.blueprint.topology.connections as unknown as Array<unknown>).push({ from: 'X', to: 'Y' });
    }).toThrow();

    // 3. Verify source draft was NOT frozen and remains freely mutable
    expect(Object.isFrozen(validDraft)).toBe(false);
    expect(Object.isFrozen(validDraft.cast)).toBe(false);
    expect(Object.isFrozen(validDraft.cast![0])).toBe(false);
    validDraft.cast![0].name = 'Archivist Thorne Updated';
    expect(validDraft.cast![0].name).toBe('Archivist Thorne Updated');
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
