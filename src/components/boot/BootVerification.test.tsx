import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import App from '../../App';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';

describe('Blocker W1 Boot and Render Verification', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    container = null;
    root = null;
  });

  it('renders visible Hub/Welcome screen on initial boot into #root', async () => {
    useAppStore.setState({ phase: 'HUB' });

    await act(async () => {
      root?.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
    });

    expect(container?.childElementCount).toBeGreaterThan(0);
    expect(container?.textContent).toContain('NIGHTMARE MACHINE');
    expect(container?.textContent).toContain('The Voice');
    expect(container?.textContent).toContain('The Forge');
    expect(container?.textContent).toContain('The Engine');
  });

  it('renders the intentional [ CRITICAL UI FAILURE ] boundary when a child throws', async () => {
    const CrashingComponent = () => {
      throw new Error('Simulated boot detonation');
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      root?.render(
        <ErrorBoundary>
          <CrashingComponent />
        </ErrorBoundary>
      );
    });

    expect(container?.textContent).toContain('[ CRITICAL UI FAILURE ]');
    expect(container?.textContent).toContain('Simulated boot detonation');

    spy.mockRestore();
  });

  it('renders Engine view correctly when phase is set to ENGINE', async () => {
    useAppStore.setState({ phase: 'ENGINE' });
    useEngineStore.setState({ activeBlueprint: null, gameState: null });

    await act(async () => {
      root?.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
    });

    expect(container?.childElementCount).toBeGreaterThan(0);
    expect(container?.textContent).toContain('Haunted House');
    expect(container?.textContent).toContain('Observe');
    expect(container?.textContent).toContain('Autopilot');
  });
});
