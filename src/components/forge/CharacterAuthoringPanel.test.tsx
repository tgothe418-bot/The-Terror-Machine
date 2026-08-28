import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { CharacterAuthoringPanel } from './CharacterAuthoringPanel';
import { useForgeStoreInternal, forgeActions } from '../../store/useForgeStore';
import { ForgeDraft, ForgeSourceAnalysis } from '../../types/forge';

describe('CharacterAuthoringPanel Component', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    forgeActions.resetStore();
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const initialDraft: Partial<ForgeDraft> = {
      id: 'test-draft-1',
      title: 'Polar Exploration',
      premise: 'Antarctic mystery',
      globalPremise: 'Antarctic mystery',
      cast: [
        {
          id: 'char-1',
          name: 'Arthur Pym',
          role: 'PROTAGONIST',
          description: 'Narrator of strange polar voyages',
          isUserCharacter: true,
          isEntity: false,
          behaviorVector: 'ADAPTIVE',
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'CABIN' },
          starting_location: 'CABIN',
        },
        {
          id: 'char-2',
          name: 'Dirk Peters',
          role: 'Companion',
          description: 'Hardy sailor',
          isUserCharacter: false,
          isEntity: false,
          behaviorVector: 'ADAPTIVE',
          presenceDisposition: { kind: 'OFFSTAGE' },
        },
      ],
      userCharacterId: 'char-1',
      userOpeningAim: {
        castMemberId: 'char-1',
        disposition: 'UNREVIEWED',
        aimText: 'Investigate the southern horizon',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'CABIN',
        nodes: ['CABIN', 'DECK', 'HOLD'],
        nodeDefinitions: [
          { id: 'CABIN', label: 'Captain Cabin', description: '' },
          { id: 'DECK', label: 'Main Deck', description: '' },
          { id: 'HOLD', label: 'Cargo Hold', description: '' },
        ],
        connections: [],
        anchors: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'UNREVIEWED',
        pursuitReviews: {
          'char-2': 'UNREVIEWED',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'src-analysis-1',
      sourceRecord: {
        id: 'src-rec-1',
        fileName: 'pym_journal.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
      },
      summary: 'Polar expedition journal',
      candidates: [
        {
          id: 'cand-aim-1',
          sourceId: 'src-analysis-1',
          evidenceIds: ['ev-aim-1'],
          target: 'user_opening_aim_default',
          targetCastMemberId: 'char-1',
          classification: 'evidence',
          label: 'User Opening Aim',
          explanation: 'Primary opening orientation extracted from journal.',
          proposedValue: {
            aimText: 'Investigate the southern horizon',
          },
          reviewDecision: 'accepted',
          applicationState: 'applied',
        },
      ],
      evidence: [
        {
          id: 'ev-aim-1',
          sourceId: 'src-analysis-1',
          category: 'cast',
          claim: 'Investigate the southern horizon',
          excerpt: 'Investigate the southern horizon',
        },
      ],
      unknowns: [],
      status: 'completed',
    };

    useForgeStoreInternal.setState({
      forgeDraft: initialDraft as ForgeDraft,
      draftBlueprint: initialDraft as ForgeDraft,
      sourceAnalyses: {
        'src-analysis-1': mockAnalysis,
      },
      draftRevision: 1,
      sourceBaselineRevision: 1,
    });
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
      container.remove();
      container = null;
      root = null;
    }
  });

  it('renders all cast members with identity and status', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    expect(container?.textContent).toContain('Arthur Pym');
    expect(container?.textContent).toContain('Dirk Peters');
    expect(container?.textContent).toContain('Player Character');
  });

  it('adds a new cast member on "+ ADD CAST MEMBER" click', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const addBtn = container?.querySelector('#add-cast-member-btn') as HTMLButtonElement;
    expect(addBtn).toBeDefined();

    await act(async () => {
      addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.cast?.length).toBe(3);
    expect(draft?.cast?.[2].name).toBe('New Cast Member');
  });

  it('designates another character as player character', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const designateBtn = container?.querySelector('#designate-player-btn-char-2') as HTMLButtonElement;
    expect(designateBtn).toBeDefined();

    await act(async () => {
      designateBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.userCharacterId).toBe('char-2');
    expect(draft?.cast?.find((c) => c.id === 'char-2')?.isUserCharacter).toBe(true);
    expect(draft?.cast?.find((c) => c.id === 'char-1')?.isUserCharacter).toBe(false);
  });

  it('toggles entity status and clears player designation if toggled on player', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const checkbox = container?.querySelector('#entity-toggle-char-1') as HTMLInputElement;
    expect(checkbox).toBeDefined();

    await act(async () => {
      checkbox.click();
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.cast?.find((c) => c.id === 'char-1')?.isEntity).toBe(true);
    expect(draft?.cast?.find((c) => c.id === 'char-1')?.isUserCharacter).toBe(false);
    expect(draft?.userCharacterId).toBeUndefined();
  });

  it('updates opening placement to OFFSTAGE and AT_NODE without extra metadata', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const placementSelect = container?.querySelector('#placement-kind-select-char-1') as HTMLSelectElement;
    expect(placementSelect).toBeDefined();

    await act(async () => {
      placementSelect.value = 'OFFSTAGE';
      placementSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    const member = draft?.cast?.find((c) => c.id === 'char-1');
    expect(member?.presenceDisposition).toEqual({ kind: 'OFFSTAGE' });
    expect(member?.starting_location).toBe('');
    expect((member?.presenceDisposition as unknown as Record<string, unknown>).sourceId).toBeUndefined();
  });

  it('accepts reference default opening aim for player character', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const acceptBtn = container?.querySelector('#accept-aim-btn') as HTMLButtonElement;
    expect(acceptBtn).toBeDefined();

    await act(async () => {
      acceptBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.userOpeningAim?.disposition).toBe('ACCEPTED_REFERENCE');
    expect(draft?.userOpeningAim?.aimText).toBe('Investigate the southern horizon');
  });

  it('sets custom player opening aim using inline form without window.prompt', async () => {
    const promptSpy = vi.spyOn(window, 'prompt');
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const customBtn = container?.querySelector('#use-own-aim-btn') as HTMLButtonElement;
    expect(customBtn).toBeDefined();

    await act(async () => {
      customBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(promptSpy).not.toHaveBeenCalled();

    const textarea = container?.querySelector('#custom-aim-textarea') as HTMLTextAreaElement;
    expect(textarea).toBeDefined();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(textarea, 'Chart the unexplored channels');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const saveBtn = container?.querySelector('#save-aim-btn') as HTMLButtonElement;
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.userOpeningAim?.disposition).toBe('CREATOR_OVERRIDE');
    expect(draft?.userOpeningAim?.aimText).toBe('Chart the unexplored channels');

    promptSpy.mockRestore();
  });

  it('sets None Declared opening aim for player character', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const noneBtn = container?.querySelector('#none-aim-btn') as HTMLButtonElement;
    expect(noneBtn).toBeDefined();

    await act(async () => {
      noneBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.userOpeningAim?.disposition).toBe('NONE_DECLARED');
    expect(draft?.userOpeningAim?.aimText).toBe('');
  });

  it('reviews non-user pursuit with "No Readable Intent" and "+ Set Pursuit"', async () => {
    await act(async () => {
      root?.render(<CharacterAuthoringPanel />);
    });

    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const noIntentBtn = buttons.find((b) => b.textContent?.includes('No Readable Intent'));
    expect(noIntentBtn).toBeDefined();

    await act(async () => {
      noIntentBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    let draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.horrorGrammar?.pursuitReviews?.['char-2']).toBe('REVIEWED_NONE');

    // Now set a pursuit via inline form
    const updatedButtons = Array.from(container?.querySelectorAll('button') || []);
    const setPursuitBtn = updatedButtons.find((b) => b.textContent?.includes('+ Set Pursuit'));
    expect(setPursuitBtn).toBeDefined();

    await act(async () => {
      setPursuitBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const objInput = container?.querySelector('input[placeholder*="Inspect reactor telemetry"]') as HTMLInputElement;
    const appInput = container?.querySelector('input[placeholder*="Accessing terminal console"]') as HTMLInputElement;
    expect(objInput).toBeDefined();
    expect(appInput).toBeDefined();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(objInput, 'Guard the forward hatch');
      objInput.dispatchEvent(new Event('input', { bubbles: true }));
      objInput.dispatchEvent(new Event('change', { bubbles: true }));

      nativeSetter?.call(appInput, 'Standing watch with harpoon');
      appInput.dispatchEvent(new Event('input', { bubbles: true }));
      appInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const savePursuitBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Save Pursuit')
    );
    expect(savePursuitBtn).toBeDefined();

    await act(async () => {
      savePursuitBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    draft = useForgeStoreInternal.getState().forgeDraft;
    expect(draft?.horrorGrammar?.pursuitReviews?.['char-2']).toBe('REVIEWED');
    const pursuits = draft?.horrorGrammar?.characterPursuits || [];
    expect(pursuits.length).toBe(1);
    expect(pursuits[0].objective).toBe('Guard the forward hatch');
    expect(pursuits[0].presentApproach).toBe('Standing watch with harpoon');
  });
});
