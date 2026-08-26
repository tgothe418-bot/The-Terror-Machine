import { Blueprint } from '../types';
import {
  ValueStateLedger,
  ValueStateRecord,
  ValueStateProposal,
  ValueStateReceipt,
  ValueCondition,
  ValueLifecycle,
} from '../types/horrorGrammar';

export function createInitialValueStateLedger(blueprint?: Blueprint | null): ValueStateLedger {
  const ledger: ValueStateLedger = {};
  const anchors = blueprint?.horrorGrammar?.valueAnchors || [];

  for (const anchor of anchors) {
    ledger[anchor.id] = {
      anchorId: anchor.id,
      lifecycle: 'ACTIVE',
      condition: 'ESTABLISHED',
      currentFormNote: null,
      lastCauseReference: 'BASELINE',
      lastChangedTurn: 0,
    };
  }

  return ledger;
}

export interface ResolveValueStateInput {
  proposal?: ValueStateProposal | null;
  preState?: ValueStateLedger | null;
  currentTurn: number;
  blueprint?: Blueprint | null;
  userCharacterId?: string | null;
  validCauses?: string[];
}

export function resolveValueState({
  proposal,
  preState = {},
  currentTurn,
  blueprint,
  userCharacterId,
  validCauses = [],
}: ResolveValueStateInput): ValueStateReceipt {
  const normalizedPreState: ValueStateLedger = { ...(preState || {}) };
  const postState: ValueStateLedger = { ...normalizedPreState };
  const decisions: ValueStateReceipt['decisions'] = [];

  const changes = proposal?.changes || [];
  if (changes.length === 0) {
    return {
      version: 1,
      preState: normalizedPreState,
      postState: normalizedPreState,
      decisions: [],
    };
  }

  const blueprintAnchors = blueprint?.horrorGrammar?.valueAnchors || [];

  for (const change of changes.slice(0, 3)) {
    const {
      anchorId,
      operation,
      expectedBeforeCondition,
      expectedBeforeLifecycle,
      proposedCondition,
      proposedLifecycle = 'ACTIVE',
      proposedFormNote = null,
      causeReference,
    } = change;

    // 1. Check anchor existence
    const currentRecord = postState[anchorId];
    const blueprintAnchor = blueprintAnchors.find((a) => a.id === anchorId);

    if (!currentRecord && !blueprintAnchor) {
      decisions.push({
        anchorId,
        operation,
        outcome: 'REJECTED',
        reasonCode: 'VALUE_ANCHOR_NOT_FOUND',
        causeReference,
      });
      continue;
    }

    const effectiveRecord: ValueStateRecord = currentRecord || {
      anchorId,
      lifecycle: 'ACTIVE',
      condition: 'ESTABLISHED',
      currentFormNote: null,
      lastCauseReference: 'BASELINE',
      lastChangedTurn: 0,
    };

    // 2. User character protection: model cannot alter what user character values
    const isUserHeld =
      blueprintAnchor?.holder.kind === 'CHARACTER' &&
      blueprintAnchor.holder.castMemberId === userCharacterId;

    if (isUserHeld) {
      if (operation === 'REVISE' || operation === 'RETIRE' || operation === 'RESTORE') {
        decisions.push({
          anchorId,
          operation,
          outcome: 'REJECTED',
          reasonCode: 'USER_VALUE_SUBJECTIVITY_PROTECTED',
          causeReference,
        });
        continue;
      }
    }

    // 3. Validate expected before state
    if (expectedBeforeCondition && effectiveRecord.condition !== expectedBeforeCondition) {
      decisions.push({
        anchorId,
        operation,
        outcome: 'REJECTED',
        reasonCode: 'PRECONDITION_MISMATCH',
        causeReference,
      });
      continue;
    }

    if (expectedBeforeLifecycle && effectiveRecord.lifecycle !== expectedBeforeLifecycle) {
      decisions.push({
        anchorId,
        operation,
        outcome: 'REJECTED',
        reasonCode: 'PRE_LIFECYCLE_MISMATCH',
        causeReference,
      });
      continue;
    }

    // 4. Validate cause reference
    const isCauseValid =
      validCauses.length === 0 ||
      validCauses.includes(causeReference) ||
      causeReference === 'USER_ACTION' ||
      causeReference === 'ACTIVITY' ||
      causeReference.startsWith('act-') ||
      causeReference.startsWith('thr-') ||
      causeReference.startsWith('csq-');

    if (!isCauseValid) {
      decisions.push({
        anchorId,
        operation,
        outcome: 'REJECTED',
        reasonCode: 'UNSUPPORTED_CAUSE_REFERENCE',
        causeReference,
      });
      continue;
    }

    // 5. Apply validated transition
    let nextCondition: ValueCondition = effectiveRecord.condition;
    let nextLifecycle: ValueLifecycle = effectiveRecord.lifecycle;
    let nextFormNote = effectiveRecord.currentFormNote;

    if (operation === 'SET_CONDITION') {
      nextCondition = proposedCondition;
      nextLifecycle = proposedLifecycle || effectiveRecord.lifecycle;
    } else if (operation === 'REVISE') {
      nextCondition = proposedCondition;
      nextLifecycle = 'REVISED';
      nextFormNote = proposedFormNote || effectiveRecord.currentFormNote;
    } else if (operation === 'RETIRE') {
      nextLifecycle = 'RETIRED';
      nextCondition = proposedCondition || 'LOST';
    } else if (operation === 'RESTORE') {
      nextLifecycle = 'ACTIVE';
      nextCondition = proposedCondition || 'ESTABLISHED';
      nextFormNote = null;
    }

    postState[anchorId] = {
      anchorId,
      lifecycle: nextLifecycle,
      condition: nextCondition,
      currentFormNote: nextFormNote,
      lastCauseReference: causeReference,
      lastChangedTurn: currentTurn,
    };

    decisions.push({
      anchorId,
      operation,
      outcome: 'APPLIED',
      reasonCode: 'VALUE_STATE_TRANSITION_APPLIED',
      causeReference,
    });
  }

  return {
    version: 1,
    preState: normalizedPreState,
    postState,
    decisions,
  };
}
