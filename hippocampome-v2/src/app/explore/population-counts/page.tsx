import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { formatPopulation } from "@/lib/utils/format";

export const revalidate = 3600;

export const metadata = {
  title: "Population Counts — Hippocampome",
  description: "Estimated neuron population sizes in the rodent hippocampus.",
};

export default async function PopulationCountsPage() {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("population_count")
    .select(
      "type_id, count_value, lower_bound, upper_bound, neuron_type:type_id(id, nickname, subregion_id, excit_inhib)"
    )
    .not("count_value", "is", null)
    .order("count_value", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  // Find max for bar scaling
  const maxCount = Math.max(
    ...(data ?? []).map((d) => d.count_value ?? 0),
    1
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Population Counts</h1>
      <p className="mt-1 text-sm text-gray-500">
        Estimated number of neurons per type in the rodent hippocampus
      </p>

      <div className="mt-8 space-y-2">
        {data?.map((row) => {
          const neuron = Array.isArray(row.neuron_type)
            ? row.neuron_type[0]
            : row.neuron_type;
          if (!neuron) return null;
          const pct = ((row.count_value ?? 0) / maxCount) * 100;

          return (
            <div
              key={row.type_id}
              className="group flex items-center gap-4 rounded-lg border border-gray-100 bg-white px-4 py-3 transition-colors hover:border-gray-200"
            >
              <div className="w-40 shrink-0">
                <Link
                  href={`/neurons/${neuron.id}`}
                  className="flex items-center gap-2"
                >
                  <SubregionBadge
                    subregion={neuron.subregion_id}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {neuron.nickname}
                  </span>
                </Link>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        neuron.excit_inhib === "excitatory"
                          ? "bg-green-400"
                          : neuron.excit_inhib === "inhibitory"
                            ? "bg-red-400"
                            : "bg-gray-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-36 shrink-0 text-right">
                    <span className="text-sm font-semibold text-gray-700">
                      {(row.count_value ?? 0).toLocaleString()}
                    </span>
                    {row.lower_bound != null && row.upper_bound != null && (
                      <p className="text-xs text-gray-400">
                        {row.lower_bound.toLocaleString()}–{row.upper_bound.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(!data || data.length === 0) && (
        <p className="mt-8 text-center text-gray-400">
          No population count data available.
        </p>
      )}
    </div>
  );
}
