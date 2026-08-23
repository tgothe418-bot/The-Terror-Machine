import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Message,
  CharacterProfile,
  ForgePhase,
  ReferenceMaterial,
  ProseStyleVector,
  Blueprint,
  ScenarioBlueprint,
} from '../types';
import {
  ForgeDraft,
  ForgeDraftPatch,
  ForgeDraftCastMember,
  ForgeDraftPerspective,
  ForgeDraftTopology,
  ForgeDraftIdentity,
  ForgeDraftSetting,
  ForgeDraftNarrativeRules,
  ForgeSourceAnalysis,
  ForgeSourceAnalysisSchema,
  ForgeSourceUnknown,
  BlueprintAmbiguityDecision,
  DepictionContract,
  DepictionContractPatch,
  DepictionContractPatchSchema,
  ForgeResolutionProposal,
} from '../types/forge';
import { idbStorage } from '../lib/idbStorage';
import {
  applyCandidateToDraft,
  validateCandidateEdit,
  rejectCandidate as rejectCandidatePure,
  setCandidateReviewDecisionPure,
  sortCandidatesForApplication,
  applyResolutionDraftPatch,
} from '../lib/sourceBaseline';

export const defaultStyleVector: ProseStyleVector = {
  sentenceStructure: 'clinical-flat',
  vocabularyTier: 'clinical',
  sensoryFocus: ['metallic friction', 'micro-expressions', 'spatial geometry'],
  thematicCore: 'objective observation of deteriorating systems',
  forbiddenDevices: [
    'cinematic camera angles',
    'metaphors and similes',
    'forced colloquialisms',
    'suddenly or unexpectedly',
    'internal emotional assumptions',
  ],
};

// Re-export type aliases for backward compatibility across Forge components
export type DraftIdentity = ForgeDraftIdentity;
export type DraftCastMember = ForgeDraftCastMember;
export type DraftPerspective = ForgeDraftPerspective;
export type DraftTopology = ForgeDraftTopology;
export type DraftSetting = ForgeDraftSetting;
export type DraftNarrativeRules = ForgeDraftNarrativeRules;
export type DraftBlueprint = ForgeDraft;
export type DraftBlueprintPatch = ForgeDraftPatch;

/**
 * Sanitizes and normalizes persisted or incoming sourceAnalyses state.
 * Migrates legacy candidate reviewState to reviewDecision & applicationState.
 * Ensures unknowns conform to strict authoring lifecycle schema.
 * Deduplicates entries saved under alias keys by indexing strictly by analysis.id,
 * and discards any malformed records that fail schema validation.
 */
export function sanitizeSourceAnalyses(value: unknown): Record<string, ForgeSourceAnalysis> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, ForgeSourceAnalysis> = {};
  const entries = Object.values(value as Record<string, unknown>);
  for (const rawItem of entries) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = { ...(rawItem as Record<string, unknown>) };

    // Migrate candidates
    if (Array.isArray(item.candidates)) {
      item.candidates = item.candidates.map((c: unknown) => {
        if (!c || typeof c !== 'object') return c;
        const cand = { ...(c as Record<string, unknown>) };
        if (cand.reviewState && !cand.reviewDecision) {
          if (cand.reviewState === 'accepted') {
            cand.reviewDecision = 'accepted';
            cand.applicationState = cand.applicationState || 'applied';
          } else if (cand.reviewState === 'rejected') {
            cand.reviewDecision = 'rejected';
            cand.applicationState = cand.applicationState || 'staged';
          } else {
            cand.reviewDecision = 'accepted';
            cand.applicationState = 'staged';
          }
          delete cand.reviewState;
        }
        if (!cand.reviewDecision) cand.reviewDecision = 'accepted';
        if (!cand.applicationState) cand.applicationState = 'staged';
        return cand;
      });
    }

    // Migrate unknowns
    if (Array.isArray(item.unknowns)) {
      item.unknowns = item.unknowns.map((u: unknown) => {
        if (!u || typeof u !== 'object') return u;
        const unk = { ...(u as Record<string, unknown>) };
        if (!unk.status) unk.status = 'queued';
        if (!unk.targetEffect || typeof unk.targetEffect !== 'string' || !unk.targetEffect.trim()) {
          unk.targetEffect = `Clarifies ${unk.category || 'scenario'} baseline parameters for execution.`;
        }
        if (!Array.isArray(unk.followUps)) {
          unk.followUps = [];
        }
        return unk;
      });
    }

    const parse = ForgeSourceAnalysisSchema.safeParse(item);
    if (parse.success) {
      const analysis = parse.data;
      result[analysis.id] = analysis;
    }
  }
  return result;
}

export interface ActiveUnknownContext {
  sourceId: string;
  sourceFileName?: string;
  unknown: ForgeSourceUnknown;
  queueIndex: number;
  totalCount: number;
  resolvedCount: number;
}

/**
 * Deterministically selects the current active unknown in the Forge authoring queue.
 * Orders source analyses by receivedAt ascending, then sourceId.
 * Selects the first unresolved item (not 'resolved' and not 'contextual_discretion').
 */
