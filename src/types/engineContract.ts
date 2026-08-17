import { z } from 'zod';
import { ParticipationContextSchema } from './adLib';
export * from './adLib';

export const EdgeKindSchema = z.enum([
  'PHYSICAL',
  'FORCED_EVENT',
  'MEMORY_RECONSTRUCTION',
  'HISTORICAL_REFERENCE',
  'TERMINAL_EJECTION',
  'AUTHORED_PARADOX',
]);

export type EdgeKind = z.infer<typeof EdgeKindSchema>;

export const EngineTurnContextSchema = z.object({
  version: z.literal(1).default(1),
  scenario: z.object({
    id: z.string().optional(),
    title: z.string().default('Unknown Enclosure'),
    premise: z.string().default(''),
    worldRules: z.array(z.string()).default([]),
    setting: z.object({
      location: z.string().default('Unknown'),
      atmosphere: z.string().default(''),
      timePeriod: z.string().default(''),
    }),
    startingVector: z.string().default('COGNITIVE'),
    startingTier: z.string().default('LATENT'),
    incitingIncident: z.string().default(''),
    pacingDirective: z.string().default(''),
    keyPlotElements: z.array(z.string()).default([]),
  }),
  player: z.object({
    role: z.enum(['protagonist', 'antagonist', 'director', 'witness', 'possessed']),
    characterId: z.string().nullable().optional(),
    name: z.string().default('Protagonist'),
    description: z.string().default(''),
    isEntity: z.boolean().default(false),
  }),
  cast: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().default('Subject'),
        description: z.string().default(''),
        isEntity: z.boolean().default(false),
      })
    )
    .default([]),
  topology: z.object({
    currentNodeId: z.string(),
    readableNodeLabel: z.string(),
    allowedOutgoingExits: z
      .array(
        z.object({
          from: z.string(),
          to: z.string(),
          kind: EdgeKindSchema,
          requires: z.array(z.string()).optional(),
          userInitiated: z.boolean().default(true),
        })
      )
      .default([]),
  }),
  runtime: z.object({
    phase: z.string().default('LATENT'),
    tension: z.number().default(0),
    coherence: z.number().default(1.0),
    reconciliationRevision: z.number().default(0),
    activeVector: z.string().default('COGNITIVE'),
    activeTier: z.string().default('LATENT'),
    activeFlags: z.array(z.string()).default([]),
  }),
  participationContext: ParticipationContextSchema.optional(),
});

export type EngineTurnContext = z.infer<typeof EngineTurnContextSchema>;

export const TurnRequestSchema = z.object({
  userAction: z.string().min(1, 'User action is required'),
  recentHistory: z.string(),
  systemDirective: z.string(),
  isExpansionExpected: z.boolean(),
  stateContext: z.object({
    currentNodeId: z.string().nullable(),
    currentPhase: z.string(),
    tensionLevel: z.number(),
    reconciliationRevision: z.number(),
    activeVector: z.string().optional(),
    activeTier: z.string().optional(),
  }),
  context: EngineTurnContextSchema,
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;

export const TransitionReceiptSchema = z.object({
  requestedNodeId: z.string().nullable(),
  accepted: z.boolean(),
  fromNodeId: z.string().nullable(),
  toNodeId: z.string().nullable(),
  reason: z.string().optional(),
});

export type TransitionReceipt = z.infer<typeof TransitionReceiptSchema>;

export const NarrativeBlockSchema = z.object({
  type: z.preprocess((val) => {
    if (typeof val !== 'string') return 'prose';
    const lower = val.toLowerCase().trim();
    if (lower === 'dialog' || lower === 'dialogue') return 'dialogue';
    if (lower === 'system_alert' || lower === 'system' || lower === 'system_voice') return 'system_voice';
    if (lower === 'environmental' || lower === 'environmental_description' || lower === 'sensory') return 'environmental_description';
    if (lower === 'internal_monologue') return 'internal_monologue';
    if (lower === 'exposition' || lower === 'narration' || lower === 'action' || lower === 'prose') return 'prose';
    return lower || 'prose';
  }, z.string()),
  speaker: z.string().nullable().optional(),
  content: z.preprocess((val) => (val == null ? '' : String(val)), z.string()),
});

export type NarrativeBlock = z.infer<typeof NarrativeBlockSchema>;

export const TopologyDeltaSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return { isExpansion: false, newNodeDef: null };
  const obj = val as Record<string, unknown>;
  const isExpansion = Boolean(obj.isExpansion);
  const rawDef = obj.newNodeDef;
  if (!isExpansion || !rawDef || typeof rawDef !== 'object') {
    return {
      isExpansion: false,
      exitDirection: typeof obj.exitDirection === 'string' ? obj.exitDirection : null,
      newNodeDef: null,
    };
  }
  const def = rawDef as Record<string, unknown>;
  const rawExitVectors = Array.isArray(def.exitVectors) ? def.exitVectors : [];
  return {
    isExpansion: true,
    exitDirection: typeof obj.exitDirection === 'string' ? obj.exitDirection : null,
    newNodeDef: {
      id: String(def.id || `NODE_${Date.now()}`),
      geometry: String(def.geometry || 'Uncharted Chamber'),
      hazards: Array.isArray(def.hazards) ? def.hazards.map(String) : [],
      exitVectors: rawExitVectors
        .filter((ev): ev is Record<string, unknown> => Boolean(ev && typeof ev === 'object'))
        .map((ev) => ({
          direction: String(ev.direction || 'UNKNOWN'),
          targetNodeId: String(ev.targetNodeId || 'ORIGIN'),
          kind: ev.kind,
          requires: Array.isArray(ev.requires) ? ev.requires.map(String) : undefined,
          userInitiated: typeof ev.userInitiated === 'boolean' ? ev.userInitiated : true,
        })),
    },
  };
}, z.object({
  isExpansion: z.boolean(),
  exitDirection: z.string().nullable().optional(),
  newNodeDef: z
    .object({
      id: z.string(),
      geometry: z.string(),
      hazards: z.array(z.string()),
      exitVectors: z.array(
        z.object({
          direction: z.string(),
          targetNodeId: z.string(),
          kind: EdgeKindSchema.optional(),
          requires: z.array(z.string()).optional(),
          userInitiated: z.boolean().optional(),
        })
      ),
    })
    .nullable()
    .optional(),
}));

