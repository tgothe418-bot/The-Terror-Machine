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
});
