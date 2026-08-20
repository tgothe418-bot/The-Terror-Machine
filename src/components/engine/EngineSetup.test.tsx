import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EngineSetup from './EngineSetup';
import { useEngineStore } from '../../core/store';
import { getForgeState, forgeActions } from '../../store/useForgeStore';
import { useAppStore } from '../../store/useAppStore';
import type { Blueprint } from '../../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: () => void }) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const testBlueprint: Blueprint = {
  title: 'Blackwood Manor',
  contentScale: 2,
  contentLevelDescription: 'Standard horror',
  globalPremise: 'A manor with hidden passages.',
  environmentalRules: 'The doors lock at midnight.',
  cast: [
    {
      id: 'char-alice',
      name: 'Alice Croft',
      role: 'Investigator',
      description: 'Senior archivist.',
      personality: 'Cautious',
      goals: 'Document anomalies',
      traits: ['Analytical'],
      isEntity: false,
    },
    {
      id: 'char-bob',
      name: 'Bob Sterling',
      role: 'Journalist',
      description: 'Field journalist seeking a story.',
      personality: 'Bold',
      goals: 'Get evidence',
      traits: ['Audacious'],
      isEntity: false,
    },
    {
      id: 'entity-wraith',
      name: 'Shadow Wraith',
      role: 'Haunt',
      description: 'Bound spirit of Blackwood.',
      personality: 'Predatory',
      goals: 'Trap intruders',
      traits: ['Incorporeal'],
      isEntity: true,
    },
  ],
  setting: {
    location: 'Blackwood Library',
    timePeriod: '1930s',
    atmosphere: 'Dense dust and creaking floorboards',
  },
  narrativeRules: {
    incitingIncident: 'The foyer door slammed shut.',
  },
  topology: {
    nodes: ['LIBRARY', 'HALLWAY'],
    connections: [],
  },
};

async function uploadBlueprint(container: HTMLElement, bp: Blueprint) {
  const file = new File([JSON.stringify(bp)], 'blueprint.json', {
    type: 'application/json',
  });
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  expect(fileInput).toBeTruthy();

  const originalFileReader = window.FileReader;
  class MockFileReader {
    onload: ((ev: ProgressEvent<FileReader> | { target: { result: string } }) => void) | null = null;
    readAsText() {
      if (this.onload) {
        this.onload({ target: { result: JSON.stringify(bp) } });
      }
    }
  }
  window.FileReader = MockFileReader as unknown as typeof FileReader;

  await act(async () => {
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  window.FileReader = originalFileReader;
}

describe('EngineSetup explicit cast binding', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    useEngineStore.getState().resetEngine();
    forgeActions.setActiveCharacterId(null);
    forgeActions.clearForgeInputs();
    useAppStore.getState().resetSession();

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

  it('renders selectable cast cards and allows selecting non-default mortal for protagonist', async () => {
    await act(async () => {
      root?.render(<EngineSetup />);
    });

    await uploadBlueprint(container!, testBlueprint);

    // Verify title is rendered
    expect(container!.textContent).toContain('Blackwood Manor');

    const buttons = Array.from(container!.querySelectorAll('button'));
    const aliceBtn = buttons.find((b) => b.textContent?.includes('Alice Croft')) as HTMLButtonElement;
    const bobBtn = buttons.find((b) => b.textContent?.includes('Bob Sterling')) as HTMLButtonElement;
    const wraithBtn = buttons.find((b) => b.textContent?.includes('Shadow Wraith')) as HTMLButtonElement;

    expect(aliceBtn).toBeTruthy();
    expect(bobBtn).toBeTruthy();
    expect(wraithBtn).toBeTruthy();

    expect(aliceBtn.disabled).toBe(false);
    expect(bobBtn.disabled).toBe(false);
    expect(wraithBtn.disabled).toBe(true); // Entity disabled for protagonist

    // Select Bob
    await act(async () => {
      bobBtn.click();
    });

    expect(getForgeState().activeCharacterId).toBe('char-bob');

    // Click start simulation
    const startBtn = buttons.find((b) => b.textContent?.includes('Initialize Neural Link')) as HTMLButtonElement;
    expect(startBtn).toBeTruthy();

    await act(async () => {
      startBtn.click();
    });

    const gameState = useEngineStore.getState().gameState;
    expect(gameState?.player_role).toBe('protagonist');
    expect(gameState?.player_character_id).toBe('char-bob');
    expect(gameState?.perspective_mode).toBe('embodied');
  });

  it('filters cast card eligibility when switching between roles', async () => {
    await act(async () => {
      root?.render(<EngineSetup />);
    });

    await uploadBlueprint(container!, testBlueprint);

    const buttons = Array.from(container!.querySelectorAll('button'));
    const antagonistRoleBtn = buttons.find((b) => b.textContent?.includes('Antagonist')) as HTMLButtonElement;
    expect(antagonistRoleBtn).toBeTruthy();

    await act(async () => {
      antagonistRoleBtn.click();
    });

    const refreshedButtons = Array.from(container!.querySelectorAll('button'));
    const aliceBtn = refreshedButtons.find((b) => b.textContent?.includes('Alice Croft')) as HTMLButtonElement;
    const wraithBtn = refreshedButtons.find((b) => b.textContent?.includes('Shadow Wraith')) as HTMLButtonElement;

    expect(aliceBtn.disabled).toBe(true);
    expect(wraithBtn.disabled).toBe(false);

    // Select wraith
    await act(async () => {
      wraithBtn.click();
    });
    expect(getForgeState().activeCharacterId).toBe('entity-wraith');

    // Switch to Director role
    const directorRoleBtn = refreshedButtons.find((b) => b.textContent?.includes('Director')) as HTMLButtonElement;
    await act(async () => {
      directorRoleBtn.click();
    });

    expect(getForgeState().activeCharacterId).toBeNull();
  });

  it('allows clicking an already selected cast member to toggle/clear selection', async () => {
    await act(async () => {
      root?.render(<EngineSetup />);
    });

    await uploadBlueprint(container!, testBlueprint);

    const buttons = Array.from(container!.querySelectorAll('button'));
    const bobBtn = buttons.find((b) => b.textContent?.includes('Bob Sterling')) as HTMLButtonElement;

    await act(async () => {
      bobBtn.click();
    });
    expect(getForgeState().activeCharacterId).toBe('char-bob');

    // Click again to toggle off
    await act(async () => {
      bobBtn.click();
    });
    expect(getForgeState().activeCharacterId).toBeNull();
  });
});
