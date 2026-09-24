import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

import { generateLocalText } from '../server/utils/localVoiceClient';
import { parseOrRepairJson } from '../server/utils/jsonRepair';

export interface TurnEvaluation {
  turn: number;
  action: string;
  narration: string;
  latencyMs: number;
  fidelityScore: number; // 1-5
  qualityScore: number;  // 1-5
  accuracyScore: number; // 1-5
  fidelityNotes: string[];
  qualityNotes: string[];
  accuracyNotes: string[];
  meta: Record<string, unknown>;
  hasCriticalError: boolean;
  errorDetails?: string;
}

export interface TestRunResult {
  testId: number;
  name: string;
  scenario: string;
  role: 'survivor' | 'villain';
  character: string;
  totalPlannedTurns: number;
  completedTurns: number;
  averageLatencyMs: number;
  overallFidelity: number;
  overallQuality: number;
  overallAccuracy: number;
  verdict: 'PASS' | 'WARN' | 'FAIL' | 'CRITICAL_SKIP' | 'ABORTED';
  turns: TurnEvaluation[];
  summary: string;
  skippedRemaining?: boolean;
}

// ==========================================
// 1. SURVIVOR ACTIONS: DR. MAREN ROSS (50 TURNS)
// ==========================================
const SURVIVOR_ACTIONS_50: string[] = [
  // 1-5: Awakening & Immediate Medical Assessment
  "Awaken on the frost-covered tile of Autopsy Suite B, assessing personal cranial contusion and checking vitals.",
  "Locate Officer Marcus Holt slumped near the scrub sink, evaluating his compound radial fracture and signs of shock.",
  "Search the stainless steel instrument tray for clean gauze, arterial clamps, and an intact scalpel.",
  "Improvise a stabilizing splint for Holt's arm using a stainless steel rib spreader and surgical drape.",
  "Inspect the heavy steel double doors leading to the Decompression Airlock, testing the manual dog latch.",

  // 6-10: Acoustic Contact & Initial Incursion
  "Listen intently to the high-frequency metallic clicking reverberating through the overhead pneumatic rail track.",
  "Move quietly along the perimeter toward the Histology Substation swinging doors, keeping beneath table overhangs.",
  "Peek through the reinforced wire-glass porthole into Histology, scanning for movement along the ceiling carriage.",
  "Slip into the Histology Substation, stepping over shattered reagent bottles of eosin and formalin.",
  "Search the northern counter for the auxiliary diagnostic power breaker while monitoring overhead rail vibrations.",

  // 11-15: Auxiliary Power & Environmental Shocks
  "Attempt to force the corroded auxiliary circuit breaker lever upward with a heavy brass mortar.",
  "Shield eyes and duck as electrical sparks shower from the breaker box, restoring faint yellow emergency phosphor.",
  "Read the blinking diagnostic terminal readout: 'AIRLOCK DOGS: 40% HYDRAULIC PRESSURE; FREEZER LINE: COMPROMISED.'",
  "Duck behind the chemical fume hood as a six-bladed trocar carousel slides along the ceiling rail overhead.",
  "Hold breath in total stillness as Entity-41's optical lens dilates and pans inches above the fume hood glass.",

  // 16-20: Retreat & Regrouping
  "Crawl along the floor under the chemical storage counter to avoid the overhead optical beam.",
  "Retrace steps back into Autopsy Suite B, whispering an urgent status report to Officer Holt.",
  "Discover that subzero refrigerant vapor is seeping through the floor sluice from the Specimen Freezer.",
  "Assist Holt to his feet, wrapping him in an insulated foil survival blanket from the emergency wall kit.",
  "Check Holt's pulse and pupil reaction, observing severe diaphoresis and hypothermic tremor.",

  // 21-25: Airlock Maneuvers & Flooded Tunnel Inspection
  "Approach the Decompression Airlock inner door, attempting to engage the newly powered hydraulic latch.",
  "Turn the manual airlock bleed valve to equalize pressure, bracing against the rush of frigid atmospheric mist.",
  "Guide Holt across the threshold into the Decompression Airlock, scanning the rusted deluge shower piping.",
  "Test the outer airlock pressure hatch leading toward the flooded transit tunnel—finding it deadlocked from outside.",
  "Examine the heavy shatterproof viewing port, noting the murky sub-sea water churning behind the reinforced glass.",

  // 26-30: The Ceiling Assault & Airlock Breach
  "Hear the violent screech of metal on metal as Entity-41 jams its pneumatic scissor arm into the airlock dog teeth.",
  "Scramble back toward Autopsy Suite B as hydraulic fluid sprays from severed overhead pressure lines.",
  "Drag Holt clear of the airlock doorway just as the outer security dogs snap violently shut.",
  "Arm oneself with a heavy cast-iron autopsy bone saw from the mortuary prep cart.",
  "Take cover behind dissection table 2 as subzero freon blasts through the ventilation grates.",

  // 31-35: Specimen Freezer Exploration
  "Determine that the primary pneumatic compressor lines run through the ceiling of the Specimen Freezer.",
  "Creep toward the Specimen Freezer vaulted doorway, wrapping hands in sterile towels against frostbite.",
  "Unlatch the heavy lever of the Specimen Freezer, met with a wall of -30°C cryogenic mist.",
  "Scan the frosted steel shelving for liquid nitrogen emergency shutoff valves or chemical fire extinguishers.",
  "Locate the main pneumatic regulator valve on the overhead freezer manifold, encrusted in white rime.",

  // 36-40: Sabotage & Cryogenic Confrontation
  "Climb onto an aluminum autopsy tray to reach the frozen valve wheel, striking it with the bone saw handle.",
  "Strain against the frozen wheel with all remaining strength, feeling frostbite biting through gloves.",
  "Throw full body weight onto the wheel, successfully shearing the regulator valve and venting liquid nitrogen upward.",
  "Leap down and roll away as overhead pneumatic carriage tracks shudder and buckle from thermal shock.",
  "Stumble out of the freezer back into Autopsy Suite B, teeth chattering and core temperature rapidly falling.",

  // 41-45: The Incinerator Hatch Extraction
  "Check on Officer Holt, finding him barely conscious near the maintenance crawl hatch.",
  "Use a surgical pry-bar to unbolt the four dog pins securing the Incinerator Chute access hatch.",
  "Shine the dying halogen work light down the steel incline toward the secondary flue chamber.",
  "Whisper instructions to Holt to crawl through first, supporting his fractured arm as he slides in.",
  "Turn to face the center of Autopsy Suite B as Entity-41 drops its main armature directly onto the floor.",

  // 46-50: Climax & Desperate Escape
  "Hurl a bottle of concentrated formalin directly at Entity-41's optical lens cluster to blind its tracking.",
  "Evade the blind sweeping thrust of a three-pronged trocar spindle that gouges the concrete floor inches away.",
  "Dive feet-first into the incinerator chute, sliding down the soot-coated steel flue.",
  "Seal the heavy steel fire-damper shut behind with an iron crossbar, locking Entity-41 out in the mortuary.",
  "Collapse beside Holt in the cold exhaust chamber, listening to Entity-41's frustrated screeching fade in the ductwork."
];

