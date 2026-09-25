import { Chronicle, DeathRecord } from '../types/death';

export interface BuildChronicleInput {
  scenarioTitle: string;
  turnCount: number;
  fictionalSeconds?: number;
  fictionalDurationText?: string;
  deathRecords: DeathRecord[];
  phaseHistory?: string[];
  evidence?: Array<string | { id?: string; label?: string; text?: string; description?: string }>;
  cast?: Array<{
    id: string;
    name?: string;
    starting_location?: string;
    locationNodeId?: string;
    [k: string]: unknown;
  }>;
  castPlacement?: Record<string, string>;
  closingLine?: string;
}

const DEFAULT_CLOSING_LINE = 'The record concludes without further testimony.';

/**
 * Validates closingLine according to §7 & §10:
 * - Single sentence
 * - <= 200 characters
 * - Zero Markdown or HTML markup
 */
export function validateClosingLine(line: string): { valid: boolean; reason?: string } {
  const trimmed = line.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Closing line cannot be empty.' };
  }
  if (trimmed.length > 200) {
    return {
      valid: false,
      reason: `Closing line exceeds 200 characters (length: ${trimmed.length}).`,
    };
  }
  // Check for HTML markup
  if (/<[^>]+>/g.test(trimmed)) {
    return { valid: false, reason: 'Closing line cannot contain HTML markup.' };
  }
  // Check for Markdown formatting: asterisks, underscores, hashes, backticks, brackets
  if (/[*_#`[\]]/.test(trimmed)) {
    return { valid: false, reason: 'Closing line cannot contain Markdown markup.' };
  }
  // Check for single sentence (no interior sentence terminators)
  const sentenceTerminators = trimmed.match(/[.!?]+(?:\s+|$)/g) || [];
  if (sentenceTerminators.length > 1) {
    return {
      valid: false,
      reason: 'Closing line must be a single sentence without multiple sentence breaks.',
    };
  }

  return { valid: true };
}

/**
 * Formats seconds into human-readable fictional duration.
 */
export function formatFictionalDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * 100% deterministic assembly of the run Chronicle in TypeScript (§10).
 */
export function buildChronicle(input: BuildChronicleInput): Chronicle {
  const deaths = [...input.deathRecords];
  const deadCharIds = new Set(deaths.map((d) => d.characterId));

  // 1. Cast fates: every cast member, one plain line each
  const castFates: Array<{ name: string; fate: string }> = [];
  const castMembers = input.cast || [];

  for (const c of castMembers) {
    const name = c.name || c.id;
    if (deadCharIds.has(c.id)) {
      const death = deaths.find((d) => d.characterId === c.id)!;
      const timeStr = formatFictionalDuration(death.declaredAtFictionalTime);
      castFates.push({
        name,
        fate: `Deceased (${death.valence}) at turn ${death.declaredAtTurn} [${timeStr}]`,
      });
    } else {
      const loc =
        input.castPlacement?.[c.id] ||
        c.locationNodeId ||
        c.starting_location ||
        'Unspecified location';
      castFates.push({
        name,
        fate: `Survived at node: ${loc}`,
      });
    }
  }

  // 2. Cohort phase history
  const cohortPhaseHistory = [...(input.phaseHistory || ['ONSET'])];

  // 3. Key evidence: labels of evidence nodes created or ingested, capped at 20
  const rawEvidence = input.evidence || [];
  const keyEvidence: string[] = [];
  for (const item of rawEvidence) {
    const label =
      typeof item === 'string'
        ? item
        : item.label || item.text || item.description || item.id || '';
    const clean = label.trim();
    if (clean && !keyEvidence.includes(clean)) {
      keyEvidence.push(clean);
      if (keyEvidence.length >= 20) break;
    }
  }

  // 4. Closing line: validated or fallback
  let closingLine = DEFAULT_CLOSING_LINE;
  if (input.closingLine) {
    const validation = validateClosingLine(input.closingLine);
    if (validation.valid) {
      closingLine = input.closingLine.trim();
    }
  }

  const durationText =
    input.fictionalDurationText ||
    formatFictionalDuration(input.fictionalSeconds ?? 0);

  return {
    scenarioTitle: input.scenarioTitle || 'Scenario',
    turnCount: input.turnCount,
    fictionalDurationText: durationText,
    castFates,
    cohortPhaseHistory,
    deaths,
    keyEvidence,
    closingLine,
  };
}

/**
 * Formats a Chronicle into clean Markdown (§10).
 */
export function formatChronicleToMarkdown(chronicle: Chronicle): string {
  const lines: string[] = [
    `# Chronicle: ${chronicle.scenarioTitle}`,
    `*Turns: ${chronicle.turnCount} | Fictional Duration: ${chronicle.fictionalDurationText}*`,
    '',
    '## Cast Fates',
  ];

  for (const fate of chronicle.castFates) {
    lines.push(`- **${fate.name}**: ${fate.fate}`);
  }

  lines.push('', '## Cohort Phase Progression');
  lines.push(chronicle.cohortPhaseHistory.join(' → '));

  lines.push('', '## Recorded Casualties');
  if (chronicle.deaths.length === 0) {
    lines.push('No deaths recorded.');
  } else {
    for (const d of chronicle.deaths) {
      lines.push(
        `- **${d.characterName}**: Declared ${d.valence} at turn ${d.declaredAtTurn} (primary causal wound: ${d.primaryWoundFactId})${d.isSacrifice ? ' [SACRIFICE]' : ''}`
      );
    }
  }

  lines.push('', '## Key Evidence Traces');
  if (chronicle.keyEvidence.length === 0) {
    lines.push('No critical evidence registered.');
  } else {
    for (const ev of chronicle.keyEvidence) {
      lines.push(`- ${ev}`);
    }
  }

  lines.push('', '---', '', chronicle.closingLine, '');

  return lines.join('\n');
}

/**
 * Downloads a Chronicle as a formatted Markdown file via the browser DOM.
 */
export function downloadChronicleAsMarkdown(chronicle: Chronicle, filename?: string): void {
  const md = formatChronicleToMarkdown(chronicle);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = chronicle.scenarioTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.setAttribute('download', filename || `chronicle-${safeTitle || 'scenario'}-${Date.now()}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

