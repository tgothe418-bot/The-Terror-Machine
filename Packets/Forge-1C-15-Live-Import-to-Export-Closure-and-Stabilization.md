# The Terror Machine — Forge 1C-15
## Live Import-to-Export Closure and Stabilization

### Dependency

Begin only after Forge 1C-13 and 1C-14 pass their focused gates. Implement cumulatively against that state.

This is the only packet in the reference-import remediation series that owns the production-path proof and broad stabilization run.

---

## Objective

Prove that realistic provider drift no longer destroys a reference import: valid candidates survive, safe aliases normalize, ambiguous invalid candidates remain quarantined, the User can complete review/export, and the resulting Blueprint still initializes the existing Engine without changes to Autopilot, non-user initiative, or Director mode.

---

## 1. Deterministic extraction fixtures

Create bounded invented provider-response fixtures that enter through the real `/api/extract-blueprint` route contract.

### Clean fixture

Include:

- evidence;
- explicit cast identities and user-character boolean;
- canonical expression modes;
- compact topology nodes, canonical directed connection kinds, explicit start, anchor, and placements;
- valid value-holder discriminators;
- one user opening aim;
- one non-user pursuit and one character with no source pursuit; and
- enough valid baseline material for Depiction Contract proposal readiness.

### Recoverable drift fixture

Mix independent valid candidates with unambiguous aliases at the three observed paths:

- expression communication labels that map exactly to the canonical three-mode vocabulary;
- physical-path connection labels that map exactly to `PHYSICAL`; and
- holder synonyms that resolve to `CHARACTER`, `PLACE`, or `SCENARIO` only because their required IDs/shape make the meaning singular.

Assert exact deterministic normalization and no issues for approved aliases.

### Quarantine fixture

Mix independent valid candidates with ambiguous/unresolvable values at:

- expression communication mode;
- topology connection kind;
- value-holder discriminator;
- unresolved evidence; and
- one missing required candidate field.

Assert that only those candidates are excluded, each produces one bounded typed issue, and the remaining valid analysis is usable.

### Fatal fixture

Use a malformed/unparseable extraction envelope or invalid source identity that cannot yield a trustworthy baseline. Assert fatal containment and no source registration.

Do not use copyrighted reference prose or prior User telemetry as fixture content. Do not require a live API key.

---

## 2. Drive the actual production path

The central positive and partial-with-issues proofs must traverse:

1. real extraction route request parsing and mocked provider generation;
2. provider JSON parsing and server-owned source identity;
3. active shared/client normalization and alias/quarantine logic;
4. canonical source binding/analysis registration;
5. visible Scenario Baseline issue and candidate counts;
6. candidate review and atomic application through production store actions;
7. eligible automatic Depiction Contract staging and explicit Apply;
8. consolidated character authoring for any missing required player/placement/aim/intent state;
9. explicit map/start readiness through existing map actions;
10. `validateForgeExportReadiness()` using the exact registered source analyses;
11. immutable review artifact creation, serialization, and public Blueprint ingress;
12. Engine Setup and session initialization from that exact artifact; and
13. first Engine turn request construction/schema validation through the existing production owner.

Do not hand-build the post-import analysis, Forge draft, Blueprint, Engine context, or turn request in the central proof. Use a production helper/controller if component orchestration must be extracted; do not add a test-only adapter.

The fatal fixture must stop before registration, depiction generation, draft mutation, export, or Engine ingress.

---

## 3. Positive assertions

- Exact canonical provider values pass unchanged.
- Approved aliases normalize once and are traceable in safe development diagnostics.
- Independent valid candidates survive beside quarantined candidates.
- The User can review/apply remaining candidates and author genuinely missing required fields.
- Quarantined candidates never appear as accepted, staged, applied, or canonical.
- Candidate/evidence/provenance linkage remains exact for accepted source-backed state.
- Automatic depiction proposal runs once when the retained valid baseline is eligible.
- The export artifact contains no issue records or invalid candidate material.
- The exact explicit rich-map start and selected user character survive into Engine Setup.
- The existing Engine constructs a valid first turn without import-remediation-specific fallback state.

---

## 4. Negative and containment matrix

