"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ConnectionCompleteness } from "@/lib/queries/gaps";
import { SubregionBadge } from "@/components/ui/SubregionBadge";

interface ConnectionGapTableProps {
  data: ConnectionCompleteness[];
  selectedRegions: Set<string>;
}

export function ConnectionGapTable({
  data,
  selectedRegions,
}: ConnectionGapTableProps) {
  const [showOnly, setShowOnly] = useState<"all" | "incomplete" | "complete">(
    "all"
  );

  const filtered = useMemo(() => {
    let result = data.filter(
      (c) =>
        selectedRegions.has(c.source_subregion) ||
        selectedRegions.has(c.target_subregion)
    );
    if (showOnly === "incomplete") {
      result = result.filter((c) => c.completeness < 1);
    } else if (showOnly === "complete") {
      result = result.filter((c) => c.completeness === 1);
    }
    return result.sort((a, b) => a.completeness - b.completeness);
  }, [data, selectedRegions, showOnly]);

  const stats = useMemo(() => {
    const hasSP = filtered.filter((c) => c.has_synapse_prob).length;
    const hasNOC = filtered.filter((c) => c.has_noc).length;
    const hasTM = filtered.filter((c) => c.has_tm_params).length;
    return {
      total: filtered.length,
      spPct: Math.round((hasSP / filtered.length) * 100) || 0,
      nocPct: Math.round((hasNOC / filtered.length) * 100) || 0,
      tmPct: Math.round((hasTM / filtered.length) * 100) || 0,
    };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={showOnly}
          onChange={(e) =>
            setShowOnly(e.target.value as "all" | "incomplete" | "complete")
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All connections ({filtered.length})</option>
          <option value="incomplete">
            Incomplete only (
            {filtered.filter((c) => c.completeness < 1).length})
          </option>
          <option value="complete">
            Complete only (
            {filtered.filter((c) => c.completeness === 1).length})
          </option>
        </select>
        <span className="text-xs text-gray-400">
          SP: {stats.spPct}% | NOC: {stats.nocPct}% | TM: {stats.tmPct}%
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-2 py-3 font-medium" />
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-3 py-3 text-center font-medium">
                <span className="text-xs">Synapse Prob</span>
              </th>
              <th className="px-3 py-3 text-center font-medium">
                <span className="text-xs"># Contacts</span>
              </th>
              <th className="px-3 py-3 text-center font-medium">
                <span className="text-xs">TM Params</span>
              </th>
              <th className="px-3 py-3 text-right font-medium">Complete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.slice(0, 200).map((c) => {
              const pct = Math.round(c.completeness * 100);
              return (
                <tr
                  key={`${c.source_type_id}-${c.target_type_id}`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/neurons/${c.source_type_id}`}
                      className="flex items-center gap-1.5"
                    >
                      <SubregionBadge
                        subregion={c.source_subregion}
                        size="sm"
                      />
                      <span className="font-medium text-blue-600 hover:underline">
                        {c.source_nickname}
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-gray-300">→</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/neurons/${c.target_type_id}`}
                      className="flex items-center gap-1.5"
                    >
                      <SubregionBadge
                        subregion={c.target_subregion}
                        size="sm"
                      />
                      <span className="font-medium text-blue-600 hover:underline">
                        {c.target_nickname}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block h-5 w-5 rounded ${
                        c.has_synapse_prob ? "bg-green-400" : "bg-red-300"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block h-5 w-5 rounded ${
                        c.has_noc ? "bg-green-400" : "bg-red-300"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block h-5 w-5 rounded ${
                        c.has_tm_params ? "bg-green-400" : "bg-red-300"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`inline-flex min-w-[48px] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        pct === 100
                          ? "bg-green-100 text-green-700"
                          : pct >= 67
                            ? "bg-yellow-100 text-yellow-700"
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
        </table>
        {filtered.length > 200 && (
          <p className="border-t border-gray-100 px-4 py-3 text-center text-sm text-gray-400">
            Showing 200 of {filtered.length.toLocaleString()} connections
          </p>
        )}
      </div>
    </div>
  );
}
