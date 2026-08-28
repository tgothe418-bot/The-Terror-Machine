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
});
