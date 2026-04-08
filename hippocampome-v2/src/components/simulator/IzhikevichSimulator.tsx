"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  simulate,
  type IzhParams,
  type SimulationResult,
} from "@/lib/simulator/izhikevich";
import { downloadSimulationCSV } from "@/lib/utils/export";
import { formatNumber } from "@/lib/utils/format";

interface IzhikevichSimulatorProps {
  params: IzhParams;
  modelName: string;
}

export function IzhikevichSimulator({
  params: initialParams,
  modelName,
}: IzhikevichSimulatorProps) {
  const [params, setParams] = useState(initialParams);
  const [inputCurrent, setInputCurrent] = useState(100);
  const [duration, setDuration] = useState(500);
  const [stimStart, setStimStart] = useState(50);
  const [stimEnd, setStimEnd] = useState(450);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const runSimulation = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const res = simulate({
        params,
        inputCurrent,
        duration,
        stimStart,
        stimEnd,
      });
      setResult(res);
      setRunning(false);
    }, 10);
  }, [params, inputCurrent, duration, stimStart, stimEnd]);

  // Draw whenever result changes and canvas is visible
  useEffect(() => {
    if (result) drawTrace(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function drawTrace(res: SimulationResult) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);

    // Find data range
    let vMin = Infinity,
      vMax = -Infinity;
    for (let i = 0; i < res.v.length; i++) {
      if (res.v[i] < vMin) vMin = res.v[i];
      if (res.v[i] > vMax) vMax = res.v[i];
    }
    const vRange = vMax - vMin || 1;
    vMin -= vRange * 0.05;
    vMax += vRange * 0.05;

    const tMax = res.t[res.t.length - 1];

    // Grid
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (plotH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();
    }

    // Stimulus region
    const stimX1 =
      padding.left + (stimStart / tMax) * plotW;
    const stimX2 =
      padding.left + (stimEnd / tMax) * plotW;
    ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
    ctx.fillRect(stimX1, padding.top, stimX2 - stimX1, plotH);

    // Voltage trace
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < res.t.length; i++) {
      const x = padding.left + (res.t[i] / tMax) * plotW;
      const y =
        padding.top + plotH - ((res.v[i] - vMin) / (vMax - vMin)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotH);
    ctx.lineTo(padding.left + plotW, padding.top + plotH);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Time (ms)", padding.left + plotW / 2, h - 5);

    ctx.save();
    ctx.translate(15, padding.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Voltage (mV)", 0, 0);
    ctx.restore();

    // Tick labels
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
      const t = (tMax * i) / 5;
      const x = padding.left + (plotW * i) / 5;
      ctx.fillText(t.toFixed(0), x, padding.top + plotH + 18);
    }

    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const v = vMin + ((vMax - vMin) * (5 - i)) / 5;
      const y = padding.top + (plotH * i) / 5;
      ctx.fillText(v.toFixed(1), padding.left - 8, y + 4);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{modelName}</h3>
          <div className="flex gap-2">
            <button
              onClick={runSimulation}
              disabled={running}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? "Running..." : "Run Simulation"}
            </button>
            {result && (
              <button
                onClick={() =>
                  downloadSimulationCSV(
                    result.t,
                    result.v,
                    "izhikevich_simulation.csv"
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Download CSV
              </button>
            )}
          </div>
        </div>

        {/* Parameter display */}
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">
          {(
            [
              ["k", params.k],
              ["a", params.a],
              ["b", params.b],
              ["d", params.d],
              ["C", params.C],
              ["Vr", params.Vr],
              ["Vt", params.Vt],
              ["Vpeak", params.Vpeak],
              ["Vmin", params.Vmin],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="text-center">
              <p className="text-xs font-medium text-gray-400">{label}</p>
              <p className="text-sm font-mono text-gray-800">
                {formatNumber(value, 3)}
              </p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Input Current (pA)
            </label>
            <input
              type="number"
              value={inputCurrent}
              onChange={(e) => setInputCurrent(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Duration (ms)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Stim Start (ms)
            </label>
            <input
              type="number"
              value={stimStart}
              onChange={(e) => setStimStart(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Stim End (ms)
            </label>
            <input
              type="number"
              value={stimEnd}
              onChange={(e) => setStimEnd(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Canvas for voltage trace */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <canvas
          ref={canvasRef}
          className="h-80 w-full"
          style={{ display: result ? "block" : "none" }}
        />
        {!result && (
          <div className="flex h-80 items-center justify-center text-gray-400">
            Click &quot;Run Simulation&quot; to see the voltage trace
          </div>
        )}
      </div>
    </div>
  );
}
