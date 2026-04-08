import { createServerSupabase } from "@/lib/supabase/server";
import { ConnectivityView } from "./ConnectivityView";

export const revalidate = 3600;

export const metadata = {
  title: "Connectivity — Hippocampome",
  description:
    "Explore connections between neuron types in the rodent hippocampus.",
};

export default async function ConnectivityPage() {
  const supabase = await createServerSupabase();

  const [neuronsRes, connectionsRes] = await Promise.all([
    supabase
      .from("neuron_type")
      .select("id, nickname, subregion_id, excit_inhib, position")
      .eq("status", "active")
      .order("position"),
    supabase
      .from("connectivity_data")
      .select("source_type_id, target_type_id, layers"),
  ]);

  if (neuronsRes.error || connectionsRes.error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-red-500">
          Failed to load connectivity data:{" "}
          {neuronsRes.error?.message || connectionsRes.error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Connectivity</h1>
        <p className="mt-1 text-sm text-gray-500">
          {connectionsRes.data.length.toLocaleString()} known connections
          between {neuronsRes.data.length} neuron types
        </p>
      </div>

      <ConnectivityView
        neurons={neuronsRes.data}
        connections={connectionsRes.data}
      />
    </div>
  );
}
