import type {
  CastPresenceReceipt,
  CharacterPresenceById,
} from '../types';

export interface CastPresenceSeed {
  id?: string | null;
  isUserCharacter?: boolean | null;
  starting_location?: string | null;
  presenceDisposition?:
    | { kind: 'AT_NODE'; nodeId: string }
    | { kind: 'OFFSTAGE' }
    | { kind: 'NONLOCAL' }
    | 'AT_NODE'
    | 'OFFSTAGE'
    | 'NONLOCAL'
    | null;
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
      playerCharacterId !== undefined
        ? cleanPlayerId !== null && charId === cleanPlayerId
        : Boolean(member.isUserCharacter);

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

    // Explicit Presence Disposition (Forge 1C Contract)
    const disposition = member.presenceDisposition;
    if (disposition) {
      const dispKind = typeof disposition === 'object' ? disposition.kind : disposition;
      if (dispKind === 'OFFSTAGE' || dispKind === 'NONLOCAL') {
        // Deliberately offstage or nonlocal; do not seed a local node or fall back to player room
        continue;
      }
      if (dispKind === 'AT_NODE') {
        const targetNode =
          typeof disposition === 'object' && 'nodeId' in disposition && disposition.nodeId
            ? disposition.nodeId.trim()
            : member.starting_location?.trim();
        if (targetNode && validNodesSet.has(targetNode)) {
          result[charId] = {
            nodeId: targetNode,
          };
        }
        // If targetNode is missing or invalid, do not silently co-locate with player
        continue;
      }
    }

    // Legacy Blueprint Fallback Path (when presenceDisposition is absent)
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