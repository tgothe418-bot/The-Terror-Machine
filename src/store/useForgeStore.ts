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
} from '../types/forge';
import { idbStorage } from '../lib/idbStorage';

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
  terminalConditions: initial?.terminalConditions,
  characters: initial?.characters ? [...initial.characters] : [],
  hauntedHouse: initial?.hauntedHouse,
});

const initialState: ForgeState = {
  forgeDraft: null,
  draftBlueprint: null,
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
            castLedger: deriveCastLedger(draft),
            topology: deriveTopology(draft),
          });
        },

        replaceDraft: (draft: ForgeDraft) => {
          const clonedDraft = JSON.parse(JSON.stringify(draft));
          set({
            forgeDraft: clonedDraft,
            draftBlueprint: clonedDraft,
            castLedger: deriveCastLedger(clonedDraft),
            topology: deriveTopology(clonedDraft),
          });
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
            };

            return {
              forgeDraft: merged,
              draftBlueprint: merged,
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
              castLedger: deriveCastLedger(updatedDraft),
              topology: deriveTopology(updatedDraft),
            };
          });
        },

        resetStore: () => set(initialState),
        clearHistory: () => set(initialState),

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
      version: 2,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const stateRecord = persistedState as Record<string, unknown>;
        // Promote legacy draftBlueprint if forgeDraft is absent in persisted storage
        if (!stateRecord.forgeDraft && stateRecord.draftBlueprint) {
          stateRecord.forgeDraft = stateRecord.draftBlueprint;
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
          // Ensure draftBlueprint is aligned with forgeDraft
          state.draftBlueprint = state.forgeDraft;
          state.castLedger = deriveCastLedger(state.forgeDraft);
          state.topology = deriveTopology(state.forgeDraft);
        }
      },
      partialize: (state) => {
        // Persist only canonical Forge draft and intentionally retained UI state
        return {
          forgeDraft: state.forgeDraft,
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
