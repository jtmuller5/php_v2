"use client";

import { useState, useMemo } from "react";
import type { NeuronCompleteness, ConnectionCompleteness } from "@/lib/queries/gaps";
import { GapHeatmap } from "./GapHeatmap";
import { ConnectionGapTable } from "./ConnectionGapTable";
import { toCSV, downloadFile } from "@/lib/utils/export";

const TABS = [
  { id: "neuron", label: "Neuron Types" },
  { id: "connection", label: "Connections" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SUBREGIONS = ["DG", "CA3", "CA2", "CA1", "Sub", "EC"];

interface DataGapsViewProps {
  neuronGaps: NeuronCompleteness[];
  connectionGaps: ConnectionCompleteness[];
}

export function DataGapsView({
  neuronGaps,
  connectionGaps,
}: DataGapsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("neuron");
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(SUBREGIONS)
  );
  const [sortBy, setSortBy] = useState<"name" | "completeness">(
    "completeness"
  );

  function toggleRegion(region: string) {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  }

  // Summary stats
  const neuronStats = useMemo(() => {
    const total = neuronGaps.length;
    const complete = neuronGaps.filter((n) => n.completeness === 1).length;
    const avg =
      neuronGaps.reduce((sum, n) => sum + n.completeness, 0) / total;
    return { total, complete, avg };
  }, [neuronGaps]);

  const connStats = useMemo(() => {
    const total = connectionGaps.length;
    const complete = connectionGaps.filter((c) => c.completeness === 1).length;
    const avg =
      connectionGaps.reduce((sum, c) => sum + c.completeness, 0) / total;
    return { total, complete, avg };
  }, [connectionGaps]);

  function exportNeuronGaps() {
    const data = neuronGaps.map((n) => ({
      neuron_id: n.neuron_id,
      nickname: n.nickname,
      subregion: n.subregion_id,
      morphology: n.has_morphology ? "Yes" : "No",
      electrophysiology: n.has_ephys ? "Yes" : "No",
      markers: n.has_markers ? "Yes" : "No",
      firing_patterns: n.has_firing_pattern ? "Yes" : "No",
      izhikevich_model: n.has_izh_model ? "Yes" : "No",
      population_count: n.has_population ? "Yes" : "No",
      completeness_pct: Math.round(n.completeness * 100),
    }));
    downloadFile(toCSV(data), "hippocampome_neuron_data_gaps.csv");
  }

  function exportConnectionGaps() {
    const data = connectionGaps.map((c) => ({
      source_id: c.source_type_id,
      source: c.source_nickname,
      source_region: c.source_subregion,
      target_id: c.target_type_id,
      target: c.target_nickname,
      target_region: c.target_subregion,
      synapse_probability: c.has_synapse_prob ? "Yes" : "No",
      number_of_contacts: c.has_noc ? "Yes" : "No",
      tm_parameters: c.has_tm_params ? "Yes" : "No",
      completeness_pct: Math.round(c.completeness * 100),
    }));
    downloadFile(toCSV(data), "hippocampome_connection_data_gaps.csv");
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Neuron Types</p>
          <p className="mt-1 text-2xl font-semibold">{neuronStats.total}</p>
          <p className="text-xs text-gray-400">
            {neuronStats.complete} fully complete
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Avg Neuron Completeness</p>
          <p className="mt-1 text-2xl font-semibold">
            {Math.round(neuronStats.avg * 100)}%
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Connections</p>
          <p className="mt-1 text-2xl font-semibold">
            {connStats.total.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {connStats.complete} fully characterized
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Avg Connection Completeness</p>
          <p className="mt-1 text-2xl font-semibold">
            {Math.round(connStats.avg * 100)}%
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Tab toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
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

        {/* Sort (neuron tab only) */}
        {activeTab === "neuron" && (
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "name" | "completeness")
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value="completeness">Sort by completeness</option>
            <option value="name">Sort by name</option>
          </select>
        )}

        {/* Export */}
        <button
          onClick={
            activeTab === "neuron" ? exportNeuronGaps : exportConnectionGaps
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      {/* Content */}
      {activeTab === "neuron" && (
        <GapHeatmap
          data={neuronGaps}
          selectedRegions={selectedRegions}
          sortBy={sortBy}
        />
      )}
      {activeTab === "connection" && (
        <ConnectionGapTable
          data={connectionGaps}
          selectedRegions={selectedRegions}
        />
      )}
    </div>
  );
}
