import React, { useMemo, useState } from 'react';
import { Flame, EyeOff, Sparkles, Footprints } from 'lucide-react';

export interface MapSketchNode {
  id: string;
  label: string;
  description?: string;
}

export type MapSketchConnection =
  | { from: string; to: string; label?: string }
  | [string, string];

export interface MapSketchProps {
  currentNodeId?: string | null;
  nodeDefinitions?: MapSketchNode[];
  connections?: MapSketchConnection[];
  visitedNodeIds?: Set<string> | string[];
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

interface NormalizedConnection {
  from: string;
  to: string;
  label?: string;
  id: string;
}

interface NodePosition {
  x: number;
  y: number;
}

/**
 * Normalizes connection formats into a standard structure.
 */
function normalizeConnections(connections?: MapSketchConnection[]): NormalizedConnection[] {
  if (!connections || !Array.isArray(connections)) return [];

  const result: NormalizedConnection[] = [];
  connections.forEach((conn, idx) => {
    if (Array.isArray(conn)) {
      const [from, to] = conn;
      if (from && to) {
        result.push({ from, to, id: `${from}->${to}#${idx}` });
      }
    } else if (conn && typeof conn === 'object' && conn.from && conn.to) {
      result.push({
        from: conn.from,
        to: conn.to,
        label: conn.label,
        id: `${conn.from}->${conn.to}#${idx}`,
      });
    }
  });
  return result;
}

/**
 * Deterministic organic layout generator for the Austin Osman Spare scrying parchment.
 * Uses bounded spring relaxation seeded deterministically so the map never jumps.
 * Expanded to 840x560 viewBox for the 1440p Ultrawide layout.
 */
function computeDeterministicLayout(
  nodes: MapSketchNode[],
  connections: NormalizedConnection[],
  width = 840,
  height = 560,
  padding = 95
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const count = nodes.length;
  if (count === 0) return positions;

  const centerX = width / 2;
  const centerY = height / 2;

  if (count === 1) {
    positions.set(nodes[0].id, { x: centerX, y: centerY });
    return positions;
  }

  // 1. Initial deterministic placement along an ellipse scaled for 840x560
  const rx = Math.min(300, (width - padding * 2) / 2);
  const ry = Math.min(190, (height - padding * 2) / 2);

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.set(node.id, {
      x: centerX + rx * Math.cos(angle),
      y: centerY + ry * Math.sin(angle),
    });
  });

  // 2. 45 iterations of deterministic spring-relaxation
  const posArray = nodes.map((n) => ({
    id: n.id,
    x: positions.get(n.id)!.x,
    y: positions.get(n.id)!.y,
  }));

  const nodeIndexMap = new Map<string, number>();
  posArray.forEach((p, idx) => nodeIndexMap.set(p.id, idx));

  for (let iter = 0; iter < 45; iter++) {
    const fx = new Float32Array(count);
    const fy = new Float32Array(count);

    // Centering gravity
    for (let i = 0; i < count; i++) {
      fx[i] += (centerX - posArray[i].x) * 0.035;
      fy[i] += (centerY - posArray[i].y) * 0.035;
    }

    // Mutual repulsion (scaled for larger canvas)
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = posArray[i].x - posArray[j].x;
        const dy = posArray[i].y - posArray[j].y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);

        if (dist < 340) {
          const repulse = 6800 / distSq;
          const nx = (dx / dist) * repulse;
          const ny = (dy / dist) * repulse;
          fx[i] += nx;
          fy[i] += ny;
          fx[j] -= nx;
          fy[j] -= ny;
        }
      }
    }

    // Spring attraction along edges
    for (const edge of connections) {
      const u = nodeIndexMap.get(edge.from);
      const v = nodeIndexMap.get(edge.to);
      if (u === undefined || v === undefined || u === v) continue;

      const dx = posArray[v].x - posArray[u].x;
      const dy = posArray[v].y - posArray[u].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const targetLen = 175;
      const spring = (dist - targetLen) * 0.055;

      const nx = (dx / dist) * spring;
      const ny = (dy / dist) * spring;
      fx[u] += nx;
      fy[u] += ny;
      fx[v] -= nx;
      fy[v] -= ny;
    }

    // Apply forces with damping
    for (let i = 0; i < count; i++) {
      posArray[i].x += fx[i] * 0.55;
      posArray[i].y += fy[i] * 0.55;

      // Clamping inside parchment bounds
      posArray[i].x = Math.max(padding, Math.min(width - padding, posArray[i].x));
      posArray[i].y = Math.max(padding, Math.min(height - padding, posArray[i].y));
    }
  }

  posArray.forEach((p) => {
    positions.set(p.id, { x: Math.round(p.x), y: Math.round(p.y) });
  });

  return positions;
}

