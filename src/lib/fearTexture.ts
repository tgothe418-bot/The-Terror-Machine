/**
 * HG3 Packet T-01 — Fear Texture Injection (Spike/Dread Prose Differentiation)
 *
 * Classifies layer composition (spike/dread share) to provide descriptive
 * texture directives for LLM prose generation without leaking numeric magnitudes.
 *
 * Invariant: Pure module — no I/O, no provider imports, no state writes.
 * Must only be imported by fearEngine.ts (prompt path) and its tests.
 */

export const TEXTURE_DOMINANCE_THRESHOLD = 0.60;

export type FearTexture = 'SPIKE' | 'DREAD' | 'BLENDED';

export const TEXTURE_DIRECTIVES = {
  SPIKE: 'sharp, visceral, localized; sudden sensory interrupts, involuntary micro-movements.',
  DREAD: 'heavy, atmospheric; time slows, fixate on mundane detail.',
  SPIKE_CLAUSE: 'sharp, visceral, localized; sudden sensory interrupts, involuntary micro-movements',
  DREAD_CLAUSE: 'heavy, atmospheric; time slows, fixate on mundane detail',
} as const;

/**
 * Classifies fear texture based on the relative share of raw spike vs dread:
 * - share = spike / (spike + dread)
 * - share >= 0.60 -> SPIKE
 * - share <= 0.40 -> DREAD
 * - 0.40 < share < 0.60 -> BLENDED
 * - spike + dread <= 0 -> null
 *
 * Note: Consumes raw pre-scaling spike/dread pair. Invariant to uniform fearlessness scaling.
 */
export function classifyFearTexture(spike: number, dread: number): FearTexture | null {
  const safeSpike = typeof spike === 'number' && !Number.isNaN(spike) ? Math.max(0, spike) : 0;
  const safeDread = typeof dread === 'number' && !Number.isNaN(dread) ? Math.max(0, dread) : 0;
  const total = safeSpike + safeDread;

  if (total <= 0) {
    return null;
  }

  const share = safeSpike / total;

  if (share >= TEXTURE_DOMINANCE_THRESHOLD) {
    return 'SPIKE';
  }
  if (share <= 1 - TEXTURE_DOMINANCE_THRESHOLD) {
    return 'DREAD';
  }
  return 'BLENDED';
}

/**
 * Formats a single terse fear texture line for prompt injection.
 * BLENDED ordering: larger-share layer's clause renders first, joined by "; ".
 */
export function formatFearTextureLine(texture: FearTexture, spike: number, dread: number): string {
  if (texture === 'SPIKE') {
    return `[Fear texture: SPIKE-dominant (phasic) — ${TEXTURE_DIRECTIVES.SPIKE}]`;
  }

  if (texture === 'DREAD') {
    return `[Fear texture: DREAD-dominant (tonic) — ${TEXTURE_DIRECTIVES.DREAD}]`;
  }

  // BLENDED: determine ordering based on which layer has the larger share
  const safeSpike = typeof spike === 'number' && !Number.isNaN(spike) ? Math.max(0, spike) : 0;
  const safeDread = typeof dread === 'number' && !Number.isNaN(dread) ? Math.max(0, dread) : 0;

  if (safeDread >= safeSpike) {
    return `[Fear texture: BLENDED (tonic+phasic) — ${TEXTURE_DIRECTIVES.DREAD_CLAUSE}; ${TEXTURE_DIRECTIVES.SPIKE_CLAUSE}.]`;
  } else {
    return `[Fear texture: BLENDED (tonic+phasic) — ${TEXTURE_DIRECTIVES.SPIKE_CLAUSE}; ${TEXTURE_DIRECTIVES.DREAD_CLAUSE}.]`;
  }
}