export type TopologyDelta = z.infer<typeof TopologyDeltaSchema>;

export const TurnResultSchema = z.object({
  narrative_blocks: z.preprocess((val) => {
    if (!Array.isArray(val)) return val;
    return val.map((item) => {
      if (typeof item === 'string') {
        return { type: 'prose', content: item };
      }
      if (item && typeof item === 'object') {
        return {
          type: item.type || 'prose',
          speaker: item.speaker ?? null,
          content: item.content ?? item.text ?? '',
        };
      }
      return item;
    });
  }, z.array(NarrativeBlockSchema)),
  engine_thoughts: z.preprocess((val) => (val == null ? undefined : String(val)), z.string().optional()),
  logic_state: z
    .object({
      current_phase: z.preprocess((val) => (val == null ? undefined : String(val)), z.string().optional()),
      requested_transition: z.preprocess((val) => {
        if (val == null || val === 'null' || val === 'none') return null;
        return String(val);
      }, z.string().nullable().optional().default(null)),
      suggested_tension: z.preprocess((val) => {
        if (typeof val === 'number') return Math.round(Math.max(0, Math.min(100, val)));
        if (typeof val === 'string') {
          const parsed = parseFloat(val);
          if (!isNaN(parsed)) return Math.round(Math.max(0, Math.min(100, parsed)));
        }
        return undefined;
      }, z.number().int().min(0).max(100).optional()),
      intent_classification: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim().length > 0) return val.trim();
        return 'PROSE_ADVANCE';
      }, z.string().default('PROSE_ADVANCE')),
      terminal_flags: z.preprocess((val) => {
        if (!Array.isArray(val)) return [];
        return val.map((f) => String(f)).filter(Boolean);
      }, z.array(z.string())).default([]),
      cast_deltas: z.preprocess((val) => {
        if (!Array.isArray(val)) return [];
        return val
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            character_id: String(item.character_id || item.id || ''),
            skepticism_delta:
              typeof item.skepticism_delta === 'number'
                ? item.skepticism_delta
                : parseFloat(item.skepticism_delta) || 0,
          }))
          .filter((item) => item.character_id.length > 0);
      }, z.array(
        z.object({
          character_id: z.string(),
          skepticism_delta: z.number(),
        })
      )).default([]),
      cast_ledger: z.array(z.any()).default([]),
      inventory: z.array(z.string()).optional(),
      player_injuries: z.array(z.string()).optional(),
      lore_and_memory: z.any().optional(),
      npc_fixations: z.array(z.string()).optional(),
      psychological_status: z.string().optional(),
      matrix_mutation: z
        .object({
          next_vector: z.string().optional(),
          next_tier: z.string().optional(),
          increment_rooms: z.boolean().optional(),
          note: z.string().optional(),
        })
        .nullable()
        .optional(),
      matrix_shift: z
        .object({
          next_vector: z.string().optional(),
          next_tier: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .transform((val) => {
      if (!val.matrix_mutation && val.matrix_shift) {
        return {
          ...val,
          matrix_mutation: {
            next_vector: val.matrix_shift.next_vector,
            next_tier: val.matrix_shift.next_tier,
          },
        };
      }
      return val;
    }),
  topologyDelta: TopologyDeltaSchema.nullable().optional(),
});

export type TurnResult = z.infer<typeof TurnResultSchema>;

export const TurnResponseSchema = TurnResultSchema.extend({
  transitionReceipt: TransitionReceiptSchema.optional(),
});

export type TurnResponse = z.infer<typeof TurnResponseSchema>;
