import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SpatialManager } from './SpatialManager';
import { forgeActions, useForgeStore } from '../../store/useForgeStore';

describe('SpatialManager Component', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useForgeStore.setState({
      draftBlueprint: {
        id: 'draft-spatial-test',
        title: 'Deep Research Enclosure',
        premise: 'Atmospheric research laboratory under permafrost.',
        globalPremise: 'Atmospheric research laboratory under permafrost.',
        setting: { location: 'Subglacial Outpost', atmosphere: 'Frozen', timePeriod: '1982' },
        startingVector: 'SOMATIC',
        startingTier: 'GATEWAY',
        cast: [
          {
            id: 'char-tech',
            name: 'Specialist Miller',
            role: 'Technician',
            isUserCharacter: true,
            isEntity: false,
            presenceDisposition: { kind: 'AT_NODE', nodeId: 'STATION_ENTRY' },
          },
          {
            id: 'char-specter',
            name: 'The Frost Echo',
            role: 'Entity',
            isUserCharacter: false,
            isEntity: true,
            presenceDisposition: { kind: 'NONLOCAL' },
          },
        ],
        topology: {
          startingNodeId: 'STATION_ENTRY',
          nodes: ['STATION_ENTRY', 'GLACIAL_LAB'],
          nodeDefinitions: [
            {
              id: 'STATION_ENTRY',
              label: 'Station Entryway',
              description: 'Heavy pneumatic blast doors crusted in ice.',
            },
            {
              id: 'GLACIAL_LAB',
              label: 'Glacial Laboratory',
              description: 'Cryogenic core extraction instruments.',
            },
          ],
          connections: [
            {
              from: 'STATION_ENTRY',
              to: 'GLACIAL_LAB',
              kind: 'PHYSICAL',
              userInitiated: true,
            },
          ],
          anchors: [
            {
              id: 'ice-chasm',
              parentNodeId: 'GLACIAL_LAB',
              label: 'Ice Chasm Abyss',
              description: 'Fissure descending into deep ice.',
              statement: 'Not a runtime node yet',
            },
          ],
        },
      },
    });
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

  it('renders nodes, starting node badge, directed exits, and expandable anchors', async () => {
    await act(async () => {
      root?.render(<SpatialManager />);
    });

    expect(container?.textContent).toContain('Story Map & Opening Placement');
    expect(container?.textContent).toContain('Station Entryway');
    expect(container?.textContent).toContain('Glacial Laboratory');
    expect(container?.textContent).toContain('START');
    expect(container?.textContent).toContain('Specialist Miller');
    expect(container?.textContent).toContain('Secondary Anchors (1):');
    expect(container?.textContent).toContain('Ice Chasm Abyss');
  });

  it('allows switching to Textual Editor tab and updates starting node', async () => {
    await act(async () => {
      root?.render(<SpatialManager />);
    });

    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const textualTabBtn = buttons.find((b) => b.textContent?.includes('Textual Editor'));
    expect(textualTabBtn).toBeDefined();

    await act(async () => {
      textualTabBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container?.textContent).toContain('Authored Map Nodes (2)');
    expect(container?.textContent).toContain('Directed Connections (1)');

    const setStartBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Set Start')
    );
    expect(setStartBtn).toBeDefined();

    await act(async () => {
      setStartBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const draft = useForgeStore.getState().draftBlueprint;
    expect(draft?.topology?.startingNodeId).toBe('GLACIAL_LAB');
  });

  it('allows updating cast placement disposition', async () => {
    await act(async () => {
      root?.render(<SpatialManager />);
    });

    // Update Frost Echo from NONLOCAL to OFFSTAGE
    act(() => {
      forgeActions.updateDraft({
        cast: [
          {
            id: 'char-tech',
            name: 'Specialist Miller',
            role: 'Technician',
            isUserCharacter: true,
            presenceDisposition: { kind: 'AT_NODE', nodeId: 'STATION_ENTRY' },
          },
          {
            id: 'char-specter',
            name: 'The Frost Echo',
            role: 'Entity',
            isUserCharacter: false,
            isEntity: true,
            presenceDisposition: { kind: 'OFFSTAGE' },
          },
        ],
      });
    });

    const updatedDraft = useForgeStore.getState().draftBlueprint;
    expect(updatedDraft?.cast?.[1].presenceDisposition).toEqual({ kind: 'OFFSTAGE' });
  });
});
