"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getConnectionDetail } from "@/lib/queries/connectivity";
import { formatNumber } from "@/lib/utils/format";

interface ConnectionDetailPanelProps {
  sourceId: number;
  targetId: number;
  sourceNickname: string;
  targetNickname: string;
  onBack: () => void;
}

interface DetailData {
  synapse_probability: { sp_mean: number | null; sp_stdev: number | null } | null;
  number_of_contacts: { noc_mean: number | null; noc_stdev: number | null } | null;
  number_of_potential_synapses: {
    nops_mean: number | null;
    nops_stdev: number | null;
  } | null;
  tm_synapse_models: Array<{
    conductance_mean: number | null;
    tau_d_mean: number | null;
    tau_r_mean: number | null;
    tau_f_mean: number | null;
    utilization_mean: number | null;
    species: string | null;
    sex: string | null;
    age: string | null;
    temperature: string | null;
    recording_mode: string | null;
  }>;
}

export function ConnectionDetailPanel({
  sourceId,
  targetId,
  sourceNickname,
  targetNickname,
  onBack,
}: ConnectionDetailPanelProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    getConnectionDetail(supabase, sourceId, targetId).then((d) => {
      setData(d as DetailData);
      setLoading(false);
    });
  }, [sourceId, targetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  const sp = data?.synapse_probability;
  const noc = data?.number_of_contacts;
  const nops = data?.number_of_potential_synapses;
  const tm = data?.tm_synapse_models ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Connection Detail
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            <Link
              href={`/neurons/${sourceId}`}
              className="text-blue-600 hover:underline"
            >
              {sourceNickname}
            </Link>
            {" → "}
            <Link
              href={`/neurons/${targetId}`}
              className="text-blue-600 hover:underline"
            >
              {targetNickname}
            </Link>
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {/* Connectivity statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Synapse Probability
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {sp?.sp_mean != null ? formatNumber(sp.sp_mean, 6) : "\u2014"}
          </p>
          {sp?.sp_stdev != null && (
            <p className="mt-1 text-sm text-gray-400">
              \u00B1 {formatNumber(sp.sp_stdev, 6)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Number of Contacts
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {noc?.noc_mean != null ? formatNumber(noc.noc_mean, 2) : "\u2014"}
          </p>
          {noc?.noc_stdev != null && (
            <p className="mt-1 text-sm text-gray-400">
              \u00B1 {formatNumber(noc.noc_stdev, 2)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Potential Synapses
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {nops?.nops_mean != null
              ? formatNumber(nops.nops_mean, 4)
              : "\u2014"}
          </p>
          {nops?.nops_stdev != null && (
            <p className="mt-1 text-sm text-gray-400">
              \u00B1 {formatNumber(nops.nops_stdev, 4)}
            </p>
          )}
        </div>
      </div>

      {/* Tsodyks-Markram synapse parameters */}
      {tm.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h4 className="text-base font-semibold text-gray-900">
            Tsodyks-Markram Synapse Parameters
          </h4>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">g (nS)</th>
                  <th className="pb-2 pr-4 font-medium">
                    \u03C4<sub>d</sub> (ms)
                  </th>
                  <th className="pb-2 pr-4 font-medium">
                    \u03C4<sub>r</sub> (ms)
                  </th>
                  <th className="pb-2 pr-4 font-medium">
                    \u03C4<sub>f</sub> (ms)
                  </th>
                  <th className="pb-2 pr-4 font-medium">U</th>
                  <th className="pb-2 pr-4 font-medium text-gray-400">
                    Conditions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tm.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-mono">
                      {formatNumber(row.conductance_mean, 3)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {formatNumber(row.tau_d_mean, 2)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {formatNumber(row.tau_r_mean, 2)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {formatNumber(row.tau_f_mean, 2)}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {formatNumber(row.utilization_mean, 3)}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-400">
                      {[
                        row.species,
                        row.sex,
                        row.age,
                        row.temperature,
                        row.recording_mode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!sp && !noc && !nops && tm.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-400">
            No quantitative data available for this connection pair.
          </p>
          <p className="mt-2 text-sm text-gray-300">
            The connection exists based on morphological overlap, but detailed
            synaptic parameters have not been characterized.
          </p>
        </div>
      )}
    </div>
  );
}
