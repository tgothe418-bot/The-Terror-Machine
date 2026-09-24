import crypto from 'node:crypto';
import type { WindowPlan } from './windowPlanner';

export interface PinnedModelConfig {
  provider: 'gemini' | 'zai' | 'hemmingway' | 'local';
  modelId: string;
}

export interface SweepJobLedger {
  jobId: string;
  sourceBinding: string;
  sourceDigest: string;
  status: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  modelConfig: PinnedModelConfig;
  totalWindows: number;
  completedWindows: number;
  discoveredCandidates: number;
  quarantinedCandidates: number;
  quarantineRecords: Array<{ reason: string; raw: unknown }>;
  isCancelled: boolean;
}

export const activeJobs = new Map<string, SweepJobLedger>();

export function createSweepJob(
  sourceBinding: string,
  sourceDigest: string,
  totalWindows: number,
  modelConfig: PinnedModelConfig
): SweepJobLedger {
  const jobId = crypto.randomUUID();
  const job: SweepJobLedger = {
    jobId,
    sourceBinding,
    sourceDigest,
    status: 'queued',
    modelConfig,
    totalWindows,
    completedWindows: 0,
    discoveredCandidates: 0,
    quarantinedCandidates: 0,
    quarantineRecords: [],
    isCancelled: false,
  };
  activeJobs.set(jobId, job);
  return job;
}

export function getSweepJob(jobId: string): SweepJobLedger | undefined {
  return activeJobs.get(jobId);
}

export function cancelSweepJob(jobId: string): boolean {
  const job = activeJobs.get(jobId);
  if (!job || job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled' || job.isCancelled) {
    return false;
  }
  job.isCancelled = true;
  job.status = 'cancelled';
  return true;
}

export function clearSweepJobs(): void {
  activeJobs.clear();
}

/**
 * Resolves exact sourceRange within full text by locating evidence quote substring
 */
export function resolveEvidenceSourceRange(
  windowText: string,
  windowSourceStart: number,
  excerpt?: string
): { start: number; end: number } | undefined {
  if (!excerpt || typeof excerpt !== 'string') return undefined;
  const trimmed = excerpt.trim();
  if (!trimmed) return undefined;
  const index = windowText.indexOf(trimmed);
  if (index === -1) return undefined;
  return {
    start: windowSourceStart + index,
    end: windowSourceStart + index + trimmed.length,
  };
}

export type SweepLens = 'COMBINED' | 'TOPOLOGY' | 'CAST' | 'TRAITS' | 'CLOCKS_HAZARDS_OBJECTS';

/**
 * Generates prompt for a forensic sweep window under a specified lens
 */
export function buildSweepPrompt(
  window: WindowPlan,
  lens: SweepLens,
  existingChambers: string[] = [],
  existingCast: string[] = []
): string {
  const negativeChambersText = existingChambers.length > 0 ? existingChambers.join(', ') : '(None yet established)';
  const negativeCastText = existingCast.length > 0 ? existingCast.join(', ') : '(None yet established)';

  const lensDirectives: Record<SweepLens, string> = {
    COMBINED: `Scan for high-density uncaptured scenario elements:
1. SECONDARY & INCIDENTAL CAST: Orderlies, security personnel, technicians, secondary victims, witnesses, or entities.
2. SUB-CHAMBERS & ACCESS ROUTES: Maintenance corridors, ventilation ducts, elevator shafts, locked evidence lockers, decontamination showers, hidden crawlspaces.
3. ENVIRONMENTAL HAZARDS & RULES: Toxic atmospheric venting, failing emergency relays, biohazard leaks, sensory deprivation, cryogenic fluids.
4. PSYCHOLOGICAL SECRETS & VALUE ANCHORS: Covert motives, guilt, paranoia, personal keepsakes, or traumatic histories.
5. UNKNOWNS / AMBIGUITIES: Epistemic uncertainties or unexplained phenomena.`,
    TOPOLOGY: `Scan EXCLUSIVELY for spatial topography, sub-chambers, ventilation ducts, crawlspaces, locked storage, and access paths.`,
    CAST: `Scan EXCLUSIVELY for uncaptured secondary characters, technicians, orderlies, guards, missing victims, or peripheral entities.`,
    TRAITS: `Scan EXCLUSIVELY for character traits, psychological secrets, phobias, covert motives, and value anchors.`,
    CLOCKS_HAZARDS_OBJECTS: `Scan EXCLUSIVELY for environmental rules, countdown hazards, mechanical failures, and physical artifacts/relics.`,
  };

  return `You are the Forge Deep Forensic Sweep Architect for The Terror Machine.
Perform forensic extraction on Window [${window.windowIndex + 1}/${window.windowCount}] under the [${lens}] lens.

ALREADY CAPTURED SCENARIO ELEMENTS (DO NOT DUPLICATE OR RE-EXTRACT THESE):
- Already Captured Chambers/Rooms: [${negativeChambersText}]
- Already Captured Cast Members: [${negativeCastText}]

EXTRACTION FOCUS:
${lensDirectives[lens] || lensDirectives.COMBINED}

WINDOW SOURCE TEXT (Tokens ~${window.tokenRange.start}-${window.tokenRange.end}):
${window.text}

OUTPUT FORMAT:
Return a single valid JSON object:
{
  "summary": "Forensic sweep summary for this window...",
  "evidence": [
    {
      "id": "ev-w${window.windowIndex + 1}-1",
      "category": "cast",
      "claim": "Specific factual claim from reference text",
      "excerpt": "Direct textual quote"
    }
  ],
  "candidates": [
    {
      "id": "cand-w${window.windowIndex + 1}-1",
      "classification": "evidence",
      "target": "topology_node",
      "label": "Evocative human-readable name",
      "explanation": "Why this element matters to the scenario",
      "evidenceIds": ["ev-w${window.windowIndex + 1}-1"],
      "proposedValue": { "id": "snake_case_id", "name": "Chamber Name", "label": "Chamber Name", "description": "Atmospheric sensory description..." }
    }
  ],
  "unknowns": [
    {
      "id": "unk-w${window.windowIndex + 1}-1",
      "category": "threat",
      "question": "Unresolved ambiguity question",
      "targetEffect": "What this ambiguity affects in the simulation"
    }
  ]
}

TARGET PROPOSED VALUE FORMATS:
- For "cast_seed": { "name": "...", "role": "...", "description": "...", "personality": "...", "goals": "...", "traits": ["..."], "disposition": "SURVIVOR", "isEntity": false, "behaviorVector": "DEFENSIVE_EVASION" }
- For "topology_node": { "id": "snake_case_id", "name": "Chamber Name", "label": "Chamber Name", "description": "Atmospheric sensory description..." }
- For "topology_connection": { "from": "source_node_id", "to": "target_node_id", "label": "Corridor description", "bidirectional": true }
- For "environmental_rule": "String describing atmospheric or environmental rule"
- For "narrative_rule": "String describing narrative law or thematic restraint"
- For "value_anchor": { "anchor": "...", "significance": "..." }

Return valid JSON ONLY.`;
}
