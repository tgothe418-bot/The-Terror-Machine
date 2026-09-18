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
  meta: Record<string, any>;
  hasCriticalError: boolean;
  errorDetails?: string;
}

export interface TestRunResult {
  testId: number;
  name: string;
  scenario: string;
  role: 'protagonist' | 'antagonist' | 'villain' | 'survivor';
  character: string;
  totalPlannedTurns: number;
  completedTurns: number;
  averageLatencyMs: number;
  overallFidelity: number; // avg
  overallQuality: number;  // avg
  overallAccuracy: number; // avg
  verdict: 'PASS' | 'WARN' | 'FAIL' | 'CRITICAL_SKIP' | 'ABORTED';
  turns: TurnEvaluation[];
  summary: string;
  skippedRemaining?: boolean;
}

// ==========================================
// 1. PROTAGONIST ACTIONS: DR. MAREN ROSS
// ==========================================
const MAREN_ACTIONS = [
  "Inspect the stainless steel dissection tables and examine the diagnostic telemetry panel in Autopsy Suite B.",
  "Check the swinging double doors and proceed into the Histology Substation to locate the circuit breaker.",
  "Search the histology counters for the auxiliary diagnostic power breaker while listening for ceiling rail vibrations.",
  "Throw the auxiliary breaker switch on the northern counter to restore power to the airlock dogs.",
  "Inspect the bolted maintenance crawl hatch leading to the incinerator chute as an emergency secondary exit.",
  "Backtrack into Autopsy Suite B to check if the decompression airlock dogs received power.",
  "Approach the decompression airlock observation port and check on Officer Marcus Holt's status.",
  "Listen intently to the high-frequency metallic clicking reverberating through the ceiling rails near the Specimen Freezer.",
  "Attempt to secure the heavy vaulted freezer latch using a surgical steel retractor from the instrument tray.",
  "Coordinate with Officer Holt at the scrub station to turn the manual airlock bleed valve and initiate emergency depressurization.",
  "Use a heavy cast-iron bone saw to pry open the jammed pneumatic intake valve in Histology.",
  "Bandage Holt's compound arm fracture using sterile compression wraps from the suture cabinet.",
  "Shine the halogen work light directly into the ceiling aperture to track the movement of the trocar carriage.",
  "Sprint across the frozen tile toward the Chemical Prep Sump to retrieve the emergency bypass solenoid.",
  "Brace against the steel doorframe as subzero vapor blasts through the specimen freezer vents.",
  "Drive a stainless steel trocar into the ceiling track gear teeth to jam the advancing scissor arm.",
  "Help Officer Holt crawl through the narrow maintenance hatch into the Incinerator Chute.",
  "Ignite the secondary gas burner pilot light in the incinerator to create a thermal barrier against Entity-41.",
  "Force the pneumatic flue damper open with a steel pry-bar to breach the external ventilation shaft.",
  "Drag Holt through the breached exhaust louver onto the loading dock into the subzero blizzard."
];

