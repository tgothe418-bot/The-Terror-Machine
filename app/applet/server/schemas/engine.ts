import { z } from 'zod';

export const EventSpecificationSchema = z.object({
  stateDeltas: z.object({
    frictionModifier: z.number(),
    threatScaleShift: z.number(),
    panicTrigger: z.boolean(),
  }),
  topologyDelta: z.object({
    isExpansion: z.boolean(),
    newNodeDef: z.object({
      id: z.string(),
      geometry: z.string(),
      hazards: z.array(z.string()),
      exitVectors: z.array(z.object({
        direction: z.string(),
        targetNodeId: z.string(),
      })),
    }).optional(),
  }).refine((data) => {
    if (data.isExpansion && !data.newNodeDef) {
      return false;
    }
    return true;
  }, {
    message: "newNodeDef is required when isExpansion is true",
    path: ["newNodeDef"],
  }),
  narrativeMandate: z.object({
    outcome: z.enum(['SUCCESS', 'FAILURE', 'AGONIZING_CHOICE', 'REVELATION']),
    realityState: z.enum(['STABLE', 'DEGRADING', 'HALLUCINATORY']),
    sensoryPriority: z.string(),
    pacingRule: z.string(),
  }),
});

export type EventSpecification = z.infer<typeof EventSpecificationSchema>;
