import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { forgeActions, getForgeState } from '../../store/useForgeStore';

describe('Architect proposal isolation (Phase 3D-1)', () => {
  beforeEach(() => {
    forgeActions.resetStore();
    vi.restoreAllMocks();
  });

  it('keeps canonical forgeDraft unchanged when Architect returns a compiledBlueprint proposal', async () => {
    // 1. Initialize author's draft
    forgeActions.initializeDraft({
      title: 'Original Author Title',
      premise: 'Original author premise.',
      setting: { location: 'Original Vault' },
    });

    const initialDraftSnapshot = JSON.parse(JSON.stringify(getForgeState().forgeDraft));
    expect(initialDraftSnapshot.title).toBe('Original Author Title');

    // 2. Simulate server response containing a proposal with a different blueprint
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

    // Mock fetch to return the proposal
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        text: 'I have forged a new labyrinth for your consideration.',
        compiledBlueprint: proposedServerBlueprint,
      }),
    });

    // 3. User sends a message to the Architect
    forgeActions.addArchitectMessage({ role: 'user', content: 'Compile a horror scenario' });

    const response = await fetch('/api/architect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: [{ role: 'user', content: 'Compile a horror scenario' }] }),
    });
    const data = await response.json();

    // 4. Record the architect response in chat history
    forgeActions.addArchitectMessage({ role: 'architect', content: data.text });

    // 5. Verify the proposal does NOT automatically mutate or overwrite the canonical forgeDraft
    const stateAfterResponse = getForgeState();
    expect(stateAfterResponse.forgeDraft).toEqual(initialDraftSnapshot);
    expect(stateAfterResponse.forgeDraft?.title).toBe('Original Author Title');
    expect(stateAfterResponse.forgeDraft?.premise).toBe('Original author premise.');
    expect(stateAfterResponse.forgeDraft?.setting?.location).toBe('Original Vault');
    expect(stateAfterResponse.forgeDraft?.title).not.toBe(proposedServerBlueprint.title);
    expect(stateAfterResponse.architectMessages).toHaveLength(3); // Initial greeting + user message + architect message
  });
});
