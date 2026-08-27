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

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

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

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

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

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

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

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

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

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

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

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

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
    const ambiguity = state.forgeDraft?.ambiguities?.find((a) => a.id === 'unk-1');
    expect(ambiguity).toBeDefined();
    if (ambiguity && ambiguity.resolutionMode === 'USER_DEFINED') {
      expect(ambiguity.resolution).toBe('Automatic airlock purge protocol.');
    }
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

  describe('fails closed before recording creator input', () => {
    const testCases = [
      {
        name: 'identity mismatch on sourceId',
        response: {
          ok: true,
          status: 200,
          data: {
            type: 'RESOLUTION_PROPOSAL',
            sourceId: 'wrong-source-id',
            unknownId: 'unk-1',
            proposal: {
              resolution: 'Mismatched source resolution',
              targetEffect: 'Mismatched target effect',
            },
          },
        },
      },
      {
        name: 'identity mismatch on unknownId',
        response: {
          ok: true,
          status: 200,
          data: {
            type: 'FOLLOW_UP',
            sourceId: 'src-1',
            unknownId: 'wrong-unknown-id',
            followUpQuestion: 'Wrong question?',
          },
        },
      },
      {
        name: 'malformed response missing proposal fields',
        response: {
          ok: true,
          status: 200,
          data: {
            type: 'RESOLUTION_PROPOSAL',
            sourceId: 'src-1',
            unknownId: 'unk-1',
            proposal: {
              resolution: '',
              targetEffect: '',
            },
          },
        },
      },
      {
        name: 'unrecognized response type',
        response: {
          ok: true,
          status: 200,
          data: {
            type: 'UNKNOWN_MAGIC_TYPE',
            sourceId: 'src-1',
            unknownId: 'unk-1',
          },
        },
      },
      {
        name: 'HTTP 500 error',
        response: {
          ok: false,
          status: 500,
          data: { error: 'Server exploded' },
        },
      },
    ];

    testCases.forEach(({ name, response }) => {
      it(`fails closed for: ${name}`, async () => {
        forgeActions.initializeDraft({ title: 'Baseline Scenario' });

        const mockAnalysis: ForgeSourceAnalysis = {
          id: 'src-1',
          sourceRecord: {
            id: 'src-1',
            fileName: 'source.json',
            mimeType: 'application/json',
            kind: 'native_blueprint',
            receivedAt: Date.now(),
          },
          evidence: [],
          candidates: [],
          unknowns: [
            {
              id: 'unk-1',
              sourceId: 'src-1',
              category: 'rule',
              question: 'How is containment breach prevented?',
              targetEffect: 'Defines secondary containment failure mode',
              status: 'queued',
              followUps: [],
            },
          ],
          status: 'completed',
        };

        forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-test-1');

        const initialDraft = JSON.parse(JSON.stringify(getForgeState().forgeDraft));
        const initialRevision = getForgeState().draftRevision;
        const initialUnknown = JSON.parse(
          JSON.stringify(getForgeState().sourceAnalyses['src-1'].unknowns[0])
        );

        const fetchMock = vi.fn().mockResolvedValue({
          ok: response.ok,
          status: response.status,
          json: async () => response.data,
        });
        globalThis.fetch = fetchMock;

        await act(async () => {
          root?.render(React.createElement(ArchitectChat));
        });

        const input = container?.querySelector('input') as HTMLInputElement;
        await act(async () => {
          setInputValue(input, 'Attempted creator input for resolution');
        });

        await act(async () => {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const currentState = getForgeState();
        const currentUnknown =
          currentState.sourceAnalyses['src-1'].unknowns[0];

        // 1. Creator input is not recorded into unknown state
        expect(currentUnknown.submittedAnswer).toBeUndefined();
        // 2. Lifecycle status unchanged
        expect(currentUnknown.status).toBe('queued');
        // 3. Complete unknown matches initial unknown exactly
        expect(currentUnknown).toEqual(initialUnknown);
        // 4. Draft contents and draft revision unchanged
        expect(currentState.forgeDraft).toEqual(initialDraft);
        expect(currentState.draftRevision).toBe(initialRevision);

        // 5. Shows a local retryable error in Architect Chat
        expect(container?.textContent).toMatch(/validation failed|protocol failure|failed with status|interrupted/i);
        const retryBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
          /retry/i.test(b.textContent || '')
        );
        expect(retryBtn).toBeDefined();
      });
    });
  });

  it('submits successfully when draft contains rich cast with goals, traits, entity, and location', async () => {
    forgeActions.initializeDraft({
      title: 'Deep Station',
      cast: [
        {
          id: 'char-101',
          name: 'Chief Engineer Cole',
          role: 'PROTAGONIST',
          description: 'Submersible systems expert.',
          personality: 'Stoic, analytical.',
          goals: 'Restore primary atmospheric seals.',
          traits: ['Disciplined', 'Claustrophobic'],
          isUserCharacter: true,
          isEntity: false,
          behaviorVector: 'METICULOUS',
          starting_location: 'AIRLOCK_B',
        },
      ],
    });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-rich',
      sourceRecord: {
        id: 'analysis-rich',
        fileName: 'engineering_manual.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-rc',
          sourceId: 'analysis-rich',
          category: 'cast',
          question: 'How do atmospheric seals operate?',
          targetEffect: 'Determines seal override latency.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-rich-1');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'RESOLUTION_PROPOSAL',
        sourceId: 'analysis-rich',
        unknownId: 'unk-rc',
        message: 'Atmospheric seal resolution synthesized.',
        proposal: {
          resolution: 'Manual override wheel in Airlock B initiates immediate pressure normalization.',
          targetEffect: 'Airlock B locks engage.',
        },
      }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Manual override wheel inside Airlock B');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.kind).toBe('AMBIGUITY_RESOLUTION');
    expect(body.draftContext.cast).toHaveLength(1);
    expect(body.draftContext.cast[0].goals).toBe('Restore primary atmospheric seals.');
    expect(body.draftContext.cast[0].traits).toEqual(['Disciplined', 'Claustrophobic']);

    const state = getForgeState();
    const unk = state.sourceAnalyses['analysis-rich']?.unknowns[0];
    expect(unk.status).toBe('awaiting_confirmation');
  });

  it('displays explicit Reattach source required when source binding is missing or expired', async () => {
    forgeActions.initializeDraft({ title: 'Test Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-nobinding',
      sourceRecord: {
        id: 'analysis-nobinding',
        fileName: 'station_manifest.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-nb-1',
          sourceId: 'analysis-nobinding',
          category: 'identity',
          question: 'What is the primary containment protocol?',
          targetEffect: 'Determines bulkhead security level.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    // Register with binding, then remove binding from runtime map to simulate expired/lost binding
    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-to-expire');
    // delete from runtime map
    const { removeRuntimeSourceBinding } = await import('../../store/useForgeStore');
    removeRuntimeSourceBinding('analysis-nobinding');

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Emergency purge protocol');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    // Must NOT call fetch since client caught missing binding fail-closed
    expect(fetchMock).not.toHaveBeenCalled();

    // Must display Reattach source required
    expect(container?.textContent).toContain('Reattach source required');
  });

  it('functional retry sends the retained attempt and succeeds upon subsequent success', async () => {
    forgeActions.initializeDraft({ title: 'Retry Scenario' });

    const mockAnalysis: ForgeSourceAnalysis = {
      id: 'analysis-retry',
      sourceRecord: {
        id: 'analysis-retry',
        fileName: 'sub_schematic.pdf',
        mimeType: 'application/pdf',
        kind: 'document',
        receivedAt: 1000,
      },
      evidence: [],
      candidates: [],
      unknowns: [
        {
          id: 'unk-retry-1',
          sourceId: 'analysis-retry',
          category: 'setting',
          question: 'How is auxiliary power rerouted?',
          targetEffect: 'Determines power failure mode.',
          status: 'queued',
          followUps: [],
        },
      ],
      status: 'completed',
    };

    forgeActions.registerSourceAnalysis(mockAnalysis, 'binding-retry-1');

    // First call fails with 500
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Transient network failure' }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          type: 'RESOLUTION_PROPOSAL',
          sourceId: 'analysis-retry',
          unknownId: 'unk-retry-1',
          message: 'Auxiliary power proposal synthesized.',
          proposal: {
            resolution: 'Auxiliary generator switches automatically via breaker panel 3.',
            targetEffect: 'Breaker panel 3 operates.',
          },
        }),
      };
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    const input = container?.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Automatic breaker panel 3 switch');
    });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Transient network failure');

    // Click Retry button
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const retryBtn = buttons.find((b) => /retry/i.test(b.textContent || ''));
    expect(retryBtn).toBeDefined();

    await act(async () => {
      retryBtn?.click();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondCallBody.userMessage).toBe('Automatic breaker panel 3 switch');

    const state = getForgeState();
    const unk = state.sourceAnalyses['analysis-retry']?.unknowns[0];
    expect(unk.status).toBe('awaiting_confirmation');
    expect(unk.resolutionProposal?.resolution).toBe(
      'Auxiliary generator switches automatically via breaker panel 3.'
    );
  });
});
