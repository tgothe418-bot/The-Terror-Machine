import {
  CharacterMemoryById,
  CharacterMemoryCandidate,
  CharacterMemoryDecision,
  CharacterMemoryEntry,
  CharacterMemoryProposal,
  CharacterMemoryReceipt,
  EngineTurnContext,
  IntentReceipt,
  NarrativeReconciliationReceipt,
  CastInteractionReceipt,
  MAX_MEMORIES_PER_CHARACTER,
  MAX_CHARACTER_MEMORY_FACT_LENGTH,
} from '../types';

export function normalizeCharacterMemoryFact(value: string): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function deriveCharacterMemoryId(characterId: string, normalizedFact: string): string {
  const trimmedId = typeof characterId === 'string' ? characterId.trim() : '';
  const cleanFact = normalizeCharacterMemoryFact(normalizedFact);
  const lowercaseFact = cleanFact.toLocaleLowerCase('en-US');
  const key = `${trimmedId}\u0000${lowercaseFact}`;
  const bytes = new TextEncoder().encode(key);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return `cm_${hex}`;
}

export function createCharacterMemoryState(
  input?: CharacterMemoryById | null
): CharacterMemoryById {
  const result: CharacterMemoryById = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return result;
  }

  const rawKeys = Object.keys(input);
  for (const rawKey of rawKeys) {
    if (typeof rawKey !== 'string') continue;
    const trimmedCharId = rawKey.trim();
    if (!trimmedCharId) continue;

    const rawList = (input as Record<string, unknown>)[rawKey];
    if (!Array.isArray(rawList)) continue;

    const validEntries: CharacterMemoryEntry[] = [];
    const seenFacts = new Set<string>();

    for (const rawEntry of rawList) {
      if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue;
      const entryObj = rawEntry as Record<string, unknown>;

      if (typeof entryObj.fact !== 'string') continue;
      const normalizedFact = normalizeCharacterMemoryFact(entryObj.fact);
      if (!normalizedFact || normalizedFact.length > MAX_CHARACTER_MEMORY_FACT_LENGTH) continue;

      if (entryObj.source !== 'OBSERVED' && entryObj.source !== 'TOLD') continue;
      if (entryObj.certainty !== 'KNOWN' && entryObj.certainty !== 'BELIEVED') continue;

      if (
        typeof entryObj.acquired_turn !== 'number' ||
        !Number.isInteger(entryObj.acquired_turn) ||
        entryObj.acquired_turn < 0
      ) {
        continue;
      }

      const factIdentity = normalizedFact.toLocaleLowerCase('en-US');
      if (seenFacts.has(factIdentity)) continue;
      if (validEntries.length >= MAX_MEMORIES_PER_CHARACTER) break;

      seenFacts.add(factIdentity);
      const derivedId = deriveCharacterMemoryId(trimmedCharId, normalizedFact);
      validEntries.push({
        id: derivedId,
        fact: normalizedFact,
        source: entryObj.source,
        certainty: entryObj.certainty,
        acquired_turn: entryObj.acquired_turn,
      });
    }

    validEntries.sort((a, b) => {
      if (a.acquired_turn !== b.acquired_turn) {
        return a.acquired_turn - b.acquired_turn;
      }
      return a.id.localeCompare(b.id);
    });

    result[trimmedCharId] = validEntries;
  }

  const orderedResult: CharacterMemoryById = {};
  for (const key of Object.keys(result).sort()) {
    orderedResult[key] = result[key];
  }

  return orderedResult;
}

