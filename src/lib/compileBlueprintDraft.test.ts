import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { compileBlueprintDraft, prepareBlueprintExport } from './compileBlueprintDraft';
import { BlueprintSchema, Blueprint } from '../types';
import { ForgeDraft } from '../types/forge';
import { ForgeCompilationError } from './forgeCompiler';

describe('compileBlueprintDraft and prepareBlueprintExport', () => {
  const defaultContext = { draftRevision: 1, sourceBaselineRevision: 1 };

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
      depictionContract: {
        dramaticRegister: 'Clinical dread',
        directness: 'Visceral mechanics',
        aftermath: 'Irreversible consequences',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
      cast: [
        {
          id: 'c1',
          name: 'Subject Alpha',
          role: 'Subject',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'A' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'A',
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
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    const artifact = prepareBlueprintExport(validDraft, defaultContext);
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
      depictionContract: {
        dramaticRegister: 'Gothic isolation',
        directness: 'Measured dread',
        aftermath: 'Irreversible decay',
        ambiguityHandling: 'Preserve cosmic mystery',
      },
      cast: [
        {
          id: 'c1',
          name: 'Keeper Thomas',
          role: 'Keeper',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'BELL_TOWER' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      perspectives: [],
      topology: {
        startingNodeId: 'BELL_TOWER',
        nodes: ['BELL_TOWER'],
        connections: [],
      },
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
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    const artifact = prepareBlueprintExport(validDraftWithRefs, defaultContext);
    expect(artifact.fileName).toBe('silent_hill_2_the_thing_1982__the_old_church_bell_tower_.json');

    const validDraftWithoutRefs: ForgeDraft = {
      ...validDraftWithRefs,
      id: 'draft-norefs-test',
      title: 'Cold Chamber',
      references: [],
    };
    const artifactNoRefs = prepareBlueprintExport(validDraftWithoutRefs, defaultContext);
    expect(artifactNoRefs.fileName).toBe('cold_chamber.json');
  });

  it('throws ZodError and produces no export artifact for explicitly malformed values', () => {
    const malformedDraft1 = {
      identity: 42,
    };
    expect(() => compileBlueprintDraft(malformedDraft1)).toThrow(ZodError);
    expect(() => prepareBlueprintExport(malformedDraft1, defaultContext)).toThrow(ForgeCompilationError);

    const malformedDraft2 = {
      identity: { title: 'Valid' },
      topology: {
        connections: 'bad',
      },
    };
    expect(() => compileBlueprintDraft(malformedDraft2)).toThrow(ZodError);
    expect(() => prepareBlueprintExport(malformedDraft2, defaultContext)).toThrow(ForgeCompilationError);
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
      depictionContract: {
        dramaticRegister: 'Clinical dread',
        directness: 'Visceral mechanics',
        aftermath: 'Irreversible consequences',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
      cast: [
        {
          id: 'c1',
          name: 'Officer Cole',
          role: 'Officer',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'ROOM_A' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'ROOM_A',
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
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    const snapshot = JSON.parse(JSON.stringify(validDraft));
    compileBlueprintDraft(validDraft);
    prepareBlueprintExport(validDraft, defaultContext);

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
      depictionContract: {
        dramaticRegister: 'Clinical dread',
        directness: 'Visceral mechanics',
        aftermath: 'Irreversible consequences',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
      cast: [
        {
          id: 'c1',
          name: 'Archivist Calder',
          role: 'Observer',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_A' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'NODE_A',
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
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    const artifact = prepareBlueprintExport(validDraft, defaultContext);

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
    validDraft.cast![0].name = 'Archivist Calder Updated';
    expect(validDraft.cast![0].name).toBe('Archivist Calder Updated');
  });

  it('creates a deeply frozen artifact with both source revisions', () => {
    const validDraft: ForgeDraft = {
      id: 'draft-revision-test',
      title: 'Revision Bound Station',
      premise: 'Testing revision capture and deep freeze.',
      startingVector: 'SOMATIC',
      startingTier: 'MANIFEST',
      setting: {
        location: 'Chamber 4',
      },
      depictionContract: {
        dramaticRegister: 'Clinical dread',
        directness: 'Visceral mechanics',
        aftermath: 'Irreversible consequences',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
      cast: [
        {
          id: 'c1',
          name: 'Dr. Vane',
          role: 'Specialist',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'A' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'A',
        nodes: ['A', 'B'],
        connections: ['A -> B'],
      },
      perspectives: [],
      references: ['Reference Log'],
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
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {},
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    const context = {
      draftRevision: 5,
      sourceBaselineRevision: 3,
    };

    const artifact = prepareBlueprintExport(validDraft, context);

    // Exact revision copying
    expect(artifact.sourceDraftRevision).toBe(5);
    expect(artifact.sourceBaselineRevision).toBe(3);
    expect(artifact.sourceDraftId).toBe('draft-revision-test');
    expect(typeof artifact.compiledAt).toBe('number');
    expect(artifact.fileName).toBe('reference_log_revision_bound_station.json');

    // Deep immutability of artifact, Blueprint, and nested objects/arrays
    expect(Object.isFrozen(artifact)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.cast)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.cast[0])).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.setting)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.topology)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.topology.connections)).toBe(true);
    expect(Object.isFrozen(artifact.blueprint.references)).toBe(true);

    // Attempting mutations must throw in strict mode
    expect(() => {
      (artifact as unknown as Record<string, unknown>).sourceDraftRevision = 999;
    }).toThrow();
    expect(() => {
      (artifact.blueprint as unknown as Record<string, unknown>).title = 'Mutated Title';
    }).toThrow();
    expect(() => {
      (artifact.blueprint.cast[0] as unknown as Record<string, unknown>).name = 'Mutated Cast';
    }).toThrow();
    expect(() => {
      (artifact.blueprint.references as unknown as Array<string>).push('Extra');
    }).toThrow();
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
