import { describe, it, expect } from 'vitest';
import {
  CHARACTER_MEMORY_SOURCES,
  CHARACTER_MEMORY_CERTAINTIES,
  MAX_CHARACTER_MEMORY_PROPOSALS,
  MAX_MEMORIES_PER_CHARACTER,
  MAX_CHARACTER_MEMORY_FACT_LENGTH,
  MAX_CHARACTER_MEMORY_RATIONALE_LENGTH,
  CHARACTER_MEMORY_DECISION_OUTCOMES,
  CHARACTER_MEMORY_DECISION_REASONS,
  CharacterMemorySourceSchema,
  CharacterMemoryCertaintySchema,
  CharacterMemoryEntrySchema,
  CharacterMemoryByIdSchema,
  CharacterMemoryCandidateSchema,
  CharacterMemoryProposalSchema,
  CharacterMemoryDecisionSchema,
  CharacterMemoryReceiptSchema,
  CharacterMemoryById,
  CharacterMemoryProposal,
  EngineTurnContext,
  IntentReceipt,
  NarrativeReconciliationReceipt,
  CastInteractionReceipt,
} from '../types';
import {
  normalizeCharacterMemoryFact,
  deriveCharacterMemoryId,
  createCharacterMemoryState,
  resolveCharacterMemory,
} from './characterMemory';

