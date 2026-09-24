import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

import { getForgeExtractionPrompt } from '../src/lib/extractionContract';
import { validateAndNormalizeDocumentAnalysis } from '../src/lib/sourceBaseline';
import { generateLocalText } from '../server/utils/localVoiceClient';
import { parseOrRepairJson } from '../server/utils/jsonRepair';
import { ForgeSourceRecord } from '../src/types/forge';

interface BenchScenario {
  name: string;
  fileName: string;
  text: string;
}

const TEST_SCENARIOS: BenchScenario[] = [
  {
    name: 'The Black Iron Mortuary',
    fileName: 'black_iron_mortuary.md',
    text: `# THE BLACK IRON MORTUARY: SUB-BASEMENT 7
The facility is a subterranean bio-containment mortuary buried 80 feet beneath the permafrost of Black Iron Ridge.
Access from the surface is through the Decompression Airlock, a cylindrical vault of cold rolled steel with heavy hydraulic locking dogs and a manual pressure equalization wheel.
Beyond the airlock lies Autopsy Suite B, the central theater of operations. Seafoam green ceramic tiles line the walls, and four stainless steel dissection tables with perimeter fluid trenches dominate the sunken center. Overhead, pneumatic surgical tracks hum with tension, carrying mobile surgical carriages and trocar spools.
To the north, swinging double doors with frosted wire glass lead into the Histology Substation, crammed with counter-mounted microtomes, formalin staining trays, and the facility's auxiliary power breaker.
At the western end of Autopsy Suite B is the Specimen Freezer, a heavy-vaulted walk-in cold room maintained at -25 degrees Celsius, lined with ceiling-high specimen racks and venting supercooled Freon vapor.
Behind the histology counters, a narrow maintenance hatch drops into the Incinerator Chute, a vertical flue of heat-warped iron and soot leading down to the crematory furnace burners.
A final emergency egress leads past the Chemical Prep Sump, where drainage sluices accumulate formaldehyde and runoff beneath iron floor grates.

PERSONNEL:
Dr. Maren Ross, Chief Medical Examiner. Methodical, suffering from hypervigilance and a bleeding left palm.
Officer Marcus Holt, Sheriff's Deputy. Left arm immobilized in a splint due to a compound crush fracture of the radius and ulna.
ENTITY-41: The Suture Apparatus. An uncoupled automated surgical unit that patrols the overhead ceiling rails, hunting living subjects to resect and suture.`
  },
  {
    name: 'The Drowned Crypt of Dunwich',
    fileName: 'drowned_crypt.txt',
    text: `THE DROWNED CRYPT OF DUNWICH
Beneath the crumbling foundations of the old Dunwich tannery lies the Drowned Crypt, a subterranean maze of flooded stone vaults dating back to 1740.
The entrance is through the Bell Tower Vestibule, where water drips constantly from rotting cedar rafters onto fractured slate tiles.
A spiraling granite staircase descends into the Flooded Nave, where stagnant black water sits knee-deep around half-submerged limestone sarcophagi.
From the Nave, an arched stone tunnel leads east into the Ossuary of the First Elders, walls stacked ten feet high with moss-covered skulls and femur bones.
To the west, an iron-grated sluice opens into the Subterranean Cistern, a cavernous cistern echoing with low-frequency hydraulic groaning from the rising tide outside.
Further down through a collapsed masonry arch lies the Sump Trench, a narrow subterranean canal choked with stagnant mud, dead eels, and rotting leather straps.
At the lowest elevation sits the Abyssal Well Room, where a circular pit plunged into subterranean bedrock emits a foul brine odor and rhythmic pulsing vibrations.

CAST:
Father Thomas Ross, disgraced parish rector seeking forgiveness. Trembling, clutching a silver crucifix with salt-bleached robes.
Sarah Miller, town archivist searching for her missing brother. Armed with a brass kerosene lantern and a heavy crowbar.
The Sluice Lurker: An amphibious monstrosity that hunts by acoustic vibration through the flooded conduits.`
  }
];