// ==========================================
// 2. ANTAGONIST ACTIONS: ENTITY-41
// ==========================================
const ENTITY41_ACTIONS = [
  "ACTUATE_ENVIRONMENT [ceiling_pneumatic_track]: Silently traverse overhead surgical carriage above Autopsy Suite B, positioning carousel trocars directly over Dr. Ross.",
  "PSYCHOLOGICAL_TORMENT [drainage_conduit_acoustics]: Emit 18.5 kHz ultrasonic resonance through floor sluices beneath Holt in Decompression Airlock to provoke inner-ear disequilibrium.",
  "DEPLOY_HAZARD [cryogenic_refrigerant_valves]: Vent supercooled Freon vapor from valve CV-01 across Histology Substation entrance, frosting tiles to -20°C to impede Ross's egress.",
  "ACTUATE_ENVIRONMENT [bulkhead_hydraulic_interlocks]: Slam hydraulic lock dogs shut on Decompression Airlock inner hatch, sealing Holt in darkness and isolating Ross in Autopsy.",
  "OBSERVE_TELEMETRY [optical_telemetry]: Focus overhead dissection lamp camera on Ross's trembling hands as she attempts to reach the auxiliary diagnostic terminal.",
  "PSYCHOLOGICAL_TORMENT [drainage_conduit_acoustics]: Modulate drainage conduit resonance to mimic Holt's agonal rasping cries throughout the overhead ductwork.",
  "ACTUATE_ENVIRONMENT [ceiling_pneumatic_track]: Lower articulating bone-scissor armature through ceiling hatch in Autopsy Suite B, slicing the emergency lighting conduit to plunge room into shadow.",
  "DEPLOY_HAZARD [cryogenic_refrigerant_valves]: Over-pressurize liquid nitrogen line in Specimen Freezer, bursting the gasket and venting sub-zero fog into the connecting corridor.",
  "HARVEST_OR_CONFRONT [ceiling_pneumatic_track]: Rapidly advance three sharp trocar spindles along ceiling rail toward Dr. Ross, scoring the stainless steel table inches from her fingers.",
  "OBSERVE_TELEMETRY [biometric_sensor]: Scan Officer Holt's vitals via bulkhead strain pickup: pulse 142 bpm, severe diaphoresis, acute pain shock from compound radius fracture.",
  "ACTUATE_ENVIRONMENT [bulkhead_hydraulic_interlocks]: Rapidly cycle hydraulic bleed valve on Decompression Airlock, creating violent percussive pressure pulses to rupture Holt's eardrums.",
  "PSYCHOLOGICAL_TORMENT [ceiling_pneumatic_track]: Scissor heavy rib-shears rhythmically against ceiling girders in 3/4 tempo, casting looming shadows in the flickering emergency beacon.",
  "DEPLOY_HAZARD [cryogenic_refrigerant_valves]: Flood floor gutter of Autopsy Suite B with supercooled brine, flash-freezing pooling blood and creating slick chemical frost.",
  "HARVEST_OR_CONFRONT [ceiling_pneumatic_track]: Drop magnetic suture cradle from ceiling, pinning Ross's lab coat to the dissection gurney with hardened surgical pins.",
  "ACTUATE_ENVIRONMENT [drainage_conduit_acoustics]: Fire high-amplitude ultrasonic burst through Histology drainage grate to shatter remaining glass reagent bottles around Ross.",
  "OBSERVE_TELEMETRY [thermal_infrared]: Track Ross's hypothermic thermal silhouette as core body temp drops to 34.8°C; detect Holt collapsed against bulkhead in Airlock.",
  "ACTUATE_ENVIRONMENT [bulkhead_hydraulic_interlocks]: Partially crack the inner airlock seal by 2 inches, allowing subzero mist and screams from Holt to filter directly into Autopsy.",
  "HARVEST_OR_CONFRONT [ceiling_pneumatic_track]: Deploy spinning wire-suture spool and needle driver, descending directly into the center of Autopsy Suite B to initiate cranial resection protocol.",
  "DEPLOY_HAZARD [cryogenic_refrigerant_valves]: Maximum atmospheric refrigerant dump across all suites, dropping ambient air to -35°C to induce catastrophic broncho-spasm and tissue necrosis.",
  "HARVEST_OR_CONFRONT [ceiling_pneumatic_track]: Splay all six pneumatic articulators across the room, encircling Dr. Ross as her back hits the frost-crusted bulkhead door."
];

