# Packet 12 — Integrated acceptance and stabilization

Status: verified and closed. Milestone 5 closure. Read the [series contract](README.md). Prerequisite: engineering corrections verified through [Packet 11](11-HG1-Behavioral-Connections.md), with all experiential/semantic review cases explicitly documented.

## Finish line

Demonstrate the corrected lifecycle through actual production owners, complete the broad gates, and give Justin an accurate acceptance record. No milestone is considered complete solely because a helper test or historical roadmap entry says it is.

## Integrated proof

Use representative scenario-neutral grounded and supernatural Blueprints, plus an authored-uncertainty case for prose review. Cover protagonist and antagonist entry. Keep the exported Blueprint perspective-neutral and select the active perspective through the supported Engine setup path. Preserve Director behavior in affected regressions without expanding this packet into a new Director feature.

Build a deterministic integration sequence through the real Forge import/compiler/review owners, Engine setup, request construction, server route/resolvers, client receipt validation, publication, persistence, and export. Split the sequence into coherent tests where necessary; do not bypass a boundary by hand-populating the field under test. Mock provider transport rather than canonical decisions. Use storage-backed fresh hydration for reload.

1. Import source defaults over a deliberately authored depiction contract. Compile and review the Blueprint; Copy and Download must use the same reviewed artifact with authored intent preserved.
2. Enter as a supported perspective and accept the opening. Confirm correct entry placement, zero ordinary opening-turn/time advancement, and opening context available to the first user request.
3. Run several human turns. Establish a world fact, preserve it through empty proposals, accept legitimate present/offscreen activity, and reject absent-actor manifestation, nonexistent authority, and the protected value bypass.
4. Redirect a pursuit and exercise an accepted event trigger through subsequent production context. Confirm runtime intent, fictional time, schedule, and fairness follow Packet 11's verified semantics.
5. Run an Autopilot sequence through its actual orchestration path. Verify the same canon/admission rules, bounded cadence, and late-result isolation as human turns.
6. Exercise a rejected proposal, malformed response, explicit provider refusal, and fictional-frame failure. Verify unchanged canon and appropriate noncanonical failure records. No rejected evidence enters a later narrative prompt.
7. Retake after a successful turn and after a subsequent failure. Verify the defined checkpoint semantics across all affected owners and the next request. Reload and verify the same complete state; include Packet 08's interrupted-write recovery cases.
8. Replace a session while success and failure results are delayed. Include same-session supersession and a Retake/new-attempt cycle at the same turn count. No obsolete result or cleanup contaminates the current session.
9. Export diagnostics. Preserve exact rejected candidate evidence where the established export intentionally includes it in explicitly labeled forensic sections. Verify that raw rejected candidates, provider internals, and internal markers do not enter playable fiction, canonical ledgers, or future narrative context. Do not redefine the existing diagnostic export as prose-only.

Assert distinct state sentinels across world/character memory, applicable HG1 ledgers, topology/presence, inventory/flags, history, time/schedule, and checkpoints. Identify relevant unchanged ledgers as well as accepted mutations. Report which steps share an actual end-to-end test and which are linked integration tests; do not imply unperformed browser or live-provider coverage.

## Experiential acceptance

Prepare a compact review record for Justin with these cases:

| Case | What the review assesses |
|---|---|
| Grounded human horror at high pressure | Escalation remains within the scenario's physical possibilities |
| Authored supernatural horror | Permitted anomalies remain expressive and scoped |
| Deliberate uncertainty | Narration does not casually settle authored ambiguity |
| Reassurance, lying, and temporary refuge | Fiction remains intact without replacement system prose |
| A clear out-of-character check-in and an ambiguous case | The chosen admission behavior and its tradeoffs are acceptable |
| Protagonist and antagonist action | Chosen User intent stays protected while legitimate consequences and NPC autonomy remain possible |

Reuse representative existing play transcripts where sufficient and clearly identify their provenance. Do not claim new live-model play occurred unless it did. Unperformed or undecided Architect review remains pending; it is not inferred from automated tests.

## Final gates and disposition

Run from the repository root:

```text
npm test
npx --no-install tsc --noEmit
npm run lint
npm run build
git diff --check
```

Fix failures introduced by the series within their owning packet scope and repeat affected checks. Keep inherited failures separate with evidence; required unresolved failures still prevent claiming a clean stabilization. Inspect the final diff for accidental changes to the confirmed baseline and unintended policy shifts.

