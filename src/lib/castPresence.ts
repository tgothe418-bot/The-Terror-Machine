import type {
  CastPresenceReceipt,
  CharacterPresenceById,
} from '../types';

export interface CastPresenceSeed {
  id?: string | null;
  isUserCharacter?: boolean | null;
  starting_location?: string | null;
}

export function buildCharacterPresence(
  cast: readonly CastPresenceSeed[],
  persisted: CharacterPresenceById | null | undefined,
  validNodeIds: readonly string[],
  currentNodeId?: string | null,
  playerCharacterId?: string | null,
): CharacterPresenceById {
  const result: CharacterPresenceById = {};
  const seenIds = new Set<string>();

  const validNodesSet = new Set(
    (validNodeIds || [])
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim())
  );

  const cleanCurrentNodeId =
    typeof currentNodeId === 'string' && currentNodeId.trim().length > 0
      ? currentNodeId.trim()
      : null;

  const cleanPlayerId =
    typeof playerCharacterId === 'string' && playerCharacterId.trim().length > 0
      ? playerCharacterId.trim()
      : null;

  for (const member of cast) {
    if (!member || typeof member.id !== 'string' || member.id.trim().length === 0) {
      continue;
    }

    const charId = member.id.trim();
    if (seenIds.has(charId)) {
      continue;
    }
    seenIds.add(charId);

    const isPlayer =
      (cleanPlayerId !== null && charId === cleanPlayerId) ||
      Boolean(member.isUserCharacter);

    if (isPlayer) {
      if (cleanCurrentNodeId) {
        result[charId] = {
          nodeId: cleanCurrentNodeId,
        };
      }
      continue;
    }

    const persistedNode = persisted?.[charId]?.nodeId;
    if (
      typeof persistedNode === 'string' &&
      persistedNode.trim().length > 0 &&
      validNodesSet.has(persistedNode.trim())
    ) {
      result[charId] = {
        nodeId: persistedNode.trim(),
      };
      continue;
    }

    const authoredLoc = member.starting_location;
    if (
      typeof authoredLoc === 'string' &&
      authoredLoc.trim().length > 0 &&
      validNodesSet.has(authoredLoc.trim())
    ) {
      result[charId] = {
        nodeId: authoredLoc.trim(),
      };
      continue;
    }

    if (cleanCurrentNodeId) {
      result[charId] = {
        nodeId: cleanCurrentNodeId,
      };
    }
  }

  return result;
}

export function createCastPresenceReceipt(
  state: CharacterPresenceById | null | undefined,
): CastPresenceReceipt {
  const sortedKeys = state
    ? Object.keys(state).sort((a, b) => a.localeCompare(b))
    : [];

  const stateCopy: CharacterPresenceById = {};
  for (const key of sortedKeys) {
    const item = state![key];
    if (
      item &&
      typeof item === 'object' &&
      typeof item.nodeId === 'string' &&
      item.nodeId.trim().length > 0
    ) {
      stateCopy[key] = {
        nodeId: item.nodeId.trim(),
      };
    }
  }

  return {
    version: 1,
    state: stateCopy,
  };
}