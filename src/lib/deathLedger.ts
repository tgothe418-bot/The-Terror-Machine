import {
  WoundFact,
  WoundFactProposal,
  WoundSeverity,
  WOUND_SEVERITIES,
  CircumstanceFacts,
  DeathVerdict,
} from '../types/death';

export type WoundLedger = Record<string, WoundFact[]>;

export interface RecordWoundFactsResult {
  accepted: WoundFact[];
  rejected: string[];
  merged: string[];
  updatedLedger: WoundLedger;
}

export function normalizeWoundString(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

const SEVERITY_RANK: Record<WoundSeverity, number> = {
  minor: 1,
  serious: 2,
  grave: 3,
  unsurvivable: 4,
};

/**
 * Validates proposals and appends or merges into the per-character wound ledger.
 * Pure function: takes current ledger, returns updated ledger and receipts.
 */
export function recordWoundFacts(
  characterId: string,
  proposals: Array<Partial<WoundFactProposal>>,
  turn: number,
  fictionalTimeSeconds: number,
  currentLedger: WoundLedger = {}
): RecordWoundFactsResult {
  const updatedLedger: WoundLedger = { ...currentLedger };
  const existingWounds: WoundFact[] = [...(updatedLedger[characterId] || [])];
  const accepted: WoundFact[] = [];
  const rejected: string[] = [];
  const merged: string[] = [];

  let nextSeq = existingWounds.length + 1;

  for (const proposal of proposals) {
    const rawMech = proposal.mechanism;
    const rawLoc = proposal.location;
    const rawSev = proposal.severity;
    const rawTimeline = proposal.timelineMinutes;
    const rawTreatability = proposal.treatability;

    const normMech = normalizeWoundString(rawMech);
    const normLoc = normalizeWoundString(rawLoc);

    // Validation 1: Mechanism & location non-empty
    if (!normMech) {
      rejected.push(`Rejected proposal for ${characterId}: mechanism must be non-empty string.`);
      continue;
    }
    if (!normLoc) {
      rejected.push(`Rejected proposal for ${characterId}: location must be non-empty string.`);
      continue;
    }

    // Validation 2: Severity enum
    if (!rawSev || !WOUND_SEVERITIES.includes(rawSev as WoundSeverity)) {
      rejected.push(
        `Rejected proposal for ${characterId}: invalid severity "${String(rawSev)}". Must be one of: ${WOUND_SEVERITIES.join(', ')}.`
      );
      continue;
    }
    const severity = rawSev as WoundSeverity;

    // Validation 3: Timeline is finite non-negative number
    if (
      typeof rawTimeline !== 'number' ||
      !Number.isFinite(rawTimeline) ||
      rawTimeline < 0
    ) {
      rejected.push(
        `Rejected proposal for ${characterId}: timelineMinutes must be a finite non-negative number.`
      );
      continue;
    }
    const timelineMinutes = rawTimeline;

    // Validation 4: Timeline sanity invariant (§3, Gemini R1)
    // timelineMinutes === 0 is strictly forbidden unless severity === 'unsurvivable'
    if (timelineMinutes === 0 && severity !== 'unsurvivable') {
      rejected.push(
        `Rejected proposal for ${characterId}: timelineMinutes may only be 0 for 'unsurvivable' severity (got ${severity} with 0 min).`
      );
      continue;
    }

    // A minor or serious wound cannot carry a fatal timeline under 60 minutes
    if ((severity === 'minor' || severity === 'serious') && timelineMinutes < 60) {
      rejected.push(
        `Rejected proposal for ${characterId}: ${severity} wound cannot carry a fatal timeline under 60 minutes (got ${timelineMinutes} min).`
      );
      continue;
    }

    // Wound idempotency (ChatGPT R2):
    // If the character already has an open (untreated) wound with the same normalized mechanism AND normalized location,
    // the proposal is a re-description, not a new wound — merge it without appending a new fact.
    const openDuplicateIndex = existingWounds.findIndex(
      (w) =>
        !w.treated &&
        normalizeWoundString(w.mechanism) === normMech &&
        normalizeWoundString(w.location) === normLoc
    );

    if (openDuplicateIndex !== -1) {
      const existing = existingWounds[openDuplicateIndex];
      merged.push(
        `Merged proposal for ${characterId}: existing open wound ${existing.id} matches mechanism "${normMech}" and location "${normLoc}".`
      );
      continue;
    }

    // Assign deterministic ID: `${characterId}:w${ledgerSeq}`
    const id = `${characterId}:w${nextSeq++}`;

    const newFact: WoundFact = {
      id,
      characterId,
      mechanism: normMech,
      location: normLoc,
      severity,
      timelineMinutes,
      treatability: normalizeWoundString(rawTreatability) || 'standard first aid',
      inflictedAtTurn: turn,
      inflictedAtFictionalTime: fictionalTimeSeconds,
      treated: false,
      valence: proposal.valence || 'accident',
      inflictedByCharacterId: proposal.inflictedByCharacterId,
    };

    existingWounds.push(newFact);
    accepted.push(newFact);
  }

  updatedLedger[characterId] = existingWounds;

  return {
    accepted,
    rejected,
    merged,
    updatedLedger,
  };
}

export interface RecordTreatmentResult {
  success: boolean;
  reason?: string;
  wound?: WoundFact;
  updatedLedger: WoundLedger;
}

/**
 * Marks an existing open wound as treated, stamping treatedAtFictionalTime.
 */
export function recordTreatment(
  characterId: string,
  woundId: string,
  fictionalTimeSeconds: number,
  currentLedger: WoundLedger = {}
): RecordTreatmentResult {
  const updatedLedger: WoundLedger = { ...currentLedger };
  const existingWounds = [...(updatedLedger[characterId] || [])];

  const targetIndex = existingWounds.findIndex((w) => w.id === woundId);
  if (targetIndex === -1) {
    return {
      success: false,
      reason: `Wound "${woundId}" not found on character "${characterId}".`,
      updatedLedger,
    };
  }

  const existing = existingWounds[targetIndex];
  if (existing.treated) {
    return {
      success: false,
      reason: `Wound "${woundId}" on character "${characterId}" is already treated.`,
      updatedLedger,
    };
  }

  const updatedWound: WoundFact = {
    ...existing,
    treated: true,
    treatedAtFictionalTime: fictionalTimeSeconds,
  };

  existingWounds[targetIndex] = updatedWound;
  updatedLedger[characterId] = existingWounds;

  return {
    success: true,
    wound: updatedWound,
    updatedLedger,
  };
}

export interface TransferWoundsResult {
  transferred: WoundFact[];
  updatedLedger: WoundLedger;
}

/**
 * Transfers all open (untreated) wounds from victim to intervener (sacrifice).
 * Facts keep their IDs; characterId rewrites to intervener.
 */
export function transferWounds(
  fromId: string,
  toId: string,
  currentLedger: WoundLedger = {}
): TransferWoundsResult {
  const updatedLedger: WoundLedger = { ...currentLedger };
  const fromWounds = [...(updatedLedger[fromId] || [])];
  const toWounds = [...(updatedLedger[toId] || [])];

  const transferred: WoundFact[] = [];
  const remainingFromWounds: WoundFact[] = [];

  for (const wound of fromWounds) {
    if (!wound.treated) {
      const rewritten: WoundFact = {
        ...wound,
        characterId: toId,
        valence: 'sacrifice',
      };
      transferred.push(rewritten);
      toWounds.push(rewritten);
    } else {
      remainingFromWounds.push(wound);
    }
  }

  updatedLedger[fromId] = remainingFromWounds;
  updatedLedger[toId] = toWounds;

  return {
    transferred,
    updatedLedger,
  };
}

export interface SurvivabilityResult {
  verdict: DeathVerdict;
  restingOnFactIds: string[];
}

/**
 * Evaluates survivability for a character deterministically based on open wound facts and circumstances.
 *
 * Rules, in order (§4):
 * 1. Any open wound with severity: 'unsurvivable' and extraordinaryInterventionAvailable: false -> DEATH.
 * 2. Any open grave wound whose timeline has expired (per unit invariant), with treated: false -> DEATH.
 * 3. Three or more open serious wounds, all untreated, with fictional time advanced past the shortest timeline among them -> DEATH.
 * 4. Otherwise -> ALIVE.
 *
 * Treatment timing invariant (§4):
 * Treatment prevents an expiration death ONLY IF treatedAtFictionalTime < inflictedAtFictionalTime + (timelineMinutes * 60).
 * A wound treated after the deadline already expired remains fatal.
 */
export function evaluateSurvivability(
  characterId: string,
  ledger: WoundLedger,
  circumstances: CircumstanceFacts
): SurvivabilityResult {
  const wounds = ledger[characterId] || [];
  const currentTime = circumstances.evaluatedAtFictionalTime;

  // Helper: check if a wound's fatal deadline expired before treatment (or is untreated and currently expired)
  function isWoundExpired(w: WoundFact): boolean {
    const deadlineSeconds = w.inflictedAtFictionalTime + w.timelineMinutes * 60;
    if (w.treated) {
      // If treated, did treatment happen AFTER the deadline?
      if (w.treatedAtFictionalTime !== undefined && w.treatedAtFictionalTime >= deadlineSeconds) {
        return true; // Treatment after deadline does not resurrect (§4)
      }
      return false; // Successfully treated before deadline
    }
    // Untreated: has current fictional time passed the deadline?
    return currentTime >= deadlineSeconds;
  }

  // Rule 1: Any wound with severity: 'unsurvivable' and extraordinaryInterventionAvailable: false -> DEATH
  for (const w of wounds) {
    if (w.severity === 'unsurvivable') {
      if (!circumstances.extraordinaryInterventionAvailable) {
        return {
          verdict: 'DEATH',
          restingOnFactIds: [w.id],
        };
      }
    }
  }

  // Rule 2: Any open grave wound whose timeline has expired, with treated: false (or treated late) -> DEATH
  for (const w of wounds) {
    if (w.severity === 'grave') {
      if (isWoundExpired(w)) {
        return {
          verdict: 'DEATH',
          restingOnFactIds: [w.id],
        };
      }
    }
  }

  // Rule 3: Three or more open serious wounds, all untreated, with fictional time advanced past the shortest timeline among them -> DEATH
  const openSeriousWounds = wounds.filter((w) => !w.treated && w.severity === 'serious');
  if (openSeriousWounds.length >= 3) {
    // Find the shortest timeline (earliest fatal deadline in absolute fictional seconds)
    let minDeadlineSeconds = Infinity;
    for (const w of openSeriousWounds) {
      const deadline = w.inflictedAtFictionalTime + w.timelineMinutes * 60;
      if (deadline < minDeadlineSeconds) {
        minDeadlineSeconds = deadline;
      }
    }

    if (currentTime >= minDeadlineSeconds) {
      return {
        verdict: 'DEATH',
        restingOnFactIds: openSeriousWounds.map((w) => w.id),
      };
    }
  }

  // Rule 4: Otherwise -> ALIVE
  return {
    verdict: 'ALIVE',
    restingOnFactIds: [],
  };
}

/**
 * Deterministically determines the primary causal wound from the set of facts the death rested on.
 *
 * Single-fact death -> that fact is primary.
 * Cumulative death -> highest severity wins; ties -> earliest inflictedAtTurn;
 * further ties -> lowest woundId lexicographically.
 */
export function determinePrimaryWound(
  restingOnFactIds: string[],
  characterWounds: WoundFact[]
): WoundFact | undefined {
  if (restingOnFactIds.length === 0) return undefined;

  const candidateWounds = characterWounds.filter((w) => restingOnFactIds.includes(w.id));
  if (candidateWounds.length === 0) return undefined;
  if (candidateWounds.length === 1) return candidateWounds[0];

  // Sort candidate wounds deterministically
  candidateWounds.sort((a, b) => {
    // 1. Highest severity rank wins
    const rankA = SEVERITY_RANK[a.severity] || 0;
    const rankB = SEVERITY_RANK[b.severity] || 0;
    if (rankA !== rankB) return rankB - rankA;

    // 2. Ties -> earliest inflictedAtTurn
    if (a.inflictedAtTurn !== b.inflictedAtTurn) {
      return a.inflictedAtTurn - b.inflictedAtTurn;
    }

    // 3. Further ties -> lowest woundId lexicographically
    return a.id.localeCompare(b.id);
  });

  return candidateWounds[0];
}
