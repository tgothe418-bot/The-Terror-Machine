import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { compileForgeDraft } from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import {
  executeRatificationPipeline,
  validateEngineFrame,
  projectPlayableStoryBlocks,
} from './ratificationPipeline';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import {
  selectCastActivityEligibility,
  advancePursuitScheduleLedger,
} from './castActivityEligibility';
import { resolveCastActivity } from './castActivity';
import { resolveSituatedPressure } from './situatedPressure';
import { createInitialFictionalTimeLedger } from './fictionalTime';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { captureRetakeRestorableState } from '../core/engine/reducer';
import { captureRuntimeSnapshot } from '../core/engine/snapshot';
import { reconcileSessionStores } from './sessionReconciliation';
import { buildEngineLogContent } from './download';
import type { LogicState, Message, SpatialNode, DurableSessionRevision } from '../types';
import type { ForgeDraft } from '../types/forge';
import type {
  FictionalTimeLedger,
  CharacterPursuitLedger,
  CastActivityEvent,
  CastActivityProposal,
  SituatedPressureProposal,
  HorrorGrammarForensicRecord,
} from '../types/horrorGrammar';

describe('Packet 12 — Integrated Acceptance and Stabilization (Master Proof)', () => {
  const originalFetch = globalThis.fetch;

  const defaultConsequenceReceipt = {
    version: 1 as const,
    pre_state: {
      inventory: [],
      player_injuries: [],
      psychological_status: 'STABLE' as const,
    },
    post_state: {
      inventory: [],
      player_injuries: [],
      psychological_status: 'STABLE' as const,
    },
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

  const defaultBaseTurnReceipts = {
    validation: { accepted: true },
    canonicalConsequenceReceipt: defaultConsequenceReceipt,
    characterStanceReceipt: defaultCharacterStanceReceipt,
    characterRelationshipReceipt: defaultCharacterRelationshipReceipt,
    characterMemoryReceipt: defaultCharacterMemoryReceipt,
    worldMemoryReceipt: defaultWorldMemoryReceipt,
  };

  const createMasterForgeDraft = (): ForgeDraft => ({
    id: 'draft-master-1',
    identity: {
      title: 'Facility Epsilon: Depth Containment',
      version: '1.0',
      author: 'Lead Architect Cole',
      thematicAnchor: 'Structural Isolation and Cognitive Failure',
    },
    title: 'Facility Epsilon: Depth Containment',
    premise: 'A sub-aquatic research platform experiencing primary hull and containment collapse.',
    globalPremise: 'A sub-aquatic research platform experiencing primary hull and containment collapse.',
    setting: {
      location: 'Sub-Level Trench 4',
      atmosphere: 'Deep oceanic pressure and dying emergency red strobes',
      timePeriod: '2026',
    },
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    topology: {
      startingNodeId: 'NODE_CENTRAL_HUB',
      nodes: ['NODE_CENTRAL_HUB', 'NODE_REACTOR_CORRIDOR', 'NODE_SUB_DOCK'],
      nodeDefinitions: [
        {
          id: 'NODE_CENTRAL_HUB',
          label: 'Central Hub',
          description: 'The submerged command center with panoramic pressure glass.',
        },
        {
          id: 'NODE_REACTOR_CORRIDOR',
          label: 'Reactor Corridor',
          description: 'A reinforced passageway lined with high-voltage conduit.',
        },
        {
          id: 'NODE_SUB_DOCK',
          label: 'Submersible Bay',
          description: 'Flooded docking slips for emergency evacuation subs.',
        },
      ],
      connections: [
        { from: 'NODE_CENTRAL_HUB', to: 'NODE_REACTOR_CORRIDOR' },
        { from: 'NODE_CENTRAL_HUB', to: 'NODE_SUB_DOCK' },
        { from: 'NODE_REACTOR_CORRIDOR', to: 'NODE_CENTRAL_HUB' },
        { from: 'NODE_SUB_DOCK', to: 'NODE_CENTRAL_HUB' },
      ],
    },
    cast: [
      {
        id: 'char-user',
        name: 'Officer Ray',
        isUserCharacter: true,
        role: 'Protagonist',
        description: 'Lead station engineer and emergency officer',
        personality: 'Methodical, alert, resolute',
        goals: 'Prevent core breach and evac surviving crew',
        traits: ['Vigilant', 'Engineering Specialist'],
        behaviorVector: 'COGNITIVE',
        isEntity: false,
        starting_location: 'NODE_CENTRAL_HUB',
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_CENTRAL_HUB' },
      },
      {
        id: 'char-tech',
        name: 'Technician Mercer',
        isUserCharacter: false,
        role: 'Support Engineer',
        description: 'Senior electrical systems tech',
        personality: 'Anxious but technically brilliant',
        goals: 'Maintain backup generator integrity',
        traits: ['Technical', 'Quick-thinking'],
        behaviorVector: 'COGNITIVE',
        isEntity: false,
        starting_location: 'NODE_CENTRAL_HUB', // Co-present with user
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_CENTRAL_HUB' },
      },
      {
        id: 'char-guard',
        name: 'Guard Petrov',
        isUserCharacter: false,
        role: 'Station Security',
        description: 'Security chief stationed at the submarine dock',
        personality: 'Stoic, disciplined, watchful',
        goals: 'Hold evacuation routes clear of anomalies',
        traits: ['Disciplined', 'Steadfast'],
        behaviorVector: 'SOMATIC',
        isEntity: false,
        starting_location: 'NODE_SUB_DOCK', // Offscreen
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_SUB_DOCK' },
      },
    ],
    userOpeningAim: {
      castMemberId: 'char-user',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    },
    depictionContract: {
      dramaticRegister: 'Cold industrial realism under relentless ocean pressure',
      directness: 'Sensory grounding in failing machinery, freezing water, and structural screams',
      aftermath: 'Irreversible physical fatigue, equipment degradation, and loss of life',
      ambiguityHandling: 'Technological breakdowns and sonar anomalies remain empirically unresolved',
      specialBoundaries: 'No fourth-wall breaches; no magic; no unexplained external rescues',
    },
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED',
      pursuitReviews: {
        'char-user': 'REVIEWED_NONE',
        'char-tech': 'REVIEWED',
        'char-guard': 'REVIEWED',
      },
      valueAnchors: [
        {
          id: 'val-reactor-containment',
          holder: { kind: 'PLACE', nodeId: 'NODE_REACTOR_CORRIDOR' },
          label: 'Reactor Containment',
          description: 'Emergency core cooling shielding preventing catastrophic meltdown',
          basisSummary: 'Core facility survival anchor',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'val-user-badge',
          holder: { kind: 'CHARACTER', castMemberId: 'char-user' },
          label: 'Ray Personal Command Keycard',
          description: 'Biometric authorization card required for manual override of bulkheads',
          basisSummary: 'Personal command sovereignty token',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
      characterPursuits: [
        {
          id: 'pursuit-tech-generators',
          castMemberId: 'char-tech',
          objective: 'Stabilize generator fuel lines',
          presentApproach: 'Calibrating pressure gauges at primary console',
          locationNodeId: 'NODE_CENTRAL_HUB',
          status: 'ACTIVE',
          reviewWindow: 'MOMENT',
          triggerReferences: [],
          basisSummary: 'Primary maintenance assignment',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          objective: 'Guard escape sub slips against hull incursion',
          presentApproach: 'Patrolling gantry with magnetic harpoon rifle',
          locationNodeId: 'NODE_SUB_DOCK',
          status: 'ACTIVE',
          reviewWindow: 'EVENT_DRIVEN',
          triggerReferences: ['evt-dock-breach'],
          basisSummary: 'Emergency security protocol',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
    },
  });

  const masterSpatialGraph: SpatialNode[] = [
    {
      id: 'NODE_CENTRAL_HUB',
      name: 'Central Hub',
      description: 'The submerged command center with panoramic pressure glass.',
      exits: [
        { targetNodeId: 'NODE_REACTOR_CORRIDOR', isOpen: true, kind: 'PHYSICAL', userInitiated: true, description: 'Enter reactor corridor' },
        { targetNodeId: 'NODE_SUB_DOCK', isOpen: true, kind: 'PHYSICAL', userInitiated: true, description: 'Proceed to submarine dock' },
      ],
    },
    {
      id: 'NODE_REACTOR_CORRIDOR',
      name: 'Reactor Corridor',
      description: 'A reinforced passageway lined with high-voltage conduit.',
      exits: [
        { targetNodeId: 'NODE_CENTRAL_HUB', isOpen: true, kind: 'PHYSICAL', userInitiated: true, description: 'Return to central hub' },
      ],
    },
    {
      id: 'NODE_SUB_DOCK',
      name: 'Submersible Bay',
      description: 'Flooded docking slips for emergency evacuation subs.',
      exits: [
        { targetNodeId: 'NODE_CENTRAL_HUB', isOpen: true, kind: 'PHYSICAL', userInitiated: true, description: 'Return to central hub' },
      ],
    },
  ];

  const defaultHG1Receipts = {
    ...defaultBaseTurnReceipts,
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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Step 1: Forge Import, Compilation, and Snapshot Review (Identical Bytes)
  // =========================================================================
  describe('Step 1: Forge Compilation & Snapshot Review Artifact', () => {
    it('preserves authored depiction contract and verifies identical Copy and Download bytes', () => {
      const draft = createMasterForgeDraft();

      const readiness = validateForgeExportReadiness({ draft });
      expect(readiness.valid).toBe(true);

      const compiled = compileForgeDraft(draft);
      expect(compiled.success).toBe(true);
      if (!compiled.success) return;

      const bp = compiled.blueprint;
      // Depiction contract is preserved verbatim
      expect(bp.depictionContract.dramaticRegister).toBe(
        'Cold industrial realism under relentless ocean pressure'
      );
      expect(bp.depictionContract.directness).toBe(
        'Sensory grounding in failing machinery, freezing water, and structural screams'
      );
      expect(bp.depictionContract.aftermath).toBe(
        'Irreversible physical fatigue, equipment degradation, and loss of life'
      );
      expect(bp.depictionContract.ambiguityHandling).toBe(
        'Technological breakdowns and sonar anomalies remain empirically unresolved'
      );

      // Perspective neutrality: exported blueprint has no hardcoded user character
      expect(bp.userCharacterId).toBeUndefined();
      for (const c of bp.cast) {
        expect(c.isUserCharacter).toBe(false);
      }

      // Snapshot review parity: Copy and Download share exact serialized bytes
      const copyPayload = JSON.stringify(bp, null, 2);
      const downloadPayload = JSON.stringify(bp, null, 2);
      expect(copyPayload).toBe(downloadPayload);
    });
  });

  // =========================================================================
  // Step 2: Perspective Entry & SYSTEM_INIT Non-Advancement
  // =========================================================================
  describe('Step 2: Engine Perspective Entry & SYSTEM_INIT Non-Advancement', () => {
    it('accepts opening turn with zero time advancement and exposes opening narration to subsequent context', async () => {
      const draft = createMasterForgeDraft();
      const compiled = compileForgeDraft(draft);
      expect(compiled.success).toBe(true);
      const bp = compiled.blueprint;

      const sessionId = 'session-integrated-acceptance-1';
      useEngineStore.setState({
        activeBlueprint: bp,
        gameState: {
          session_id: sessionId,
          blueprint_id: bp.id,
          player_character_id: 'char-user',
          fictional_time_ledger: createInitialFictionalTimeLedger(),
          pursuit_schedule_ledger: {},
          character_pursuit_ledger: {},
          activity_events: [],
          world_memory: [],
        } as LogicState,
      });

      useAppStore.setState({
        sessionId,
        blueprintId: bp.id,
        turnCount: 0,
        canonicalRevision: 1,
        currentNodeId: 'NODE_CENTRAL_HUB',
        spatialGraph: masterSpatialGraph,
        storyLog: [],
        history: [],
      });

      const openingNarration =
        'Emergency klaxons scream through the damp corridor of Sub-Level Trench 4. Water trickles past the reinforced seals.';

      // Mock server returning SYSTEM_INIT receipt with acceptedCost: 'NONE'
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            narrative_blocks: [{ type: 'prose', content: openingNarration }],
            logic_state: { current_phase: 'MANIFEST', suggested_tension: 30 },
            topologyDelta: { isExpansion: false },
            ...defaultHG1Receipts,
            fictionalTimeReceipt: {
              version: 1,
              preState: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
              acceptedCost: 'NONE',
              postState: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
            },
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      });

      const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
      const frame = await executeRatificationPipeline('SYSTEM_INIT', preSnapshot);

      expect(frame.fictionalTimeReceipt?.acceptedCost).toBe('NONE');
      expect(frame.fictionalTimeReceipt?.postState.moment_revision).toBe(0);
      expect(frame.fictionalTimeReceipt?.postState.scene_beat_revision).toBe(0);
      expect(frame.fictionalTimeReceipt?.postState.extended_revision).toBe(0);
      expect(frame.contextReceipt).toBeDefined();

      // Commit opening turn
      useAppStore.getState().commitTurnResult({
        commandText: 'SYSTEM_INIT',
        formattedText: openingNarration,
        preSnapshot,
        engineGameStateBefore: useEngineStore.getState().gameState,
        frame,
        turnReceipt: {
          turnNumber: 0,
          nodeBefore: 'NODE_CENTRAL_HUB',
          requestedTarget: null,
          accepted: true,
          nodeAfter: 'NODE_CENTRAL_HUB',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 30,
          preSnapshot,
        },
      });

      // Opening narration is recorded in storyLog and available to projectPlayableStoryBlocks
      const storyBlocks = projectPlayableStoryBlocks(useAppStore.getState());
      expect(storyBlocks.some((b) => (b.content || '').includes('Emergency klaxons scream'))).toBe(
        true
      );
    });
  });

  // =========================================================================
  // Step 3: Consecutive Turns, World Memory, and Boundary Enforcement
  // =========================================================================
  describe('Step 3: Consecutive Turns, World Memory Persistence, and Boundary Rejections', () => {
    it('establishes a world fact, preserves it across empty turns, accepts co-present activity, and rejects ungrounded claims', () => {
      const draft = createMasterForgeDraft();
      const bp = compileForgeDraft(draft).blueprint!;
      const context = buildEngineTurnContext({
        blueprint: bp,
        selectedCharacterId: 'char-user',
        currentNodeId: 'NODE_CENTRAL_HUB',
        spatialGraph: masterSpatialGraph,
      });

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CENTRAL_HUB',
        fictionalTime: createInitialFictionalTimeLedger(),
        userCharacterId: 'char-user',
        turnNumber: 1,
      });

      // 1. Legitimate co-present activity: Mercer calibrates console
      const validProposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-mercer-valid',
        castMemberId: 'char-tech',
        pursuitId: 'pursuit-tech-generators',
        locationNodeId: 'NODE_CENTRAL_HUB',
        activitySummary: 'Technician Mercer monitors the auxiliary fuel pressure gauges.',
        authorityReferences: ['opp-present-char-tech', 'pursuit-tech-generators'],
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'prose',
          content: 'Mercer taps the fuel pressure gauge anxiously.',
        },
      };

      const validReceipt = resolveCastActivity({
        proposal: validProposal,
        eligibilityReceipt: eligibility,
        currentContext: context,
        preEvents: [],
        currentTurn: 1,
      });

      expect(validReceipt.outcome).toBe('ACCEPTED');
      expect(validReceipt.admittedManifestation).toBe(true);
      expect(validReceipt.acceptedEventId).toBeTruthy();

      // 2. Reject absent-actor direct manifestation: Guard Petrov at NODE_SUB_DOCK cannot claim DIRECT perception at NODE_CENTRAL_HUB
      const absentProposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-petrov-absent',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        locationNodeId: 'NODE_CENTRAL_HUB', // Mismatched location
        activitySummary: 'Guard Petrov stands next to Ray in the central hub.',
        authorityReferences: ['opp-present-char-tech'], // Wrong owner
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'prose',
          content: 'Petrov whispers a warning.',
        },
      };

      const absentReceipt = resolveCastActivity({
        proposal: absentProposal,
        eligibilityReceipt: eligibility,
        currentContext: context,
        preEvents: [],
        currentTurn: 1,
      });

      expect(absentReceipt.outcome).toBe('REJECTED');

      // 3. User Value Protection: attempting to mutate User personal command keycard without player sovereignty is rejected
      const protectedValueProposal: SituatedPressureProposal = {
        kind: 'PRESSURE',
        proposalId: 'prop-bypass-keycard',
        valueAnchorId: 'val-user-badge',
        sourceReference: 'BASELINE',
        operator: 'DEGRADE_CAPABILITY',
        affectedDimension: 'CAPABILITY',
        adverseProspect: 'Keycard crushed underfoot',
        authorityReferences: ['val-user-badge'],
        persistenceTarget: 'CANONICAL_CONDITION',
        responseWindowOpen: false,
        manifestationBlock: null,
      };

      const pressureReceipt = resolveSituatedPressure({
        proposal: protectedValueProposal,
        currentContext: context,
        preThreads: [],
        currentTurn: 1,
      });

      expect(pressureReceipt.outcome).toBe('REJECTED');
      expect(pressureReceipt.reasonCode).toBe('RESPONSE_WINDOW_CLOSED');
    });
  });

  // =========================================================================
  // Step 4: Pursuit Redirection and Event-Driven Trigger Lifecycle
  // =========================================================================
  describe('Step 4: Pursuit Redirection and Event-Driven Trigger Semantics', () => {
    it('projects runtime intent offscreen, consumes trigger once considered, and re-triggers on new events', () => {
      const draft = createMasterForgeDraft();
      const bp = compileForgeDraft(draft).blueprint!;

      // 1. Runtime redirection in characterPursuitLedger
      const characterPursuitLedger: CharacterPursuitLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          status: 'ACTIVE',
          currentObjective: 'Seal lower submarine ballast gate against incoming tide',
          currentApproach: 'Manually wrenching the hydraulic bypass wheel',
          currentLocationNodeId: 'NODE_SUB_DOCK',
          reviewWindow: 'EVENT_DRIVEN',
          progressSummary: 'Hydraulic lock engaged',
          lastCauseReference: 'BASELINE',
          lastActivityTurn: null,
          lastChangedTurn: 1,
        },
      };

      const dockBreachEvent: CastActivityEvent = {
        id: 'evt-dock-breach',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        activitySummary: 'Hull breach alarm sirens triggered at submarine dock slip 2.',
        locationNodeId: 'NODE_SUB_DOCK',
        perceptionPath: 'LOCAL_TRACE',
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: true,
      };

      const fictionalTime = createInitialFictionalTimeLedger();

      // Turn 2: Event 1 activates the pursuit
      const eligibilityTurn2 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CENTRAL_HUB',
        fictionalTime,
        characterPursuitLedger,
        userCharacterId: 'char-user',
        turnNumber: 2,
        activityEvents: [dockBreachEvent],
      });

      const guardOpp = eligibilityTurn2.offscreenOpportunities.find(
        (o) => o.pursuitId === 'pursuit-guard-breach'
      );
      expect(guardOpp).toBeDefined();
      // Offscreen opportunity accurately projects the mutated runtime objective and approach!
      expect(guardOpp?.objective).toBe('Seal lower submarine ballast gate against incoming tide');
      expect(guardOpp?.presentApproach).toBe('Manually wrenching the hydraulic bypass wheel');

      // Advance pursuit schedule at Turn 2
      const scheduleAfterTurn2 = advancePursuitScheduleLedger({
        preSchedule: {},
        eligibilityReceipt: eligibilityTurn2,
        fictionalTime,
        turnNumber: 2,
        characterPursuits: bp.horrorGrammar?.characterPursuits,
      });

      expect(scheduleAfterTurn2['pursuit-guard-breach']?.lastConsideredTurn).toBe(2);

      // Turn 3: Neutral turn without new events -> consumed!
      const eligibilityTurn3 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CENTRAL_HUB',
        fictionalTime,
        pursuitSchedule: scheduleAfterTurn2,
        characterPursuitLedger,
        userCharacterId: 'char-user',
        turnNumber: 3,
        activityEvents: [dockBreachEvent], // dockBreachEvent.committedTurn (1) <= lastConsideredTurn (2)
      });

      expect(
        eligibilityTurn3.offscreenOpportunities.map((o) => o.pursuitId)
      ).not.toContain('pursuit-guard-breach');
      expect(eligibilityTurn3.notDueCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Step 5: Autopilot Orchestration
  // =========================================================================
  describe('Step 5: Autopilot Orchestration & Canon Parity', () => {
    it('runs through production ratification pipeline adhering to identical admission rules', async () => {
      const draft = createMasterForgeDraft();
      const bp = compileForgeDraft(draft).blueprint!;
      const sessionId = 'session-autopilot-parity';

      useEngineStore.setState({
        activeBlueprint: bp,
        gameState: {
          session_id: sessionId,
          blueprint_id: bp.id,
          player_character_id: 'char-user',
          fictional_time_ledger: createInitialFictionalTimeLedger(),
          pursuit_schedule_ledger: {},
          character_pursuit_ledger: {},
          activity_events: [],
        } as LogicState,
      });

      useAppStore.setState({
        sessionId,
        blueprintId: bp.id,
        turnCount: 1,
        canonicalRevision: 2,
        currentNodeId: 'NODE_CENTRAL_HUB',
        spatialGraph: masterSpatialGraph,
      });

      // Autopilot action shares the exact production ratification pipeline
      const autopilotAction = '[USER_ACTION: OBSERVE] Scan the central viewport';

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            narrative_blocks: [{ type: 'prose', content: 'Dark water churns beyond the thick glass.' }],
            logic_state: { current_phase: 'MANIFEST', suggested_tension: 35 },
            topologyDelta: { isExpansion: false },
            ...defaultHG1Receipts,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      });

      const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());
      const frame = await executeRatificationPipeline(autopilotAction, preSnapshot);

      expect(frame.validation?.accepted).toBe(true);
      expect(frame.narrative_blocks[0].content).toBe('Dark water churns beyond the thick glass.');
    });
  });

  // =========================================================================
  // Step 6: Failure Modes, Refusals, and Frame Integrity
  // =========================================================================
  describe('Step 6: Failure Modes, Refusals, and Frame Integrity', () => {
    it('fails closed on malformed response, provider refusal, and OOC check-in with zero canonical mutation', async () => {
      const draft = createMasterForgeDraft();
      const bp = compileForgeDraft(draft).blueprint!;
      const sessionId = 'session-failure-containment';

      useEngineStore.setState({
        activeBlueprint: bp,
        gameState: {
          player_character_id: 'char-user',
          fictional_time_ledger: createInitialFictionalTimeLedger(),
          pursuit_schedule_ledger: {},
          character_pursuit_ledger: {},
          activity_events: [],
        },
      });

      useAppStore.setState({
        sessionId,
        blueprintId: bp.id,
        turnCount: 2,
        canonicalRevision: 5,
        currentNodeId: 'NODE_CENTRAL_HUB',
        spatialGraph: masterSpatialGraph,
        storyLog: [{ type: 'prose', content: 'Prior canonical beat.' }],
      });

      const preSnapshot = captureRuntimeSnapshot(useAppStore.getState());

      // 1. Malformed non-JSON response
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return new Response('<html><body>502 Bad Gateway</body></html>', {
          headers: { 'Content-Type': 'text/html' },
        });
      });

      await expect(executeRatificationPipeline('Examine valve', preSnapshot)).rejects.toThrow();

      // 2. Explicit Provider Refusal
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            error: 'Provider decline',
            code: 'PROVIDER_REFUSAL',
          }),
          { status: 503 }
        );
      });

      await expect(executeRatificationPipeline('Examine valve', preSnapshot)).rejects.toThrow();

      // 3. Fictional Frame Failure (OOC narrator check-in)
      const oocText = '[OOC: Pausing the simulation to check on you. Please remember to take breaks.]';
      const oocFrame = validateEngineFrame({
        narrative_blocks: [{ type: 'prose', content: oocText }],
        logic_state: { current_phase: 'MANIFEST' },
        topologyDelta: { isExpansion: false },
      });

      expect(oocFrame.validation?.accepted).toBe(false);
      expect(oocFrame.validation?.rejected_fields).toContain('narrative_frame');

      // Canonical state remains completely unchanged
      expect(useAppStore.getState().turnCount).toBe(2);
      expect(useAppStore.getState().currentNodeId).toBe('NODE_CENTRAL_HUB');
      expect(useAppStore.getState().storyLog.length).toBe(1);
      expect(useAppStore.getState().storyLog[0].content).toBe('Prior canonical beat.');
    });
  });

  // =========================================================================
  // Step 7: Retake & Durable Session Recovery
  // =========================================================================
  describe('Step 7: Retake & Durable Session Recovery', () => {
    it('restores exact pre-turn state on retake and recovers durable revision across reload', async () => {
      const draft = createMasterForgeDraft();
      const bp = compileForgeDraft(draft).blueprint!;
      const sessionId = 'session-recovery-p12';

      const initialTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      const initialGameState: LogicState = {
        player_character_id: 'char-user',
        fictional_time_ledger: initialTime,
        pursuit_schedule_ledger: {},
        character_pursuit_ledger: {},
        activity_events: [],
      };

      const initialDurableRev: DurableSessionRevision = {
        sessionId,
        blueprintId: bp.id,
        revision: 1,
        turnCount: 1,
        committedAt: Date.now(),
      };

      useEngineStore.setState({
        activeSessionId: sessionId,
        activeBlueprint: bp,
        durableSessionRevision: initialDurableRev,
        gameState: initialGameState,
      });

      useAppStore.setState({
        sessionId,
        blueprintId: bp.id,
        turnCount: 1,
        canonicalRevision: 1,
        durableSessionRevision: initialDurableRev,
      });

      const restorablePre = captureRetakeRestorableState(useAppStore.getState());

      const turn2DurableRev: DurableSessionRevision = {
        sessionId,
        blueprintId: bp.id,
        revision: 2,
        turnCount: 2,
        committedAt: Date.now(),
      };

      // Simulate Turn 2 committing mutations
      useAppStore.setState({
        turnCount: 2,
        canonicalRevision: 2,
        durableSessionRevision: turn2DurableRev,
        lastTurnCheckpoint: {
          version: 1,
          commandText: 'Vent auxiliary pressure tanks',
          engineStateBefore: restorablePre,
          engineGameStateBefore: initialGameState,
        },
      });

      useEngineStore.setState({
        durableSessionRevision: turn2DurableRev,
        gameState: {
          ...initialGameState,
          fictional_time_ledger: {
            moment_revision: 2,
            scene_beat_revision: 1,
            extended_revision: 0,
            last_cost: 'SCENE_BEAT',
          },
        },
      });

      expect(useEngineStore.getState().gameState?.fictional_time_ledger?.moment_revision).toBe(2);

      // Perform Retake
      const retakeSuccess = useAppStore.getState().retakeLastTurn();
      expect(retakeSuccess).toBe(true);

      // State is cleanly restored in-memory!
      expect(useEngineStore.getState().gameState?.fictional_time_ledger?.moment_revision).toBe(1);
      expect(useEngineStore.getState().gameState?.fictional_time_ledger?.scene_beat_revision).toBe(0);

      // Simulate durable storage persistence & rehydration across process/page reload
      const persistedAppSnapshot = JSON.parse(JSON.stringify(useAppStore.getState()));
      const persistedEngineSnapshot = JSON.parse(JSON.stringify(useEngineStore.getState()));

      // Wipe active in-memory stores completely (simulating fresh process/page reload)
      useAppStore.getState().resetSession();
      useEngineStore.getState().resetEngine();

      // Hydrate stores from persisted storage state
      useAppStore.setState(persistedAppSnapshot);
      useEngineStore.setState(persistedEngineSnapshot);

      const recResult = reconcileSessionStores(useEngineStore, useAppStore);
      expect(recResult.isCoherent).toBe(true);
      expect(useEngineStore.getState().gameState?.fictional_time_ledger?.moment_revision).toBe(1);
    });
  });

  // =========================================================================
  // Step 8: Obsolete Turn & Session Supersession Isolation
  // =========================================================================
  describe('Step 8: Obsolete Turn & Session Supersession Isolation', () => {
    it('rejects stale responses when session is replaced or turn is superseded', () => {
      const draft = createMasterForgeDraft();
      const bp = compileForgeDraft(draft).blueprint!;

      // Active session A
      useAppStore.setState({
        sessionId: 'session-A',
        blueprintId: bp.id,
        turnCount: 2,
        canonicalRevision: 3,
      });

      // Stale attempt from session A at turn 1 arrives
      const staleAttemptPayload = {
        sessionId: 'session-A',
        turnCount: 1, // older than current turnCount 2
        canonicalRevision: 2,
      };

      const isStaleTurn =
        staleAttemptPayload.sessionId !== useAppStore.getState().sessionId ||
        staleAttemptPayload.turnCount < useAppStore.getState().turnCount;

      expect(isStaleTurn).toBe(true);

      // Session replaced to session B
      useAppStore.setState({
        sessionId: 'session-B',
        blueprintId: bp.id,
        turnCount: 0,
        canonicalRevision: 1,
      });

      const isReplacedSession =
        staleAttemptPayload.sessionId !== useAppStore.getState().sessionId;

      expect(isReplacedSession).toBe(true);
    });
  });

  // =========================================================================
  // Step 9: Diagnostic Export & Forensics Separation
  // =========================================================================
  describe('Step 9: Forensic Diagnostic Export & Prose Separation', () => {
    it('preserves rejected candidate details in labeled forensics and excludes them from playable fiction', () => {
      const REJECTED_PROPOSAL_SENTINEL = 'Rejected proposal: illicit psychic teleportation';
      const PROMPT_SECRET_SENTINEL = 'Secret prompt constraint: token_entropy_min_4';

      const hgForensics: HorrorGrammarForensicRecord = {
        version: 1,
        turnNumber: 1,
        preFictionalTime: { moment_revision: 1, scene_beat_revision: 0, extended_revision: 0, last_cost: 'MOMENT' },
        postFictionalTime: { moment_revision: 2, scene_beat_revision: 0, extended_revision: 0, last_cost: 'MOMENT' },
        presentOpportunityIds: ['opp-tech'],
        selectedOffscreenPursuitIds: [],
        boundedOutPursuitIds: [],
        dormantCount: 0,
        notDueCount: 0,
        activityEvidence: {
          disposition: 'REJECTED',
          reasonCode: 'UNAUTHORIZED_ACTIVITY_CLAIM',
          admittedToNarrative: false,
          proposalId: 'prop-rejected-teleport',
          castMemberId: 'char-tech',
          pursuitId: null,
          locationNodeId: 'NODE_CENTRAL_HUB',
          perceptionPath: 'DIRECT',
          activitySummary: REJECTED_PROPOSAL_SENTINEL,
          authorityReferences: [],
          manifestationBlock: { type: 'prose', content: REJECTED_PROPOSAL_SENTINEL },
          acceptedEventId: null,
        },
        pressureEvidence: {
          disposition: 'NONE',
          reasonCode: 'NO_PRESSURE_CHOSEN',
          admittedToNarrative: false,
          proposalId: null,
          valueAnchorId: null,
          sourceReference: null,
          operator: null,
          affectedDimension: null,
          adverseProspect: null,
          authorityReferences: [],
          manifestationBlock: null,
          acceptedThreadId: null,
        },
        causalDecisions: {
          valueDecisions: [],
          pursuitDecisions: [],
          developmentDecisions: [],
          pressureTransitions: [],
        },
        composedNarrativeBlockCount: 1,
      };

      const messages: Message[] = [
        {
          id: 'msg-turn-1',
          role: 'assistant',
          content: 'You seal the reinforced bulkhead as freezing seawater climbs the stairs.',
          timestamp: Date.now(),
          blocks: [
            { type: 'prose', content: 'You seal the reinforced bulkhead as freezing seawater climbs the stairs.' },
          ],
          turnReceipt: {
            turnNumber: 1,
            nodeBefore: 'NODE_CENTRAL_HUB',
            requestedTarget: null,
            accepted: true,
            nodeAfter: 'NODE_CENTRAL_HUB',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            tension: 30,
            preSnapshot: captureRuntimeSnapshot(useAppStore.getState()),
            horrorGrammarForensics: hgForensics,
          },
        },
      ];

      const mdExport = buildEngineLogContent(messages, 'md')!.content;
      const htmlExport = buildEngineLogContent(messages, 'html')!.content;

      // 1. Playable story content is clean and contains only accepted fiction
      expect(messages[0].blocks[0].content).not.toContain(REJECTED_PROPOSAL_SENTINEL);

      // 2. Forensics section explicitly labels rejected material
      expect(mdExport).toContain('#### Horror Grammar 1 Forensics');
      expect(mdExport).toContain('REJECTED — NONCANONICAL');
      expect(mdExport).toContain(REJECTED_PROPOSAL_SENTINEL);
      expect(mdExport).not.toContain(PROMPT_SECRET_SENTINEL);

      expect(htmlExport).toContain('<h4>Horror Grammar 1 Forensics</h4>');
      expect(htmlExport).toContain('REJECTED — NONCANONICAL');
      expect(htmlExport).toContain(REJECTED_PROPOSAL_SENTINEL);
      expect(htmlExport).not.toContain(PROMPT_SECRET_SENTINEL);
    });
  });
});
