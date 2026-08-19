import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Runtime from './Runtime';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { captureRuntimeSnapshot } from '../../core/engine/snapshot';
import type { CommittedTurnPayload } from '../../core/engine/events';
import type { ScenarioBlueprint } from '../../types';

import { normalizeBlueprint } from '../../lib/normalizeBlueprint';

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
});
