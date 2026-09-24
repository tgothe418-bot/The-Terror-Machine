import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Forge from './Forge';
import { useForgeStoreInternal, forgeActions } from '../../store/useForgeStore';
import { useAppStore } from '../../store/useAppStore';

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Forge Ultrawide Studio Component (3440x1440 Staging)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    vi.restoreAllMocks();
    vi.spyOn(useForgeStoreInternal.persist, 'hasHydrated').mockReturnValue(true);
    vi.spyOn(useForgeStoreInternal.persist, 'onHydrate').mockImplementation(() => () => {});
    vi.spyOn(useForgeStoreInternal.persist, 'onFinishHydration').mockImplementation((cb) => {
      cb(useForgeStoreInternal.getState());
      return () => {};
    });
    forgeActions.resetStore();
    useAppStore.setState({ phase: 'FORGE' });

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

  it('renders the balanced 3-column ultrawide studio layout with all three sectors', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const text = container?.textContent || '';

    // Verify Sector I: Source Baseline & Extraction Contract (25-28%)
    expect(text).toContain('[ SECTOR I // SOURCE BASELINE & EXTRACTION CONTRACT ]');

    // Verify Sector II: Blueprint Editor & Setting Chorography (42-45%)
    expect(text).toContain('[ SECTOR II // BLUEPRINT ARCHITECTURE & CHOROGRAPHY ]');

    // Verify Sector III: Cast Dossiers & Architect Advisory (28-30%)
    expect(text).toContain('[ SECTOR III // CAST DOSSIERS & ARCHITECT ADVISORY ]');

    // Verify presence of 3-column grid structure
    const gridElement = container?.querySelector('div[class*="grid-cols-[27fr_44fr_29fr]"]');
    expect(gridElement).toBeTruthy();
  });

  it('renders comfortable inputs for Scenario Title, Starting Location, Atmosphere, and Time Period', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const inputs = container?.querySelectorAll('input');
    const titleInput = Array.from(inputs || []).find((i) =>
      i.getAttribute('placeholder')?.includes('Sub-Level 4 Containment')
    ) as HTMLInputElement;
    const locationInput = Array.from(inputs || []).find((i) =>
      i.getAttribute('placeholder')?.includes('Observation Room Delta')
    ) as HTMLInputElement;
    const atmosphereInput = Array.from(inputs || []).find((i) =>
      i.getAttribute('placeholder')?.includes('Sub-zero chill')
    ) as HTMLInputElement;
    const timePeriodInput = Array.from(inputs || []).find((i) =>
      i.getAttribute('placeholder')?.includes('Isolated Deep Research Complex')
    ) as HTMLInputElement;

    expect(titleInput).toBeTruthy();
    expect(locationInput).toBeTruthy();
    expect(atmosphereInput).toBeTruthy();
    expect(timePeriodInput).toBeTruthy();

    // Verify input heights (h-11 or 2xl:h-12 comfortable typography)
    expect(titleInput.className).toContain('h-11');
    expect(locationInput.className).toContain('h-11');

    // Test typing into Title
    await act(async () => {
      setNativeValue(titleInput, 'Hadal Trench Station');
    });

    expect(useForgeStoreInternal.getState().draftBlueprint?.title).toBe('Hadal Trench Station');
  });

  it('allows editing World Rules and Scenario Premise in the Center Column', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const textareas = container?.querySelectorAll('textarea');
    expect(textareas?.length).toBeGreaterThanOrEqual(2);

    const rulesArea = Array.from(textareas || []).find((t) =>
      t.getAttribute('placeholder')?.includes('Define the rules this world must obey')
    ) as HTMLTextAreaElement;
    const premiseArea = Array.from(textareas || []).find((t) =>
      t.getAttribute('placeholder')?.includes('Calibrate primary narrative trajectories')
    ) as HTMLTextAreaElement;

    expect(rulesArea).toBeTruthy();
    expect(premiseArea).toBeTruthy();

    await act(async () => {
      setNativeValue(rulesArea, 'No radio signals penetrate beyond depth 900m.');
    });

    expect(useForgeStoreInternal.getState().draftBlueprint?.environmentalRules).toBe(
      'No radio signals penetrate beyond depth 900m.'
    );
  });

  it('switches between Blueprint Studio and Campaign Topology tabs', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const buttons = container?.querySelectorAll('button');
    const campaignTab = Array.from(buttons || []).find((b) =>
      b.textContent?.includes('Campaign Topology')
    );
    expect(campaignTab).toBeTruthy();

    await act(async () => {
      campaignTab?.click();
    });

    // Content should show Campaign panel or active campaign view
    const text = container?.textContent || '';
    expect(text).not.toContain('[ SECTOR II // BLUEPRINT ARCHITECTURE & CHOROGRAPHY ]');

    const blueprintTab = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Blueprint Studio')
    );
    await act(async () => {
      blueprintTab?.click();
    });

    const restoredText = container?.textContent || '';
    expect(restoredText).toContain('[ SECTOR II // BLUEPRINT ARCHITECTURE & CHOROGRAPHY ]');
  });

  it('contains the export review button with revision counter', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const exportBtn = container?.querySelector('#forge-open-export-review-btn');
    expect(exportBtn).toBeTruthy();
    expect(exportBtn?.textContent).toContain('REVIEW & EXPORT BLUEPRINT');
    expect(exportBtn?.textContent).toContain('Rev #1');
  });

  it('renders Austin Osman Spare automatic drawing linework in screen margins', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const svgs = container?.querySelectorAll('svg');
    expect(svgs?.length).toBeGreaterThanOrEqual(2);
    const html = container?.innerHTML || '';
    expect(html).toContain('vector-effect="non-scaling-stroke"');
  });

  it('strictly obeys the Prohibited Placeholder Guard policy', async () => {
    await act(async () => {
      root?.render(<Forge />);
    });

    const text = container?.textContent || '';
    expect(text).not.toMatch(/\bV[a]nce\b/i);
    expect(text).not.toMatch(/\bT[h]orne\b/i);
    expect(text).not.toContain('placeholder-1');
  });
});