/**
 * Austin Osman Spare hand-drawn ink curved path generator.
 * Produces an organic calligraphic stroke bowing subtly between chambers.
 */
function createOrganicEdgePath(p1: NodePosition, p2: NodePosition, seed: number): string {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) + 0.001;

  // Perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;

  // Organic calligraphic bow
  const bow = ((seed % 19) - 9) * 2.2;
  const cx = Math.round(mx + px * bow);
  const cy = Math.round(my + py * bow);

  return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
}

export default function MapSketch({
  currentNodeId,
  nodeDefinitions,
  connections = [],
  visitedNodeIds,
  onSelectNode,
  className = '',
}: MapSketchProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 1. Normalize visited set
  const visitedSet = useMemo(() => {
    const s = new Set<string>();
    if (Array.isArray(visitedNodeIds)) {
      visitedNodeIds.forEach((id) => id && s.add(id));
    } else if (visitedNodeIds instanceof Set) {
      visitedNodeIds.forEach((id) => id && s.add(id));
    }
    if (currentNodeId) {
      s.add(currentNodeId);
    }
    return s;
  }, [visitedNodeIds, currentNodeId]);

  // 2. Normalize connections
  const normalizedConnections = useMemo(
    () => normalizeConnections(connections),
    [connections]
  );

  // 3. Build adjacency mapping (undirected topological adjacency)
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (nodeDefinitions) {
      nodeDefinitions.forEach((n) => map.set(n.id, new Set<string>()));
    }
    normalizedConnections.forEach((conn) => {
      if (!map.has(conn.from)) map.set(conn.from, new Set<string>());
      if (!map.has(conn.to)) map.set(conn.to, new Set<string>());
      map.get(conn.from)!.add(conn.to);
      map.get(conn.to)!.add(conn.from);
    });
    return map;
  }, [nodeDefinitions, normalizedConnections]);

  // 4. Calculate Fog of War discovery status for each node
  const nodeStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        isCurrent: boolean;
        isVisited: boolean;
        isAdjacent: boolean;
        isShrouded: boolean;
        isRevealed: boolean;
      }
    >();

    if (!nodeDefinitions) return map;

    nodeDefinitions.forEach((node) => {
      const isCurrent = currentNodeId === node.id;
      const isVisited = visitedSet.has(node.id) || isCurrent;
      const neighbors = adjacencyMap.get(node.id) || new Set<string>();
      const isAdjacent =
        !isVisited && Array.from(neighbors).some((neighborId) => visitedSet.has(neighborId));
      const isShrouded = !isVisited && !isAdjacent;
      const isRevealed = isVisited || isAdjacent;

      map.set(node.id, {
        isCurrent,
        isVisited,
        isAdjacent,
        isShrouded,
        isRevealed,
      });
    });

    return map;
  }, [nodeDefinitions, currentNodeId, visitedSet, adjacencyMap]);

  // 5. Layout positions on expanded 840x560 canvas
  const nodePositions = useMemo(() => {
    if (!nodeDefinitions || nodeDefinitions.length === 0) return new Map<string, NodePosition>();
    return computeDeterministicLayout(nodeDefinitions, normalizedConnections, 840, 560, 95);
  }, [nodeDefinitions, normalizedConnections]);

  // Handle empty or uninked state
  if (!nodeDefinitions || nodeDefinitions.length === 0) {
    return (
      <div
        data-testid="map-sketch-empty"
        className={`relative rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-6 text-zinc-300 font-mono shadow-2xl backdrop-blur select-none ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#d97706] shadow-[0_0_8px_#d97706]" />
            <h3 className="font-serif tracking-widest text-zinc-200 uppercase text-sm font-semibold">
              Map Sketch
            </h3>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Tabula Rasa
          </span>
        </div>

        {/* Clean atmospheric parchment placeholder */}
        <div className="py-14 px-4 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative w-16 h-16 rounded-full border border-zinc-800/90 flex items-center justify-center bg-black/40">
            {/* Occult sigil ring */}
            <div className="absolute inset-1 rounded-full border border-zinc-800/50 border-dashed" />
            <EyeOff className="w-6 h-6 text-zinc-600" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-zinc-300 font-serif italic text-base tracking-wide">
              Topological map uninked; awaiting exploration.
            </p>
            <p className="text-[11px] text-zinc-600 tracking-wider uppercase font-mono">
              Chambers and thresholds will be transcribed into charcoal as you advance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const revealedCount = Array.from(nodeStatusMap.values()).filter((s) => s.isRevealed).length;
  const totalCount = nodeDefinitions.length;
  const activeFocusId = selectedNodeId || currentNodeId || (nodeDefinitions[0]?.id ?? null);
  const activeFocusNode = nodeDefinitions.find((n) => n.id === activeFocusId);
  const activeFocusStatus = activeFocusId ? nodeStatusMap.get(activeFocusId) : null;

  return (
    <div
      data-testid="map-sketch-container"
      className={`relative rounded-lg border border-zinc-800/80 bg-zinc-950/80 text-zinc-300 font-mono shadow-2xl backdrop-blur select-none flex flex-col overflow-hidden ${className}`}
    >
      {/* Austin Osman Spare Cartographic Header */}
      <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between gap-4 bg-black/40">
        <div className="flex items-center gap-3">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-[#d97706] shadow-[0_0_8px_#d97706] animate-pulse"
            title="Candle flame indicator"
          />
          <div>
            <h3 className="font-serif tracking-widest text-zinc-100 uppercase text-sm font-semibold flex items-center gap-2">
              Map Sketch
            </h3>
            <div className="text-[10px] text-zinc-500 tracking-wider">
              Automatic ink scrying · Austin Osman Spare topology
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[10px] tracking-wider px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400">
            <span className="text-zinc-200 font-bold">{revealedCount}</span> / {totalCount} Chambers
            Inscribed
          </div>
        </div>
      </div>

      {/* Scrying Parchment SVG Canvas - Expanded 840x560 ViewBox for 1440p Ultrawide */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#0a0a0d] via-[#070709] to-[#040405] flex items-center justify-center p-2 sm:p-4">
        <svg
          viewBox="0 0 840 560"
          className="w-full h-auto max-h-[580px] touch-manipulation select-none"
          style={{ filter: 'contrast(105%)' }}
        >
          <defs>
            {/* Candle-amber expansive flame glow halo */}
            <radialGradient id="candleGlowExpansive" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.65" />
              <stop offset="45%" stopColor="#d97706" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#b45309" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
            </radialGradient>

            {/* Candle-amber core flame glow */}
            <radialGradient id="candleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#d97706" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#b45309" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Inscribed ink wash */}
            <radialGradient id="inkWash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#27272a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0.98" />
            </radialGradient>

            {/* Shrouded chamber veil */}
            <radialGradient id="shroudedVeil" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#18181b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0.98" />
            </radialGradient>

            {/* Sigil talisman pattern */}
            <pattern id="sigilGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 24 48 M 0 24 L 48 24"
                fill="none"
                stroke="rgba(255,255,255,0.02)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* Background subtle occult sigil grid */}
          <rect width="840" height="560" fill="url(#sigilGrid)" />

          {/* Austin Osman Spare corner talisman flourish */}
          <g
            transform="translate(55, 55)"
            stroke="#52525b"
            strokeWidth="1"
            fill="none"
            opacity="0.45"
          >
            <circle r="22" strokeDasharray="4 3" />
            <circle r="8" />
            <line x1="-30" y1="0" x2="30" y2="0" />
            <line x1="0" y1="-30" x2="0" y2="30" />
            <text
              x="0"
              y="-36"
              fill="#71717a"
              fontSize="10"
              textAnchor="middle"
              fontFamily="serif"
              fontStyle="italic"
            >
              N
            </text>
          </g>

          {/* Connections (Charcoal-drawn thickened ink strokes) */}
          <g id="map-sketch-connections">
            {normalizedConnections.map((conn, idx) => {
              const p1 = nodePositions.get(conn.from);
              const p2 = nodePositions.get(conn.to);
              if (!p1 || !p2) return null;

              const status1 = nodeStatusMap.get(conn.from);
              const status2 = nodeStatusMap.get(conn.to);

              const bothRevealed = status1?.isRevealed && status2?.isRevealed;
              const isCurrentEdge = status1?.isCurrent || status2?.isCurrent;
              const pathData = createOrganicEdgePath(p1, p2, idx * 17 + 7);

              let strokeColor = 'rgba(82, 82, 91, 0.45)';
              let strokeWidth = 2;
              let strokeDasharray = 'none';

              if (bothRevealed) {
                if (isCurrentEdge) {
                  strokeColor = 'rgba(217, 119, 6, 0.85)'; // Candle-amber corridor
                  strokeWidth = 3;
                  strokeDasharray = 'none';
                } else if (status1?.isVisited && status2?.isVisited) {
                  strokeColor = 'rgba(161, 161, 170, 0.7)'; // Deep ink stroke
                  strokeWidth = 2.5;
                } else {
                  strokeColor = 'rgba(113, 113, 122, 0.6)'; // Surveyed corridor
                  strokeDasharray = '5 4';
                  strokeWidth = 2;
                }
              } else {
                // Veiled passage vanishing into fog of war
                strokeColor = 'rgba(63, 63, 70, 0.35)';
                strokeDasharray = '3 5';
                strokeWidth = 1.5;
              }

              return (
                <g key={conn.id}>
                  {/* Subtle amber corridor underlay glow for active connection */}
                  {isCurrentEdge && bothRevealed && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="rgba(217, 119, 6, 0.2)"
                      strokeWidth={7}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Organic curved corridor */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                  />
                  {/* Optional connection label if revealed */}
                  {bothRevealed && conn.label && (
                    <text
                      x={(p1.x + p2.x) / 2}
                      y={(p1.y + p2.y) / 2 - 7}
                      fill="#a1a1aa"
                      fontSize="10"
                      fontFamily="serif"
                      fontStyle="italic"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Chamber Nodes (Interactive SVG Talismans) */}
          <g id="map-sketch-nodes">
            {nodeDefinitions.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;

              const status = nodeStatusMap.get(node.id);
              const isCurrent = Boolean(status?.isCurrent);
              const isVisited = Boolean(status?.isVisited);
              const isAdjacent = Boolean(status?.isAdjacent);
              const isShrouded = Boolean(status?.isShrouded);
              const isRevealed = Boolean(status?.isRevealed);
              const isFocused = activeFocusId === node.id;

              const displayName = isRevealed ? node.label : '???';

              return (
                <g
                  key={node.id}
                  data-testid={`map-node-${node.id}`}
                  data-current={isCurrent ? 'true' : 'false'}
                  data-revealed={isRevealed ? 'true' : 'false'}
                  data-shrouded={isShrouded ? 'true' : 'false'}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    onSelectNode?.(node.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNodeId(node.id);
                      onSelectNode?.(node.id);
                    }
                  }}
                  aria-label={isRevealed ? node.label : 'Shrouded Chamber'}
                >
                  {/* 1. Current Chamber Expansive Candle Flame Glow Halo */}
                  {isCurrent && (
                    <>
                      <circle
                        r="44"
                        fill="url(#candleGlowExpansive)"
                        className="animate-pulse"
                      />
                      <circle
                        r="34"
                        fill="url(#candleGlow)"
                        className="animate-pulse"
                        data-testid="current-chamber-indicator"
                      />
                    </>
                  )}

                  {/* 2. Focused chamber selection ring */}
                  {isFocused && !isCurrent && (
                    <circle
                      r="32"
                      fill="none"
                      stroke="#71717a"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.85"
                    />
                  )}

                  {/* 3. Base Talisman Chamber Ring (Enlarged r=22-24) */}
                  {isCurrent ? (
                    <>
                      <circle
                        r="24"
                        fill="#09090b"
                        stroke="#d97706"
                        strokeWidth="3"
                        className="transition-all duration-300"
                      />
                      <circle r="14" fill="#000000" stroke="#b45309" strokeWidth="1.5" />
                      {/* Candle flame jewel core */}
                      <circle r="5" fill="#f59e0b" className="animate-pulse" />
                    </>
                  ) : isVisited ? (
                    <>
                      <circle
                        r="23"
                        fill="url(#inkWash)"
                        stroke="#d4d4d8"
                        strokeWidth="2.4"
                        className="transition-all duration-300 group-hover:stroke-zinc-100"
                      />
                      <circle r="13" fill="none" stroke="#52525b" strokeWidth="1.2" />
                      {/* Talisman center point */}
                      <circle r="3.5" fill="#f4f4f5" />
                    </>
                  ) : isAdjacent ? (
                    <>
                      <circle
                        r="22"
                        fill="#09090b"
                        stroke="#a1a1aa"
                        strokeWidth="2"
                        strokeDasharray="5 3"
                        className="transition-all duration-300 group-hover:stroke-zinc-200"
                      />
                      {/* Surveyed threshold marker */}
                      <circle r="3" fill="#a1a1aa" />
                    </>
                  ) : (
                    <>
                      {/* Shrouded Chamber (Austin Osman Spare veiled sigil) */}
                      <circle
                        r="20"
                        fill="url(#shroudedVeil)"
                        stroke="#52525b"
                        strokeWidth="1.8"
                        strokeDasharray="3 4"
                        className="transition-all duration-300 group-hover:stroke-zinc-400"
                      />
                      <path
                        d="M -7 -7 L 7 7 M -7 7 L 7 -7"
                        stroke="#52525b"
                        strokeWidth="1.4"
                        opacity="0.75"
                      />
                    </>
                  )}

                  {/* Chamber Readable Calligraphic Text Label or Veil */}
                  <g transform="translate(0, 36)">
                    <text
                      data-testid={`node-label-${node.id}`}
                      textAnchor="middle"
                      fontSize={isCurrent ? '13' : '12'}
                      fontWeight={isCurrent ? '700' : '600'}
                      fontFamily="serif"
                      letterSpacing="0.05em"
                      fill={
                        isCurrent
                          ? '#f59e0b'
                          : isVisited
                          ? '#f4f4f5'
                          : isAdjacent
                          ? '#d4d4d8'
                          : '#71717a'
                      }
                      className="select-none transition-colors"
                    >
                      {displayName}
                    </text>

                    {/* Sub-label for Current, Surveyed, or Shrouded status */}
                    {isCurrent && (
                      <text
                        textAnchor="middle"
                        y="15"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fill="#d97706"
                        letterSpacing="0.09em"
                      >
                        [CURRENT]
                      </text>
                    )}
                    {isAdjacent && (
                      <text
                        textAnchor="middle"
                        y="15"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fill="#a1a1aa"
                        letterSpacing="0.09em"
                      >
                        [SURVEYED]
                      </text>
                    )}
                    {isShrouded && (
                      <text
                        data-testid="shrouded-chamber"
                        textAnchor="middle"
                        y="15"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fill="#52525b"
                        letterSpacing="0.09em"
                      >
                        [VEILED]
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend / Scrying Key Bar */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded border border-zinc-800/80 flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706] shadow-[0_0_8px_#d97706]" />
            <span className="text-amber-400 font-semibold">Candle Flame (Current)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
            <span className="text-zinc-200">Inscribed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-zinc-400 border-dashed" />
            <span className="text-zinc-300">Surveyed Threshold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700" />
            <span className="text-zinc-500">Veiled (???)</span>
          </div>
        </div>
      </div>

      {/* Selected Chamber Inscription Panel (No 9-cell button grid) */}
      {activeFocusNode && activeFocusStatus && (
        <div
          data-testid="chamber-inspection-panel"
          className={`p-4 border-t border-zinc-800/80 text-xs transition-colors ${
            activeFocusStatus.isCurrent
              ? 'bg-amber-950/20 text-amber-200'
              : activeFocusStatus.isVisited
              ? 'bg-zinc-950/90 text-zinc-300'
              : activeFocusStatus.isAdjacent
              ? 'bg-zinc-950/70 text-zinc-400'
              : 'bg-black/60 text-zinc-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              {activeFocusStatus.isCurrent ? (
                <Flame className="w-4 h-4 text-[#d97706] animate-pulse shrink-0" />
              ) : activeFocusStatus.isVisited ? (
                <Footprints className="w-4 h-4 text-zinc-400 shrink-0" />
              ) : activeFocusStatus.isAdjacent ? (
                <Sparkles className="w-4 h-4 text-zinc-500 shrink-0" />
              ) : (
                <EyeOff className="w-4 h-4 text-zinc-600 shrink-0" />
              )}
              <span className="font-serif font-bold text-sm tracking-wide text-zinc-100">
                {activeFocusStatus.isRevealed ? activeFocusNode.label : 'Veiled Chamber (???)'}
              </span>
            </div>
            <span
              className={`text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded font-mono ${
                activeFocusStatus.isCurrent
                  ? 'bg-amber-900/60 border border-amber-700 text-amber-300'
                  : activeFocusStatus.isVisited
                  ? 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                  : activeFocusStatus.isAdjacent
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                  : 'bg-black border border-zinc-900 text-zinc-600'
              }`}
            >
              {activeFocusStatus.isCurrent
                ? 'Current Chamber'
                : activeFocusStatus.isVisited
                ? 'Inscribed'
                : activeFocusStatus.isAdjacent
                ? 'Surveyed'
                : 'Shrouded'}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400 font-sans pl-6">
            {activeFocusStatus.isRevealed
              ? activeFocusNode.description || 'No specific architectural inscriptions recorded.'
              : 'Veiled in charcoal shadow; path yet unrevealed.'}
          </p>
        </div>
      )}
    </div>
  );
}
