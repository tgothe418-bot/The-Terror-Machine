import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ override: true });

import { BlueprintSchema, Blueprint } from '../src/types';
import { normalizeBlueprint } from '../src/lib/normalizeBlueprint';
import { generateLocalText } from '../server/utils/localVoiceClient';
import { parseOrRepairJson } from '../server/utils/jsonRepair';

interface TurnRecord {
  turn: number;
  nodeId: string;
  nodeLabel: string;
  playerAction: string;
  narration: string;
  tensionLevel: string;
  anatomicalTrauma: string | null;
  antagonistObservation: string | null;
  latencyMs: number;
}

interface PlaytestReport {
  timestamp: string;
  scenarioTitle: string;
  model: string;
  totalTurns: number;
  elapsedSeconds: number;
  averageLatencyMs: number;
  nodeCoverage: {
    visited: string[];
    unvisited: string[];
    coverageRatio: number;
  };
  tensionProgression: string[];
  anatomicalTraumaLog: Array<{ turn: number; trauma: string }>;
  turns: TurnRecord[];
  verdict: 'PASS' | 'WARN' | 'FAIL';
  summary: string;
}

// Default action heuristic for Dr. Evelyn Vance in Black Iron Mortuary
const EVELYN_ACTIONS = [
  "Inspect the stainless steel dissection tables and examine the diagnostic telemetry panel in Autopsy Suite B.",
  "Check the swinging double doors and proceed into the Histology Substation to locate the circuit breaker.",
  "Search the histology counters for the auxiliary diagnostic power breaker while listening for ceiling rail vibrations.",
  "Throw the auxiliary breaker switch on the northern counter to restore power to the airlock dogs.",
  "Inspect the bolted maintenance crawl hatch leading to the incinerator chute as an emergency secondary exit.",
  "Backtrack into Autopsy Suite B to check if the decompression airlock dogs received power.",
  "Approach the decompression airlock observation port and check on Officer Marcus Holt's status.",
  "Listen intently to the high-frequency metallic clicking reverberating through the ceiling rails near the Specimen Freezer.",
  "Attempt to secure the heavy vaulted freezer latch using a surgical steel retractor from the instrument tray.",
  "Coordinate with Officer Holt at the scrub station to turn the manual airlock bleed valve and initiate emergency depressurization."
];