export function selectActiveUnknown(state: ForgeState): ActiveUnknownContext | null {
  if (!state.sourceAnalyses || typeof state.sourceAnalyses !== 'object') {
    return null;
  }

  const sortedAnalyses = Object.values(state.sourceAnalyses).sort((a, b) => {
    const diff = (a.sourceRecord.receivedAt || 0) - (b.sourceRecord.receivedAt || 0);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  const allUnknowns: Array<{ sourceId: string; sourceFileName?: string; unknown: ForgeSourceUnknown }> = [];
  for (const analysis of sortedAnalyses) {
    if (analysis.unknowns && Array.isArray(analysis.unknowns)) {
      for (const unk of analysis.unknowns) {
        allUnknowns.push({
          sourceId: analysis.id,
          sourceFileName: analysis.sourceRecord.fileName,
          unknown: unk,
        });
      }
    }
  }

  const totalCount = allUnknowns.length;
  if (totalCount === 0) return null;

  const resolvedCount = allUnknowns.filter(
    (item) => item.unknown.status === 'resolved' || item.unknown.status === 'contextual_discretion'
  ).length;

  const activeIdx = allUnknowns.findIndex(
    (item) => item.unknown.status !== 'resolved' && item.unknown.status !== 'contextual_discretion'
  );

  if (activeIdx === -1) {
    return null;
  }

  const activeItem = allUnknowns[activeIdx];
  return {
    sourceId: activeItem.sourceId,
    sourceFileName: activeItem.sourceFileName,
    unknown: activeItem.unknown,
    queueIndex: activeIdx + 1,
    totalCount,
    resolvedCount,
  };
}

// ============================================================================
// DERIVED COMPATIBILITY ADAPTERS (Phase 3D-1 Single Source of Truth)
// forgeDraft is the sole mutable authoring authority. The helpers below
// derive legacy-shaped views directly from forgeDraft without duplicate state.
// ============================================================================
export function deriveCastLedger(draft: ForgeDraft | null): CastMember[] {
  if (!draft || !draft.cast) return [];
  return draft.cast.map((c) => ({
    id: c.id || '',
    name: c.name || '',
    role: (c.role as CastRole) || 'PROTAGONIST',
    psychological_status: c.psychological_status || '',
    starting_location: c.starting_location || 'NODE_INIT',
    isEntity: c.isEntity ?? false,
  }));
}

export function deriveTopology(draft: ForgeDraft | null): Record<string, string[]> {
  if (!draft || !draft.topology || !draft.topology.nodes || draft.topology.nodes.length === 0) {
    return { NODE_INIT: [] };
  }
  const result: Record<string, string[]> = {};
  for (const node of draft.topology.nodes) {
    result[node] = [];
  }
  for (const conn of draft.topology.connections || []) {
    if (typeof conn === 'string') {
      const parts = conn.split('->').map((s) => s.trim());
      if (parts.length === 2) {
        const [from, to] = parts;
        if (!result[from]) result[from] = [];
        if (!result[from].includes(to)) result[from].push(to);
        if (!result[to]) result[to] = [];
        if (!result[to].includes(from)) result[to].push(from);
      }
    } else if (conn && typeof conn === 'object' && conn.from && conn.to) {
      if (!result[conn.from]) result[conn.from] = [];
      if (!result[conn.from].includes(conn.to)) result[conn.from].push(conn.to);
      if (!result[conn.to]) result[conn.to] = [];
      if (!result[conn.to].includes(conn.from)) result[conn.to].push(conn.from);
    }
  }
  return result;
}

export type CastRole = 'PROTAGONIST' | 'ANTAGONIST' | 'SENTINEL' | 'ENTITY' | 'OBSERVER';

export interface CastMember {
  id: string;
  name: string;
  role: CastRole;
  psychological_status: string;
  starting_location: string;
  isEntity?: boolean;
}

export interface EntityMemoryState {
  tacticalImperative: string;
  somaticState: string[];
  relationalWeb: string[];
  systemFlags?: string[];
}

export interface ArchitectMessage {
  role: 'architect' | 'user';
  content: string;
}

export interface SimulationPerspective {
  role?: string;
  startingSemanticState?:
    | string
    | {
        soma?: string[];
        geom?: string[];
        imp?: string;
      };
}

export interface SimulationBlueprintInput {
  perspectives?: SimulationPerspective[] | DraftPerspective[];
}

export interface ForgeActions {
  // --- CANONICAL FORGE DRAFT ACTIONS (Phase 3D-1 Single Source of Truth) ---
  initializeDraft: (initial?: ForgeDraftPatch) => void;
  replaceDraft: (draft: ForgeDraft) => void;
  updateDraft: (updates: ForgeDraftPatch) => void;
  removeReference: (fileName: string) => void;
  resetStore: () => void;
  clearHistory: () => void;

  // --- SOURCE INTAKE & CANDIDATE STAGING ACTIONS ---
  registerSourceAnalysis: (analysis: ForgeSourceAnalysis) => void;
  setCandidateReviewDecision: (
    sourceId: string,
    candidateId: string,
    decision: 'accepted' | 'rejected'
  ) => void;
  editStagedCandidate: (sourceId: string, candidateId: string, editedValue: unknown) => void;
  applyAcceptedCandidates: (
    sourceId: string
  ) => { success: true; appliedCandidateIds: string[] } | { success: false; errors: Record<string, string> };
  removeSourceAnalysis: (sourceId: string) => void;

  // Deprecated compatibility aliases for candidates
  editPendingCandidate: (sourceId: string, candidateId: string, editedValue: unknown) => void;
  acceptCandidate: (sourceId: string, candidateId: string) => void;
  rejectCandidate: (sourceId: string, candidateId: string) => void;

  // --- AMBIGUITY RESOLUTION ACTIONS ---
  submitUnknownAnswer: (sourceId: string, unknownId: string, answer: string) => void;
  receiveUnknownFollowUp: (sourceId: string, unknownId: string, followUpQuestion: string) => void;
  receiveUnknownProposal: (
    sourceId: string,
    unknownId: string,
    proposal: ForgeResolutionProposal
  ) => void;
  acceptUnknownResolution: (
    sourceId: string,
    unknownId: string,
    resolutionOverride?: string,
    applyDraftPatch?: boolean
  ) => void;
  leaveUnknownUncertain: (sourceId: string, unknownId: string, guidance?: string) => void;
  setUnknownError: (sourceId: string, unknownId: string, error: string) => void;
  retryUnknown: (sourceId: string, unknownId: string) => void;
  editUnknownProposal: (
    sourceId: string,
    unknownId: string,
    resolution: string,
    targetEffect?: string
  ) => void;

  // --- DEPICTION CONTRACT ACTIONS (Packet 1B Proposal-Isolation) ---
  setPendingDepictionContractProposal: (
    proposal: { patch: DepictionContractPatch; rationale: string; createdAt?: number } | null
  ) => void;
  applyPendingDepictionContractProposal: () => void;
  dismissPendingDepictionContractProposal: () => void;
  updateDepictionContractField: (field: keyof DepictionContract, value: string) => void;

  // --- ARCHITECT CHAT (PROPOSAL-ONLY IN PHASE 3D-1) ---
  addArchitectMessage: (message: ArchitectMessage) => void;
  clearArchitectChat: () => void;

  // --- QUARANTINED LEGACY FORGE ACTIONS (Retained for temporary UI bridging) ---
  addCastMember: (member: Omit<CastMember, 'id'>) => void;
  updateCastMember: (id: string, updates: Partial<CastMember>) => void;
  removeCastMember: (id: string) => void;
  addSpatialNode: (nodeId: string) => void;
  removeSpatialNode: (nodeId: string) => void;
  toggleSpatialEdge: (nodeA: string, nodeB: string) => void;
  updateActiveMemory: (updates: Partial<EntityMemoryState>) => void;
  commitSemanticTags: (parsedTags: Record<string, string[]>) => void;
  setWho: (val: string) => void;
  setWhat: (val: string) => void;
  setWhere: (val: string) => void;
  setWhen: (val: string) => void;
  setWhyHow: (val: string) => void;
  clearForgeInputs: () => void;
  addMessage: (message: Message) => void;
  setAvailableReferenceCharacters: (characters: CharacterProfile[]) => void;
  addCharacterToCast: (character: CharacterProfile) => void;
  removeCharacterFromCast: (id: string) => void;
  updateCharacterDetails: (id: string, updates: Partial<CharacterProfile>) => void;
  setHasReferenceMaterial: (has: boolean) => void;
  setForgePhase: (phase: ForgePhase) => void;
  setSummaryContext: (context: string) => void;
  setExtractedSetting: (setting: string) => void;
  setExtractedThreat: (threat: string) => void;
  setExtractedStyle: (style: string) => void;
  addReferenceMaterials: (materials: ReferenceMaterial[]) => void;
  removeReferenceMaterial: (id: string) => void;
  setActiveNeuralLink: (role: 'PROTAGONIST' | 'ANTAGONIST' | 'DIRECTOR') => void;
  setActiveCharacterId: (id: string | null) => void;
  startSimulation: (
    blueprint?: SimulationBlueprintInput | DraftBlueprint | Blueprint | ScenarioBlueprint | null
  ) => void;
}

export interface ForgeState {
  // --- CANONICAL FORGE AUTHORING STATE ---
  forgeDraft: ForgeDraft | null;
  /**
   * @deprecated Read/write forgeDraft instead. Synchronized alias to forgeDraft for legacy callers.
   */
  draftBlueprint: ForgeDraft | null;
  draftRevision: number;

  // --- DEPICTION CONTRACT PROPOSAL STATE (Packet 1B Isolated Proposal) ---
  pendingDepictionContractProposal: {
    patch: DepictionContractPatch;
    rationale: string;
    createdAt: number;
  } | null;

  // --- SOURCE INTAKE STATE (Phase 3D-2) ---
  sourceAnalyses: Record<string, ForgeSourceAnalysis>;

  // --- ARCHITECT CHAT STATE ---
  architectMessages: ArchitectMessage[];

  // --- QUARANTINED LEGACY STATE ---
  castLedger: CastMember[];
  topology: Record<string, string[]>;
  activeMemory: EntityMemoryState;
  messages: Message[];
  availableReferenceCharacters: CharacterProfile[];
  selectedCharacters: CharacterProfile[];
  hasReferenceMaterial: boolean;
  forgePhase: ForgePhase;
  summaryContext: string;
  referenceMaterials: ReferenceMaterial[];
  extractedSetting: string;
  extractedThreat: string;
  extractedStyle: string;
  who: string;
  what: string;
  where: string;
  when: string;
  whyHow: string;
  activeNeuralLink: 'PROTAGONIST' | 'ANTAGONIST' | 'DIRECTOR';
  activeCharacterId: string | null;
}

const createInitialDraft = (initial?: ForgeDraftPatch): ForgeDraft => ({
  id: initial?.id || crypto.randomUUID(),
  title: initial?.title || initial?.identity?.title || '',
  premise: initial?.premise || initial?.globalPremise || '',
  globalPremise: initial?.globalPremise || initial?.premise || '',
  startingVector: initial?.startingVector || 'COGNITIVE',
  startingTier: initial?.startingTier || 'LATENT',
  environmentalRules: initial?.environmentalRules !== undefined ? initial.environmentalRules : '',
  constraints: initial?.constraints || [],
  contentScale: initial?.contentScale ?? 3,
  contentLevelDescription: initial?.contentLevelDescription || 'Standard',
  identity: {
    title: initial?.identity?.title || initial?.title || '',
    version: initial?.identity?.version || '1.0',
    author: initial?.identity?.author || '',
    thematicAnchor: initial?.identity?.thematicAnchor || '',
  },
  setting: {
    location: initial?.setting?.location || '',
    atmosphere: initial?.setting?.atmosphere || '',
    timePeriod: initial?.setting?.timePeriod || '',
  },
  cast: initial?.cast ? [...initial.cast] : [],
  perspectives: initial?.perspectives ? [...initial.perspectives] : [],
  topology: {
    nodes: initial?.topology?.nodes ? [...initial.topology.nodes] : [],
    connections: initial?.topology?.connections ? [...initial.topology.connections] : [],
  },
  narrativeRules: {
    incitingIncident: initial?.narrativeRules?.incitingIncident || '',
    phaseDirectives: initial?.narrativeRules?.phaseDirectives ? { ...initial.narrativeRules.phaseDirectives } : {},
    currentTensionLevel: initial?.narrativeRules?.currentTensionLevel || 'buildup',
    keyPlotElements: initial?.narrativeRules?.keyPlotElements ? [...initial.narrativeRules.keyPlotElements] : [],
    pacingDirectives: initial?.narrativeRules?.pacingDirectives,
  },
  references: initial?.references ? [...initial.references] : [],
  ambiguities: initial?.ambiguities ? [...initial.ambiguities] : [],
  depictionContract: initial?.depictionContract
    ? {
        dramaticRegister: initial.depictionContract.dramaticRegister || '',
        directness: initial.depictionContract.directness || '',
        aftermath: initial.depictionContract.aftermath || '',
        ambiguityHandling: initial.depictionContract.ambiguityHandling || '',
        specialBoundaries: initial.depictionContract.specialBoundaries || '',
      }
    : {
        dramaticRegister: '',
        directness: '',
        aftermath: '',
        ambiguityHandling: '',
        specialBoundaries: '',
      },
  terminalConditions: initial?.terminalConditions,
  characters: initial?.characters ? [...initial.characters] : [],
  hauntedHouse: initial?.hauntedHouse,
});

const initialState: ForgeState = {
  forgeDraft: null,
  draftBlueprint: null,
  draftRevision: 1,
  pendingDepictionContractProposal: null,
  sourceAnalyses: {},
  architectMessages: [
    {
      role: 'architect',
      content: 'I am the Architect. Tell me what kind of nightmare we are building today.',
    },
  ],
  castLedger: [],
  topology: {
    NODE_INIT: [],
  },
  activeMemory: {
    tacticalImperative: 'Survive and assess the immediate surroundings.',
    somaticState: ['Baseline health'],
    relationalWeb: ['Subject is isolated.'],
  },
  messages: [
    {
      role: 'assistant',
      content: 'Forge Initialized. Architect online. Describe the foundation of your nightmare.',
      timestamp: Date.now(),
    },
  ],
  availableReferenceCharacters: [],
  selectedCharacters: [],
  hasReferenceMaterial: false,
  forgePhase: 'CAST_EXTRACTION',
  summaryContext: '',
  referenceMaterials: [],
  extractedSetting: '',
  extractedThreat: '',
  extractedStyle: '',
  who: '',
  what: '',
  where: '',
  when: '',
  whyHow: '',
  activeNeuralLink: 'PROTAGONIST',
  activeCharacterId: null,
};

export type ForgeStore = ForgeState & { actions: ForgeActions };

export const useForgeStoreInternal = create<ForgeStore>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        // --- CANONICAL DRAFT ACTIONS ---
        initializeDraft: (initial?: ForgeDraftPatch) => {
          const draft = createInitialDraft(initial);
          set({
            forgeDraft: draft,
            draftBlueprint: draft,
            draftRevision: 1,
            pendingDepictionContractProposal: null,
            castLedger: deriveCastLedger(draft),
            topology: deriveTopology(draft),
          });
        },

        replaceDraft: (draft: ForgeDraft) => {
          const clonedDraft = JSON.parse(JSON.stringify(draft));
          set((state: ForgeState) => ({
            forgeDraft: clonedDraft,
            draftBlueprint: clonedDraft,
            draftRevision: (state.draftRevision || 0) + 1,
            castLedger: deriveCastLedger(clonedDraft),
            topology: deriveTopology(clonedDraft),
          }));
        },

        updateDraft: (updates: ForgeDraftPatch) => {
          set((state: ForgeState) => {
            const current = state.forgeDraft || createInitialDraft();
            const merged: ForgeDraft = {
              ...current,
              ...updates,
              // Deep-merge identity if provided in patch
              identity: {
                ...current.identity,
                ...(updates.identity || {}),
                title: updates.title !== undefined ? updates.title : (updates.identity?.title !== undefined ? updates.identity.title : current.identity?.title || current.title || ''),
              },
              title: updates.title !== undefined ? updates.title : (updates.identity?.title !== undefined ? updates.identity.title : current.title || current.identity?.title || ''),
              premise: updates.premise !== undefined ? updates.premise : (updates.globalPremise !== undefined ? updates.globalPremise : current.premise || current.globalPremise || ''),
              globalPremise: updates.globalPremise !== undefined ? updates.globalPremise : (updates.premise !== undefined ? updates.premise : current.globalPremise || current.premise || ''),
              // Deep-merge setting if provided
              setting: updates.setting !== undefined ? { ...current.setting, ...updates.setting } : current.setting,
              // Preserve nested objects/arrays unless explicitly updated
              cast: updates.cast !== undefined ? updates.cast : current.cast,
              perspectives: updates.perspectives !== undefined ? updates.perspectives : current.perspectives,
              topology: updates.topology !== undefined ? updates.topology : current.topology,
              narrativeRules: updates.narrativeRules !== undefined ? updates.narrativeRules : current.narrativeRules,
              references: updates.references !== undefined ? updates.references : current.references,
              ambiguities: updates.ambiguities !== undefined ? updates.ambiguities : current.ambiguities,
              depictionContract: updates.depictionContract !== undefined
                ? (typeof updates.depictionContract === 'object' && updates.depictionContract !== null
                    ? { ...current.depictionContract, ...updates.depictionContract }
                    : updates.depictionContract)
                : current.depictionContract,
            };

            return {
              forgeDraft: merged,
              draftBlueprint: merged,
              draftRevision: (state.draftRevision || 0) + 1,
              castLedger: deriveCastLedger(merged),
              topology: deriveTopology(merged),
            };
          });
        },

        removeReference: (fileName: string) => {
          set((state: ForgeState) => {
            if (!state.forgeDraft) return state;
            const updatedRefs = (state.forgeDraft.references || []).filter((ref) => ref !== fileName);
            const updatedDraft: ForgeDraft = {
              ...state.forgeDraft,
              references: updatedRefs,
            };
            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              draftRevision: (state.draftRevision || 0) + 1,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          });
        },

        resetStore: () => set(initialState),
        clearHistory: () => set(initialState),

        // --- DEPICTION CONTRACT ACTIONS (Packet 1B Isolated Proposal) ---
        setPendingDepictionContractProposal: (
          proposal: { patch: DepictionContractPatch; rationale: string; createdAt?: number } | null
        ) => {
          if (!proposal) {
            set({ pendingDepictionContractProposal: null });
            return;
          }
          const parseResult = DepictionContractPatchSchema.safeParse(proposal.patch);
          if (!parseResult.success) {
            console.warn('[FORGE DEPICTION CONTRACT] Rejected malformed proposal patch:', parseResult.error);
            return;
          }
          set({
            pendingDepictionContractProposal: {
              patch: parseResult.data,
              rationale: proposal.rationale || '',
              createdAt: proposal.createdAt ?? Date.now(),
            },
          });
        },

        applyPendingDepictionContractProposal: () => {
          set((state: ForgeState) => {
            if (!state.pendingDepictionContractProposal) return state;
            const currentDraft = state.forgeDraft || createInitialDraft();
            const currentContract = currentDraft.depictionContract || {
              dramaticRegister: '',
              directness: '',
              aftermath: '',
              ambiguityHandling: '',
              specialBoundaries: '',
            };
            const patch = state.pendingDepictionContractProposal.patch;
            const updatedContract: DepictionContract = {
              dramaticRegister:
                patch.dramaticRegister !== undefined
                  ? patch.dramaticRegister
                  : currentContract.dramaticRegister,
              directness:
                patch.directness !== undefined ? patch.directness : currentContract.directness,
              aftermath:
                patch.aftermath !== undefined ? patch.aftermath : currentContract.aftermath,
              ambiguityHandling:
                patch.ambiguityHandling !== undefined
                  ? patch.ambiguityHandling
                  : currentContract.ambiguityHandling,
              specialBoundaries:
                patch.specialBoundaries !== undefined
                  ? patch.specialBoundaries
                  : (currentContract.specialBoundaries || ''),
            };

            const updatedDraft: ForgeDraft = {
              ...currentDraft,
              depictionContract: updatedContract,
            };

            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              pendingDepictionContractProposal: null,
              draftRevision: (state.draftRevision || 0) + 1,
            };
          });
        },

        dismissPendingDepictionContractProposal: () => {
          set({ pendingDepictionContractProposal: null });
        },

        updateDepictionContractField: (field: keyof DepictionContract, value: string) => {
          set((state: ForgeState) => {
            const currentDraft = state.forgeDraft || createInitialDraft();
            const currentContract = currentDraft.depictionContract || {
              dramaticRegister: '',
              directness: '',
              aftermath: '',
              ambiguityHandling: '',
              specialBoundaries: '',
            };

            const updatedContract: DepictionContract = {
              ...currentContract,
              [field]: value,
            };

            const updatedDraft: ForgeDraft = {
              ...currentDraft,
              depictionContract: updatedContract,
            };

            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              draftRevision: (state.draftRevision || 0) + 1,
            };
          });
        },

        // --- SOURCE INTAKE & SCENARIO BASELINE ACTIONS ---
        registerSourceAnalysis: (analysis: ForgeSourceAnalysis) =>
          set((state: ForgeState) => {
            const parse = ForgeSourceAnalysisSchema.safeParse(analysis);
            if (!parse.success) {
              console.warn('[FORGE BASELINE] Rejected malformed source analysis:', parse.error);
              return state;
            }
            const validAnalysis = parse.data;
            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [validAnalysis.id]: validAnalysis,
              },
            };
          }),

        setCandidateReviewDecision: (
          sourceId: string,
          candidateId: string,
          decision: 'accepted' | 'rejected'
        ) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const cand = analysis.candidates.find((c) => c.id === candidateId);
            if (!cand) return state;

            const updatedCand = setCandidateReviewDecisionPure(cand, decision);
            const updatedCandidates = analysis.candidates.map((c) =>
              c.id === candidateId ? updatedCand : c
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  candidates: updatedCandidates,
                },
              },
            };
          }),

        editStagedCandidate: (sourceId: string, candidateId: string, editedValue: unknown) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const cand = analysis.candidates.find((c) => c.id === candidateId);
            if (!cand) return state;

            const editResult = validateCandidateEdit(cand, editedValue);
            if (!editResult.valid || !editResult.updatedCandidate) return state;

            const updatedCandidates = analysis.candidates.map((c) =>
              c.id === candidateId ? editResult.updatedCandidate! : c
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  candidates: updatedCandidates,
                },
              },
            };
          }),

        applyAcceptedCandidates: (sourceId: string) => {
          let outcome:
            | { success: true; appliedCandidateIds: string[] }
            | { success: false; errors: Record<string, string> } = {
            success: true,
            appliedCandidateIds: [],
          };

          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) {
              outcome = { success: false, errors: { [sourceId]: 'Source analysis not found' } };
              return state;
            }

            const stagedAccepted = analysis.candidates.filter(
              (c) => c.reviewDecision === 'accepted' && c.applicationState === 'staged'
            );

            if (stagedAccepted.length === 0) {
              outcome = { success: true, appliedCandidateIds: [] };
              return state;
            }

            // Sort deterministically: cast_seed before cast_expression_guidance, preserving extraction order
            const ordered = sortCandidatesForApplication(stagedAccepted);

            let workingDraft: ForgeDraft = state.forgeDraft
              ? JSON.parse(JSON.stringify(state.forgeDraft))
              : createInitialDraft();

            const errors: Record<string, string> = {};
            const appliedIds: string[] = [];

            for (const cand of ordered) {
              const applyRes = applyCandidateToDraft(
                workingDraft,
                cand,
                analysis.sourceRecord.fileName
              );
              if (!applyRes.success) {
                errors[cand.id] = applyRes.error;
              } else {
                workingDraft = applyRes.draft;
                appliedIds.push(cand.id);
              }
            }

            // If ANY candidate application failed, perform NO partial mutations
            if (Object.keys(errors).length > 0) {
              outcome = { success: false, errors };
              return state;
            }

            // Commit atomic draft state and mark applied candidates
            const updatedCandidates = analysis.candidates.map((c) => {
              if (appliedIds.includes(c.id)) {
                return {
                  ...c,
                  reviewDecision: 'accepted' as const,
                  applicationState: 'applied' as const,
                };
              }
              return c;
            });

            const updatedAnalysis: ForgeSourceAnalysis = {
              ...analysis,
              candidates: updatedCandidates,
            };

            outcome = { success: true, appliedCandidateIds: appliedIds };

            return {
              forgeDraft: workingDraft,
              draftBlueprint: workingDraft,
              draftRevision: (state.draftRevision || 0) + 1,
              castLedger: deriveCastLedger(workingDraft),
              topology: deriveTopology(workingDraft),
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: updatedAnalysis,
              },
            };
          });

          return outcome;
        },

        editPendingCandidate: (sourceId: string, candidateId: string, editedValue: unknown) => {
          const { editStagedCandidate } = useForgeStoreInternal.getState().actions;
          editStagedCandidate(sourceId, candidateId, editedValue);
        },

        acceptCandidate: (sourceId: string, candidateId: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const cand = analysis.candidates.find((c) => c.id === candidateId);
            if (!cand || cand.applicationState === 'applied') return state;

            const currentDraft = state.forgeDraft || createInitialDraft();
            const applyResult = applyCandidateToDraft(
              currentDraft,
              cand,
              analysis.sourceRecord.fileName
            );

            if (applyResult.success === false) {
              console.warn(`[FORGE BASELINE] Candidate application failed: ${applyResult.error}`);
              return state;
            }

            const updatedDraft = applyResult.draft;
            const updatedCandidates = analysis.candidates.map((c) =>
              c.id === candidateId
                ? { ...c, reviewDecision: 'accepted' as const, applicationState: 'applied' as const }
                : c
            );

            const updatedAnalysis = {
              ...analysis,
              candidates: updatedCandidates,
            };

            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              draftRevision: (state.draftRevision || 0) + 1,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: updatedAnalysis,
              },
            };
          }),

        rejectCandidate: (sourceId: string, candidateId: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const cand = analysis.candidates.find((c) => c.id === candidateId);
            if (!cand) return state;

            const updatedCand = rejectCandidatePure(cand);
            const updatedCandidates = analysis.candidates.map((c) =>
              c.id === candidateId ? updatedCand : c
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  candidates: updatedCandidates,
                },
              },
            };
          }),

        removeSourceAnalysis: (sourceId: string) =>
          set((state: ForgeState) => {
            const remaining = { ...state.sourceAnalyses };
            delete remaining[sourceId];
            return {
              sourceAnalyses: remaining,
            };
          }),

        // --- AMBIGUITY RESOLUTION ACTIONS ---
        submitUnknownAnswer: (sourceId: string, unknownId: string, answer: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk || !answer.trim()) return state;

            const safeAnswer = answer.trim();
            const updatedFollowUps = [...unk.followUps];
            const unansweredIdx = updatedFollowUps.findIndex((f) => !f.answer);

            if (unansweredIdx !== -1) {
              updatedFollowUps[unansweredIdx] = {
                ...updatedFollowUps[unansweredIdx],
                answer: safeAnswer,
              };
            }

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              submittedAnswer: safeAnswer,
              followUps: updatedFollowUps,
              status: 'awaiting_response',
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        receiveUnknownFollowUp: (sourceId: string, unknownId: string, followUpQuestion: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk || !followUpQuestion.trim()) return state;

            // Maximum 2 follow-ups allowed
            if (unk.followUps.length >= 2) return state;

            const newFollowUp = {
              id: `fu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              question: followUpQuestion.trim(),
            };

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              followUps: [...unk.followUps, newFollowUp],
              status: 'queued',
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        receiveUnknownProposal: (
          sourceId: string,
          unknownId: string,
          proposal: ForgeResolutionProposal
        ) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk || !proposal.resolution.trim()) return state;

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              resolutionProposal: {
                resolution: proposal.resolution.trim(),
                targetEffect: proposal.targetEffect.trim() || unk.targetEffect,
                draftPatch: proposal.draftPatch,
              },
              status: 'awaiting_confirmation',
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        acceptUnknownResolution: (
          sourceId: string,
          unknownId: string,
          resolutionOverride?: string,
          applyDraftPatch: boolean = true
        ) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk) return state;

            const finalResolution = (
              resolutionOverride ||
              unk.resolutionProposal?.resolution ||
              unk.submittedAnswer ||
              ''
            ).trim();

            if (!finalResolution) return state;

            // 1. Create canonical ambiguity decision
            const decision: BlueprintAmbiguityDecision = {
              id: unk.id,
              category: unk.category,
              question: unk.question,
              resolutionMode: 'USER_DEFINED',
              resolution: finalResolution,
            };

            // 2. Upsert into forgeDraft.ambiguities
            const currentDraft = state.forgeDraft || createInitialDraft();
            const existingAmbiguities = currentDraft.ambiguities ? [...currentDraft.ambiguities] : [];
            const existingIdx = existingAmbiguities.findIndex((a) => a.id === unk.id);
            if (existingIdx !== -1) {
              existingAmbiguities[existingIdx] = decision;
            } else {
              existingAmbiguities.push(decision);
            }

            let updatedDraft: ForgeDraft = {
              ...currentDraft,
              ambiguities: existingAmbiguities,
            };

            // 3. If proposal included a draft patch and applyDraftPatch is true, apply it
            if (applyDraftPatch && unk.resolutionProposal?.draftPatch) {
              updatedDraft = applyResolutionDraftPatch(updatedDraft, unk.resolutionProposal.draftPatch);
            }

            // 4. Mark unknown as resolved
            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              status: 'resolved',
              resolutionProposal: {
                resolution: finalResolution,
                targetEffect: unk.resolutionProposal?.targetEffect || unk.targetEffect,
                draftPatch: unk.resolutionProposal?.draftPatch,
              },
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            const updatedAnalysis = {
              ...analysis,
              unknowns: updatedUnknowns,
            };

            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              draftRevision: (state.draftRevision || 0) + 1,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: updatedAnalysis,
              },
            };
          }),

        leaveUnknownUncertain: (sourceId: string, unknownId: string, guidance?: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk) return state;

            const decision: BlueprintAmbiguityDecision = {
              id: unk.id,
              category: unk.category,
              question: unk.question,
              resolutionMode: 'CONTEXTUAL_DISCRETION',
              ...(guidance && guidance.trim() ? { guidance: guidance.trim() } : {}),
            };

            const currentDraft = state.forgeDraft || createInitialDraft();
            const existingAmbiguities = currentDraft.ambiguities ? [...currentDraft.ambiguities] : [];
            const existingIdx = existingAmbiguities.findIndex((a) => a.id === unk.id);
            if (existingIdx !== -1) {
              existingAmbiguities[existingIdx] = decision;
            } else {
              existingAmbiguities.push(decision);
            }

            const updatedDraft: ForgeDraft = {
              ...currentDraft,
              ambiguities: existingAmbiguities,
            };

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              status: 'contextual_discretion',
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              draftRevision: (state.draftRevision || 0) + 1,
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        setUnknownError: (sourceId: string, unknownId: string, error: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk) return state;

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              status: 'queued',
              lastError: error,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        retryUnknown: (sourceId: string, unknownId: string) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk) return state;

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              status: 'queued',
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        editUnknownProposal: (
          sourceId: string,
          unknownId: string,
          resolution: string,
          targetEffect?: string
        ) =>
          set((state: ForgeState) => {
            const analysis = state.sourceAnalyses[sourceId];
            if (!analysis) return state;
            const unk = analysis.unknowns.find((u) => u.id === unknownId);
            if (!unk || !resolution.trim()) return state;

            const updatedUnknown: ForgeSourceUnknown = {
              ...unk,
              resolutionProposal: {
                resolution: resolution.trim(),
                targetEffect:
                  targetEffect?.trim() ||
                  unk.resolutionProposal?.targetEffect ||
                  unk.targetEffect,
              },
              lastError: undefined,
            };

            const updatedUnknowns = analysis.unknowns.map((u) =>
              u.id === unknownId ? updatedUnknown : u
            );

            return {
              sourceAnalyses: {
                ...state.sourceAnalyses,
                [analysis.id]: {
                  ...analysis,
                  unknowns: updatedUnknowns,
                },
              },
            };
          }),

        // --- ARCHITECT CHAT ACTIONS ---
        addArchitectMessage: (message: ArchitectMessage) =>
          set((state: ForgeState) => ({
            architectMessages: [...state.architectMessages, message],
          })),

        clearArchitectChat: () =>
          set({
            architectMessages: [
              {
                role: 'architect',
                content:
                  'I am the Architect. Tell me what kind of nightmare we are building today.',
              },
            ],
          }),

        // --- LEGACY-COMPATIBLE ADAPTER ACTIONS (Read/Write through forgeDraft) ---
        addCastMember: (member: Omit<CastMember, 'id'>) =>
          set((state: ForgeState) => {
            const draft = state.forgeDraft || createInitialDraft();
            const newId = crypto.randomUUID();
            const newCastMember: ForgeDraftCastMember = {
              id: newId,
              name: member.name,
              role: member.role,
              psychological_status: member.psychological_status,
              starting_location: member.starting_location,
              isEntity: member.isEntity ?? false,
              isUserCharacter: member.role === 'PROTAGONIST',
              behaviorVector: 'ADAPTIVE',
            };
            const updatedCast = [...(draft.cast || []), newCastMember];
            const updatedDraft: ForgeDraft = {
              ...draft,
              cast: updatedCast,
            };
            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          }),

        updateCastMember: (id: string, updates: Partial<CastMember>) =>
          set((state: ForgeState) => {
            const draft = state.forgeDraft || createInitialDraft();
            const updatedCast = (draft.cast || []).map((m) => {
              if (m.id !== id) return m;
              return {
                ...m,
                ...(updates.name !== undefined ? { name: updates.name } : {}),
                ...(updates.role !== undefined
                  ? { role: updates.role, isUserCharacter: updates.role === 'PROTAGONIST' }
                  : {}),
                ...(updates.psychological_status !== undefined
                  ? { psychological_status: updates.psychological_status }
                  : {}),
                ...(updates.starting_location !== undefined
                  ? { starting_location: updates.starting_location }
                  : {}),
                ...(updates.isEntity !== undefined ? { isEntity: updates.isEntity } : {}),
              };
            });
            const updatedDraft: ForgeDraft = {
              ...draft,
              cast: updatedCast,
            };
            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          }),

        removeCastMember: (id: string) =>
          set((state: ForgeState) => {
            if (!state.forgeDraft) return state;
            const updatedCast = (state.forgeDraft.cast || []).filter((m) => m.id !== id);
            const updatedDraft: ForgeDraft = {
              ...state.forgeDraft,
              cast: updatedCast,
            };
            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          }),

        addSpatialNode: (nodeId: string) =>
          set((state: ForgeState) => {
            const draft = state.forgeDraft || createInitialDraft();
            const currentNodes = draft.topology?.nodes || [];
            if (currentNodes.includes(nodeId)) return state;
            const updatedNodes = [...currentNodes, nodeId];
            const updatedDraft: ForgeDraft = {
              ...draft,
              topology: {
                ...(draft.topology || { connections: [] }),
                nodes: updatedNodes,
              },
            };
            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          }),

        removeSpatialNode: (nodeId: string) =>
          set((state: ForgeState) => {
            if (!state.forgeDraft) return state;
            const currentTopology = state.forgeDraft.topology || { nodes: [], connections: [] };
            const updatedNodes = (currentTopology.nodes || []).filter((id) => id !== nodeId);
            const updatedConnections = (currentTopology.connections || []).filter((conn) => {
              if (typeof conn === 'string') {
                const parts = conn.split('->').map((s) => s.trim());
                return parts[0] !== nodeId && parts[1] !== nodeId;
              } else if (conn && typeof conn === 'object') {
                return conn.from !== nodeId && conn.to !== nodeId;
              }
              return true;
            });
            const updatedDraft: ForgeDraft = {
              ...state.forgeDraft,
              topology: {
                ...currentTopology,
                nodes: updatedNodes,
                connections: updatedConnections,
              },
            };
            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          }),

        toggleSpatialEdge: (nodeA: string, nodeB: string) =>
          set((state: ForgeState) => {
            const draft = state.forgeDraft || createInitialDraft();
            const currentTopology = draft.topology || { nodes: [], connections: [] };
            const nodes = [...(currentTopology.nodes || [])];
            if (!nodes.includes(nodeA)) nodes.push(nodeA);
            if (!nodes.includes(nodeB)) nodes.push(nodeB);

            const connections = [...(currentTopology.connections || [])];
            const existingIndex = connections.findIndex((conn) => {
              if (typeof conn === 'string') {
                const parts = conn.split('->').map((s) => s.trim());
                return (
                  (parts[0] === nodeA && parts[1] === nodeB) ||
                  (parts[0] === nodeB && parts[1] === nodeA)
                );
              } else if (conn && typeof conn === 'object') {
                return (
                  (conn.from === nodeA && conn.to === nodeB) ||
                  (conn.from === nodeB && conn.to === nodeA)
                );
              }
              return false;
            });

            let updatedConnections;
            if (existingIndex >= 0) {
              updatedConnections = connections.filter((_, idx) => idx !== existingIndex);
            } else {
              updatedConnections = [
                ...connections,
                {
                  from: nodeA,
                  to: nodeB,
                  kind: 'PHYSICAL' as const,
                  userInitiated: true,
                },
              ];
            }

            const updatedDraft: ForgeDraft = {
              ...draft,
              topology: {
                ...currentTopology,
                nodes,
                connections: updatedConnections,
              },
            };

            return {
              forgeDraft: updatedDraft,
              draftBlueprint: updatedDraft,
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          }),

        updateActiveMemory: (updates: Partial<EntityMemoryState>) =>
          set((state: ForgeState) => ({
            activeMemory: { ...state.activeMemory, ...updates },
          })),

        commitSemanticTags: (parsedTags: Record<string, string[]>) =>
          set((state: ForgeState) => {
            const nextMemory = { ...state.activeMemory };

            if (parsedTags['SOMA']) nextMemory.somaticState = parsedTags['SOMA'];
            if (parsedTags['GEOM']) nextMemory.relationalWeb = parsedTags['GEOM'];
            if (parsedTags['IMP']) nextMemory.tacticalImperative = parsedTags['IMP'].join(' ');
            if (parsedTags['SYS']) nextMemory.systemFlags = parsedTags['SYS'];

            return { activeMemory: nextMemory };
          }),

        setWho: (val: string) => set({ who: val }),
        setWhat: (val: string) => set({ what: val }),
        setWhere: (val: string) => set({ where: val }),
        setWhen: (val: string) => set({ when: val }),
        setWhyHow: (val: string) => set({ whyHow: val }),
        clearForgeInputs: () => set({ who: '', what: '', where: '', when: '', whyHow: '' }),
        addMessage: (message: Message) =>
          set((state: ForgeState) => ({
            messages: [...state.messages, message],
          })),

        setAvailableReferenceCharacters: (characters: CharacterProfile[]) =>
          set({ availableReferenceCharacters: characters }),

        addCharacterToCast: (character: CharacterProfile) =>
          set((state: ForgeState) => {
            const npcCount = state.selectedCharacters.filter((c) => !c.isUserCharacter).length;
            if (!character.isUserCharacter && npcCount >= 5) return state;
            if (state.selectedCharacters.find((c) => c.id === character.id)) return state;
            return { selectedCharacters: [...state.selectedCharacters, character] };
          }),

        removeCharacterFromCast: (id: string) =>
          set((state: ForgeState) => ({
            selectedCharacters: state.selectedCharacters.filter((c) => c.id !== id),
          })),

        updateCharacterDetails: (id: string, updates: Partial<CharacterProfile>) =>
          set((state: ForgeState) => ({
            selectedCharacters: state.selectedCharacters.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          })),

        setHasReferenceMaterial: (has: boolean) => set({ hasReferenceMaterial: has }),
        setForgePhase: (phase: ForgePhase) => set({ forgePhase: phase }),
        setSummaryContext: (context: string) => set({ summaryContext: context }),
        setExtractedSetting: (setting: string) => set({ extractedSetting: setting }),
        setExtractedThreat: (threat: string) => set({ extractedThreat: threat }),
        setExtractedStyle: (style: string) => set({ extractedStyle: style }),
        addReferenceMaterials: (materials: ReferenceMaterial[]) =>
          set((state: ForgeState) => ({
            referenceMaterials: [...state.referenceMaterials, ...materials],
          })),

        removeReferenceMaterial: (id: string) =>
          set((state: ForgeState) => ({
            referenceMaterials: state.referenceMaterials.filter((m) => m.id !== id),
          })),

        setActiveNeuralLink: (role: 'PROTAGONIST' | 'ANTAGONIST' | 'DIRECTOR') =>
          set({ activeNeuralLink: role }),

        setActiveCharacterId: (id: string | null) => set({ activeCharacterId: id }),

        startSimulation: (
          blueprint?:
            | SimulationBlueprintInput
            | DraftBlueprint
            | Blueprint
            | ScenarioBlueprint
            | null
        ) =>
          set((state: ForgeState) => {
            const activePerspective = blueprint?.perspectives?.find(
              (p) => p && typeof p === 'object' && 'role' in p && p.role === state.activeNeuralLink
            );

            let initialSomatic: string[] = [];
            let initialGeOM: string[] = [];
            let initialImp = '';

            if (
              activePerspective &&
              typeof activePerspective === 'object' &&
              'startingSemanticState' in activePerspective
            ) {
              const semanticState = activePerspective.startingSemanticState;
              if (semanticState && typeof semanticState === 'object') {
                initialSomatic =
                  'soma' in semanticState && Array.isArray(semanticState.soma)
                    ? semanticState.soma
                    : [];
                initialGeOM =
                  'geom' in semanticState && Array.isArray(semanticState.geom)
                    ? semanticState.geom
                    : [];
                initialImp =
                  'imp' in semanticState && typeof semanticState.imp === 'string'
                    ? semanticState.imp
                    : '';
              } else if (typeof semanticState === 'string') {
                initialImp = semanticState;
              }
            }

            return {
              activeMemory: {
                somaticState: initialSomatic,
                relationalWeb: initialGeOM,
                tacticalImperative: initialImp,
                systemFlags: [],
              },
            };
          }),
      },
    }),
    {
      name: 'the-forge-memory',
      storage: createJSONStorage(() => idbStorage),
      version: 4,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const stateRecord = persistedState as Record<string, unknown>;
        // Promote legacy draftBlueprint if forgeDraft is absent in persisted storage
        if (!stateRecord.forgeDraft && stateRecord.draftBlueprint) {
          stateRecord.forgeDraft = stateRecord.draftBlueprint;
        }
        if (stateRecord.forgeDraft && typeof stateRecord.forgeDraft === 'object') {
          const draft = stateRecord.forgeDraft as Record<string, unknown>;
          if (!draft.ambiguities || !Array.isArray(draft.ambiguities)) {
            draft.ambiguities = [];
          }
        }
        if (stateRecord.sourceAnalyses !== undefined) {
          stateRecord.sourceAnalyses = sanitizeSourceAnalyses(stateRecord.sourceAnalyses);
        }
        return stateRecord;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const stateRecord = state as unknown as Record<string, unknown>;
          // Reconcile and promote legacy draftBlueprint if forgeDraft is missing
          if (!state.forgeDraft && stateRecord.draftBlueprint) {
            state.forgeDraft = stateRecord.draftBlueprint as ForgeDraft;
          }
          if (state.forgeDraft) {
            if (!state.forgeDraft.ambiguities || !Array.isArray(state.forgeDraft.ambiguities)) {
              state.forgeDraft.ambiguities = [];
            }
          }
          if (!state.draftRevision || typeof state.draftRevision !== 'number') {
            state.draftRevision = 1;
          }
          state.pendingDepictionContractProposal = null;
          state.sourceAnalyses = sanitizeSourceAnalyses(state.sourceAnalyses);
          // Ensure draftBlueprint is aligned with forgeDraft
          state.draftBlueprint = state.forgeDraft;
          state.castLedger = deriveCastLedger(state.forgeDraft);
          state.topology = deriveTopology(state.forgeDraft);
        }
      },
      partialize: (state) => {
        // Persist only canonical Forge draft, source baseline metadata, and intentionally retained UI state
        return {
          forgeDraft: state.forgeDraft,
          draftRevision: state.draftRevision || 1,
          sourceAnalyses: state.sourceAnalyses,
          architectMessages: state.architectMessages,
          who: state.who,
          what: state.what,
          where: state.where,
          when: state.when,
          whyHow: state.whyHow,
          forgePhase: state.forgePhase,
        } as unknown as ForgeState;
      },
    }
  )
);

export interface UseForgeStateHook {
  <T>(selector: (state: ForgeState) => T): T;
  (): Readonly<ForgeState>;
  persist: typeof useForgeStoreInternal.persist;
}

export const useForgeState = ((selector?: (state: ForgeState) => unknown) => {
  return useForgeStoreInternal((state) => {
    if (selector) {
      return selector(state as ForgeState);
    }
    return state as Readonly<ForgeState>;
  });
}) as UseForgeStateHook;

useForgeState.persist = useForgeStoreInternal.persist;

export const forgeActions: ForgeActions = useForgeStoreInternal.getState().actions;
export const getForgeState = (): Readonly<ForgeState> => {
  return useForgeStoreInternal.getState() as Readonly<ForgeState>;
};
