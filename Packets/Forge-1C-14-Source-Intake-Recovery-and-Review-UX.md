# The Terror Machine — Forge 1C-14
## Source-Intake Recovery and Review UX

### Dependency

Begin only after Forge 1C-13 passes its focused gate. Implement cumulatively against that state.

This packet owns the client/store presentation and lifecycle of successful, partial-with-issues, and fatal reference analyses. It must preserve the unified Forge authoring work already landed in 1C-9 through 1C-12.

---

## Objective

Replace the current fatal red schema wall with a compact, truthful source-intake result: valid candidates remain reviewable, quarantined candidates are visibly excluded, fatal imports do not register misleading source state, and automatic Depiction Contract staging runs only from an eligible successful baseline.

---

## 1. Make FileDropzone branch on typed analysis outcome

After document normalization:

### Successful analysis

- register the source binding and analysis through the existing canonical action;
- show the normal extracted candidate count;
- trigger initial depiction proposal eligibility once; and
- preserve current source/candidate review behavior.

### Successful analysis with quarantined issues

- register the valid analysis and source binding;
- report valid candidate count and quarantined issue count separately;
- keep all valid candidates reviewable/applicable;
- trigger depiction proposal only if `checkDepictionGenerationReadiness()` succeeds from valid data; and
- never imply that quarantined candidates were accepted or applied.

### Fatal analysis

- do not register it as an ordinary source baseline;
- do not retain/reuse a binding as though a valid source context exists;
- do not trigger the Depiction Contract request;
- render one bounded safe fatal message with a re-import affordance; and
- preserve the pre-import draft, existing source analyses, pending depiction proposal, and Architect state.

Coordinate server binding cleanup through the existing revocation path where a binding was created for a fatal result. Do not leak the token or binding details.

Do not let a rejected/fatal analysis proceed to the current unconditional `setRuntimeSourceBinding()`, `registerSourceAnalysis()`, auto-depiction call, and success message path.

---

## 2. Add a compact quarantine summary to Scenario Baseline

For `completed_with_issues` or an equivalent typed state, render an amber source-level summary such as:

> Imported with 33 reviewable candidates; 7 malformed candidates were quarantined and cannot affect the Blueprint.

Within an expandable **Extraction Issues** section, display only:

- candidate number and recognized target/label;
- field path;
- safe message;
- allowed values when helpful; and
- explicit status `QUARANTINED — NONCANONICAL`.

The section must begin collapsed when the source has reviewable candidates. Long diagnostics must wrap inside the panel and remain bounded. Do not reproduce the full provider/Zod error paragraph shown by the current UI.

Required actions:

- **Review valid candidates** remains the primary path;
- **Re-import source** focuses/returns to the existing file intake control and explains that the original source bytes are not silently retained for replay;
- **Remove source** uses the existing source-removal/binding-revocation owner; and
- optional **Dismiss issue summary** may hide the local presentation but must not turn quarantined material into a candidate.

Do not add an identical AI Retry button unless the production path still possesses the exact source bytes and can safely resubmit them. Never pretend to retry from unavailable bytes.

---

## 3. Keep candidate review and application honest

- Candidate counts and bulk actions include only valid typed candidates.
- Quarantined issues never appear with Accept/Edit/Apply controls.
- Applying all accepted candidates remains atomic for the valid candidate set.
- A later application failure preserves the draft and staged valid candidates.
- Editing a valid candidate still revalidates through its exact target schema.
- Removing/re-importing a source invalidates any accepted reviewed-source state through the existing provenance/revision owners.

The existence of a quarantined optional candidate is not itself a blanket export failure. If its absence leaves a required canonical field incomplete, the existing readiness gate must block that exact field and direct the User to its canonical authoring owner.

Do not add a second source-readiness system based solely on issue count.

---

## 4. Coordinate automatic Depiction Contract staging

Repair the timing around `triggerInitialDepictionProposalIfEligible()`:

- invoke it only after successful source registration is observable to the readiness helper;
- do not fire it for a fatal analysis;
- do not fire it merely because a source has issues;
- allow it when the remaining valid analysis satisfies the existing depiction-generation prerequisites;
- preserve the exactly-once/hydration protections from 1C-9;
- do not overwrite a pending current proposal or canonical completed contract; and
- surface a blocked reason in the Depiction Contract panel without turning successful source intake into a fatal error.

