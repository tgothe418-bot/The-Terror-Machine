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

  it('proves retake + replacement turn completely purges abandoned turn state from active state, prompt context, and every normal export', () => {
    const ABANDONED_COMMAND = 'EXAMINE_ABANDONED_RELIC_SENTINEL';
    const ABANDONED_NARRATIVE = 'THE_ABANDONED_RELIC_PULSES_WITH_DARK_MATTER';
    const ABANDONED_ITEM = 'cursed_black_stone_sentinel';
    const ABANDONED_INJURY = 'psychic_fracture_sentinel';
    const ABANDONED_FACT = 'ABANDONED_FACT_ABOUT_VOID';

    const testBlueprint: ScenarioBlueprint = {
      id: 'bp-retake-proof-100',
      title: 'Deep Observatory',
      premise: 'Isolated facility under ice.',
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      contentScale: 1,
      contentLevelDescription: 'Standard',
      narrativeRules: {
        incitingIncident: 'Sensor alert',
        currentTensionLevel: 'CALM',
        keyPlotElements: [],
      },
      setting: { location: 'Observatory Dome', atmosphere: 'Sub-zero silence', timePeriod: 'Modern' },
      cast: [
        {
          id: 'char-tech-1',
          name: 'Technician Scott',
          role: 'protagonist',
          description: 'Observatory engineer',
          isUserCharacter: true,
        },
      ],
      topology: { nodes: ['OBSERVATORY_DOME'], connections: [] },
    };

    // 1. Initialize session
    useEngineStore.getState().setBlueprint(testBlueprint, 'protagonist');
    const startPreSnapshot = {
      version: 1 as const,
      currentNodeId: 'OBSERVATORY_DOME',
      activeVector: 'COGNITIVE' as const,
      activeTier: 'LATENT' as const,
      phase: 'LATENT',
      tension: 0,
      coherence: 1.0,
      reconciliationRevision: 0,
      turnCount: 0,
      activeFlags: [],
    };

    // 2. Commit initial Turn 1 with abandoned sentinels
    useAppStore.getState().commitTurnResult({
      commandText: ABANDONED_COMMAND,
      formattedText: ABANDONED_NARRATIVE,
      preSnapshot: startPreSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: ABANDONED_NARRATIVE }],
        logic_state: { suggested_tension: 60 },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'OBSERVATORY_DOME',
        requestedTarget: 'OBSERVATORY_DOME',
        accepted: true,
        nodeAfter: 'OBSERVATORY_DOME',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 60,
        preSnapshot: startPreSnapshot,
      },
    });

    useEngineStore.getState().setGameState({
      current_location: 'OBSERVATORY_DOME',
      inventory: [ABANDONED_ITEM],
      player_injuries: [ABANDONED_INJURY],
      psychological_status: 'Paranoid',
      world_memory: [
        {
          id: 'wm-abandoned-1',
          kind: 'ESTABLISHED_FACT',
          scope: 'GLOBAL',
          statement: ABANDONED_FACT,
          established_turn: 1,
        },
      ],
    });

    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useAppStore.getState().history[0].content).toBe(ABANDONED_COMMAND);
    expect(useEngineStore.getState().gameState?.inventory).toEqual([ABANDONED_ITEM]);

    // 3. Execute RETAKE
    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(true);

    // Assert: AppStore reverted to pre-turn state
    expect(useAppStore.getState().turnCount).toBe(0);
    expect(useAppStore.getState().history).toHaveLength(0);

    // 4. Commit replacement Turn 1 with fresh clean state
    const CLEAN_COMMAND = 'INSPECT_CLEAN_SURGICAL_LAMP';
    const CLEAN_NARRATIVE = 'THE_LIGHTS_BURN_STEADY_AND_BRIGHT';
    const CLEAN_ITEM = 'sterile_scalpel';
    const CLEAN_FACT = 'SURGICAL_THEATER_IS_CLEAN';

    useAppStore.getState().commitTurnResult({
      commandText: CLEAN_COMMAND,
      formattedText: CLEAN_NARRATIVE,
      preSnapshot: startPreSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: CLEAN_NARRATIVE }],
        logic_state: { suggested_tension: 10 },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'OBSERVATORY_DOME',
        requestedTarget: 'OBSERVATORY_DOME',
        accepted: true,
        nodeAfter: 'OBSERVATORY_DOME',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 10,
        preSnapshot: startPreSnapshot,
      },
    });

    useEngineStore.getState().setGameState({
      current_location: 'OBSERVATORY_DOME',
      inventory: [CLEAN_ITEM],
      player_injuries: [],
      psychological_status: 'Focused',
      world_memory: [
        {
          id: 'wm-clean-1',
          kind: 'ESTABLISHED_FACT',
          scope: 'GLOBAL',
          statement: CLEAN_FACT,
          established_turn: 1,
        },
      ],
    });

    const finalAppState = useAppStore.getState();
    const finalEngineState = useEngineStore.getState();

    // Assert: Active replacement turn exists
    expect(finalAppState.turnCount).toBe(1);
    expect(finalAppState.history[0].content).toBe(CLEAN_COMMAND);
    expect(finalEngineState.gameState?.inventory).toEqual([CLEAN_ITEM]);

    // 5. Assert: Abandoned sentinels are completely absent from AppStore
    const appStateJson = JSON.stringify(finalAppState);
    expect(appStateJson).not.toContain(ABANDONED_COMMAND);
    expect(appStateJson).not.toContain(ABANDONED_NARRATIVE);

    // 6. Assert: Abandoned sentinels are completely absent from EngineStore
    const engineStateJson = JSON.stringify(finalEngineState);
    expect(engineStateJson).not.toContain(ABANDONED_ITEM);
    expect(engineStateJson).not.toContain(ABANDONED_INJURY);
    expect(engineStateJson).not.toContain(ABANDONED_FACT);

    // 7. Assert: Abandoned sentinels are absent from prompt construction
    const promptTurnContext = buildEngineTurnContext({
      blueprint: testBlueprint,
      selectedRole: 'protagonist',
      runtimeState: {
        currentNodeId: 'OBSERVATORY_DOME',
      },
    });
    const promptJson = JSON.stringify(promptTurnContext);
    expect(promptJson).not.toContain(ABANDONED_COMMAND);
    expect(promptJson).not.toContain(ABANDONED_NARRATIVE);
    expect(promptJson).not.toContain(ABANDONED_ITEM);
    expect(promptJson).not.toContain(ABANDONED_INJURY);
    expect(promptJson).not.toContain(ABANDONED_FACT);

    // 8. Assert: Abandoned sentinels are absent from every normal export
    const exports = [
      JSON.stringify(finalAppState.history),
      buildEngineLogContent(finalAppState.history, 'md')?.content || '',
      buildEngineLogContent(finalAppState.history, 'html')?.content || '',
    ];

    for (const exportStr of exports) {
      expect(exportStr).not.toContain(ABANDONED_COMMAND);
      expect(exportStr).not.toContain(ABANDONED_NARRATIVE);
      expect(exportStr).not.toContain(ABANDONED_ITEM);
      expect(exportStr).not.toContain(ABANDONED_INJURY);
      expect(exportStr).not.toContain(ABANDONED_FACT);

      // Verify active replacement turn is present in export
      expect(exportStr).toContain(CLEAN_COMMAND);
    }
  });
});
