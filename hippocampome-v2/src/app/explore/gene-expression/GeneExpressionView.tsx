"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { formatNumber } from "@/lib/utils/format";

interface GeneRow {
  gene_name: string;
  parcel: string;
  expression_level: number | null;
  confidence: number | null;
  type_id: number;
  neuron_type: { nickname: string; subregion_id: string } | { nickname: string; subregion_id: string }[] | null;
}

interface Neuron {
  id: number;
  nickname: string;
  subregion_id: string;
}

interface Props {
  data: GeneRow[];
  geneNames: string[];
  neurons: Neuron[];
}

export function GeneExpressionView({ data, geneNames, neurons }: Props) {
  const [selectedGene, setSelectedGene] = useState(geneNames[0] ?? "");
  const [searchGene, setSearchGene] = useState("");

  const filteredGeneNames = useMemo(() => {
    if (!searchGene) return geneNames;
    return geneNames.filter((g) =>
      g.toLowerCase().includes(searchGene.toLowerCase())
    );
  }, [geneNames, searchGene]);

  const geneData = useMemo(() => {
    return data.filter((d) => d.gene_name === selectedGene);
  }, [data, selectedGene]);

  function getNeuron(row: GeneRow) {
    if (!row.neuron_type) return null;
    return Array.isArray(row.neuron_type)
      ? row.neuron_type[0]
      : row.neuron_type;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* Gene selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <input
          type="text"
          placeholder="Search genes..."
          value={searchGene}
          onChange={(e) => setSearchGene(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
        />
        <div className="mt-3 max-h-96 space-y-0.5 overflow-y-auto">
          {filteredGeneNames.map((gene) => (
            <button
              key={gene}
              onClick={() => setSelectedGene(gene)}
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                selectedGene === gene
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {gene}
            </button>
          ))}
          {filteredGeneNames.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              No genes found
            </p>
          )}
        </div>
      </div>

      {/* Expression data */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedGene || "Select a gene"}
          </h2>
          <p className="text-sm text-gray-500">
            {geneData.length} expression records
          </p>
        </div>

        {geneData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Neuron Type</th>
                  <th className="px-4 py-3 font-medium">Parcel</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Expression Level
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {geneData.map((row, i) => {
                  const neuron = getNeuron(row);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {neuron && (
                          <Link
                            href={`/neurons/${row.type_id}`}
                            className="flex items-center gap-2"
                          >
                            <SubregionBadge
                              subregion={neuron.subregion_id}
                              size="sm"
                            />
                            <span className="font-medium text-blue-600 hover:underline">
                              {neuron.nickname}
                            </span>
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {row.parcel}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-800">
                        {row.expression_level != null
                          ? formatNumber(row.expression_level, 3)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.confidence != null ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.confidence >= 0.8
                                ? "bg-green-100 text-green-700"
                                : row.confidence >= 0.5
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {formatNumber(row.confidence, 2)}
                          </span>
                        ) : (
                          "\u2014"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            {selectedGene
              ? "No expression data for this gene."
              : "Select a gene from the list."}
          </div>
        )}
      </div>
    </div>
  );
}
