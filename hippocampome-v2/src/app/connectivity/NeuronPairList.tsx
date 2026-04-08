"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SubregionBadge } from "@/components/ui/SubregionBadge";

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

interface NeuronPairListProps {
  neurons: Neuron[];
  connections: Connection[];
  sourceRegion: string;
  targetRegion: string;
  onSelectConnection: (
    sourceId: number,
    targetId: number,
    sourceNickname: string,
    targetNickname: string
  ) => void;
  onBack: () => void;
}

export function NeuronPairList({
  neurons,
  connections,
  sourceRegion,
  targetRegion,
  onSelectConnection,
  onBack,
}: NeuronPairListProps) {
  const neuronMap = useMemo(() => {
    const m = new Map<number, Neuron>();
    neurons.forEach((n) => m.set(n.id, n));
    return m;
  }, [neurons]);

  const filtered = useMemo(() => {
    return connections.filter((c) => {
      const source = neuronMap.get(c.source_type_id);
      const target = neuronMap.get(c.target_type_id);
      if (!source || !target) return false;
      return (
        source.subregion_id === sourceRegion &&
        target.subregion_id === targetRegion
      );
    });
  }, [connections, neuronMap, sourceRegion, targetRegion]);

  const isSameRegion = sourceRegion === targetRegion;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isSameRegion
              ? `Within ${sourceRegion}`
              : `${sourceRegion} → ${targetRegion}`}
          </h3>
          <p className="text-sm text-gray-500">
            {filtered.length} neuron-type connections
          </p>
        </div>
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Back to overview
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-2 py-3" />
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Layers</th>
              <th className="px-4 py-3 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => {
              const source = neuronMap.get(c.source_type_id)!;
              const target = neuronMap.get(c.target_type_id)!;
              return (
                <tr
                  key={`${c.source_type_id}-${c.target_type_id}`}
                  className="cursor-pointer transition-colors hover:bg-blue-50"
                  onClick={() =>
                    onSelectConnection(
                      c.source_type_id,
                      c.target_type_id,
                      source.nickname,
                      target.nickname
                    )
                  }
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          source.excit_inhib === "excitatory"
                            ? "bg-green-500"
                            : source.excit_inhib === "inhibitory"
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium text-gray-900">
                        {source.nickname}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-gray-300">→</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          target.excit_inhib === "excitatory"
                            ? "bg-green-500"
                            : target.excit_inhib === "inhibitory"
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium text-gray-900">
                        {target.nickname}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{c.layers}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-blue-600">View →</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-400">
          No connections found between {sourceRegion} and {targetRegion}.
        </div>
      )}
    </div>
  );
}
