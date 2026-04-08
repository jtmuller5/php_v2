"use client";

import { useState, useMemo } from "react";
import { SubregionFlowDiagram } from "./SubregionFlowDiagram";
import { NeuronPairList } from "./NeuronPairList";
import { ConnectionDetailPanel } from "./ConnectionDetailPanel";

interface Neuron {
  id: number;
  nickname: string;
  subregion_id: string;
  excit_inhib: string;
}

interface Connection {
  source_type_id: number;
  target_type_id: number;
  layers: string;
}

type DrillLevel = "subregion" | "neuron-pairs" | "connection-detail";

interface ExplorerViewProps {
  neurons: Neuron[];
  connections: Connection[];
}

export function ExplorerView({ neurons, connections }: ExplorerViewProps) {
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("subregion");
  const [selectedPair, setSelectedPair] = useState<{
    source: string;
    target: string;
  } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{
    sourceId: number;
    targetId: number;
    sourceNickname: string;
    targetNickname: string;
  } | null>(null);

  // Compute subregion-to-subregion aggregation
  const neuronMap = useMemo(() => {
    const m = new Map<number, Neuron>();
    neurons.forEach((n) => m.set(n.id, n));
    return m;
  }, [neurons]);

  const subregionConnections = useMemo(() => {
    const counts = new Map<string, number>();
    connections.forEach((c) => {
      const source = neuronMap.get(c.source_type_id);
      const target = neuronMap.get(c.target_type_id);
      if (!source || !target) return;
      const key = `${source.subregion_id}-${target.subregion_id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [connections, neuronMap]);

  const subregionNeuronCounts = useMemo(() => {
    const counts = new Map<string, number>();
    neurons.forEach((n) => {
      counts.set(n.subregion_id, (counts.get(n.subregion_id) ?? 0) + 1);
    });
    return counts;
  }, [neurons]);

  function handleSelectSubregionPair(source: string, target: string) {
    setSelectedPair({ source, target });
    setDrillLevel("neuron-pairs");
  }

  function handleSelectConnection(
    sourceId: number,
    targetId: number,
    sourceNickname: string,
    targetNickname: string
  ) {
    setSelectedConnection({ sourceId, targetId, sourceNickname, targetNickname });
    setDrillLevel("connection-detail");
  }

  function handleBack() {
    if (drillLevel === "connection-detail") {
      setSelectedConnection(null);
      setDrillLevel("neuron-pairs");
    } else if (drillLevel === "neuron-pairs") {
      setSelectedPair(null);
      setDrillLevel("subregion");
    }
  }

  // Breadcrumb
  const breadcrumbs = [
    { label: "Subregion Overview", level: "subregion" as DrillLevel },
    ...(selectedPair
      ? [
          {
            label: `${selectedPair.source} → ${selectedPair.target}`,
            level: "neuron-pairs" as DrillLevel,
          },
        ]
      : []),
    ...(selectedConnection
      ? [
          {
            label: `${selectedConnection.sourceNickname} → ${selectedConnection.targetNickname}`,
            level: "connection-detail" as DrillLevel,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb trail */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.level} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">→</span>}
            {crumb.level === drillLevel ? (
              <span className="font-medium text-gray-900">{crumb.label}</span>
            ) : (
              <button
                onClick={() => {
                  setDrillLevel(crumb.level);
                  if (crumb.level === "subregion") {
                    setSelectedPair(null);
                    setSelectedConnection(null);
                  } else if (crumb.level === "neuron-pairs") {
                    setSelectedConnection(null);
                  }
                }}
                className="text-blue-600 hover:underline"
              >
                {crumb.label}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* Level content */}
      {drillLevel === "subregion" && (
        <SubregionFlowDiagram
          subregionConnections={subregionConnections}
          subregionNeuronCounts={subregionNeuronCounts}
          onSelectPair={handleSelectSubregionPair}
        />
      )}

      {drillLevel === "neuron-pairs" && selectedPair && (
        <NeuronPairList
          neurons={neurons}
          connections={connections}
          sourceRegion={selectedPair.source}
          targetRegion={selectedPair.target}
          onSelectConnection={handleSelectConnection}
          onBack={handleBack}
        />
      )}

      {drillLevel === "connection-detail" && selectedConnection && (
        <ConnectionDetailPanel
          sourceId={selectedConnection.sourceId}
          targetId={selectedConnection.targetId}
          sourceNickname={selectedConnection.sourceNickname}
          targetNickname={selectedConnection.targetNickname}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
