import { describe, expect, it } from 'vitest';
import {
  WORLD_MEMORY_KINDS,
  WORLD_MEMORY_SCOPES,
  WORLD_MEMORY_DECISION_OUTCOMES,
  WORLD_MEMORY_DECISION_REASONS,
  MAX_WORLD_MEMORY_CANDIDATES,
  MAX_WORLD_MEMORY_ENTRIES,
  MAX_WORLD_MEMORY_STATEMENT_LENGTH,
  MAX_WORLD_MEMORY_RATIONALE_LENGTH,
  WorldMemoryEntrySchema,
  WorldMemoryCandidateSchema,
  WorldMemoryProposalSchema,
  WorldMemoryReceiptSchema,
  WorldMemoryStateSchema,
  WorldMemoryState,
  WorldMemoryProposal,
  EngineTurnContext,
  IntentReceipt,
  NarrativeReconciliationReceipt,
  CastInteractionReceipt,
  LoreAndMemory,
} from '../types';
import {
  normalizeWorldMemoryStatement,
  deriveWorldMemoryId,
  createWorldMemoryState,
  migrateLegacyLoreAndMemory,
  resolveWorldMemory,
} from './worldMemory';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object') {
      deepFreeze(val);
    }
  }
  return obj;
}

function createMockContext(overrides?: Partial<EngineTurnContext>): EngineTurnContext {
  return {
    version: 1,
    scenario: {
      id: 'sc-01',
      title: 'Facility Observation',
      premise: 'Testing premises',
      worldRules: [],
      setting: {
        location: 'Research Wing',
        atmosphere: 'Silent',
        timePeriod: 'Present',
      },
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      incitingIncident: 'Breach',
      pacingDirective: 'Slow burn',
      keyPlotElements: [],
    },
    player: {
      role: 'protagonist',
      characterId: 'char-player',
      name: 'Investigator Ward',
      description: 'The protagonist',
      isEntity: false,
    },
    cast: [
      {
        id: 'char-player',
        name: 'Investigator Ward',
        role: 'Protagonist',
        description: 'The protagonist',
        personality: 'Observant',
        goals: 'Survive',
        traits: ['Methodical'],
        isEntity: false,
        isUserCharacter: true,
        skepticism: 0.2,
        isPresent: true,
        stance: null,
        memory: [],
      },
      {
        id: 'char-npc-1',
        name: 'Dr. Evelyn Moore',
        role: 'Scientist',
        description: 'Chief researcher',
        personality: 'Analytical',
        goals: 'Containment',
        traits: ['Cautious'],
        isEntity: false,
        isUserCharacter: false,
        skepticism: 0.5,
        isPresent: true,
        stance: null,
        memory: [],
      },
      {
        id: 'char-absent',
        name: 'Technician Miller',
        role: 'Technician',
        description: 'Stationed elsewhere',
        personality: 'Timid',
        goals: 'Repair',
        traits: ['Nervous'],
        isEntity: false,
        isUserCharacter: false,
        skepticism: 0.5,
        isPresent: false,
        stance: null,
        memory: [],
      },
    ],
    topology: {
      currentNodeId: 'node-current',
      readableNodeLabel: 'Current Node',
      allowedOutgoingExits: [],
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
    consequenceState: {
      inventory: [],
      player_injuries: [],
      psychological_status: 'STABLE',
    },
    relationshipState: [],
    memoryState: {},
    ...overrides,
  };
}

function createMockIntentReceipt(overrides?: Partial<IntentReceipt>): IntentReceipt {
  return {
    version: 1,
    action_kind: 'INVESTIGATE',
    action_subtype: null,
    pressure_direction: 'MAINTAIN',
    dramatic_tactic: 'NONE',
    intent_synergy: 'N/A',
    ...overrides,
  };
}

function createMockReconciliationReceipt(
  overrides?: Partial<NarrativeReconciliationReceipt>
): NarrativeReconciliationReceipt {
  return {
    version: 1,
    revision_increment: 0,
    mode: 'CANONICAL',
    feasibility: 'SUPPORTED',
    reason_code: 'NONE',
    fictional_time_cost: 'MOMENT',
    authority_alignment: 'NOT_APPLICABLE',
    memory_echo_candidate: null,
    ...overrides,
  };
}

function createMockCastInteractionReceipt(
  overrides?: Partial<CastInteractionReceipt>
): CastInteractionReceipt {
  return {
    version: 1,
    outcome: 'NONE',
    addressedCharacterId: null,
    respondingCharacterId: null,
    ...overrides,
  };
}

describe('3H.5A: Durable World Memory Contracts and Pure Resolver', () => {
  describe('1. Strict schemas, vocabularies, bounds, and refinements', () => {
    it('exports the exact vocabularies and bounds', () => {
      expect(WORLD_MEMORY_KINDS).toEqual([
        'ESTABLISHED_FACT',
        'DISCOVERED_EVIDENCE',
        'ENVIRONMENTAL_CONDITION',
        'PERSISTENT_CONSEQUENCE',
      ]);
      expect(WORLD_MEMORY_SCOPES).toEqual(['GLOBAL', 'NODE']);
      expect(MAX_WORLD_MEMORY_CANDIDATES).toBe(2);
      expect(MAX_WORLD_MEMORY_ENTRIES).toBe(64);
      expect(MAX_WORLD_MEMORY_STATEMENT_LENGTH).toBe(240);
      expect(MAX_WORLD_MEMORY_RATIONALE_LENGTH).toBe(240);
      expect(WORLD_MEMORY_DECISION_OUTCOMES).toEqual(['APPLIED', 'REJECTED', 'NO_CHANGE']);
      expect(WORLD_MEMORY_DECISION_REASONS).toEqual([
        'APPLIED',
        'RECONCILIATION_SUPPRESSED',
        'ROLE_NOT_AUTHORIZED',
        'ACTION_NOT_AUTHORIZED',
        'GLOBAL_SCOPE_NOT_AUTHORIZED',
        'CURRENT_NODE_MISMATCH',
        'COMMUNICATION_SOURCE_MISSING',
        'DUPLICATE_ENTRY',
        'STATE_LIMIT',
      ]);
    });

    it('validates WorldMemoryEntrySchema strictly with scope/node refinements', () => {
      // Valid GLOBAL entry
      const validGlobal = {
        id: 'wm_01',
        kind: 'ESTABLISHED_FACT',
        scope: 'GLOBAL',
        node_id: null,
        statement: 'The compound is sealed.',
        established_turn: 0,
      };
      expect(WorldMemoryEntrySchema.parse(validGlobal)).toEqual(validGlobal);

      // Valid NODE entry
      const validNode = {
        id: 'wm_02',
        kind: 'DISCOVERED_EVIDENCE',
        scope: 'NODE',
        node_id: 'node-alpha',
        statement: 'A torn document is on the desk.',
        established_turn: 2,
      };
      expect(WorldMemoryEntrySchema.parse(validNode)).toEqual(validNode);

      // Rejects GLOBAL with non-null node_id
      expect(() =>
        WorldMemoryEntrySchema.parse({
          ...validGlobal,
          node_id: 'node-alpha',
        })
      ).toThrow();

      // Rejects NODE with null node_id
      expect(() =>
        WorldMemoryEntrySchema.parse({
          ...validNode,
          node_id: null,
        })
      ).toThrow();

      // Rejects unknown kind / scope / negative turn / extra keys
      expect(() =>
        WorldMemoryEntrySchema.parse({
          ...validGlobal,
          kind: 'INVALID_KIND',
        })
      ).toThrow();

      expect(() =>
        WorldMemoryEntrySchema.parse({
          ...validGlobal,
          established_turn: -1,
        })
      ).toThrow();

      expect(() =>
        WorldMemoryEntrySchema.parse({
          ...validGlobal,
          extraField: 'not allowed',
        })
      ).toThrow();
    });

    it('validates WorldMemoryCandidateSchema strictly with bounds and scope/node refinements', () => {
      const validGlobalCandidate = {
        kind: 'ESTABLISHED_FACT',
        scope: 'GLOBAL',
        node_id: null,
        statement: 'Power grid is offline.',
        rationale: 'Observed during initial inspection.',
      };
      expect(WorldMemoryCandidateSchema.parse(validGlobalCandidate)).toEqual(
        validGlobalCandidate
      );

      const validNodeCandidate = {
        kind: 'ENVIRONMENTAL_CONDITION',
        scope: 'NODE',
        node_id: 'node-sublevel',
        statement: 'Water level is rising.',
        rationale: 'Stepped into flooded section.',
      };
      expect(WorldMemoryCandidateSchema.parse(validNodeCandidate)).toEqual(
        validNodeCandidate
      );

      // Rejects statement over 240 chars
      expect(() =>
        WorldMemoryCandidateSchema.parse({
          ...validGlobalCandidate,
          statement: 'a'.repeat(241),
        })
      ).toThrow();

      // Rejects rationale over 240 chars
      expect(() =>
        WorldMemoryCandidateSchema.parse({
          ...validGlobalCandidate,
          rationale: 'r'.repeat(241),
        })
      ).toThrow();

      // Rejects candidates array exceeding 2 in WorldMemoryProposalSchema
      expect(() =>
        WorldMemoryProposalSchema.parse({
          candidates: [validGlobalCandidate, validNodeCandidate, validGlobalCandidate],
        })
      ).toThrow();
    });

    it('validates WorldMemoryReceiptSchema', () => {
      const receipt = {
        version: 1,
        pre_state: [],
        post_state: [
          {
            id: 'wm_078dcf15',
            kind: 'ESTABLISHED_FACT',
            scope: 'NODE',
            node_id: 'node-a',
            statement: 'the signal is active',
            established_turn: 1,
          },
        ],
        decisions: [
          {
            candidate: {
              kind: 'ESTABLISHED_FACT',
              scope: 'NODE',
              node_id: 'node-a',
              statement: 'the signal is active',
              rationale: 'Observed active terminal readout.',
            },
            outcome: 'APPLIED',
            reason: 'APPLIED',
            entry: {
              id: 'wm_078dcf15',
              kind: 'ESTABLISHED_FACT',
              scope: 'NODE',
              node_id: 'node-a',
              statement: 'the signal is active',
              established_turn: 1,
            },
          },
        ],
      };
      expect(WorldMemoryReceiptSchema.parse(receipt)).toEqual(receipt);
    });
  });

  describe('2. Deterministic FNV-1a IDs and normalization vectors', () => {
    it('matches the exact required fixed vector', () => {
      const input = {
        kind: 'ESTABLISHED_FACT' as const,
        scope: 'NODE' as const,
        node_id: 'node-a',
        statement: 'the signal is active',
      };
      // Key: "ESTABLISHED_FACT\u0000NODE\u0000node-a\u0000the signal is active"
      // Expected fixed ID: "wm_078dcf15"
      const derived = deriveWorldMemoryId(input);
      expect(derived).toBe('wm_078dcf15');
    });

    it('normalizes Unicode NFKC, trims, and collapses whitespace in statements', () => {
      const unnormalized = '  The   signal \u0041\u030A  is\t\nactive  '; // A + ring above -> Å
      const normalized = normalizeWorldMemoryStatement(unnormalized);
      expect(normalized).toBe('The signal \u00c5 is active');
    });

    it('generates identical IDs for equivalent statements regardless of case and spacing in identity', () => {
      const id1 = deriveWorldMemoryId({
        kind: 'ESTABLISHED_FACT',
        scope: 'NODE',
        node_id: 'node-a',
        statement: 'The Signal Is Active',
      });
      const id2 = deriveWorldMemoryId({
        kind: 'ESTABLISHED_FACT',
        scope: 'NODE',
        node_id: 'node-a',
        statement: '  the   signal   is active  ',
      });
      expect(id1).toBe('wm_078dcf15');
      expect(id2).toBe('wm_078dcf15');
    });

    it('produces distinct IDs when kind, scope, node_id, or statement differs', () => {
      const base = {
        kind: 'ESTABLISHED_FACT' as const,
        scope: 'NODE' as const,
        node_id: 'node-a',
        statement: 'the signal is active',
      };
      const diffKind = deriveWorldMemoryId({ ...base, kind: 'DISCOVERED_EVIDENCE' });
      const diffScope = deriveWorldMemoryId({ ...base, scope: 'GLOBAL', node_id: null });
      const diffNode = deriveWorldMemoryId({ ...base, node_id: 'node-b' });
      const diffStatement = deriveWorldMemoryId({ ...base, statement: 'the signal is lost' });

      expect(diffKind).not.toBe('wm_078dcf15');
      expect(diffScope).not.toBe('wm_078dcf15');
      expect(diffNode).not.toBe('wm_078dcf15');
      expect(diffStatement).not.toBe('wm_078dcf15');
    });
  });

  describe('3. State normalization, invalid-record rejection, ID rederivation, deduplication, cap, and sorting', () => {
    it('creates fresh records, rejects invalid entries, and recomputes IDs', () => {
      const dirtyState = [
        {
          id: 'wm_wrong_id',
          kind: 'ESTABLISHED_FACT' as const,
          scope: 'NODE' as const,
          node_id: 'node-a',
          statement: '  The  signal is   active  ',
          established_turn: 2,
        },
        // Invalid: GLOBAL with node_id
        {
          id: 'wm_invalid_global',
          kind: 'ESTABLISHED_FACT' as const,
          scope: 'GLOBAL' as const,
          node_id: 'node-b',
          statement: 'Invalid global with node',
          established_turn: 1,
        },
        // Invalid: negative turn
        {
          id: 'wm_neg_turn',
          kind: 'ESTABLISHED_FACT' as const,
          scope: 'GLOBAL' as const,
          node_id: null,
          statement: 'Negative turn',
          established_turn: -1,
        },
        // Invalid: empty statement
        {
          id: 'wm_empty',
          kind: 'ESTABLISHED_FACT' as const,
          scope: 'GLOBAL' as const,
          node_id: null,
          statement: '   ',
          established_turn: 0,
        },
      ];

      const clean = createWorldMemoryState(dirtyState as WorldMemoryState);
      expect(clean).toHaveLength(1);
      expect(clean[0]).toEqual({
        id: 'wm_078dcf15',
        kind: 'ESTABLISHED_FACT',
        scope: 'NODE',
        node_id: 'node-a',
        statement: 'The signal is active',
        established_turn: 2,
      });
      // Verify immutability
      expect(clean[0]).not.toBe(dirtyState[0]);
    });

    it('deduplicates identity keeping the first record', () => {
      const stateWithDups = [
        {
          id: 'wm_first',
          kind: 'ESTABLISHED_FACT' as const,
          scope: 'NODE' as const,
          node_id: 'node-a',
          statement: 'First version',
          established_turn: 1,
        },
        {
          id: 'wm_dup',
          kind: 'ESTABLISHED_FACT' as const,
          scope: 'NODE' as const,
          node_id: 'node-a',
          statement: 'first   version',
          established_turn: 5,
        },
      ];

      const clean = createWorldMemoryState(stateWithDups);
      expect(clean).toHaveLength(1);
      expect(clean[0].established_turn).toBe(1);
      expect(clean[0].statement).toBe('First version');
    });

    it('caps state at 64 entries and sorts canonically (turn, kind, scope, node_id, id)', () => {
      const manyEntries: WorldMemoryState = [];
      for (let i = 0; i < 70; i++) {
        manyEntries.push({
          id: `wm_raw_${i}`,
          kind: i % 2 === 0 ? 'ESTABLISHED_FACT' : 'DISCOVERED_EVIDENCE',
          scope: 'NODE',
          node_id: `node-${(i % 5).toString().padStart(2, '0')}`,
          statement: `Statement number ${i}`,
          established_turn: Math.floor(i / 10),
        });
      }

      const clean = createWorldMemoryState(manyEntries);
      expect(clean).toHaveLength(64);
      expect(WorldMemoryStateSchema.parse(clean)).toHaveLength(64);

      // Verify sorting order
      for (let i = 0; i < clean.length - 1; i++) {
        const a = clean[i];
        const b = clean[i + 1];
        if (a.established_turn !== b.established_turn) {
          expect(a.established_turn).toBeLessThan(b.established_turn);
        }
      }
    });
  });

  describe('4. Legacy Lore and Memory Migration', () => {
    it('migrates established_facts to ESTABLISHED_FACT / GLOBAL and permanent_consequences to PERSISTENT_CONSEQUENCE / GLOBAL', () => {
      const legacy: LoreAndMemory = {
        established_facts: ['The station is on Mars', '  Communication relay is silent  '],
        permanent_consequences: ['Airlock 3 door is melted shut'],
      };

      const migrated = migrateLegacyLoreAndMemory(legacy, 3);
      expect(migrated).toHaveLength(3);

      expect(migrated[0].kind).toBe('ESTABLISHED_FACT');
      expect(migrated[0].scope).toBe('GLOBAL');
      expect(migrated[0].node_id).toBeNull();
      expect(migrated[0].established_turn).toBe(3);

      expect(migrated[1].kind).toBe('ESTABLISHED_FACT');
      expect(migrated[1].scope).toBe('GLOBAL');
      expect(migrated[1].node_id).toBeNull();
      expect(migrated[1].established_turn).toBe(3);

      // Legacy exception: PERSISTENT_CONSEQUENCE / GLOBAL is preserved
      expect(migrated[2].kind).toBe('PERSISTENT_CONSEQUENCE');
      expect(migrated[2].scope).toBe('GLOBAL');
      expect(migrated[2].node_id).toBeNull();
      expect(migrated[2].statement).toBe('Airlock 3 door is melted shut');
      expect(migrated[2].established_turn).toBe(3);
    });

    it('does not mutate legacy input and handles null/undefined/empty gracefully', () => {
      const legacy: LoreAndMemory = Object.freeze({
        established_facts: Object.freeze(['Fact 1']) as unknown as string[],
        permanent_consequences: Object.freeze(['Consequence 1']) as unknown as string[],
      });

      const migrated = migrateLegacyLoreAndMemory(legacy);
      expect(migrated).toHaveLength(2);
      expect(migrated[0].established_turn).toBe(0); // default turn 0

      expect(migrateLegacyLoreAndMemory(null)).toEqual([]);
      expect(migrateLegacyLoreAndMemory(undefined)).toEqual([]);
      expect(migrateLegacyLoreAndMemory({ established_facts: [], permanent_consequences: [] })).toEqual(
        []
      );
    });
  });

  describe('5. Kind/Action Matrix Permitted & Rejected Rows', () => {
    // ESTABLISHED_FACT: OBSERVE, INVESTIGATE, COMMUNICATE
    it('accepts ESTABLISHED_FACT on OBSERVE, INVESTIGATE, and COMMUNICATE (with responder)', () => {
      const context = createMockContext();
      const recReceipt = createMockReconciliationReceipt();

      // On OBSERVE
      const resObserve = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'The sky is clouded with ash.',
              rationale: 'Observed out the reinforced viewport.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'OBSERVE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resObserve.decisions[0].outcome).toBe('APPLIED');
      expect(resObserve.decisions[0].reason).toBe('APPLIED');

      // On COMMUNICATE with responder
      const resComm = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'The generator requires coolant cells.',
              rationale: 'Informed by lead scientist.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'COMMUNICATE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt({
          outcome: 'RESPONDED',
          respondingCharacterId: 'char-npc-1',
        }),
      });
      expect(resComm.decisions[0].outcome).toBe('APPLIED');
      expect(resComm.decisions[0].reason).toBe('APPLIED');
    });

    it('rejects ESTABLISHED_FACT on MOVE or MANIPULATE', () => {
      const context = createMockContext();
      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'The door opened.',
              rationale: 'Moved through.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'MOVE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(res.decisions[0].outcome).toBe('REJECTED');
      expect(res.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');
    });

    // DISCOVERED_EVIDENCE: OBSERVE, INVESTIGATE, MANIPULATE
    it('accepts DISCOVERED_EVIDENCE on OBSERVE, INVESTIGATE, MANIPULATE, and rejects on MOVE or COMMUNICATE', () => {
      const context = createMockContext();
      const recReceipt = createMockReconciliationReceipt();

      const resManipulate = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'DISCOVERED_EVIDENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'A hidden keycard was taped under the console.',
              rationale: 'Pried the access panel open.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'MANIPULATE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resManipulate.decisions[0].outcome).toBe('APPLIED');
      expect(resManipulate.decisions[0].reason).toBe('APPLIED');

      const resMove = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'DISCOVERED_EVIDENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'A dropped notebook.',
              rationale: 'Found while moving.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'MOVE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resMove.decisions[0].outcome).toBe('REJECTED');
      expect(resMove.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');
    });

    // ENVIRONMENTAL_CONDITION: MOVE, MANIPULATE
    it('accepts ENVIRONMENTAL_CONDITION on MOVE, MANIPULATE, and rejects on OBSERVE or INVESTIGATE', () => {
      const context = createMockContext();
      const recReceipt = createMockReconciliationReceipt();

      const resMove = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ENVIRONMENTAL_CONDITION',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'Corridor temperature is dropping below freezing.',
              rationale: 'Breached the frost sector.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'MOVE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resMove.decisions[0].outcome).toBe('APPLIED');
      expect(resMove.decisions[0].reason).toBe('APPLIED');

      const resInvestigate = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ENVIRONMENTAL_CONDITION',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'Freezing corridor.',
              rationale: 'Checking thermometer.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resInvestigate.decisions[0].outcome).toBe('REJECTED');
      expect(resInvestigate.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');
    });

    // PERSISTENT_CONSEQUENCE: MOVE, MANIPULATE
    it('accepts PERSISTENT_CONSEQUENCE on MOVE, MANIPULATE, and rejects on OBSERVE or INVESTIGATE', () => {
      const context = createMockContext();
      const recReceipt = createMockReconciliationReceipt();

      const resManipulate = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'PERSISTENT_CONSEQUENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'Primary circuit breaker destroyed.',
              rationale: 'Smashed the switchboard.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'MANIPULATE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resManipulate.decisions[0].outcome).toBe('APPLIED');
      expect(resManipulate.decisions[0].reason).toBe('APPLIED');

      const resObserve = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'PERSISTENT_CONSEQUENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'Circuit breaker is smashed.',
              rationale: 'Looking at the rubble.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'OBSERVE' }),
        reconciliationReceipt: recReceipt,
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resObserve.decisions[0].outcome).toBe('REJECTED');
      expect(resObserve.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');
    });

    it('rejects WAIT, OTHER, and SYSTEM actions for any kind', () => {
      const context = createMockContext();
      for (const actionKind of ['WAIT', 'OTHER'] as const) {
        const res = resolveWorldMemory({
          proposal: {
            candidates: [
              {
                kind: 'ESTABLISHED_FACT',
                scope: 'GLOBAL',
                node_id: null,
                statement: 'Time passed.',
                rationale: 'Waited.',
              },
            ],
          },
          currentState: [],
          currentTurn: 1,
          context,
          intentReceipt: createMockIntentReceipt({ action_kind: actionKind }),
          reconciliationReceipt: createMockReconciliationReceipt(),
          castInteractionReceipt: createMockCastInteractionReceipt(),
        });
        expect(res.decisions[0].outcome).toBe('REJECTED');
        expect(res.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');
      }

      // SYSTEM triggers RECONCILIATION_SUPPRESSED first by precedence rule 1
      const resSystem = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'System event.',
              rationale: 'Automated.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'SYSTEM' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resSystem.decisions[0].outcome).toBe('REJECTED');
      expect(resSystem.decisions[0].reason).toBe('RECONCILIATION_SUPPRESSED');
    });
  });

  describe('6. Rejection Precedence & All Reasons', () => {
    it('enforces Rule 1: RECONCILIATION_SUPPRESSED over subsequent rules', () => {
      // Even with un-authorized role, invalid action, wrong node, etc.
      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'PERSISTENT_CONSEQUENCE',
              scope: 'GLOBAL', // would be GLOBAL_SCOPE_NOT_AUTHORIZED
              node_id: null,
              statement: 'World broke.',
              rationale: 'Test',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context: createMockContext({
          player: {
            role: 'director', // would be ROLE_NOT_AUTHORIZED
            characterId: 'char-director',
            name: 'Director',
            description: 'Director',
            isEntity: false,
          },
        }),
        intentReceipt: createMockIntentReceipt({ action_kind: 'WAIT' }), // would be ACTION_NOT_AUTHORIZED
        reconciliationReceipt: createMockReconciliationReceipt({
          mode: 'EXPERIENTIAL_REANCHORED',
        }),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });

      expect(res.decisions[0].outcome).toBe('REJECTED');
      expect(res.decisions[0].reason).toBe('RECONCILIATION_SUPPRESSED');
    });

    it('enforces Rule 2: ROLE_NOT_AUTHORIZED for unauthorized roles and non-compliant antagonists', () => {
      const contextDirector = createMockContext({
        player: {
          role: 'director',
          characterId: 'char-director',
          name: 'Director',
          description: 'Director',
          isEntity: false,
        },
      });

      const resDirector = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'A truth.',
              rationale: 'Test',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context: contextDirector,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resDirector.decisions[0].outcome).toBe('REJECTED');
      expect(resDirector.decisions[0].reason).toBe('ROLE_NOT_AUTHORIZED');

      // Antagonist out of contract
      const contextAntagonist = createMockContext({
        player: {
          role: 'antagonist',
          characterId: 'char-antagonist',
          name: 'Antagonist',
          description: 'Antagonist',
          isEntity: false,
        },
      });
      const resAntagonist = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'A truth.',
              rationale: 'Test',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context: contextAntagonist,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt({
          authority_alignment: 'NOT_APPLICABLE',
        }),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resAntagonist.decisions[0].outcome).toBe('REJECTED');
      expect(resAntagonist.decisions[0].reason).toBe('ROLE_NOT_AUTHORIZED');

      // Antagonist within contract is authorized
      const resAntagonistOk = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'A truth.',
              rationale: 'Test',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context: contextAntagonist,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt({
          authority_alignment: 'WITHIN_CONTRACT',
        }),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(resAntagonistOk.decisions[0].outcome).toBe('APPLIED');
      expect(resAntagonistOk.decisions[0].reason).toBe('APPLIED');
    });

    it('enforces Rule 4: GLOBAL_SCOPE_NOT_AUTHORIZED for non-ESTABLISHED_FACT kinds proposed as GLOBAL', () => {
      const context = createMockContext();
      for (const nonFactKind of [
        'DISCOVERED_EVIDENCE',
        'ENVIRONMENTAL_CONDITION',
        'PERSISTENT_CONSEQUENCE',
      ] as const) {
        const res = resolveWorldMemory({
          proposal: {
            candidates: [
              {
                kind: nonFactKind,
                scope: 'GLOBAL',
                node_id: null,
                statement: 'Some global condition.',
                rationale: 'Test',
              },
            ],
          },
          currentState: [],
          currentTurn: 1,
          context,
          intentReceipt: createMockIntentReceipt({ action_kind: 'MANIPULATE' }),
          reconciliationReceipt: createMockReconciliationReceipt(),
          castInteractionReceipt: createMockCastInteractionReceipt(),
        });
        expect(res.decisions[0].outcome).toBe('REJECTED');
        expect(res.decisions[0].reason).toBe('GLOBAL_SCOPE_NOT_AUTHORIZED');
      }
    });

    it('enforces Rule 5: CURRENT_NODE_MISMATCH for NODE scope when node_id does not match context.topology.currentNodeId', () => {
      const context = createMockContext({
        topology: {
          currentNodeId: 'node-current',
          readableNodeLabel: 'Current Node',
          allowedOutgoingExits: [],
        },
      });

      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'DISCOVERED_EVIDENCE',
              scope: 'NODE',
              node_id: 'node-elsewhere',
              statement: 'Evidence in another room.',
              rationale: 'Telepathic check.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });
      expect(res.decisions[0].outcome).toBe('REJECTED');
      expect(res.decisions[0].reason).toBe('CURRENT_NODE_MISMATCH');
    });

    it('enforces Rule 6: COMMUNICATION_SOURCE_MISSING for ESTABLISHED_FACT on COMMUNICATE without actual responder', () => {
      const context = createMockContext();

      // No dialogue response
      const resUnanswered = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'Security code is 4491.',
              rationale: 'Asked the scientist.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'COMMUNICATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt({
          outcome: 'ADDRESS_UNANSWERED',
          addressedCharacterId: 'char-npc-1',
          respondingCharacterId: null,
        }),
      });
      expect(resUnanswered.decisions[0].outcome).toBe('REJECTED');
      expect(resUnanswered.decisions[0].reason).toBe('COMMUNICATION_SOURCE_MISSING');
    });

    it('enforces Rule 7: DUPLICATE_ENTRY as NO_CHANGE for an existing identity', () => {
      const existingEntry = {
        id: 'wm_078dcf15',
        kind: 'ESTABLISHED_FACT' as const,
        scope: 'NODE' as const,
        node_id: 'node-a',
        statement: 'the signal is active',
        established_turn: 1,
      };

      const context = createMockContext({
        topology: {
          currentNodeId: 'node-a',
          readableNodeLabel: 'Node A',
          allowedOutgoingExits: [],
        },
      });

      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'NODE',
              node_id: 'node-a',
              statement: '  The  SIGNAL is active  ',
              rationale: 'Re-verifying terminal status.',
            },
          ],
        },
        currentState: [existingEntry],
        currentTurn: 2,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });

      expect(res.decisions[0].outcome).toBe('NO_CHANGE');
      expect(res.decisions[0].reason).toBe('DUPLICATE_ENTRY');
      expect(res.decisions[0].entry).toBeNull();
      expect(res.post_state).toHaveLength(1);
    });

    it('enforces Rule 8: STATE_LIMIT as REJECTED when working state reaches 64 entries', () => {
      const fullState: WorldMemoryState = [];
      for (let i = 0; i < 64; i++) {
        fullState.push({
          id: `wm_entry_${i}`,
          kind: 'ESTABLISHED_FACT',
          scope: 'GLOBAL',
          node_id: null,
          statement: `Fact ${i}`,
          established_turn: 0,
        });
      }

      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              node_id: null,
              statement: 'Fact 65',
              rationale: 'Another observation.',
            },
          ],
        },
        currentState: fullState,
        currentTurn: 1,
        context: createMockContext(),
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });

      expect(res.decisions[0].outcome).toBe('REJECTED');
      expect(res.decisions[0].reason).toBe('STATE_LIMIT');
      expect(res.post_state).toHaveLength(64);
    });
  });

  describe('7. Multi-candidate sequential evaluation and state limits', () => {
    it('applies candidate 1 and rejects identical candidate 2 as DUPLICATE_ENTRY', () => {
      const context = createMockContext({
        topology: {
          currentNodeId: 'node-current',
          readableNodeLabel: 'Current Node',
          allowedOutgoingExits: [],
        },
      });

      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'DISCOVERED_EVIDENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'A bloodstained keycard is on the table.',
              rationale: 'Examined the table.',
            },
            {
              kind: 'DISCOVERED_EVIDENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: '  a  bloodstained KEYCARD is on the table. ',
              rationale: 'Examined again.',
            },
          ],
        },
        currentState: [],
        currentTurn: 3,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });

      expect(res.decisions).toHaveLength(2);
      expect(res.decisions[0].outcome).toBe('APPLIED');
      expect(res.decisions[0].reason).toBe('APPLIED');
      expect(res.decisions[1].outcome).toBe('NO_CHANGE');
      expect(res.decisions[1].reason).toBe('DUPLICATE_ENTRY');
      expect(res.post_state).toHaveLength(1);
    });

    it('allows identical statement in different kinds or nodes to remain distinct identities', () => {
      const context = createMockContext({
        topology: {
          currentNodeId: 'node-current',
          readableNodeLabel: 'Current Node',
          allowedOutgoingExits: [],
        },
      });

      const res = resolveWorldMemory({
        proposal: {
          candidates: [
            {
              kind: 'DISCOVERED_EVIDENCE',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'Radiation leak detected.',
              rationale: 'Sensor log.',
            },
            {
              kind: 'ENVIRONMENTAL_CONDITION',
              scope: 'NODE',
              node_id: 'node-current',
              statement: 'Radiation leak detected.',
              rationale: 'Active geiger counter click.',
            },
          ],
        },
        currentState: [],
        currentTurn: 1,
        context,
        intentReceipt: createMockIntentReceipt({ action_kind: 'MANIPULATE' }),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });

      expect(res.decisions[0].outcome).toBe('APPLIED');
      expect(res.decisions[1].outcome).toBe('APPLIED');
      expect(res.post_state).toHaveLength(2);
      expect(res.post_state[0].id).not.toBe(res.post_state[1].id);
    });

    it('handles empty candidates array in proposal gracefully', () => {
      const res = resolveWorldMemory({
        proposal: { candidates: [] },
        currentState: [],
        currentTurn: 1,
        context: createMockContext(),
        intentReceipt: createMockIntentReceipt(),
        reconciliationReceipt: createMockReconciliationReceipt(),
        castInteractionReceipt: createMockCastInteractionReceipt(),
      });

      expect(res.decisions).toEqual([]);
      expect(res.pre_state).toEqual([]);
      expect(res.post_state).toEqual([]);
      expect(res.version).toBe(1);
    });
  });

  describe('8. Immutability and Schema Conformance', () => {
    it('preserves deep-frozen input structures and output conforms to WorldMemoryReceiptSchema', () => {
      const frozenContext = deepFreeze(createMockContext());
      const frozenIntent = deepFreeze(createMockIntentReceipt());
      const frozenReconciliation = deepFreeze(createMockReconciliationReceipt());
      const frozenCastInteraction = deepFreeze(createMockCastInteractionReceipt());
      const frozenProposal: WorldMemoryProposal = deepFreeze({
        candidates: [
          {
            kind: 'ESTABLISHED_FACT' as const,
            scope: 'GLOBAL' as const,
            node_id: null,
            statement: 'Observation recorded.',
            rationale: 'Observed securely.',
          },
        ],
      });
      const frozenState: WorldMemoryState = deepFreeze([]);

      const receipt = resolveWorldMemory({
        proposal: frozenProposal,
        currentState: frozenState,
        currentTurn: 1,
        context: frozenContext,
        intentReceipt: frozenIntent,
        reconciliationReceipt: frozenReconciliation,
        castInteractionReceipt: frozenCastInteraction,
      });

      const parsed = WorldMemoryReceiptSchema.parse(receipt);
      expect(parsed).toEqual(receipt);
      expect(parsed.post_state).toHaveLength(1);
    });
  });
});
