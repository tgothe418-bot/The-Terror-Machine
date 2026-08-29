import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { FileDropzone } from './FileDropzone';
import { ArchitectChat } from './ArchitectChat';
import {
  forgeActions,
  getForgeState,
  getRuntimeSourceBinding,
} from '../../store/useForgeStore';
import { ForgeSourceAnalysis } from '../../types/forge';

describe('FileDropzone & Architect Binding Lifecycle UI', () => {
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

  const setInputValue = (input: HTMLInputElement, val: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('1. handles server registration error gracefully and displays safe error message without corrupting draft', async () => {
    // Mock fetch to simulate server registration failure (e.g. HTTP 413 Payload Too Large)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: 'Uploaded file size (25.0 MB) exceeds maximum allowed size (10.0 MB).',
        code: 'PAYLOAD_TOO_LARGE',
      }),
    } as Response);

    await act(async () => {
      root?.render(<FileDropzone />);
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Create a mock JSON file
    const file = new File([JSON.stringify({ title: 'Giant Scenario' })], 'giant.json', {
      type: 'application/json',
    });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for async processing microtasks to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify error is displayed in the UI
    expect(container?.textContent).toContain('Uploaded file size');
    // Verify draft remains uncorrupted
    const draft = getForgeState().forgeDraft;
    expect(draft?.identity?.title || draft?.title || '').not.toBe('Giant Scenario');
  });

  it('2. revokes server binding and purges runtime map when source or reference is removed', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, revoked: true }),
    } as Response);
    globalThis.fetch = fetchSpy;

    const analysisId = 'src-test-analysis-99';
    const mockBinding = 'binding-secret-uuid-123';

    const mockAnalysis: ForgeSourceAnalysis = {
      id: analysisId,
      sourceRecord: {
        id: analysisId,
        fileName: 'classified_briefing.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [],
      status: 'completed',
    };

    act(() => {
      forgeActions.registerSourceAnalysis(mockAnalysis, mockBinding);
    });

    expect(getRuntimeSourceBinding(analysisId)).toBe(mockBinding);

    // Remove source analysis
    await act(async () => {
      forgeActions.removeSourceAnalysis(analysisId);
    });

    // Runtime map purged
    expect(getRuntimeSourceBinding(analysisId)).toBeUndefined();

    // POST /api/revoke-source-binding called with JSON request body (never DELETE URL)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/revoke-source-binding',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBinding: mockBinding }),
      })
    );
  });

  it('3. displays clear error when server binding expires and allows recovery without corrupting draft', async () => {
    // Mock server returning SOURCE_BINDING_EXPIRED
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Source binding is missing, expired, or invalid. Source analysis must be registered before resolution.',
        code: 'SOURCE_BINDING_EXPIRED',
      }),
    } as Response);

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-expired-1',
      sourceRecord: {
        id: 'analysis-expired-1',
        fileName: 'expired_briefing.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-exp-1',
          sourceId: 'analysis-expired-1',
          category: 'premise',
          question: 'What is the origin of the signal?',
          targetEffect: 'Establishes broadcast transmitter.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    act(() => {
      forgeActions.initializeDraft({ title: 'Clean Scenario' });
      forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-expired-123');
    });

    await act(async () => {
      root?.render(<ArchitectChat />);
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();

    await act(async () => {
      setInputValue(input, 'The signal originates from Sector 4.');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    // Wait for fetch microtask
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify error is rendered to user
    expect(container?.textContent).toContain('Source intake session expired');

    // Verify draft remains uncorrupted
    const draft = getForgeState().forgeDraft;
    expect(draft?.ambiguities || []).toHaveLength(0);
  });

  it('4. handles document extraction with completed_with_issues by registering valid candidates and reporting quarantined issues', async () => {
    const serverNormalizedAnalysis: ForgeSourceAnalysis = {
      id: 'src-12345-analysis',
      sourceRecord: {
        id: 'src-12345',
        fileName: 'tartarus_notes.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
        fileSizeBytes: 100,
      },
      summary: 'Research notes on Station Tartarus.',
      evidence: [
        {
          id: 'ev-1',
          sourceId: 'src-12345',
          category: 'setting',
          claim: 'Station Tartarus is deep underwater.',
          excerpt: 'Station Tartarus underwater.',
        },
      ],
      candidates: [
        {
          id: 'cand-valid-loc',
          sourceId: 'src-12345',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Setting Location',
          explanation: 'Station Tartarus underwater.',
          evidenceIds: ['ev-1'],
          proposedValue: 'Station Tartarus Underwater Facility',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
      ],
      unknowns: [],
      validationIssues: [
        {
          id: 'src-12345-issue-2',
          sourceId: 'src-12345',
          candidateIndex: 2,
          candidateTarget: 'cast_expression_guidance',
          label: 'Invalid Expression Guidance',
          fieldPath: 'proposedValue.communicationModes',
          code: 'INVALID_ENUM',
          message: 'Invalid communication mode',
          disposition: 'QUARANTINED',
        },
      ],
      omittedValidationIssueCount: 0,
      status: 'completed_with_issues',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        sourceBinding: 'binding-issues-999',
        analysis: serverNormalizedAnalysis,
      }),
    } as Response);

    await act(async () => {
      root?.render(<FileDropzone />);
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Some notes on Tartarus.'], 'tartarus_notes.txt', {
      type: 'text/plain',
    });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const analyses = Object.values(getForgeState().sourceAnalyses);
    expect(analyses).toHaveLength(1);
    expect(analyses[0].status).toBe('completed_with_issues');
    expect(analyses[0].candidates).toHaveLength(1);
    expect(analyses[0].candidates[0].target).toBe('setting_location');
    expect(analyses[0].validationIssues).toHaveLength(1);
    expect(analyses[0].validationIssues![0].disposition).toBe('QUARANTINED');

    expect(getRuntimeSourceBinding(analyses[0].id)).toBe('binding-issues-999');
  });

  it('5. handles document extraction fatal error without registering source analysis or binding', async () => {
    const errorAnalysis: ForgeSourceAnalysis = {
      id: 'src-fatal-analysis',
      sourceRecord: {
        id: 'src-fatal',
        fileName: 'unusable.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
        fileSizeBytes: 50,
      },
      summary: 'Extraction failed.',
      evidence: [],
      candidates: [],
      unknowns: [],
      validationIssues: [],
      omittedValidationIssueCount: 0,
      status: 'error',
      errorMessage: 'Extraction produced no usable baseline: unparseable content.',
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        sourceBinding: 'binding-fatal-000',
        analysis: errorAnalysis,
      }),
    } as Response);
    globalThis.fetch = fetchSpy;

    await act(async () => {
      root?.render(<FileDropzone />);
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Completely malformed text.'], 'unusable.txt', {
      type: 'text/plain',
    });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify 0 analyses registered in store
    const analyses = Object.values(getForgeState().sourceAnalyses);
    expect(analyses).toHaveLength(0);

    // Verify error displayed in UI
    expect(container?.textContent).toContain('Extraction produced no usable baseline');

    // Verify binding revocation was requested
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/revoke-source-binding',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBinding: 'binding-fatal-000' }),
      })
    );
  });

  it('FileDropzone preserves server completed_with_issues analysis without re-normalizing it', async () => {
    const serverAnalysis: ForgeSourceAnalysis = {
      id: 'src-preserve-analysis',
      sourceRecord: {
        id: 'src-preserve',
        fileName: 'station_notes.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
        fileSizeBytes: 120,
      },
      summary: 'Research notes on Station.',
      evidence: [{ id: 'ev-1', sourceId: 'src-preserve', category: 'setting', claim: 'Station is underwater.' }],
      candidates: [
        {
          id: 'cand-loc',
          sourceId: 'src-preserve',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Location',
          explanation: 'Station location',
          evidenceIds: ['ev-1'],
          proposedValue: 'Underwater Station',
          reviewDecision: 'accepted',
          applicationState: 'staged',
        },
      ],
      unknowns: [],
      validationIssues: [
        {
          id: 'src-preserve-issue-1',
          sourceId: 'src-preserve',
          candidateIndex: 1,
          candidateTarget: 'cast_seed',
          label: 'Corrupted Cast',
          fieldPath: 'proposedValue.name',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Missing character name',
          disposition: 'QUARANTINED',
        },
      ],
      omittedValidationIssueCount: 0,
      status: 'completed_with_issues',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        sourceBinding: 'binding-preserve-1',
        analysis: serverAnalysis,
      }),
    } as Response);

    await act(async () => {
      root?.render(<FileDropzone />);
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Notes'], 'station_notes.txt', { type: 'text/plain' });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const analyses = Object.values(getForgeState().sourceAnalyses);
    expect(analyses).toHaveLength(1);
    expect(analyses[0].status).toBe('completed_with_issues');
    expect(analyses[0].validationIssues).toHaveLength(1);
    expect(analyses[0].validationIssues![0].id).toBe('src-preserve-issue-1');
  });

  it('normal import performs no automatic depiction proposal request', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        sourceBinding: 'binding-no-proposal',
        analysis: {
          id: 'src-no-prop-analysis',
          sourceRecord: {
            id: 'src-no-prop',
            fileName: 'doc.txt',
            mimeType: 'text/plain',
            kind: 'document',
            receivedAt: Date.now(),
            fileSizeBytes: 100,
          },
          evidence: [{ id: 'ev-1', sourceId: 'src-no-prop', category: 'other', claim: 'Claim' }],
          candidates: [
            {
              id: 'cand-dep',
              sourceId: 'src-no-prop',
              classification: 'evidence',
              target: 'depiction_contract',
              label: 'Depiction Contract',
              explanation: 'Tone',
              evidenceIds: ['ev-1'],
              proposedValue: {
                dramaticRegister: 'Dread',
                directness: 'Direct',
                aftermath: 'Grim',
                ambiguityHandling: 'Uncertain',
              },
              reviewDecision: 'accepted',
              applicationState: 'staged',
            },
          ],
          unknowns: [],
          status: 'completed',
        },
      }),
    } as Response);
    globalThis.fetch = fetchSpy;

    await act(async () => {
      root?.render(<FileDropzone />);
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Source text'], 'doc.txt', { type: 'text/plain' });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify /api/architect was NOT called
    const architectCalls = fetchSpy.mock.calls.filter((call) => call[0] === '/api/architect');
    expect(architectCalls).toHaveLength(0);
    expect(getForgeState().pendingDepictionContractProposal).toBeNull();
  });
});