export function resolveCharacterMemory(input: {
  proposal: CharacterMemoryProposal;
  currentState: CharacterMemoryById;
  currentTurn: number;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  reconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): CharacterMemoryReceipt {
  const normalizedCurrentTurn =
    typeof input.currentTurn === 'number' && Number.isFinite(input.currentTurn)
      ? Math.max(0, Math.floor(input.currentTurn))
      : 0;

  const preState = createCharacterMemoryState(input.currentState);
  const workingState: Record<string, CharacterMemoryEntry[]> = {};
  for (const [key, entries] of Object.entries(preState)) {
    workingState[key] = entries.map((e) => ({ ...e }));
  }

  const decisions: CharacterMemoryDecision[] = [];
  const candidates = Array.isArray(input.proposal?.candidates)
    ? input.proposal.candidates
    : [];

  const PERMITTED_ACTIONS = ['OBSERVE', 'INVESTIGATE', 'COMMUNICATE', 'MOVE', 'MANIPULATE'];

  for (const rawCandidate of candidates) {
    const rawCharId =
      typeof rawCandidate?.character_id === 'string' ? rawCandidate.character_id.trim() : '';
    const rawFact = typeof rawCandidate?.fact === 'string' ? rawCandidate.fact : '';
    const normalizedFact = normalizeCharacterMemoryFact(rawFact);
    const rationale =
      typeof rawCandidate?.rationale === 'string' ? rawCandidate.rationale.trim() : '';

    const candidate: CharacterMemoryCandidate = {
      character_id: rawCharId,
      fact: normalizedFact,
      source: rawCandidate?.source,
      certainty: rawCandidate?.certainty,
      rationale,
    };

    let outcome: CharacterMemoryDecision['outcome'];
    let reason: CharacterMemoryDecision['reason'];
    let entry: CharacterMemoryEntry | null = null;

    // 1. RECONCILIATION_SUPPRESSED for NOT_REQUIRED, EXPERIENTIAL_REANCHORED, IMPOSSIBLE, or SYSTEM
    if (
      input.reconciliationReceipt.mode === 'NOT_REQUIRED' ||
      input.reconciliationReceipt.mode === 'EXPERIENTIAL_REANCHORED' ||
      input.reconciliationReceipt.feasibility === 'IMPOSSIBLE' ||
      input.intentReceipt.action_kind === 'SYSTEM'
    ) {
      outcome = 'REJECTED';
      reason = 'RECONCILIATION_SUPPRESSED';
      entry = null;
    } else {
      // 2. ROLE_NOT_AUTHORIZED unless effective role is Protagonist/Possessed or Antagonist with WITHIN_CONTRACT
      const effectiveRole = (
        input.context.participationContext?.mode ?? input.context.player.role
      ).toLowerCase();

      const isAuthorizedRole =
        effectiveRole === 'protagonist' ||
        effectiveRole === 'possessed' ||
        (effectiveRole === 'antagonist' &&
          input.reconciliationReceipt.authority_alignment === 'WITHIN_CONTRACT');

      if (!isAuthorizedRole) {
        outcome = 'REJECTED';
        reason = 'ROLE_NOT_AUTHORIZED';
        entry = null;
      } else if (!PERMITTED_ACTIONS.includes(input.intentReceipt.action_kind)) {
        // 3. ACTION_NOT_AUTHORIZED unless action is OBSERVE, INVESTIGATE, COMMUNICATE, MOVE, or MANIPULATE
        outcome = 'REJECTED';
        reason = 'ACTION_NOT_AUTHORIZED';
        entry = null;
      } else {
        // 4. UNKNOWN_CHARACTER for no exact cast ID
        const castMember = input.context.cast?.find((c) => c.id === rawCharId);
        if (!castMember) {
          outcome = 'REJECTED';
          reason = 'UNKNOWN_CHARACTER';
          entry = null;
        } else if (
          (Boolean(input.context.player.characterId) &&
            input.context.player.characterId === rawCharId) ||
          Boolean(castMember.isUserCharacter)
        ) {
          // 5. PLAYER_CHARACTER for the player ID or isUserCharacter
          outcome = 'REJECTED';
          reason = 'PLAYER_CHARACTER';
          entry = null;
        } else if (castMember.isPresent === false) {
          // 6. CHARACTER_ABSENT when the target is not present
          outcome = 'REJECTED';
          reason = 'CHARACTER_ABSENT';
          entry = null;
        } else if (candidate.source === 'TOLD' && input.intentReceipt.action_kind !== 'COMMUNICATE') {
          // 7. For TOLD, SOURCE_ACTION_MISMATCH unless action kind is COMMUNICATE
          outcome = 'REJECTED';
          reason = 'SOURCE_ACTION_MISMATCH';
          entry = null;
        } else if (
          candidate.source === 'TOLD' &&
          input.intentReceipt.action_kind === 'COMMUNICATE' &&
          input.castInteractionReceipt.addressedCharacterId !== rawCharId &&
          input.castInteractionReceipt.respondingCharacterId !== rawCharId
        ) {
          // 8. For TOLD on COMMUNICATE, COMMUNICATION_TARGET_MISMATCH unless target equals addressed or responding ID
          outcome = 'REJECTED';
          reason = 'COMMUNICATION_TARGET_MISMATCH';
          entry = null;
        } else if (
          candidate.source === 'OBSERVED' &&
          input.intentReceipt.action_kind === 'COMMUNICATE'
        ) {
          // 9. For OBSERVED, SOURCE_ACTION_MISMATCH when action kind is COMMUNICATE
          outcome = 'REJECTED';
          reason = 'SOURCE_ACTION_MISMATCH';
          entry = null;
        } else {
          const currentEntries = workingState[rawCharId] ?? [];
          const factIdentity = candidate.fact.toLocaleLowerCase('en-US');
          const isDuplicate = currentEntries.some(
            (e) => e.fact.toLocaleLowerCase('en-US') === factIdentity
          );

          if (isDuplicate) {
            // 10. DUPLICATE_FACT as NO_CHANGE when the normalized fact already exists for that character
            outcome = 'NO_CHANGE';
            reason = 'DUPLICATE_FACT';
            entry = null;
          } else if (currentEntries.length >= MAX_MEMORIES_PER_CHARACTER) {
            // 11. STATE_LIMIT as REJECTED when that character already has 24 entries
            outcome = 'REJECTED';
            reason = 'STATE_LIMIT';
            entry = null;
          } else {
            // 12. Otherwise create an application-ID entry with acquired_turn = currentTurn and return APPLIED / APPLIED
            const derivedId = deriveCharacterMemoryId(rawCharId, candidate.fact);
            const newEntry: CharacterMemoryEntry = {
              id: derivedId,
              fact: candidate.fact,
              source: candidate.source,
              certainty: candidate.certainty,
              acquired_turn: normalizedCurrentTurn,
            };
            outcome = 'APPLIED';
            reason = 'APPLIED';
            entry = newEntry;

            if (!workingState[rawCharId]) {
              workingState[rawCharId] = [];
            }
            workingState[rawCharId].push(newEntry);
          }
        }
      }
    }

    decisions.push({
      candidate,
      outcome,
      reason,
      entry,
    });
  }

  return {
    version: 1,
    pre_state: preState,
    post_state: createCharacterMemoryState(workingState),
    decisions,
  };
}
