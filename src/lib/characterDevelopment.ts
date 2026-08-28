import {
  CharacterDevelopmentLedger,
  CharacterDevelopmentFact,
  CharacterDevelopmentProposal,
  CharacterDevelopmentReceipt,
} from '../types/horrorGrammar';
import { isHorrorGrammarCauseReferenceValid } from './horrorGrammarCauseReferences';

export function createInitialCharacterDevelopmentLedger(): CharacterDevelopmentLedger {
  return {};
}

export interface ResolveCharacterDevelopmentInput {
  proposal?: CharacterDevelopmentProposal | null;
  preState?: CharacterDevelopmentLedger | null;
  currentTurn: number;
  userCharacterId?: string | null;
  validCauses: readonly string[];
}

export const MAX_DEVELOPMENT_FACTS_PER_CHARACTER = 6;

export function resolveCharacterDevelopment({
  proposal,
  preState = {},
  currentTurn,
  userCharacterId,
  validCauses,
}: ResolveCharacterDevelopmentInput): CharacterDevelopmentReceipt {
  const normalizedPreState: CharacterDevelopmentLedger = {};
  for (const [cId, facts] of Object.entries(preState || {})) {
    normalizedPreState[cId] = Array.isArray(facts) ? [...facts] : [];
  }

  const postState: CharacterDevelopmentLedger = {};
  for (const [cId, facts] of Object.entries(normalizedPreState)) {
    postState[cId] = [...facts];
  }

  const decisions: CharacterDevelopmentReceipt['decisions'] = [];

  const changes = proposal?.changes || [];
  if (changes.length === 0) {
    return {
      version: 1,
      preState: normalizedPreState,
      postState: normalizedPreState,
      decisions: [],
    };
  }

  for (const change of changes.slice(0, 2)) {
    const {
      castMemberId,
      operation,
      targetFactId,
      dimension,
      statement,
      causeReference,
    } = change;

    // 1. Strict User character protection
    if (castMemberId === userCharacterId) {
      decisions.push({
        factId: targetFactId || null,
        castMemberId,
        operation,
        outcome: 'REJECTED',
        reasonCode: 'USER_CHARACTER_DEVELOPMENT_FORBIDDEN',
        causeReference,
      });
      continue;
    }

    // 2. Validate cause reference
    const isCauseValid = isHorrorGrammarCauseReferenceValid(
      causeReference,
      validCauses
    );

    if (!isCauseValid) {
      decisions.push({
        factId: targetFactId || null,
        castMemberId,
        operation,
        outcome: 'REJECTED',
        reasonCode: 'UNSUPPORTED_CAUSE_REFERENCE',
        causeReference,
      });
      continue;
    }

    const charFacts = postState[castMemberId] ? [...postState[castMemberId]] : [];

    if (operation === 'ESTABLISH') {
      const activeFacts = charFacts.filter((f) => f.lifecycle === 'ACTIVE');
      if (activeFacts.length >= MAX_DEVELOPMENT_FACTS_PER_CHARACTER) {
        decisions.push({
          factId: null,
          castMemberId,
          operation,
          outcome: 'REJECTED',
          reasonCode: 'MAX_FACTS_PER_CHARACTER_REACHED',
          causeReference,
        });
        continue;
      }

      const newFactId = `dev-${castMemberId}-${currentTurn}-${charFacts.length + 1}`;
      const newFact: CharacterDevelopmentFact = {
        id: newFactId,
        castMemberId,
        dimension,
        statement: statement.trim(),
        lifecycle: 'ACTIVE',
        establishedTurn: currentTurn,
        lastChangedTurn: currentTurn,
        causeReference,
      };

      charFacts.push(newFact);
      postState[castMemberId] = charFacts;

      decisions.push({
        factId: newFactId,
        castMemberId,
        operation,
        outcome: 'APPLIED',
        reasonCode: 'DEVELOPMENT_FACT_ESTABLISHED',
        causeReference,
      });
    } else if (operation === 'REVISE') {
      const targetIndex = charFacts.findIndex((f) => f.id === targetFactId);
      if (targetIndex < 0) {
        decisions.push({
          factId: targetFactId || null,
          castMemberId,
          operation,
          outcome: 'REJECTED',
          reasonCode: 'TARGET_FACT_NOT_FOUND',
          causeReference,
        });
        continue;
      }

      // Mark target superseded
      charFacts[targetIndex] = {
        ...charFacts[targetIndex],
        lifecycle: 'SUPERSEDED',
        lastChangedTurn: currentTurn,
      };

      // Create replacement fact
      const newFactId = `dev-${castMemberId}-${currentTurn}-${charFacts.length + 1}`;
      const revisedFact: CharacterDevelopmentFact = {
        id: newFactId,
        castMemberId,
        dimension,
        statement: statement.trim(),
        lifecycle: 'ACTIVE',
        establishedTurn: currentTurn,
        lastChangedTurn: currentTurn,
        causeReference,
      };

      charFacts.push(revisedFact);
      postState[castMemberId] = charFacts;

      decisions.push({
        factId: newFactId,
        castMemberId,
        operation,
        outcome: 'APPLIED',
        reasonCode: 'DEVELOPMENT_FACT_REVISED',
        causeReference,
      });
    } else if (operation === 'RETIRE') {
      const targetIndex = charFacts.findIndex((f) => f.id === targetFactId);
      if (targetIndex < 0) {
        decisions.push({
          factId: targetFactId || null,
          castMemberId,
          operation,
          outcome: 'REJECTED',
          reasonCode: 'TARGET_FACT_NOT_FOUND',
          causeReference,
        });
        continue;
      }

      charFacts[targetIndex] = {
        ...charFacts[targetIndex],
        lifecycle: 'RETIRED',
        lastChangedTurn: currentTurn,
      };

      postState[castMemberId] = charFacts;

      decisions.push({
        factId: targetFactId || null,
        castMemberId,
        operation,
        outcome: 'APPLIED',
        reasonCode: 'DEVELOPMENT_FACT_RETIRED',
        causeReference,
      });
    }
  }

  return {
    version: 1,
    preState: normalizedPreState,
    postState,
    decisions,
  };
}
