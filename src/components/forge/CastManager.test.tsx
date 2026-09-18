import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { CastManager } from './CastManager';
import { useForgeStoreInternal, forgeActions } from '../../store/useForgeStore';
import { ForgeDraft } from '../../types/forge';

describe('CastManager Pure Text Cast Dossier Component', () => {
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
      id: 'test-draft-dossier',
      title: 'Occult Excavation',
      premise: 'Underground tomb survey',
      globalPremise: 'Underground tomb survey',
      cast: [
        {
          id: 'char-occ-1',
          name: 'Helena Ashcroft',
          role: 'Occult Antiquarian',
          description: 'Obsessed with pre-deluvian cipher stones.',
          isUserCharacter: true,
          isEntity: false,
          behaviorVector: 'ADAPTIVE',
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'CHAMBER_1' },
          starting_location: 'CHAMBER_1',
          traits: ['Paranoia', 'Hyper-Vigilance'],
          goals: 'Decipher the threshold runes',
          personality: 'Conceals an ancient brass key in her lining',
          psychological_status: 'Severe nyctophobia and sensory echoes',
        },
        {
          id: 'char-occ-2',
          name: 'Gideon Cross',
          role: 'Sapper',
          description: 'Combat engineer with demolition kits.',
          isUserCharacter: false,
          isEntity: false,
          behaviorVector: 'INSURGENT',
          presenceDisposition: { kind: 'OFFSTAGE' },
          traits: ['Claustrophobia'],
          goals: 'Rig emergency collapse charges',
          personality: 'Distrusts all antiquarian relics',
          psychological_status: 'Tremor in hands when stationary',
        },
      ],
      userCharacterId: 'char-occ-1',
      userOpeningAim: {
        castMemberId: 'char-occ-1',
        disposition: 'UNREVIEWED',
        aimText: 'Decipher the threshold runes',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'CHAMBER_1',
        nodes: ['CHAMBER_1', 'CRYPT'],
        nodeDefinitions: [
          { id: 'CHAMBER_1', label: 'Ante-Chamber', description: '' },
          { id: 'CRYPT', label: 'The Bone Vault', description: '' },
        ],
        connections: [],
        anchors: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'UNREVIEWED',
        pursuitReviews: {
          'char-occ-2': 'UNREVIEWED',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    useForgeStoreInternal.setState({
      forgeDraft: initialDraft as ForgeDraft,
      draftBlueprint: initialDraft as ForgeDraft,
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

  it('renders Pure Text Dossiers with ZERO portrait placeholders or image upload boxes', async () => {
    await act(async () => {
      root?.render(<CastManager />);
    });

    // Verify Helena Ashcroft and Gideon Cross are rendered
    expect(container?.textContent).toContain('Helena Ashcroft');
    expect(container?.textContent).toContain('Gideon Cross');

    // Verify Archetype badge rendering
    expect(container?.textContent).toContain('[ ARCHETYPE: Occult Antiquarian ]');
    expect(container?.textContent).toContain('[ ARCHETYPE: Sapper ]');

    // Strict check: ZERO portrait placeholders, ZERO image elements, ZERO file inputs
    const images = container?.querySelectorAll('img');
    expect(images?.length).toBe(0);

    const fileInputs = container?.querySelectorAll('input[type="file"]');
    expect(fileInputs?.length).toBe(0);

    // Verify no faux avatar circles or portrait placeholders exist
    const avatarBoxes = container?.querySelectorAll('[class*="avatar"], [class*="portrait"], [class*="upload-box"]');
    expect(avatarBoxes?.length).toBe(0);
  });

  it('renders high-density psychological flags and allows toggling chips', async () => {
    await act(async () => {
      root?.render(<CastManager />);
    });

    // Check existing traits
    expect(container?.textContent).toContain('Paranoia');
    expect(container?.textContent).toContain('Hyper-Vigilance');

    // Find and toggle a new psychological flag (e.g. Somatic Tremor) on char-occ-1
    const card1 = container?.querySelector('#character-card-char-occ-1');
    expect(card1).toBeDefined();

    const tremorBtn = Array.from(card1?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Somatic Tremor')
    );
    expect(tremorBtn).toBeDefined();

    await act(async () => {
      tremorBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const updatedMember = useForgeStoreInternal
      .getState()
      .forgeDraft?.cast?.find((c) => c.id === 'char-occ-1');
    expect(updatedMember?.traits).toContain('Somatic Tremor');
  });

  it('allows editing motive, fear, and secret dossier fields', async () => {
    await act(async () => {
      root?.render(<CastManager />);
    });

    const card1 = container?.querySelector('#character-card-char-occ-1');
    expect(card1).toBeDefined();

    // Fear / Vulnerability input
    const fearInput = card1?.querySelector(
      'input[placeholder*="Claustrophobia, Total darkness"]'
    ) as HTMLInputElement;
    expect(fearInput).toBeDefined();
    expect(fearInput.value).toBe('Severe nyctophobia and sensory echoes');

    // Secret / Concealed Agenda input
    const secretInput = card1?.querySelector(
      'input[placeholder*="Sabotaged the airlock before ascent"]'
    ) as HTMLInputElement;
    expect(secretInput).toBeDefined();
    expect(secretInput.value).toBe('Conceals an ancient brass key in her lining');

    // Modify fear input
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(fearInput, 'Paralyzing fear of mirrored surfaces');
      fearInput.dispatchEvent(new Event('input', { bubbles: true }));
      fearInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const updatedMember = useForgeStoreInternal
      .getState()
      .forgeDraft?.cast?.find((c) => c.id === 'char-occ-1');
    expect(updatedMember?.psychological_status).toBe('Paralyzing fear of mirrored surfaces');
  });

  it('displays candle-amber indicator jewels for unreviewed or required states', async () => {
    await act(async () => {
      root?.render(<CastManager />);
    });

    // Check for candle-amber indicator jewels
    const amberJewels = container?.querySelectorAll('.jewel-amber');
    expect(amberJewels && amberJewels.length > 0).toBe(true);
  });

  it('collapses and expands dossier into a compact high-density text summary ribbon', async () => {
    await act(async () => {
      root?.render(<CastManager />);
    });

    const card1 = container?.querySelector('#character-card-char-occ-1');
    const toggleBtn = card1?.querySelector('button[title*="Collapse dossier"]') as HTMLButtonElement;
    expect(toggleBtn).toBeDefined();

    // Collapse the card
    await act(async () => {
      toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Check collapsed summary ribbon
    expect(card1?.textContent).toContain('Motive:');
    expect(card1?.textContent).toContain('Fear:');
    expect(card1?.textContent).toContain('Placement:');
  });

  it('allows authoring Voice & Acoustic Dossier fields and toggling communication modes', async () => {
    await act(async () => {
      root?.render(<CastManager />);
    });

    const card1 = container?.querySelector('#character-card-char-occ-1');
    expect(card1).toBeDefined();

    // Verify Voice & Acoustic Dossier section exists
    expect(card1?.textContent).toContain('Voice & Acoustic Dossier');

    // Toggle 'mediated' communication mode
    const mediatedBtn = card1?.querySelector('#comm-mode-char-occ-1-mediated') as HTMLButtonElement;
    expect(mediatedBtn).toBeDefined();

    await act(async () => {
      mediatedBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    let updatedMember = useForgeStoreInternal
      .getState()
      .forgeDraft?.cast?.find((c) => c.id === 'char-occ-1');
    expect(updatedMember?.expressionProfile?.communicationModes).toContain('mediated');
    expect(updatedMember?.expressionProfile?.communicationModes).toContain('spoken');

    // Enter Cadence Notes (Amendment 5)
    const cadenceInput = card1?.querySelector('#voice-cadence-char-occ-1') as HTMLInputElement;
    expect(cadenceInput).toBeDefined();
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(cadenceInput, 'Clipped, staccato syllables with breathless pauses');
      cadenceInput.dispatchEvent(new Event('input', { bubbles: true }));
      cadenceInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Enter Voice Tone
    const toneInput = card1?.querySelector('#voice-tone-char-occ-1') as HTMLInputElement;
    expect(toneInput).toBeDefined();
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(toneInput, 'Dry academic gravel, strained composure');
      toneInput.dispatchEvent(new Event('input', { bubbles: true }));
      toneInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Enter Vocal Tells
    const tellsInput = card1?.querySelector('#voice-tells-char-occ-1') as HTMLInputElement;
    expect(tellsInput).toBeDefined();
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(tellsInput, 'swallows hard, whistling sibilants');
      tellsInput.dispatchEvent(new Event('input', { bubbles: true }));
      tellsInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Enter Camouflage Leak Guidance (Amendment 3)
    const camouflageInput = card1?.querySelector('#voice-camouflage-char-occ-1') as HTMLInputElement;
    expect(camouflageInput).toBeDefined();
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(camouflageInput, 'Mask slips into unmodulated monotone under critical pressure');
      camouflageInput.dispatchEvent(new Event('input', { bubbles: true }));
      camouflageInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    updatedMember = useForgeStoreInternal
      .getState()
      .forgeDraft?.cast?.find((c) => c.id === 'char-occ-1');

    expect(updatedMember?.expressionProfile?.cadenceNotes).toBe(
      'Clipped, staccato syllables with breathless pauses'
    );
    expect(updatedMember?.expressionProfile?.voiceTone).toBe(
      'Dry academic gravel, strained composure'
    );
    expect(updatedMember?.expressionProfile?.vocalTells).toEqual([
      'swallows hard',
      'whistling sibilants',
    ]);
    expect(updatedMember?.expressionProfile?.camouflageLeakGuidance).toBe(
      'Mask slips into unmodulated monotone under critical pressure'
    );
  });
});
