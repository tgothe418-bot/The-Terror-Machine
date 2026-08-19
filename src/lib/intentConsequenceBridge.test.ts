import { describe, expect, it } from 'vitest';
import {
  createIntentBoundCastInteractionReceipt,
  getIntentBoundAddressedCharacterId,
  getIntentBoundRequestedTransition,
  getIntentBoundTopologyDelta,
} from './intentConsequenceBridge';
import type { IntentReceipt, TopologyDelta } from '../types/engineContract';
import type { CastTargetResolution } from './causalFeasibility';

function createMockIntentReceipt(action_kind: IntentReceipt['action_kind']): IntentReceipt {
  return {
    version: 1,
    action_kind,
    action_subtype: null,
    pressure_direction: 'MAINTAIN',
    dramatic_tactic: 'NONE',
    intent_synergy: 'N/A',
  };
}

const mockProposedExpansion: TopologyDelta = {
  isExpansion: true,
  exitDirection: 'NORTH',
  newNodeDef: {
    id: 'EXPANDED_NODE_01',
    geometry: 'Subterranean Vault',
    hazards: ['toxic_fumes'],
    exitVectors: [
      {
        direction: 'SOUTH',
        targetNodeId: 'ORIGIN_NODE',
      },
    ],
  },
};

describe('intentConsequenceBridge', () => {
  describe('getIntentBoundRequestedTransition', () => {
    it('1. Only MOVE preserves a proposed transition', () => {
      const moveReceipt = createMockIntentReceipt('MOVE');
      expect(getIntentBoundRequestedTransition(moveReceipt, 'NODE_02')).toBe('NODE_02');
      expect(getIntentBoundRequestedTransition(moveReceipt, null)).toBeNull();
    });

    it('2. Every non-MOVE kind returns a null transition', () => {
      const nonMoveKinds: IntentReceipt['action_kind'][] = [
        'OBSERVE',
        'INVESTIGATE',
        'MANIPULATE',
        'COMMUNICATE',
        'WAIT',
        'SYSTEM',
        'OTHER',
      ];

      for (const kind of nonMoveKinds) {
        const receipt = createMockIntentReceipt(kind);
        expect(getIntentBoundRequestedTransition(receipt, 'NODE_02')).toBeNull();
        expect(getIntentBoundRequestedTransition(receipt, 'NODE_99')).toBeNull();
        expect(getIntentBoundRequestedTransition(receipt, null)).toBeNull();
      }
    });
  });

  describe('getIntentBoundAddressedCharacterId', () => {
    it('3. Only COMMUNICATE + PRESENT_ELIGIBLE returns an addressed ID', () => {
      const commReceipt = createMockIntentReceipt('COMMUNICATE');
      const presentEligibleTarget: CastTargetResolution = {
        status: 'PRESENT_ELIGIBLE',
        characterId: 'char-elena',
      };

      expect(
        getIntentBoundAddressedCharacterId(commReceipt, presentEligibleTarget)
      ).toBe('char-elena');

      const nonEligibleStatuses: CastTargetResolution[] = [
        { status: 'NONE', characterId: null },
        { status: 'AMBIGUOUS', characterId: null },
        { status: 'ABSENT', characterId: 'char-elena' },
        { status: 'INELIGIBLE', characterId: 'char-elena' },
      ];

      for (const target of nonEligibleStatuses) {
        expect(getIntentBoundAddressedCharacterId(commReceipt, target)).toBeNull();
      }
    });

    it('returns null for all non-COMMUNICATE action kinds even if castTarget is PRESENT_ELIGIBLE', () => {
      const nonCommKinds: IntentReceipt['action_kind'][] = [
        'OBSERVE',
        'INVESTIGATE',
        'MOVE',
        'MANIPULATE',
        'WAIT',
        'SYSTEM',
        'OTHER',
      ];

      const presentEligibleTarget: CastTargetResolution = {
        status: 'PRESENT_ELIGIBLE',
        characterId: 'char-elena',
      };

      for (const kind of nonCommKinds) {
        const receipt = createMockIntentReceipt(kind);
        expect(
          getIntentBoundAddressedCharacterId(receipt, presentEligibleTarget)
        ).toBeNull();
      }
    });
  });

  describe('createIntentBoundCastInteractionReceipt', () => {
    it('4. A pure MANIPULATE action naming an eligible cast member with no dialogue produces NONE, not ADDRESS_UNANSWERED', () => {
      const manipReceipt = createMockIntentReceipt('MANIPULATE');
      const presentEligibleTarget: CastTargetResolution = {
        status: 'PRESENT_ELIGIBLE',
        characterId: 'char-elena',
      };

      const receipt = createIntentBoundCastInteractionReceipt({
        intentReceipt: manipReceipt,
        castTarget: presentEligibleTarget,
        respondingCharacterId: null,
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: null,
        respondingCharacterId: null,
        outcome: 'NONE',
      });
    });

    it('5. Non-communication spontaneous dialogue produces UNSOLICITED_DIALOGUE', () => {
      const observeReceipt = createMockIntentReceipt('OBSERVE');
      const presentEligibleTarget: CastTargetResolution = {
        status: 'PRESENT_ELIGIBLE',
        characterId: 'char-elena',
      };

      const receipt = createIntentBoundCastInteractionReceipt({
        intentReceipt: observeReceipt,
        castTarget: presentEligibleTarget,
        respondingCharacterId: 'char-elena',
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: null,
        respondingCharacterId: 'char-elena',
        outcome: 'UNSOLICITED_DIALOGUE',
      });
    });

    it('6. Targeted communication covers responded, unanswered, and mismatch outcomes through existing builder', () => {
      const commReceipt = createMockIntentReceipt('COMMUNICATE');
      const presentEligibleTarget: CastTargetResolution = {
        status: 'PRESENT_ELIGIBLE',
        characterId: 'char-elena',
      };

      // Responded: addressed == responding
      const respondedReceipt = createIntentBoundCastInteractionReceipt({
        intentReceipt: commReceipt,
        castTarget: presentEligibleTarget,
        respondingCharacterId: 'char-elena',
      });
      expect(respondedReceipt).toEqual({
        version: 1,
        addressedCharacterId: 'char-elena',
        respondingCharacterId: 'char-elena',
        outcome: 'RESPONDED',
      });

      // Unanswered: addressed != null, responding == null
      const unansweredReceipt = createIntentBoundCastInteractionReceipt({
        intentReceipt: commReceipt,
        castTarget: presentEligibleTarget,
        respondingCharacterId: null,
      });
      expect(unansweredReceipt).toEqual({
        version: 1,
        addressedCharacterId: 'char-elena',
        respondingCharacterId: null,
        outcome: 'ADDRESS_UNANSWERED',
      });

      // Mismatch: addressed != null, responding != null && addressed != responding
      const mismatchReceipt = createIntentBoundCastInteractionReceipt({
        intentReceipt: commReceipt,
        castTarget: presentEligibleTarget,
        respondingCharacterId: 'char-jules',
      });
      expect(mismatchReceipt).toEqual({
        version: 1,
        addressedCharacterId: 'char-elena',
        respondingCharacterId: 'char-jules',
        outcome: 'MISMATCH',
      });
    });

    it('7. Inputs are not mutated', () => {
      const commReceipt = createMockIntentReceipt('COMMUNICATE');
      const commReceiptCopy = { ...commReceipt };
      const target: CastTargetResolution = {
        status: 'PRESENT_ELIGIBLE',
        characterId: 'char-elena',
      };
      const targetCopy = { ...target };

      createIntentBoundCastInteractionReceipt({
        intentReceipt: commReceipt,
        castTarget: target,
        respondingCharacterId: 'char-elena',
      });

      expect(commReceipt).toEqual(commReceiptCopy);
      expect(target).toEqual(targetCopy);
    });
  });

  describe('getIntentBoundTopologyDelta', () => {
    it('1. INVESTIGATE + isExpansionExpected: true + proposed expansion → expansion suppressed', () => {
      const receipt = createMockIntentReceipt('INVESTIGATE');
      const result = getIntentBoundTopologyDelta(receipt, mockProposedExpansion, true);
      expect(result).toEqual({ isExpansion: false, newNodeDef: null });
    });

    it('2. OBSERVE + isExpansionExpected: true + proposed expansion → expansion suppressed', () => {
      const receipt = createMockIntentReceipt('OBSERVE');
      const result = getIntentBoundTopologyDelta(receipt, mockProposedExpansion, true);
      expect(result).toEqual({ isExpansion: false, newNodeDef: null });
    });

    it('3. COMMUNICATE + isExpansionExpected: true + proposed expansion → expansion suppressed', () => {
      const receipt = createMockIntentReceipt('COMMUNICATE');
      const result = getIntentBoundTopologyDelta(receipt, mockProposedExpansion, true);
      expect(result).toEqual({ isExpansion: false, newNodeDef: null });
    });

    it('suppresses expansion for all other non-MOVE kinds even if isExpansionExpected is true and expansion is proposed', () => {
      const nonMoveKinds: IntentReceipt['action_kind'][] = [
        'MANIPULATE',
        'WAIT',
        'SYSTEM',
        'OTHER',
      ];

      for (const kind of nonMoveKinds) {
        const receipt = createMockIntentReceipt(kind);
        const result = getIntentBoundTopologyDelta(receipt, mockProposedExpansion, true);
        expect(result).toEqual({ isExpansion: false, newNodeDef: null });
      }
    });

    it('4. MOVE + isExpansionExpected: true + valid proposed expansion → expansion preserved', () => {
      const moveReceipt = createMockIntentReceipt('MOVE');
      const result = getIntentBoundTopologyDelta(moveReceipt, mockProposedExpansion, true);
      expect(result).toEqual(mockProposedExpansion);
      expect(result.isExpansion).toBe(true);
      expect(result.newNodeDef?.id).toBe('EXPANDED_NODE_01');
    });

    it('5. MOVE + isExpansionExpected: false + proposed expansion → expansion suppressed', () => {
      const moveReceipt = createMockIntentReceipt('MOVE');
      const result = getIntentBoundTopologyDelta(moveReceipt, mockProposedExpansion, false);
      expect(result).toEqual({ isExpansion: false, newNodeDef: null });
    });

    it('returns { isExpansion: false, newNodeDef: null } when proposedTopologyDelta is null, undefined, or not an expansion', () => {
      const moveReceipt = createMockIntentReceipt('MOVE');
      expect(getIntentBoundTopologyDelta(moveReceipt, null, true)).toEqual({
        isExpansion: false,
        newNodeDef: null,
      });
      expect(getIntentBoundTopologyDelta(moveReceipt, undefined, true)).toEqual({
        isExpansion: false,
        newNodeDef: null,
      });
      expect(
        getIntentBoundTopologyDelta(
          moveReceipt,
          { isExpansion: false, newNodeDef: null },
          true
        )
      ).toEqual({
        isExpansion: false,
        newNodeDef: null,
      });
    });

    it('7. Helper inputs are not mutated', () => {
      const moveReceipt = createMockIntentReceipt('MOVE');
      const moveReceiptCopy = JSON.parse(JSON.stringify(moveReceipt));
      const proposedDeltaCopy = JSON.parse(JSON.stringify(mockProposedExpansion));

      // Test preserving branch
      getIntentBoundTopologyDelta(moveReceipt, mockProposedExpansion, true);
      expect(moveReceipt).toEqual(moveReceiptCopy);
      expect(mockProposedExpansion).toEqual(proposedDeltaCopy);

      // Test suppressing branch
      const investReceipt = createMockIntentReceipt('INVESTIGATE');
      const investReceiptCopy = JSON.parse(JSON.stringify(investReceipt));
      getIntentBoundTopologyDelta(investReceipt, mockProposedExpansion, true);
      expect(investReceipt).toEqual(investReceiptCopy);
      expect(mockProposedExpansion).toEqual(proposedDeltaCopy);
    });
  });
});
