# Token Efficiency & Redundancy Analysis: The Terror Machine

This report focuses specifically on LLM token consumption patterns within "The Terror Machine", identifying areas of redundant spending and proposing efficiency improvements.

## 1. Prompt Construction Overload

The most significant area of token burn is in the runtime engine prompt construction, specifically in `src/core/prompts/orchestrator.ts` and how it's called in `server/geminiRoutes.ts`.

### The System Directive Bloat
In `buildOrchestratorPrompt`, the system prompt is completely rebuilt and sent with *every single turn*. This includes:
*   The entire `cast_roster` with descriptions.
*   The `enclosure_parameters` (title, premise, environmental rules).
*   The static rules (`execution_rules`, `operational_directives`).
*   The lengthy `TERMINAL EVALUATION PROTOCOL` instructions.

**Inefficiency:** Sending these static definitions on every turn (especially long premises and full cast lists) burns thousands of input tokens repeatedly.
**Recommendation:**
*   **System Instructions:** Gemini supports a dedicated `systemInstruction` field. Ensure that static rules (like JSON schema, execution rules, and terminal protocols) are defined purely in the `systemInstruction` once per session (if using a stateful conversational API) or separated cleanly.
*   **Dynamic vs Static Cast:** Instead of sending the *full* character description every turn, only send the *names* and their *current psychological/somatic state* via the `cast_ledger`. The foundational descriptions of the cast should only be referenced if they are in the immediate `activeNode`.

### Redundant State Injection
In `server/geminiRoutes.ts` (the `/chat` endpoint):
```typescript
const slimBlueprint = {
  ...blueprint,
  narrativeRules: {
    ...blueprint.narrativeRules,
    pacingDirectives: currentPacing
  }
};
// ...
systemInstruction = buildOrchestratorPrompt(slimBlueprint as any, accumulatedHistory, updatedState || {} as any, momentumIndex, turnCount, currentPhase);
```
**Inefficiency:** The engine dynamically slims down the blueprint, but it still passes `slimBlueprint` into `buildOrchestratorPrompt`, which then re-stringifies parts of it. Furthermore, the `historyString` and `accumulatedHistory` (which contains `worldStateSummary`) are appended to the prompt.
**Recommendation:** As the `worldStateSummary` grows via distillation, you are paying for that summary *plus* the recent rolling window on every turn. Ensure the `worldStateSummary` remains strictly capped in length during the background distillation process to prevent it from creeping up in token cost over a long session.

## 2. Redundant JSON Structuring

The `json_schema_requirement` in the Orchestrator prompt demands a very verbose JSON structure:
```json
{
  "current_phase": "...",
  "requested_transition": "...",
  "cast_ledger": [ ... ],
  "engine_logic": "...",
  "narrative_text": "...",
  "dialogue": [ ... ]
}
```

**Inefficiency:**
*   The engine is forced to output `engine_logic` (hidden reasoning) on every turn. While useful for debugging or specific architectural tracking, generating 2-3 sentences of "hidden reasoning" that the user never sees costs output tokens and increases latency.
*   Splitting `narrative_text` and `dialogue` into separate keys, and then re-stitching them in `geminiRoutes.ts` to map to "legacy blocks format," forces the LLM to use extra tokens to manage the JSON array syntax.

**Recommendation:**
*   Make `engine_logic` optional, or only request it when the `momentumIndex` crosses a threshold or a `current_phase` shift occurs.
*   Allow the LLM to output a single unified markdown string for the narrative (which is cheaper and faster for the LLM to generate), and handle the parsing client-side, rather than forcing the LLM to construct complex JSON arrays for every line of dialogue.

## 3. The Context Distillation Pipeline

`src/core/prompts/distillation.ts` and the `/api/distill` route handle context pruning.

**Efficiency Win:** The mechanism of slicing the middle of the active window and distilling it into a summary is an excellent token-saving measure. It directly combats context collapse and token bloat.

**Potential Token Leak:**
In `geminiRoutes.ts`:
```typescript
const payloadContent = `
  CURRENT WORLD SUMMARY:
  ${currentSummary}

  PRUNED EXCHANGES TO INTEGRATE:
  ${flattenedTranscript}
`;
```
When distillation happens, it sends the *old* summary plus the *new* transcript to generate a *new* summary.
**Inefficiency:** If the LLM simply concatenates them, the summary grows indefinitely.
**Recommendation:** The `DISTILLATION_SYSTEM_PROMPT` must strictly instruct the LLM to *compress* and *replace*, maintaining a strict length limit (e.g., "Maximum 150 words"), rather than just appending new facts. The current prompt asks for a "dense, atmospheric, 4-5 sentence paragraph", which is good, but enforce it rigorously to prevent summary bloat.

## 4. Unnecessary API Calls (Client-side Interception)

As noted in the previous architecture review, the Euclidean Interceptor (in `sendEngineTurn`) catches illegal spatial transitions *after* the payload is generated.

**Inefficiency:** You are paying for the output tokens of a hallucinated room transition, and the tokens of the narrative text describing that hallucinated transition, only to throw it away and manually inject an error string.
**Recommendation:** To prevent wasting tokens on illegal moves, inject a strict, much shorter negative constraint in the prompt: `"SUBJECT CAN ONLY MOVE TO: [NODE_A, NODE_B]. IF SUBJECT ATTEMPTS TO MOVE ELSEWHERE, OUTPUT '{"requested_transition": null}' AND DESCRIBE THEM HITTING A WALL."` The current `spatialMatrix` string tries to do this, but keeping it as tight as possible is key.

## Summary of Actionable Optimizations

1.  **Stop sending static blueprint definitions on every turn.** Move them to a true `systemInstruction` or cache them.
2.  **Make `engine_logic` optional** in the JSON schema to save output tokens.
3.  **Strictly cap the length of `worldStateSummary`** during the distillation loop to prevent infinite token creep.
4.  **Simplify the JSON output requirement** for narrative text instead of forcing the LLM to split dialogue and prose into separate arrays.