import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ExportReviewModal } from './ExportReviewModal';
import { forgeActions } from '../../store/useForgeStore';
import { ForgeSourceAnalysis } from '../../types/forge';

describe('ExportReviewModal Component Snapshot Lifecycle', () => {
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

  it('copies and downloads one reviewed artifact until revisions change', async () => {
    // 1. Initial Valid State Setup
    forgeActions.initializeDraft({
      title: 'Snapshot Station',
      premise: 'Testing immutable review snapshot lifecycle.',
      startingVector: 'SOMATIC',
      startingTier: 'MANIFEST',
      setting: { location: 'Benthos Node 1' },
      cast: [
        {
          id: 'c1',
          name: 'Dr. Vane',
          role: 'Specialist',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_01' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'NODE_01',
        nodes: ['NODE_01'],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          c1: 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    // Populate compliant depiction contract
    forgeActions.updateDepictionContractField('dramaticRegister', 'Clinical dread');
    forgeActions.updateDepictionContractField('directness', 'Visceral mechanics');
    forgeActions.updateDepictionContractField('aftermath', 'Irreversible consequences');
    forgeActions.updateDepictionContractField('ambiguityHandling', 'Preserve epistemic gaps');

    // Register compliant source analysis
    const validAnalysis: ForgeSourceAnalysis = {
      id: 'src-analysis-1',
      sourceRecord: {
        id: 'rec-1',
        fileName: 'station_manifest.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      summary: 'Station telemetry summary.',
      evidence: [],
      candidates: [
        {
          id: 'cand-1',
          sourceId: 'rec-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Location Candidate',
          explanation: 'Extracted location',
          evidenceIds: [],
          proposedValue: 'Benthos Node 1',
          reviewDecision: 'accepted',
          applicationState: 'applied',
        },
      ],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'rec-1',
          category: 'setting',
          question: 'Is oxygen infinite?',
          targetEffect: 'Limits supply',
          status: 'resolved',
          resolutionProposal: {
            resolution: 'Oxygen is finite and dwindling.',
            targetEffect: 'Limits supply',
          },
          followUps: [],
        },
      ],
      status: 'completed',
    };
    forgeActions.registerSourceAnalysis(validAnalysis, 'mock-binding-export-1');

    const mockOnClose = vi.fn();

    // 2. Begin with modal absent/closed (proves conditional mount boundary in Forge)
    await act(async () => {
      root?.render(null);
    });
    expect(container?.querySelector('#export-review-modal-content')).toBeNull();

    // Render conditional-mount boundary with modal open
    await act(async () => {
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    expect(container?.textContent).toContain('COMPLIANT');
    expect(container?.textContent).toContain('All Pre-Flight Contracts Satisfied');

    // Verify rendered source baseline totals
    const totalsSection = container?.querySelector('#export-readiness-totals-section');
    expect(totalsSection).not.toBeNull();
    expect(totalsSection?.textContent).toContain('1 source');
    expect(totalsSection?.textContent).toContain('Total: 1');
    expect(totalsSection?.textContent).toContain('Applied: 1');
    expect(totalsSection?.textContent).toContain('Resolved: 1');

    // 3. Verify Identical Copy/Download Bytes
    let copiedText = '';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async (text: string) => {
          copiedText = text;
        }),
      },
    });

    let downloadedData = '';
    let downloadedFileName = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        vi.spyOn(el, 'click').mockImplementation(() => {
          downloadedData = decodeURIComponent(el.getAttribute('href') || '').replace(
            'data:text/json;charset=utf-8,',
            ''
          );
          downloadedFileName = el.getAttribute('download') || '';
        });
      }
      return el;
    });

    const copyBtn = container?.querySelector('#export-review-copy-json-btn') as HTMLButtonElement;
    const downloadBtn = container?.querySelector('#export-review-download-btn') as HTMLButtonElement;

    expect(copyBtn.disabled).toBe(false);
    expect(downloadBtn.disabled).toBe(false);

    await act(async () => {
      copyBtn.click();
    });

    await act(async () => {
      downloadBtn.click();
    });

    expect(copiedText).toBeTruthy();
    expect(downloadedData).toBeTruthy();
    expect(copiedText).toBe(downloadedData);
    expect(downloadedFileName).toContain('snapshot_station.json');

    // 4. Stale Path 1: Draft Revision Advances
    act(() => {
      forgeActions.updateDraft({ premise: 'Mutated premise while export review is open.' });
    });

    await act(async () => {
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    // Stale notice should appear and Copy/Download should be disabled
    const staleNotice = container?.querySelector('#export-review-stale-notice');
    expect(staleNotice).not.toBeNull();
    expect(staleNotice?.textContent).toContain('Review Snapshot Is Stale');
    expect(copyBtn.disabled).toBe(true);
    expect(downloadBtn.disabled).toBe(true);

    const refreshBtn = container?.querySelector('#export-review-refresh-btn') as HTMLButtonElement;
    expect(refreshBtn).not.toBeNull();

    // 5. Refresh Replacement
    await act(async () => {
      refreshBtn.click();
    });

    expect(container?.querySelector('#export-review-stale-notice')).toBeNull();
    expect(copyBtn.disabled).toBe(false);
    expect(downloadBtn.disabled).toBe(false);

    // Download refreshed artifact and assert it contains updated premise
    await act(async () => {
      downloadBtn.click();
    });
    expect(downloadedData).toContain('Mutated premise while export review is open.');

    // 6. Stale Path 2: Source Baseline Revision Advances
    const newAnalysis: ForgeSourceAnalysis = {
      id: 'src-analysis-2',
      sourceRecord: {
        id: 'rec-2',
        fileName: 'sonar_log.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      evidence: [],
      candidates: [],
      unknowns: [],
      status: 'completed',
    };
    act(() => {
      forgeActions.registerSourceAnalysis(newAnalysis, 'mock-binding-export-2');
    });

    await act(async () => {
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    expect(container?.querySelector('#export-review-stale-notice')).not.toBeNull();
    expect(copyBtn.disabled).toBe(true);
    expect(downloadBtn.disabled).toBe(true);

    // 7. Invalid Readiness with No Artifact
    act(() => {
      forgeActions.resetStore();
      forgeActions.initializeDraft({ title: '' }); // Invalid missing title & depiction
    });

    await act(async () => {
      root?.unmount();
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    expect(container?.textContent).toContain('ACTION REQUIRED');
    expect(container?.textContent).toContain('Validation Discrepancies Found');
    const invalidCopyBtn = container?.querySelector('#export-review-copy-json-btn') as HTMLButtonElement;
    const invalidDownloadBtn = container?.querySelector('#export-review-download-btn') as HTMLButtonElement;
    expect(invalidCopyBtn.disabled).toBe(true);
    expect(invalidDownloadBtn.disabled).toBe(true);
  });

  it('source-backed compliant Blueprint compiles and enables both export actions', async () => {
    forgeActions.resetStore();

    const sourceEvidence = {
      id: 'ev-loc-1',
      sourceId: 'rec-1',
      category: 'topology' as const,
      excerpt: 'Sub-Level 3 Control Hub',
      claim: 'Initial starting room',
    };

    const validAnalysis: ForgeSourceAnalysis = {
      id: 'src-analysis-1',
      sourceRecord: {
        id: 'rec-1',
        fileName: 'facility_map.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      summary: 'Facility map extract',
      evidence: [sourceEvidence],
      candidates: [],
      unknowns: [],
      status: 'completed',
    };
    forgeActions.registerSourceAnalysis(validAnalysis, 'binding-1');

    forgeActions.initializeDraft({
      title: 'Facility Omega',
      premise: 'Underground containment failure.',
      startingVector: 'SOMATIC',
      startingTier: 'MANIFEST',
      setting: { location: 'Sub-Level 3' },
      cast: [
        {
          id: 'c1',
          name: 'Dr. Vane',
          role: 'Specialist',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_01' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'NODE_01',
        startingNodeProvenance: {
          sourceId: 'rec-1',
          evidenceIds: ['ev-loc-1'],
        },
        nodes: ['NODE_01'],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          c1: 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    forgeActions.updateDepictionContractField('dramaticRegister', 'Clinical dread');
    forgeActions.updateDepictionContractField('directness', 'Visceral mechanics');
    forgeActions.updateDepictionContractField('aftermath', 'Irreversible consequences');
    forgeActions.updateDepictionContractField('ambiguityHandling', 'Preserve epistemic gaps');

    const mockOnClose = vi.fn();
    await act(async () => {
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    expect(container?.textContent).toContain('COMPLIANT');
    expect(container?.textContent).toContain('All Pre-Flight Contracts Satisfied');

    const copyBtn = container?.querySelector('#export-review-copy-json-btn') as HTMLButtonElement;
    const downloadBtn = container?.querySelector('#export-review-download-btn') as HTMLButtonElement;
    expect(copyBtn.disabled).toBe(false);
    expect(downloadBtn.disabled).toBe(false);
  });

  it('compilation failure cannot display a compliant export banner', async () => {
    forgeActions.resetStore();

    const validAnalysis: ForgeSourceAnalysis = {
      id: 'src-analysis-1',
      sourceRecord: {
        id: 'rec-1',
        fileName: 'facility_map.json',
        mimeType: 'application/json',
        kind: 'native_blueprint',
        receivedAt: Date.now(),
      },
      summary: 'Facility map extract',
      evidence: [
        {
          id: 'ev-loc-valid',
          sourceId: 'rec-1',
          category: 'topology',
          excerpt: 'Real room',
          claim: 'Real room claim',
        },
      ],
      candidates: [],
      unknowns: [],
      status: 'completed',
    };
    forgeActions.registerSourceAnalysis(validAnalysis, 'binding-1');

    // Create a draft that is readiness-valid but uses a non-existent evidenceId in startingNodeProvenance.
    // This makes readiness pass while compiler throws ForgeCompilationError.
    forgeActions.initializeDraft({
      title: 'Facility Omega',
      premise: 'Underground containment failure.',
      startingVector: 'SOMATIC',
      startingTier: 'MANIFEST',
      setting: { location: 'Sub-Level 3' },
      cast: [
        {
          id: 'c1',
          name: 'Dr. Vane',
          role: 'Specialist',
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_01' },
        },
      ],
      userCharacterId: 'c1',
      userOpeningAim: {
        castMemberId: 'c1',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'NODE_01',
        startingNodeProvenance: {
          sourceId: 'rec-1',
          evidenceIds: ['ev-loc-nonexistent'], // Evidence does not exist in rec-1!
        },
        nodes: ['NODE_01'],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          c1: 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    forgeActions.updateDepictionContractField('dramaticRegister', 'Clinical dread');
    forgeActions.updateDepictionContractField('directness', 'Visceral mechanics');
    forgeActions.updateDepictionContractField('aftermath', 'Irreversible consequences');
    forgeActions.updateDepictionContractField('ambiguityHandling', 'Preserve epistemic gaps');

    const mockOnClose = vi.fn();
    await act(async () => {
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    // COMPLIANT banner MUST NOT be present
    expect(container?.textContent).not.toContain('COMPLIANT');
    expect(container?.textContent).toContain('ACTION REQUIRED');
    expect(container?.textContent).toContain('compilation:');

    const copyBtn = container?.querySelector('#export-review-copy-json-btn') as HTMLButtonElement;
    const downloadBtn = container?.querySelector('#export-review-download-btn') as HTMLButtonElement;
    expect(copyBtn.disabled).toBe(true);
    expect(downloadBtn.disabled).toBe(true);
  });

  it('export review does not display a global Start fallback for perspective-neutral drafts', async () => {
    forgeActions.initializeDraft({
      title: 'Perspective Neutral Station',
      premise: 'Facility without global start.',
      startingVector: 'SOMATIC',
      startingTier: 'MANIFEST',
      setting: { location: 'Deep Trench' },
      cast: [
        {
          id: 'c1',
          name: 'Crew Member',
          role: 'Engineer',
          isEntity: false,
          isUserCharacter: false,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_01' },
        },
        {
          id: 'c2',
          name: 'Offstage Crew',
          role: 'Scientist',
          isEntity: false,
          isUserCharacter: false,
          presenceDisposition: { kind: 'OFFSTAGE' },
        },
      ],
      topology: {
        nodes: ['NODE_01'],
        nodeDefinitions: [{ id: 'NODE_01', label: 'Node 01' }],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          c1: 'REVIEWED_NONE',
          c2: 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    });

    forgeActions.updateDepictionContractField('dramaticRegister', 'Clinical dread');
    forgeActions.updateDepictionContractField('directness', 'Visceral mechanics');
    forgeActions.updateDepictionContractField('aftermath', 'Irreversible consequences');
    forgeActions.updateDepictionContractField('ambiguityHandling', 'Preserve epistemic gaps');

    const mockOnClose = vi.fn();
    await act(async () => {
      root?.render(React.createElement(ExportReviewModal, { isOpen: true, onClose: mockOnClose }));
    });

    // Verify manifest text shows cast breakdown and does NOT show Start:
    expect(container?.textContent).toContain('2 cast (1 placed · 1 offstage · 0 non-local)');
    expect(container?.textContent).not.toContain('Start:');
  });
});
