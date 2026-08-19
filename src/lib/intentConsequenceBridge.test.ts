import { describe, expect, it } from 'vitest';
import {
  createIntentBoundCastInteractionReceipt,
  getIntentBoundAddressedCharacterId,
  getIntentBoundRequestedTransition,
} from './intentConsequenceBridge';
import type { IntentReceipt } from '../types/engineContract';
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
});
