"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { formatNumber, formatPopulation, formatExcitInhib } from "@/lib/utils/format";

interface Neuron {
  id: number;
  nickname: string;
  subregion_id: string;
  excit_inhib: string;
}

interface CompareViewProps {
  allNeurons: Neuron[];
  selectedNeurons: Record<string, unknown>[];
  selectedIds: number[];
  populationData: Record<
    number,
    { count_value: number | null; lower_bound: number | null; upper_bound: number | null }
  >;
  connectionCounts: Record<number, { outgoing: number; incoming: number }>;
  firingPatternData: Record<
    number,
    { overall_fp: string | null; isi_avg_ms: number | null }[]
  >;
}

export function CompareView({
  allNeurons,
  selectedNeurons,
  selectedIds,
  populationData,
  connectionCounts,
  firingPatternData,
}: CompareViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function addNeuron(id: number) {
    if (selectedIds.includes(id)) return;
    const newIds = [...selectedIds, id];
    router.push(`/neurons/compare?ids=${newIds.join(",")}`);
  }

  function removeNeuron(id: number) {
    const newIds = selectedIds.filter((i) => i !== id);
    if (newIds.length === 0) {
      router.push("/neurons/compare");
    } else {
      router.push(`/neurons/compare?ids=${newIds.join(",")}`);
    }
  }

  // Sort selectedNeurons to match selectedIds order
  const orderedNeurons = selectedIds
    .map((id) => selectedNeurons.find((n) => (n as { id: number }).id === id))
    .filter(Boolean) as Record<string, unknown>[];

  return (
    <div className="mt-6 space-y-6">
      {/* Neuron selector */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          value=""
          onChange={(e) => {
            const id = Number(e.target.value);
            if (id) addNeuron(id);
          }}
        >
          <option value="">+ Add neuron to compare...</option>
          {allNeurons
            .filter((n) => !selectedIds.includes(n.id))
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.subregion_id}: {n.nickname} (
                {n.excit_inhib === "excitatory" ? "E" : "I"})
              </option>
            ))}
        </select>

        {selectedIds.length > 0 && (
          <span className="text-sm text-gray-400">
            {selectedIds.length} neuron{selectedIds.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
        )}
      </div>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {orderedNeurons.map((n) => {
            const neuron = n as {
              id: number;
              nickname: string;
              subregion_id: string;
            };
            return (
              <span
                key={neuron.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm"
              >
                <SubregionBadge subregion={neuron.subregion_id} size="sm" />
                <Link
                  href={`/neurons/${neuron.id}`}
                  className="font-medium text-gray-700 hover:text-blue-600"
                >
                  {neuron.nickname}
                </Link>
                <button
                  onClick={() => removeNeuron(neuron.id)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Comparison table */}
      {orderedNeurons.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500">
                  Property
                </th>
                {orderedNeurons.map((n) => {
                  const neuron = n as {
                    id: number;
                    nickname: string;
                    subregion_id: string;
                  };
                  return (
                    <th
                      key={neuron.id}
                      className="min-w-[180px] px-4 py-3 text-left font-medium text-gray-900"
                    >
                      <div className="flex items-center gap-2">
                        <SubregionBadge
                          subregion={neuron.subregion_id}
                          size="sm"
                        />
                        <Link
                          href={`/neurons/${neuron.id}`}
                          className="hover:text-blue-600"
                        >
                          {neuron.nickname}
                        </Link>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <CompareRow label="Full Name" neurons={orderedNeurons} accessor={(n) => (n as { name?: string }).name ?? "\u2014"} />
              <CompareRow
                label="Subregion"
                neurons={orderedNeurons}
                accessor={(n) => (n as { subregion_id: string }).subregion_id}
              />
              <CompareRow
                label="Excitatory / Inhibitory"
                neurons={orderedNeurons}
                accessor={(n) =>
                  formatExcitInhib(
                    (n as { excit_inhib: "excitatory" | "inhibitory" | "unknown" }).excit_inhib
                  )
                }
              />
              <CompareRow
                label="Population"
                neurons={orderedNeurons}
                accessor={(n) => {
                  const p = populationData[(n as { id: number }).id];
                  return p
                    ? formatPopulation(p.count_value, p.lower_bound, p.upper_bound)
                    : "\u2014";
                }}
              />
              <CompareRow
                label="Outgoing Connections"
                neurons={orderedNeurons}
                accessor={(n) => {
                  const c = connectionCounts[(n as { id: number }).id];
                  return c ? String(c.outgoing) : "\u2014";
                }}
              />
              <CompareRow
                label="Incoming Connections"
                neurons={orderedNeurons}
                accessor={(n) => {
                  const c = connectionCounts[(n as { id: number }).id];
                  return c ? String(c.incoming) : "\u2014";
                }}
              />
              <CompareRow
                label="Firing Pattern"
                neurons={orderedNeurons}
                accessor={(n) => {
                  const fps = firingPatternData[(n as { id: number }).id];
                  if (!fps || fps.length === 0) return "\u2014";
                  return fps.map((fp) => fp.overall_fp ?? "Unknown").join(", ");
                }}
              />
              <CompareRow
                label="ISI Average (ms)"
                neurons={orderedNeurons}
                accessor={(n) => {
                  const fps = firingPatternData[(n as { id: number }).id];
                  if (!fps || fps.length === 0) return "\u2014";
                  const vals = fps
                    .map((fp) => fp.isi_avg_ms)
                    .filter((v) => v != null);
                  if (vals.length === 0) return "\u2014";
                  return vals.map((v) => formatNumber(v)).join(", ");
                }}
              />
              <CompareRow
                label="Supertype"
                neurons={orderedNeurons}
                accessor={(n) =>
                  (n as { supertype?: string }).supertype ?? "\u2014"
                }
              />
            </tbody>
          </table>
        </div>
      )}

      {selectedIds.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-400">
            Select neuron types above to start comparing
          </p>
          <p className="mt-2 text-sm text-gray-300">
            You can compare morphology, connectivity, firing patterns, and more
          </p>
        </div>
      )}
    </div>
  );
}

function CompareRow({
  label,
  neurons,
  accessor,
}: {
  label: string;
  neurons: Record<string, unknown>[];
  accessor: (n: Record<string, unknown>) => string;
}) {
  return (
    <tr>
      <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-500">
        {label}
      </td>
      {neurons.map((n) => (
        <td
          key={(n as { id: number }).id}
          className="px-4 py-3 text-gray-900"
        >
          {accessor(n)}
        </td>
      ))}
    </tr>
  );
}