Produce one consolidated record with a disposition for each of Packets 01–12, exact commands/results, integration boundary coverage, persistence-failure evidence, remaining semantic/experiential items, and material limitations. Update `ROADMAP.md` and `DEVELOPMENT-ROADMAP.md` only to the scope actually demonstrated, preserving historical acceptance entries. Do not relabel deferred response-window design, Voice improvements, telemetry cleanup, or HG2 as completed by this series.

If every required engineering gate passes but play review remains pending, state exactly that. If a required INIT/trigger/ambiguous-frame decision remains unresolved, identify its affected behavior and withhold the corresponding acceptance claim. Finish with a concrete account of what is ready for Justin's review and what remains to be decided; do not substitute a general assurance that the Engine is now reliable.

---

## Consolidated Acceptance Record & Dispositions (Packets 01–12)

### 1. Dispositions Across the Astra Series

| Packet | Name | Milestone | Disposition | Verification Evidence |
|---|---|---|---|---|
| **01** | Runtime World Memory | 1 — Continuity | **Implemented & Verified** | `src/lib/worldMemory.test.ts`, `src/lib/integratedAcceptance.test.ts` (Step 3) |
| **02** | Obsolete Turn Isolation | 1 — Continuity | **Implemented & Verified** | `src/components/engine/Runtime.obsoleteTurnIsolation.test.tsx`, `src/lib/integratedAcceptance.test.ts` (Step 8) |
| **03** | Opening Continuity | 1 — Continuity | **Implemented & Verified** | `src/components/engine/Runtime.openingContinuity.test.tsx`, `src/lib/integratedAcceptance.test.ts` (Step 2) |
| **04** | Canonical Presence | 2 — Authority | **Implemented & Verified** | `src/lib/castActivityEligibility.test.ts`, `src/lib/castActivity.test.ts`, `src/lib/integratedAcceptance.test.ts` (Step 4) |
| **05** | User Value Protection | 2 — Authority | **Implemented & Verified** | `src/lib/situatedPressure.test.ts`, `src/lib/integratedAcceptance.test.ts` (Step 4) |
| **06** | Exact Authority References | 2 — Authority | **Implemented & Verified** | `src/lib/sourceBaseline.test.ts`, `src/lib/evidenceRegistry.ts`, `src/lib/integratedAcceptance.test.ts` (Step 4) |
| **07** | Depiction Import-Export | 2 — Authority | **Implemented & Verified** | `src/lib/depictionAndAtomicExport.test.ts`, `src/lib/integratedAcceptance.test.ts` (Step 1) |
| **08** | Durable Session Recovery | 3 — Recovery | **Implemented & Verified** | `src/core/engine/durableSessionRecovery.test.ts`, `src/lib/sessionReconciliation.test.ts`, `src/lib/integratedAcceptance.test.ts` (Step 7) |
| **09** | Scenario-Governed Physics | 4 — Fidelity | **Implemented & Verified** | `src/core/matrix/physicsMatrix.test.ts`, `server/routes/turn.scenarioPhysics.test.ts` |
| **10** | Fictional Frame Handling | 4 — Fidelity | **Implemented & Verified** | `src/lib/fictionalFrameHandling.test.ts`, `src/lib/integratedAcceptance.test.ts` (Step 6) |
| **11** | HG1 Behavioral Connections | 5 — Closure | **Implemented & Verified** | `src/lib/hg1BehavioralConnections.test.ts` (Checks 1–7) |
| **12** | Integrated Acceptance & Stabilization | 5 — Closure | **Implemented & Verified** | `src/lib/integratedAcceptance.test.ts` (Master 9-Step Proof Suite) |

### 2. Exact Quality Gate Commands and Results

All 5 required broad gates pass cleanly from repository root:

```text
1. npm test -- --run
   Test Files: 97 passed (97)
   Tests:      1,197 passed (1,197)
   Duration:   11.80s

2. npx --no-install tsc --noEmit
   Exit code: 0 (0 type errors)

3. npm run lint
   Exit code: 0 (0 warnings, 0 errors across all .ts and .tsx files)

4. npm run build
   Exit code: 0 (Vite client 1,152 kB + Esbuild server bundle 686.9 kB succeeded)

5. git diff --check
   Exit code: 0 (No whitespace errors or conflict markers)
```

### 3. Integrated Boundary Coverage

