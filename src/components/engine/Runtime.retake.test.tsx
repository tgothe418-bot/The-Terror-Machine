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
    title: 'Echoes in the Dark',
    contentScale: 4,
    contentLevelDescription: 'Psychological Horror',
    setting: {
      location: 'Sub-level 4',
      atmosphere: 'Oppressive cold',
      timePeriod: '1984',
    },
    cast: [],
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

    useAppStore.setState({
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
      activeBlueprint: normalizeBlueprint(mockBlueprint),
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

    // Verify error message in engine transcript
    const history = useAppStore.getState().history;
    const criticalErrorMsg = history.find((m) =>
      m.content.includes('Malformed turn response: missing required characterMemoryReceipt or worldMemoryReceipt')
    );
    expect(criticalErrorMsg).toBeDefined();
  });
});
