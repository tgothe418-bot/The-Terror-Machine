import {
  CharacterRelationshipChangeProposal,
  CharacterRelationshipDecision,
  CharacterRelationshipProposal,
  CharacterRelationshipReceipt,
  CharacterRelationshipRecord,
  CharacterRelationshipRecordSchema,
  CharacterRelationshipState,
  EngineTurnContext,
  IntentReceipt,
  NarrativeReconciliationReceipt,
  CastInteractionReceipt,
  RelationshipDecisionOutcome,
  RelationshipDecisionReason,
  MAX_CHARACTER_RELATIONSHIPS,
} from '../types';

function compareRelationships(
  a: CharacterRelationshipRecord,
  b: CharacterRelationshipRecord
): number {
  const sourceComp = a.source_character_id.localeCompare(b.source_character_id);
  if (sourceComp !== 0) return sourceComp;
  const targetComp = a.target_character_id.localeCompare(b.target_character_id);
  if (targetComp !== 0) return targetComp;
  return a.kind.localeCompare(b.kind);
}

export function createCharacterRelationshipState(
  input?: CharacterRelationshipState | null
): CharacterRelationshipState {
  if (!input || !Array.isArray(input)) {
    return [];
  }

  const seenKeys = new Set<string>();
  const validRecords: CharacterRelationshipRecord[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;

    const parsed = CharacterRelationshipRecordSchema.safeParse(item);
    if (!parsed.success) continue;

    const record = parsed.data;
    const key = `${record.source_character_id}\0${record.target_character_id}\0${record.kind}`;
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    validRecords.push({
      source_character_id: record.source_character_id,
      target_character_id: record.target_character_id,
      kind: record.kind,
      intensity: record.intensity,
    });

    if (validRecords.length >= MAX_CHARACTER_RELATIONSHIPS) {
      break;
    }
  }

  return validRecords.sort(compareRelationships);
}

