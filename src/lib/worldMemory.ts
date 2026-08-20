import {
  WorldMemoryEntry,
  WorldMemoryState,
  WorldMemoryCandidate,
  WorldMemoryProposal,
  WorldMemoryDecision,
  WorldMemoryReceipt,
  WorldMemoryKind,
  WORLD_MEMORY_KINDS,
  WORLD_MEMORY_SCOPES,
  MAX_WORLD_MEMORY_ENTRIES,
  MAX_WORLD_MEMORY_CANDIDATES,
  MAX_WORLD_MEMORY_STATEMENT_LENGTH,
  EngineTurnContext,
  IntentReceipt,
  NarrativeReconciliationReceipt,
  CastInteractionReceipt,
  LoreAndMemory,
} from '../types';

export function normalizeWorldMemoryStatement(value: string): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function deriveWorldMemoryId(
  input: Pick<WorldMemoryEntry, 'kind' | 'scope' | 'node_id' | 'statement'>
): string {
  const normalizedKind = typeof input?.kind === 'string' ? input.kind.trim() : '';
  const normalizedScope = typeof input?.scope === 'string' ? input.scope.trim() : '';
  const normalizedNodeId =
    normalizedScope === 'GLOBAL' || !input?.node_id ? '' : input.node_id.trim();
  const normalizedStatement = normalizeWorldMemoryStatement(input?.statement ?? '');
  const lowercaseStatement = normalizedStatement.toLocaleLowerCase('en-US');

  const key = `${normalizedKind}\u0000${normalizedScope}\u0000${normalizedNodeId}\u0000${lowercaseStatement}`;
  const bytes = new TextEncoder().encode(key);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return `wm_${hex}`;
}

export function createWorldMemoryState(
  input?: WorldMemoryState | null
): WorldMemoryState {
  if (!input || !Array.isArray(input)) {
    return [];
  }

  const validEntries: WorldMemoryEntry[] = [];
  const seenIdentities = new Set<string>();

  for (const rawEntry of input) {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      continue;
    }
    const entryObj = rawEntry as Record<string, unknown>;

    if (
      typeof entryObj.kind !== 'string' ||
      !WORLD_MEMORY_KINDS.includes(entryObj.kind as WorldMemoryKind)
    ) {
      continue;
    }
    const kind = entryObj.kind as WorldMemoryKind;

    if (
      typeof entryObj.scope !== 'string' ||
      !WORLD_MEMORY_SCOPES.includes(entryObj.scope as 'GLOBAL' | 'NODE')
    ) {
      continue;
    }
    const scope = entryObj.scope as 'GLOBAL' | 'NODE';

    let nodeId: string | null = null;
    if (scope === 'GLOBAL') {
      if (entryObj.node_id !== null && entryObj.node_id !== undefined) {
        continue;
      }
      nodeId = null;
    } else if (scope === 'NODE') {
      if (typeof entryObj.node_id !== 'string') {
        continue;
      }
      const trimmedNodeId = entryObj.node_id.trim();
      if (!trimmedNodeId || trimmedNodeId.length > 120) {
        continue;
      }
      nodeId = trimmedNodeId;
    }

    if (typeof entryObj.statement !== 'string') {
      continue;
    }
    const normalizedStatement = normalizeWorldMemoryStatement(entryObj.statement);
    if (!normalizedStatement || normalizedStatement.length > MAX_WORLD_MEMORY_STATEMENT_LENGTH) {
      continue;
    }

    if (
      typeof entryObj.established_turn !== 'number' ||
      !Number.isInteger(entryObj.established_turn) ||
      entryObj.established_turn < 0
    ) {
      continue;
    }
    const establishedTurn = entryObj.established_turn;

    const identityKey = `${kind}\u0000${scope}\u0000${nodeId ?? ''}\u0000${normalizedStatement.toLocaleLowerCase('en-US')}`;
    if (seenIdentities.has(identityKey)) {
      continue;
    }
    seenIdentities.add(identityKey);

    const derivedId = deriveWorldMemoryId({
      kind,
      scope,
      node_id: nodeId,
      statement: normalizedStatement,
    });

    validEntries.push({
      id: derivedId,
      kind,
      scope,
      node_id: nodeId,
      statement: normalizedStatement,
      established_turn: establishedTurn,
    });

    if (validEntries.length >= MAX_WORLD_MEMORY_ENTRIES) {
      break;
    }
  }

  validEntries.sort((a, b) => {
    if (a.established_turn !== b.established_turn) {
      return a.established_turn - b.established_turn;
    }
    const kindCmp = a.kind.localeCompare(b.kind);
    if (kindCmp !== 0) return kindCmp;
    const scopeCmp = a.scope.localeCompare(b.scope);
    if (scopeCmp !== 0) return scopeCmp;
    const aNode = a.node_id ?? '';
    const bNode = b.node_id ?? '';
    const nodeCmp = aNode.localeCompare(bNode);
    if (nodeCmp !== 0) return nodeCmp;
    return a.id.localeCompare(b.id);
  });

  return validEntries;
}