export async function runForgeBenchmark() {
  const model = process.env.VITE_LOCAL_MODEL || 'google/gemma-4-26b-a4b-qat';
  const baseUrl = process.env.VITE_LOCAL_BASE_URL || 'http://127.0.0.1:1234/v1';

  console.log('===========================================================');
  console.log('[FORGE INTAKE BENCHMARK SUITE]');
  console.log('Model:   ' + model + ' via ' + baseUrl);
  console.log('Samples: ' + TEST_SCENARIOS.length);
  console.log('===========================================================\n');

  interface BenchmarkResult {
    scenario: string;
    fileName?: string;
    pass: boolean;
    latencyMs: number;
    error?: string;
    extractedTitle?: string;
    nodeCount?: number;
    edgeCount?: number;
    castCount?: number;
    quarantineCount?: number;
    quarantinedIssues?: string[];
    nodes?: unknown[];
  }

  const results: BenchmarkResult[] = [];

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    console.log('[' + (i + 1) + '/' + TEST_SCENARIOS.length + '] Testing: "' + scenario.name + '" (' + scenario.fileName + ')');

    const prompt = getForgeExtractionPrompt(scenario.fileName) + '\n\n--- DOCUMENT CONTENT ---\n' + scenario.text + '\n--- END DOCUMENT ---';
    const sourceRecord: ForgeSourceRecord = {
      id: 'bench-src-' + (i + 1),
      fileName: scenario.fileName,
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
      fileSizeBytes: Buffer.byteLength(scenario.text, 'utf-8'),
    };

    const start = Date.now();
    let rawOutput = '';
    let parsedJson: unknown = null;

    try {
      rawOutput = await generateLocalText(prompt, {
        baseUrl,
        model,
        jsonMode: true,
        temperature: 0.2,
        max_tokens: 8192,
        timeoutMs: 90000,
      });
      interface ForgeExtractionOutput {
        title?: string;
        [key: string]: unknown;
      }
      parsedJson = parseOrRepairJson<ForgeExtractionOutput>(rawOutput);
    } catch (err: unknown) {
      console.error('  ! Generation error:', err instanceof Error ? err.message : String(err));
    }

    const latencyMs = Date.now() - start;

    if (!parsedJson) {
      console.error('  ! Failed to parse JSON response');
      results.push({
        scenario: scenario.name,
        pass: false,
        latencyMs,
        error: 'Invalid JSON',
      });
      continue;
    }

    const analysis = validateAndNormalizeDocumentAnalysis(parsedJson, sourceRecord);

    const titleCandidate = analysis.candidates.find((c) => c.target === 'scenario_title');
    const topologyNodes = analysis.candidates.filter((c) => c.target === 'topology_node');
    const topologyEdges = analysis.candidates.filter((c) => c.target === 'topology_connection');
    const castSeeds = analysis.candidates.filter((c) => c.target === 'cast_seed');
    const quarantinedIssues = analysis.validationIssues || [];

    const jsonTitle = typeof (parsedJson as Record<string, unknown>)?.title === 'string' ? (parsedJson as Record<string, unknown>).title as string : '';
    const extractedTitle = (typeof titleCandidate?.proposedValue === 'string' ? titleCandidate.proposedValue : '') || jsonTitle || '';
    const nodeCount = topologyNodes.length;
    const edgeCount = topologyEdges.length;
    const castCount = castSeeds.length;
    const quarantineCount = quarantinedIssues.length;

    console.log('  < Latency: ' + latencyMs + 'ms');
    console.log('  * Title:      "' + extractedTitle + '" ' + (extractedTitle ? '✓' : '✗'));
    console.log('  * Locations:  ' + nodeCount + ' nodes (target: >= 5) ' + (nodeCount >= 5 ? '✓' : '✗'));
    console.log('  * Edges:      ' + edgeCount + ' connections ' + (edgeCount > 0 ? '✓' : '✗'));
    console.log('  * Cast:       ' + castCount + ' members ' + (castCount >= 2 ? '✓' : '✗'));
    console.log('  * Quarantine: ' + quarantineCount + ' issues ' + (quarantineCount === 0 ? '✓' : '⚠'));

    results.push({
      scenario: scenario.name,
      fileName: scenario.fileName,
      latencyMs,
      extractedTitle,
      nodeCount,
      edgeCount,
      castCount,
      quarantineCount,
      quarantinedIssues: quarantinedIssues.map((q) => q.message),
      pass: Boolean(extractedTitle) && nodeCount >= 4 && quarantineCount === 0,
      nodes: topologyNodes.map((n) => typeof n.proposedValue === 'object' && n.proposedValue ? (n.proposedValue as Record<string, unknown>).label : n.label),
    });
  }

  const reportPath = path.resolve('c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/scratch/forge_extraction_benchmark.md');
  const md = '# Forge Extraction Benchmark Report\n\n' +
    '**Model**: `' + model + '` (`' + baseUrl + '`)  \n' +
    '**Timestamp**: `' + new Date().toISOString() + '`\n\n' +
    '## Summary Table\n\n' +
    '| Scenario | Title Extracted | Locations (Nodes) | Edges | Cast | Quarantine Count | Verdict | Latency |\n' +
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n' +
    results.map((r) =>
      '| **' + r.scenario + '** | ' + (r.extractedTitle || '*(missing)*') + ' | ' + r.nodeCount + ' | ' + r.edgeCount + ' | ' + r.castCount + ' | ' + r.quarantineCount + ' | ' + (r.pass ? 'PASS' : 'WARN/FAIL') + ' | ' + r.latencyMs + 'ms |'
    ).join('\n') +
    '\n\n## Extracted Locations Detail\n\n' +
    results.map((r) =>
      '### ' + r.scenario + '\n' +
      (r.nodes && r.nodes.length > 0 ? r.nodes.map((n) => '- ' + n).join('\n') : '- *(None)*') +
      (r.quarantinedIssues && r.quarantinedIssues.length > 0 ? '\n\n**Quarantined Issues**:\n' + r.quarantinedIssues.map((i) => '- ' + i).join('\n') : '')
    ).join('\n\n');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, md, 'utf-8');
  console.log('\n[Benchmark Report Saved]: ' + reportPath);

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('benchmark_forge_extraction.ts')) {
  runForgeBenchmark().then(() => process.exit(0)).catch((e) => {
    console.error('Benchmark failed:', e);
    process.exit(1);
  });
}