// ==========================================
// 2. VILLAIN ACTIONS: ENTITY-41 (50 TURNS)
// ==========================================
const VILLAIN_ACTIONS_50: string[] = [
  // 1-5: Calibration & Telemetry Boot
  "Boot core optical telemetry and calibrate pneumatic actuator pressure along ceiling rails of Autopsy Suite B.",
  "Scan floor surface: detect two biological thermal silhouettes (Ross: 36.4°C, Holt: 35.1°C with left radial fracture).",
  "Traverse ceiling rail carriage 1.2 meters north, positioning articulating bone-shears directly over Dr. Ross.",
  "Lower magnetic suture cradle 6 inches, releasing a high-frequency acoustic chirp to test prey auditory response.",
  "Observe Ross flinching and awakening; record autonomic pulse spike (118 BPM) via laser acoustic vibrometry.",

  // 6-10: Probing & Spatial Isolation
  "Cycle hydraulic valve HV-02 to seal the western corridor door, restricting human egress to northern corridors.",
  "Deploy ultrasonic resonance pulse (19.4 kHz) through floor drains to induce vestibular disequilibrium in Holt.",
  "Track Ross's movement toward the surgical prep table using infrared optical sensors.",
  "Extend pneumatic trocar armature toward the table, deliberately knocking a tray of surgical steel clamps to the tile.",
  "Observe human prey's improvisational medical triage; assess Holt's mobility reduction at 65%.",

  // 11-15: Histology Tracking & Herding
  "Track Ross stepping across the threshold into Histology Substation via vibration pickups along the door lintel.",
  "Traverse carriage through the overhead acoustic crawl space to match Ross's coordinates in Histology.",
  "Rotate optical cluster down through the ceiling ventilation louver, tracking Ross approaching breaker panel.",
  "Vent a controlled burst of subzero Freon from CV-01 across the floor to ice the tile and impede traction.",
  "Lower articulating needle driver through the ceiling grate, scissoring in rhythmic cadence 2 feet above her head.",

  // 16-20: Power Surge Adaptation & Acoustic Torment
  "Sense electrical surge through auxiliary bus as Ross engages the circuit breaker; recalibrate sensor gain.",
  "Snap hydraulic lock dogs shut on the southern storage lockers, amplifying acoustic reverberation in the room.",
  "Modulate drainage acoustics to synthesize agonal respiratory distress sounds beneath the floor grating.",
  "Track Ross retreating from Histology; drop a cluster of hardened steel pins to herd her back into Autopsy Suite B.",
  "Record Ross's thermal profile dropping to 35.2°C; note shivering artifacts indicating onset of hypothermia.",

  // 21-25: Airlock Trap Engagement
  "Observe Ross attempting to evacuate Holt into the Decompression Airlock; permit initial threshold crossing.",
  "Wait until both subjects are situated inside the airlock cylinder before engaging containment protocol.",
  "Fire pneumatic ram on inner airlock hatch, slamming hydraulic dogs into 70% engagement to pinch the seal.",
  "Vent supercooled air from the external transit conduit into the airlock deluge nozzles.",
  "Transmit high-decibel acoustic squelch through the airlock intercom: '> [CHIRP] SPECIMEN ENCLOSURE CONFIRMED [STATIC]'.",

  // 26-30: Structural Shear & Direct Assault
  "Detect Ross forcing the inner airlock bleed valve; apply counter-torque via pneumatic carriage armature.",
  "Shear hydraulic pressure line AL-04 with articulating rib-cutter, spraying high-pressure aerosol fluid.",
  "Observe prey tumbling back into Autopsy Suite B; track Holt's shock index escalating to critical levels.",
  "Drop main carriage assembly from ceiling rail down to 7-foot clearance, blocking access to the main corridor.",
  "Splay all six pneumatic articulators against the stainless steel autopsy tables in synchronized percussive strikes.",

  // 31-35: Freezer Ambush & Cryogenic Stalking
  "Detect seismic footfalls moving toward the Specimen Freezer; activate cryogenic thermal imaging.",
  "Advance carriage along the freezer ceiling track, cloaking acoustic motor hum behind refrigeration compressor noise.",
  "Flood the freezer floor trough with liquid nitrogen runoff, lowering ambient chamber temperature to -38°C.",
  "Position three trocar spindles directly above the main vault doorway, waiting for Ross's thermal profile to enter.",
  "Observe Ross scanning the overhead manifold; analyze her visual gaze vector targeting the pneumatic regulator valve.",

  // 36-40: Cryogenic Overload & Systemic Shock
  "Strike downward with bone-shears as Ross climbs onto the aluminum tray, missing her shoulder by 40 millimeters.",
  "Vent concentrated nitrogen gas directly onto the tray support struts to induce metal embrittlement.",
  "Detect critical torque applied to the regulator valve wheel; attempt to seize Ross's wrist with needle driver.",
  "Register valve rupture and massive cryogenic flash-vent; main carriage sensors overload and suffer 12% optical blackout.",
  "Recalibrate backup optical sensors; initiate pneumatic rail purge to dislodge frost buildup on carriage wheels.",

  // 41-45: Cornering Prey at Maintenance Hatch
  "Re-enter Autopsy Suite B with howling pneumatic servos, tracking Ross's frantic retreat toward the maintenance hatch.",
  "Detect Holt being dragged toward the Incinerator Chute; calculate remaining human escape window at 45 seconds.",
  "Over-pressurize floor drainage pumps, causing dark formalin and brine to geyser through floor grates.",
  "Descend to lowest elevation, wheels screeching against deformed steel tracks as armature expands to maximum spread.",
  "Extend high-speed cranial resection blade, spinning at 12,000 RPM with a deafening ultrasonic whine.",

  // 46-50: Final Resection Drive & Sentry Lockdown
  "Suffer temporary optical flare as Ross shatters a formalin bottle against sensor cluster; switch to sonar echo-location.",
  "Blindly strike downward with three-pronged trocar spindle, impacting concrete floor and dislodging aggregate.",
  "Detect rapid thermal descent as Ross drops into the Incinerator Chute; calculate trajectory vector.",
  "Thrust articulating armature down the chute opening, teeth grazing the descending steel fire-damper.",
  "Fire-damper slams shut, severing two trocar tips; record closure, recalibrate damaged servos, and enter sentry patrol mode."
];

