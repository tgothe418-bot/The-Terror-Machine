import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import { useEngineStore } from '../core/store';
import { captureRuntimeSnapshot } from '../core/engine/snapshot';
import { CommittedTurnPayload } from '../core/engine/events';

describe('useAppStore retakeLastTurn integration', () => {
  beforeEach(() => {
    useAppStore.getState().resetSession();
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
});
