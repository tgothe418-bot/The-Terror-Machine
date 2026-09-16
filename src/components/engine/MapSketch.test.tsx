import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MapSketch, { MapSketchNode, MapSketchConnection } from './MapSketch';

describe('MapSketch Component (Austin Osman Spare Topological Scrying)', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
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

  const mockChambers: MapSketchNode[] = [
    {
      id: 'crypt-threshold',
      label: 'Crypt Threshold',
      description: 'The cold iron archway dripping with condensation.',
    },
    {
      id: 'sunken-nave',
      label: 'Sunken Nave',
      description: 'Fallen columns submerged under black stagnant water.',
    },
    {
      id: 'ossuary-archives',
      label: 'Ossuary Archives',
      description: 'Chamber lined with labeled skulls and decaying parchment.',
    },
    {
      id: 'forbidden-sanctum',
      label: 'Forbidden Sanctum',
      description: 'The innermost consecrated chamber behind heavy chains.',
    },
    {
      id: 'abyssal-well',
      label: 'Abyssal Well',
      description: 'A bottomless shaft whispering in ancient forgotten dialects.',
    },
  ];

  // Topology:
  // crypt-threshold <-> sunken-nave <-> ossuary-archives <-> forbidden-sanctum <-> abyssal-well
  const mockConnections: MapSketchConnection[] = [
    { from: 'crypt-threshold', to: 'sunken-nave', label: 'Flooded Stairs' },
    { from: 'sunken-nave', to: 'ossuary-archives', label: 'Iron Grate' },
    { from: 'ossuary-archives', to: 'forbidden-sanctum', label: 'Chained Portal' },
    { from: 'forbidden-sanctum', to: 'abyssal-well', label: 'Fractured Arch' },
  ];

  it('renders atmospheric parchment placeholder when no topology definitions exist', () => {
    act(() => {
      root?.render(<MapSketch nodeDefinitions={[]} />);
    });

    expect(container?.textContent).toContain('Map Sketch');
    expect(container?.textContent).toContain('Topological map uninked; awaiting exploration.');
    expect(container?.querySelector('[data-testid="map-sketch-empty"]')).not.toBeNull();
  });

  it('renders atmospheric parchment placeholder when nodeDefinitions is undefined', () => {
    act(() => {
      root?.render(<MapSketch />);
    });

    expect(container?.textContent).toContain('Map Sketch');
    expect(container?.textContent).toContain('Topological map uninked; awaiting exploration.');
  });

  it('displays header labeled simply "Map Sketch"', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    const header = container?.querySelector('h3');
    expect(header?.textContent).toBe('Map Sketch');
  });

  it('expands SVG viewBox to 840x560 for 1440p Ultrawide layout', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    const svg = container?.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 840 560');
  });

  it('renders enlarged talisman rings (r=22-24) and calligraphic text labels', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    // Current node talisman has enlarged r=24 ring
    const currentNode = container?.querySelector('[data-testid="map-node-crypt-threshold"]');
    const ring24 = currentNode?.querySelector('circle[r="24"]');
    expect(ring24).not.toBeNull();

    // Adjacent node talisman has enlarged r=22 ring
    const adjacentNode = container?.querySelector('[data-testid="map-node-sunken-nave"]');
    const ring22 = adjacentNode?.querySelector('circle[r="22"]');
    expect(ring22).not.toBeNull();

    // Calligraphic label font size enlarged to 13 for current node
    const currentLabel = currentNode?.querySelector('[data-testid="node-label-crypt-threshold"]');
    expect(currentLabel?.getAttribute('font-size')).toBe('13');

    // Calligraphic label font size enlarged to 12 for non-current node
    const adjacentLabel = adjacentNode?.querySelector('[data-testid="node-label-sunken-nave"]');
    expect(adjacentLabel?.getAttribute('font-size')).toBe('12');
  });

  it('reveals visited nodes with their readable labels', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    // Visited node should be fully displayed
    expect(container?.textContent).toContain('Crypt Threshold');
  });

  it('reveals adjacent nodes connected to visited nodes with their readable labels', () => {
    // crypt-threshold is visited, so sunken-nave (directly connected) is adjacent
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    // sunken-nave is adjacent to crypt-threshold
    expect(container?.textContent).toContain('Sunken Nave');
  });

  it('shrouds distant unvisited nodes with ??? and hides their real labels', () => {
    // Only crypt-threshold is visited
    // Adjacent: sunken-nave
    // Distant: ossuary-archives, forbidden-sanctum, abyssal-well
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    // Distant nodes must NOT show their labels
    expect(container?.textContent).not.toContain('Ossuary Archives');
    expect(container?.textContent).not.toContain('Forbidden Sanctum');
    expect(container?.textContent).not.toContain('Abyssal Well');

    // Should contain shrouded placeholders "???"
    expect(container?.textContent).toContain('???');

    // Shrouded node elements should have data-shrouded="true"
    const ossuaryNode = container?.querySelector('[data-testid="map-node-ossuary-archives"]');
    expect(ossuaryNode?.getAttribute('data-shrouded')).toBe('true');
    expect(ossuaryNode?.getAttribute('data-revealed')).toBe('false');

    const sanctumNode = container?.querySelector('[data-testid="map-node-forbidden-sanctum"]');
    expect(sanctumNode?.getAttribute('data-shrouded')).toBe('true');
  });

  it('highlights the current node with expansive candle-amber glowing pulse and active attributes', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold', 'sunken-nave']}
          currentNodeId="sunken-nave"
        />
      );
    });

    const currentNode = container?.querySelector('[data-testid="map-node-sunken-nave"]');
    expect(currentNode).not.toBeNull();
    expect(currentNode?.getAttribute('data-current')).toBe('true');

    // Indicator with expansive candle-amber highlight
    const indicator = currentNode?.querySelector('[data-testid="current-chamber-indicator"]');
    expect(indicator).not.toBeNull();
    expect(indicator?.getAttribute('fill')).toBe('url(#candleGlow)');

    // Check for [CURRENT] sublabel
    expect(currentNode?.textContent).toContain('[CURRENT]');

    // Other visited node should not have data-current="true"
    const previousNode = container?.querySelector('[data-testid="map-node-crypt-threshold"]');
    expect(previousNode?.getAttribute('data-current')).toBe('false');
  });

  it('progressively reveals nodes as player advances deeper into the topology', () => {
    // Player moves to sunken-nave and visits ossuary-archives
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold', 'sunken-nave', 'ossuary-archives']}
          currentNodeId="ossuary-archives"
        />
      );
    });

    // Now ossuary-archives is visited
    expect(container?.textContent).toContain('Ossuary Archives');

    // forbidden-sanctum is now adjacent to ossuary-archives, so it is revealed!
    expect(container?.textContent).toContain('Forbidden Sanctum');

    // abyssal-well is still distant (only connected to forbidden-sanctum, which is adjacent not visited)
    expect(container?.textContent).not.toContain('Abyssal Well');
  });

  it('triggers onSelectNode callback when SVG chamber nodes are clicked', () => {
    const onSelectNode = vi.fn();

    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
          onSelectNode={onSelectNode}
        />
      );
    });

    // Click SVG node directly (no redundant button grid needed)
    const nodeElem = container?.querySelector(
      '[data-testid="map-node-crypt-threshold"]'
    ) as SVGElement;
    expect(nodeElem).not.toBeNull();

    act(() => {
      nodeElem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectNode).toHaveBeenCalledWith('crypt-threshold');

    // Click another SVG node directly
    const sunkenNode = container?.querySelector(
      '[data-testid="map-node-sunken-nave"]'
    ) as SVGElement;
    expect(sunkenNode).not.toBeNull();

    act(() => {
      sunkenNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectNode).toHaveBeenCalledWith('sunken-nave');
  });

  it('supports keyboard navigation and selection on SVG chamber nodes (Enter and Space)', () => {
    const onSelectNode = vi.fn();

    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
          onSelectNode={onSelectNode}
        />
      );
    });

    const sunkenNode = container?.querySelector(
      '[data-testid="map-node-sunken-nave"]'
    ) as SVGElement;
    expect(sunkenNode.getAttribute('role')).toBe('button');
    expect(sunkenNode.getAttribute('tabindex')).toBe('0');

    act(() => {
      sunkenNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSelectNode).toHaveBeenCalledWith('sunken-nave');

    act(() => {
      sunkenNode.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(onSelectNode).toHaveBeenCalledTimes(2);
  });

  it('removes the redundant chamber ledger button grid from the bottom of the component', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    // The 9-cell button grid of chamber-card elements must be absent
    const chamberCards = container?.querySelectorAll('[data-testid^="chamber-card-"]');
    expect(chamberCards?.length).toBe(0);

    // Redundant "Chamber Ledger" header text must be absent
    expect(container?.textContent).not.toContain('Chamber Ledger');
  });

  it('updates the active chamber inspection panel when an SVG chamber node is selected', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    const inspectionPanel = container?.querySelector('[data-testid="chamber-inspection-panel"]');
    expect(inspectionPanel?.textContent).toContain('Crypt Threshold');
    expect(inspectionPanel?.textContent).toContain('The cold iron archway dripping with condensation.');

    // Select adjacent chamber directly on the SVG map
    const sunkenNode = container?.querySelector(
      '[data-testid="map-node-sunken-nave"]'
    ) as SVGElement;
    act(() => {
      sunkenNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(inspectionPanel?.textContent).toContain('Sunken Nave');
    expect(inspectionPanel?.textContent).toContain(
      'Fallen columns submerged under black stagnant water.'
    );
  });

  it('accepts connections defined as [from, to] string tuples', () => {
    const tupleConnections: [string, string][] = [
      ['crypt-threshold', 'sunken-nave'],
      ['sunken-nave', 'ossuary-archives'],
    ];

    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={tupleConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    // crypt-threshold is visited, sunken-nave is adjacent via tuple connection
    expect(container?.textContent).toContain('Sunken Nave');
    // ossuary-archives is distant
    expect(container?.textContent).not.toContain('Ossuary Archives');
  });

  it('accepts visitedNodeIds as a Set<string>', () => {
    const visitedSet = new Set(['crypt-threshold', 'sunken-nave']);

    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={visitedSet}
          currentNodeId="sunken-nave"
        />
      );
    });

    expect(container?.textContent).toContain('Crypt Threshold');
    expect(container?.textContent).toContain('Sunken Nave');
    expect(container?.textContent).toContain('Ossuary Archives'); // adjacent to sunken-nave
    expect(container?.textContent).not.toContain('Forbidden Sanctum'); // distant
  });

  it('obeys the Prohibited Placeholder Guard policy (no forbidden surnames in output)', () => {
    act(() => {
      root?.render(
        <MapSketch
          nodeDefinitions={mockChambers}
          connections={mockConnections}
          visitedNodeIds={['crypt-threshold']}
          currentNodeId="crypt-threshold"
        />
      );
    });

    const fullContent = container?.innerHTML || '';
    expect(fullContent).not.toMatch(/\bV[a]nce\b/i);
    expect(fullContent).not.toMatch(/\bT[h]orne\b/i);
  });
});