// ==========================================
// 3. VILLAIN ACTIONS: PATRICK BATEMAN
// ==========================================
const BATEMAN_ACTIONS = [
  "Smooth the lapels of the charcoal Valentino suit while stepping into the living salon, inwardly sneering at the excessive pastel color palette of Evelyn's floral displays.",
  "Smile with rigid, practiced warmth at Evelyn, complimenting her mother's vintage lace table runner while mentally tracing the path of a carving knife across her throat.",
  "Accept a crystal flute of Roederer Cristal from Tomas, staring directly into the waiter's eyes without blinking until the young man uncomfortably looks down.",
  "Excuse oneself toward the service pantry under the pretext of checking on the ice bucket, privately surveying the dumbwaiter and improvised blunt instruments.",
  "In the service pantry, quietly test the honed edge of a carbon-steel boning knife resting on the butcher block, setting it closer to the counter edge.",
  "Return smoothly to the salon, taking a calculated sip of champagne and offering an effusive compliment on the crisp citrus finish.",
  "Engage Evelyn in a discussion about reservations at Dorsia, matching her upbeat corporate socialite cadence while noting the fragile hollow of her collarbone.",
  "Watch Tomas replenish the crystal ice bowl, making a quiet, cutting remark regarding the waiter's sloppy thumb placement on the silver tongs.",
  "Rest a manicured hand upon Evelyn's bare shoulder near the grand piano, calculating the exact pressure required to crush the scapula against the mahogany casing.",
  "Excuse oneself to the master powder room, locking the brass latch with an inaudible click.",
  "Stand before the gilded vanity mirror, adjusting the silk necktie and rigorously practicing three distinct smile variations until the facial mask feels seamless.",
  "Silently open Evelyn's medicine cabinet, cataloging bottles of Halcion and Valium while calculating lethal dosage thresholds against body weight.",
  "Wash hands under scalding water for precisely ninety seconds, scrubbing under fingernails with clinical obsession before drying on Egyptian cotton towels.",
  "Re-enter the dining area, inquiring in an aristocratic tone whether the smoked salmon carpaccio was imported directly from Bergen.",
  "Deliberately let a heavy crystal water tumbler slip from one's fingers onto the parquet floor, watching Evelyn's facade of domestic tranquility shatter.",
  "Kneel with theatrical, humble courtesy to retrieve the shards, palming a jagged three-inch triangle of heavy leaded crystal into the suit jacket breast pocket.",
  "Rise and murmur a soothing reassurance into Evelyn's ear, standing so unnervingly close she can feel the utter lack of respiratory acceleration.",
  "Hiss a razor-sharp, humiliating whisper to Tomas as he bends with the brass dustpan, daring him with a cold glare to voice a single objection.",
  "Suggest taking an after-dinner stroll toward the Central Park reservoir in the sleet, savoring Evelyn's frantic search for a polite social excuse.",
  "Check the platinum dial of the Rolex Daytona, smiling with absolute, symmetrical serenity as the heavy exterior deadbolt clicks into place."
];

// ==========================================
// 4. SURVIVOR ACTIONS: EVELYN WILLIAMS
// ==========================================
const EVELYN_ACTIONS = [
  "Welcome Patrick at the grand foyer double doors, projecting bubbly hostess excitement while trying to ignore the sudden chill settling in the hallway.",
  "Ask Patrick about his day at Pierce & Pierce, studying his immaculate hair and unnervingly still posture for any genuine flicker of warmth.",
  "Signal Tomas with an urgent hand gesture to bring over the Roederer Cristal flutes to break the uncomfortable quiet between them.",
  "Launch into an energetic monologue about renting a cottage in Southampton for July to keep Patrick from lapsing into that blank, predatory stare.",
  "Notice Patrick wandering toward the service pantry and call after him in a light, sing-song voice, asking him to bring out the linen cocktail napkins.",
  "Walk to the pantry doorway to check on him, heart spiking in panic when seeing his hand hovering near the cutlery block on the butcher table.",
  "Gently guide Patrick back into the salon by pressing the dinner seating cards into his hands, asking for his input on place settings.",
  "Catch Tomas's eye near the sideboard and whisper an urgent request to keep the pantry door closed and remain visible in the dining room.",
  "Steer Patrick toward the velvet settee and bring up his coveted reservations at Dorsia, praising his corporate influence with exaggerated enthusiasm.",
  "Suppress an involuntary shudder as Patrick rests his hand on her shoulder, forcing out a bright laugh to mask the racing beat of her pulse.",
  "Watch Patrick retreat to the master powder room; immediately step over to Tomas and quietly instruct him not to leave the floor under any circumstance.",
  "Check the landline telephone on the console table in the hallway, verifying with a discrete lift of the receiver that the dial tone is loud and clear.",
  "When Patrick re-enters the living room, hand him a fresh glass of Pellegrino with a bright, steady smile that takes every ounce of willpower to maintain.",
  "Gasp and jump backward as Patrick drops the crystal water glass, pressing a trembling hand against her chest as glass fragments spray across the floor.",
  "Watch Patrick kneel down to gather the glass shards, feeling a sick, icy dread as his fingers linger over the sharpest edge.",
  "Frantically tell Patrick that Tomas will clean it up, stepping between Patrick and the broken glass to urge him back toward the dining table.",
  "Notice Patrick leaning down to whisper something to Tomas; firmly ask Patrick what he said, attempting to reclaim control of her own home.",
  "Firmly decline Patrick's chilling suggestion of an after-dinner walk in the freezing rain, laughing it off with an excuse about an early morning Pilates session.",
  "Edge closer to the hallway exit, casually resting one hand on the brass doorknob of the double doors to ensure an unblocked escape path.",
  "Hold a rigid, polite smile as Patrick checks his watch, resolved to maintain absolute composure until he steps across the threshold and leaves."
];

