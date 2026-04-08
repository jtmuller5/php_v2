"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { getSubregionColor } from "@/lib/utils/subregion-colors";
import {
  simulateNetwork,
  type NetworkConfig,
  type NetworkNeuron,
  type NetworkSynapse,
  type NetworkResult,
} from "@/lib/simulator/network";
import type { IzhParams } from "@/lib/simulator/izhikevich";

interface NeuronData {
  id: number;
  nickname: string;
  subregion_id: string;
  excit_inhib: string;
  izh: IzhParams;
}

interface NetworkSimulatorViewProps {
  neurons: NeuronData[];
  connectionSet: string[];
  spMap: Record<string, number>;
}

const SUBREGIONS = ["DG", "CA3", "CA2", "CA1", "Sub", "EC"];

export function NetworkSimulatorView({
  neurons,
  connectionSet,
  spMap,
}: NetworkSimulatorViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [neuronsPerType, setNeuronsPerType] = useState(10);
  const [duration, setDuration] = useState(500);
  const [backgroundCurrent, setBackgroundCurrent] = useState(150);
  const [noiseAmplitude, setNoiseAmplitude] = useState(50);
  const [result, setResult] = useState<NetworkResult | null>(null);
  const [running, setRunning] = useState(false);
  const rasterRef = useRef<HTMLCanvasElement>(null);
  const tracesRef = useRef<HTMLCanvasElement>(null);

  const connSet = useMemo(() => new Set(connectionSet), [connectionSet]);

  const grouped = useMemo(() => {
    const groups = new Map<string, NeuronData[]>();
    SUBREGIONS.forEach((r) => groups.set(r, []));
    neurons.forEach((n) => {
      const list = groups.get(n.subregion_id);
      if (list) list.push(n);
    });
    return groups;
  }, [neurons]);

  const selectedNeurons = useMemo(
    () => neurons.filter((n) => selectedIds.has(n.id)),
    [neurons, selectedIds]
  );

  // Count connections between selected types
  const activeConnections = useMemo(() => {
    const conns: { source: string; target: string; prob: number }[] = [];
    for (const s of selectedNeurons) {
      for (const t of selectedNeurons) {
        const key = `${s.id}-${t.id}`;
        if (connSet.has(key)) {
          conns.push({
            source: s.nickname,
            target: t.nickname,
            prob: spMap[key] ?? 0.01,
          });
        }
      }
    }
    return conns;
  }, [selectedNeurons, connSet, spMap]);

  function toggleNeuron(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  }

  const runSimulation = useCallback(() => {
    if (selectedNeurons.length === 0) return;
    setRunning(true);

    setTimeout(() => {
      const networkNeurons: NetworkNeuron[] = selectedNeurons.map((n) => ({
        typeId: n.id,
        typeName: n.nickname,
        params: n.izh,
        isExcitatory: n.excit_inhib === "excitatory",
      }));

      const networkSynapses: NetworkSynapse[] = [];
      for (const s of selectedNeurons) {
        for (const t of selectedNeurons) {
          const key = `${s.id}-${t.id}`;
          if (connSet.has(key)) {
            const prob = spMap[key] ?? 0.01;
            const isExc = s.excit_inhib === "excitatory";
            networkSynapses.push({
              sourceTypeId: s.id,
              targetTypeId: t.id,
              weight: isExc ? 2.0 : 5.0, // nS
              tauD: isExc ? 5.0 : 10.0, // ms
              probability: Math.min(prob * 100, 0.5), // scale up for small network
              reversal: isExc ? 0 : -80,
            });
          }
        }
      }

      const config: NetworkConfig = {
        neuronTypes: networkNeurons,
        synapses: networkSynapses,
        neuronsPerType,
        duration,
        dt: 0.05, // 0.05ms step (faster than single-neuron sim)
        backgroundCurrent,
        noiseAmplitude,
      };

      const res = simulateNetwork(config);
      setResult(res);
      setRunning(false);
    }, 20);
  }, [
    selectedNeurons,
    connSet,
    spMap,
    neuronsPerType,
    duration,
    backgroundCurrent,
    noiseAmplitude,
  ]);

  // Draw raster plot
  useEffect(() => {
    if (!result) return;
    drawRaster(result);
    drawTraces(result);
  }, [result]);

  function drawRaster(res: NetworkResult) {
    const canvas = rasterRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 10, right: 20, bottom: 40, left: 100 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    const totalNeurons = res.neuronTypes.reduce((s, t) => s + t.count, 0);

    // Draw type region backgrounds and labels
    let yOffset = 0;
    for (const nt of res.neuronTypes) {
      const y1 = pad.top + (yOffset / totalNeurons) * plotH;
      const y2 =
        pad.top + ((yOffset + nt.count) / totalNeurons) * plotH;

      // Background stripe
      ctx.fillStyle = nt.isExcitatory
        ? "rgba(34, 197, 94, 0.05)"
        : "rgba(239, 68, 68, 0.05)";
      ctx.fillRect(pad.left, y1, plotW, y2 - y1);

      // Label
      ctx.fillStyle = "#374151";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const label =
        nt.name.length > 14 ? nt.name.slice(0, 13) + "\u2026" : nt.name;
      ctx.fillText(label, pad.left - 8, (y1 + y2) / 2);

      // Separator
      if (yOffset > 0) {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, y1);
        ctx.lineTo(pad.left + plotW, y1);
        ctx.stroke();
      }

      yOffset += nt.count;
    }

    // Draw spikes
    for (const spike of res.spikes) {
      const x = pad.left + (spike.time / res.duration) * plotW;
      const y = pad.top + (spike.neuronIndex / totalNeurons) * plotH;

      const nt = res.neuronTypes[spike.typeIndex];
      const neuronData = selectedNeurons[spike.typeIndex];
      const color = neuronData
        ? getSubregionColor(neuronData.subregion_id).hex
        : nt.isExcitatory
          ? "#22c55e"
          : "#ef4444";

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1.5, 2);
    }

    // Axes
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Time axis labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const t = (res.duration * i) / 5;
      const x = pad.left + (plotW * i) / 5;
      ctx.fillText(`${t.toFixed(0)}`, x, pad.top + plotH + 18);
    }
    ctx.fillText("Time (ms)", pad.left + plotW / 2, h - 5);
  }

  function drawTraces(res: NetworkResult) {
    const canvas = tracesRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 10, right: 20, bottom: 30, left: 60 };
    const numTypes = res.neuronTypes.length;
    const traceH = (h - pad.top - pad.bottom) / numTypes;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    res.voltageTraces.forEach((trace, typeIdx) => {
      const yBase = pad.top + typeIdx * traceH;

      // Find voltage range
      let vMin = Infinity,
        vMax = -Infinity;
      for (const val of trace.v) {
        if (val < vMin) vMin = val;
        if (val > vMax) vMax = val;
      }
      const vRange = vMax - vMin || 1;

      // Draw trace
      const neuronData = selectedNeurons[typeIdx];
      const color = neuronData
        ? getSubregionColor(neuronData.subregion_id).hex
        : "#3b82f6";

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < trace.t.length; i++) {
        const x = pad.left + (trace.t[i] / res.duration) * (w - pad.left - pad.right);
        const y =
          yBase + traceH - 5 - ((trace.v[i] - vMin) / vRange) * (traceH - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Label
      ctx.fillStyle = "#374151";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "left";
      const name = res.neuronTypes[typeIdx].name;
      ctx.fillText(
        name.length > 18 ? name.slice(0, 17) + "\u2026" : name,
        pad.left + 4,
        yBase + 12
      );

      // Separator
      if (typeIdx > 0) {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, yBase);
        ctx.lineTo(w - pad.right, yBase);
        ctx.stroke();
      }
    });

    // Left axis
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.lineTo(w - pad.right, h - pad.bottom);
    ctx.stroke();
  }

  // Spike rate summary
  const spikeRates = useMemo(() => {
    if (!result) return [];
    return result.neuronTypes.map((nt, i) => {
      const typeSpikes = result.spikes.filter((s) => s.typeIndex === i);
      const rate =
        (typeSpikes.length / nt.count / result.duration) * 1000; // Hz
      return { name: nt.name, rate, count: typeSpikes.length, isExcitatory: nt.isExcitatory };
    });
  }, [result]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left: Neuron selector & controls */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {/* Neuron picker */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Neuron Types ({selectedIds.size} selected)
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Pick 2-8 types to build a network
          </p>
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {Array.from(grouped.entries()).map(([region, regionNeurons]) => {
              if (regionNeurons.length === 0) return null;
              return (
                <div key={region}>
                  <p className="mt-2 text-xs font-medium text-gray-400">
                    {region}
                  </p>
                  {regionNeurons.map((n) => (
                    <label
                      key={n.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        selectedIds.has(n.id)
                          ? "bg-blue-50 text-blue-800"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(n.id)}
                        onChange={() => toggleNeuron(n.id)}
                        className="h-3 w-3 rounded border-gray-300 text-blue-600"
                      />
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          n.excit_inhib === "excitatory"
                            ? "bg-green-500"
                            : n.excit_inhib === "inhibitory"
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                      />
                      <span className="truncate">{n.nickname}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Parameters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Parameters</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs text-gray-500">
                Neurons per type
              </label>
              <input
                type="number"
                min={2}
                max={50}
                value={neuronsPerType}
                onChange={(e) => setNeuronsPerType(Number(e.target.value))}
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">
                Duration (ms)
              </label>
              <input
                type="number"
                min={100}
                max={2000}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">
                Background current (pA)
              </label>
              <input
                type="number"
                value={backgroundCurrent}
                onChange={(e) =>
                  setBackgroundCurrent(Number(e.target.value))
                }
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">
                Noise amplitude (pA)
              </label>
              <input
                type="number"
                value={noiseAmplitude}
                onChange={(e) =>
                  setNoiseAmplitude(Number(e.target.value))
                }
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Wiring summary */}
        {selectedNeurons.length >= 2 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Network Wiring
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {selectedNeurons.length} types,{" "}
              {selectedNeurons.length * neuronsPerType} total neurons,{" "}
              {activeConnections.length} connection types
            </p>
            <div className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs">
              {activeConnections.slice(0, 20).map((c, i) => (
                <div key={i} className="flex items-center gap-1 text-gray-500">
                  <span className="truncate">{c.source}</span>
                  <span className="text-gray-300">→</span>
                  <span className="truncate">{c.target}</span>
                  <span className="ml-auto shrink-0 text-gray-400">
                    {(c.prob * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
              {activeConnections.length > 20 && (
                <p className="text-gray-400">
                  +{activeConnections.length - 20} more
                </p>
              )}
              {activeConnections.length === 0 && (
                <p className="text-gray-400">
                  No known connections between selected types
                </p>
              )}
            </div>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={runSimulation}
          disabled={running || selectedNeurons.length < 2}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {running
            ? "Simulating..."
            : selectedNeurons.length < 2
              ? "Select at least 2 neuron types"
              : `Run Network (${selectedNeurons.length * neuronsPerType} neurons)`}
        </button>
      </div>

      {/* Right: Results */}
      <div className="space-y-6">
        {!result && (
          <div className="rounded-xl border border-dashed border-gray-300 py-24 text-center">
            <p className="text-lg text-gray-400">
              Select neuron types and run the simulation
            </p>
            <p className="mt-2 text-sm text-gray-300">
              The network simulator connects neurons using real Hippocampome
              connectivity data and runs coupled Izhikevich models with
              Tsodyks-Markram synapses
            </p>
          </div>
        )}

        {result && (
          <>
            {/* Spike rates */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spikeRates.map((sr) => (
                <div
                  key={sr.name}
                  className={`rounded-lg border p-3 ${
                    sr.isExcitatory
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-500 truncate">
                    {sr.name}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {sr.rate.toFixed(1)} Hz
                  </p>
                  <p className="text-xs text-gray-400">
                    {sr.count} spikes total
                  </p>
                </div>
              ))}
            </div>

            {/* Raster plot */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Raster Plot
              </h3>
              <p className="mb-3 text-xs text-gray-400">
                Each dot is a spike. Neurons grouped by type, colored by
                subregion.
              </p>
              <canvas ref={rasterRef} className="h-72 w-full" />
            </div>

            {/* Voltage traces */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Voltage Traces
              </h3>
              <p className="mb-3 text-xs text-gray-400">
                Membrane potential of one representative neuron per type.
              </p>
              <canvas
                ref={tracesRef}
                className="w-full"
                style={{ height: Math.max(200, selectedNeurons.length * 80) }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