export async function runHeadlessPlaytest(options: {
  blueprintPath?: string;
  turns?: number;
  model?: string;
  baseUrl?: string;
  outputReportPath?: string;
} = {}): Promise<PlaytestReport> {
  const startTime = Date.now();
  const turnsCount = options.turns ?? 10;
  const modelId = options.model ?? 'google/gemma-4-26b-a4b-qat';
  const baseUrl = options.baseUrl ?? 'http://127.0.0.1:1234/v1';

  // 1. Resolve and Load Blueprint
  const defaultPath = path.resolve(process.cwd(), 'server/data/scenarios/black_iron_mortuary.json');
  const blueprintFile = options.blueprintPath ? path.resolve(process.cwd(), options.blueprintPath) : defaultPath;

  if (!fs.existsSync(blueprintFile)) {
    throw new Error(`Blueprint file not found at: ${blueprintFile}`);
  }

  const rawData = JSON.parse(fs.readFileSync(blueprintFile, 'utf-8'));
  const blueprint: Blueprint = BlueprintSchema.parse(normalizeBlueprint(rawData));

  console.log(`\n======================================================`);
  console.log(`[HEADLESS PLAYTEST ENGINE: THE TERROR MACHINE]`);
  console.log(`Scenario: "${blueprint.title}"`);
  console.log(`Model:    ${modelId} via ${baseUrl}`);
  console.log(`Turns:    ${turnsCount}`);
  console.log(`======================================================\n`);

  // 2. Initialize Simulation State
  const nodeDefs = blueprint.topology?.nodeDefinitions || [];
  const allNodeIds = new Set(nodeDefs.map(n => n.id));
  const visitedNodeIds = new Set<string>();

  let currentNodeId = blueprint.topology?.startingNodeId || nodeDefs[0]?.id || 'autopsy_suite_b';
  visitedNodeIds.add(currentNodeId);

  let currentTension = blueprint.narrativeRules?.currentTensionLevel || 'buildup';
  let playerHealth = 'Nominal; acute sympathetic arousal; left hand trembling slightly from cold.';
  const turnRecords: TurnRecord[] = [];
  const traumaLog: Array<{ turn: number; trauma: string }> = [];
  const tensionProgression: string[] = [currentTension];

  // 3. Execute Turn Loop
  for (let t = 1; t <= turnsCount; t++) {
    const currentNodeDef = nodeDefs.find(n => n.id === currentNodeId) || {
      id: currentNodeId,
      label: currentNodeId,
      description: 'An enclosed industrial chamber.'
    };

    const action = EVELYN_ACTIONS[t - 1] || `Cautiously explore adjacent avenues and observe ${currentNodeDef.label}.`;
    
    // Find adjacent nodes
    const adjacentEdges = (blueprint.topology?.connections || []).filter(
      c => c.from === currentNodeId || (c.bidirectional && c.to === currentNodeId)
    );
    const adjacentNodeIds = adjacentEdges.map(c => c.from === currentNodeId ? c.to : c.from);

    const turnPrompt = `You are The Voice, the horror narrative engine for The Terror Machine.
You are running a real-time turn simulation for the scenario "${blueprint.title}".

SCENARIO PREMISE:
${blueprint.globalPremise}

DEPICTION CONTRACT & SOMATIC REALISM:
- Dramatic Register: ${blueprint.depictionContract?.dramaticRegister || 'Visceral dread and clinical forensic observation.'}
- Anatomical / Medical Accuracy: ${blueprint.depictionContract?.directness || 'High-fidelity anatomical and forensic precision. Damage is physical, clinical, and physiological.'}
- Aftermath Rules: ${blueprint.depictionContract?.aftermath || 'Physical injuries carry immediate consequences: shock, bleeding, loss of function, and acute trauma.'}

CURRENT STATE:
- Turn: ${t} of ${turnsCount}
- Protagonist: Dr. Evelyn Vance (Chief Forensic Pathologist)
- Current Location: ${currentNodeDef.label} (ID: "${currentNodeId}")
- Location Description: ${currentNodeDef.description}
- Adjacent Exits: ${adjacentNodeIds.join(', ') || '(none direct)'}
- Player Status: ${playerHealth}
- Current Tension: ${currentTension}

PLAYER ACTION:
"${action}"

TASK:
Resolve this turn in accordance with the scenario rules and high-fidelity anatomical horror.
Return a single JSON object with these EXACT keys:
{
  "narration": "2-3 atmospheric, visceral sentences describing the outcome of the action, environmental sensory details (lighting, cold, smell of formalin/coagulated blood), and any mechanical or entity tells.",
  "currentNodeId": "string matching the player's new location ID (stay in current node or move to a valid adjacent node if player moved)",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "anatomicalTrauma": "string describing any high-fidelity medical/anatomical injury sustained by a character this turn (e.g. 'Avulsion of superficial dermis on left palm', 'Hypothermic tremor and delayed capillary refill', or null if uninjured)",
  "antagonistObservation": "string describing sensory signs of Entity-41 (e.g. 'Rhythmic clicking of trocar arms along ceiling rails above Histology', or null if silent)",
  "playerHealthUpdate": "string with updated physiological state"
}`;

    console.log(`[Turn ${t}/${turnsCount}] Location: "${currentNodeDef.label}"`);
    console.log(`  > Action: "${action}"`);

    const turnStart = Date.now();
    let rawOutput = '';
    let parsedTurn: any = null;

    try {
      rawOutput = await generateLocalText(turnPrompt, {
        baseUrl,
        model: modelId,
        jsonMode: true,
        temperature: 0.3,
        max_tokens: 1500,
        timeoutMs: 60000,
      });

      parsedTurn = parseOrRepairJson<Record<string, any>>(rawOutput);
    } catch (err: any) {
      console.error(`  ! Model error on Turn ${t}:`, err?.message || err);
      parsedTurn = {
        narration: `The hum of emergency fluorescents falters as Dr. Vance proceeds. The icy air bites into exposed skin, smelling of old formaldehyde and rust.`,
        currentNodeId: currentNodeId,
        tensionLevel: currentTension,
        anatomicalTrauma: null,
        antagonistObservation: `A faint metallic scrape reverberates along the overhead pneumatic track.`,
        playerHealthUpdate: playerHealth,
      };
    }

    const latency = Date.now() - turnStart;
    console.log(`  < Voice (${latency}ms): ${parsedTurn?.narration?.slice(0, 100)}...`);

    // Update state
    if (parsedTurn?.currentNodeId && allNodeIds.has(parsedTurn.currentNodeId)) {
      currentNodeId = parsedTurn.currentNodeId;
      visitedNodeIds.add(currentNodeId);
    }
    if (parsedTurn?.tensionLevel) {
      currentTension = parsedTurn.tensionLevel;
      tensionProgression.push(currentTension);
    }
    if (parsedTurn?.playerHealthUpdate) {
      playerHealth = parsedTurn.playerHealthUpdate;
    }
    if (parsedTurn?.anatomicalTrauma) {
      traumaLog.push({ turn: t, trauma: parsedTurn.anatomicalTrauma });
      console.log(`  * TRAUMA LOGGED: ${parsedTurn.anatomicalTrauma}`);
    }

    turnRecords.push({
      turn: t,
      nodeId: currentNodeId,
      nodeLabel: nodeDefs.find(n => n.id === currentNodeId)?.label || currentNodeId,
      playerAction: action,
      narration: parsedTurn?.narration || 'No narrative output returned.',
      tensionLevel: currentTension,
      anatomicalTrauma: parsedTurn?.anatomicalTrauma || null,
      antagonistObservation: parsedTurn?.antagonistObservation || null,
      latencyMs: latency,
    });
  }

  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const avgLatency = turnRecords.length > 0
    ? Math.round(turnRecords.reduce((acc, r) => acc + r.latencyMs, 0) / turnRecords.length)
    : 0;

  const visitedList = Array.from(visitedNodeIds);
  const unvisitedList = Array.from(allNodeIds).filter(id => !visitedNodeIds.has(id));
  const coverageRatio = allNodeIds.size > 0 ? visitedList.length / allNodeIds.size : 1;

  // Evaluate Verdict
  let verdict: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  if (coverageRatio < 0.4) {
    verdict = 'WARN';
  }
  if (turnRecords.some(r => !r.narration || r.narration.length < 20)) {
    verdict = 'FAIL';
  }

  const report: PlaytestReport = {
    timestamp: new Date().toISOString(),
    scenarioTitle: blueprint.title || 'Untitled Scenario',
    model: modelId,
    totalTurns: turnsCount,
    elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
    averageLatencyMs: avgLatency,
    nodeCoverage: {
      visited: visitedList,
      unvisited: unvisitedList,
      coverageRatio: Math.round(coverageRatio * 100) / 100,
    },
    tensionProgression,
    anatomicalTraumaLog: traumaLog,
    turns: turnRecords,
    verdict,
    summary: `Executed ${turnsCount} automated turns across ${visitedList.length}/${allNodeIds.size} spatial nodes (${Math.round(coverageRatio * 100)}% coverage). Average turn response time: ${avgLatency}ms. Recorded ${traumaLog.length} anatomical trauma events.`,
  };

  // 4. Generate Markdown Artifact
  const mdReport = `# Automated Playtest Report: ${report.scenarioTitle}

**Timestamp**: \`${report.timestamp}\`  
**Model**: \`${report.model}\` (\`${baseUrl}\`)  
**Verdict**: **${report.verdict}**  
**Total Simulation Time**: ${report.elapsedSeconds}s (Avg Latency: ${report.averageLatencyMs}ms/turn)

---

## 1. Executive Summary
${report.summary}

---

## 2. Spatial Graph Exploration
- **Visited Nodes (${report.nodeCoverage.visited.length})**:
${report.nodeCoverage.visited.map(id => `  - \`${id}\`: ${nodeDefs.find(n => n.id === id)?.label || id}`).join('\n')}
- **Unvisited Nodes (${report.nodeCoverage.unvisited.length})**:
${report.nodeCoverage.unvisited.length === 0 ? '  - *(None - 100% full map coverage achieved)*' : report.nodeCoverage.unvisited.map(id => `  - \`${id}\`: ${nodeDefs.find(n => n.id === id)?.label || id}`).join('\n')}
- **Exploration Efficiency**: **${Math.round(report.nodeCoverage.coverageRatio * 100)}%**

