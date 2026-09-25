import { z } from 'zod';

/** Rough ordinal. The fiction carries the weight; this is only the Machine's handle. */
export const WOUND_SEVERITIES = ['minor', 'serious', 'grave', 'unsurvivable'] as const;
export const WoundSeveritySchema = z.enum(WOUND_SEVERITIES);
export type WoundSeverity = z.infer<typeof WoundSeveritySchema>;

export const DEATH_VALENCES = ['murder', 'accident', 'sacrifice', 'execution'] as const;
export const DeathValenceSchema = z.enum(DEATH_VALENCES);
export type DeathValence = z.infer<typeof DeathValenceSchema>;

export interface WoundFact {
  id: string;                       // deterministic: `${characterId}:w${ledgerSeq}`
  characterId: string;
  mechanism: string;                // normalized free text, e.g. "ligature", "gunshot"
  location: string;                 // normalized free text, e.g. "throat", "left shoulder"
  severity: WoundSeverity;          // validated against enum; anything else rejected
  timelineMinutes: number;          // MINUTES until death if untreated; 0 = immediate (see sanity invariant, §3)
  treatability: string;             // normalized free text: what intervention the fiction permits
  inflictedAtTurn: number;
  inflictedAtFictionalTime: number; // fictional SECONDS (engine clock unit)
  treated: boolean;                 // set by intervention facts
  treatedAtFictionalTime?: number;  // fictional SECONDS; must precede the deadline (§4)
  valence: DeathValence;            // intent facts riding alongside
  inflictedByCharacterId?: string;
}

export const WoundFactProposalSchema = z
  .object({
    characterId: z.string().min(1),
    mechanism: z.string().min(1),
    location: z.string().min(1),
    severity: WoundSeveritySchema,
    timelineMinutes: z.number().nonnegative(),
    treatability: z.string().min(1),
    valence: DeathValenceSchema.default('accident'),
    inflictedByCharacterId: z.string().optional(),
  })
  .strict();
export type WoundFactProposal = z.infer<typeof WoundFactProposalSchema>;

export const TreatmentProposalSchema = z
  .object({
    characterId: z.string().min(1),
    woundId: z.string().min(1),
    mechanism: z.string().min(1), // e.g. "tourniquet applied", "cauterized", "chest seal"
  })
  .strict();
export type TreatmentProposal = z.infer<typeof TreatmentProposalSchema>;

export interface CircumstanceFacts {
  characterId: string;
  helpDistanceMinutes?: number;     // derived from topology, Machine-known
  witnessesPresent: string[];       // characterIds, Machine-known from cast presence
  signalAvailable: boolean;         // phone/radio reachability, Machine-known
  extraordinaryInterventionAvailable: boolean; // explicit: trauma surgeon on scene, etc. (ChatGPT R2)
  evaluatedAtFictionalTime: number; // fictional SECONDS
}

export type DeathVerdict = 'ALIVE' | 'DEATH';

export interface DeathRecord {
  id: string;
  characterId: string;
  characterName: string;
  woundFactIds: string[];           // the facts the verdict rested on (audit trail)
  primaryWoundFactId: string;       // the deterministically primary causal wound (ChatGPT R2)
  valence: DeathValence;            // derived from the primary wound
  declaredAtTurn: number;
  declaredAtFictionalTime: number;  // fictional SECONDS
  isPovDeath: boolean;
  isSacrifice: boolean;
  sacrificeForCharacterId?: string;
  causedByCharacterId?: string;     // the killer, from the primary wound's inflictedBy
}

export interface Chronicle {
  scenarioTitle: string;
  turnCount: number;
  fictionalDurationText: string;
  castFates: Array<{ name: string; fate: string }>;
  cohortPhaseHistory: string[];     // phase per beat, from the phase ledger
  deaths: DeathRecord[];
  keyEvidence: string[];            // evidence labels that mattered
  closingLine: string;              // one plain sentence. No purple.
}

/** Scenario-contract additions (Forge schema, §11). */
export const DeathMetaphysicsSchema = z.enum(['mundane', 'zombie', 'cosmic']);
export type DeathMetaphysics = z.infer<typeof DeathMetaphysicsSchema>;

export const SuccessionPolicySchema = z.enum(['recruit', 'dormant', 'collapse']);
export type SuccessionPolicy = z.infer<typeof SuccessionPolicySchema>;

export const DeathContractSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>;
      const meta = v.deathMetaphysics ?? v.metaphysics ?? 'mundane';
      return {
        ...v,
        deathMetaphysics: meta,
        metaphysics: meta,
      };
    }
    return val;
  },
  z.object({
    metaphysics: DeathMetaphysicsSchema.default('mundane'),
    deathMetaphysics: DeathMetaphysicsSchema.default('mundane'),
    powerBudget: z.string().trim().min(1, 'Power budget is required'),
    seatSuccession: z.record(z.string(), SuccessionPolicySchema).optional().default({}),
  })
);
export interface DeathContract {
  metaphysics?: DeathMetaphysics;
  deathMetaphysics?: DeathMetaphysics;
  powerBudget: string;
  seatSuccession: Record<string, SuccessionPolicy>;
}

export interface DeathReceipt {
  record: DeathRecord;
  cohortDisruptionShockApplied?: boolean;
  successionPolicyApplied?: SuccessionPolicy;
  corpseEvidenceNodeId?: string;
  pressureEventEmitted?: boolean;
  janitorialCompleted?: boolean;
  povTerminationTriggered?: boolean;
}
