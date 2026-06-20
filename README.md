# THE TERROR MACHINE // THE NIGHTMARE MACHINE

<p align="center">
  <img src="./assets/TNM_Logo_1.png" alt="TNM Logo 1" width="800"/>
</p>

An agnostic, state-driven psychological simulation engine built with Node.js, React, Tailwind CSS, Zustand, and the Gemini Pro API. The platform splits cognitive telemetry data from narrative prose, utilizing a multi-layered matrix pipeline to enforce structural horror, mechanical object permanence, and strict spatial geography.

---

## 🏗️ Architectural Core

The application is structured across three primary infrastructural pillars to handle long-horizon narrative loops without token drift or context collapse:

### 1. The Elastic Pacing Matrix (`src/store/useTelemetryStore.ts`)
*   **The Momentum Index:** Tracks user input length, semantic urgency heuristics, and average cast sanity deltas over a rolling 3-turn context window.
*   **Decoupled State:** Pacing math runs inside an isolated, non-rendering transient Zustand store to protect the primary reading void from React re-render performance hits.
*   **Dynamic Gating:** Shifts the simulation organically across `LATENT`, `MANIFEST`, and `TERMINAL` phases based on compound pressure evaluations rather than rigid countdown turn timers.

### 2. The Euclidean Spatial Graph (`src/core/matrix.ts`)
*   **Coordinate Locking:** Replaces ambiguous text setting descriptions with a discrete node-and-edge map graph (`SpatialGraph`) that binds characters mechanically to explicit coordinate nodes.
*   **The Euclidean Interceptor (`src/services/geminiService.ts`):** A middleware parser that intercepts the LLM's raw JSON payloads post-generation. It rejects illegal spatial jumps or hallucinated doors, forces character payloads back to valid adjacent nodes, and injects a mechanical override notice directly into the narrative stream.

### 3. The Memory Forge (`src/core/prompts/distillation.ts`)
*   **Context Distillation:** Automatically triggers on an Act break (Phase Shift). An asynchronous background loop condenses historical dialog into a highly dense, permanent string array (`enduringTrauma`).
*   **The Context Cleaver:** Surgically slices the middle array of the active message history to preserve token limits and avoid attention dilution.
*   **Cinematic Injection:** Inserts a beautiful, 4-5 sentence chapter summary into the user reading void, providing a readable ledger of the past Act while resetting the active token ceiling to baseline.

### 4. Grounded Voice Interface (`src/components/hub/TheVoice.tsx`)
*   **Search Grounding:** Integrated with native Google Search tools to pull real-time literary frameworks, psychological archetypes, and historical research to serve as an active co-author.

---

## 🛠️ Tech Stack
*   **Frontend Framework:** React 18, TypeScript, Vite
*   **State Management:** Zustand
*   **Styling:** Tailwind CSS
*   **API Layer:** Google Gemini API (Grounding Tools + Structured JSON Outputs)
*   **Storage:** IndexedDB / Custom local persistence layers
