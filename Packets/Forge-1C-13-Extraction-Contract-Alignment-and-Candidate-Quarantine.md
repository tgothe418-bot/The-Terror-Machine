# The Terror Machine — Forge 1C-13
## Extraction Contract Alignment and Candidate Quarantine

### Dependency

Begin from live `main` at `b64cc344772e28ed66edb76c34e9def36402e436`.

The 1C-9 through 1C-12 implementation is already installed. This packet owns only the provider-response-to-typed-source-analysis boundary.

---

## Objective

Align the extraction prompt/provider configuration with the exact active enums and discriminated unions, introduce narrow deterministic normalization for unambiguous aliases, and preserve valid candidates by quarantining only unresolved malformed candidates.

Canonical schemas remain strict. The output of this packet is a typed source analysis containing valid candidates plus bounded validation issues—not a permissive candidate list.

---

## 1. Define one extraction-contract owner

Create or extend one server-safe extraction contract module that imports or derives its values from the active schema owners rather than duplicating prose-only enum lists.

At minimum expose exact provider-facing values for:

### Character expression modes

`CharacterCommunicationModeSchema`:

- `spoken`
- `nonverbal`
- `mediated`

### Topology connection kinds

`EdgeKindSchema`:

- `PHYSICAL`
- `FORCED_EVENT`
- `MEMORY_RECONSTRUCTION`
- `HISTORICAL_REFERENCE`
- `TERMINAL_EJECTION`
- `AUTHORED_PARADOX`

### Value-holder discriminators

`ValueHolderRefSchema`:

- `CHARACTER` with non-empty `castMemberId`;
- `RELATIONSHIP` with two distinct `castMemberIds`;
- `PLACE` with non-empty `nodeId`; and
- `SCENARIO` with no additional holder fields.

Also enumerate the active discriminators for placement, character-pursuit status/review window, provenance kind, evidence category, and every candidate target already accepted by `ForgeSourceCandidateSchema`.

The prompt, structured-output configuration, server validation, client/shared normalization, and tests must reference the same constants/schema metadata. A new enum added to a canonical owner must make extraction-contract drift visible in tests.

Do not weaken Engine/runtime schemas to match provider vocabulary.

---

## 2. Make the provider request structurally explicit

Replace vague descriptions such as `communicationModes: string[]`, `kind`, and `holder: { kind, ... }` with exact allowed values and target-specific object examples.

Where supported by the installed `@google/genai` SDK and current model policy:

- request JSON output through the provider's structured JSON response mode;
- provide a bounded response schema for the extraction envelope and candidate discriminators;
- keep the final local Zod validation authoritative; and
- do not assume provider structured output eliminates the need for validation.

If the SDK cannot express the full discriminated candidate union safely, constrain the outer envelope and shared discriminator enums through provider configuration, then retain target-specific Zod validation locally. Do not maintain a hand-authored provider schema whose values can silently diverge from the runtime owners.

Provider output must never be instructed to supply canonical acceptance state. Server-owned fields—source identity, review decision, application state, and canonical provenance binding—remain assigned after generation.

---

## 3. Add narrow deterministic alias normalization

Before candidate schema parsing, normalize only values with one unambiguous canonical meaning. Keep the tables target- and field-specific.

Permitted categories include:

- casing/whitespace normalization of exact values;
- clearly equivalent communication labels such as `verbal`/`speech` to `spoken`, gestural/body-language labels to `nonverbal`, and telephone/radio/written-channel labels to `mediated`;
- clearly physical spatial labels such as door, corridor, hallway, passage, or physical-path to `PHYSICAL`;
- value-holder aliases such as person/cast-member to `CHARACTER` only when a valid `castMemberId` is present, location/node to `PLACE` only when a valid `nodeId` is present, and world/global to `SCENARIO` only when no incompatible fields are present.

Requirements:

- document the final alias map in code beside its tests;
- normalize a value only after trimming and case-folding through one helper;
- preserve the provider value only as a bounded diagnostic label when it remains invalid;
- never default an unknown connection kind to `PHYSICAL`;
- never map an entity/object/concept holder to `CHARACTER` without a resolving cast ID;
- never invent missing relationship members, node IDs, cast IDs, evidence IDs, or provenance; and
- ensure normalization does not change valid canonical values.

If a term can mean more than one canonical state, quarantine it.

---

## 4. Introduce a typed candidate-validation issue

Extend `ForgeSourceAnalysisSchema` with one bounded diagnostic collection, for example `validationIssues`, containing strict records such as:

