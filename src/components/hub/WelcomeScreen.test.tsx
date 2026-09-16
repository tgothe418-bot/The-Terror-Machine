import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import WelcomeScreen from './WelcomeScreen';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { forgeActions, useForgeStoreInternal } from '../../store/useForgeStore';

describe('WelcomeScreen Component (1440p Ultrawide Staging)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.restoreAllMocks();

    // Mock fetch for /api/ai/config
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/ai/config')) {
        return {
          ok: true,
          json: async () => ({
            tier: 'free',
            model: 'gemini-3.6-flash',
            voiceProvider: 'openai',
            openAiModel: 'gpt-5.6-luna',
            localModel: '',
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    useAppStore.setState({ phase: 'HUB' });
    useEngineStore.setState({ activeBlueprint: null });
    forgeActions.resetStore();

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
    }
  });

  it('renders the three altar portals across the ultrawide canvas with wide cards', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const content = container?.innerHTML || '';

    // Check titles of the three portals
    expect(content).toContain('The Forge');
    expect(content).toContain('The Engine');
    expect(content).toContain('The Historian');

    // Check portal sub-designations & action badges
    expect(content).toContain('[ INSCRIBE BLUEPRINT ]');
    expect(content).toContain('[ COMMENCE RITUAL ]');
    expect(content).toContain('[ CONSULT THE ORACLE ]');

    // Check ultrawide architectural pillars
    expect(content).toContain('Topology Canvas');
    expect(content).toContain('Obsidian Slate');
    expect(content).toContain('Cross-Session');
  });

  it('transitions to forge phase when The Forge portal card is clicked', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const buttons = container?.querySelectorAll('button');
    const forgeCard = Array.from(buttons || []).find((b) => b.textContent?.includes('The Forge'));
    expect(forgeCard).toBeTruthy();

    await act(async () => {
      forgeCard?.click();
    });

    expect(useAppStore.getState().phase).toBe('forge');
  });

  it('transitions to engine phase when The Engine portal card is clicked', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const buttons = container?.querySelectorAll('button');
    const engineCard = Array.from(buttons || []).find((b) => b.textContent?.includes('The Engine'));
    expect(engineCard).toBeTruthy();

    await act(async () => {
      engineCard?.click();
    });

    expect(useAppStore.getState().phase).toBe('engine');
  });

  it('transitions to voice phase when The Historian portal card is clicked', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const buttons = container?.querySelectorAll('button');
    const historianCard = Array.from(buttons || []).find((b) => b.textContent?.includes('The Historian'));
    expect(historianCard).toBeTruthy();

    await act(async () => {
      historianCard?.click();
    });

    expect(useAppStore.getState().phase).toBe('voice');
  });

  it('renders the Scenario Preview Shelf with canonical and recent grimoires', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const content = container?.innerHTML || '';

    // Verify shelf header
    expect(content).toContain('SCENARIO PREVIEW SHELF');

    // Verify Canonical Grimoire
    expect(content).toContain('The Black Iron Mortuary');
    expect(content).toContain('CANONICAL ARTIFACT');

    // Verify Workspace Draft
    expect(content).toContain('WORKSPACE DRAFT');

    // Verify Archival Archetype & Ad-Lib
    expect(content).toContain('Sub-Level 4 Containment');
    expect(content).toContain('Ad-Lib Induction');
  });

  it('binds Black Iron Mortuary to Engine when SCRY is clicked from shelf', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const scryButton = container?.querySelector('#shelf-launch-black-iron-btn') as HTMLButtonElement;
    expect(scryButton).toBeTruthy();

    // Click the SCRY button on Black Iron Mortuary
    await act(async () => {
      scryButton.click();
    });

    expect(useAppStore.getState().phase).toBe('engine');
    const engineBlueprint = useEngineStore.getState().activeBlueprint;
    expect(engineBlueprint).toBeTruthy();
    expect(engineBlueprint?.title).toContain('Black Iron Mortuary');
  });

  it('renders Austin Osman Spare automatic drawing linework extending into the screen margins', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const svgs = container?.querySelectorAll('svg');
    expect(svgs?.length).toBeGreaterThan(2);

    // Check for Austin Osman Spare sigil elements
    const svgPaths = container?.querySelectorAll('svg path');
    expect(svgPaths?.length).toBeGreaterThan(0);
    const content = container?.innerHTML || '';
    expect(content).toContain('vector-effect="non-scaling-stroke"');
  });

  it('obeys the Prohibited Placeholder Guard policy (no forbidden surnames in output)', async () => {
    await act(async () => {
      root?.render(<WelcomeScreen />);
    });

    const text = container?.textContent || '';
    expect(text).not.toMatch(/\bV[a]nce\b/i);
    expect(text).not.toMatch(/\bT[h]orne\b/i);
    expect(text).not.toContain('placeholder-1');
  });
});
