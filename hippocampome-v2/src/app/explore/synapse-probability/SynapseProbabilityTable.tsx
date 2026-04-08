"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { formatNumber } from "@/lib/utils/format";

interface Neuron {
  id: number;
  nickname: string;
  subregion_id: string;
}

interface SPRow {
  source_type_id: number;
  target_type_id: number;
  sp_mean: number | null;
  sp_stdev: number | null;
}

interface Props {
  neurons: Neuron[];
  data: SPRow[];
}

export function SynapseProbabilityTable({ neurons, data }: Props) {
  const [regionFilter, setRegionFilter] = useState<string>("");

  const neuronMap = useMemo(() => {
    const m = new Map<number, Neuron>();
    neurons.forEach((n) => m.set(n.id, n));
    return m;
  }, [neurons]);

  const filtered = useMemo(() => {
    if (!regionFilter) return data;
    return data.filter((row) => {
      const source = neuronMap.get(row.source_type_id);
      const target = neuronMap.get(row.target_type_id);
      return (
        source?.subregion_id === regionFilter ||
        target?.subregion_id === regionFilter
      );
    });
  }, [data, regionFilter, neuronMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">
          Filter by region:
        </span>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All regions</option>
          {["DG", "CA3", "CA2", "CA1", "Sub", "EC"].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400">
          {filtered.length} pairs shown
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium text-right">
                SP Mean
              </th>
              <th className="px-4 py-3 font-medium text-right">
                SP Stdev
              </th>
              <th className="px-4 py-3 font-medium">Probability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((row, i) => {
              const source = neuronMap.get(row.source_type_id);
              const target = neuronMap.get(row.target_type_id);
              const pct = row.sp_mean != null ? row.sp_mean * 100 : 0;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {source && (
                        <>
                          <SubregionBadge
                            subregion={source.subregion_id}
                            size="sm"
                          />
                          <Link
                            href={`/neurons/${source.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {source.nickname}
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {target && (
                        <>
                          <SubregionBadge
                            subregion={target.subregion_id}
                            size="sm"
                          />
                          <Link
                            href={`/neurons/${target.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {target.nickname}
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-800">
                    {formatNumber(row.sp_mean, 6)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">
                    {row.sp_stdev != null
                      ? formatNumber(row.sp_stdev, 6)
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, pct * 1000)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {pct.toFixed(4)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