- stable deterministic issue ID;
- source ID;
- one-based candidate index;
- candidate target when recognized;
- bounded label when available;
- field path;
- machine code (`INVALID_ENUM`, `INVALID_DISCRIMINATOR`, `MISSING_REQUIRED_FIELD`, `UNRESOLVED_EVIDENCE`, `INVALID_CANDIDATE_SHAPE`, or another finite reviewed enum);
- safe human-readable message;
- optional bounded list of allowed values; and
- disposition `QUARANTINED`.

Do not store the raw proposed value, provider response, source excerpt, stack, endpoint, model metadata, or credentials in an issue record.

The collection must be bounded by count and per-field length. If provider output exceeds the diagnostic bound, append one safe truncation summary rather than unbounded errors.

Use one analysis representation. Do not create a second `invalidCandidates` array that resembles reviewable candidates.

---

## 5. Separate candidate-local failure from fatal analysis failure

Refactor `validateAndNormalizeDocumentAnalysis()` or its active successor:

### Candidate-local quarantine

For an object recognized as a candidate but still failing after deterministic normalization:

- exclude it from `analysis.candidates`;
- append a typed validation issue;
- retain all independent valid evidence, candidates, and unknowns;
- never mark it accepted, staged, applied, or canonical; and
- never let it contribute to depiction generation, readiness counts, provenance resolution, or export.

This includes the observed expression-mode, connection-kind, and value-holder discriminator failures; unresolved candidate evidence; missing explicit user-character boolean; and invalid target-specific proposed values.

### Fatal analysis failure

Return `status: 'error'` only for an invalid extraction envelope/source identity, unparseable response, missing required top-level collections after bounded normalization, or a result with no trustworthy usable baseline under the existing minimum contract.

Add an explicit nonfatal state such as `completed_with_issues`, or retain `completed` plus non-empty typed issues. Choose one representation and make store/UI/readiness behavior unambiguous.

An analysis with candidate issues must not discard its valid candidates by returning `candidates: []`.

---

## 6. Preserve evidence and source identity

- Continue replacing provider-authored source IDs with the server-owned source record ID.
- Validate candidate evidence IDs against that exact source.
- Quarantine only candidates with unresolved evidence; do not discard unrelated evidence/candidates.
- Do not fabricate evidence linkage for normalized candidates.
- Retain the existing rule that accepted reviewed-source state later requires exact source/evidence/candidate linkage.

The source-analysis normalization must be deterministic for identical bytes and server-owned source identity.

---

## 7. Required tests

Add focused proof for:

- extraction prompt/config enumerates the exact expression, edge-kind, and value-holder values;
- contract-drift tests fail when canonical enum owners and extraction metadata diverge;
- canonical values survive unchanged;
- case/whitespace and each approved alias normalize deterministically;
- ambiguous/unknown expression, connection, and holder values are quarantined rather than guessed;
- observed invalid paths produce bounded field-addressable issues;
- one invalid candidate among many preserves every independent valid candidate/evidence/unknown;
- multiple invalid candidates yield multiple bounded issues without a fatal error wall;
- missing user-character boolean and unresolved evidence quarantine only their candidates;
- invalid envelope or entirely unusable analysis remains fatal;
- issue records contain no raw payload, source excerpt, model metadata, endpoint, stack, or credential sentinels;
- quarantined candidates cannot be found by candidate application, aim acceptance, provenance resolution, or readiness counts; and
- native Blueprint analysis remains unaffected.

Prefer extending:

- `server/routes/forge.test.ts`
- `src/lib/sourceBaseline.test.ts`
- `src/types/forge` schema tests
- `src/types/horrorGrammar.test.ts`
- `src/store/useForgeStore.test.ts`

Add one narrowly named extraction-contract test only if it owns the shared enum/schema alignment more clearly than the existing route suite.

---

## Focused gate

Run only the contract/route/normalization/schema/store suites:

```bash
npx vitest run server/routes/forge.test.ts src/lib/sourceBaseline.test.ts src/types/horrorGrammar.test.ts src/store/useForgeStore.test.ts
```

Include a new extraction-contract test file in this command if one is created. Do not run the full suite, global type check, lint, or production build in this packet.

Report exact file and test counts.

---

## Completion criteria

Packet 1C-13 is complete only when the provider receives the exact active contract, safe aliases normalize through one bounded owner, invalid candidates are quarantined with typed issues, valid candidates survive, and no strict canonical schema is weakened.

Stop and report incomplete if one malformed optional candidate can still erase the entire usable import, an unknown value is guessed into canon, extraction metadata can drift silently from runtime enums, or raw provider material enters diagnostics.

---

## Out of scope

- Source-intake recovery UI and depiction coordination, owned by 1C-14
- Final import-to-export/Engine production proof
- Changes to unified character authoring, map/start ownership, or Architect protocol beyond compile fallout
- Autopilot Observe behavior
- Non-user initiative/HG1 diagnosis
- Director mode
- README or roadmap edits
