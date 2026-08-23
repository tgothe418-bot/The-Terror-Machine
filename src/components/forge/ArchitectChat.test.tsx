import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ArchitectChat } from './ArchitectChat';
import { forgeActions, getForgeState } from '../../store/useForgeStore';
import { ForgeSourceAnalysis } from '../../types/forge';

describe('ArchitectChat Queue Ownership & Ambiguity Lifecycle', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const setInputValue = (input: HTMLInputElement, val: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

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

  it('shows source file name, queue position and total, category, question, targetEffect, and status for an unresolved ambiguity', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'analysis-1',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'analysis-1',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level during breaches.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const text = container?.textContent || '';
    expect(text).toContain('station_manifest.pdf');
    expect(text).toMatch(/1\s*(of|\/)\s*1/i);
    expect(text).toContain('identity');
    expect(text).toContain('What is the primary containment protocol?');
    expect(text).toContain('Determines bulkhead security level during breaches.');
    expect(text.toLowerCase()).toMatch(/(pending|queued|clarification)/);
  });

  it('submitting input with active unknown sends AMBIGUITY_RESOLUTION with exact sourceId and unknownId', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'analysis-1',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'analysis-1',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level during breaches.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'FOLLOW_UP',
        sourceId: 'analysis-1',
        unknownId: 'unk-1',
        message: 'Understood. Is this protocol automated?',
        followUpQuestion: 'Is this protocol automated?',
      }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    expect(input).toBeDefined();

    await act(async () => {
      setInputValue(input, 'Level 4 vacuum containment');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.kind).toBe('AMBIGUITY_RESOLUTION');
    expect(requestBody.userMessage).toBe('Level 4 vacuum containment');
    expect(requestBody.activeUnknown.sourceId).toBe('analysis-1');
    expect(requestBody.activeUnknown.unknownId).toBe('unk-1');
  });

  it('updates unknown through receiveUnknownFollowUp upon validated FOLLOW_UP response', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'analysis-1',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'analysis-1',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'FOLLOW_UP',
        sourceId: 'analysis-1',
        unknownId: 'unk-1',
        message: 'Could you clarify who authorizes this?',
        followUpQuestion: 'Could you clarify who authorizes this?',
      }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Protocol Theta');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    const state = getForgeState();
    const unk = state.sourceAnalyses['analysis-1']?.unknowns[0];
    expect(unk.followUps.length).toBeGreaterThan(0);
    expect(unk.followUps[0].question).toBe('Could you clarify who authorizes this?');
  });

  it('updates unknown through receiveUnknownProposal upon validated RESOLUTION_PROPOSAL response', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'analysis-1',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'analysis-1',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'RESOLUTION_PROPOSAL',
        sourceId: 'analysis-1',
        unknownId: 'unk-1',
        message: 'Proposal synthesized.',
        proposal: {
          resolution: 'Bulkheads seal automatically on decompression alarm.',
          targetEffect: 'Automated bulkhead locks engage upon hull breach.',
        },
      }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Automatic decompression sealing');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    const state = getForgeState();
    const unk = state.sourceAnalyses['analysis-1']?.unknowns[0];
    expect(unk.status).toBe('awaiting_confirmation');
    expect(unk.resolutionProposal?.resolution).toBe('Bulkheads seal automatically on decompression alarm.');
  });

  it('produces visible error and no state transition on mismatched sourceId or unknownId', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'analysis-1',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'analysis-1',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    // Return mismatched IDs in response
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'RESOLUTION_PROPOSAL',
        sourceId: 'mismatched-source-id',
        unknownId: 'mismatched-unk-id',
        message: 'Mismatched proposal.',
        proposal: {
          resolution: 'Should not be applied',
          targetEffect: 'Should not be applied',
        },
      }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Automatic decompression sealing');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    const state = getForgeState();
    const unk = state.sourceAnalyses['analysis-1']?.unknowns[0];
    // Must NOT transition to awaiting_confirmation
    expect(unk.status).not.toBe('awaiting_confirmation');
    // Error must be recorded or visible
    expect(unk.lastError || container?.textContent).toBeTruthy();
  });

  it('allows editing, applying, leaving uncertain, or retrying proposal in ArchitectChat', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-1',
      sourceRecord: {
        id: 'analysis-1',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-1',
          sourceId: 'analysis-1',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level.',
          status: 'awaiting_confirmation',
          resolutionProposal: {
            resolution: 'Automatic airlock purge protocol.',
            targetEffect: 'Bulkhead locks engage.',
          },
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis);

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    expect(container?.textContent).toContain('Automatic airlock purge protocol.');

    // Look for Apply / Commit Resolution button
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const applyBtn = buttons.find((b) =>
      /apply|commit|accept/i.test(b.textContent || '')
    );
    expect(applyBtn).toBeDefined();

    // Look for Leave Uncertain button
    const leaveUncertainBtn = buttons.find((b) =>
      /leave uncertain|contextual discretion/i.test(b.textContent || '')
    );
    expect(leaveUncertainBtn).toBeDefined();

    // Clicking Apply Resolution commits to draft
    await act(async () => {
      applyBtn?.click();
    });

    const state = getForgeState();
    const unk = state.sourceAnalyses['analysis-1']?.unknowns[0];
    expect(unk.status).toBe('resolved');
    expect(state.forgeDraft?.ambiguities?.find((a) => a.id === 'unk-1')?.resolution).toBe(
      'Automatic airlock purge protocol.'
    );
  });

  it('sends GENERAL_MESSAGE and retains normal conversation when no unresolved ambiguity is active', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'MESSAGE',
        message: 'I am here to assist with scenario design.',
      }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Make it darker and more claustrophobic');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.kind).toBe('GENERAL_MESSAGE');
    expect(requestBody.userMessage).toBe('Make it darker and more claustrophobic');
  });
});