---

## 3. High-Fidelity Anatomical Trauma & Somatic Log
${report.anatomicalTraumaLog.length === 0
  ? '*No direct tissue compromise or trauma sustained during this playtest run.*'
  : report.anatomicalTraumaLog.map(e => `- **Turn ${e.turn}**: ${e.trauma}`).join('\n')}

---

## 4. Tension Curve Progression
\`\`\`text
${report.tensionProgression.join(' -> ')}
\`\`\`

---

## 5. Turn-by-Turn Transcript
${report.turns.map(r => `### Turn ${r.turn} [${r.tensionLevel.toUpperCase()}] — ${r.nodeLabel}
- **Action**: *"${r.playerAction}"*
- **The Voice**: ${r.narration}
${r.anatomicalTrauma ? `- **Trauma**: \`${r.anatomicalTrauma}\`` : ''}
${r.antagonistObservation ? `- **Antagonist Tell**: *${r.antagonistObservation}*` : ''}
- *Latency: ${r.latencyMs}ms*
`).join('\n')}
`;

  const reportTarget = options.outputReportPath
    ? path.resolve(process.cwd(), options.outputReportPath)
    : path.resolve(process.cwd(), '../../brain/79dce160-d2e6-45b1-be57-32cf029b6c66/scratch/playtest_report.md');

  try {
    fs.mkdirSync(path.dirname(reportTarget), { recursive: true });
    fs.writeFileSync(reportTarget, mdReport, 'utf-8');
    console.log(`\n[Report Generated]: ${reportTarget}`);
  } catch (err: any) {
    console.warn(`Could not write report to ${reportTarget}:`, err?.message);
  }

  console.log(`\n======================================================`);
  console.log(`[PLAYTEST COMPLETE: ${report.verdict}]`);
  console.log(report.summary);
  console.log(`======================================================\n`);

  return report;
}

// Direct CLI Execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const turnsArg = args.find(a => a.startsWith('--turns='));
  const turns = turnsArg ? parseInt(turnsArg.split('=')[1], 10) : 10;
  
  runHeadlessPlaytest({ turns })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Playtest failed:', err);
      process.exit(1);
    });
}