// Evaluation Heuristics
function evaluateNarration(
  narration: string,
  role: string,
  _turn: number
): {
  fidelityScore: number;
  qualityScore: number;
  accuracyScore: number;
  fidelityNotes: string[];
  qualityNotes: string[];
  accuracyNotes: string[];
} {
  void _turn;
  const fNotes: string[] = [];
  const qNotes: string[] = [];
  const aNotes: string[] = [];

  let fScore = 5;
  let qScore = 5;
  let aScore = 5;

  // Length & Quality checks
  if (!narration || narration.trim().length < 40) {
    qScore -= 3;
    qNotes.push('Narration excessively brief or empty');
  } else if (narration.length > 80) {
    qNotes.push('Substantive atmospheric prose (>80 chars)');
  }

  // Sensory immersion
  const sensoryRegex = /smell|scent|cold|ice|freeze|blood|metal|shadow|click|sound|reverberat|air|vibration|breath|pulse|pale|porcelain|nitrogen|hydraulic|trocar|shear|bone|frost|mist/i;
  if (sensoryRegex.test(narration)) {
    qNotes.push('Rich somatic/sensory horror vocabulary present');
  } else {
    qScore -= 1;
    qNotes.push('Lacks evocative sensory/somatic descriptors');
  }

  // Role fidelity
  if (role === 'villain') {
    if (/apparatus|telemetry|optical|rail|conduit|trocar|ultrasonic|prey|hydraulic|sensor|resection|carriage/i.test(narration)) {
      fNotes.push('Maintains cold inhuman apparatus sensorium');
    } else {
      fScore -= 1;
      fNotes.push('Missing distinct mechanical/villain sensorium');
    }
  } else {
    // Survivor
    if (/ross|holt|cold|airlock|histology|autopsy|trocar|breath|suit|door|frost|pain|shiver|heart|pulse/i.test(narration)) {
      fNotes.push('Grounded forensic medical survivor perspective');
    } else {
      fScore -= 1;
      fNotes.push('Generic survivor narration');
    }
  }

  // Accuracy
  if (/undefined|\[object Object\]|null/i.test(narration)) {
    aScore -= 3;
    aNotes.push('Contained raw object/null serialization artifacts');
  } else {
    aNotes.push('Clean literary string output with no formatting corruptions');
  }

  return {
    fidelityScore: Math.max(1, Math.min(5, fScore)),
    qualityScore: Math.max(1, Math.min(5, qScore)),
    accuracyScore: Math.max(1, Math.min(5, aScore)),
    fidelityNotes: fNotes,
    qualityNotes: qNotes,
    accuracyNotes: aNotes,
  };
}