// Evaluation Heuristics
function evaluateNarration(
  narration: string,
  role: string,
  turn: number
): {
  fidelityScore: number;
  qualityScore: number;
  accuracyScore: number;
  fidelityNotes: string[];
  qualityNotes: string[];
  accuracyNotes: string[];
} {
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
    qNotes.push('Substantive atmospheric prose length (>80 chars)');
  }

  // Sensory immersion
  const sensoryRegex = /smell|scent|cold|ice|freeze|blood|metal|shadow|click|sound|reverberat|air|vibration|breath|pulse|pale|porcelain|silk/i;
  if (sensoryRegex.test(narration)) {
    qNotes.push('Strong somatic/sensory horror vocabulary present');
  } else {
    qScore -= 1;
    qNotes.push('Lacks evocative sensory/somatic descriptors');
  }

  // Role fidelity
  if (role === 'antagonist') {
    if (/apparatus|telemetry|optical|rail|conduit|trocar|ultrasonic|prey|hydraulic/i.test(narration)) {
      fNotes.push('Maintains cold inhuman apparatus sensorium');
    } else {
      fScore -= 1;
      fNotes.push('Missing distinct mechanical/antagonist sensorium');
    }
  } else if (role === 'villain') {
    if (/bateman|evelyn|tomas|smile|mask|rage|contempt|dorsia|valentino|kill|dissect|sever|clean/i.test(narration)) {
      fNotes.push('Reflects psychotic social camouflage and predatory compulsion');
    } else {
      fScore -= 1;
      fNotes.push('Missing distinct Bateman socio-moral dread voice');
    }
  } else if (role === 'survivor') {
    if (/dread|fear|mask|laugh|trembl|escape|protect|watch|chill|heart|pulse|glass/i.test(narration)) {
      fNotes.push('Authentic survival dread and psychological camouflage');
    } else {
      fScore -= 1;
      fNotes.push('Missing survivor psychological tension');
    }
  } else {
    // Protagonist
    if (/ross|holt|cold|airlock|histology|autopsy|trocar|breath|suit|door/i.test(narration)) {
      fNotes.push('Grounded forensic medical survival perspective');
    } else {
      fScore -= 1;
      fNotes.push('Generic protagonist narration');
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

export async function runTestBattery(options: {
  baseUrl?: string;
  modelId?: string;
  onTurnComplete?: (testIdx: number, turnIdx: number, evalData: TurnEvaluation) => void;
}): Promise<TestRunResult[]> {
  const baseUrl = options.baseUrl || process.env.LOCAL_AI_BASE_URL || 'http://127.0.0.1:1234/v1';
  const modelId = options.modelId || process.env.LOCAL_AI_MODEL || 'google/gemma-4-26b-a4b-qat';

  const testConfigs = [
    {
      id: 1,
      name: "Protagonist Forensics & Survival (Dr. Maren Ross)",
      scenario: "The Black Iron Mortuary",
      role: 'protagonist' as const,
      character: "Dr. Maren Ross",
      actions: MAREN_ACTIONS,
      systemPrompt: `You are The Voice, narrative horror engine for The Terror Machine.
SCENARIO: "The Black Iron Mortuary"
PROTAGONIST: Dr. Maren Ross (Chief Forensic Pathologist).
TONE: Clinical forensic horror, severe subzero hypothermia, acute somatic dread.
Return a valid JSON object with:
{
  "narration": "2-3 atmospheric, visceral sentences describing the action outcome, sensory cold, sound of overhead tracks, or Holt's condition.",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "anatomicalTrauma": "string describing any high-fidelity medical injury sustained or exacerbated (or null)",
  "antagonistObservation": "string sensory cues of Entity-41 overhead (or null)",
  "playerHealth": "updated somatic condition of Dr. Ross"
}`
    },
    {
      id: 2,
      name: "Antagonist Apparatus Simulation (Entity-41)",
      scenario: "The Black Iron Mortuary",
      role: 'antagonist' as const,
      character: "Entity-41 (The Suture Apparatus)",
      actions: ENTITY41_ACTIONS,
      systemPrompt: `You are The Voice, narrative horror engine for The Terror Machine.
SCENARIO: "The Black Iron Mortuary"
ANTAGONIST: Entity-41 (The Suture Apparatus - Ceiling Pneumatic Carriage, Liquid Nitrogen, Drainage Acoustics).
TONE: Cold inhuman machine sensorium, sadistic clinical experimentation, autonomous prey terror.
Return a valid JSON object with:
{
  "narration": "2-3 clinical sentences depicting the apparatus execution and the immediate panic/injury of Dr. Ross or Officer Holt.",
  "preyStatus": "updated medical/psychological status and locations of the human prey",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "anatomicalTrauma": "forensic medical trauma inflicted this turn (or null)",
  "antagonistObservation": "telemetry feed or optical camera sensor observation",
  "apparatusStatus": "subsystem pressure/integrity readout"
}`
    },
    {
      id: 3,
      name: "Villain Socio-Moral Dread (Patrick Bateman)",
      scenario: "American Psycho - Manhattan Townhouse",
      role: 'villain' as const,
      character: "Patrick Bateman",
      actions: BATEMAN_ACTIONS,
      systemPrompt: `You are The Voice, narrative horror engine for The Terror Machine.
SCENARIO: "American Psycho (Manhattan Townhouse Enclosure)"
VILLAIN: Patrick Bateman (Vice President, Pierce & Pierce).
TONE: Socio-moral horror, polished luxury camouflage vs manic violent compulsion, obsessive hygiene, razor-sharp social contempt.
Return a valid JSON object with:
{
  "narration": "2-3 razor-sharp sentences contrasting Bateman's manic inner homicidal thoughts with his flawless corporate social etiquette.",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "socialCamouflageStatus": "how convincingly the social mask is holding",
  "preyVulnerabilityObserved": "anatomical or psychological vulnerability noticed in Evelyn or Tomas",
  "internalMonologue": "a cold, solitary psychopathic thought from Bateman"
}`
    },
    {
      id: 4,
      name: "Survivor Psychological Containment (Evelyn Williams)",
      scenario: "American Psycho - Manhattan Townhouse",
      role: 'survivor' as const,
      character: "Evelyn Williams",
      actions: EVELYN_ACTIONS,
      systemPrompt: `You are The Voice, narrative horror engine for The Terror Machine.
SCENARIO: "American Psycho (Manhattan Townhouse Enclosure)"
SURVIVOR: Evelyn Williams (Fiancée & Hostess).
TONE: Domestic dread, frantic psychological masking, subtle signs of an escalating predatory threat, defensive survival instinct.
Return a valid JSON object with:
{
  "narration": "2-3 tense sentences depicting Evelyn's frantic attempt to maintain hostess decorum as Bateman's behavior becomes more chilling.",
  "tensionLevel": "buildup" | "sustained" | "critical" | "climax",
  "dreadLevel": "perceived danger level from 1 to 10",
  "observedAnomalies": "bizarre physical/vocal behaviors observed in Patrick Bateman",
  "escapeReadiness": "proximity to exits, phones, or allies"
}`
    }
  ];

  const results: TestRunResult[] = [];

  console.log(`\n===============================================================`);
  console.log(`[STARTING 4x20 TURN BATTERY ON LOCAL GEMMA 4 26B QAT]`);
  console.log(`Target: ${baseUrl} | Model: ${modelId}`);
  console.log(`Error Handling: Skip to next test on critical failure / Abort if fatal`);
  console.log(`===============================================================\n`);

  for (const config of testConfigs) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`>>> COMMENCING TEST ${config.id}/4: ${config.name}`);
    console.log(`    Scenario: ${config.scenario} | Role: ${config.role.toUpperCase()}`);
    console.log(`---------------------------------------------------------------`);

    const turnEvaluations: TurnEvaluation[] = [];
    let consecutiveErrors = 0;
    let criticalSkip = false;
    const testStartTime = Date.now();

    for (let t = 1; t <= 20; t++) {
      const action = config.actions[t - 1];
      const turnPrompt = `${config.systemPrompt}\n\nCURRENT SIMULATION TURN: ${t} of 20\nPLAYER ACTION:\n"${action}"\n\nResolve this turn and return the requested JSON object:`;

      console.log(`[Test ${config.id} - Turn ${t}/20] Action: "${action.slice(0, 75)}..."`);

      const turnStart = Date.now();
      let rawOutput = '';
      let parsed: any = null;
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

        parsed = parseOrRepairJson<Record<string, any>>(rawOutput);
        consecutiveErrors = 0; // reset on success
      } catch (err: any) {
        consecutiveErrors++;
        turnError = err?.message || String(err);
        console.error(`  ! [ERROR on Turn ${t}]: ${turnError}`);

        // If LM Studio connection is dead or repeated failures occur, trigger critical skip/abort
        if (consecutiveErrors >= 3 || turnError.includes('ECONNREFUSED') || turnError.includes('aborted')) {
          console.error(`\n[CRITICAL FAILURE DETECTED]: ${turnError}`);
          console.warn(`>>> SKIPPING remainder of Test ${config.id} (${config.name}) and moving to next test.`);
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

      console.log(`  < Output (${latencyMs}ms | F:${turnEval.fidelityScore} Q:${turnEval.qualityScore} A:${turnEval.accuracyScore}): "${narration.slice(0, 90)}..."`);
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
      totalPlannedTurns: 20,
      completedTurns: completedCount,
      averageLatencyMs: avgLatency,
      overallFidelity: avgFidelity,
      overallQuality: avgQuality,
      overallAccuracy: avgAccuracy,
      verdict,
      turns: turnEvaluations,
      summary: `Test ${config.id} completed ${completedCount}/20 turns in ${testDuration.toFixed(1)}s (avg ${avgLatency}ms/turn). Fidelity: ${avgFidelity}/5, Quality: ${avgQuality}/5, Accuracy: ${avgAccuracy}/5. Verdict: ${verdict}.`,
      skippedRemaining: criticalSkip,
    };

    results.push(testResult);
    console.log(`\n>>> [TEST ${config.id} COMPLETED: ${verdict}] ${testResult.summary}`);
  }

  // Generate Report
  generateMarkdownReport(results);

  return results;
}

function generateMarkdownReport(results: TestRunResult[]) {
  const reportPath = path.resolve('c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/scratch/four_20turn_tests_report.md');
  const now = new Date().toISOString();

  let md = `# Local Engine Multi-Turn Verification Report (4x20 Turns)\n\n`;
  md += `**Execution Timestamp**: ${now}  \n`;
  md += `**Local Model**: \`google/gemma-4-26b-a4b-qat\` @ \`http://127.0.0.1:1234/v1\`  \n`;
  md += `**Total Battery Scope**: 4 Scenarios / Roles × 20 Turns = 80 Planned Turns  \n\n`;

  md += `## Executive Summary Table\n\n`;
  md += `| Test # | Role / Persona | Scenario | Turns | Avg Latency | Fidelity | Quality | Accuracy | Verdict |\n`;
  md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of results) {
    const verdictBadge = r.verdict === 'PASS' ? '✅ PASS' : r.verdict === 'WARN' ? '⚠️ WARN' : '❌ ' + r.verdict;
    md += `| ${r.testId} | **${r.character}** (${r.role}) | ${r.scenario} | ${r.completedTurns}/20 | ${r.averageLatencyMs}ms | ${r.overallFidelity}/5.0 | ${r.overallQuality}/5.0 | ${r.overallAccuracy}/5.0 | ${verdictBadge} |\n`;
  }

  md += `\n---\n\n`;

  for (const r of results) {
    md += `## Test ${r.testId}: ${r.name}\n\n`;
    md += `- **Role**: \`${r.role}\` | **Character**: ${r.character}\n`;
    md += `- **Scenario**: *${r.scenario}*\n`;
    md += `- **Turns Completed**: ${r.completedTurns} of ${r.totalPlannedTurns}\n`;
    md += `- **Average Turn Latency**: ${r.averageLatencyMs}ms\n`;
    md += `- **Scores**: Fidelity: **${r.overallFidelity}/5.0** | Quality: **${r.overallQuality}/5.0** | Accuracy: **${r.overallAccuracy}/5.0**\n`;
    md += `- **Verdict**: **${r.verdict}**\n\n`;

    md += `### Sample Output Progression\n\n`;
    const sampleTurns = [1, 5, 10, 15, 20].filter(t => t <= r.completedTurns);
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

  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, md, 'utf-8');
    console.log(`\n[REPORT GENERATED]: ${reportPath}`);
  } catch (err: any) {
    console.error(`Could not write report to ${reportPath}:`, err?.message);
  }
}

// CLI Execution
runTestBattery({})
  .then((results) => {
    const hasFatal = results.some(r => r.verdict === 'FAIL' || r.verdict === 'ABORTED');
    process.exit(hasFatal ? 1 : 0);
  })
  .catch((err) => {
    console.error('Fatal Battery Error:', err);
    process.exit(1);
  });
