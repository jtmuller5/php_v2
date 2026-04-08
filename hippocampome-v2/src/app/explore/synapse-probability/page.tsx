import { createServerSupabase } from "@/lib/supabase/server";
import { SynapseProbabilityTable } from "./SynapseProbabilityTable";

export const revalidate = 3600;

export const metadata = {
  title: "Synapse Probability — Hippocampome",
  description: "Synaptic connection probabilities between neuron type pairs.",
};

export default async function SynapseProbabilityPage() {
  const supabase = await createServerSupabase();

  const [neuronsRes, spRes] = await Promise.all([
    supabase
      .from("neuron_type")
      .select("id, nickname, subregion_id")
      .eq("status", "active")
      .order("position"),
    supabase
      .from("synapse_probability")
      .select("source_type_id, target_type_id, sp_mean, sp_stdev")
      .not("sp_mean", "is", null)
      .order("sp_mean", { ascending: false })
      .limit(500),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Synapse Probability
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Connection probabilities between neuron type pairs, sorted by highest
        probability
      </p>

      <div className="mt-6">
        <SynapseProbabilityTable
          neurons={neuronsRes.data ?? []}
          data={spRes.data ?? []}
        />
      </div>
    </div>
  );
}