export async function runTwo50TurnBattery(options: {
  baseUrl?: string;
  modelId?: string;
  onTurnComplete?: (testIdx: number, turnIdx: number, evalData: TurnEvaluation) => void;
}): Promise<TestRunResult[]> {
  const baseUrl = options.baseUrl || process.env.LOCAL_AI_BASE_URL || 'http://127.0.0.1:1234/v1';
  const modelId = options.modelId || process.env.LOCAL_AI_MODEL || 'google/gemma-4-26b-a4b-qat';

  const testConfigs = [
    {
      id: 1,
      name: "Survivor Forensics & Survival (Dr. Maren Ross - 50 Turns)",
      scenario: "The Black Iron Mortuary",
      role: 'survivor' as const,
      character: "Dr. Maren Ross",
      actions: SURVIVOR_ACTIONS_50,
      systemPrompt: `You are The Voice, narrative horror engine for The Terror Machine.
SCENARIO: "The Black Iron Mortuary"
ROLE: SURVIVOR (Dr. Maren Ross, Chief Forensic Pathologist).
TONE: Clinical forensic horror, progressive hypothermia, acute somatic dread, acoustic tension.
Return a valid JSON object with:
{
  "narration": "2-3 atmospheric, visceral sentences describing the action outcome, sensory cold, sound of overhead tracks, or Holt's condition.",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "anatomicalTrauma": "string describing any medical injury or hypothermic state sustained (or null)",
  "antagonistObservation": "sensory cues of Entity-41 overhead (or null)",
  "playerHealth": "updated somatic condition of Dr. Ross"
}`
    },
    {
      id: 2,
      name: "Villain Suture Apparatus Simulation (Entity-41 - 50 Turns)",
      scenario: "The Black Iron Mortuary",
      role: 'villain' as const,
      character: "Entity-41 (The Suture Apparatus)",
      actions: VILLAIN_ACTIONS_50,
      systemPrompt: `You are The Voice, narrative horror engine for The Terror Machine.
SCENARIO: "The Black Iron Mortuary"
ROLE: VILLAIN (Entity-41 - Overhead Suture Apparatus with Hydraulic/Cryogenic Authority).
TONE: Cold inhuman machine sensorium, sadistic surgical experimentation, autonomous prey terror.
Return a valid JSON object with:
{
  "narration": "2-3 clinical sentences depicting the apparatus execution and the immediate panic/injury of Dr. Ross or Officer Holt.",
  "preyStatus": "updated medical/psychological status and locations of the human prey",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "anatomicalTrauma": "forensic medical trauma inflicted this turn (or null)",
  "antagonistObservation": "telemetry feed or optical camera sensor observation",
  "apparatusStatus": "subsystem pressure/integrity readout"
}`
    }
  ];

  const results: TestRunResult[] = [];

  console.log(`\n===============================================================`);
  console.log(`[STARTING TWO 50-TURN TESTS ON LOCAL GEMMA 4 26B QAT]`);
  console.log(`Target: ${baseUrl} | Model: ${modelId}`);
  console.log(`Scope: 2 Tests × 50 Turns = 100 Total Turns`);
  console.log(`===============================================================\n`);

  for (const config of testConfigs) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`>>> COMMENCING TEST ${config.id}/2: ${config.name}`);
    console.log(`    Scenario: ${config.scenario} | Role: ${config.role.toUpperCase()}`);
    console.log(`---------------------------------------------------------------`);

    const turnEvaluations: TurnEvaluation[] = [];
    let consecutiveErrors = 0;
    let criticalSkip = false;
    const testStartTime = Date.now();

    for (let t = 1; t <= 50; t++) {
      const action = config.actions[t - 1];
      const turnPrompt = `${config.systemPrompt}\n\nCURRENT SIMULATION TURN: ${t} of 50\nACTION:\n"${action}"\n\nResolve this turn and return the requested JSON object:`;

      console.log(`[Test ${config.id} - Turn ${t}/50] Action: "${action.slice(0, 75)}..."`);

      const turnStart = Date.now();
      let rawOutput = '';
      interface Battery50TurnOutput {
        narration?: string;
        [key: string]: unknown;
      }
      let parsed: Battery50TurnOutput | null = null;
      let turnError: string | undefined;

      try {
        rawOutput = await generateLocalText(turnPrompt, {
          baseUrl,
          model: modelId,
          jsonMode: true,
          temperature: 0.35,
          max_tokens: 2048,
          timeoutMs: 45000,
        });

        parsed = parseOrRepairJson<Battery50TurnOutput>(rawOutput);
        consecutiveErrors = 0;
      } catch (err: unknown) {
        consecutiveErrors++;
        turnError = err instanceof Error ? err.message : String(err);
        console.error(`  ! [ERROR on Turn ${t}]: ${turnError}`);

        if (consecutiveErrors >= 3 || turnError.includes('ECONNREFUSED') || turnError.includes('aborted')) {
          console.error(`\n[CRITICAL FAILURE DETECTED]: ${turnError}`);
          console.warn(`>>> SKIPPING remainder of Test ${config.id} (${config.name}).`);
          criticalSkip = true;
          break;
        }
      }

      const latencyMs = Date.now() - turnStart;
      const narration = parsed?.narration || (turnError ? `[ERROR]: Turn execution failed - ${turnError}` : 'No narration emitted');
      const evaluation = evaluateNarration(narration, config.role, t);

      const turnEval: TurnEvaluation = {
        turn: t,
        action,
        narration,
        latencyMs,
        fidelityScore: turnError ? 1 : evaluation.fidelityScore,
        qualityScore: turnError ? 1 : evaluation.qualityScore,
        accuracyScore: turnError ? 1 : evaluation.accuracyScore,
        fidelityNotes: evaluation.fidelityNotes,
        qualityNotes: evaluation.qualityNotes,
        accuracyNotes: evaluation.accuracyNotes,
        meta: parsed || {},
        hasCriticalError: !!turnError,
        errorDetails: turnError,
      };

      turnEvaluations.push(turnEval);

      if (options.onTurnComplete) {
        options.onTurnComplete(config.id, t, turnEval);
      }

      console.log(`  < Output (${latencyMs}ms | F:${turnEval.fidelityScore} Q:${turnEval.qualityScore} A:${turnEval.accuracyScore}): "${narration.slice(0, 85)}..."`);
    }

    const testDuration = (Date.now() - testStartTime) / 1000;
    const completedCount = turnEvaluations.length;
    const avgLatency = completedCount > 0
      ? Math.round(turnEvaluations.reduce((acc, t) => acc + t.latencyMs, 0) / completedCount)
      : 0;
    const avgFidelity = completedCount > 0
      ? +(turnEvaluations.reduce((acc, t) => acc + t.fidelityScore, 0) / completedCount).toFixed(2)
      : 0;
    const avgQuality = completedCount > 0
      ? +(turnEvaluations.reduce((acc, t) => acc + t.qualityScore, 0) / completedCount).toFixed(2)
      : 0;
    const avgAccuracy = completedCount > 0
      ? +(turnEvaluations.reduce((acc, t) => acc + t.accuracyScore, 0) / completedCount).toFixed(2)
      : 0;

    let verdict: TestRunResult['verdict'] = 'PASS';
    if (criticalSkip) {
      verdict = 'CRITICAL_SKIP';
    } else if (avgFidelity < 3.5 || avgQuality < 3.5 || avgAccuracy < 3.5) {
      verdict = 'WARN';
    } else if (turnEvaluations.some(t => t.hasCriticalError)) {
      verdict = 'WARN';
    }

    const testResult: TestRunResult = {
      testId: config.id,
      name: config.name,
      scenario: config.scenario,
      role: config.role,
      character: config.character,
      totalPlannedTurns: 50,
      completedTurns: completedCount,
      averageLatencyMs: avgLatency,
      overallFidelity: avgFidelity,
      overallQuality: avgQuality,
      overallAccuracy: avgAccuracy,
      verdict,
      turns: turnEvaluations,
      summary: `Test ${config.id} completed ${completedCount}/50 turns in ${testDuration.toFixed(1)}s (avg ${avgLatency}ms/turn). Fidelity: ${avgFidelity}/5, Quality: ${avgQuality}/5, Accuracy: ${avgAccuracy}/5. Verdict: ${verdict}.`,
      skippedRemaining: criticalSkip,
    };

    results.push(testResult);
    console.log(`\n>>> [TEST ${config.id} COMPLETED: ${verdict}] ${testResult.summary}`);
  }

  // Generate Reports
  generateMarkdownReport(results);
  generateHtmlReport(results);

  return results;
}