Avoid fire-and-forget sequencing that reads stale pre-registration store state. Use one production orchestration action/helper with a defined result, while keeping source import successful if depiction generation later fails transiently.

---

## 5. Bound user-facing and diagnostic output

- Convert schema issue paths into stable concise labels.
- Cap issue count, message length, and allowed-value lists.
- Keep raw provider response, source content, stack, endpoint, model metadata, credentials, and source binding outside UI and ordinary telemetry.
- Log only safe structured issue summaries in development diagnostics.
- Preserve the provider-refusal containment rules already installed.

The User must be able to understand which extracted proposal was excluded and continue authoring without reading Zod internals.

---

## 6. Readiness, export, persistence, and recovery

Update affected owners so:

- typed issue records survive Forge persistence/hydration with bounded schema validation;
- malformed legacy issue records are dropped without deleting the valid analysis;
- review/export summaries count valid candidates and quarantined issues separately;
- issue records never enter the compiled Blueprint or ordinary Blueprint download/copy output;
- accepted reviewed-source fields still resolve only to valid applied candidates;
- Retake/Engine state is untouched; and
- re-importing/removing a source cannot leave stale pending depiction or accepted source provenance.

Do not migrate or rewrite already constructed Blueprint JSON files; their ingress path remains independent.

---

## 7. Required tests

Add focused proof for:

- FileDropzone registers successful and completed-with-issues analyses but not fatal analyses;
- fatal analysis does not retain binding, trigger depiction, alter the draft, or emit a success message;
- completed-with-issues displays separate valid/quarantined counts;
- issue details are collapsed, bounded, field-addressable, and labeled noncanonical;
- valid candidates remain editable/reviewable/applicable;
- quarantined candidates have no review/apply controls and cannot enter bulk actions;
- optional quarantine alone does not block export;
- missing required canonical state still blocks at the correct authoring field;
- re-import affordance returns focus to the existing intake control and retains no fake replay promise;
- removing a source uses canonical revocation and invalidation;
- automatic depiction fires once only after eligible successful registration;
- fatal/ineligible source does not trigger depiction;
- depiction failure does not roll back successful source import;
- typed issues persist safely and remain absent from Blueprint copy/download/Engine context; and
- sentinel diagnostics remain outside canonical and ordinary export surfaces.

Prefer extending:

- `src/components/forge/FileDropzone.test.tsx`
- `src/components/forge/ScenarioBaselinePanel.test.tsx`
- `src/components/forge/DepictionContractPanel.test.tsx`
- `src/lib/depictionProposalOrchestrator` tests
- `src/store/useForgeStore.test.ts`
- `src/lib/forgeReadiness.test.ts`
- `src/components/forge/ExportReviewModal.test.tsx`
- `src/lib/sourceBaseline.test.ts`

Add a component test only when no current file owns the visible issue summary.

---

## Focused gate

Run only the directly affected client/store/readiness/export suites:

```bash
npx vitest run src/components/forge/FileDropzone.test.tsx src/components/forge/ScenarioBaselinePanel.test.tsx src/components/forge/DepictionContractPanel.test.tsx src/store/useForgeStore.test.ts src/lib/sourceBaseline.test.ts src/lib/forgeReadiness.test.ts src/components/forge/ExportReviewModal.test.tsx
```

Include a new depiction-orchestration test under its exact filename if created. Do not run the full suite, global type check, lint, or production build in this packet.

Report exact file and test counts.

---

## Completion criteria

Packet 1C-14 is complete only when the User can continue from a partially useful extraction, understands what was quarantined, cannot accidentally accept invalid material, receives no false success for fatal analysis, and gets automatic depiction staging only from an eligible committed baseline.

Stop and report incomplete if fatal analyses register as valid sources, issue records become editable candidates, optional quarantine blocks every export, automatic depiction reads stale state/fires twice, or provider/schema internals remain the primary User-facing error.

---

## Out of scope

- Provider contract/normalization expansion beyond defects found in 1C-13
- Final production import-to-export/Engine proof
- Redesign of character/map/Architect authoring
- Autopilot Observe
- Non-user initiative/HG1 diagnosis
- Director mode
- README or roadmap edits
