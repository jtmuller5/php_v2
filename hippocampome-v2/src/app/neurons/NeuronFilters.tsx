"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const SUBREGIONS = ["DG", "CA3", "CA2", "CA1", "Sub", "EC"];
const TYPES = [
  { value: undefined, label: "All" },
  { value: "excitatory", label: "Excitatory" },
  { value: "inhibitory", label: "Inhibitory" },
];

interface NeuronFiltersProps {
  currentRegion?: string;
  currentType?: string;
}

export function NeuronFilters({
  currentRegion,
  currentType,
}: NeuronFiltersProps) {
  const searchParams = useSearchParams();

  function buildUrl(region?: string, type?: string) {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (type) params.set("type", type);
    const qs = params.toString();
    return `/neurons${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mt-6 flex flex-wrap gap-6">
      {/* Region filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Region:</span>
        <div className="flex gap-1">
          <Link
            href={buildUrl(undefined, currentType)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              !currentRegion
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </Link>
          {SUBREGIONS.map((region) => (
            <Link
              key={region}
              href={buildUrl(region, currentType)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentRegion === region
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {region}
            </Link>
          ))}
        </div>
      </div>

      {/* E/I filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Type:</span>
        <div className="flex gap-1">
          {TYPES.map((type) => (
            <Link
              key={type.label}
              href={buildUrl(currentRegion, type.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentType === type.value || (!currentType && !type.value)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
