"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSubregionColor } from "@/lib/utils/subregion-colors";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { ExplorerView } from "./ExplorerView";

interface Neuron {
  id: number;
  nickname: string;
  subregion_id: string;
  excit_inhib: string;
  position: number | null;
}

interface Connection {
  source_type_id: number;
  target_type_id: number;
  layers: string;
}

interface ConnectivityViewProps {
  neurons: Neuron[];
  connections: Connection[];
}

const SUBREGIONS = ["DG", "CA3", "CA2", "CA1", "Sub", "EC"];
const VIEWS = ["explorer", "matrix", "graph", "list"] as const;
type ViewMode = (typeof VIEWS)[number];

export function ConnectivityView({
  neurons,
  connections,
}: ConnectivityViewProps) {
  const [view, setView] = useState<ViewMode>("explorer");
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(SUBREGIONS)
  );
  const [search, setSearch] = useState("");

  const filteredNeurons = useMemo(() => {
    return neurons.filter((n) => {
      if (!selectedRegions.has(n.subregion_id)) return false;
      if (search && !n.nickname.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [neurons, selectedRegions, search]);

  const filteredNeuronIds = useMemo(
    () => new Set(filteredNeurons.map((n) => n.id)),
    [filteredNeurons]
  );

  const filteredConnections = useMemo(() => {
    return connections.filter(
      (c) =>
        filteredNeuronIds.has(c.source_type_id) &&
        filteredNeuronIds.has(c.target_type_id)
    );
  }, [connections, filteredNeuronIds]);

  function toggleRegion(region: string) {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Region filter */}
        <div className="flex gap-1">
          {SUBREGIONS.map((region) => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedRegions.has(region)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter neurons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />

        <span className="text-sm text-gray-400">
          {filteredConnections.length} connections
        </span>
      </div>

      {/* Views */}
      {view === "explorer" && (
        <ExplorerView
          neurons={filteredNeurons}
          connections={filteredConnections}
        />
      )}
      {view === "matrix" && (
        <MatrixView
          neurons={filteredNeurons}
          connections={filteredConnections}
        />
      )}
      {view === "graph" && (
        <GraphView
          neurons={filteredNeurons}
          connections={filteredConnections}
        />
      )}
      {view === "list" && (
        <ListView
          neurons={filteredNeurons}
          connections={filteredConnections}
        />
      )}
    </div>
  );
}

// ============================================================
// MATRIX VIEW
// ============================================================

function MatrixView({
  neurons,
  connections,
}: {
  neurons: Neuron[];
  connections: Connection[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    source: Neuron;
    target: Neuron;
    layers: string;
  } | null>(null);

  const connectionMap = useMemo(() => {
    const map = new Map<string, string>();
    connections.forEach((c) => {
      map.set(`${c.source_type_id}-${c.target_type_id}`, c.layers);
    });
    return map;
  }, [connections]);

  const cellSize = Math.max(4, Math.min(12, Math.floor(700 / neurons.length)));
  const labelWidth = 120;
  const canvasWidth = labelWidth + neurons.length * cellSize;
  const canvasHeight = labelWidth + neurons.length * cellSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || neurons.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw cells
    neurons.forEach((source, si) => {
      neurons.forEach((target, ti) => {
        const key = `${source.id}-${target.id}`;
        if (connectionMap.has(key)) {
          const color = getSubregionColor(source.subregion_id);
          ctx.fillStyle = color.hex;
          ctx.fillRect(
            labelWidth + ti * cellSize,
            labelWidth + si * cellSize,
            cellSize - 1,
            cellSize - 1
          );
        }
      });
    });

    // Region separators
    let prevRegion = "";
    neurons.forEach((n, i) => {
      if (n.subregion_id !== prevRegion && i > 0) {
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelWidth + i * cellSize, labelWidth);
        ctx.lineTo(labelWidth + i * cellSize, canvasHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(labelWidth, labelWidth + i * cellSize);
        ctx.lineTo(canvasWidth, labelWidth + i * cellSize);
        ctx.stroke();
      }
      prevRegion = n.subregion_id;
    });

    // Labels (only if cells are large enough)
    if (cellSize >= 8) {
      ctx.fillStyle = "#374151";
      ctx.font = `${Math.min(10, cellSize - 1)}px Inter, sans-serif`;

      // Row labels (source)
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      neurons.forEach((n, i) => {
        ctx.fillText(
          n.nickname.slice(0, 15),
          labelWidth - 4,
          labelWidth + i * cellSize + cellSize / 2
        );
      });

      // Column labels (target)
      ctx.save();
      neurons.forEach((n, i) => {
        ctx.save();
        ctx.translate(
          labelWidth + i * cellSize + cellSize / 2,
          labelWidth - 4
        );
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(n.nickname.slice(0, 15), 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
  }, [neurons, connectionMap, cellSize, canvasWidth, canvasHeight]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor((x - labelWidth) / cellSize);
      const row = Math.floor((y - labelWidth) / cellSize);

      if (
        col >= 0 &&
        col < neurons.length &&
        row >= 0 &&
        row < neurons.length
      ) {
        const source = neurons[row];
        const target = neurons[col];
        const key = `${source.id}-${target.id}`;
        const layers = connectionMap.get(key);
        if (layers) {
          setTooltip({ x: e.clientX, y: e.clientY, source, target, layers });
          return;
        }
      }
      setTooltip(null);
    },
    [neurons, connectionMap, cellSize]
  );

  if (neurons.length === 0) {
    return <p className="text-gray-500">No neurons match the current filters.</p>;
  }

  return (
    <div className="relative overflow-auto rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-xs text-gray-400">
        Rows = source (presynaptic) / Columns = target (postsynaptic)
      </p>
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height: canvasHeight }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        className="cursor-crosshair"
      />
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <p className="text-sm font-medium text-gray-900">
            {tooltip.source.nickname} → {tooltip.target.nickname}
          </p>
          <p className="text-xs text-gray-500">Layers: {tooltip.layers}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// GRAPH VIEW (force-directed)
// ============================================================

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  neuron: Neuron;
}

function GraphView({
  neurons,
  connections,
}: {
  neurons: Neuron[];
  connections: Connection[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<NodePosition[]>([]);
  const animRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<Neuron | null>(null);

  const width = 900;
  const height = 600;

  useEffect(() => {
    // Initialize node positions in a circle by subregion
    const regionGroups = new Map<string, Neuron[]>();
    neurons.forEach((n) => {
      if (!regionGroups.has(n.subregion_id))
        regionGroups.set(n.subregion_id, []);
      regionGroups.get(n.subregion_id)!.push(n);
    });

    const nodes: NodePosition[] = [];
    let angleOffset = 0;
    const regionAngles = (2 * Math.PI) / regionGroups.size;

    regionGroups.forEach((group, _region) => {
      const cx = width / 2 + Math.cos(angleOffset) * 200;
      const cy = height / 2 + Math.sin(angleOffset) * 200;
      group.forEach((n, i) => {
        const a = (i / group.length) * Math.PI * 2;
        const r = 30 + group.length * 3;
        nodes.push({
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          neuron: n,
        });
      });
      angleOffset += regionAngles;
    });

    nodesRef.current = nodes;

    const nodeMap = new Map<number, NodePosition>();
    nodes.forEach((n) => nodeMap.set(n.neuron.id, n));

    const edges = connections
      .map((c) => ({
        source: nodeMap.get(c.source_type_id),
        target: nodeMap.get(c.target_type_id),
      }))
      .filter((e) => e.source && e.target) as {
      source: NodePosition;
      target: NodePosition;
    }[];

    let iteration = 0;
    const maxIterations = 200;

    function tick() {
      if (iteration >= maxIterations) {
        draw();
        return;
      }
      iteration++;

      const alpha = 1 - iteration / maxIterations;

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (alpha * 500) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      edges.forEach((e) => {
        const dx = e.target.x - e.source.x;
        const dy = e.target.y - e.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = alpha * (dist - 80) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        e.source.vx += fx;
        e.source.vy += fy;
        e.target.vx -= fx;
        e.target.vy -= fy;
      });

      // Center gravity
      nodes.forEach((n) => {
        n.vx += (width / 2 - n.x) * 0.001 * alpha;
        n.vy += (height / 2 - n.y) * 0.001 * alpha;
      });

      // Apply velocity with damping
      nodes.forEach((n) => {
        n.vx *= 0.6;
        n.vy *= 0.6;
        n.x += n.vx;
        n.y += n.vy;
        // Bounds
        n.x = Math.max(20, Math.min(width - 20, n.x));
        n.y = Math.max(20, Math.min(height - 20, n.y));
      });

      draw();
      animRef.current = requestAnimationFrame(tick);
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);

      // Edges
      ctx.strokeStyle = "rgba(156, 163, 175, 0.2)";
      ctx.lineWidth = 0.5;
      edges.forEach((e) => {
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.stroke();
      });

      // Nodes
      nodes.forEach((n) => {
        const color = getSubregionColor(n.neuron.subregion_id);
        const isHovered = hoveredNode?.id === n.neuron.id;
        const radius = isHovered ? 6 : 4;

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = "#1f2937";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#1f2937";
          ctx.font = "12px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(n.neuron.nickname, n.x, n.y - 10);
        }
      });
    }

    animRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neurons, connections]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closest: Neuron | null = null;
      let minDist = 20;
      nodesRef.current.forEach((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closest = n.neuron;
        }
      });
      setHoveredNode(closest);
    },
    []
  );

  // Legend
  const regionLegend = SUBREGIONS.filter((r) =>
    neurons.some((n) => n.subregion_id === r)
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-4">
        <span className="text-xs text-gray-400">Color = subregion:</span>
        {regionLegend.map((r) => {
          const color = getSubregionColor(r);
          return (
            <span key={r} className="flex items-center gap-1 text-xs">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: color.hex }}
              />
              {r}
            </span>
          );
        })}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        onMouseMove={handleMouseMove}
        className="cursor-crosshair"
      />
      {hoveredNode && (
        <p className="mt-2 text-sm text-gray-600">
          <Link
            href={`/neurons/${hoveredNode.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {hoveredNode.nickname}
          </Link>{" "}
          ({hoveredNode.subregion_id},{" "}
          {hoveredNode.excit_inhib === "excitatory" ? "E" : "I"})
        </p>
      )}
    </div>
  );
}

// ============================================================
// LIST VIEW
// ============================================================

function ListView({
  neurons,
  connections,
}: {
  neurons: Neuron[];
  connections: Connection[];
}) {
  const neuronMap = useMemo(() => {
    const m = new Map<number, Neuron>();
    neurons.forEach((n) => m.set(n.id, n));
    return m;
  }, [neurons]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">→</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Layers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {connections.slice(0, 200).map((c, i) => {
              const source = neuronMap.get(c.source_type_id);
              const target = neuronMap.get(c.target_type_id);
              if (!source || !target) return null;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/neurons/${source.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {source.nickname}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <SubregionBadge subregion={source.subregion_id} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-gray-300">→</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/neurons/${target.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {target.nickname}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <SubregionBadge subregion={target.subregion_id} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.layers}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {connections.length > 200 && (
        <p className="border-t border-gray-100 px-4 py-3 text-center text-sm text-gray-400">
          Showing 200 of {connections.length.toLocaleString()} connections. Use
          filters to narrow results.
        </p>
      )}
    </div>
  );
}
