import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Runtime, { AUTOPILOT_MINIMUM_TURN_INTERVAL_MS } from './Runtime';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import type { RatifiedEngineFrame } from '../../types';

const { mockExecuteRatificationPipeline, mockFetchSimulatedPlayerAction } = vi.hoisted(() => ({
  mockExecuteRatificationPipeline: vi.fn(),
  mockFetchSimulatedPlayerAction: vi.fn(),
}));

vi.mock('../../lib/ratificationPipeline', () => ({
  executeRatificationPipeline: mockExecuteRatificationPipeline,
}));

vi.mock('../../services/geminiService', () => ({
  fetchSimulatedPlayerAction: mockFetchSimulatedPlayerAction,
  triggerMemoryForge: vi.fn(),
}));

function createCommittedFrame(): RatifiedEngineFrame {
  return {
    narrative_blocks: [{ type: 'prose', content: 'The test chamber remains still.' }],
    logic_state: {
      current_phase: 'LATENT',
      suggested_tension: 1,
      cast_deltas: [],
    },
    characterMemoryReceipt: {
      version: 1,
      pre_state: {},
      post_state: {},
      decisions: [],
    },
    worldMemoryReceipt: {
      version: 1,
      pre_state: [],
      post_state: [],
      decisions: [],
    },
  } as RatifiedEngineFrame;
}

describe('Runtime Autopilot pacing', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    mockExecuteRatificationPipeline.mockReset();
    mockFetchSimulatedPlayerAction.mockReset();

    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();

    const blueprint = normalizeBlueprint({
      id: 'bp-autopilot-pacing',
      title: 'Autopilot Pacing Harness',
      contentScale: 1,
      contentLevelDescription: 'Test harness',
      setting: {
        location: 'Test chamber',
        atmosphere: 'Quiet',
        timePeriod: 'Unspecified',
      },
      cast: [
        {
          id: 'player-test',
          name: 'Test Player',
          role: 'Protagonist',
          description: 'A generic test participant.',
          personality: 'Careful',
          goals: 'Proceed deliberately.',
          traits: ['Patient'],
          isUserCharacter: true,
          isEntity: false,
          starting_location: 'ORIGIN',
        },
      ],
      topology: {
        nodes: ['ORIGIN'],
        connections: [],
      },
    });

    useAppStore.setState({
      sessionId: 'session-autopilot-pacing',
      blueprintId: blueprint.id,
      phase: 'ENGINE',
      currentNodeId: 'ORIGIN',
      spatialGraph: [{ id: 'ORIGIN', name: 'Origin', description: '', exits: [] }],
      history: [
        {
          id: 'opening-message',
          role: 'narrative',
          content: 'The test chamber awaits.',
          timestamp: 1,
        },
      ],
    });

    useEngineStore.setState({
      activeSessionId: 'session-autopilot-pacing',
      activeBlueprint: blueprint,
      gameState: {
        current_location: 'ORIGIN',
        player_character_id: 'player-test',
        player_role: 'protagonist',
        perspective_mode: 'protagonist',
        fictional_time_ledger: {
          moment_revision: 0,
          scene_beat_revision: 0,
          extended_revision: 0,
          last_cost: 'UNCLEAR',
        },
        pursuit_schedule_ledger: {},
        activity_events: [],
        pressure_threads: [],
        value_state_ledger: {},
        character_pursuit_ledger: {},
        character_development_ledger: {},
        character_stance: {},
        character_relationships: [],
        character_memory: {},
        world_memory: [],
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => root?.unmount());
      container.remove();
    }
    root = null;
    container = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('paces the first Engine input, rejects duplicate starts, and aborts a pending next turn', async () => {
    mockFetchSimulatedPlayerAction.mockResolvedValue({
      success: true,
      action: 'Study the unmarked panel.',
    });
    mockExecuteRatificationPipeline.mockResolvedValue(createCommittedFrame());

    await act(async () => {
      root?.render(<Runtime />);
    });

    const engageButton = Array.from(container?.querySelectorAll('button') || []).find((button) =>
      button.textContent?.includes('Engage')
    );
    expect(engageButton).toBeDefined();

    await act(async () => {
      engageButton?.click();
      engageButton?.click();
      await Promise.resolve();
    });

    expect(mockFetchSimulatedPlayerAction).not.toHaveBeenCalled();
    expect(mockExecuteRatificationPipeline).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOPILOT_MINIMUM_TURN_INTERVAL_MS - 1);
    });

    expect(mockFetchSimulatedPlayerAction).not.toHaveBeenCalled();
    expect(mockExecuteRatificationPipeline).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(mockFetchSimulatedPlayerAction).toHaveBeenCalledTimes(1);
    expect(mockExecuteRatificationPipeline).toHaveBeenCalledTimes(1);
    expect(mockExecuteRatificationPipeline).toHaveBeenCalledWith(
      'Study the unmarked panel.',
      expect.any(Object)
    );

    const abortButton = Array.from(container?.querySelectorAll('button') || []).find((button) =>
      button.textContent?.includes('Abort')
    );
    expect(abortButton).toBeDefined();

    await act(async () => {
      abortButton?.click();
      await vi.advanceTimersByTimeAsync(AUTOPILOT_MINIMUM_TURN_INTERVAL_MS);
    });

    expect(mockFetchSimulatedPlayerAction).toHaveBeenCalledTimes(1);
    expect(mockExecuteRatificationPipeline).toHaveBeenCalledTimes(1);
  });

  it('does not inject an action when abort occurs during simulated-action generation', async () => {
    let resolveSimulatedAction: ((value: { success: true; action: string }) => void) | undefined;
    mockFetchSimulatedPlayerAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSimulatedAction = resolve;
        })
    );

    await act(async () => {
      root?.render(<Runtime />);
    });

    const engageButton = Array.from(container?.querySelectorAll('button') || []).find((button) =>
      button.textContent?.includes('Engage')
    );

    await act(async () => {
      engageButton?.click();
      await vi.advanceTimersByTimeAsync(AUTOPILOT_MINIMUM_TURN_INTERVAL_MS);
    });

    expect(mockFetchSimulatedPlayerAction).toHaveBeenCalledTimes(1);

    const abortButton = Array.from(container?.querySelectorAll('button') || []).find((button) =>
      button.textContent?.includes('Abort')
    );

    await act(async () => {
      abortButton?.click();
      resolveSimulatedAction?.({
        success: true,
        action: 'Move toward the far wall.',
      });
      await Promise.resolve();
    });

    expect(mockExecuteRatificationPipeline).not.toHaveBeenCalled();
  });
});