export function resolveCharacterRelationships(input: {
  proposal: CharacterRelationshipProposal;
  currentState: CharacterRelationshipState;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  reconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): CharacterRelationshipReceipt {
  const preState = createCharacterRelationshipState(input.currentState);
  const workingRecords: CharacterRelationshipRecord[] = preState.map((r) => ({ ...r }));
  const decisions: CharacterRelationshipDecision[] = [];

  const changes = Array.isArray(input.proposal?.changes) ? input.proposal.changes : [];

  for (const rawChange of changes) {
    const sourceId =
      typeof rawChange.source_character_id === 'string' ? rawChange.source_character_id.trim() : '';
    const targetId =
      typeof rawChange.target_character_id === 'string' ? rawChange.target_character_id.trim() : '';
    const rationale =
      typeof rawChange.rationale === 'string' ? rawChange.rationale.trim() : '';

    const changeProposal: CharacterRelationshipChangeProposal = {
      source_character_id: sourceId,
      target_character_id: targetId,
      kind: rawChange.kind,
      delta: rawChange.delta,
      rationale,
    };

    const existingIndex = workingRecords.findIndex(
      (r) =>
        r.source_character_id === changeProposal.source_character_id &&
        r.target_character_id === changeProposal.target_character_id &&
        r.kind === changeProposal.kind
    );
    const existingRecord = existingIndex >= 0 ? { ...workingRecords[existingIndex] } : null;
    const before = existingRecord ? { ...existingRecord } : null;
    let after: CharacterRelationshipRecord | null = existingRecord ? { ...existingRecord } : null;

    let outcome: RelationshipDecisionOutcome;
    let reason: RelationshipDecisionReason;

    // 1. RECONCILIATION_SUPPRESSED for NOT_REQUIRED, EXPERIENTIAL_REANCHORED, IMPOSSIBLE, or SYSTEM
    if (
      input.reconciliationReceipt.mode === 'NOT_REQUIRED' ||
      input.reconciliationReceipt.mode === 'EXPERIENTIAL_REANCHORED' ||
      input.reconciliationReceipt.feasibility === 'IMPOSSIBLE' ||
      input.intentReceipt.action_kind === 'SYSTEM'
    ) {
      outcome = 'REJECTED';
      reason = 'RECONCILIATION_SUPPRESSED';
      after = before ? { ...before } : null;
    } else {
      // 2. ROLE_NOT_AUTHORIZED unless effective role is Protagonist/Possessed or an Antagonist with WITHIN_CONTRACT
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
        after = before ? { ...before } : null;
      } else {
        // 3. ACTION_NOT_AUTHORIZED unless action kind is COMMUNICATE, INVESTIGATE, MOVE, or MANIPULATE
        const authorizedActions = ['COMMUNICATE', 'INVESTIGATE', 'MOVE', 'MANIPULATE'];
        if (!authorizedActions.includes(input.intentReceipt.action_kind)) {
          outcome = 'REJECTED';
          reason = 'ACTION_NOT_AUTHORIZED';
          after = before ? { ...before } : null;
        } else {
          // 4. PLAYER_ID_UNAVAILABLE when context.player.characterId is null/blank
          const rawPlayerId = input.context.player.characterId;
          const playerId = typeof rawPlayerId === 'string' ? rawPlayerId.trim() : '';

          if (!playerId) {
            outcome = 'REJECTED';
            reason = 'PLAYER_ID_UNAVAILABLE';
            after = before ? { ...before } : null;
          } else if (changeProposal.source_character_id === changeProposal.target_character_id) {
            // 5. SELF_RELATIONSHIP when source and target are equal
            outcome = 'REJECTED';
            reason = 'SELF_RELATIONSHIP';
            after = before ? { ...before } : null;
          } else {
            // 6. PLAYER_NOT_INVOLVED unless exactly one endpoint equals the player character ID
            const sourceIsPlayer = changeProposal.source_character_id === playerId;
            const targetIsPlayer = changeProposal.target_character_id === playerId;

            if (!(sourceIsPlayer !== targetIsPlayer)) {
              outcome = 'REJECTED';
              reason = 'PLAYER_NOT_INVOLVED';
              after = before ? { ...before } : null;
            } else {
              const nonPlayerId = sourceIsPlayer
                ? changeProposal.target_character_id
                : changeProposal.source_character_id;

              // 7. UNKNOWN_CHARACTER when the non-player endpoint is not an exact cast ID
              const castMember = input.context.cast?.find((c) => c.id === nonPlayerId);

              if (!castMember) {
                outcome = 'REJECTED';
                reason = 'UNKNOWN_CHARACTER';
                after = before ? { ...before } : null;
              } else if (castMember.isUserCharacter) {
                // 8. Treat the non-player endpoint as ineligible and return UNKNOWN_CHARACTER when it is flagged isUserCharacter
                outcome = 'REJECTED';
                reason = 'UNKNOWN_CHARACTER';
                after = before ? { ...before } : null;
              } else if (castMember.isPresent === false) {
                // 9. CHARACTER_ABSENT when that non-player cast member is not present
                outcome = 'REJECTED';
                reason = 'CHARACTER_ABSENT';
                after = before ? { ...before } : null;
              } else if (
                input.intentReceipt.action_kind === 'COMMUNICATE' &&
                input.castInteractionReceipt.addressedCharacterId !== nonPlayerId &&
                input.castInteractionReceipt.respondingCharacterId !== nonPlayerId
              ) {
                // 10. For COMMUNICATE, COMMUNICATION_TARGET_MISMATCH unless the non-player endpoint equals the addressed or responding ID
                outcome = 'REJECTED';
                reason = 'COMMUNICATION_TARGET_MISMATCH';
                after = before ? { ...before } : null;
              } else {
                // 11. State rules
                if (changeProposal.delta === 1) {
                  if (!existingRecord) {
                    if (workingRecords.length >= MAX_CHARACTER_RELATIONSHIPS) {
                      outcome = 'REJECTED';
                      reason = 'STATE_LIMIT';
                      after = null;
                    } else {
                      outcome = 'APPLIED';
                      reason = 'APPLIED';
                      const newRecord: CharacterRelationshipRecord = {
                        source_character_id: changeProposal.source_character_id,
                        target_character_id: changeProposal.target_character_id,
                        kind: changeProposal.kind,
                        intensity: 1,
                      };
                      workingRecords.push(newRecord);
                      after = { ...newRecord };
                    }
                  } else if (
                    existingRecord.intensity === 1 ||
                    existingRecord.intensity === 2
                  ) {
                    outcome = 'APPLIED';
                    reason = 'APPLIED';
                    const updatedIntensity = (existingRecord.intensity + 1) as 2 | 3;
                    workingRecords[existingIndex].intensity = updatedIntensity;
                    after = { ...workingRecords[existingIndex] };
                  } else {
                    // intensity === 3
                    outcome = 'NO_CHANGE';
                    reason = 'INTENSITY_LIMIT';
                    after = { ...existingRecord };
                  }
                } else {
                  // delta === -1
                  if (!existingRecord) {
                    outcome = 'NO_CHANGE';
                    reason = 'RELATIONSHIP_NOT_FOUND';
                    after = null;
                  } else if (
                    existingRecord.intensity === 2 ||
                    existingRecord.intensity === 3
                  ) {
                    outcome = 'APPLIED';
                    reason = 'APPLIED';
                    const updatedIntensity = (existingRecord.intensity - 1) as 1 | 2;
                    workingRecords[existingIndex].intensity = updatedIntensity;
                    after = { ...workingRecords[existingIndex] };
                  } else {
                    // intensity === 1
                    outcome = 'APPLIED';
                    reason = 'APPLIED';
                    workingRecords.splice(existingIndex, 1);
                    after = null;
                  }
                }
              }
            }
          }
        }
      }
    }

    decisions.push({
      proposal: changeProposal,
      outcome,
      reason,
      before,
      after,
    });
  }

  const postState = createCharacterRelationshipState(workingRecords);

  return {
    version: 1,
    pre_state: preState,
    post_state: postState,
    decisions,
  };
}
