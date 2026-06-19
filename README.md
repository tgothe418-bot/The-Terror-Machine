# THE TERROR MACHINE // THE NIGHTMARE MACHINE

<p align="center">
  <img src="./assets/TNM_Logo_1.png" alt="TNM Logo 1" width="800"/>
</p>

An agnostic, state-driven psychological simulation engine built with Node.js (Express), React, Tailwind CSS, Zustand, and the Gemini Pro API. The platform cleanly splits cognitive telemetry data from narrative prose, utilizing a hardened multi-layered matrix pipeline to enforce structural horror, state ratification, mechanical object permanence, and dynamic physical geography decay.

---

## 🏗️ Architectural Core

The application is structured across five primary infrastructural pillars to handle long-horizon narrative loops without token drift, state hallucination, or context collapse:

### 1. The Elastic Pacing Matrix (`src/store/useTelemetryStore.ts`)
* **The Momentum Index:** Tracks user input length, semantic urgency heuristics, and average cast sanity deltas over a rolling 3-turn context window.
* **Decoupled State:** Pacing math runs inside an isolated, non-rendering transient Zustand store to protect the primary reading void from React re-render performance hits.
* **Dynamic Gating:** Shifts the simulation organically across `LATENT`, `MANIFEST`, and `TERMINAL` phases based on compound pressure evaluations rather than rigid countdown turn timers.

### 2. The Ratification Pipeline Border Guard (`src/lib/ratificationPipeline.ts`)
* **No Frame, No Reality:** A strict programmatic customs agent positioned squarely between the raw LLM API response and the core app stores.
* **Sanitization & Repair:** Intercepts out-of-schema JSON packets, flags parsing errors, and automatically patches missing keys or structural anomalies with safe runtime default states rather than allowing malformed payloads to crash the client.
* **Signal Salvaging:** Extracts out-of-nest or misaligned top-level orchestration telemetry (`suggested_tension`, `matrix_mutation`) and safely injects them into the application runtime.

### 3. The Spatial Graph & Ontological Decay Scale (`src/services/geminiService.ts`)
* **Topology Compiler:** Compiles the Forge's raw blueprints into a live node-and-edge matrix (`spatialGraph`) that locks character positions to rigorous physical connections at startup.
* **The 4-Stage Descent Gradient:** Dynamically modulates spatial constraints by feeding the subject's live `skepticism` metrics into a fine-tuned mathematical decay scale:
    * *STABLE / FRAYING (Skepticism > 0.3):* Rigidly Euclidean. The Interceptor rejects unmapped spatial jumps or hallucinated layout shortcuts.
    * *UNSTABLE (Skepticism 0.3 - 0.01):* Spatial coherence degrades to 0.3, introducing automated probability variables where impossible paths occasionally pass validation as anomalous structural aberrations.
    * *SHATTERED (Skepticism 0.0):* Triggers full ontological collapse, completely breaking the Euclidean Interceptor to allow unconstrained topological detachment and authored paradoxes.

### 4. The Memory Forge (`src/core/prompts/distillation.ts`)
* **Context Distillation:** Automatically triggers on an Act break (Phase Shift). An asynchronous background loop condenses historical dialog into a highly dense, permanent string array (`enduringTrauma`).
* **The Context Cleaver:** Surgically slices the middle array of the active message history to preserve token limits and avoid attention dilution.
* **Cinematic Injection:** Inserts a beautiful, 4-5 sentence chapter summary into the user reading void, providing a readable ledger of the past Act while resetting the active token ceiling to baseline.

### 5. The Air-Gapped Operator Booth (`server/geminiRoutes.ts`)
* **Strict Cordon Isolation:** "The Voice" companion operates on a completely air-gapped, read-only plane. It reads high-fidelity live telemetry context parameters (`currentNode`, `isShattered`, `decayMetrics`) to optimize contextual awareness but possesses zero structural write access to the simulation state.
* **Capability Manifest & Linter:** Enforced by an absolute server-side capability firewall and an active regex string linter that intercepts outbound payloads, violently rewriting hallucinatory claims of administrative power into diegetically sound observational language before it can touch the UI layer.

---

## 🔒 Security & Perimeter Hardening

The backend network architecture is hardened against attack vectors and runtime resource drainage:
* **Rate Limiting:** Guarded by `express-rate-limit` to prevent script injections and quota exhausting without choking high-tempo player interactions.
* **Payload Clamping:** Strict JSON request parsing thresholds capped firmly at `5mb` to handle detailed Forge maps while blocking oversized buffer overflows.
* **XSS Mitigation:** Integrates deep-string HTML entity escaping utilities (`escapeHtml`) directly across the text exporter architecture, insulating local file logs against execution vulnerabilities.

---

## 🛠️ Tech Stack
* **Frontend Framework:** React 18, TypeScript, Vite
* **State Management:** Zustand
* **Styling:** Tailwind CSS
* **Backend Runtime:** Node.js, Express, Cross-Origin Resource Sharing (CORS) Perimeters
* **API Layer:** Google Gemini API (Grounding Tools + Structured JSON Outputs)
* **Storage:** IndexedDB / Custom local persistence layers