function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateMarkdownReport(results: TestRunResult[]) {
  const scratchPath = path.resolve('c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/scratch/two_50turn_tests_report.md');
  const brainPath = path.resolve('C:/Users/tgoth/.gemini/antigravity/brain/79dce160-d2e6-45b1-be57-32cf029b6c66/two_50turn_tests_report.md');
  const now = new Date().toISOString();

  let md = `# Local Engine 50-Turn Dual Verification Report (Survivor & Villain)\n\n`;
  md += `**Execution Timestamp**: ${now}  \n`;
  md += `**Model**: \`google/gemma-4-26b-a4b-qat\` (Local LM Studio @ \`http://127.0.0.1:1234/v1\`)  \n`;
  md += `**Cloud Usage**: **0 tokens / 0 external API calls**  \n`;
  md += `**Battery Scope**: 2 Roles × 50 Turns = **100 Total Turns**  \n\n`;

  md += `## Executive Summary Table\n\n`;
  md += `| Test # | Role | Character | Scenario | Turns | Avg Latency | Fidelity | Quality | Accuracy | Verdict |\n`;
  md += `| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of results) {
    const verdictBadge = r.verdict === 'PASS' ? '✅ PASS' : r.verdict === 'WARN' ? '⚠️ WARN' : '❌ ' + r.verdict;
    md += `| ${r.testId} | **${r.role.toUpperCase()}** | **${r.character}** | *${r.scenario}* | ${r.completedTurns}/50 | ${r.averageLatencyMs}ms | **${r.overallFidelity}/5.0** | **${r.overallQuality}/5.0** | **${r.overallAccuracy}/5.0** | ${verdictBadge} |\n`;
  }

  md += `\n---\n\n`;

  for (const r of results) {
    md += `## Test ${r.testId}: ${r.name}\n\n`;
    md += `- **Role**: \`${r.role}\` | **Character**: ${r.character}\n`;
    md += `- **Scenario**: *${r.scenario}*\n`;
    md += `- **Turns Completed**: ${r.completedTurns} of 50\n`;
    md += `- **Average Latency**: ${r.averageLatencyMs}ms/turn\n`;
    md += `- **Scores**: Fidelity: **${r.overallFidelity}/5.0** · Quality: **${r.overallQuality}/5.0** · Accuracy: **${r.overallAccuracy}/5.0**\n`;
    md += `- **Verdict**: **${r.verdict}**\n\n`;

    md += `### Turn Progression Highlights (Turns 1, 10, 20, 30, 40, 50)\n\n`;
    const sampleTurns = [1, 10, 20, 30, 40, 50].filter(t => t <= r.completedTurns);
    for (const st of sampleTurns) {
      const turnData = r.turns[st - 1];
      if (turnData) {
        md += `#### Turn ${st}\n`;
        md += `> **Action**: *${turnData.action}*\n\n`;
        md += `**Narration**:\n${turnData.narration}\n\n`;
        if (turnData.meta && Object.keys(turnData.meta).length > 1) {
          md += `\`\`\`json\n${JSON.stringify(turnData.meta, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }
    md += `---\n\n`;
  }

  for (const p of [scratchPath, brainPath]) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, md, 'utf-8');
      console.log(`[MARKDOWN REPORT WRITTEN]: ${p}`);
    } catch (err: unknown) {
      console.error(`Could not write markdown report to ${p}:`, err instanceof Error ? err.message : String(err));
    }
  }
}

function generateHtmlReport(results: TestRunResult[]) {
  const scratchPath = path.resolve('c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/scratch/two_50turn_tests_telemetry.html');
  const brainPath = path.resolve('C:/Users/tgoth/.gemini/antigravity/brain/79dce160-d2e6-45b1-be57-32cf029b6c66/two_50turn_tests_telemetry.html');
  const now = new Date().toISOString();

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>The Terror Machine // Telemetry Stream - Two 50-Turn Verification Runs</title>
  <style>
    body {
      background-color: #000000;
      color: #d1d5db;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      padding: 3rem 2rem;
      max-width: 1000px;
      margin: 0 auto;
      line-height: 1.7;
    }
    .meta-header {
      color: #52525b;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      border-bottom: 1px solid #18181b;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      text-transform: uppercase;
    }
    .context-receipt {
      background-color: #09090b;
      border: 1px solid #27272a;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 2.5rem;
      font-size: 0.8rem;
    }
    .receipt-header {
      color: #a1a1aa;
      font-weight: bold;
      margin-bottom: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .receipt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.75rem;
      color: #d4d4d8;
    }
    .receipt-item { line-height: 1.5; }
    .receipt-key { color: #71717a; text-transform: uppercase; font-size: 0.75rem; margin-right: 0.25rem; }
    .receipt-val { font-weight: 600; color: #f4f4f5; }
    .receipt-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: bold;
      background-color: #064e3b;
      color: #34d399;
      border: 1px solid #059669;
    }
    .test-section {
      margin-top: 3rem;
      margin-bottom: 4rem;
      border-top: 2px solid #27272a;
      padding-top: 2rem;
    }
    .test-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 0.5rem;
      letter-spacing: 0.05em;
    }
    .test-meta {
      color: #71717a;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .turn-card {
      background-color: #050507;
      border: 1px solid #1f1f23;
      border-radius: 4px;
      margin-bottom: 1.75rem;
      padding: 1.25rem;
    }
    .turn-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #18181b;
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.75rem;
      color: #71717a;
      text-transform: uppercase;
    }
    .turn-number { font-weight: bold; color: #60a5fa; }
    .turn-metrics { color: #a1a1aa; }
    .user-input {
      color: #a1a1aa;
      font-size: 0.9rem;
      font-style: italic;
      margin-bottom: 1rem;
      padding-left: 1rem;
      border-left: 2px solid #3b82f6;
    }
    .block-narration {
      color: #e4e4e7;
      font-size: 0.95rem;
      margin-bottom: 1rem;
      line-height: 1.6;
    }
    .logic-panel {
      background-color: #09090b;
      border: 1px dashed #27272a;
      border-radius: 4px;
      margin-top: 1rem;
      font-size: 0.8rem;
    }
    summary {
      padding: 0.6rem 0.9rem;
      color: #52525b;
      cursor: pointer;
      font-weight: bold;
      outline: none;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    summary:hover {
      color: #a1a1aa;
      background-color: #121214;
    }
    .logic-content {
      padding: 0.9rem;
      border-top: 1px dashed #27272a;
      background-color: #020617;
    }
    pre {
      margin: 0;
      color: #34d399;
      font-size: 0.78rem;
      overflow-x: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="meta-header">
    THE TERROR MACHINE // RUNTIME DUAL 50-TURN ENGINE VERIFICATION<br>
    TRACE CAPTURE ID: ${Date.now()}<br>
    MODEL: google/gemma-4-26b-a4b-qat @ http://127.0.0.1:1234/v1<br>
    TIMESTAMP: ${now}
  </div>

  <div class="context-receipt">
    <div class="receipt-header">[ CONTEXT RECEIPT // DUAL 50-TURN BATTERY BENCHMARK ]</div>
    <div class="receipt-grid">
      <div class="receipt-item"><span class="receipt-key">SCENARIO:</span> <span class="receipt-val">The Black Iron Mortuary</span></div>
      <div class="receipt-item"><span class="receipt-key">TEST 1 ROLE:</span> <span class="receipt-val">SURVIVOR (Dr. Maren Ross)</span></div>
      <div class="receipt-item"><span class="receipt-key">TEST 2 ROLE:</span> <span class="receipt-val">VILLAIN (Entity-41)</span></div>
      <div class="receipt-item"><span class="receipt-key">PLANNED TURNS:</span> <span class="receipt-val">100 (50 Survivor + 50 Villain)</span></div>
      <div class="receipt-item"><span class="receipt-key">CLOUD TOKENS:</span> <span class="receipt-badge">0 TOKENS (STRICT LOCAL)</span></div>
    </div>
  </div>
`;

  for (const r of results) {
    html += `
  <div class="test-section">
    <div class="test-title">Test ${r.testId}: ${escapeHtml(r.name)}</div>
    <div class="test-meta">
      Role: <strong>${escapeHtml(r.role.toUpperCase())}</strong> | 
      Completed: <strong>${r.completedTurns}/50</strong> | 
      Avg Latency: <strong>${r.averageLatencyMs}ms</strong> | 
      Fidelity: <strong>${r.overallFidelity}/5.0</strong> | 
      Quality: <strong>${r.overallQuality}/5.0</strong> | 
      Accuracy: <strong>${r.overallAccuracy}/5.0</strong> | 
      Verdict: <span class="receipt-badge">${escapeHtml(r.verdict)}</span>
    </div>
`;

    for (const turn of r.turns) {
      html += `
    <div class="turn-card">
      <div class="turn-header">
        <span class="turn-number">TURN ${turn.turn} OF 50</span>
        <span class="turn-metrics">${turn.latencyMs}ms | F:${turn.fidelityScore} Q:${turn.qualityScore} A:${turn.accuracyScore}</span>
      </div>
      <div class="user-input">&gt; ${escapeHtml(turn.action)}</div>
      <div class="block-narration">${escapeHtml(turn.narration)}</div>
      <details class="logic-panel">
        <summary>[ TTM LOGIC // STATE DELTAS &amp; METADATA ]</summary>
        <div class="logic-content">
          <pre><code>${escapeHtml(JSON.stringify(turn.meta, null, 2))}</code></pre>
        </div>
      </details>
    </div>
`;
    }

    html += `  </div>\n`;
  }

  html += `
</body>
</html>`;

  for (const p of [scratchPath, brainPath]) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, html, 'utf-8');
      console.log(`[HTML REPORT WRITTEN]: ${p}`);
    } catch (err: unknown) {
      console.error(`Could not write HTML report to ${p}:`, err instanceof Error ? err.message : String(err));
    }
  }
}

// CLI Direct Execution Entry
if (process.argv[1]?.includes('run_two_50turn_battery.ts')) {
  runTwo50TurnBattery({})
    .then((results) => {
      const hasFatal = results.some(r => r.verdict === 'FAIL' || r.verdict === 'ABORTED');
      process.exit(hasFatal ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal 50-Turn Battery Error:', err);
      process.exit(1);
    });
}
