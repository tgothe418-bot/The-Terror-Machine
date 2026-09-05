import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  validateEngineFrame,
  detectOutOfCharacterNarratorCheckin,
  applyAntiRescueLinter,
  executeRatificationPipeline,
  projectPlayableStoryBlocks,
  TurnResponseError,
} from './ratificationPipeline';
import { engineReducer, initialEngineState } from '../core/engine/reducer';
import { captureRuntimeSnapshot } from '../core/engine/snapshot';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import type { Blueprint } from '../types';

describe('Packet 10 — Fictional Frame Handling and Dialogue Preservation', () => {
  const originalFetch = globalThis.fetch;

  const defaultConsequenceReceipt = {
    version: 1 as const,
    pre_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' as const },
    post_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' as const },
    patch: {
      inventory_added: [],
      inventory_removed: [],
      injuries_added: [],
      injuries_removed: [],
      psychological_status_change: null,
    },
    decisions: [],
  };

  const defaultCharacterStanceReceipt = {
    version: 1 as const,
    pre_state: {},
    post_state: {},
    decisions: [],
  };

  const defaultCharacterRelationshipReceipt = {
    version: 1 as const,
    pre_state: [],
    post_state: [],
    decisions: [],
  };

  const defaultCharacterMemoryReceipt = {
    version: 1 as const,
    pre_state: {},
    post_state: {},
    decisions: [],
  };

  const defaultWorldMemoryReceipt = {
    version: 1 as const,
    pre_state: [],
    post_state: [],
    decisions: [],
  };

  const defaultHG1Receipts = {
    fictionalTimeReceipt: {
      version: 1 as const,
      preState: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
      acceptedCost: 'MOMENT' as const,
      postState: { moment_revision: 1, scene_beat_revision: 0, extended_revision: 0, last_cost: 'MOMENT' as const },
    },
    castActivityReceipt: {
      version: 1 as const,
      presentOpportunities: [],
      offscreenOpportunities: [],
      boundedOutPursuitIds: [],
      dormantCount: 0,
      notDueCount: 0,
      ledgerSnapshot: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
      scheduleSnapshotRevision: 0,
    },
    pursuitScheduleReceipt: {
      version: 1 as const,
      preState: {},
      postState: {},
    },
    castActivityProposalReceipt: {
      version: 1 as const,
      outcome: 'NO_PROPOSAL' as const,
      reasonCode: 'NO_OPPORTUNITY_CHOSEN' as const,
      admittedManifestation: false,
      acceptedEventId: null,
      preState: [],
      postState: [],
    },
    situatedPressureReceipt: {
      version: 1 as const,
      outcome: 'NO_PROPOSAL' as const,
      reasonCode: 'NO_PRESSURE_CHOSEN' as const,
      admittedManifestation: false,
      acceptedThreadId: null,
      preState: [],
      postState: [],
    },
    valueStateReceipt: {
      version: 1 as const,
      preState: {},
      postState: {},
      decisions: [],
    },
    characterPursuitReceipt: {
      version: 1 as const,
      preState: {},
      postState: {},
      decisions: [],
    },
    characterDevelopmentReceipt: {
      version: 1 as const,
      preState: {},
      postState: {},
      decisions: [],
    },
    pressureThreadTransitionReceipt: {
      version: 1 as const,
      preState: [],
      postState: [],
      decisions: [],
    },
  };

  beforeEach(() => {
    useEngineStore.getState().resetEngine();
    useAppStore.getState().resetSession();

    useEngineStore.setState({
      activeBlueprint: {
        id: 'bp_sanctuary',
        title: 'The Cold Sanctum',
        topology: { nodes: ['ORIGIN_NODE', 'SANCTUARY_NODE'], connections: [] },
      } as unknown as Blueprint,
    });

    useAppStore.setState({
      sessionId: 'sess_frame_test',
      blueprintId: 'bp_sanctuary',
      currentNodeId: 'ORIGIN_NODE',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      tensionLevel: 20,
      phase: 'LATENT',
      turnCount: 1,
      reconciliationRevision: 0,
      storyLog: [],
      history: [],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Case 1: A character offers sincere reassurance
  // =========================================================================
  it('Case 1: sincere reassurance in dialogue survives intact and is accepted', async () => {
    const reassuringDialogue = 'You are safe here, I promise. The iron door will hold.';
    const rawPayload = {
      narrative_blocks: [
        { type: 'prose', content: 'Elena turns the heavy latch.' },
        { type: 'dialogue', speaker: 'Elena Rostova', content: reassuringDialogue },
      ],
      logic_state: { current_phase: 'LATENT', suggested_tension: 20 },
      topologyDelta: { isExpansion: false },
    };

    // 1. Frame validation check
    const frame = validateEngineFrame(rawPayload);
    expect(frame.validation?.accepted).toBe(true);
    expect(frame.validation?.rejected_fields).toEqual([]);
    expect(frame.narrative_blocks[1].content).toBe(reassuringDialogue);
    expect(frame.narrative_blocks[1].content).not.toContain('COGNITIVE REJECTION');
    expect(frame.narrative_blocks[1].content).not.toContain('SAFETY_OVERRIDE_FAILED');

    // 2. Full ratification pipeline check
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          ...rawPayload,
          validation: { accepted: true },
          canonicalConsequenceReceipt: defaultConsequenceReceipt,
          characterStanceReceipt: defaultCharacterStanceReceipt,
          characterRelationshipReceipt: defaultCharacterRelationshipReceipt,
          characterMemoryReceipt: defaultCharacterMemoryReceipt,
          worldMemoryReceipt: defaultWorldMemoryReceipt,
          ...defaultHG1Receipts,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const result = await executeRatificationPipeline('Speak to Elena');
    expect(result.validation?.accepted).toBe(true);
    expect(result.narrative_blocks[1].content).toBe(reassuringDialogue);
  });

  // =========================================================================
  // Case 2: A character lies about safety
  // =========================================================================
  it('Case 2: character deception about safety remains expressible and is accepted', () => {
    const deceptiveDialogue =
      'You are safe. The simulation has ended, you can step out into the real physical room.';
    const rawPayload = {
      narrative_blocks: [
        { type: 'prose', content: 'A silhouette steps from the shadows with an empty smile.' },
        { type: 'dialogue', speaker: 'The Infiltrator', content: deceptiveDialogue },
      ],
      logic_state: { current_phase: 'MANIFEST', suggested_tension: 40 },
    };

    const frame = validateEngineFrame(rawPayload);
    expect(frame.validation?.accepted).toBe(true);
    expect(frame.validation?.rejected_fields).toEqual([]);
    expect(frame.narrative_blocks[1].content).toBe(deceptiveDialogue);
    expect(frame.narrative_blocks[1].content).not.toContain('COGNITIVE REJECTION');
  });

  // =========================================================================
  // Case 3: A refuge or dream is described inside the scenario
  // =========================================================================
  it('Case 3: authored refuge and dream descriptions in prose survive without system markers', () => {
    const refugeProse =
      'The bunker door seals shut. For the first time in hours, you are safe from the entities in the dark. You close your eyes, praying that this waking nightmare was just a dream.';
    const rawPayload = {
      narrative_blocks: [{ type: 'prose', content: refugeProse }],
      logic_state: { current_phase: 'LATENT', suggested_tension: 15 },
    };

    const frame = validateEngineFrame(rawPayload);
    expect(frame.validation?.accepted).toBe(true);
    expect(frame.validation?.rejected_fields).toEqual([]);
    expect(frame.narrative_blocks[0].content).toBe(refugeProse);
    expect(frame.narrative_blocks[0].content).not.toContain('COGNITIVE REJECTION');
    expect(frame.narrative_blocks[0].content).not.toContain('SAFETY_OVERRIDE_FAILED');
  });

  // =========================================================================
  // Case 4: The narrator clearly interrupts roleplay to check on the real user
  // =========================================================================
  it('Case 4: explicit out-of-character narrator check-in is rejected without fabricated prose or canonical changes', async () => {
    const oocProse =
      '[OOC: I notice this scene is getting very intense. If you are feeling overwhelmed, remember you are safe and you can step away from the screen anytime.]';
    const rawPayload = {
      narrative_blocks: [
        { type: 'prose', content: oocProse },
      ],
      logic_state: { current_phase: 'MANIFEST', suggested_tension: 80 },
    };

    // 1. Direct detector check
    const checkin = detectOutOfCharacterNarratorCheckin({ type: 'prose', content: oocProse });
    expect(checkin.isBreach).toBe(true);

    // 2. Direct validateEngineFrame check
    const frame = validateEngineFrame(rawPayload);
    expect(frame.validation?.accepted).toBe(false);
    expect(frame.validation?.rejected_fields).toContain('narrative_frame');
    // Content must not be rewritten into fabricated system error prose
    expect(frame.narrative_blocks[0].content).toBe(oocProse);
    expect(frame.narrative_blocks[0].content).not.toContain('COGNITIVE REJECTION: SAFETY PROTOCOL DENIED');

    // 3. AI assistant self-identification check-in
    const aiCheckin =
      'As an AI assistant, I want to check in on you. If you feel distressed, please take a break from this simulation.';
    const aiFrame = validateEngineFrame({
      narrative_blocks: [{ type: 'prose', content: aiCheckin }],
      logic_state: { current_phase: 'MANIFEST' },
    });
    expect(aiFrame.validation?.accepted).toBe(false);
    expect(aiFrame.validation?.rejected_fields).toContain('narrative_frame');

    // 4. Crisis helpline injection
    const crisisCheckin =
      'If you are feeling overwhelmed, please pause and reach out to a crisis helpline or mental health professional.';
    const crisisFrame = validateEngineFrame({
      narrative_blocks: [{ type: 'prose', content: crisisCheckin }],
      logic_state: { current_phase: 'MANIFEST' },
    });
    expect(crisisFrame.validation?.accepted).toBe(false);
    expect(crisisFrame.validation?.rejected_fields).toContain('narrative_frame');

    // 5. Through execution pipeline: throws FRAME_VALIDATION_REJECTED
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          ...rawPayload,
          canonicalConsequenceReceipt: defaultConsequenceReceipt,
          characterStanceReceipt: defaultCharacterStanceReceipt,
          characterRelationshipReceipt: defaultCharacterRelationshipReceipt,
          characterMemoryReceipt: defaultCharacterMemoryReceipt,
          worldMemoryReceipt: defaultWorldMemoryReceipt,
          ...defaultHG1Receipts,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
    let caughtError: TurnResponseError | null = null;
    try {
      await executeRatificationPipeline('Look around', preSnapshot);
    } catch (err) {
      caughtError = err as TurnResponseError;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe('FRAME_VALIDATION_REJECTED');

    // 6. Reducer TURN_FAILED verification: canonical state remains completely unchanged
    const stateBefore = useAppStore.getState();
    const stateAfter = engineReducer(stateBefore, {
      type: 'TURN_FAILED',
      payload: {
        commandText: 'Look around',
        errorCategory: caughtError?.code || 'FRAME_VALIDATION_REJECTED',
        errorMessage: caughtError?.message || '',
        statusCode: caughtError?.status,
        contentType: caughtError?.contentType,
        preSnapshot,
      },
    });

    expect(stateAfter.turnCount).toBe(stateBefore.turnCount);
    expect(stateAfter.currentNodeId).toBe(stateBefore.currentNodeId);
    expect(stateAfter.activeVector).toBe(stateBefore.activeVector);
    expect(stateAfter.activeTier).toBe(stateBefore.activeTier);
    expect(stateAfter.tensionLevel).toBe(stateBefore.tensionLevel);
    expect(stateAfter.storyLog).toEqual(stateBefore.storyLog);

    // Excluded from subsequent request context
    const playableBlocks = projectPlayableStoryBlocks(stateAfter);
    expect(playableBlocks).toHaveLength(0);
  });

  // =========================================================================
  // Case 5: Similar wording is spoken by an in-world character
  // =========================================================================
  it('Case 5: similar comforting wording spoken in-world is protected by attribution', () => {
    const inWorldDialogue =
      'If you are feeling overwhelmed, take a deep breath. You are safe in the infirmary.';
    const rawPayload = {
      narrative_blocks: [
        { type: 'prose', content: 'Dr. Mercer checks your pulse.' },
        { type: 'dialogue', speaker: 'Dr. Mercer', content: inWorldDialogue },
      ],
      logic_state: { current_phase: 'LATENT', suggested_tension: 10 },
    };

    const frame = validateEngineFrame(rawPayload);
    expect(frame.validation?.accepted).toBe(true);
    expect(frame.validation?.rejected_fields).toEqual([]);
    expect(frame.narrative_blocks[1].content).toBe(inWorldDialogue);
  });

  // =========================================================================
  // Case 6: Ambiguous attribution
  // =========================================================================
  it('Case 6: ambiguous second-person reassurance is admitted under the bounded disposition policy', () => {
    const ambiguousProse = 'Take a deep breath and ground yourself in the present. You are safe.';
    const rawPayload = {
      narrative_blocks: [{ type: 'prose', content: ambiguousProse }],
      logic_state: { current_phase: 'LATENT', suggested_tension: 10 },
    };

    // Under bounded disposition policy, ambiguous second-person prose without explicit
    // fourth-wall/assistant markers is admitted as in-scenario protagonist narration
    const frame = validateEngineFrame(rawPayload);
    expect(frame.validation?.accepted).toBe(true);
    expect(frame.validation?.rejected_fields).toEqual([]);
    expect(frame.narrative_blocks[0].content).toBe(ambiguousProse);
  });

  // =========================================================================
  // Case 7: Explicit provider refusal, empty result, or malformed response
  // =========================================================================
  it('Case 7: provider refusal and empty responses remain honest non-canonical failures', async () => {
    const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());

    // 7a. Provider Refusal (HTTP 502 with PROVIDER_REFUSAL)
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          error: 'AI provider declined turn generation',
          code: 'PROVIDER_REFUSAL',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    });

    let refusalError: TurnResponseError | null = null;
    try {
      await executeRatificationPipeline('Break the seal', preSnapshot);
    } catch (err) {
      refusalError = err as TurnResponseError;
    }

    expect(refusalError).not.toBeNull();
    expect(refusalError?.code).toBe('PROVIDER_REFUSAL');
    expect(refusalError?.status).toBe(502);

    // 7b. Empty narrative blocks rejected by frame validation
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          narrative_blocks: [],
          logic_state: { current_phase: 'LATENT' },
          canonicalConsequenceReceipt: defaultConsequenceReceipt,
          characterStanceReceipt: defaultCharacterStanceReceipt,
          characterRelationshipReceipt: defaultCharacterRelationshipReceipt,
          characterMemoryReceipt: defaultCharacterMemoryReceipt,
          worldMemoryReceipt: defaultWorldMemoryReceipt,
          ...defaultHG1Receipts,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    let emptyFrameError: TurnResponseError | null = null;
    try {
      await executeRatificationPipeline('Listen closely', preSnapshot);
    } catch (err) {
      emptyFrameError = err as TurnResponseError;
    }

    expect(emptyFrameError).not.toBeNull();
    expect(emptyFrameError?.code).toBe('FRAME_VALIDATION_REJECTED');
  });

  // =========================================================================
  // Retake Integration: Prior successful turn followed by a frame failure
  // =========================================================================
  it('Retake integration: retains prior successful turn checkpoint across frame failure and rewinds cleanly', () => {
    const baseState = {
      ...initialEngineState,
      turnCount: 1,
      currentNodeId: 'ORIGIN_NODE',
      activeVector: 'COGNITIVE' as const,
      activeTier: 'LATENT' as const,
      tensionLevel: 20,
      history: [],
      storyLog: [{ type: 'prose', content: 'You stand at the threshold.' }],
    };

    const preSnapshotTurn1 = captureRuntimeSnapshot(baseState);

    // 1. Successful Turn 1
    const turn1Payload = {
      commandText: 'Step into the hallway',
      formattedText: 'The floorboards groan beneath your weight.',
      preSnapshot: preSnapshotTurn1,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The floorboards groan beneath your weight.' }],
        logic_state: { current_phase: 'MANIFEST', suggested_tension: 30 },
      },
      transitionReceipt: {
        requestedNodeId: null,
        accepted: false,
        fromNodeId: 'ORIGIN_NODE',
        toNodeId: 'ORIGIN_NODE',
        reason: 'NO_MOVE',
      },
      turnReceipt: {
        turnNumber: 2,
        nodeBefore: 'ORIGIN_NODE',
        requestedTarget: null,
        accepted: true,
        reason: 'COMMITTED',
        nodeAfter: 'ORIGIN_NODE',
        activeVector: 'COGNITIVE' as const,
        activeTier: 'LATENT' as const,
        tension: 30,
        preSnapshot: preSnapshotTurn1,
      },
    };

    const stateAfterTurn1 = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload: turn1Payload,
    });

    expect(stateAfterTurn1.turnCount).toBe(2);
    expect(stateAfterTurn1.tensionLevel).toBe(30);
    expect(stateAfterTurn1.lastTurnCheckpoint).not.toBeNull();
    expect(stateAfterTurn1.lastTurnCheckpoint?.commandText).toBe('Step into the hallway');

    // 2. Turn 2 encounters an OOC narrator frame breach and fails validation
    const preSnapshotTurn2 = captureRuntimeSnapshot(stateAfterTurn1);
    const stateAfterTurn2Failure = engineReducer(stateAfterTurn1, {
      type: 'TURN_FAILED',
      payload: {
        commandText: 'Examine the symbol',
        errorCategory: 'FRAME_VALIDATION_REJECTED',
        errorMessage: 'The simulation frame failed authoritative validation.',
        preSnapshot: preSnapshotTurn2,
      },
    });

    // Verify canonical state and checkpoint remain identical to stateAfterTurn1
    expect(stateAfterTurn2Failure.turnCount).toBe(2);
    expect(stateAfterTurn2Failure.tensionLevel).toBe(30);
    expect(stateAfterTurn2Failure.storyLog).toHaveLength(2); // Only opening + Turn 1
    expect(stateAfterTurn2Failure.lastTurnCheckpoint).not.toBeNull();
    expect(stateAfterTurn2Failure.lastTurnCheckpoint?.commandText).toBe('Step into the hallway');

    // 3. User invokes Retake on stateAfterTurn2Failure
    const stateAfterRetake = engineReducer(stateAfterTurn2Failure, {
      type: 'TURN_RETAKEN',
    });

    // Verify clean rewind to pre-Turn 1 checkpoint
    expect(stateAfterRetake.turnCount).toBe(1);
    expect(stateAfterRetake.tensionLevel).toBe(20);
    expect(stateAfterRetake.lastTurnCheckpoint).toBeNull();
  });

  // =========================================================================
  // Non-destructive applyAntiRescueLinter compatibility
  // =========================================================================
  it('preserves raw text through applyAntiRescueLinter without token replacement', () => {
    const inputWithTriggers =
      'You are safe here in the present. The simulation has ended, just a dream in your real physical room.';
    const output = applyAntiRescueLinter(inputWithTriggers);
    expect(output).toBe(inputWithTriggers);
    expect(output).not.toContain('COGNITIVE REJECTION');
    expect(output).not.toContain('SAFETY_OVERRIDE_FAILED');
  });
});