export function migrateLegacyLoreAndMemory(
  legacy?: LoreAndMemory | null,
  establishedTurn?: number
): WorldMemoryState {
  if (!legacy || typeof legacy !== 'object') {
    return [];
  }
  const turn =
    typeof establishedTurn === 'number' && Number.isInteger(establishedTurn) && establishedTurn >= 0
      ? establishedTurn
      : 0;

  const rawEntries: WorldMemoryEntry[] = [];

  if (Array.isArray(legacy.established_facts)) {
    for (const fact of legacy.established_facts) {
      if (typeof fact === 'string') {
        const stmt = normalizeWorldMemoryStatement(fact);
        if (stmt) {
          rawEntries.push({
            id: '',
            kind: 'ESTABLISHED_FACT',
            scope: 'GLOBAL',
            node_id: null,
            statement: stmt,
            established_turn: turn,
          });
        }
      }
    }
  }

  if (Array.isArray(legacy.permanent_consequences)) {
    for (const consequence of legacy.permanent_consequences) {
      if (typeof consequence === 'string') {
        const stmt = normalizeWorldMemoryStatement(consequence);
        if (stmt) {
          rawEntries.push({
            id: '',
            kind: 'PERSISTENT_CONSEQUENCE',
            scope: 'GLOBAL',
            node_id: null,
            statement: stmt,
            established_turn: turn,
          });
        }
      }
    }
  }

  return createWorldMemoryState(rawEntries);
}

const PERMITTED_ACTIONS_BY_KIND: Record<WorldMemoryKind, readonly string[]> = {
  ESTABLISHED_FACT: ['OBSERVE', 'INVESTIGATE', 'COMMUNICATE'],
  DISCOVERED_EVIDENCE: ['OBSERVE', 'INVESTIGATE', 'MANIPULATE'],
  ENVIRONMENTAL_CONDITION: ['MOVE', 'MANIPULATE'],
  PERSISTENT_CONSEQUENCE: ['MOVE', 'MANIPULATE'],
};

