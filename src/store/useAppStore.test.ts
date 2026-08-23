import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import { useEngineStore } from '../core/store';
import { captureRuntimeSnapshot } from '../core/engine/snapshot';
import { CommittedTurnPayload } from '../core/engine/events';
import type { CanonicalConsequenceReceipt } from '../types';

describe('useAppStore retakeLastTurn integration', () => {
  beforeEach(() => {
    useAppStore.getState().resetSession();
    useAppStore.setState({
      sessionId: 'session-integration-1',
      blueprintId: 'blueprint-integration-1',
    });
    useEngineStore.getState().resetEngine();
  });

  it('returns false when no checkpoint exists', () => {
    expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();
    const result = useAppStore.getState().retakeLastTurn();
    expect(result).toBe(false);
  });

  it('restores both useAppStore and useEngineStore on retakeLastTurn', () => {
    // 1. Initialize engine game state
    const initialGameState = {
      current_location: 'Security Room',
      player_injuries: [],
      inventory: ['Flashlight'],
      psychological_status: 'Focused',
      player_role: 'witness' as const,
      player_character_id: null,
      perspective_mode: 'witness' as const,
      current_tension_level: 'buildup' as const,
      lore_and_memory: {
        established_facts: [],
        permanent_consequences: [],
      },
      npc_fixations: [],
    };
    useEngineStore.getState().setGameState(initialGameState);

    // 2. Simulate Turn 1
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const committedPayload: CommittedTurnPayload = {
      commandText: 'Inspect the monitor',
      formattedText: 'Static fills the screen.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(initialGameState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'Static fills the screen.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 40,
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 40,
        preSnapshot,
      },
    };

    useAppStore.getState().commitTurnResult(committedPayload);

    // Mutate engine store state to simulate post-turn update
    useEngineStore.getState().setGameState({
      ...initialGameState,
      current_location: 'Corridor B',
      psychological_status: 'Paranoid',
    });

    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useAppStore.getState().tensionLevel).toBe(40);
    expect(useEngineStore.getState().gameState?.current_location).toBe('Corridor B');
    expect(useEngineStore.getState().gameState?.psychological_status).toBe('Paranoid');

    // 3. Trigger retake
    const retakeResult = useAppStore.getState().retakeLastTurn();
    expect(retakeResult).toBe(true);

    // 4. Verify useAppStore was restored
    expect(useAppStore.getState().turnCount).toBe(0);
    expect(useAppStore.getState().tensionLevel).toBe(0);
    expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();

    // 5. Verify useEngineStore gameState was restored
    expect(useEngineStore.getState().gameState?.current_location).toBe('Security Room');
    expect(useEngineStore.getState().gameState?.psychological_status).toBe('Focused');
  });

  it('restores canonical activeMemory.systemFlags and clears terminal flags on retakeLastTurn', () => {
    // Set initial system flags in useAppStore
    useAppStore.setState({
      activeMemory: {
        systemFlags: ['FLAG_PRE_EXISTING', 'FOUND_KEY'],
        somaState: [],
        geomState: [],
      },
    });

    const initialGameState = {
      current_location: 'Ritual Chamber',
      player_injuries: ['Laceration'],
      inventory: ['Obsidian Dagger'],
      psychological_status: 'Terrified',
      player_role: 'witness' as const,
      player_character_id: null,
      perspective_mode: 'witness' as const,
      current_tension_level: 'visceral_climax' as const,
      lore_and_memory: {
        established_facts: ['The door was unsealed'],
        permanent_consequences: [],
      },
      npc_fixations: [],
    };
    useEngineStore.getState().setGameState(initialGameState);

    expect(useAppStore.getState().activeMemory.systemFlags).toEqual([
      'FLAG_PRE_EXISTING',
      'FOUND_KEY',
    ]);

    // Commit a turn that introduces terminal flags (e.g. SOMATIC_TERMINAL)
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const terminalTurnPayload: CommittedTurnPayload = {
      commandText: 'Touch the cursed relic',
      formattedText: 'The obsidian darkens your veins. Physical form collapses.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(initialGameState)),
      frame: {
        narrative_blocks: [
          {
            type: 'prose',
            content: 'The obsidian darkens your veins. Physical form collapses.',
          },
        ],
        logic_state: {
          current_phase: 'TERMINAL',
          suggested_tension: 100,
          terminal_flags: ['SOMATIC_TERMINAL', 'VESSEL_DESTROYED'],
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'SOMATIC',
        activeTier: 'TERMINAL',
        tension: 100,
        preSnapshot,
      },
    };

    useAppStore.getState().commitTurnResult(terminalTurnPayload);

    // Verify terminal flags were added
    expect(useAppStore.getState().activeMemory.systemFlags).toContain('SOMATIC_TERMINAL');
    expect(useAppStore.getState().activeMemory.systemFlags).toContain('VESSEL_DESTROYED');
    expect(useAppStore.getState().activeMemory.systemFlags).toContain('FLAG_PRE_EXISTING');
    expect(useAppStore.getState().lastTurnCheckpoint).not.toBeNull();

    // Trigger retake
    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(true);

    // Verify canonical systemFlags are restored to exact pre-turn state
    expect(useAppStore.getState().activeMemory.systemFlags).toEqual([
      'FLAG_PRE_EXISTING',
      'FOUND_KEY',
    ]);
    expect(useAppStore.getState().activeMemory.systemFlags).not.toContain('SOMATIC_TERMINAL');
    expect(useAppStore.getState().activeMemory.systemFlags).not.toContain('VESSEL_DESTROYED');
    expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();

    // Verify gameState was also restored
    expect(useEngineStore.getState().gameState?.current_location).toBe('Ritual Chamber');
    expect(useEngineStore.getState().gameState?.inventory).toEqual(['Obsidian Dagger']);
    expect(useEngineStore.getState().gameState?.psychological_status).toBe('Terrified');
  });

  it('restores exact canonical consequence state (inventory, injuries, psych status) on retakeLastTurn', () => {
    // 1. Initialize non-empty initial consequence state in useEngineStore
    const initialInventory = ['Flashlight', 'Iron Key'];
    const initialInjuries = ['Sprained Ankle'];
    const initialPsychStatus = 'UNEASY';

    const initialGameState = {
      current_location: 'Sub-Basement B2',
      player_injuries: [...initialInjuries],
      inventory: [...initialInventory],
      psychological_status: initialPsychStatus,
      player_role: 'witness' as const,
      player_character_id: null,
      perspective_mode: 'witness' as const,
      current_tension_level: 'buildup' as const,
      lore_and_memory: {
        established_facts: ['Pipe burst in sector 4'],
        permanent_consequences: [],
      },
      npc_fixations: ['Broken valve'],
    };
    useEngineStore.getState().setGameState(initialGameState);

    // 2. Prepare turn commitment with canonicalConsequenceReceipt
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const consequenceReceipt: CanonicalConsequenceReceipt = {
      version: 1,
      pre_state: {
        inventory: [...initialInventory],
        player_injuries: [...initialInjuries],
        psychological_status: 'UNEASY',
      },
      decisions: [
        {
          mutation: {
            domain: 'INVENTORY' as const,
            operation: 'ADD' as const,
            value: 'Brass Crowbar',
            rationale: 'Pried from heavy tool crate',
          },
          outcome: 'APPLIED' as const,
          reason: 'APPLIED' as const,
        },
        {
          mutation: {
            domain: 'INVENTORY' as const,
            operation: 'REMOVE' as const,
            value: 'Flashlight',
            rationale: 'Dropped into flooded elevator shaft',
          },
          outcome: 'APPLIED' as const,
          reason: 'APPLIED' as const,
        },
        {
          mutation: {
            domain: 'PLAYER_INJURY' as const,
            operation: 'ADD' as const,
            value: 'Glass Shards in Palm',
            rationale: 'Shattered window frame during escape',
          },
          outcome: 'APPLIED' as const,
          reason: 'APPLIED' as const,
        },
        {
          mutation: {
            domain: 'PSYCHOLOGICAL_STATUS' as const,
            operation: 'SET' as const,
            value: 'PANICKED',
            rationale: 'Sudden sensory deprivation',
          },
          outcome: 'APPLIED' as const,
          reason: 'APPLIED' as const,
        },
      ],
      patch: {
        inventory_added: ['Brass Crowbar'],
        inventory_removed: ['Flashlight'],
        injuries_added: ['Glass Shards in Palm'],
        injuries_removed: [],
        psychological_status_change: {
          before: 'UNEASY',
          after: 'PANICKED',
        },
      },
      post_state: {
        inventory: ['Iron Key', 'Brass Crowbar'],
        player_injuries: ['Sprained Ankle', 'Glass Shards in Palm'],
        psychological_status: 'PANICKED',
      },
    };

    const committedPayload: CommittedTurnPayload = {
      commandText: 'Pry open the rusted container and leap away',
      formattedText: 'Metal gives way with a screech. Glass rains down.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(initialGameState)),
      frame: {
        narrative_blocks: [
          {
            type: 'prose',
            content: 'Metal gives way with a screech. Glass rains down.',
          },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 65,
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'SUB_BASEMENT',
        requestedTarget: 'SUB_BASEMENT',
        accepted: true,
        nodeAfter: 'SUB_BASEMENT',
        activeVector: 'SOMATIC',
        activeTier: 'LATENT',
        tension: 65,
        preSnapshot,
        canonicalConsequenceReceipt: consequenceReceipt,
      },
    };

    // 3. Commit turn in useAppStore and apply post_state to useEngineStore
    useAppStore.getState().commitTurnResult(committedPayload);
    useEngineStore.getState().patchGameState({
      inventory: [...consequenceReceipt.post_state.inventory],
      player_injuries: [...consequenceReceipt.post_state.player_injuries],
      psychological_status: consequenceReceipt.post_state.psychological_status,
    });

    // Verify turn committed state
    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useAppStore.getState().tensionLevel).toBe(65);
    const history = useAppStore.getState().history;
    expect(history.length).toBe(2); // user command + assistant response
    const assistantMsg = history[1];
    expect(assistantMsg.turnReceipt?.canonicalConsequenceReceipt).toBeDefined();
    expect(assistantMsg.turnReceipt?.canonicalConsequenceReceipt?.post_state.inventory).toEqual([
      'Iron Key',
      'Brass Crowbar',
    ]);

    // Verify Engine store contains updated post_state
    expect(useEngineStore.getState().gameState?.inventory).toEqual(['Iron Key', 'Brass Crowbar']);
    expect(useEngineStore.getState().gameState?.player_injuries).toEqual([
      'Sprained Ankle',
      'Glass Shards in Palm',
    ]);
    expect(useEngineStore.getState().gameState?.psychological_status).toBe('PANICKED');

    // 4. Trigger retakeLastTurn()
    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(true);

    // 5. Verify useAppStore rolled back completely
    expect(useAppStore.getState().turnCount).toBe(0);
    expect(useAppStore.getState().tensionLevel).toBe(0);
    expect(useAppStore.getState().history.length).toBe(0);
    expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();

    // 6. Verify useEngineStore restored exact pre-turn consequence state (values, ordering, spelling)
    const restoredGameState = useEngineStore.getState().gameState;
    expect(restoredGameState?.inventory).toEqual(['Flashlight', 'Iron Key']);
    expect(restoredGameState?.player_injuries).toEqual(['Sprained Ankle']);
    expect(restoredGameState?.psychological_status).toBe('UNEASY');

    // 7. Verify subsequent retake fails because checkpoint was consumed
    const secondRetake = useAppStore.getState().retakeLastTurn();
    expect(secondRetake).toBe(false);
  });

  it('proves failed turn does not alter consequence state and maintains retake integrity', () => {
    const initialGameState = {
      current_location: 'Control Center',
      player_injuries: ['Superficial Scratch'],
      inventory: ['Access Card'],
      psychological_status: 'STEADY',
      player_role: 'witness' as const,
      player_character_id: null,
      perspective_mode: 'witness' as const,
      current_tension_level: 'buildup' as const,
      lore_and_memory: {
        established_facts: [],
        permanent_consequences: [],
      },
      npc_fixations: [],
    };
    useEngineStore.getState().setGameState(initialGameState);

    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());

    // Record a failed turn
    useAppStore.getState().failTurnResult({
      commandText: 'Force open the blast doors',
      failureReceipt: {
        code: 'STRUCTURAL_RESPONSE_MISMATCH',
        status: 500,
        contentType: 'application/json',
        message: 'Invalid engine output frame',
      },
      errorCategory: 'STRUCTURAL_RESPONSE_MISMATCH',
      errorMessage: 'Invalid engine output frame',
      statusCode: 500,
      contentType: 'application/json',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(initialGameState)),
    });

    // Engine store remains untouched
    expect(useEngineStore.getState().gameState?.inventory).toEqual(['Access Card']);
    expect(useEngineStore.getState().gameState?.player_injuries).toEqual(['Superficial Scratch']);
    expect(useEngineStore.getState().gameState?.psychological_status).toBe('STEADY');
  });

  it('restores character_stance on retakeLastTurn', () => {
    const initialGameState = {
      current_location: 'Security Room',
      player_injuries: [],
      inventory: [],
      psychological_status: 'STABLE',
      player_role: 'protagonist' as const,
      player_character_id: 'char-protagonist',
      perspective_mode: 'protagonist' as const,
      current_tension_level: 'buildup' as const,
      lore_and_memory: {
        established_facts: [],
        permanent_consequences: [],
      },
      npc_fixations: [],
      character_stance: {
        'char-warden': {
          focus: 'PLAYER' as const,
          stance: 'OPEN' as const,
        },
      },
    };
    useEngineStore.getState().setGameState(initialGameState);

    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const committedPayload: CommittedTurnPayload = {
      commandText: 'Threaten the warden',
      formattedText: 'The warden glares at you with cold fury.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(initialGameState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The warden glares at you with cold fury.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 40,
          terminal_flags: [],
        },
        characterStanceReceipt: {
          version: 1,
          pre_state: {
            'char-warden': { focus: 'PLAYER', stance: 'OPEN' },
          },
          post_state: {
            'char-warden': { focus: 'PLAYER', stance: 'HOSTILE' },
          },
          decisions: [
            {
              proposal: {
                character_id: 'char-warden',
                focus: 'PLAYER',
                stance: 'HOSTILE',
                rationale: 'Warden turns hostile',
              },
              outcome: 'APPLIED',
              reason: 'APPLIED',
              before: { focus: 'PLAYER', stance: 'OPEN' },
              after: { focus: 'PLAYER', stance: 'HOSTILE' },
            },
          ],
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'Security Room',
        requestedTarget: null,
        accepted: false,
        reason: 'NO_TRANSITION_REQUESTED',
        nodeAfter: 'Security Room',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 40,
        preSnapshot,
        characterStanceReceipt: {
          version: 1,
          pre_state: {
            'char-warden': { focus: 'PLAYER', stance: 'OPEN' },
          },
          post_state: {
            'char-warden': { focus: 'PLAYER', stance: 'HOSTILE' },
          },
          decisions: [
            {
              proposal: {
                character_id: 'char-warden',
                focus: 'PLAYER',
                stance: 'HOSTILE',
                rationale: 'Warden turns hostile',
              },
              outcome: 'APPLIED',
              reason: 'APPLIED',
              before: { focus: 'PLAYER', stance: 'OPEN' },
              after: { focus: 'PLAYER', stance: 'HOSTILE' },
            },
          ],
        },
      },
    };

    useAppStore.getState().commitTurnResult(committedPayload);
    useEngineStore.getState().patchGameState({
      character_stance: {
        'char-warden': {
          focus: 'PLAYER',
          stance: 'HOSTILE',
        },
      },
    });

    expect(useEngineStore.getState().gameState?.character_stance?.['char-warden'].stance).toBe('HOSTILE');

    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(true);

    expect(useEngineStore.getState().gameState?.character_stance?.['char-warden'].stance).toBe('OPEN');
  });

  describe('rejects incomplete or mismatched retake identity', () => {
    const cases = [
      {
        name: 'missing checkpoint sessionId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: undefined,
        checkpointBlueprintId: 'bp-active',
        expectedSuccess: false,
      },
      {
        name: 'blank checkpoint sessionId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: '',
        checkpointBlueprintId: 'bp-active',
        expectedSuccess: false,
      },
      {
        name: 'whitespace-only checkpoint sessionId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: '   ',
        checkpointBlueprintId: 'bp-active',
        expectedSuccess: false,
      },
      {
        name: 'mismatched checkpoint sessionId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: 'sess-other',
        checkpointBlueprintId: 'bp-active',
        expectedSuccess: false,
      },
      {
        name: 'missing checkpoint blueprintId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: 'sess-active',
        checkpointBlueprintId: undefined,
        expectedSuccess: false,
      },
      {
        name: 'blank checkpoint blueprintId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: 'sess-active',
        checkpointBlueprintId: '',
        expectedSuccess: false,
      },
      {
        name: 'whitespace-only checkpoint blueprintId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: 'sess-active',
        checkpointBlueprintId: '   ',
        expectedSuccess: false,
      },
      {
        name: 'mismatched checkpoint blueprintId',
        currentSessionId: 'sess-active',
        currentBlueprintId: 'bp-active',
        checkpointSessionId: 'sess-active',
        checkpointBlueprintId: 'bp-other',
        expectedSuccess: false,
      },
      {
        name: 'both store identifiers blank',
        currentSessionId: '',
        currentBlueprintId: '',
        checkpointSessionId: '',
        checkpointBlueprintId: '',
        expectedSuccess: false,
      },
      {
        name: 'valid exact-match control case',
        currentSessionId: 'sess-control-exact',
        currentBlueprintId: 'bp-control-exact',
        checkpointSessionId: 'sess-control-exact',
        checkpointBlueprintId: 'bp-control-exact',
        expectedSuccess: true,
      },
    ];

    cases.forEach(
      ({
        name,
        currentSessionId,
        currentBlueprintId,
        checkpointSessionId,
        checkpointBlueprintId,
        expectedSuccess,
      }) => {
        it(`${name}`, () => {
          // Initialize active store with configured identifiers
          useAppStore.setState({
            sessionId: currentSessionId,
            blueprintId: currentBlueprintId,
            turnCount: 2,
            tensionLevel: 50,
          });

          const initialGameState = {
            current_location: 'Pre-Turn Location',
            player_injuries: [],
            inventory: ['Item A'],
            psychological_status: 'CALM',
            player_role: 'witness' as const,
            player_character_id: null,
            perspective_mode: 'witness' as const,
            current_tension_level: 'buildup' as const,
            lore_and_memory: {
              established_facts: [],
              permanent_consequences: [],
            },
            npc_fixations: [],
          };

          const postGameState = {
            ...initialGameState,
            current_location: 'Post-Turn Location',
            inventory: ['Item A', 'Mutated Item B'],
            psychological_status: 'DISTURBED',
          };

          useEngineStore.getState().setGameState(postGameState);

          // Configure checkpoint with parameterized identity
          useAppStore.setState({
            lastTurnCheckpoint: {
              version: 1,
              commandText: 'Test retake identity command',
              engineStateBefore: {
                sessionId: checkpointSessionId,
                blueprintId: checkpointBlueprintId,
                phase: 'HUB',
                escalation_state: 'LATENT',
                currentNodeId: 'Pre-Turn Location',
                activeVector: 'COGNITIVE',
                activeTier: 'LATENT',
                decay: { stage: 'STABLE', coherence: 1.0 },
                turnCount: 1,
                roomsGenerated: 1,
                traumaLedger: [],
                activeMemory: { systemFlags: [], somaState: [], geomState: [] },
                motifLedger: {},
                pacingLedger: {
                  failedEscapeAttempts: 0,
                  memoryAnchorsRemaining: 3,
                  spatialContradictions: 0,
                },
                timelineRevision: 0,
                lastDistilledRevision: -1,
                reconciliationRevision: 0,
                history: [],
              },
              engineGameStateBefore: JSON.parse(JSON.stringify(initialGameState)),
            },
          });

          const result = useAppStore.getState().retakeLastTurn();
          expect(result).toBe(expectedSuccess);

          if (expectedSuccess) {
            expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();
            expect(useEngineStore.getState().gameState?.current_location).toBe('Pre-Turn Location');
            expect(useEngineStore.getState().gameState?.inventory).toEqual(['Item A']);
            expect(useEngineStore.getState().gameState?.psychological_status).toBe('CALM');
          } else {
            // Missing, blank, or mismatched identifiers must clear the incompatible checkpoint
            // and return false without restoring either store.
            expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();
            expect(useEngineStore.getState().gameState?.current_location).toBe('Post-Turn Location');
            expect(useEngineStore.getState().gameState?.inventory).toEqual([
              'Item A',
              'Mutated Item B',
            ]);
            expect(useEngineStore.getState().gameState?.psychological_status).toBe('DISTURBED');
          }
        });
      }
    );
  });
});
