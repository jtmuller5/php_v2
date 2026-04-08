"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { NeuronCompleteness } from "@/lib/queries/gaps";
import { SubregionBadge } from "@/components/ui/SubregionBadge";

const CATEGORIES = [
  { key: "has_morphology" as const, label: "Morphology" },
  { key: "has_ephys" as const, label: "Electrophysiology" },
  { key: "has_markers" as const, label: "Markers" },
  { key: "has_firing_pattern" as const, label: "Firing Patterns" },
  { key: "has_izh_model" as const, label: "Izhikevich" },
  { key: "has_population" as const, label: "Population" },
];

interface GapHeatmapProps {
  data: NeuronCompleteness[];
  selectedRegions: Set<string>;
  sortBy: "name" | "completeness";
}

export function GapHeatmap({
  data,
  selectedRegions,
  sortBy,
}: GapHeatmapProps) {
  const filtered = useMemo(() => {
    let result = data.filter((n) => selectedRegions.has(n.subregion_id));
    if (sortBy === "completeness") {
      result = [...result].sort((a, b) => a.completeness - b.completeness);
    } else {
      result = [...result].sort((a, b) =>
        a.nickname.localeCompare(b.nickname)
      );
    }
    return result;
  }, [data, selectedRegions, sortBy]);

  // Column summary: % of neurons with data in each category
  const columnStats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const count = filtered.filter((n) => n[cat.key]).length;
      return Math.round((count / filtered.length) * 100) || 0;
    });
  }, [filtered]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500">
              Neuron Type
            </th>
            <th className="px-2 py-3 text-left font-medium text-gray-500">
              Region
            </th>
            {CATEGORIES.map((cat) => (
              <th
                key={cat.key}
                className="px-2 py-3 text-center font-medium text-gray-500"
              >
                <span className="inline-block max-w-[80px] text-xs leading-tight">
                  {cat.label}
                </span>
              </th>
            ))}
            <th className="px-3 py-3 text-right font-medium text-gray-500">
              Complete
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filtered.map((neuron) => {
            const pct = Math.round(neuron.completeness * 100);
            return (
              <tr key={neuron.neuron_id} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 group-hover:bg-gray-50">
                  <Link
                    href={`/neurons/${neuron.neuron_id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {neuron.nickname}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <SubregionBadge
                    subregion={neuron.subregion_id}
                    size="sm"
                  />
                </td>
                {CATEGORIES.map((cat) => (
                  <td key={cat.key} className="px-2 py-2 text-center">
                    <span
                      className={`inline-block h-5 w-5 rounded ${
                        neuron[cat.key]
                          ? "bg-green-400"
                          : "bg-red-300"
                      }`}
                      title={
                        neuron[cat.key]
                          ? `${cat.label}: Present`
                          : `${cat.label}: Missing`
                      }
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <span
                    className={`inline-flex min-w-[48px] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      pct === 100
                        ? "bg-green-100 text-green-700"
                        : pct >= 67
                          ? "bg-yellow-100 text-yellow-700"
                          : pct >= 33
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    {pct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50">
            <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500">
              Coverage
            </td>
            <td />
            {columnStats.map((pct, i) => (
              <td key={i} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                {pct}%
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-medium text-gray-500">
              {Math.round(
                (filtered.reduce((s, n) => s + n.completeness, 0) /
                  filtered.length) *
                  100
              ) || 0}
              %
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
