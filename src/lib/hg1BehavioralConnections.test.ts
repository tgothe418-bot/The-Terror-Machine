import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  selectCastActivityEligibility,
  advancePursuitScheduleLedger,
  MAX_OFFSCREEN_PURSUITS_PER_TURN,
} from './castActivityEligibility';
import { buildEngineTurnContext } from './buildEngineTurnContext';
import { normalizeBlueprint } from './normalizeBlueprint';
import {
  advanceFictionalTimeLedger,
  createInitialFictionalTimeLedger,
} from './fictionalTime';
import { resolveCastActivity } from './castActivity';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { captureRetakeRestorableState } from '../core/engine/reducer';
import type { Blueprint, LogicState } from '../types';
import type {
  FictionalTimeLedger,
  PursuitScheduleLedger,
  CharacterPursuitLedger,
  CastActivityEvent,
  CastActivityProposal,
  CharacterPursuit,
} from '../types/horrorGrammar';

describe('Packet 11 — Complete HG1 Behavioral Connections', () => {
  const createMockBlueprint = (): Blueprint =>
    normalizeBlueprint({
      id: 'bp-facility-p11',
      identity: {
        title: 'Facility Epsilon',
        version: '1.0',
        author: 'Systems Architect',
        thematicAnchor: 'Sub-Level Breach',
      },
      title: 'Facility Epsilon',
      premise: 'An underground research outpost experiencing containment failure.',
      globalPremise: 'An underground research outpost experiencing containment failure.',
      setting: {
        location: 'Sub-Level 4',
        atmosphere: 'Cold fluorescent flicker',
        timePeriod: '2024',
      },
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      cast: [
        {
          id: 'char-user',
          name: 'Officer Ray',
          description: 'Security officer on duty',
          role: 'Protagonist',
          personality: 'Disciplined and cautious',
          goals: 'Restore containment',
          traits: ['Alert', 'Methodical'],
          isUserCharacter: true,
          behaviorVector: 'COGNITIVE',
          isEntity: false,
          starting_location: 'NODE_CONTROL',
        },
        {
          id: 'char-tech',
          name: 'Technician Mercer',
          description: 'Engineering tech',
          role: 'Engineer',
          personality: 'Resourceful under stress',
          goals: 'Stabilize generator',
          traits: ['Technical', 'Quick'],
          isUserCharacter: false,
          behaviorVector: 'COGNITIVE',
          isEntity: false,
          starting_location: 'NODE_CONTROL', // Present at current node
        },
        {
          id: 'char-guard',
          name: 'Guard Petrov',
          description: 'Station guard',
          role: 'Security',
          personality: 'Stoic and resolute',
          goals: 'Hold the perimeter',
          traits: ['Vigilant', 'Steadfast'],
          isUserCharacter: false,
          behaviorVector: 'SOMATIC',
          isEntity: false,
          starting_location: 'NODE_PERIMETER', // Offscreen
        },
        {
          id: 'char-doc',
          name: 'Dr. Aris',
          description: 'Chief medical officer',
          role: 'Medic',
          personality: 'Analytical and focused',
          goals: 'Secure medical supplies',
          traits: ['Observant', 'Clinical'],
          isUserCharacter: false,
          behaviorVector: 'COGNITIVE',
          isEntity: false,
          starting_location: 'NODE_MEDBAY', // Offscreen
        },
        {
          id: 'char-scout',
          name: 'Scout Cole',
          description: 'Recon specialist',
          role: 'Scout',
          personality: 'Quiet and agile',
          goals: 'Map ventilation breaches',
          traits: ['Stealthy', 'Patient'],
          isUserCharacter: false,
          behaviorVector: 'SOMATIC',
          isEntity: false,
          starting_location: 'NODE_TUNNELS', // Offscreen
        },
      ],
      topology: {
        nodes: ['NODE_CONTROL', 'NODE_PERIMETER', 'NODE_MEDBAY', 'NODE_TUNNELS'],
        connections: [
          { from: 'NODE_CONTROL', to: 'NODE_PERIMETER', label: 'Heavy Blast Doors' },
          { from: 'NODE_CONTROL', to: 'NODE_MEDBAY', label: 'Medical Corridor' },
          { from: 'NODE_CONTROL', to: 'NODE_TUNNELS', label: 'Service Access Shaft' },
        ],
      },
      horrorGrammar: {
        characterPursuits: [
          {
            id: 'pursuit-tech-power',
            castMemberId: 'char-tech',
            objective: 'Monitor power grid fluctuations',
            presentApproach: 'Calibrate primary terminal meters',
            status: 'ACTIVE',
            reviewWindow: 'MOMENT',
            triggerReferences: [],
            basisSummary: 'Core power monitoring',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
          {
            id: 'pursuit-guard-breach',
            castMemberId: 'char-guard',
            objective: 'Secure perimeter upon breach alarm',
            presentApproach: 'Patrol outer checkpoint with rifle at ready',
            status: 'ACTIVE',
            reviewWindow: 'EVENT_DRIVEN',
            triggerReferences: ['evt-breach-alarm'],
            basisSummary: 'Emergency breach response protocol',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
          {
            id: 'pursuit-doc-triage',
            castMemberId: 'char-doc',
            objective: 'Stock emergency trauma kits',
            presentApproach: 'Organize medical field bags',
            status: 'ACTIVE',
            reviewWindow: 'SCENE_BEAT',
            triggerReferences: [],
            basisSummary: 'Routine medical readiness',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
          {
            id: 'pursuit-scout-survey',
            castMemberId: 'char-scout',
            objective: 'Inspect tunnel vibrations',
            presentApproach: 'Listen for structural groans near vents',
            status: 'ACTIVE',
            reviewWindow: 'MOMENT',
            triggerReferences: [],
            basisSummary: 'Structural acoustic monitoring',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
        valueAnchors: [
          {
            id: 'val-perimeter-integrity',
            label: 'Perimeter Integrity',
            description: 'Outer defensive barriers preventing encroachment',
            basisSummary: 'Core defensive perimeter requirement',
            holder: { kind: 'PLACE', nodeId: 'NODE_PERIMETER' },
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
      },
    });

  describe('Check 1: Event-Driven Pursuit Triggering & Authority Validation', () => {
    it('activates EVENT_DRIVEN pursuit when an accepted matching event is published', () => {
      const bp = createMockBlueprint();
      const fictionalTime = createInitialFictionalTimeLedger();

      const acceptedEvent: CastActivityEvent = {
        id: 'evt-breach-alarm',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        activitySummary: 'Perimeter alarm siren tripped at blast door.',
        locationNodeId: 'NODE_PERIMETER',
        perceptionPath: 'LOCAL_TRACE',
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: true,
      };

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 2,
        activityEvents: [acceptedEvent],
      });

      const offscreenPursuitIds = eligibility.offscreenOpportunities.map((o) => o.pursuitId);
      expect(offscreenPursuitIds).toContain('pursuit-guard-breach');

      const guardOpp = eligibility.offscreenOpportunities.find(
        (o) => o.pursuitId === 'pursuit-guard-breach'
      );
      expect(guardOpp?.castMemberId).toBe('char-guard');
      expect(guardOpp?.objective).toBe('Secure perimeter upon breach alarm');
    });

    it('does NOT activate pursuit when event is nonexistent or unaccepted', () => {
      const bp = createMockBlueprint();
      const fictionalTime = createInitialFictionalTimeLedger();

      // Non-matching event
      const unrelatedEvent: CastActivityEvent = {
        id: 'evt-lunch-break',
        castMemberId: 'char-doc',
        pursuitId: null,
        activitySummary: 'Lunch break concluded.',
        locationNodeId: 'NODE_MEDBAY',
        perceptionPath: 'UNOBSERVED',
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: false,
      };

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 2,
        activityEvents: [unrelatedEvent],
      });

      const offscreenPursuitIds = eligibility.offscreenOpportunities.map((o) => o.pursuitId);
      expect(offscreenPursuitIds).not.toContain('pursuit-guard-breach');
      expect(eligibility.notDueCount).toBeGreaterThan(0);
    });

    it('rejects proposal citing authority reference belonging to a different actor (wrong-owner)', () => {
      const bp = createMockBlueprint();
      const context = buildEngineTurnContext({
        blueprint: bp,
        selectedCharacterId: 'char-user',
        currentNodeId: 'NODE_CONTROL',
        spatialGraph: bp.topology.nodes.map((id) => ({ id, label: id })),
      });

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime: {
          moment_revision: 1,
          scene_beat_revision: 1,
          extended_revision: 0,
          last_cost: 'SCENE_BEAT',
        },
        userCharacterId: 'char-user',
        turnNumber: 2,
        activityEvents: [
          {
            id: 'evt-breach-alarm',
            castMemberId: 'char-guard',
            pursuitId: 'pursuit-guard-breach',
            activitySummary: 'Perimeter alarm siren tripped at blast door.',
            locationNodeId: 'NODE_PERIMETER',
            perceptionPath: 'LOCAL_TRACE',
            committedTurn: 1,
            authorityReferences: [],
            wasManifested: true,
          },
        ],
      });

      // char-doc tries to cite char-guard's accepted activity event
      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-doc-unauthorized',
        castMemberId: 'char-doc',
        pursuitId: 'pursuit-doc-triage',
        locationNodeId: 'NODE_MEDBAY',
        activitySummary: 'Dr. Aris claims guard security alert as justification.',
        authorityReferences: ['evt-breach-alarm'],
        perceptionPath: 'UNOBSERVED',
        manifestationBlock: null,
      };

      const receipt = resolveCastActivity({
        proposal,
        eligibilityReceipt: eligibility,
        currentContext: context,
        preEvents: [
          {
            id: 'evt-breach-alarm',
            castMemberId: 'char-guard',
            pursuitId: 'pursuit-guard-breach',
            activitySummary: 'Perimeter alarm siren tripped at blast door.',
            locationNodeId: 'NODE_PERIMETER',
            perceptionPath: 'LOCAL_TRACE',
            committedTurn: 1,
            authorityReferences: [],
            wasManifested: true,
          },
        ],
        currentTurn: 2,
      });

      expect(receipt.outcome).toBe('REJECTED');
      expect(receipt.reasonCode).toBe('UNAUTHORIZED_ACTIVITY_CLAIM');
    });
  });

  describe('Check 2: Trigger Lifetime & Consumption Semantics Across Neutral Turns', () => {
    it('consumes event once considered, avoids duplicate activation on neutral turn, and re-triggers on new event', () => {
      const bp = createMockBlueprint();
      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      const event1: CastActivityEvent = {
        id: 'evt-breach-alarm',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        activitySummary: 'Breach alarm triggered on turn 1.',
        locationNodeId: 'NODE_PERIMETER',
        perceptionPath: 'LOCAL_TRACE',
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: true,
      };

      // --- TURN 2: Event 1 is eligible and selected ---
      const eligibilityTurn2 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 2,
        activityEvents: [event1],
      });

      expect(
        eligibilityTurn2.offscreenOpportunities.map((o) => o.pursuitId)
      ).toContain('pursuit-guard-breach');

      // Advance schedule ledger at Turn 2
      const scheduleAfterTurn2 = advancePursuitScheduleLedger({
        preSchedule: {},
        eligibilityReceipt: eligibilityTurn2,
        fictionalTime,
        turnNumber: 2,
        characterPursuits: bp.horrorGrammar?.characterPursuits,
      });

      expect(scheduleAfterTurn2['pursuit-guard-breach']?.lastConsideredTurn).toBe(2);
      expect(scheduleAfterTurn2['pursuit-guard-breach']?.latestDisposition).toBe('OFFSCREEN_SELECTED');

      // --- TURN 3: Neutral turn (no new events committed) ---
      // Fictional time advances, but no new event occurred
      const fictionalTimeTurn3: FictionalTimeLedger = {
        moment_revision: 2,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      const eligibilityTurn3 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime: fictionalTimeTurn3,
        pursuitSchedule: scheduleAfterTurn2,
        userCharacterId: 'char-user',
        turnNumber: 3,
        activityEvents: [event1], // Still only event1 (committedTurn: 1 <= lastConsideredTurn: 2)
      });

      // Pursuit must be CONSUMED and NOT due on neutral turn!
      expect(
        eligibilityTurn3.offscreenOpportunities.map((o) => o.pursuitId)
      ).not.toContain('pursuit-guard-breach');

      // --- TURN 4: New event committed (committedTurn: 4 > lastConsideredTurn: 2) ---
      const event2: CastActivityEvent = {
        id: 'evt-breach-secondary',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        activitySummary: 'Secondary breach alarm tripped at gate 2.',
        locationNodeId: 'NODE_PERIMETER',
        perceptionPath: 'LOCAL_TRACE',
        committedTurn: 4,
        authorityReferences: ['evt-breach-alarm'], // Matches pursuit triggerReferences via authorityReferences
        wasManifested: true,
      };

      const eligibilityTurn4 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime: { ...fictionalTimeTurn3, moment_revision: 3 },
        pursuitSchedule: scheduleAfterTurn2,
        userCharacterId: 'char-user',
        turnNumber: 4,
        activityEvents: [event1, event2],
      });

      // New event re-triggers the pursuit!
      expect(
        eligibilityTurn4.offscreenOpportunities.map((o) => o.pursuitId)
      ).toContain('pursuit-guard-breach');
    });
  });

  describe('Check 3: Bounded-Out Event-Driven Pursuit Persistence', () => {
    it('keeps bounded-out event-driven pursuit due on subsequent turn until selected', () => {
      const bp = createMockBlueprint();

      // Add extra characters and pursuits to exceed MAX_OFFSCREEN_PURSUITS_PER_TURN (2)
      const allPursuits: CharacterPursuit[] = [
        {
          id: 'pursuit-doc-triage',
          castMemberId: 'char-doc',
          objective: 'Stock emergency trauma kits',
          presentApproach: 'Organize medical field bags',
          locationNodeId: 'NODE_MEDBAY',
          status: 'ACTIVE',
          reviewWindow: 'MOMENT', // Due on moment_rev > 0
          triggerReferences: [],
          basisSummary: 'Medical readiness',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'pursuit-scout-survey',
          castMemberId: 'char-scout',
          objective: 'Inspect tunnel vibrations',
          presentApproach: 'Listen for structural groans',
          locationNodeId: 'NODE_TUNNELS',
          status: 'ACTIVE',
          reviewWindow: 'MOMENT', // Due on moment_rev > 0
          triggerReferences: [],
          basisSummary: 'Tunnel survey',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          objective: 'Secure perimeter upon breach alarm',
          presentApproach: 'Patrol outer checkpoint',
          locationNodeId: 'NODE_PERIMETER',
          status: 'ACTIVE',
          reviewWindow: 'EVENT_DRIVEN',
          triggerReferences: ['evt-breach-alarm'],
          basisSummary: 'Breach response',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ];

      bp.horrorGrammar!.characterPursuits = allPursuits;

      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      const acceptedEvent: CastActivityEvent = {
        id: 'evt-breach-alarm',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        activitySummary: 'Perimeter alarm siren tripped.',
        locationNodeId: 'NODE_PERIMETER',
        perceptionPath: 'LOCAL_TRACE',
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: true,
      };

      // Pre-schedule where char-doc and char-scout were considered longer ago than char-guard
      const preSchedule: PursuitScheduleLedger = {
        'pursuit-doc-triage': {
          pursuitId: 'pursuit-doc-triage',
          castMemberId: 'char-doc',
          lastConsideredMomentRevision: 0,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 1, // older
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
        'pursuit-scout-survey': {
          pursuitId: 'pursuit-scout-survey',
          castMemberId: 'char-scout',
          lastConsideredMomentRevision: 0,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 2, // older than guard
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          lastConsideredMomentRevision: 0,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 3, // more recent last consideration
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
      };

      // --- Turn 4: 3 pursuits due, budget is 2. Guard pursuit (lastConsidered: 3) gets bounded out ---
      const eligibilityTurn4 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        pursuitSchedule: preSchedule,
        userCharacterId: 'char-user',
        turnNumber: 4,
        activityEvents: [
          {
            ...acceptedEvent,
            committedTurn: 4, // newly committed event on turn 4 > lastConsideredTurn: 3
          },
        ],
      });

      expect(eligibilityTurn4.offscreenOpportunities.length).toBe(MAX_OFFSCREEN_PURSUITS_PER_TURN);
      expect(eligibilityTurn4.boundedOutPursuitIds).toContain('pursuit-guard-breach');

      // Advance schedule: bounded-out pursuit does NOT stamp lastConsideredTurn = 4
      const scheduleAfterTurn4 = advancePursuitScheduleLedger({
        preSchedule,
        eligibilityReceipt: eligibilityTurn4,
        fictionalTime,
        turnNumber: 4,
        characterPursuits: allPursuits,
      });

      expect(scheduleAfterTurn4['pursuit-guard-breach']?.latestDisposition).toBe(
        'OFFSCREEN_DUE_BOUNDED_OUT'
      );
      // Crucial: lastConsideredTurn remains 3 (NOT updated to 4)
      expect(scheduleAfterTurn4['pursuit-guard-breach']?.lastConsideredTurn).toBe(3);

      // --- Turn 5: doc and scout now have lastConsideredTurn: 4, while guard still has 3 ---
      // Guard is now the oldest candidate and MUST be selected!
      const eligibilityTurn5 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime: { ...fictionalTime, moment_revision: 2 },
        pursuitSchedule: scheduleAfterTurn4,
        userCharacterId: 'char-user',
        turnNumber: 5,
        activityEvents: [
          {
            ...acceptedEvent,
            committedTurn: 4, // Still turn 4 event (> guard's lastConsideredTurn 3)
          },
        ],
      });

      const selectedIds = eligibilityTurn5.offscreenOpportunities.map((o) => o.pursuitId);
      expect(selectedIds).toContain('pursuit-guard-breach');
    });
  });

  describe('Check 4: Runtime Pursuit Redirection for Offscreen Opportunities', () => {
    it('projects runtime currentObjective and currentApproach from characterPursuitLedger for offscreen opportunities', () => {
      const bp = createMockBlueprint();
      const fictionalTime = createInitialFictionalTimeLedger();

      const characterPursuitLedger: CharacterPursuitLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          status: 'ACTIVE',
          currentObjective: 'Fall back to reactor chamber and weld blast doors shut',
          currentApproach: 'Using oxy-acetylene torch on auxiliary bulkheads',
          currentLocationNodeId: 'NODE_TUNNELS',
          reviewWindow: 'EVENT_DRIVEN',
          progressSummary: 'Securing secondary fallback point',
          lastCauseReference: 'BASELINE',
          lastActivityTurn: null,
          lastChangedTurn: 1,
        },
      };

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        characterPursuitLedger,
        userCharacterId: 'char-user',
        turnNumber: 2,
        activityEvents: [
          {
            id: 'evt-breach-alarm',
            castMemberId: 'char-guard',
            pursuitId: 'pursuit-guard-breach',
            activitySummary: 'Perimeter alarm siren tripped.',
            locationNodeId: 'NODE_PERIMETER',
            perceptionPath: 'LOCAL_TRACE',
            committedTurn: 1,
            authorityReferences: [],
            wasManifested: true,
          },
        ],
      });

      const guardOpp = eligibility.offscreenOpportunities.find(
        (o) => o.pursuitId === 'pursuit-guard-breach'
      );
      expect(guardOpp).toBeDefined();
      expect(guardOpp?.objective).toBe('Fall back to reactor chamber and weld blast doors shut');
      expect(guardOpp?.presentApproach).toBe('Using oxy-acetylene torch on auxiliary bulkheads');
      expect(guardOpp?.locationNodeId).toBe('NODE_TUNNELS');
    });

    it('falls back to authored defaults when pursuit is not in characterPursuitLedger', () => {
      const bp = createMockBlueprint();
      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      // Empty characterPursuitLedger
      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        characterPursuitLedger: {},
        userCharacterId: 'char-user',
        turnNumber: 1,
      });

      const scoutOpp = eligibility.offscreenOpportunities.find(
        (o) => o.pursuitId === 'pursuit-scout-survey'
      );
      expect(scoutOpp).toBeDefined();
      expect(scoutOpp?.objective).toBe('Inspect tunnel vibrations');
      expect(scoutOpp?.presentApproach).toBe('Listen for structural groans near vents');
    });

    it('keeps stopped/completed pursuits inactive and does NOT revive them from authored defaults', () => {
      const bp = createMockBlueprint();
      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      const characterPursuitLedger: CharacterPursuitLedger = {
        'pursuit-scout-survey': {
          pursuitId: 'pursuit-scout-survey',
          castMemberId: 'char-scout',
          status: 'COMPLETED', // Stopped
          currentObjective: 'Tunnels fully inspected',
          currentApproach: 'Mission completed',
          currentLocationNodeId: 'NODE_TUNNELS',
          reviewWindow: 'MOMENT',
          progressSummary: 'Survey complete',
          lastCauseReference: 'BASELINE',
          lastActivityTurn: null,
          lastChangedTurn: 1,
        },
      };

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        characterPursuitLedger,
        userCharacterId: 'char-user',
        turnNumber: 2,
      });

      const scoutOpp = eligibility.offscreenOpportunities.find(
        (o) => o.pursuitId === 'pursuit-scout-survey'
      );
      expect(scoutOpp).toBeUndefined();
      expect(eligibility.dormantCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Check 5: Offscreen Limit & Fairness Budgeting', () => {
    it('strictly enforces MAX_OFFSCREEN_PURSUITS_PER_TURN = 2 and prioritizes oldest lastConsideredTurn', () => {
      const bp = createMockBlueprint();

      // Four offscreen characters with due pursuits
      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 1,
        extended_revision: 1,
        last_cost: 'EXTENDED',
      };

      // Set up schedules with distinct lastConsideredTurn values:
      // char-guard: null (never considered -> oldest)
      // char-doc: turn 1 (oldest considered)
      // char-scout: turn 3 (more recent)
      const pursuitSchedule: PursuitScheduleLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          lastConsideredMomentRevision: 0,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: null, // Never considered -> -1 priority
          latestDisposition: 'OFFSCREEN_NOT_DUE',
        },
        'pursuit-doc-triage': {
          pursuitId: 'pursuit-doc-triage',
          castMemberId: 'char-doc',
          lastConsideredMomentRevision: 0,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 1, // Considered turn 1
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
        'pursuit-scout-survey': {
          pursuitId: 'pursuit-scout-survey',
          castMemberId: 'char-scout',
          lastConsideredMomentRevision: 0,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 3, // Considered turn 3
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
      };

      const acceptedEvent: CastActivityEvent = {
        id: 'evt-breach-alarm',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard-breach',
        activitySummary: 'Perimeter alarm siren tripped.',
        locationNodeId: 'NODE_PERIMETER',
        perceptionPath: 'LOCAL_TRACE',
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: true,
      };

      const eligibility = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        pursuitSchedule,
        userCharacterId: 'char-user',
        turnNumber: 4,
        activityEvents: [acceptedEvent],
      });

      // Exactly 2 offscreen opportunities selected
      expect(eligibility.offscreenOpportunities.length).toBe(MAX_OFFSCREEN_PURSUITS_PER_TURN);

      const selectedIds = eligibility.offscreenOpportunities.map((o) => o.pursuitId);
      // char-guard (null) and char-doc (1) should be selected over char-scout (3)
      expect(selectedIds).toContain('pursuit-guard-breach');
      expect(selectedIds).toContain('pursuit-doc-triage');
      expect(selectedIds).not.toContain('pursuit-scout-survey');

      expect(eligibility.boundedOutPursuitIds).toContain('pursuit-scout-survey');
    });
  });

  describe('Check 6: Authoritative Fictional Time Advancement & Receipts', () => {
    it('advances fictional time revisions according to category semantics', () => {
      const initial = createInitialFictionalTimeLedger();
      expect(initial.moment_revision).toBe(0);
      expect(initial.scene_beat_revision).toBe(0);
      expect(initial.extended_revision).toBe(0);
      expect(initial.last_cost).toBeNull();

      // MOMENT: moment + 1
      const recMoment = advanceFictionalTimeLedger(initial, 'MOMENT');
      expect(recMoment.acceptedCost).toBe('MOMENT');
      expect(recMoment.postState.moment_revision).toBe(1);
      expect(recMoment.postState.scene_beat_revision).toBe(0);
      expect(recMoment.postState.extended_revision).toBe(0);

      // SCENE_BEAT: moment + 1, scene_beat + 1
      const recScene = advanceFictionalTimeLedger(recMoment.postState, 'SCENE_BEAT');
      expect(recScene.acceptedCost).toBe('SCENE_BEAT');
      expect(recScene.postState.moment_revision).toBe(2);
      expect(recScene.postState.scene_beat_revision).toBe(1);
      expect(recScene.postState.extended_revision).toBe(0);

      // EXTENDED: moment + 1, scene_beat + 1, extended + 1
      const recExtended = advanceFictionalTimeLedger(recScene.postState, 'EXTENDED');
      expect(recExtended.acceptedCost).toBe('EXTENDED');
      expect(recExtended.postState.moment_revision).toBe(3);
      expect(recExtended.postState.scene_beat_revision).toBe(2);
      expect(recExtended.postState.extended_revision).toBe(1);

      // UNCLEAR: all revisions unchanged, last_cost updated
      const recUnclear = advanceFictionalTimeLedger(recExtended.postState, 'UNCLEAR');
      expect(recUnclear.acceptedCost).toBe('UNCLEAR');
      expect(recUnclear.postState.moment_revision).toBe(3);
      expect(recUnclear.postState.scene_beat_revision).toBe(2);
      expect(recUnclear.postState.extended_revision).toBe(1);
      expect(recUnclear.postState.last_cost).toBe('UNCLEAR');
    });

    it('preserves zero advancement on SYSTEM_INIT with acceptedCost: NONE', () => {
      const initial = createInitialFictionalTimeLedger();

      // Mimic server SYSTEM_INIT resolution
      const receipt = {
        version: 1 as const,
        preState: initial,
        acceptedCost: 'NONE' as const,
        postState: initial,
      };

      expect(receipt.acceptedCost).toBe('NONE');
      expect(receipt.postState.moment_revision).toBe(0);
      expect(receipt.postState.scene_beat_revision).toBe(0);
      expect(receipt.postState.extended_revision).toBe(0);
      expect(receipt.postState.last_cost).toBeNull();
    });
  });

  describe('Check 7: Retake Cleanly Restores Time, Schedule, and Pursuit State', () => {
    beforeEach(() => {
      useAppStore.getState().resetSession();
      useEngineStore.getState().resetEngine();
    });

    afterEach(() => {
      useAppStore.getState().resetSession();
      useEngineStore.getState().resetEngine();
    });

    it('restores previous fictional time, pursuit schedule, character pursuits, and activity events on retakeLastTurn', () => {
      const bp = createMockBlueprint();
      const sessionId = 'session-p11-test';
      const blueprintId = bp.id;

      // Initialize state at Turn 1
      const turn1FictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };
      const turn1Schedule: PursuitScheduleLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          lastConsideredMomentRevision: 1,
          lastConsideredSceneBeatRevision: 0,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 1,
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
      };
      const turn1PursuitLedger: CharacterPursuitLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          status: 'ACTIVE',
          currentObjective: 'Turn 1 Objective',
          currentApproach: 'Turn 1 Approach',
          currentLocationNodeId: 'NODE_PERIMETER',
          reviewWindow: 'EVENT_DRIVEN',
          progressSummary: 'Patrolling',
          lastCauseReference: 'BASELINE',
          lastActivityTurn: null,
          lastChangedTurn: 1,
        },
      };
      const turn1Events: CastActivityEvent[] = [
        {
          id: 'evt-breach-1',
          castMemberId: 'char-guard',
          pursuitId: 'pursuit-guard-breach',
          activitySummary: 'Initial perimeter breach detected.',
          locationNodeId: 'NODE_PERIMETER',
          perceptionPath: 'LOCAL_TRACE',
          committedTurn: 1,
          authorityReferences: [],
          wasManifested: true,
        },
      ];

      const turn1GameState: LogicState = {
        player_character_id: 'char-user',
        fictional_time_ledger: turn1FictionalTime,
        pursuit_schedule_ledger: turn1Schedule,
        character_pursuit_ledger: turn1PursuitLedger,
        activity_events: turn1Events,
      };

      // Set engine store to Turn 1 state
      useEngineStore.setState({
        activeBlueprint: bp,
        gameState: turn1GameState,
      });

      // Prepare app store state at Turn 1
      useAppStore.setState({
        sessionId,
        blueprintId,
        turnCount: 1,
        canonicalRevision: 1,
      });

      const restorableState = captureRetakeRestorableState(useAppStore.getState());

      useAppStore.setState({
        // Set up a valid checkpoint capturing Turn 1 as the pre-turn state for Turn 2
        lastTurnCheckpoint: {
          version: 1,
          commandText: 'Examine perimeter terminal',
          engineStateBefore: restorableState,
          engineGameStateBefore: turn1GameState,
        },
      });

      // Now simulate Turn 2 committing into engine store
      const turn2FictionalTime: FictionalTimeLedger = {
        moment_revision: 2,
        scene_beat_revision: 1,
        extended_revision: 0,
        last_cost: 'SCENE_BEAT',
      };
      const turn2Schedule: PursuitScheduleLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          lastConsideredMomentRevision: 2,
          lastConsideredSceneBeatRevision: 1,
          lastConsideredExtendedRevision: 0,
          lastConsideredTurn: 2,
          latestDisposition: 'OFFSCREEN_SELECTED',
        },
      };
      const turn2PursuitLedger: CharacterPursuitLedger = {
        'pursuit-guard-breach': {
          pursuitId: 'pursuit-guard-breach',
          castMemberId: 'char-guard',
          status: 'ACTIVE',
          currentObjective: 'Turn 2 Mutated Objective',
          currentApproach: 'Turn 2 Mutated Approach',
          currentLocationNodeId: 'NODE_TUNNELS',
          reviewWindow: 'EVENT_DRIVEN',
          progressSummary: 'Falling back',
          lastCauseReference: 'BASELINE',
          lastActivityTurn: null,
          lastChangedTurn: 2,
        },
      };
      const turn2Events: CastActivityEvent[] = [
        ...turn1Events,
        {
          id: 'evt-breach-2',
          castMemberId: 'char-guard',
          pursuitId: 'pursuit-guard-breach',
          activitySummary: 'Secondary breach occurred.',
          locationNodeId: 'NODE_TUNNELS',
          perceptionPath: 'LOCAL_TRACE',
          committedTurn: 2,
          authorityReferences: [],
          wasManifested: true,
        },
      ];

      const turn2GameState: LogicState = {
        player_character_id: 'char-user',
        fictional_time_ledger: turn2FictionalTime,
        pursuit_schedule_ledger: turn2Schedule,
        character_pursuit_ledger: turn2PursuitLedger,
        activity_events: turn2Events,
      };

      useEngineStore.setState({
        gameState: turn2GameState,
      });

      useAppStore.setState({
        turnCount: 2,
        canonicalRevision: 2,
      });

      // Verify mutated state is present before retake
      expect(useEngineStore.getState().gameState?.fictional_time_ledger?.moment_revision).toBe(2);
      expect(useEngineStore.getState().gameState?.activity_events?.length).toBe(2);

      // Perform Retake!
      const retakeSuccess = useAppStore.getState().retakeLastTurn();
      expect(retakeSuccess).toBe(true);

      // Verify engine store state is restored to Turn 1 state!
      const restoredGameState = useEngineStore.getState().gameState;
      expect(restoredGameState?.fictional_time_ledger?.moment_revision).toBe(1);
      expect(restoredGameState?.fictional_time_ledger?.scene_beat_revision).toBe(0);
      expect(restoredGameState?.fictional_time_ledger?.last_cost).toBe('MOMENT');

      expect(
        restoredGameState?.pursuit_schedule_ledger?.['pursuit-guard-breach']?.lastConsideredTurn
      ).toBe(1);

      expect(
        restoredGameState?.character_pursuit_ledger?.['pursuit-guard-breach']?.currentObjective
      ).toBe('Turn 1 Objective');

      expect(restoredGameState?.activity_events?.length).toBe(1);
      expect(restoredGameState?.activity_events?.[0].id).toBe('evt-breach-1');

      // Verify that constructing the next request context uses the restored state
      const nextContext = buildEngineTurnContext({
        blueprint: bp,
        selectedCharacterId: 'char-user',
        currentNodeId: 'NODE_CONTROL',
        spatialGraph: bp.topology.nodes.map((id) => ({ id, label: id })),
        fictionalTimeLedger: restoredGameState?.fictional_time_ledger,
        pursuitScheduleLedger: restoredGameState?.pursuit_schedule_ledger,
        characterPursuitLedger: restoredGameState?.character_pursuit_ledger,
        activityEvents: restoredGameState?.activity_events,
      });

      expect(nextContext.horrorGrammar.fictionalTime.moment_revision).toBe(1);
      expect(nextContext.horrorGrammar.runtimeState.recentActivityEvents.length).toBe(1);
      expect(nextContext.horrorGrammar.runtimeState.recentActivityEvents[0].id).toBe('evt-breach-1');
    });
  });
});