function deepFreeze<T>(obj: T): Readonly<T> {
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
      },
      {
        id: 'char-npc-2',
        name: 'Guard Sterling',
        role: 'Security',
        description: 'Enclosure guard',
        personality: 'Stoic',
        goals: 'Lockdown',
        traits: ['Disciplined'],
        isEntity: false,
        isUserCharacter: false,
        skepticism: 0.8,
        isPresent: true,
        stance: null,
      },
      {
        id: 'char-npc-absent',
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
      },
    ],
    topology: {
      currentNodeId: 'node-1',
      readableNodeLabel: 'Research Wing',
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

function createIntentReceipt(overrides?: Partial<IntentReceipt>): IntentReceipt {
  return {
    version: 1,
    action_kind: 'OBSERVE',
    action_subtype: null,
    pressure_direction: 'MAINTAIN',
    dramatic_tactic: 'NONE',
    intent_synergy: 'N/A',
    ...overrides,
  };
}

function createReconciliationReceipt(
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

function createCastInteractionReceipt(
  overrides?: Partial<CastInteractionReceipt>
): CastInteractionReceipt {
  return {
    version: 1,
    addressedCharacterId: null,
    respondingCharacterId: null,
    outcome: 'NONE',
    ...overrides,
  };
}

describe('Phase 3H.4A: Character Memory Contracts and Pure Resolver', () => {
  describe('1. Schema contracts, strict keys, bounds, and enums', () => {
    it('exports all required constant arrays and limits', () => {
      expect(CHARACTER_MEMORY_SOURCES).toEqual(['OBSERVED', 'TOLD']);
      expect(CHARACTER_MEMORY_CERTAINTIES).toEqual(['KNOWN', 'BELIEVED']);
      expect(MAX_CHARACTER_MEMORY_PROPOSALS).toBe(2);
      expect(MAX_MEMORIES_PER_CHARACTER).toBe(24);
      expect(MAX_CHARACTER_MEMORY_FACT_LENGTH).toBe(200);
      expect(MAX_CHARACTER_MEMORY_RATIONALE_LENGTH).toBe(240);
      expect(CHARACTER_MEMORY_DECISION_OUTCOMES).toEqual(['APPLIED', 'REJECTED', 'NO_CHANGE']);
      expect(CHARACTER_MEMORY_DECISION_REASONS).toEqual([
        'APPLIED',
        'RECONCILIATION_SUPPRESSED',
        'ROLE_NOT_AUTHORIZED',
        'ACTION_NOT_AUTHORIZED',
        'UNKNOWN_CHARACTER',
        'PLAYER_CHARACTER',
        'CHARACTER_ABSENT',
        'COMMUNICATION_TARGET_MISMATCH',
        'SOURCE_ACTION_MISMATCH',
        'DUPLICATE_FACT',
        'STATE_LIMIT',
      ]);
    });

    it('validates enums and map schemas strictly', () => {
      expect(CharacterMemorySourceSchema.safeParse('OBSERVED').success).toBe(true);
      expect(CharacterMemorySourceSchema.safeParse('TOLD').success).toBe(true);
      expect(CharacterMemorySourceSchema.safeParse('HEARD').success).toBe(false);

      expect(CharacterMemoryCertaintySchema.safeParse('KNOWN').success).toBe(true);
      expect(CharacterMemoryCertaintySchema.safeParse('BELIEVED').success).toBe(true);
      expect(CharacterMemoryCertaintySchema.safeParse('SUSPECTED').success).toBe(false);

      const mapState = {
        'char-npc-1': [
          {
            id: 'cm_c0e591c6',
            fact: 'the signal is active',
            source: 'OBSERVED' as const,
            certainty: 'KNOWN' as const,
            acquired_turn: 1,
          },
        ],
      };
      expect(CharacterMemoryByIdSchema.safeParse(mapState).success).toBe(true);
      expect(CharacterMemoryByIdSchema.safeParse({ '': [] }).success).toBe(false);
    });

    it('enforces strict schemas and rejects extra keys', () => {
      const validEntry = {
        id: 'cm_c0e591c6',
        fact: 'the signal is active',
        source: 'OBSERVED',
        certainty: 'KNOWN',
        acquired_turn: 3,
      };
      expect(CharacterMemoryEntrySchema.safeParse(validEntry).success).toBe(true);

      // Rejects extra properties (strict)
      expect(
        CharacterMemoryEntrySchema.safeParse({
          ...validEntry,
          extraProp: 'not allowed',
        }).success
      ).toBe(false);

      // Rejects negative or non-integer acquired_turn
      expect(
        CharacterMemoryEntrySchema.safeParse({
          ...validEntry,
          acquired_turn: -1,
        }).success
      ).toBe(false);
      expect(
        CharacterMemoryEntrySchema.safeParse({
          ...validEntry,
          acquired_turn: 1.5,
        }).success
      ).toBe(false);

      // Rejects fact exceeding max length
      expect(
        CharacterMemoryEntrySchema.safeParse({
          ...validEntry,
          fact: 'x'.repeat(MAX_CHARACTER_MEMORY_FACT_LENGTH + 1),
        }).success
      ).toBe(false);
    });

    it('enforces candidate and proposal schemas strictly', () => {
      const validCandidate = {
        character_id: 'char-npc-1',
        fact: 'the vault seal is broken',
        source: 'OBSERVED' as const,
        certainty: 'KNOWN' as const,
        rationale: 'Observed during sweep',
      };
      expect(CharacterMemoryCandidateSchema.safeParse(validCandidate).success).toBe(true);

      // Rejects candidate with extra prop
      expect(
        CharacterMemoryCandidateSchema.safeParse({
          ...validCandidate,
          confidenceScore: 0.9,
        }).success
      ).toBe(false);

      // Rejects proposal with more than 2 candidates
      const proposalOverCap = {
        candidates: [validCandidate, validCandidate, validCandidate],
      };
      expect(CharacterMemoryProposalSchema.safeParse(proposalOverCap).success).toBe(false);

      const proposalValid = {
        candidates: [validCandidate, validCandidate],
      };
      expect(CharacterMemoryProposalSchema.safeParse(proposalValid).success).toBe(true);
    });

    it('validates decision schema strictly', () => {
      const validDecision = {
        candidate: {
          character_id: 'char-npc-1',
          fact: 'the vault seal is broken',
          source: 'OBSERVED' as const,
          certainty: 'KNOWN' as const,
          rationale: 'Observed sweep',
        },
        outcome: 'APPLIED' as const,
        reason: 'APPLIED' as const,
        entry: {
          id: 'cm_c0e591c6',
          fact: 'the vault seal is broken',
          source: 'OBSERVED' as const,
          certainty: 'KNOWN' as const,
          acquired_turn: 1,
        },
      };
      expect(CharacterMemoryDecisionSchema.safeParse(validDecision).success).toBe(true);
    });
  });

  describe('2. Fact normalization and exact FNV-1a test vectors', () => {
    it('normalizes Unicode NFKC, trims, and collapses internal whitespace', () => {
      const raw = '  the \u0041\u030A   signal   is \t \n active  ';
      const normalized = normalizeCharacterMemoryFact(raw);
      expect(normalized).toBe('the \u00C5 signal is active');
    });

    it('derives exact known FNV-1a ID vector with 8 lowercase hex digits', () => {
      // Required fixed vector from specification
      const charId = 'char-a';
      const normalizedFact = 'the signal is active';
      const expectedId = 'cm_c0e591c6';

      const derived = deriveCharacterMemoryId(charId, normalizedFact);
      expect(derived).toBe(expectedId);
      expect(derived).toMatch(/^cm_[0-9a-f]{8}$/);
    });

    it('derives identical IDs regardless of whitespace or casing in input', () => {
      const id1 = deriveCharacterMemoryId('char-a', 'the signal is active');
      const id2 = deriveCharacterMemoryId('  char-a  ', '  THE   SIGNAL  IS   ACTIVE  ');
      expect(id1).toBe('cm_c0e591c6');
      expect(id2).toBe('cm_c0e591c6');
    });

    it('derives distinct independent IDs for different characters with the same fact', () => {
      const idA = deriveCharacterMemoryId('char-a', 'the signal is active');
      const idB = deriveCharacterMemoryId('char-b', 'the signal is active');

      // Fixed expected constants
      expect(idA).toBe('cm_c0e591c6');
      expect(idB).toBe('cm_b700a845');
      expect(idA).not.toBe(idB);
    });

    it('derives distinct independent IDs for different facts with the same character', () => {
      const id1 = deriveCharacterMemoryId('char-a', 'the signal is active');
      const id2 = deriveCharacterMemoryId('char-a', 'generator is failing');

      expect(id1).toBe('cm_c0e591c6');
      expect(id2).toBe('cm_19580ef6');
      expect(id1).not.toBe(id2);
    });
  });

  describe('3. State normalization and creation', () => {
    it('creates a fresh state, rederives IDs, discards invalid records, and deduplicates', () => {
      const dirtyState: CharacterMemoryById = {
        'char-b': [
          {
            id: 'fake-id-123',
            fact: '  the   signal is active  ',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 2,
          },
          {
            id: 'fake-id-dup',
            fact: 'THE SIGNAL IS ACTIVE', // Duplicate fact identity
            source: 'TOLD',
            certainty: 'BELIEVED',
            acquired_turn: 3,
          },
          {
            id: 'invalid-turn',
            fact: 'another fact',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: -5 as unknown as number, // Invalid
          },
        ],
        '  char-a  ': [
          {
            id: 'untrusted-id',
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 1,
          },
        ],
      };

      const normalized = createCharacterMemoryState(dirtyState);

      // Keys sorted lexically
      expect(Object.keys(normalized)).toEqual(['char-a', 'char-b']);

      // Rederived IDs
      expect(normalized['char-a'][0].id).toBe('cm_c0e591c6');
      expect(normalized['char-a'][0].acquired_turn).toBe(1);

      // char-b deduplicated and invalid discarded
      expect(normalized['char-b']).toHaveLength(1);
      expect(normalized['char-b'][0].id).toBe('cm_b700a845');
      expect(normalized['char-b'][0].fact).toBe('the signal is active');
      expect(normalized['char-b'][0].acquired_turn).toBe(2);
    });

    it('sorts entries by acquired_turn then id', () => {
      const state: CharacterMemoryById = {
        'char-npc': [
          {
            id: 'cm_99999999',
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 5,
          },
          {
            id: 'cm_00000000',
            fact: 'generator is failing',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 1,
          },
        ],
      };

      const normalized = createCharacterMemoryState(state);
      expect(normalized['char-npc'][0].acquired_turn).toBe(1);
      expect(normalized['char-npc'][1].acquired_turn).toBe(5);
    });

    it('caps entries at MAX_MEMORIES_PER_CHARACTER (24)', () => {
      const entries = Array.from({ length: 30 }, (_, i) => ({
        id: `fake-${i}`,
        fact: `unique fact number ${i}`,
        source: 'OBSERVED' as const,
        certainty: 'KNOWN' as const,
        acquired_turn: i,
      }));

      const normalized = createCharacterMemoryState({ 'char-npc': entries });
      expect(normalized['char-npc']).toHaveLength(MAX_MEMORIES_PER_CHARACTER);
      expect(normalized['char-npc'][0].acquired_turn).toBe(0);
      expect(normalized['char-npc'][23].acquired_turn).toBe(23);
    });

    it('handles null, undefined, or empty state safely', () => {
      expect(createCharacterMemoryState(null)).toEqual({});
      expect(createCharacterMemoryState(undefined)).toEqual({});
      expect(createCharacterMemoryState({} as CharacterMemoryById)).toEqual({});
    });
  });

  describe('4. Pure Resolver: Valid resolution flows', () => {
    it('applies a valid OBSERVED memory proposal during an OBSERVE action', () => {
      const context = createMockContext();
      const proposal: CharacterMemoryProposal = {
        candidates: [
          {
            character_id: 'char-npc-1',
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            rationale: 'Observed the monitor glowing',
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal,
        currentState: {},
        currentTurn: 2,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'OBSERVE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });

      expect(receipt.version).toBe(1);
      expect(receipt.decisions).toHaveLength(1);
      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.decisions[0].reason).toBe('APPLIED');
      expect(receipt.decisions[0].entry).toEqual({
        id: deriveCharacterMemoryId('char-npc-1', 'the signal is active'),
        fact: 'the signal is active',
        source: 'OBSERVED',
        certainty: 'KNOWN',
        acquired_turn: 2,
      });

      expect(receipt.post_state['char-npc-1']).toHaveLength(1);
      expect(receipt.post_state['char-npc-1'][0].fact).toBe('the signal is active');
      expect(CharacterMemoryReceiptSchema.parse(receipt)).toBeDefined();
    });

    it('applies a valid TOLD memory proposal during COMMUNICATE when target is addressed', () => {
      const context = createMockContext();
      const proposal: CharacterMemoryProposal = {
        candidates: [
          {
            character_id: 'char-npc-1',
            fact: 'the security code is 4402',
            source: 'TOLD',
            certainty: 'KNOWN',
            rationale: 'Player whispered code to Dr. Moore',
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal,
        currentState: {},
        currentTurn: 4,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'COMMUNICATE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt({
          addressedCharacterId: 'char-npc-1',
          respondingCharacterId: null,
        }),
      });

      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.decisions[0].reason).toBe('APPLIED');
      expect(receipt.decisions[0].entry?.source).toBe('TOLD');
      expect(receipt.post_state['char-npc-1']).toHaveLength(1);
    });

    it('applies a valid TOLD memory proposal when target is responding character', () => {
      const context = createMockContext();
      const proposal: CharacterMemoryProposal = {
        candidates: [
          {
            character_id: 'char-npc-2',
            fact: 'the blast door is locked',
            source: 'TOLD',
            certainty: 'BELIEVED',
            rationale: 'Heard in response exchange',
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal,
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'COMMUNICATE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt({
          addressedCharacterId: null,
          respondingCharacterId: 'char-npc-2',
        }),
      });

      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.decisions[0].reason).toBe('APPLIED');
      expect(receipt.decisions[0].entry?.id).toBe(
        deriveCharacterMemoryId('char-npc-2', 'the blast door is locked')
      );
    });

    it('handles multiple candidates in one turn with fresh order visibility', () => {
      const context = createMockContext();
      const proposal: CharacterMemoryProposal = {
        candidates: [
          {
            character_id: 'char-npc-1',
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            rationale: 'First candidate',
          },
          {
            character_id: 'char-npc-2',
            fact: 'the blast door is locked',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            rationale: 'Second candidate',
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal,
        currentState: {},
        currentTurn: 3,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });

      expect(receipt.decisions).toHaveLength(2);
      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.decisions[1].outcome).toBe('APPLIED');
      expect(Object.keys(receipt.post_state)).toEqual(['char-npc-1', 'char-npc-2']);
    });
  });

  describe('5. Pure Resolver: Rejection Precedence and Specific Failures', () => {
    it('1. RECONCILIATION_SUPPRESSED for NOT_REQUIRED, EXPERIENTIAL_REANCHORED, IMPOSSIBLE, or SYSTEM', () => {
      const context = createMockContext();
      const candidate = {
        character_id: 'char-npc-1',
        fact: 'the signal is active',
        source: 'OBSERVED' as const,
        certainty: 'KNOWN' as const,
        rationale: 'Testing suppression',
      };

      // NOT_REQUIRED
      let receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt({ mode: 'NOT_REQUIRED' }),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('RECONCILIATION_SUPPRESSED');

      // EXPERIENTIAL_REANCHORED
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt({ mode: 'EXPERIENTIAL_REANCHORED' }),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('RECONCILIATION_SUPPRESSED');

      // IMPOSSIBLE
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt({ feasibility: 'IMPOSSIBLE' }),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('RECONCILIATION_SUPPRESSED');

      // SYSTEM action
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'SYSTEM' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('RECONCILIATION_SUPPRESSED');
    });

    it('2. ROLE_NOT_AUTHORIZED for unauthorized roles', () => {
      const candidate = {
        character_id: 'char-npc-1',
        fact: 'the signal is active',
        source: 'OBSERVED' as const,
        certainty: 'KNOWN' as const,
        rationale: 'Testing role authorization',
      };

      // Director role
      let context = createMockContext({
        player: {
          role: 'director',
          characterId: null,
          name: 'The Director',
          description: 'Narrative overseer',
          isEntity: false,
        },
      });
      let receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('ROLE_NOT_AUTHORIZED');

      // Witness role
      context = createMockContext({
        player: {
          role: 'witness',
          characterId: null,
          name: 'The Witness',
          description: 'Observer',
          isEntity: false,
        },
      });
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('ROLE_NOT_AUTHORIZED');

      // Antagonist without WITHIN_CONTRACT
      context = createMockContext({
        player: {
          role: 'antagonist',
          characterId: 'char-npc-2',
          name: 'Guard Sterling',
          description: 'Antagonist',
          isEntity: false,
        },
      });
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt({
          authority_alignment: 'EXCEEDS_CONTRACT',
        }),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('ROLE_NOT_AUTHORIZED');

      // Antagonist with WITHIN_CONTRACT is authorized
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt({
          authority_alignment: 'WITHIN_CONTRACT',
        }),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.decisions[0].reason).toBe('APPLIED');
    });

    it('3. ACTION_NOT_AUTHORIZED for WAIT or OTHER actions', () => {
      const context = createMockContext();
      const candidate = {
        character_id: 'char-npc-1',
        fact: 'the signal is active',
        source: 'OBSERVED' as const,
        certainty: 'KNOWN' as const,
        rationale: 'Action authorization check',
      };

      // WAIT action
      let receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'WAIT' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');

      // OTHER action
      receipt = resolveCharacterMemory({
        proposal: { candidates: [candidate] },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'OTHER' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('ACTION_NOT_AUTHORIZED');
    });

    it('4. UNKNOWN_CHARACTER when target does not match any cast member', () => {
      const context = createMockContext();
      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'ghost-character-999',
              fact: 'the signal is active',
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Unknown target',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('UNKNOWN_CHARACTER');
    });

    it('5. PLAYER_CHARACTER when target is the player or has isUserCharacter', () => {
      const context = createMockContext();

      // Explicit player characterId
      let receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-player',
              fact: 'the signal is active',
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Targeting player',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('PLAYER_CHARACTER');

      // Cast member with isUserCharacter = true
      const customContext = createMockContext({
        player: {
          role: 'protagonist',
          characterId: 'some-other-id',
          name: 'Player',
          description: 'Player',
          isEntity: false,
        },
        cast: [
          {
            id: 'char-custom-user',
            name: 'User NPC',
            role: 'Protagonist',
            description: 'User character',
            personality: 'Observant',
            goals: 'Investigate',
            traits: [],
            isEntity: false,
            isUserCharacter: true,
            skepticism: 0.5,
            isPresent: true,
            stance: null,
          },
        ],
      });
      receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-custom-user',
              fact: 'the signal is active',
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Targeting user character',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context: customContext,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('PLAYER_CHARACTER');
    });

    it('6. CHARACTER_ABSENT when target is not present (isPresent = false)', () => {
      const context = createMockContext();
      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-npc-absent',
              fact: 'the signal is active',
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Target is absent',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('CHARACTER_ABSENT');
    });

    it('7. SOURCE_ACTION_MISMATCH for TOLD when action is not COMMUNICATE', () => {
      const context = createMockContext();
      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-npc-1',
              fact: 'the signal is active',
              source: 'TOLD',
              certainty: 'KNOWN',
              rationale: 'Told during MOVE',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'MOVE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('SOURCE_ACTION_MISMATCH');
    });

    it('8. COMMUNICATION_TARGET_MISMATCH for TOLD on COMMUNICATE when target was neither addressed nor responding', () => {
      const context = createMockContext();
      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-npc-2',
              fact: 'the signal is active',
              source: 'TOLD',
              certainty: 'KNOWN',
              rationale: 'Told but spoke only with char-npc-1',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'COMMUNICATE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt({
          addressedCharacterId: 'char-npc-1',
          respondingCharacterId: 'char-npc-1',
        }),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('COMMUNICATION_TARGET_MISMATCH');
    });

    it('9. SOURCE_ACTION_MISMATCH for OBSERVED on COMMUNICATE action', () => {
      const context = createMockContext();
      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-npc-1',
              fact: 'the signal is active',
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Direct observation during communication',
            },
          ],
        },
        currentState: {},
        currentTurn: 1,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'COMMUNICATE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt({
          addressedCharacterId: 'char-npc-1',
          respondingCharacterId: 'char-npc-1',
        }),
      });
      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('SOURCE_ACTION_MISMATCH');
    });

    it('10. DUPLICATE_FACT produces NO_CHANGE outcome and null entry', () => {
      const context = createMockContext();
      const currentState: CharacterMemoryById = {
        'char-npc-1': [
          {
            id: deriveCharacterMemoryId('char-npc-1', 'the signal is active'),
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 1,
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-npc-1',
              fact: 'THE SIGNAL IS ACTIVE', // Case-insensitive duplicate
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Duplicate discovery',
            },
          ],
        },
        currentState,
        currentTurn: 2,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'OBSERVE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });

      expect(receipt.decisions[0].outcome).toBe('NO_CHANGE');
      expect(receipt.decisions[0].reason).toBe('DUPLICATE_FACT');
      expect(receipt.decisions[0].entry).toBeNull();
      expect(receipt.post_state['char-npc-1']).toHaveLength(1);
      expect(receipt.post_state['char-npc-1'][0].acquired_turn).toBe(1);
    });

    it('11. STATE_LIMIT produces REJECTED outcome when ledger is full (24)', () => {
      const context = createMockContext();
      const existingEntries = Array.from({ length: 24 }, (_, i) => ({
        id: `cm_${i.toString().padStart(8, '0')}`,
        fact: `fact number ${i}`,
        source: 'OBSERVED' as const,
        certainty: 'KNOWN' as const,
        acquired_turn: i,
      }));

      const currentState: CharacterMemoryById = {
        'char-npc-1': existingEntries,
      };

      const receipt = resolveCharacterMemory({
        proposal: {
          candidates: [
            {
              character_id: 'char-npc-1',
              fact: 'fact number 99 (overflow)',
              source: 'OBSERVED',
              certainty: 'KNOWN',
              rationale: 'Overflow proposal',
            },
          ],
        },
        currentState,
        currentTurn: 25,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'OBSERVE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });

      expect(receipt.decisions[0].outcome).toBe('REJECTED');
      expect(receipt.decisions[0].reason).toBe('STATE_LIMIT');
      expect(receipt.decisions[0].entry).toBeNull();
      expect(receipt.post_state['char-npc-1']).toHaveLength(24);
    });

    it('12. Ordered duplicate candidates produce one APPLIED then one NO_CHANGE', () => {
      const context = createMockContext();
      const proposal: CharacterMemoryProposal = {
        candidates: [
          {
            character_id: 'char-npc-1',
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            rationale: 'First candidate learns it',
          },
          {
            character_id: 'char-npc-1',
            fact: 'The Signal Is Active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            rationale: 'Second candidate duplicates it in the same turn',
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal,
        currentState: {},
        currentTurn: 3,
        context,
        intentReceipt: createIntentReceipt({ action_kind: 'INVESTIGATE' }),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });

      expect(receipt.decisions).toHaveLength(2);
      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.decisions[0].reason).toBe('APPLIED');
      expect(receipt.decisions[0].entry).not.toBeNull();

      expect(receipt.decisions[1].outcome).toBe('NO_CHANGE');
      expect(receipt.decisions[1].reason).toBe('DUPLICATE_FACT');
      expect(receipt.decisions[1].entry).toBeNull();

      expect(receipt.post_state['char-npc-1']).toHaveLength(1);
    });

    it('13. Empty proposal returns an unchanged valid receipt', () => {
      const context = createMockContext();
      const existingState: CharacterMemoryById = {
        'char-npc-1': [
          {
            id: deriveCharacterMemoryId('char-npc-1', 'the signal is active'),
            fact: 'the signal is active',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 1,
          },
        ],
      };

      const receipt = resolveCharacterMemory({
        proposal: { candidates: [] },
        currentState: existingState,
        currentTurn: 2,
        context,
        intentReceipt: createIntentReceipt(),
        reconciliationReceipt: createReconciliationReceipt(),
        castInteractionReceipt: createCastInteractionReceipt(),
      });

      expect(receipt.version).toBe(1);
      expect(receipt.decisions).toEqual([]);
      expect(receipt.pre_state).toEqual(receipt.post_state);
      expect(CharacterMemoryReceiptSchema.parse(receipt)).toBeDefined();
    });

    it('14. Deep-frozen inputs remain unchanged and receipt passes schema validation', () => {
      const context = deepFreeze(createMockContext());
      const proposal = deepFreeze({
        candidates: [
          {
            character_id: 'char-npc-1',
            fact: 'the signal is active',
            source: 'OBSERVED' as const,
            certainty: 'KNOWN' as const,
            rationale: 'Deep freeze validation',
          },
        ],
      });
      const currentState = deepFreeze({
        'char-npc-2': [
          {
            id: deriveCharacterMemoryId('char-npc-2', 'the blast door is locked'),
            fact: 'the blast door is locked',
            source: 'OBSERVED' as const,
            certainty: 'KNOWN' as const,
            acquired_turn: 1,
          },
        ],
      });
      const intentReceipt = deepFreeze(createIntentReceipt({ action_kind: 'OBSERVE' }));
      const reconciliationReceipt = deepFreeze(createReconciliationReceipt());
      const castInteractionReceipt = deepFreeze(createCastInteractionReceipt());

      const receipt = resolveCharacterMemory({
        proposal,
        currentState,
        currentTurn: 2,
        context,
        intentReceipt,
        reconciliationReceipt,
        castInteractionReceipt,
      });

      expect(receipt.version).toBe(1);
      expect(receipt.decisions[0].outcome).toBe('APPLIED');
      expect(receipt.post_state['char-npc-1']).toHaveLength(1);
      expect(receipt.post_state['char-npc-2']).toHaveLength(1);

      const parsedReceipt = CharacterMemoryReceiptSchema.parse(receipt);
      expect(parsedReceipt).toEqual(receipt);
    });
  });
});
