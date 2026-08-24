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
      id: 'analysis-fail-1',
      sourceRecord: {
        id: 'src-fail-1',
        fileName: 'faulty.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-fail-1',
          sourceId: 'src-fail-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Setting Location',
          explanation: 'Invalid value',
          evidenceIds: [],
          proposedValue: 'Invalid Place',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
      ],
      unknowns: [],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    // Mock applyAcceptedCandidates to return a structured failure result
    vi.spyOn(forgeActions, 'applyAcceptedCandidates').mockReturnValue({
      success: false,
      errors: {
        'cand-fail-1': 'Target setting_location validation failed due to schema constraint.',
      },
    });

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    const applyBtn = container?.querySelector('#batch-apply-btn-analysis-fail-1') as HTMLButtonElement;
    expect(applyBtn).toBeDefined();

    // Click Apply Accepted and verify error banner is displayed cleanly
    await act(async () => {
      applyBtn.click();
    });

    const sourceCard = container?.querySelector('#source-card-analysis-fail-1');
    expect(sourceCard).toBeDefined();
    expect(sourceCard?.textContent).toContain('Target setting_location validation failed');
  });

  it('keeps Draft completely untouched and unmutated when reviewing candidates (accept/reject/no-op)', async () => {
    forgeActions.initializeDraft({ title: 'Untouched Draft Scenario' });
    const initialDraft = JSON.parse(JSON.stringify(getForgeState().forgeDraft));
    const initialRevision = getForgeState().draftRevision;

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-binary-test',
      sourceRecord: {
        id: 'src-bin-1',
        fileName: 'binary_review.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [
        {
          id: 'cand-binary-1',
          sourceId: 'src-bin-1',
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

  it('reviews linked evidence without changing Forge state', async () => {
    forgeActions.initializeDraft({ title: 'Submersible Delta' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-drawer-test',
      sourceRecord: {
        id: 'src-drawer-1',
        fileName: 'telemetry_archive.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      summary: 'Telemetry indicates extreme benthic pressure anomalies.',
      evidence: [
        {
          id: 'ev-1',
          sourceId: 'src-drawer-1',
          category: 'setting',
          claim: 'Depth recorded at 8000m.',
          excerpt: 'Sensor array reports crush pressure at 8000m in Trench Sector 7.',
        },
        {
          id: 'ev-2',
          sourceId: 'src-drawer-1',
          category: 'rule',
          claim: 'Containment seals require manual pneumatic reset.',
        },
      ],
      candidates: [
        {
          id: 'cand-with-ev',
          sourceId: 'src-drawer-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Trench Sector',
          explanation: 'Extracted deep trench sector from telemetry',
          evidenceIds: ['ev-1', 'ev-2'],
          proposedValue: 'Mariana Trench Sector 7',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
        {
          id: 'cand-no-ev',
          sourceId: 'src-drawer-1',
          classification: 'inference',
          target: 'setting_atmosphere',
          label: 'Atmosphere',
          explanation: 'Inferred oppressive darkness',
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

    // Capture initial state before any drawer interactions
    const stateBefore = JSON.parse(JSON.stringify(getForgeState()));

    await act(async () => {
      root?.render(React.createElement(ScenarioBaselinePanel));
    });

    // 1. Default collapse verification
    // Inline evidence claim/excerpt should NOT be rendered directly in the card
    const cardContent = container?.querySelector('#candidate-row-cand-with-ev')?.textContent || '';
    expect(cardContent).not.toContain('Sensor array reports crush pressure');

    // Candidate with linked evidence renders compact control "Evidence · 2"
    const evidenceOpener = container?.querySelector(
      '#view-evidence-btn-cand-with-ev'
    ) as HTMLButtonElement;
    expect(evidenceOpener).not.toBeNull();
    expect(evidenceOpener.textContent).toContain('Evidence · 2');
    expect(evidenceOpener.getAttribute('aria-expanded')).toBe('false');
    expect(evidenceOpener.getAttribute('aria-controls')).toBe('evidence-drawer-cand-with-ev');
    expect(evidenceOpener.getAttribute('aria-label')).toBe(
      'View 2 evidence items for Trench Sector'
    );

    // Candidate with NO linked evidence renders NO empty control
    const noEvidenceOpener = container?.querySelector('#view-evidence-btn-cand-no-ev');
    expect(noEvidenceOpener).toBeNull();

    // Drawer overlay is not rendered when closed
    expect(document.querySelector('#evidence-drawer-cand-with-ev')).toBeNull();

    // 2. Open drawer & Candidate-specific evidence verification
    await act(async () => {
      evidenceOpener.click();
    });

    expect(evidenceOpener.getAttribute('aria-expanded')).toBe('true');
    const drawer = document.querySelector('#evidence-drawer-cand-with-ev') as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.getAttribute('role')).toBe('dialog');
    expect(drawer.getAttribute('aria-modal')).toBe('true');
    expect(drawer.getAttribute('aria-labelledby')).toBe('evidence-drawer-title');
    expect(drawer.getAttribute('aria-describedby')).toBe('evidence-drawer-desc');

    // Title and candidate description
    expect(document.querySelector('#evidence-drawer-title')?.textContent).toContain(
      'Source Evidence Review'
    );
    expect(document.querySelector('#evidence-drawer-desc')?.textContent).toContain(
      'Trench Sector · telemetry_archive.json'
    );

    // Verify unchanged evidence strings and categories
    const ev1Record = document.querySelector('#evidence-record-ev-1');
    expect(ev1Record).not.toBeNull();
    expect(ev1Record?.textContent).toContain('setting');
    expect(ev1Record?.textContent).toContain('Depth recorded at 8000m.');
    expect(ev1Record?.textContent).toContain(
      'Sensor array reports crush pressure at 8000m in Trench Sector 7.'
    );
    expect(ev1Record?.textContent).toContain('telemetry_archive.json');

    const ev2Record = document.querySelector('#evidence-record-ev-2');
    expect(ev2Record).not.toBeNull();
    expect(ev2Record?.textContent).toContain('rule');
    expect(ev2Record?.textContent).toContain('Containment seals require manual pneumatic reset.');
    expect(ev2Record?.textContent).toContain('telemetry_archive.json');

    // Focus enters overlay (close button is focused)
    const closeBtn = document.querySelector('#close-evidence-drawer-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    expect(document.activeElement).toBe(closeBtn);

    // 3. Close Path 1: Close button
    await act(async () => {
      closeBtn.click();
    });

    expect(document.querySelector('#evidence-drawer-cand-with-ev')).toBeNull();
    expect(evidenceOpener.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(evidenceOpener);

    // 4. Close Path 2: Escape key
    await act(async () => {
      evidenceOpener.click();
    });
    expect(document.querySelector('#evidence-drawer-cand-with-ev')).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(document.querySelector('#evidence-drawer-cand-with-ev')).toBeNull();
    expect(evidenceOpener.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(evidenceOpener);

    // 5. Close Path 3: Click inside does NOT close & Backdrop click DOES close
    await act(async () => {
      evidenceOpener.click();
    });
    const openDrawer = document.querySelector('#evidence-drawer-cand-with-ev') as HTMLElement;
    expect(openDrawer).not.toBeNull();

    // Click inside the drawer content
    const titleElement = document.querySelector('#evidence-drawer-title') as HTMLElement;
    await act(async () => {
      titleElement.click();
    });
    // Drawer should still remain open
    expect(document.querySelector('#evidence-drawer-cand-with-ev')).not.toBeNull();

    // Click on backdrop overlay
    await act(async () => {
      openDrawer.click();
    });
    // Drawer should be dismissed
    expect(document.querySelector('#evidence-drawer-cand-with-ev')).toBeNull();
    expect(evidenceOpener.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(evidenceOpener);

    // 6. Exact before/after Forge-state comparison
    const stateAfter = JSON.parse(JSON.stringify(getForgeState()));
    expect(stateAfter).toEqual(stateBefore);
  });
});
