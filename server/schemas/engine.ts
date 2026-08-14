import { z } from 'zod';
import { EdgeKindSchema } from '../../src/types';

export const EngineTurnContextSchema = z.object({
  version: z.literal(1).default(1),
  scenario: z.object({
    id: z.string().optional(),
    title: z.string().default("Unknown Enclosure"),
    premise: z.string().default(""),
    worldRules: z.array(z.string()).default([]),
    setting: z.object({
      location: z.string().default("Unknown"),
      atmosphere: z.string().default(""),
      timePeriod: z.string().default("")
    }),
    startingVector: z.string().default("COGNITIVE"),
    startingTier: z.string().default("LATENT"),
    incitingIncident: z.string().default(""),
    pacingDirective: z.string().default(""),
    keyPlotElements: z.array(z.string()).default([])
  }),
  player: z.object({
    role: z.enum(["protagonist", "antagonist", "director", "witness", "possessed"]),
    characterId: z.string().nullable().optional(),
    name: z.string().default("Protagonist"),
    description: z.string().default(""),
    isEntity: z.boolean().default(false)
  }),
  cast: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string().default("Subject"),
    description: z.string().default(""),
    isEntity: z.boolean().default(false)
  })).default([]),
  topology: z.object({
    currentNodeId: z.string(),
    readableNodeLabel: z.string(),
    allowedOutgoingExits: z.array(z.object({
      from: z.string(),
      to: z.string(),
      kind: EdgeKindSchema,
      requires: z.array(z.string()).optional(),
      userInitiated: z.boolean().default(true)
    })).default([])
  }),
  runtime: z.object({
    phase: z.string().default("LATENT"),
    tension: z.number().default(0),
    coherence: z.number().default(1.0),
    reconciliationRevision: z.number().default(0),
    activeVector: z.string().default("COGNITIVE"),
    activeTier: z.string().default("LATENT"),
    activeFlags: z.array(z.string()).default([])
  })
});

export type EngineTurnContext = z.infer<typeof EngineTurnContextSchema>;

export const TurnRequestSchema = z.object({
  userAction: z.string().min(1, "User action is required"),
  recentHistory: z.string(),
  systemDirective: z.string(),
  isExpansionExpected: z.boolean(),
  stateContext: z.object({
    currentNodeId: z.string().nullable(),
    currentPhase: z.string(),
    tensionLevel: z.number(),
    reconciliationRevision: z.number()
  }),
  context: EngineTurnContextSchema
});

export const TransitionReceiptSchema = z.object({
  requestedNodeId: z.string().nullable(),
  accepted: z.boolean(),
  fromNodeId: z.string().nullable(),
  toNodeId: z.string().nullable(),
  reason: z.string().optional()
});

export type TransitionReceipt = z.infer<typeof TransitionReceiptSchema>;

export const TurnResultSchema = z.object({
  narrative_blocks: z.array(z.object({
    type: z.enum(['prose', 'dialogue', 'system_voice', 'environmental_description']),
    speaker: z.string().nullable().optional(),
    content: z.string()
  })).max(2),
  logic_state: z.object({
    current_phase: z.string(),
    requested_transition: z.string().nullable().optional().default(null),
    suggested_tension: z.number().int().min(0).max(10),
    intent_classification: z.string(),
    terminal_flags: z.array(z.string()),
    cast_deltas: z.array(z.object({
      character_id: z.string(),
      skepticism_delta: z.number()
    })).default([])
  }),
  topologyDelta: z.object({
    isExpansion: z.boolean(),
    newNodeDef: z.object({
      id: z.string(),
      geometry: z.string(),
      hazards: z.array(z.string()),
      exitVectors: z.array(z.object({
        direction: z.string(),
        targetNodeId: z.string()
      }))
    }).nullable().optional()
  }).nullable().optional()
});

export const TurnResponseSchema = TurnResultSchema.extend({
  transitionReceipt: TransitionReceiptSchema
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;
export type TurnResponse = z.infer<typeof TurnResponseSchema>;