Cover at least:

- invalid expression value with no approved alias;
- invalid connection kind with no approved alias;
- invalid holder kind or missing required holder ID;
- ambiguous alias that could map to multiple canonical kinds;
- candidate with unresolved/cross-source evidence;
- missing explicit user-character boolean;
- issue count/message exceeding bounds;
- raw provider/source/stack/endpoint/credential sentinels inside an invalid candidate;
- analysis with valid candidates plus issues;
- analysis with no trustworthy usable baseline;
- fatal analysis followed by attempted depiction trigger;
- quarantined candidate referenced by opening aim or reviewed provenance;
- issue-only source state after persistence/hydration; and
- already constructed Blueprint JSON import after all remediation changes.

Every failure must leave the prior canonical draft, source baseline, pending depiction state, and Engine stores unchanged except for a successfully registered valid/partial source explicitly expected by that case.

---

## 5. Existing Blueprint and Engine regression proof

Use one existing strongly typed repository Blueprint fixture to prove:

- native JSON/source registration remains compatible;
- copy/download/normalize behavior is unchanged;
- Engine Setup still resolves the selected seat and explicit start;
- session initialization succeeds; and
- an ordinary first turn request remains schema-valid.

Do not add or modify Autopilot action selection. Do not use this packet to diagnose or claim resolution of non-user independent initiative.

---

## 6. Integrated focused gate

Before the broad run, execute the production reference-import integration suite and all directly affected suites from 1C-13 and 1C-14.

At minimum include:

```bash
npx vitest run server/routes/forge.test.ts src/lib/sourceBaseline.test.ts src/components/forge/FileDropzone.test.tsx src/components/forge/ScenarioBaselinePanel.test.tsx src/components/forge/DepictionContractPanel.test.tsx src/store/useForgeStore.test.ts src/lib/forgeReadiness.test.ts src/components/forge/ExportReviewModal.test.tsx src/lib/forgeVerticalIntegration.test.ts src/lib/normalizeBlueprint.test.ts src/components/engine/EngineSetup.test.tsx src/core/engine/sessionInitialization.test.ts src/lib/buildEngineTurnContext.test.ts
```

Include any new extraction-contract, depiction-orchestration, or import-integration suite under its exact filename. Report exact file/test counts.

---

## 7. Broad stabilization gate

After the integrated focused gate passes, run once:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Run the repository's existing prohibited-name guard without adding prohibited names to code, fixtures, descriptions, reports, or generated artifacts.

Do not skip, suppress, or weaken tests to obtain a green result. Enumerate intentionally superseded assertions in the completion report.

---

## 8. Completion criteria

The reference-import remediation is ready for renewed User testing only when:

- clean extraction imports normally;
- the three observed contract paths are explicitly aligned;
- safe aliases normalize without weakening schemas;
- ambiguous invalid candidates are quarantined individually;
- valid candidates remain reviewable and exportable;
- fatal analyses do not register or trigger depiction;
- diagnostics are bounded and noncanonical;
- the production import-to-export/Engine proof passes; and
- existing Blueprint/Engine behavior remains intact.

If any criterion fails, report the remediation incomplete and identify the owning boundary. Do not substitute an all-or-nothing error analysis, guessed defaults, or hand-built fixture state for the missing behavior.

---

## Out of scope

- Autopilot Observe action selection
- Diagnosis or repair of non-user character initiative
- Director mode
- Separate HG1 authority/perception/forensics work
- Dynamic map expansion
- README or roadmap changes

---

## Consolidated completion report

Return one report for 1C-13 through 1C-15 with:

1. baseline and final working state;
2. changed files grouped by ownership;
3. final provider extraction contract and structured-output configuration;
4. complete deterministic alias table;
5. candidate quarantine versus fatal-analysis rules;
6. source-intake/depiction recovery UX;
7. clean, recoverable-drift, quarantine, and fatal fixture results;
8. exact production path traversed;
9. existing Blueprint/Engine regression results;
10. focused and broad commands with exact counts;
11. residual defects or limitations; and
12. confirmation that Autopilot, non-user initiative, Director mode, unrelated HG1 work, and documentation were not changed.

