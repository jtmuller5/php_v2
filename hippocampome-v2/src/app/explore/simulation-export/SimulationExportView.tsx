"use client";

import { useState, useMemo } from "react";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { downloadFile } from "@/lib/utils/export";

interface Neuron {
  id: number;
  nickname: string;
  subregion_id: string;
  excit_inhib: string;
}

const SUBREGIONS = ["DG", "CA3", "CA2", "CA1", "Sub", "EC"];

interface SimulationExportViewProps {
  neurons: Neuron[];
}

export function SimulationExportView({ neurons }: SimulationExportViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const groups = new Map<string, Neuron[]>();
    SUBREGIONS.forEach((r) => groups.set(r, []));
    neurons.forEach((n) => {
      const list = groups.get(n.subregion_id);
      if (list) list.push(n);
    });
    return groups;
  }, [neurons]);

  const filteredGrouped = useMemo(() => {
    if (!search) return grouped;
    const filtered = new Map<string, Neuron[]>();
    grouped.forEach((neurons, region) => {
      const matches = neurons.filter((n) =>
        n.nickname.toLowerCase().includes(search.toLowerCase())
      );
      if (matches.length > 0) filtered.set(region, matches);
    });
    return filtered;
  }, [grouped, search]);

  function toggleNeuron(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRegion(region: string) {
    const regionNeurons = grouped.get(region) ?? [];
    const allSelected = regionNeurons.every((n) => selectedIds.has(n.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      regionNeurons.forEach((n) => {
        if (allSelected) next.delete(n.id);
        else next.add(n.id);
      });
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(neurons.map((n) => n.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  async function downloadBundle(format: "json" | "csv") {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/export/simulation-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neuron_ids: Array.from(selectedIds),
          format,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Export failed");
        return;
      }

      if (format === "json") {
        const data = await res.json();
        downloadFile(
          JSON.stringify(data, null, 2),
          "hippocampome_simulation_params.json",
          "application/json"
        );
      } else {
        const text = await res.text();
        downloadFile(text, "hippocampome_simulation_params.csv");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left: Neuron selector */}
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filter neurons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            onClick={selectAll}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Clear
          </button>
          <span className="text-sm text-gray-400">
            {selectedIds.size} of {neurons.length} selected
          </span>
        </div>

        {/* Grouped neuron list */}
        <div className="space-y-3">
          {Array.from(filteredGrouped.entries()).map(
            ([region, regionNeurons]) => {
              const allSelected = regionNeurons.every((n) =>
                selectedIds.has(n.id)
              );
              const someSelected = regionNeurons.some((n) =>
                selectedIds.has(n.id)
              );

              return (
                <div
                  key={region}
                  className="rounded-xl border border-gray-200 bg-white"
                >
                  {/* Region header */}
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => toggleRegion(region)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <SubregionBadge subregion={region} size="sm" />
                    <span className="text-sm font-medium text-gray-700">
                      {region}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({regionNeurons.length} types)
                    </span>
                  </div>

                  {/* Neuron checkboxes */}
                  <div className="grid gap-0.5 p-2 sm:grid-cols-2">
                    {regionNeurons.map((n) => (
                      <label
                        key={n.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          selectedIds.has(n.id)
                            ? "bg-blue-50 text-blue-800"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(n.id)}
                          onChange={() => toggleNeuron(n.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                        />
                        <span className="truncate">{n.nickname}</span>
                        <span
                          className={`ml-auto h-2 w-2 shrink-0 rounded-full ${
                            n.excit_inhib === "excitatory"
                              ? "bg-green-500"
                              : n.excit_inhib === "inhibitory"
                                ? "bg-red-500"
                                : "bg-gray-400"
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Right: Preview & Download */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Export Bundle
          </h3>

          {selectedIds.size === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              Select neuron types from the left panel to build your export
              bundle.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Neuron types</span>
                  <span className="font-medium">{selectedIds.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subregions</span>
                  <span className="font-medium">
                    {
                      new Set(
                        neurons
                          .filter((n) => selectedIds.has(n.id))
                          .map((n) => n.subregion_id)
                      ).size
                    }
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Bundle includes: Izhikevich model parameters, population
                counts, firing pattern classification, connectivity between
                selected neurons, synapse probabilities, and Tsodyks-Markram
                parameters.
              </p>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => downloadBundle("json")}
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Exporting..." : "Download JSON"}
                </button>
                <button
                  onClick={() => downloadBundle("csv")}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? "Exporting..." : "Download CSV"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
