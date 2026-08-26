/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';
import { buildEngineLogContent } from '../../lib/download';
import { buildEngineTurnContext } from '../../lib/buildEngineTurnContext';
import type { ScenarioBlueprint } from '../../types';

describe('Simulation Restart Freshness Boundary', () => {
  beforeEach(() => {
    useAppStore.getState().resetSession();
  });

  it('proves resetSession clears all prior-session runtime material and sentinels across both stores', () => {
    const OLD_SESSION_ID = 'session-contaminated-uuid-11111';
    const OLD_BLUEPRINT_ID = 'blueprint-contaminated-uuid-22222';
    const OLD_HISTORY_SENTINEL = 'OLD_SESSION_SECRET_HISTORY_FRAGMENT';
    const OLD_TELEMETRY_SENTINEL = 'OLD_TELEMETRY_CONTAMINANT';
    const OLD_MEMORY_FLAG = 'OLD_FLAG_CONTAMINANT';
    const OLD_INJURY_SENTINEL = 'OLD_LETHAL_SEVERED_LIMB';

    // 1. Seed stores with prior-session state & sentinels
    useAppStore.setState({
      sessionId: OLD_SESSION_ID,
      blueprintId: OLD_BLUEPRINT_ID,
      turnCount: 15,
      currentNodeId: 'OLD_CORRUPTED_NODE',
      history: [
        {
          role: 'user',
          content: OLD_HISTORY_SENTINEL,
          timestamp: 1000,
        },
        {
          role: 'assistant',
          content: 'Echo of prior session.',
          timestamp: 1001,
        },
      ],
      storyLog: [{ type: 'prose', content: OLD_HISTORY_SENTINEL }],
      uiTranscript: [{ id: '1', role: 'user', content: OLD_HISTORY_SENTINEL }],
      enginePayload: [{ role: 'user', content: OLD_HISTORY_SENTINEL, timestamp: 1000 }],
      telemetry: {
        tension: '99',
        pacing: OLD_TELEMETRY_SENTINEL,
        castLedger: [],
        engineLogic: OLD_TELEMETRY_SENTINEL,
      },
      activeMemory: {
        systemFlags: [OLD_MEMORY_FLAG],
        somaState: [],
        geomState: [],
      },
      lastTurnCheckpoint: {
        version: 1,
        commandText: OLD_HISTORY_SENTINEL,
        engineStateBefore: {} as any,
        engineGameStateBefore: null,
      },
    });

    useEngineStore.setState({
      activeSessionId: OLD_SESSION_ID,
      activeBlueprint: { id: OLD_BLUEPRINT_ID, title: 'Old Scenario' } as any,
      gameState: {
        current_location: 'OLD_NODE',
        inventory: ['old_cursed_amulet'],
        player_injuries: [OLD_INJURY_SENTINEL],
        psychological_status: 'Madness',
      },
      engineMessages: [{ role: 'user', content: OLD_HISTORY_SENTINEL, timestamp: 1000 }],
      engineTextBuffer: [{ role: 'user', content: OLD_HISTORY_SENTINEL, timestamp: 1000 }],
      engineWorldStateSummary: 'OLD_WORLD_STATE_SUMMARY_LEAK',
      telemetry: { tension: '99', pacing: OLD_TELEMETRY_SENTINEL, castLedger: [], engineLogic: '' },
    });

    // 2. Perform coordinated Restart via unified entry point
    useAppStore.getState().resetSession();

    // Assert: All old session material is cleared from AppStore
    const appState = useAppStore.getState();
    expect(appState.sessionId).toBeFalsy();
    expect(appState.blueprintId).toBeFalsy();
    expect(appState.turnCount).toBe(0);
    expect(appState.history).toHaveLength(0);
    expect(appState.storyLog).toHaveLength(0);
    expect(appState.uiTranscript).toHaveLength(0);
    expect(appState.enginePayload).toHaveLength(0);
    expect(appState.telemetry).toBeNull();
    expect(appState.activeMemory.systemFlags).toEqual([]);
    expect(appState.lastTurnCheckpoint).toBeNull();

    // Assert: All old session material is cleared from EngineStore
    const engineState = useEngineStore.getState();
    expect(engineState.activeSessionId).toBeNull();
    expect(engineState.activeBlueprint).toBeNull();
    expect(engineState.gameState).toBeNull();
    expect(engineState.engineMessages).toHaveLength(0);
    expect(engineState.engineTextBuffer).toHaveLength(0);
    expect(engineState.engineWorldStateSummary).toBe('');
    expect(engineState.telemetry).toBeNull();

    // 3. Initialize a fresh new session
    const freshBlueprint: ScenarioBlueprint = {
      id: 'fresh-blueprint-999',
      title: 'Fresh Clean World',
      premise: 'A clean room in the light.',
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      contentScale: 1,
      contentLevelDescription: 'Standard',
      narrativeRules: {
        incitingIncident: 'Test incident',
        currentTensionLevel: 'CALM',
        keyPlotElements: [],
      },
      setting: { location: 'Light Room', atmosphere: 'Sterile bright', timePeriod: 'Present' },
      cast: [
        {
          id: 'char-protagonist',
          name: 'Fresh Subject',
          role: 'protagonist',
          description: 'A newly initialized character.',
          isUserCharacter: true,
        },
      ],
      topology: { nodes: ['LIGHT_ROOM'], connections: [] },
    };

    useEngineStore.getState().setBlueprint(freshBlueprint, 'protagonist');

    const freshAppState = useAppStore.getState();
    const freshEngineState = useEngineStore.getState();

    // Assert: Fresh session ID is different from old session ID
    expect(freshAppState.sessionId).not.toBe(OLD_SESSION_ID);
    expect(freshEngineState.activeSessionId).not.toBe(OLD_SESSION_ID);
    expect(freshAppState.sessionId).toBe(freshEngineState.activeSessionId);

    // 4. Verify that prompt construction contains zero prior-session sentinels
    const turnContext = buildEngineTurnContext({
      blueprint: freshBlueprint,
      selectedRole: 'protagonist',
      runtimeState: {
        currentNodeId: 'LIGHT_ROOM',
      },
    });

    const serializedPromptContext = JSON.stringify(turnContext);
    expect(serializedPromptContext).not.toContain(OLD_SESSION_ID);
    expect(serializedPromptContext).not.toContain(OLD_HISTORY_SENTINEL);
    expect(serializedPromptContext).not.toContain(OLD_TELEMETRY_SENTINEL);
    expect(serializedPromptContext).not.toContain(OLD_MEMORY_FLAG);
    expect(serializedPromptContext).not.toContain(OLD_INJURY_SENTINEL);
    expect(serializedPromptContext).not.toContain('OLD_WORLD_STATE_SUMMARY_LEAK');
    expect(serializedPromptContext).not.toContain('The subject is contained');

    // 5. Verify exports contain zero prior-session sentinels
    const exports = [
      JSON.stringify(freshAppState.history),
      buildEngineLogContent(freshAppState.history, 'md')?.content || '',
      buildEngineLogContent(freshAppState.history, 'html')?.content || '',
    ];

    for (const exportContent of exports) {
      expect(exportContent).not.toContain(OLD_SESSION_ID);
      expect(exportContent).not.toContain(OLD_HISTORY_SENTINEL);
      expect(exportContent).not.toContain(OLD_TELEMETRY_SENTINEL);
      expect(exportContent).not.toContain(OLD_MEMORY_FLAG);
      expect(exportContent).not.toContain(OLD_INJURY_SENTINEL);
      expect(exportContent).not.toContain('OLD_WORLD_STATE_SUMMARY_LEAK');
    }
  });
});
