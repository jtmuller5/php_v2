"use client";

import { getSubregionColor } from "@/lib/utils/subregion-colors";

interface SubregionFlowDiagramProps {
  subregionConnections: Map<string, number>;
  subregionNeuronCounts: Map<string, number>;
  onSelectPair: (source: string, target: string) => void;
}

// Fixed anatomical layout positions for the 6 subregions
// Arranged to reflect the hippocampal circuit: EC → DG → CA3 → CA2 → CA1 → Sub → EC
const LAYOUT: Record<string, { x: number; y: number }> = {
  EC: { x: 120, y: 80 },
  DG: { x: 350, y: 80 },
  CA3: { x: 550, y: 80 },
  CA2: { x: 550, y: 260 },
  CA1: { x: 350, y: 260 },
  Sub: { x: 120, y: 260 },
};

const SVG_WIDTH = 680;
const SVG_HEIGHT = 340;

export function SubregionFlowDiagram({
  subregionConnections,
  subregionNeuronCounts,
  onSelectPair,
}: SubregionFlowDiagramProps) {
  const maxCount = Math.max(...subregionNeuronCounts.values(), 1);
  const maxConn = Math.max(...subregionConnections.values(), 1);

  // Collect all edges
  const edges: {
    source: string;
    target: string;
    count: number;
  }[] = [];
  subregionConnections.forEach((count, key) => {
    const [source, target] = key.split("-");
    edges.push({ source, target, count });
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-4 text-sm text-gray-500">
        Click an arrow to see all neuron-type connections between two subregions.
        Node size reflects neuron type count, arrow thickness reflects connection count.
      </p>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="mx-auto w-full max-w-2xl"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const from = LAYOUT[edge.source];
          const to = LAYOUT[edge.target];
          if (!from || !to) return null;

          const thickness = Math.max(1, (edge.count / maxConn) * 8);

          // Offset line to not overlap with reverse direction
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const perpX = (-dy / len) * 6;
          const perpY = (dx / len) * 6;

          // Shorten to avoid overlapping nodes
          const nodeRadius =
            20 +
            ((subregionNeuronCounts.get(edge.target) ?? 1) / maxCount) * 15;
          const shortenFactor = (len - nodeRadius - 10) / len;

          const x1 = from.x + perpX + (dx * 0.15);
          const y1 = from.y + perpY + (dy * 0.15);
          const x2 = from.x + perpX + dx * shortenFactor;
          const y2 = from.y + perpY + dy * shortenFactor;

          return (
            <g
              key={`${edge.source}-${edge.target}`}
              className="cursor-pointer"
              onClick={() => onSelectPair(edge.source, edge.target)}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#d1d5db"
                strokeWidth={thickness}
                markerEnd="url(#arrowhead)"
                className="transition-colors hover:stroke-blue-400"
              />
              {/* Edge label */}
              <text
                x={(x1 + x2) / 2 + perpX * 0.8}
                y={(y1 + y2) / 2 + perpY * 0.8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-400 text-[10px] font-medium pointer-events-none"
              >
                {edge.count}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {Object.entries(LAYOUT).map(([region, pos]) => {
          const count = subregionNeuronCounts.get(region) ?? 0;
          const radius = 20 + (count / maxCount) * 15;
          const color = getSubregionColor(region);

          return (
            <g
              key={region}
              className="cursor-pointer"
              onClick={() => onSelectPair(region, region)}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={color.hex}
                opacity={0.2}
                stroke={color.hex}
                strokeWidth={2}
                className="transition-opacity hover:opacity-40"
              />
              <text
                x={pos.x}
                y={pos.y - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-800 text-sm font-bold pointer-events-none"
              >
                {region}
              </text>
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-500 text-[10px] pointer-events-none"
              >
                {count} types
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
