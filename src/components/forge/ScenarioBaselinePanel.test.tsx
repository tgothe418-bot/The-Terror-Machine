import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ScenarioBaselinePanel } from './ScenarioBaselinePanel';
import { forgeActions, getForgeState } from '../../store/useForgeStore';
import { ForgeSourceAnalysis } from '../../types/forge';

describe('ScenarioBaselinePanel Candidate Atomicity Proof', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    forgeActions.resetStore();
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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

  it('renders no per-candidate Apply control and renders one Apply Accepted control for a source with accepted staged candidates', async () => {
    forgeActions.initializeDraft({ title: 'Baseline Title' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-ui-1',
      sourceRecord: {
        id: 'src-ui-1',
        fileName: 'manifest.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-loc-1',
          sourceId: 'src-ui-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Setting Location',
          explanation: 'Extracted deep trench sector',
          evidenceIds: [],
          proposedValue: 'Deep Trench Sector 7',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
        {
          id: 'cand-atmos-1',
          sourceId: 'src-ui-1',
          classification: 'evidence',
          target: 'setting_atmosphere',
          label: 'Setting Atmosphere',
          explanation: 'Extracted atmosphere',
          evidenceIds: [],
          proposedValue: 'Oppressive darkness',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
      ],
      unknowns: [],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    // 1. Verify that there are NO per-candidate Apply buttons
    // Search for button elements with text "Apply" exactly
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const perCandidateApplyButtons = buttons.filter(
      (b) => b.textContent?.trim().toLowerCase() === 'apply'
    );
    expect(perCandidateApplyButtons).toHaveLength(0);

    // 2. Verify there is one "Apply Accepted" batch button for the source
    const applyAcceptedButtons = buttons.filter((b) =>
      b.textContent?.toLowerCase().includes('apply accepted')
    );
    expect(applyAcceptedButtons).toHaveLength(1);
    expect(applyAcceptedButtons[0].textContent).toContain('Apply Accepted (2)');
  });

  it('renders returned batch failure in the source card without throwing an exception', async () => {
    forgeActions.initializeDraft({ title: 'Baseline Title' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-ui-fail',
      sourceRecord: {
        id: 'src-ui-fail',
        fileName: 'invalid_data.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-bad-expr',
          sourceId: 'src-ui-fail',
          classification: 'evidence',
          target: 'cast_expression_guidance',
          targetCastMemberId: 'missing-cast-id',
          label: 'Broken Expression Guidance',
          explanation: 'Guidance targeting nonexistent cast member',
          evidenceIds: [],
          proposedValue: {
            communicationModes: ['spoken'],
            expressionGuidance: 'Radio chatter',
          },
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
      ],
      unknowns: [],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const applyAcceptedBtn = buttons.find((b) =>
      b.textContent?.toLowerCase().includes('apply accepted')
    );
    expect(applyAcceptedBtn).toBeDefined();

    // Clicking Apply Accepted should execute handleApplyAllAccepted, receive failure result, and display error
    await act(async () => {
      applyAcceptedBtn?.click();
    });

    // Verify the error message is rendered in the source card without an exception being thrown
    expect(container?.textContent).toContain('not found in active draft');

    // Canonical draft remains untouched
    const state = getForgeState();
    expect(state.forgeDraft?.title).toBe('Baseline Title');
    expect(state.sourceAnalyses['analysis-ui-fail'].candidates[0].applicationState).toBe('staged');
  });

  it('contains no clarification input, follow-up conversation, proposal editor, Apply Resolution, Leave Uncertain, or Retry controls', async () => {
    forgeActions.initializeDraft({ title: 'Baseline Title' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-ledger-test',
      sourceRecord: {
        id: 'src-ledger-1',
        fileName: 'manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-ledger-1',
          sourceId: 'src-ledger-1',
          category: 'identity',
          question: 'What is the station frequency?',
          targetEffect: 'Calibrates comms frequency.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    // 1. Verify NO text input / textarea for answering unknowns exists inside ScenarioBaselinePanel
    const inputs = Array.from(container?.querySelectorAll('input, textarea') || []);
    expect(inputs).toHaveLength(0);

    // 2. Verify NO buttons for Clarify, Apply Resolution, Leave Uncertain, or Retry exist in ScenarioBaselinePanel
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const conversationalButtons = buttons.filter((b) => {
      const txt = b.textContent?.trim().toLowerCase() || '';
      return (
        txt === 'clarify' ||
        txt.includes('commit resolution') ||
        txt.includes('apply resolution') ||
        txt.includes('leave uncertain') ||
        txt === 'retry' ||
        txt.includes('edit proposal')
      );
    });
    expect(conversationalButtons).toHaveLength(0);

    // 3. Verify Resolve in Architect button IS present for the nonterminal ambiguity
    const resolveInArchitectBtn = buttons.find((b) =>
      b.textContent?.toLowerCase().includes('resolve in architect')
    );
    expect(resolveInArchitectBtn).toBeDefined();
  });

  it('clicking Resolve in Architect scrolls to and focuses the Architect input', async () => {
    forgeActions.initializeDraft({ title: 'Baseline Title' });

    // Mock architect input in document
    const architectInput = document.createElement('input');
    architectInput.id = 'architect-input';
    const focusSpy = vi.spyOn(architectInput, 'focus');
    const scrollSpy = vi.fn();
    architectInput.scrollIntoView = scrollSpy;
    document.body.appendChild(architectInput);

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-focus-test',
      sourceRecord: {
        id: 'src-focus-1',
        fileName: 'manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-focus-1',
          sourceId: 'src-focus-1',
          category: 'identity',
          question: 'What is the station frequency?',
          targetEffect: 'Calibrates comms frequency.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const resolveInArchitectBtn = buttons.find((b) =>
      b.textContent?.toLowerCase().includes('resolve in architect')
    );
    expect(resolveInArchitectBtn).toBeDefined();

    await act(async () => {
      resolveInArchitectBtn?.click();
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();

    architectInput.remove();
  });

  it('candidate decisions stay binary and staged', async () => {
    forgeActions.initializeDraft({ title: 'Baseline Title' });

    const initialDraft = JSON.parse(JSON.stringify(getForgeState().forgeDraft));
    const initialRevision = getForgeState().draftRevision;

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-binary-test',
      sourceRecord: {
        id: 'src-binary-1',
        fileName: 'baseline_data.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-binary-1',
          sourceId: 'src-binary-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Setting Location',
          explanation: 'Extracted deep trench sector',
          evidenceIds: [],
          proposedValue: 'Deep Trench Sector 7',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
      ],
      unknowns: [],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    const getCandidate = () =>
      getForgeState().sourceAnalyses['analysis-binary-test'].candidates[0];

    expect(getCandidate().reviewDecision).toBe('accepted');
    expect(getCandidate().applicationState).toBe('staged');

    const acceptBtn = container?.querySelector('#accept-cand-cand-binary-1') as HTMLButtonElement;
    const rejectBtn = container?.querySelector('#reject-cand-cand-binary-1') as HTMLButtonElement;

    expect(acceptBtn).toBeDefined();
    expect(rejectBtn).toBeDefined();
    expect(acceptBtn.disabled).toBe(true);
    expect(rejectBtn.disabled).toBe(false);

    // 1. Verify clicking already-selected Accept is a no-op
    await act(async () => {
      acceptBtn.click();
    });

    expect(getCandidate().reviewDecision).toBe('accepted');
    expect(getCandidate().applicationState).toBe('staged');
    expect(getForgeState().forgeDraft).toEqual(initialDraft);
    expect(getForgeState().draftRevision).toBe(initialRevision);

    // 2. Transition Accept → Reject
    await act(async () => {
      rejectBtn.click();
    });

    expect(getCandidate().reviewDecision).toBe('rejected');
    expect(getCandidate().applicationState).toBe('staged');
    expect(getForgeState().forgeDraft).toEqual(initialDraft);
    expect(getForgeState().draftRevision).toBe(initialRevision);

    // Re-query buttons or check properties after state re-render
    const updatedAcceptBtn = container?.querySelector('#accept-cand-cand-binary-1') as HTMLButtonElement;
    const updatedRejectBtn = container?.querySelector('#reject-cand-cand-binary-1') as HTMLButtonElement;
    expect(updatedAcceptBtn.disabled).toBe(false);
    expect(updatedRejectBtn.disabled).toBe(true);

    // 3. Verify clicking already-selected Reject is a no-op
    await act(async () => {
      updatedRejectBtn.click();
    });

    expect(getCandidate().reviewDecision).toBe('rejected');
    expect(getCandidate().applicationState).toBe('staged');
    expect(getForgeState().forgeDraft).toEqual(initialDraft);
    expect(getForgeState().draftRevision).toBe(initialRevision);

    // 4. Transition Reject → Accept
    await act(async () => {
      updatedAcceptBtn.click();
    });

    expect(getCandidate().reviewDecision).toBe('accepted');
    expect(getCandidate().applicationState).toBe('staged');
    expect(getForgeState().forgeDraft).toEqual(initialDraft);
    expect(getForgeState().draftRevision).toBe(initialRevision);
  });
});