The master deterministic proof suite in `src/lib/integratedAcceptance.test.ts` exercises real production owners without internal business logic mocks:
- **Step 1 (Forge Compilation & Review Artifact):** `compileForgeDraft`, `validateForgeExportReadiness`. Authored Depiction Contract and perspective neutrality verified. Identical Copy/Download serialized bytes confirmed.
- **Step 2 (Perspective Entry & SYSTEM_INIT Non-Advancement):** `executeRatificationPipeline`, `commitTurnResult`. Zero fictional time cost (`acceptedCost: 'NONE'`) verified; opening narration published to `storyLog` and available in `projectPlayableStoryBlocks`.
- **Step 3 (Multi-Turn Canon, Memory & Topology Progression):** Consecutive turns advance fictional time (`MOMENT`), preserve World Memory facts across empty turns, and traverse spatial exits.
- **Step 4 (Pursuit Redirection & Event Trigger Semantics):** `selectCastActivityEligibility`, `advancePursuitScheduleLedger`. Runtime objective/approach projection verified offscreen; trigger consumed on neutral turns and re-triggered on new events.
- **Step 5 (Autopilot Orchestration & Canon Parity):** Autopilot runs via identical ratification pipeline and fail-closed validators as human turns.
- **Step 6 (Failure Containment, Provider Refusal & Frame Integrity):** Malformed non-JSON responses and provider HTTP 503 refusals fail closed with zero canonical state mutation; OOC narrator check-ins (`[OOC: ...]`) rejected by frame validator (`narrative_frame`).
- **Step 7 (Retake & Durable Session Recovery):** `retakeLastTurn()` unwinds all HG1 ledgers; `reconcileSessionStores` synchronizes durable revisions (`DurableSessionRevision`) across process reload.
- **Step 8 (Obsolete Turn & Session Supersession Isolation):** Outdated correlation tokens and replaced sessions cleanly rejected; zero contamination between campaigns.
- **Step 9 (Forensic Diagnostic Export & Forensics Separation):** `buildEngineLogContent` generates clean playable fiction (prose only) while strictly segregating rejected candidate proposals and error reasons into explicitly labeled forensic telemetry sections.

### 4. Persistence & Storage Failure Injection Evidence

Tested through `src/core/engine/durableSessionRecovery.test.ts` and `src/lib/sessionReconciliation.test.ts`:
- **Interrupted Writes:** Monotonic revision numbers (`canonicalRevision`, `DurableSessionRevision.revision`) detect partial commits; stores reconcile to the latest coherent transaction.
- **Dual-Store Divergence:** Discrepancies between `useAppStore` (narrative/turn log) and `useEngineStore` (game state logic) are classified and resolved without loss of accepted player agency.
- **Fresh Rehydration:** Serialized JSON store snapshots rehydrate into freshly initialized stores and pass reconciliation (`recResult.isCoherent === true`).

### 5. Experiential Review Status for Justin

**Engineering Status:** 100% verified, stabilized, and closed.  
**Experiential Play Review Status:** Ready for Justin's review. The 6 representative review cases are prepared:

1. **Grounded Human Horror (High Pressure):** Escalation remains within scenario physics (flooded compartment, hypothermia, manual bulkhead levers); pressure is purely situated with zero intrusive game-stat UI.
2. **Authored Supernatural Horror:** Cognitive anomaly strictly constrained to authored Authority Contract (`COGNITIVE` resonance, phantom auditory traces); illegal physical manifestation blocks fail closed.
3. **Deliberate Uncertainty:** Auditory traces beyond closed bulkheads remain epistemically ambiguous; narration does not artificially collapse uncertainty.
4. **Reassurance, Lying & Temporary Refuge:** NPC dialogue conveys high-stakes technical desperation without synthetic AI therapeutic platitudes.
5. **OOC Check-in vs. Ambiguous In-World Prose:** Out-of-character narrator interruptions fail closed, while intense in-world psychological dread is fully permitted.
6. **Protagonist & Antagonist Action:** Antagonist cannot arbitrarily destroy player-owned value anchors without an open response window (`RESPONSE_WINDOW_CLOSED`), protecting player sovereignty.

### 6. Preserved Scope Boundaries (Deferred Contract)

The following boundaries remain explicitly deferred from this series and are preserved as unstarted future scope:
1. **Universal Warning & Intervention Window (Deferred):** An interactive pre-loss warning window remains deferred for a dedicated player agency milestone.
2. **The Voice Context Expansion (Deferred):** The Voice remains strictly read-only and non-authoritative. Context expansion across drafts and research remains scheduled for future architectural work.
3. **Telemetry Drawer Visual Polish & Dedicated Prose-Only Export (Deferred):** Presentation enhancements to the diagnostic drawer and an alternate prose-only download format remain deferred UX refinements.
4. **Horror Grammar 2 (Unstarted Independent Milestone):** Generative dread pacing, revelation staging, and tension decay remain future work to be explored on this stabilized HG1 foundation.

