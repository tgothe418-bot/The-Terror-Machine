import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { engineReducer, initialEngineState, EngineState } from './reducer';
import { captureRuntimeSnapshot } from './snapshot';
import { CommittedTurnPayload, FailedTurnPayload } from './events';
import {
  Blueprint,
  BlueprintSchema,
  SpatialNode,
  TurnReceipt,
  TransitionReceipt,
  RatifiedEngineFrame,
} from '../../types';
import { buildEngineTurnContext } from '../../lib/buildEngineTurnContext';
import { projectPresentationPatch } from './presentationProjection';
import { executeRatificationPipeline, TurnResponseError } from '../../lib/ratificationPipeline';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';

describe('Phase 2F: Fixture-Driven Behavioral Verification Suite', () => {
  const originalFetch = globalThis.fetch;

  // Fully schema-valid, strongly-typed authored Blueprint fixture without type escapes
  const authoredBlueprint: Blueprint = BlueprintSchema.parse({
    id: 'bp_authored_facility_01',
    identity: {
      title: 'Sub-Level Omega Facility',
      version: '1.0',
      author: 'Chief Architect',
      thematicAnchor: 'Institutional Decay',
    },
    title: 'Sub-Level Omega Facility',
    globalPremise: 'Survive the containment anomaly',
    premise: 'Survive the containment anomaly',
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    environmentalRules: ['Severe atmospheric dampening', 'Flickering auxiliary power'],
    constraints: ['No unassisted surface egress'],
    contentScale: 3,
    contentLevelDescription: 'Standard',
    topology: {
      nodes: ['ORIGIN_CELL', 'OBSERVATION_DECK'],
      connections: [
        {
          from: 'ORIGIN_CELL',
          to: 'OBSERVATION_DECK',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
        {
          from: 'ORIGIN_CELL',
          to: 'NODE_UNMAPPED',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
        {
          from: 'OBSERVATION_DECK',
          to: 'ORIGIN_CELL',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
      ],
    },
    userCharacterId: 'char_player_01',
    setting: {
      location: 'Origin Cell',
      atmosphere: 'Claustrophobic concrete cell with emergency strobes',
      timePeriod: '1984',
    },
    narrativeRules: {
      incitingIncident: 'Primary containment breach alarm sounded 10 minutes ago',
      phaseDirectives: {},
      currentTensionLevel: 'buildup',
      keyPlotElements: ['The sealed blast door', 'The unmapped service shaft'],
    },
    cast: [
      {
        id: 'char_player_01',
        name: 'Mara Velez',
        description: 'Senior Research Officer',
        role: 'Lead Investigator',
        personality: 'Methodical and observant under pressure',
        goals: 'Document anomaly progression and reach security hub',
        traits: ['Analytical', 'Paranoid'],
        isUserCharacter: true,
        behaviorVector: 'ADAPTIVE',
        isEntity: false,
        vulnerabilityBase: {
          resilience: 0.7,
          skepticism: 0.8,
          baggage: 0.4,
        },
      },
    ],
    characters: [],
    references: [],
    perspectives: [],
  });

  const baseSpatialGraph: SpatialNode[] = [
    {
      id: 'ORIGIN_CELL',
      name: 'Origin Cell',
      description: 'Claustrophobic concrete cell with emergency strobes',
      connectedNodes: ['OBSERVATION_DECK', 'NODE_UNMAPPED'],
      exits: [
        {
          description: 'observation deck',
          targetNodeId: 'OBSERVATION_DECK',
          isOpen: true,
          kind: 'PHYSICAL',
          userInitiated: true,
        },
        {
          description: 'unmapped shaft',
          targetNodeId: 'NODE_UNMAPPED',
          isOpen: true,
          kind: 'PHYSICAL',
          userInitiated: true,
        },
      ],
    },
    {
      id: 'OBSERVATION_DECK',
      name: 'Observation Deck',
      description: 'Reinforced glass mezzanine overlooking the reactor pit',
      connectedNodes: ['ORIGIN_CELL'],
      exits: [
        {
          description: 'origin cell',
          targetNodeId: 'ORIGIN_CELL',
          isOpen: true,
          kind: 'PHYSICAL',
          userInitiated: true,
        },
      ],
    },
  ];

  const baseState: EngineState = {
    ...initialEngineState,
    sessionId: 'session_phase2f_001',
    blueprintId: authoredBlueprint.id,
    turnCount: 0,
    currentNodeId: 'ORIGIN_CELL',
    spatialGraph: baseSpatialGraph,
    activeVector: 'COGNITIVE',
    activeTier: 'LATENT',
    currentPhase: 'LATENT',
    phase: 'LATENT',
    tensionLevel: 10,
    reconciliationRevision: 0,
    activeMemory: {
      systemFlags: ['FACILITY_ONLINE'],
      somaState: [],
      geomState: [],
    },
    storyLog: [],
    history: [],
  };

  beforeEach(() => {
    // Zustand stores are process-global in this test environment; restore the
    // same canonical baseline before every scenario so no case depends on order.
    useAppStore.setState({
      sessionId: 'session_phase2f_001',
      blueprintId: authoredBlueprint.id,
      turnCount: 0,
      currentNodeId: 'ORIGIN_CELL',
      spatialGraph: structuredClone(baseSpatialGraph),
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      phase: 'LATENT',
      currentPhase: 'LATENT',
      tensionLevel: 10,
      reconciliationRevision: 0,
      activeMemory: {
        systemFlags: ['FACILITY_ONLINE'],
        somaState: [],
        geomState: [],
      },
      storyLog: [],
      history: [],
    });
    useEngineStore.setState({ activeBlueprint: authoredBlueprint, gameState: null });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Bound authored session and ordinary turn
  // --------------------------------------------------------------------------
  it('Scenario 1: establishes bound player session and executes an ordinary no-movement turn with exact snapshot coherence', () => {
    // 1. Initialize store session from authored blueprint
    useAppStore.getState().initializeSession({
      blueprint: authoredBlueprint,
      sessionId: 'session_phase2f_001',
    });

    const storeState = useAppStore.getState();

    // Verify player binding and starting canonical topology
    const playerMember = authoredBlueprint.cast.find((c) => c.isUserCharacter);
    expect(playerMember).toBeDefined();
    expect(playerMember?.id).toBe('char_player_01');
    expect(playerMember?.name).toBe('Mara Velez');

    // Exercise the actual binding path rather than only inspecting the fixture.
    const boundContext = buildEngineTurnContext({
      blueprint: authoredBlueprint,
      selectedRole: 'protagonist',
      spatialGraph: storeState.spatialGraph,
      runtimeState: {
        currentNodeId: storeState.currentNodeId,
        activeVector: storeState.activeVector,
        activeTier: storeState.activeTier,
      },
    });
    expect(boundContext.player.characterId).toBe('char_player_01');
    expect(boundContext.player.name).toBe('Mara Velez');

    expect(storeState.currentNodeId).toBe('ORIGIN_CELL');
    expect(storeState.activeVector).toBe('COGNITIVE');
    expect(storeState.activeTier).toBe('LATENT');
    expect(storeState.turnCount).toBe(0);
    expect(storeState.spatialGraph.length).toBe(2);

    // 2. Perform an ordinary no-movement turn
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const frame: RatifiedEngineFrame = {
      engine_thoughts: 'Player inspects the containment terminal. No spatial transition.',
      narrative_blocks: [
        { type: 'prose', content: 'You examine the cracked terminal screen. Green amber digits flicker.' },
      ],
      logic_state: {
        current_phase: 'LATENT',
        suggested_tension: 15,
      },
      topologyDelta: { isExpansion: false },
      validation: { accepted: true, rejected_fields: [], repair_notes: [] },
    };

    const turnReceipt: TurnReceipt = {
      turnNumber: 1,
      nodeBefore: 'ORIGIN_CELL',
      requestedTarget: null,
      accepted: true,
      reason: 'NO_MOVEMENT_REQUESTED',
      nodeAfter: 'ORIGIN_CELL',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      tension: 15,
      preSnapshot,
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Examine the terminal console',
      formattedText: 'You examine the cracked terminal screen. Green amber digits flicker.',
      preSnapshot,
      frame,
      turnReceipt,
    };

    const nextState = engineReducer(baseState, { type: 'TURN_COMMITTED', payload });

    // Canonical state updates only where expected:
    // - turnCount increments exactly once
    expect(nextState.turnCount).toBe(1);
    // - currentNodeId remains on ORIGIN_CELL
    expect(nextState.currentNodeId).toBe('ORIGIN_CELL');
    // - coordinates remain unchanged
    expect(nextState.activeVector).toBe('COGNITIVE');
    expect(nextState.activeTier).toBe('LATENT');
    expect(nextState.tensionLevel).toBe(15);

    // - history holds exactly user command and assistant response
    expect(nextState.history.length).toBe(2);
    expect(nextState.history[0].role).toBe('user');
    expect(nextState.history[0].content).toBe('Examine the terminal console');
    expect(nextState.history[1].role).toBe('assistant');

    // - exact pre-snapshot preservation on the committed assistant turnReceipt
    const committedReceipt = nextState.history[1].turnReceipt;
    expect(committedReceipt).toBeDefined();
    expect(committedReceipt?.preSnapshot).toEqual(preSnapshot);
    expect(committedReceipt?.preSnapshot.turnCount).toBe(0);

    // - post-snapshot derived from committed state
    expect(committedReceipt?.postSnapshot).toBeDefined();
    expect(committedReceipt?.postSnapshot?.turnCount).toBe(1);
    expect(committedReceipt?.postSnapshot?.currentNodeId).toBe('ORIGIN_CELL');
    expect(committedReceipt?.postSnapshot?.activeVector).toBe('COGNITIVE');
    expect(committedReceipt?.postSnapshot?.activeTier).toBe('LATENT');
    expect(committedReceipt?.postSnapshot?.tension).toBe(15);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Authored mapped navigation
  // --------------------------------------------------------------------------
  it('Scenario 2: processes accepted authored transition between existing mapped nodes with postSnapshot agreement', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const transitionReceipt: TransitionReceipt = {
      fromNodeId: 'ORIGIN_CELL',
      toNodeId: 'OBSERVATION_DECK',
      accepted: true,
      reason: 'TRANSITION_ACCEPTED',
    };

    const frame: RatifiedEngineFrame = {
      engine_thoughts: 'Player moves along the corridor to Observation Deck.',
      narrative_blocks: [
        { type: 'prose', content: 'You ascend the metal stairs into the Observation Deck.' },
      ],
      logic_state: {
        current_phase: 'LATENT',
        suggested_tension: 20,
      },
      topologyDelta: { isExpansion: false },
      transitionReceipt,
      validation: { accepted: true, rejected_fields: [], repair_notes: [] },
    };

    const turnReceipt: TurnReceipt = {
      turnNumber: 1,
      nodeBefore: 'ORIGIN_CELL',
      requestedTarget: 'OBSERVATION_DECK',
      accepted: true,
      reason: 'TRANSITION_ACCEPTED',
      nodeAfter: 'OBSERVATION_DECK',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      tension: 20,
      preSnapshot,
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Go to observation deck',
      formattedText: 'You ascend the metal stairs into the Observation Deck.',
      preSnapshot,
      frame,
      transitionReceipt,
      turnReceipt,
    };

    const nextState = engineReducer(baseState, { type: 'TURN_COMMITTED', payload });

    // Node moves to OBSERVATION_DECK
    expect(nextState.currentNodeId).toBe('OBSERVATION_DECK');
    expect(nextState.turnCount).toBe(1);

    // Committed receipt and postSnapshot agree
    const committedReceipt = nextState.history[1].turnReceipt;
    expect(committedReceipt?.nodeBefore).toBe('ORIGIN_CELL');
    expect(committedReceipt?.requestedTarget).toBe('OBSERVATION_DECK');
    expect(committedReceipt?.accepted).toBe(true);
    expect(committedReceipt?.nodeAfter).toBe('OBSERVATION_DECK');
    expect(committedReceipt?.postSnapshot?.currentNodeId).toBe('OBSERVATION_DECK');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Generated topology, then return navigation
  // --------------------------------------------------------------------------
  it('Scenario 3: materializes unmapped boundary into generated node with metadata preserved, then returns via generated exit', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    // Step A: Materialize unmapped shaft
    const expansionPayload: CommittedTurnPayload = {
      commandText: 'Crawl into the unmapped shaft',
      formattedText: 'You pull open the rusted grill and squeeze into a deep maintenance conduit.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Unmapped shaft boundary materialized into SERVICE_SHAFT_9.',
        narrative_blocks: [
          { type: 'prose', content: 'You pull open the rusted grill and squeeze into a deep conduit.' },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 35,
        },
        topologyDelta: {
          isExpansion: true,
          exitDirection: 'unmapped shaft',
          newNodeDef: {
            id: 'SERVICE_SHAFT_9',
            geometry: 'Narrow rusted service conduit with exposed piping',
            hazards: ['High voltage conduits', 'Steam leak'],
            exitVectors: [
              {
                direction: 'back to origin',
                targetNodeId: 'ORIGIN_CELL',
                kind: 'PHYSICAL',
                requires: ['INSULATED_GLOVES'],
                userInitiated: false,
              },
            ],
          },
        },
        validation: { accepted: true, rejected_fields: [], repair_notes: [] },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN_CELL',
        requestedTarget: 'SERVICE_SHAFT_9',
        accepted: true,
        nodeAfter: 'SERVICE_SHAFT_9',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 35,
        preSnapshot,
      },
    };

    const stateAfterExpansion = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload: expansionPayload,
    });

    // Verify atomic graph commit:
    // 1. Current node is now SERVICE_SHAFT_9
    expect(stateAfterExpansion.currentNodeId).toBe('SERVICE_SHAFT_9');
    // 2. Graph now contains exactly 3 nodes
    expect(stateAfterExpansion.spatialGraph?.length).toBe(3);

    // 3. Source exit on ORIGIN_CELL was mapped from NODE_UNMAPPED to SERVICE_SHAFT_9
    const updatedOriginNode = stateAfterExpansion.spatialGraph?.find((n) => n.id === 'ORIGIN_CELL');
    const mappedExit = updatedOriginNode?.exits?.find((e) => e.description === 'unmapped shaft');
    expect(mappedExit?.targetNodeId).toBe('SERVICE_SHAFT_9');

    // 4. Generated exit on SERVICE_SHAFT_9 preserves kind, requires, and userInitiated
    const generatedNode = stateAfterExpansion.spatialGraph?.find((n) => n.id === 'SERVICE_SHAFT_9');
    expect(generatedNode).toBeDefined();
    expect(generatedNode?.name).toBe('Narrow rusted service conduit with exposed piping');
    expect(generatedNode?.exits?.length).toBe(1);
    expect(generatedNode?.exits?.[0]).toEqual({
      targetNodeId: 'ORIGIN_CELL',
      description: 'back to origin',
      isOpen: true,
      kind: 'PHYSICAL',
      requires: ['INSULATED_GLOVES'],
      userInitiated: false,
    });

    // 5. Next turn context derives from committed graph
    const nextTurnContext = buildEngineTurnContext({
      spatialGraph: stateAfterExpansion.spatialGraph,
      runtimeState: {
        currentNodeId: stateAfterExpansion.currentNodeId,
        activeVector: stateAfterExpansion.activeVector,
        activeTier: stateAfterExpansion.activeTier,
      },
      blueprint: authoredBlueprint,
    });
    expect(nextTurnContext.topology.currentNodeId).toBe('SERVICE_SHAFT_9');
    expect(nextTurnContext.topology.allowedOutgoingExits).toEqual([
      {
        from: 'SERVICE_SHAFT_9',
        to: 'ORIGIN_CELL',
        kind: 'PHYSICAL',
        requires: ['INSULATED_GLOVES'],
        userInitiated: false,
      },
    ]);

    // Step B: Following turn navigates via generated return exit back to ORIGIN_CELL
    const step2PreSnapshot = captureRuntimeSnapshot(stateAfterExpansion);

    const returnTransitionReceipt: TransitionReceipt = {
      fromNodeId: 'SERVICE_SHAFT_9',
      toNodeId: 'ORIGIN_CELL',
      accepted: true,
      reason: 'TRANSITION_ACCEPTED',
    };

    const returnPayload: CommittedTurnPayload = {
      commandText: 'Crawl back through the shaft to origin',
      formattedText: 'You carefully retreat back through the conduit into the origin cell.',
      preSnapshot: step2PreSnapshot,
      frame: {
        engine_thoughts: 'Player returns from SERVICE_SHAFT_9 to ORIGIN_CELL.',
        narrative_blocks: [
          { type: 'prose', content: 'You carefully retreat back through the conduit into the origin cell.' },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 30,
        },
        topologyDelta: { isExpansion: false },
        transitionReceipt: returnTransitionReceipt,
        validation: { accepted: true, rejected_fields: [], repair_notes: [] },
      },
      transitionReceipt: returnTransitionReceipt,
      turnReceipt: {
        turnNumber: 2,
        nodeBefore: 'SERVICE_SHAFT_9',
        requestedTarget: 'ORIGIN_CELL',
        accepted: true,
        reason: 'TRANSITION_ACCEPTED',
        nodeAfter: 'ORIGIN_CELL',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 30,
        preSnapshot: step2PreSnapshot,
      },
    };

    const stateAfterReturn = engineReducer(stateAfterExpansion, {
      type: 'TURN_COMMITTED',
      payload: returnPayload,
    });

    expect(stateAfterReturn.currentNodeId).toBe('ORIGIN_CELL');
    expect(stateAfterReturn.turnCount).toBe(2);

    const returnTurnReceipt = stateAfterReturn.history[3].turnReceipt;
    expect(returnTurnReceipt?.nodeBefore).toBe('SERVICE_SHAFT_9');
    expect(returnTurnReceipt?.nodeAfter).toBe('ORIGIN_CELL');
    expect(returnTurnReceipt?.postSnapshot?.currentNodeId).toBe('ORIGIN_CELL');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: No drift from invalid direct navigation
  // --------------------------------------------------------------------------
  describe('Scenario 4: rejects invalid direct transitions without canonical state drift', () => {
    it('4A. rejects transition with accepted: false and preserves canonical node and graph', () => {
      const preSnapshot = captureRuntimeSnapshot(baseState);

      const rejectedReceipt: TransitionReceipt = {
        fromNodeId: 'ORIGIN_CELL',
        toNodeId: 'OBSERVATION_DECK',
        accepted: false,
        reason: 'DOOR_LOCKED',
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Force open the locked blast door',
        formattedText: 'The reinforced door remains firmly locked.',
        preSnapshot,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'The reinforced door remains firmly locked.' }],
          logic_state: { current_phase: 'LATENT', suggested_tension: 10 },
          topologyDelta: { isExpansion: false },
          transitionReceipt: rejectedReceipt,
        },
        transitionReceipt: rejectedReceipt,
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: 'ORIGIN_CELL',
          requestedTarget: 'OBSERVATION_DECK',
          accepted: false,
          reason: 'DOOR_LOCKED',
          nodeAfter: 'ORIGIN_CELL',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 10,
          preSnapshot,
        },
      };

      const nextState = engineReducer(baseState, { type: 'TURN_COMMITTED', payload });

      expect(nextState.currentNodeId).toBe('ORIGIN_CELL');
      expect(nextState.spatialGraph).toEqual(baseSpatialGraph);

      const receipt = nextState.history[1].turnReceipt;
      expect(receipt?.accepted).toBe(false);
      expect(receipt?.nodeBefore).toBe('ORIGIN_CELL');
      expect(receipt?.nodeAfter).toBe('ORIGIN_CELL');
      expect(receipt?.postSnapshot?.currentNodeId).toBe('ORIGIN_CELL');
    });

    it('4B. rejects stale-source transition where fromNodeId does not match current node', () => {
      const preSnapshot = captureRuntimeSnapshot(baseState);

      const staleReceipt: TransitionReceipt = {
        fromNodeId: 'OBSERVATION_DECK', // Does not match baseState.currentNodeId ('ORIGIN_CELL')
        toNodeId: 'ORIGIN_CELL',
        accepted: true,
        reason: 'TRANSITION_ACCEPTED',
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Walk back',
        formattedText: 'You look around confusion.',
        preSnapshot,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'You look around confusion.' }],
          logic_state: { current_phase: 'LATENT', suggested_tension: 10 },
          topologyDelta: { isExpansion: false },
          transitionReceipt: staleReceipt,
        },
        transitionReceipt: staleReceipt,
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: 'ORIGIN_CELL',
          requestedTarget: 'ORIGIN_CELL',
          accepted: false,
          reason: 'STALE_SOURCE_NODE',
          nodeAfter: 'ORIGIN_CELL',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 10,
          preSnapshot,
        },
      };

      const nextState = engineReducer(baseState, { type: 'TURN_COMMITTED', payload });

      expect(nextState.currentNodeId).toBe('ORIGIN_CELL');
      expect(nextState.spatialGraph).toEqual(baseSpatialGraph);
      expect(nextState.history[1].turnReceipt?.nodeAfter).toBe('ORIGIN_CELL');
      expect(nextState.history[1].turnReceipt?.postSnapshot?.currentNodeId).toBe('ORIGIN_CELL');
    });

    it('4C. rejects made-up non-existent target node without altering canonical graph', () => {
      const preSnapshot = captureRuntimeSnapshot(baseState);

      const phantomReceipt: TransitionReceipt = {
        fromNodeId: 'ORIGIN_CELL',
        toNodeId: 'NON_EXISTENT_PHANTOM_CHAMBER',
        accepted: true,
        reason: 'TRANSITION_ACCEPTED',
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Step into the shadow void',
        formattedText: 'The wall is solid concrete. There is nowhere to go.',
        preSnapshot,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'The wall is solid concrete.' }],
          logic_state: { current_phase: 'LATENT', suggested_tension: 10 },
          topologyDelta: { isExpansion: false },
          transitionReceipt: phantomReceipt,
        },
        transitionReceipt: phantomReceipt,
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: 'ORIGIN_CELL',
          requestedTarget: 'NON_EXISTENT_PHANTOM_CHAMBER',
          accepted: false,
          reason: 'TARGET_NOT_IN_GRAPH',
          nodeAfter: 'ORIGIN_CELL',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 10,
          preSnapshot,
        },
      };

      const nextState = engineReducer(baseState, { type: 'TURN_COMMITTED', payload });

      expect(nextState.currentNodeId).toBe('ORIGIN_CELL');
      expect(nextState.spatialGraph).toEqual(baseSpatialGraph);
      expect(nextState.history[1].turnReceipt?.nodeAfter).toBe('ORIGIN_CELL');
      expect(nextState.history[1].turnReceipt?.postSnapshot?.currentNodeId).toBe('ORIGIN_CELL');
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Coordinate mutation
  // --------------------------------------------------------------------------
  it('Scenario 5: applies valid coordinate mutation atomically in TURN_COMMITTED while presentation projection cannot overwrite canonical state', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const frame: RatifiedEngineFrame = {
      engine_thoughts: 'Player experiences somatic escalation in high-radiation sector.',
      narrative_blocks: [
        { type: 'prose', content: 'Your pulse thumps heavily in your ears as adrenaline surges.' },
      ],
      logic_state: {
        current_phase: 'MANIFEST',
        suggested_tension: 60,
        matrix_mutation: {
          next_vector: 'SOMATIC',
          next_tier: 'MANIFEST',
        },
        // Presentation-only fields
        inventory: ['cracked_id_badge', 'dosimeter'],
        player_injuries: ['bruised_ribs'],
        npc_fixations: ['char_player_01: high'],
      },
      topologyDelta: { isExpansion: false },
      validation: { accepted: true, rejected_fields: [], repair_notes: [] },
    };

    const turnReceipt: TurnReceipt = {
      turnNumber: 1,
      nodeBefore: 'ORIGIN_CELL',
      requestedTarget: null,
      accepted: true,
      reason: 'NO_MOVEMENT_REQUESTED',
      nodeAfter: 'ORIGIN_CELL',
      activeVector: 'SOMATIC',
      activeTier: 'MANIFEST',
      tension: 60,
      preSnapshot,
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Check pulse rate',
      formattedText: 'Your pulse thumps heavily in your ears as adrenaline surges.',
      preSnapshot,
      frame,
      turnReceipt,
    };

    const nextState = engineReducer(baseState, { type: 'TURN_COMMITTED', payload });

    // Canonical reducer state updated to new coordinates
    expect(nextState.activeVector).toBe('SOMATIC');
    expect(nextState.activeTier).toBe('MANIFEST');
    expect(nextState.currentPhase).toBe('MANIFEST');
    expect(nextState.tensionLevel).toBe(60);

    // Committed receipt and post-snapshot agree on updated coordinates
    const committedReceipt = nextState.history[1].turnReceipt;
    expect(committedReceipt?.activeVector).toBe('SOMATIC');
    expect(committedReceipt?.activeTier).toBe('MANIFEST');
    expect(committedReceipt?.postSnapshot?.activeVector).toBe('SOMATIC');
    expect(committedReceipt?.postSnapshot?.activeTier).toBe('MANIFEST');
    expect(committedReceipt?.postSnapshot?.tension).toBe(60);

    // Verify presentation projection boundary:
    // projectPresentationPatch only extracts presentation fields and cannot overwrite or emit canonical state
    const presentationPatch = projectPresentationPatch(frame.logic_state);
    expect(presentationPatch.inventory).toEqual(['cracked_id_badge', 'dosimeter']);
    expect(presentationPatch.player_injuries).toEqual(['bruised_ribs']);
    expect(presentationPatch.npc_fixations).toEqual(['char_player_01: high']);

    // Canonical fields are strictly omitted from presentation projection
    const rawPresentation = presentationPatch as Record<string, unknown>;
    expect(rawPresentation.activeVector).toBeUndefined();
    expect(rawPresentation.activeTier).toBeUndefined();
    expect(rawPresentation.turnCount).toBeUndefined();
    expect(rawPresentation.currentNodeId).toBeUndefined();
    expect(rawPresentation.spatialGraph).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Failure/recovery at the real boundary
  // --------------------------------------------------------------------------
  it('Scenario 6: recovers cleanly from network/transport failure into TURN_FAILED with safe failure receipt and identical snapshots', async () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    // Mock fetch for /api/turn to return a 500 Internal Server Error
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'LLM generation failed after 3 retries',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    let caughtError: TurnResponseError | null = null;
    try {
      await executeRatificationPipeline('Investigate the power grid', preSnapshot);
    } catch (err) {
      caughtError = err as TurnResponseError;
    }

    expect(caughtError).toBeInstanceOf(TurnResponseError);
    expect(caughtError?.status).toBe(500);

    // Turn failure payload dispatched to reducer
    const failedPayload: FailedTurnPayload = {
      commandText: 'Investigate the power grid',
      preSnapshot,
      statusCode: caughtError?.status,
      contentType: caughtError?.contentType,
      errorCategory: caughtError?.code || 'SERVER_ERROR',
      errorMessage: caughtError?.message || 'Server error',
      failureReceipt: caughtError?.toReceipt(),
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_FAILED',
      payload: failedPayload,
    });

    // Verify canonical state is completely intact
    expect(nextState.turnCount).toBe(baseState.turnCount);
    expect(nextState.currentNodeId).toBe('ORIGIN_CELL');
    expect(nextState.activeVector).toBe('COGNITIVE');
    expect(nextState.activeTier).toBe('LATENT');
    expect(nextState.spatialGraph).toEqual(baseSpatialGraph);

    // History contains user action and failure assistant message
    expect(nextState.history.length).toBe(2);
    const failMessage = nextState.history[1];
    expect(failMessage.role).toBe('assistant');
    expect(failMessage.failureReceipt).toBeDefined();

    // Turn receipt on failure message has identical pre- and post-snapshots
    const failReceipt = failMessage.turnReceipt;
    expect(failReceipt?.accepted).toBe(false);
    expect(failReceipt?.nodeBefore).toBe('ORIGIN_CELL');
    expect(failReceipt?.nodeAfter).toBe('ORIGIN_CELL');
    expect(failReceipt?.preSnapshot).toEqual(preSnapshot);
    expect(failReceipt?.postSnapshot).toEqual(preSnapshot);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Expansion receipt semantics — verify, do not redesign
  // --------------------------------------------------------------------------
  it('Scenario 7: verifies authorized expansion advances nodeAfter when direct transitionReceipt has accepted: false', () => {
    // The Ad-Lib trace pattern:
    // When an unmapped boundary is materialized via topologyDelta, the direct transitionReceipt
    // expresses that no direct mapped transition occurred (accepted: false / NO_MOVEMENT_REQUESTED),
    // while applyTopologyDeltaToGraph authorizes the expansion and advances the player to the newly generated node.
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const directTransitionReceipt: TransitionReceipt = {
      fromNodeId: 'ORIGIN_CELL',
      toNodeId: 'ORIGIN_CELL',
      accepted: false,
      reason: 'NO_MOVEMENT_REQUESTED',
    };

    const expansionPayload: CommittedTurnPayload = {
      commandText: 'Force open the unmapped shaft cover',
      formattedText: 'The rusty hatch gives way, revealing an unmapped ventilation shaft.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Expansion into VENTILATION_CORE_1 materialized.',
        narrative_blocks: [
          { type: 'prose', content: 'The rusty hatch gives way, revealing an unmapped ventilation shaft.' },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 25,
        },
        topologyDelta: {
          isExpansion: true,
          exitDirection: 'unmapped shaft',
          newNodeDef: {
            id: 'VENTILATION_CORE_1',
            geometry: 'Subterranean ventilation hub with whirling exhaust fans',
            hazards: ['Industrial fan blades', 'Grease buildup'],
            exitVectors: [
              {
                direction: 'back to origin cell',
                targetNodeId: 'ORIGIN_CELL',
                kind: 'PHYSICAL',
                userInitiated: true,
              },
            ],
          },
        },
        transitionReceipt: directTransitionReceipt,
        validation: { accepted: true, rejected_fields: [], repair_notes: [] },
      },
      transitionReceipt: directTransitionReceipt,
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN_CELL',
        requestedTarget: null,
        accepted: false, // direct transition was not accepted
        reason: 'NO_MOVEMENT_REQUESTED',
        nodeAfter: 'VENTILATION_CORE_1', // but resulting node is the materialized node
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 25,
        preSnapshot,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload: expansionPayload,
    });

    // 1. Expansion was authorized by topology-delta boundary checks and advanced canonical node
    expect(nextState.currentNodeId).toBe('VENTILATION_CORE_1');
    expect(nextState.spatialGraph?.length).toBe(3);

    // 2. Direct transition receipt on frame / message retains its direct semantics
    expect(nextState.history[1].transitionReceipt?.accepted).toBe(false);
    expect(nextState.history[1].transitionReceipt?.reason).toBe('NO_MOVEMENT_REQUESTED');

    // 3. Committed turnReceipt.nodeAfter and postSnapshot accurately describe resulting node
    const committedReceipt = nextState.history[1].turnReceipt;
    expect(committedReceipt?.nodeAfter).toBe('VENTILATION_CORE_1');
    expect(committedReceipt?.postSnapshot?.currentNodeId).toBe('VENTILATION_CORE_1');
    expect(committedReceipt?.postSnapshot?.turnCount).toBe(1);
  });
});
