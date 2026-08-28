# The Terror Machine — Forge 1C Reference-Import Remediation
## Sequential Kickoff for ATG

### Live reviewed baseline

Implement cumulatively against live `main` at:

`b64cc344772e28ed66edb76c34e9def36402e436`

The Forge 1C-9 through 1C-12 authoring-consolidation implementation is already landed in commit `f19d1dc` beneath this README revision. Preserve that implementation: the unified character authoring surface, strict placement migration, automatic Depiction Contract proposal, reviewed provenance, explicit rich-map start behavior, Architect recovery classifier, and production-path owners remain the foundation.

This series repairs the remaining reference-extraction seam exposed by live User testing. It does not repeat or replace 1C-9 through 1C-12.

---

## Observed failure class

A reference document can reach `/api/extract-blueprint` successfully but produce several candidate-level enum/discriminator mismatches. The client normalizer currently converts any candidate error into one fatal source analysis, discards every otherwise valid candidate, registers an error analysis, and leaves the User with a long unstructured error wall.

The observed paths include:

- `cast_expression_guidance.proposedValue.communicationModes` outside `spoken | nonverbal | mediated`;
- `topology_connection.proposedValue.kind` outside the exact `EdgeKindSchema` values; and
- `value_anchor.proposedValue.holder.kind` outside `CHARACTER | RELATIONSHIP | PLACE | SCENARIO`.

The strict canonical schemas are correct. The defect is that the provider contract does not enumerate those requirements precisely and candidate-local model drift destroys the entire usable import.

---

## Goal

Make reference intake strict, recoverable, and useful:

- the provider receives an exact extraction contract derived from the active schema owners;
- narrowly equivalent provider vocabulary may be normalized deterministically;
- an unresolved malformed candidate is quarantined and cannot become canonical;
- valid evidence, candidates, and unknowns from the same response remain reviewable;
- the User receives bounded, field-addressable issue summaries rather than raw schema noise;
- automatic Depiction Contract staging runs only from an eligible successful baseline;
- source review and export remain fail-closed at the actual missing canonical field rather than blocking solely because an unrelated optional candidate was quarantined; and
- existing Blueprint JSON import and Engine execution remain unchanged.

---

## Required order

1. `Forge-1C-13-Extraction-Contract-Alignment-and-Candidate-Quarantine.md`
2. `Forge-1C-14-Source-Intake-Recovery-and-Review-UX.md`
3. `Forge-1C-15-Live-Import-to-Export-Closure-and-Stabilization.md`

Packets 1C-13 and 1C-14 run focused gates only. Packet 1C-15 alone owns the cumulative production proof and broad stabilization run.

---

## Global invariants

- Preserve one canonical `ForgeSourceAnalysis`, candidate ledger, Forge draft, and export path. Do not create a second permissive import authority.
- Provider output remains proposal material. No alias normalization, quarantine action, retry, or UI recovery may mark a candidate accepted/applied or mutate the draft.
- Candidate-level failure is fail-closed for that candidate, not automatically fatal for unrelated valid candidates.
- Envelope/source-identity failure remains fatal for the analysis.
- Exact canonical enums and discriminated unions remain strict. Do not add `z.unknown()`, catch-all strings, or permissive fallback members to make provider output parse.
- Deterministic normalization must be target-specific, bounded, auditable, and semantically unambiguous. Unknown values are quarantined, never guessed.
- Server-owned source identity and exact evidence resolution remain mandatory.
- Quarantined provider material remains outside canonical draft, Blueprint, Engine context, prompts, story state, and ordinary exports.
- Already constructed Blueprints must continue to import, initialize, and run through the Engine.
- Do not include Autopilot Observe selection, non-user initiative diagnosis, Director mode, separate HG1 repairs, or documentation changes in this series.

---

## Stop conditions

Stop the current packet and report the owning boundary if:

- keeping valid candidates would require applying or trusting an invalid candidate;
- a schema must be loosened globally to accommodate provider drift;
- a proposed alias has multiple plausible canonical meanings;
- raw provider candidate payloads, source text, stack data, endpoints, or credentials would need to be persisted/displayed as diagnostics;
- a fatal source binding or envelope failure is treated as a recoverable partial import;
- automatic depiction generation requires an invalid/quarantined candidate;
- existing Blueprint import or Engine session initialization must be redesigned; or
- the final proof cannot traverse the production extraction, normalization, registration, review, export, and Engine-ingress owners.

Do not hide a stop condition with a default enum, placeholder candidate, blanket `PHYSICAL` conversion, test-only adapter, or suppressed error.

---

## Verification discipline

- 1C-13: strict schemas, provider prompt/config, deterministic normalization, issue contract, and pure normalization tests.
- 1C-14: FileDropzone, Scenario Baseline, store registration, depiction eligibility, recovery controls, readiness, and export-containment tests.
- 1C-15: real production path with mocked provider outputs, then one broad repository gate.

Report exact commands, file counts, and test counts. The final report must distinguish normalized, quarantined, and fatal failures.

---

## Consolidated delivery

After 1C-15, return one report containing:

1. baseline and final working state;
2. changed files grouped by server contract, normalization, store, UI, and verification owner;
3. exact provider enum/discriminator contract;
4. deterministic alias table and why each alias is unambiguous;
5. candidate quarantine and fatal-analysis rules;
6. source intake and depiction-proposal recovery behavior;
7. live import-to-export/Engine proof;
8. focused and broad commands/results with exact counts;
9. residual defects or limitations; and
10. confirmation that Autopilot, non-user initiative, Director mode, unrelated HG1 work, and documentation were not changed.

