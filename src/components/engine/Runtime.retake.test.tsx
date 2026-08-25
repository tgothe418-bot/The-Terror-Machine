import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Runtime from './Runtime';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { captureRuntimeSnapshot } from '../../core/engine/snapshot';
import type { CommittedTurnPayload } from '../../core/engine/events';
import type { ScenarioBlueprint, WorldMemoryState, RatifiedEngineFrame } from '../../types';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { executeRatificationPipeline } from '../../lib/ratificationPipeline';

vi.mock('../../lib/ratificationPipeline', () => ({
  executeRatificationPipeline: vi.fn(),
}));

describe('Runtime component terminal retake behavior', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const mockBlueprint: ScenarioBlueprint = {
    id: 'bp-runtime-retake-test',
    title: 'Echoes in the Dark',
    contentScale: 4,
    contentLevelDescription: 'Psychological Horror',
    setting: {
      location: 'Sub-level 4',
      atmosphere: 'Oppressive cold',
      timePeriod: '1984',
    },
    cast: [
      {
        id: 'char-1',
        name: 'Mortal One',
        role: 'Technician',
        description: 'First generic mortal.',
        personality: 'Nervous',
        goals: 'Survive',
        traits: ['Cautious'],
        isEntity: false,
      },
      {
        id: 'char-2',
        name: 'Mortal Two',
        role: 'Specialist',
        description: 'Second generic mortal.',
        personality: 'Methodical',
        goals: 'Restore power',
        traits: ['Analytical'],
        isEntity: false,
      },
    ],
    narrativeRules: {
      incitingIncident: 'Power failure',
      currentTensionLevel: 'buildup',
      keyPlotElements: [],
    },
    terminalConditions: {
      somaticTerminal: {
        fatalThresholdTags: ['FATAL'],
        narrativeResolution: 'Your physical form shatters into dust.',
      },
      narrativeConvergence: {
        requiredStateFlags: ['CONVERGED'],
        resolutionSequence: 'The timeline converges into absolute zero.',
      },
      cognitiveCollapse: {
        maxWebDensity: 5,
        collapseResolution: 'Your mind fractures completely.',
      },
    },
  };

  beforeEach(() => {
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();

    const normalized = normalizeBlueprint(mockBlueprint);

    useAppStore.setState({
      sessionId: 'sess-retake-test',
      blueprintId: normalized.id,
      phase: 'ENGINE',
      spatialGraph: [{ id: 'ORIGIN', name: 'Origin Chamber', description: '', exits: [] }],
      currentNodeId: 'ORIGIN',
      history: [
        {
          id: 'msg-1',
          role: 'narrative',
          content: 'You stand before the dark altar.',
          timestamp: 1000,
        },
      ],
    });

    useEngineStore.setState({
      activeSessionId: 'sess-retake-test',
      activeBlueprint: normalized,
      gameState: {
        current_location: 'Origin Chamber',
        player_injuries: [],
        inventory: ['Torch'],
        psychological_status: 'Uneasy',
        player_role: 'witness',
        player_character_id: null,
        perspective_mode: 'witness',
        current_tension_level: 'buildup',
        lore_and_memory: {
          established_facts: [],
          permanent_consequences: [],
        },
        npc_fixations: [],
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
      container.remove();
      container = null;
      root = null;
    }
  });

  it('renders terminal condition and allows retake to restore input console and clear termination', async () => {
    // 1. Render initial Runtime
    await act(async () => {
      root?.render(<Runtime />);
    });

    expect(container?.textContent).toContain('Echoes in the Dark');
    expect(container?.querySelector('textarea')).not.toBeNull();
    expect(container?.textContent).not.toContain('[ SIMULATION TERMINATED ]');

    // 2. Commit a terminal turn with checkpoint
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const prevGameState = useEngineStore.getState().gameState;

    const payload: CommittedTurnPayload = {
      commandText: 'Drink the black bile',
      formattedText: 'The liquid burns like acid.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(prevGameState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The liquid burns like acid.' }],
        logic_state: {
          current_phase: 'TERMINAL',
          suggested_tension: 100,
          terminal_flags: ['SOMATIC_TERMINAL'],
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

    await act(async () => {
      useAppStore.getState().commitTurnResult(payload);
    });

    // Verify terminal UI is now shown and textarea is replaced
    expect(container?.textContent).toContain('[ SIMULATION TERMINATED ]');
    expect(container?.textContent).toContain('Your physical form shatters into dust.');
    expect(container?.querySelector('textarea')).toBeNull();

    // 3. Verify RETAKE button is enabled despite terminal state
    const retakeButton = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('[ RETAKE ]')
    );
    expect(retakeButton).toBeDefined();
    expect(retakeButton?.hasAttribute('disabled')).toBe(false);

    // 4. Click RETAKE
    await act(async () => {
      retakeButton?.click();
    });

    // 5. Verify terminal presentation is cleared and input console is restored with previous command
    expect(container?.textContent).not.toContain('[ SIMULATION TERMINATED ]');
    const textarea = container?.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('Drink the black bile');
    expect(useAppStore.getState().activeMemory.systemFlags).not.toContain('SOMATIC_TERMINAL');
  });

  it('restores exact prior character_memory state during retake', async () => {
    // 1. Seed initial character_memory in engine store
    const initialMemory = {
      'char-warden': [
        {
          id: 'mem-initial',
          fact: 'Initial observed memory',
          source: 'OBSERVED' as const,
          certainty: 'KNOWN' as const,
          acquired_turn: 0,
        },
      ],
    };

    useEngineStore.setState({
      gameState: {
        ...useEngineStore.getState().gameState,
        character_memory: initialMemory,
      },
    });

    await act(async () => {
      root?.render(<Runtime />);
    });

    expect(useEngineStore.getState().gameState.character_memory).toEqual(initialMemory);

    // 2. Commit a turn that mutates character_memory
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const prevGameState = useEngineStore.getState().gameState;

    const payload: CommittedTurnPayload = {
      commandText: 'Search the office',
      formattedText: 'You find old records.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(prevGameState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'You find old records.' }],
        logic_state: {
          current_phase: 'ENGAGED',
          suggested_tension: 10,
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
        tension: 10,
        preSnapshot,
      },
    };

    await act(async () => {
      useAppStore.getState().commitTurnResult(payload);
      // Simulate post-turn patch of character_memory
      useEngineStore.getState().patchGameState({
        character_memory: {
          'char-warden': [
            ...initialMemory['char-warden'],
            {
              id: 'mem-turn1',
              fact: 'Warden saw player searching the desk',
              source: 'OBSERVED' as const,
              certainty: 'KNOWN' as const,
              acquired_turn: 1,
            },
          ],
        },
      });
    });

    expect(useEngineStore.getState().gameState.character_memory?.['char-warden']).toHaveLength(2);

    // 3. Click RETAKE
    const retakeButton = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('[ RETAKE ]')
    );
    expect(retakeButton).toBeDefined();

    await act(async () => {
      retakeButton?.click();
    });

    // 4. Verify character_memory is restored to exact initial snapshot
    expect(useEngineStore.getState().gameState.character_memory).toEqual(initialMemory);
    expect(useEngineStore.getState().gameState.character_memory?.['char-warden']).toHaveLength(1);
    expect(useEngineStore.getState().gameState.character_memory?.['char-warden'][0].id).toBe('mem-initial');
  });

  it('restores exact prior world_memory state during retake', async () => {
    // 1. Seed initial world_memory in engine store
    const initialWorldMemory: WorldMemoryState = [
      {
        id: 'wm_078dcf15',
        kind: 'ESTABLISHED_FACT',
        scope: 'NODE',
        node_id: 'ORIGIN',
        statement: 'Initial fact in Origin',
        established_turn: 0,
      },
    ];

    useEngineStore.setState({
      gameState: {
        ...useEngineStore.getState().gameState,
        world_memory: initialWorldMemory,
      },
    });

    await act(async () => {
      root?.render(<Runtime />);
    });

    expect(useEngineStore.getState().gameState.world_memory).toEqual(initialWorldMemory);

    // 2. Commit a turn that mutates world_memory
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const prevGameState = useEngineStore.getState().gameState;

    const payload: CommittedTurnPayload = {
      commandText: 'Examine the control console',
      formattedText: 'You find scorched wires.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(prevGameState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'You find scorched wires.' }],
        logic_state: {
          current_phase: 'ENGAGED',
          suggested_tension: 15,
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'SOMATIC',
        activeTier: 'LATENT',
        tension: 15,
        preSnapshot,
      },
    };

    await act(async () => {
      useAppStore.getState().commitTurnResult(payload);
      // Simulate post-turn patch of world_memory
      useEngineStore.getState().patchGameState({
        world_memory: [
          ...initialWorldMemory,
          {
            id: 'wm_12345678',
            kind: 'DISCOVERED_EVIDENCE',
            scope: 'NODE',
            node_id: 'ORIGIN',
            statement: 'Scorched wires on the main console',
            established_turn: 1,
          },
        ],
      });
    });

    expect(useEngineStore.getState().gameState.world_memory).toHaveLength(2);

    // 3. Click RETAKE
    const retakeButton = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('[ RETAKE ]')
    );
    expect(retakeButton).toBeDefined();

    await act(async () => {
      retakeButton?.click();
    });

    // 4. Verify world_memory is restored to exact initial snapshot
    expect(useEngineStore.getState().gameState.world_memory).toEqual(initialWorldMemory);
    expect(useEngineStore.getState().gameState.world_memory).toHaveLength(1);
    expect(useEngineStore.getState().gameState.world_memory[0].id).toBe('wm_078dcf15');
  });

  it('fails closed when turn response is missing worldMemoryReceipt, leaving world_memory unpatched', async () => {
    const initialWorldMemory: WorldMemoryState = [
      {
        id: 'wm_078dcf15',
        kind: 'ESTABLISHED_FACT',
        scope: 'NODE',
        node_id: 'ORIGIN',
        statement: 'Initial fact in Origin',
        established_turn: 0,
      },
    ];

    useEngineStore.setState({
      gameState: {
        ...useEngineStore.getState().gameState,
        world_memory: initialWorldMemory,
      },
    });

    // Mock ratification pipeline returning response WITHOUT worldMemoryReceipt
    vi.mocked(executeRatificationPipeline).mockResolvedValueOnce({
      narrative_blocks: [{ type: 'prose', content: 'Something happened.' }],
      logic_state: {
        current_phase: 'ENGAGED',
        suggested_tension: 20,
      },
      characterMemoryReceipt: {
        version: 1,
        pre_state: {},
        post_state: {},
        decisions: [],
      },
      // worldMemoryReceipt is missing
    } as unknown as RatifiedEngineFrame);

    await act(async () => {
      root?.render(<Runtime />);
    });

    const observeButton = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Observe')
    );
    expect(observeButton).toBeDefined();

    // Trigger command submission with invalid response
    await act(async () => {
      observeButton?.click();
    });

    // Verify world_memory was not mutated and remains identical to initial
    expect(useEngineStore.getState().gameState.world_memory).toEqual(initialWorldMemory);
    expect(useEngineStore.getState().gameState.world_memory).toHaveLength(1);

    // Verify error message in engine transcript contains safe error and not raw internal exception
    const history = useAppStore.getState().history;
    const failureMsg = history.find((m) => m.failureReceipt?.code === 'UNKNOWN_ERROR');
    expect(failureMsg).toBeDefined();
    expect(failureMsg?.content).toContain('[ENGINE FAILURE // UNKNOWN_ERROR]');
    expect(failureMsg?.content).not.toContain('Malformed turn response');
  });

  it('preserves non-first selected player_character_id, role, and perspective mode identically across turn completion and retake', async () => {
    // Set up session with non-first selected character 'char-2'
    useEngineStore.setState({
      gameState: {
        ...useEngineStore.getState().gameState,
        player_role: 'protagonist',
        player_character_id: 'char-2',
        perspective_mode: 'embodied',
      },
    });

    await act(async () => {
      root?.render(<Runtime />);
    });

    // 1. Assert initial state before turn
    const beforeEngineState = useEngineStore.getState().gameState;
    expect(beforeEngineState.player_role).toBe('protagonist');
    expect(beforeEngineState.player_character_id).toBe('char-2');
    expect(beforeEngineState.perspective_mode).toBe('embodied');

    // 2. Commit a completed turn with checkpoint
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    const payload: CommittedTurnPayload = {
      commandText: 'Inspect the fuse panel',
      formattedText: 'The fuses are intact.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(beforeEngineState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The fuses are intact.' }],
        logic_state: {
          current_phase: 'ENGAGED',
          suggested_tension: 10,
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
        tension: 10,
        preSnapshot,
      },
    };

    await act(async () => {
      useAppStore.getState().commitTurnResult(payload);
    });

    // 3. Assert identity is identical after turn
    const afterTurnEngineState = useEngineStore.getState().gameState;
    expect(afterTurnEngineState.player_role).toBe('protagonist');
    expect(afterTurnEngineState.player_character_id).toBe('char-2');
    expect(afterTurnEngineState.perspective_mode).toBe('embodied');

    // 4. Click RETAKE
    const retakeButton = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('[ RETAKE ]')
    );
    expect(retakeButton).toBeDefined();

    await act(async () => {
      retakeButton?.click();
    });

    // 5. Assert identity remains identical after retake
    const afterRetakeEngineState = useEngineStore.getState().gameState;
    expect(afterRetakeEngineState.player_role).toBe('protagonist');
    expect(afterRetakeEngineState.player_character_id).toBe('char-2');
    expect(afterRetakeEngineState.perspective_mode).toBe('embodied');
  });

  it('does not drift stored player identity when a turn fails or is rejected', async () => {
    // Set up session with non-first selected character 'char-2'
    useEngineStore.setState({
      gameState: {
        ...useEngineStore.getState().gameState,
        player_role: 'protagonist',
        player_character_id: 'char-2',
        perspective_mode: 'embodied',
      },
    });

    // Mock failure in ratification pipeline
    vi.mocked(executeRatificationPipeline).mockRejectedValueOnce(
      new Error('Network connection timeout')
    );

    await act(async () => {
      root?.render(<Runtime />);
    });

    const initialEngineState = useEngineStore.getState().gameState;
    expect(initialEngineState.player_role).toBe('protagonist');
    expect(initialEngineState.player_character_id).toBe('char-2');
    expect(initialEngineState.perspective_mode).toBe('embodied');

    const observeButton = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Observe')
    );
    expect(observeButton).toBeDefined();

    // Trigger action that fails
    await act(async () => {
      observeButton?.click();
    });

    // Assert identity did not drift despite the failure
    const postFailureEngineState = useEngineStore.getState().gameState;
    expect(postFailureEngineState.player_role).toBe('protagonist');
    expect(postFailureEngineState.player_character_id).toBe('char-2');
    expect(postFailureEngineState.perspective_mode).toBe('embodied');
  });
});