export function resolveWorldMemory(input: {
  proposal: WorldMemoryProposal;
  currentState: WorldMemoryState;
  currentTurn: number;
  context: EngineTurnContext;
  intentReceipt: IntentReceipt;
  reconciliationReceipt: NarrativeReconciliationReceipt;
  castInteractionReceipt: CastInteractionReceipt;
}): WorldMemoryReceipt {
  const normalizedCurrentTurn =
    typeof input.currentTurn === 'number' &&
    Number.isInteger(input.currentTurn) &&
    input.currentTurn >= 0
      ? input.currentTurn
      : 0;

  const preState = createWorldMemoryState(input.currentState);
  const workingState: WorldMemoryEntry[] = [...preState];
  const decisions: WorldMemoryDecision[] = [];

  const rawCandidates = Array.isArray(input.proposal?.candidates)
    ? input.proposal.candidates.slice(0, MAX_WORLD_MEMORY_CANDIDATES)
    : [];

  for (const rawCandidate of rawCandidates) {
    if (!rawCandidate || typeof rawCandidate !== 'object') {
      continue;
    }

    const normalizedStatement = normalizeWorldMemoryStatement(rawCandidate.statement ?? '');
    const normalizedRationale =
      typeof rawCandidate.rationale === 'string' ? rawCandidate.rationale.trim() : '';
    const normalizedNodeId =
      rawCandidate.scope === 'NODE'
        ? typeof rawCandidate.node_id === 'string'
          ? rawCandidate.node_id.trim()
          : null
        : null;

    const cleanCandidate: WorldMemoryCandidate = {
      kind: rawCandidate.kind,
      scope: rawCandidate.scope,
      node_id: normalizedNodeId,
      statement: normalizedStatement,
      rationale: normalizedRationale,
    };

    let outcome: WorldMemoryDecision['outcome'];
    let reason: WorldMemoryDecision['reason'];
    let entry: WorldMemoryEntry | null = null;

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
      } else {
        // 3. ACTION_NOT_AUTHORIZED unless kind/action pair is allowed
        const permittedActions = PERMITTED_ACTIONS_BY_KIND[cleanCandidate.kind] ?? [];
        if (!permittedActions.includes(input.intentReceipt.action_kind)) {
          outcome = 'REJECTED';
          reason = 'ACTION_NOT_AUTHORIZED';
          entry = null;
        } else if (cleanCandidate.scope === 'GLOBAL' && cleanCandidate.kind !== 'ESTABLISHED_FACT') {
          // 4. GLOBAL_SCOPE_NOT_AUTHORIZED when scope is GLOBAL and kind is not ESTABLISHED_FACT
          outcome = 'REJECTED';
          reason = 'GLOBAL_SCOPE_NOT_AUTHORIZED';
          entry = null;
        } else if (
          cleanCandidate.scope === 'NODE' &&
          (cleanCandidate.node_id === null ||
            cleanCandidate.node_id !== input.context.topology.currentNodeId)
        ) {
          // 5. CURRENT_NODE_MISMATCH when scope is NODE and node_id !== context.topology.currentNodeId
          outcome = 'REJECTED';
          reason = 'CURRENT_NODE_MISMATCH';
          entry = null;
        } else if (
          cleanCandidate.kind === 'ESTABLISHED_FACT' &&
          input.intentReceipt.action_kind === 'COMMUNICATE' &&
          (!input.castInteractionReceipt.respondingCharacterId ||
            input.castInteractionReceipt.outcome !== 'RESPONDED')
        ) {
          // 6. For an ESTABLISHED_FACT proposed on COMMUNICATE, COMMUNICATION_SOURCE_MISSING unless respondingCharacterId is non-null and outcome is RESPONDED
          outcome = 'REJECTED';
          reason = 'COMMUNICATION_SOURCE_MISSING';
          entry = null;
        } else {
          // 7. DUPLICATE_ENTRY as NO_CHANGE for an existing identity
          const candidateNodeId = cleanCandidate.scope === 'GLOBAL' ? '' : (cleanCandidate.node_id ?? '');
          const candidateStatementLower = normalizedStatement.toLocaleLowerCase('en-US');
          const isDuplicate = workingState.some((e) => {
            const entryNodeId = e.scope === 'GLOBAL' ? '' : (e.node_id ?? '');
            const entryStatementLower = normalizeWorldMemoryStatement(e.statement).toLocaleLowerCase('en-US');
            return (
              e.kind === cleanCandidate.kind &&
              e.scope === cleanCandidate.scope &&
              entryNodeId === candidateNodeId &&
              entryStatementLower === candidateStatementLower
            );
          });

          if (isDuplicate) {
            outcome = 'NO_CHANGE';
            reason = 'DUPLICATE_ENTRY';
            entry = null;
          } else if (workingState.length >= MAX_WORLD_MEMORY_ENTRIES) {
            // 8. STATE_LIMIT as REJECTED at 64 entries
            outcome = 'REJECTED';
            reason = 'STATE_LIMIT';
            entry = null;
          } else {
            // 9. Otherwise create deterministic entry at normalized currentTurn and return APPLIED / APPLIED
            const derivedId = deriveWorldMemoryId({
              kind: cleanCandidate.kind,
              scope: cleanCandidate.scope,
              node_id: cleanCandidate.node_id,
              statement: normalizedStatement,
            });
            const newEntry: WorldMemoryEntry = {
              id: derivedId,
              kind: cleanCandidate.kind,
              scope: cleanCandidate.scope,
              node_id: cleanCandidate.node_id,
              statement: normalizedStatement,
              established_turn: normalizedCurrentTurn,
            };
            outcome = 'APPLIED';
            reason = 'APPLIED';
            entry = newEntry;
            workingState.push(newEntry);
          }
        }
      }
    }

    decisions.push({
      candidate: cleanCandidate,
      outcome,
      reason,
      entry,
    });
  }

  return {
    version: 1,
    pre_state: preState,
    post_state: createWorldMemoryState(workingState),
    decisions,
  };
}
