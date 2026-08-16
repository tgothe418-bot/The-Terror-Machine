import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ArchitectChat } from './ArchitectChat';
import { forgeActions, getForgeState } from '../../store/useForgeStore';

describe('Architect proposal isolation (Phase 3D-1)', () => {
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

  it('renders ArchitectChat and keeps canonical forgeDraft unchanged when Architect returns a compiledBlueprint proposal', async () => {
    // 1. Seed canonical Forge draft with authored title, premise, and location
    forgeActions.initializeDraft({
      title: 'Original Author Title',
      premise: 'Original author premise.',
      setting: { location: 'Original Vault' },
    });

    const initialDraftSnapshot = JSON.parse(JSON.stringify(getForgeState().forgeDraft));
    expect(initialDraftSnapshot.title).toBe('Original Author Title');

    // 2. Mock fetch('/api/architect') to return text narrative and a different compiledBlueprint proposal
    const proposedServerBlueprint = {
      identity: { title: 'Overwritten Nightmare Fortress' },
      title: 'Overwritten Nightmare Fortress',
      premise: 'Radically altered premise from LLM.',
      setting: { location: 'Labyrinth of Echoes' },
      cast: [
        {
          id: 'p1',
          name: 'Phantom Agent',
          role: 'ENTITY',
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'I have forged a new labyrinth for your consideration.',
        compiledBlueprint: proposedServerBlueprint,
      }),
    });
    globalThis.fetch = fetchMock;

    // 3. Render ArchitectChat component
    await act(async () => {
      root?.render(React.createElement(ArchitectChat));
    });

    // 4. Enter a message through the actual Architect input and submit through Enter key handler
    const input = container?.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(input, 'Compile a horror scenario');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(input.value).toBe('Compile a horror scenario');

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    // Await async fetch and state update
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // 5. Assertions
    // - Expected API call was made
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/architect',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // - User message and Architect response text appear in chat and state
    const stateAfter = getForgeState();
    const userMsg = stateAfter.architectMessages.find((m) => m.role === 'user');
    const architectReplies = stateAfter.architectMessages.filter((m) => m.role === 'architect');
    const latestArchMsg = architectReplies[architectReplies.length - 1];

    expect(userMsg?.content).toBe('Compile a horror scenario');
    expect(latestArchMsg?.content).toBe('I have forged a new labyrinth for your consideration.');
    expect(container?.textContent).toContain('Compile a horror scenario');
    expect(container?.textContent).toContain('I have forged a new labyrinth for your consideration.');

    // - Canonical forgeDraft retains authored title, premise, location without being overwritten
    expect(stateAfter.forgeDraft).toEqual(initialDraftSnapshot);
    expect(stateAfter.forgeDraft?.title).toBe('Original Author Title');
    expect(stateAfter.forgeDraft?.premise).toBe('Original author premise.');
    expect(stateAfter.forgeDraft?.setting?.location).toBe('Original Vault');
    expect(stateAfter.forgeDraft?.title).not.toBe(proposedServerBlueprint.title);
  });
});
