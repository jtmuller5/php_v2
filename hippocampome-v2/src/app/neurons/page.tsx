import { createServerSupabase } from "@/lib/supabase/server";
import { getAllNeurons } from "@/lib/queries/neurons";
import { NeuronCard } from "@/components/neuron/NeuronCard";
import { NeuronFilters } from "./NeuronFilters";

export const revalidate = 3600;

export const metadata = {
  title: "Neuron Types — Hippocampome",
  description: "Browse all neuron types in the rodent hippocampus.",
};

interface PageProps {
  searchParams: Promise<{ region?: string; type?: string }>;
}

export default async function NeuronsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabase();

  let query = supabase
    .from("neuron_type")
    .select("id, name, nickname, subregion_id, excit_inhib, status, position")
    .eq("status", "active")
    .order("position");

  if (params.region) {
    query = query.eq("subregion_id", params.region);
  }

  if (params.type === "excitatory" || params.type === "inhibitory") {
    query = query.eq("excit_inhib", params.type);
  }

  const { data: neurons, error } = await query;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-red-500">Failed to load neurons: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neuron Types</h1>
          <p className="mt-1 text-sm text-gray-500">
            {neurons?.length ?? 0} neuron types
            {params.region ? ` in ${params.region}` : ""}
          </p>
        </div>
      </div>

      <NeuronFilters
        currentRegion={params.region}
        currentType={params.type}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {neurons?.map((neuron) => (
          <NeuronCard
            key={neuron.id}
            id={neuron.id}
            nickname={neuron.nickname}
            name={neuron.name}
            subregion={neuron.subregion_id}
            excitInhib={neuron.excit_inhib as "excitatory" | "inhibitory" | "unknown"}
          />
        ))}
      </div>

      {neurons?.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-gray-500">
            No neuron types found for the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
