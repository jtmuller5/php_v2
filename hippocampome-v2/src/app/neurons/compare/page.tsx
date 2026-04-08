import { createServerSupabase } from "@/lib/supabase/server";
import { CompareView } from "./CompareView";

export const metadata = {
  title: "Compare Neurons — Hippocampome",
  description: "Compare neuron types side by side.",
};

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabase();

  // Fetch all neurons for the selector
  const { data: allNeurons } = await supabase
    .from("neuron_type")
    .select("id, nickname, subregion_id, excit_inhib")
    .eq("status", "active")
    .order("position");

  // Fetch selected neurons with full data
  const selectedIds = (params.ids ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);

  let selectedNeurons: Record<string, unknown>[] = [];

  if (selectedIds.length > 0) {
    const { data } = await supabase
      .from("neuron_type")
      .select("*")
      .in("id", selectedIds);
    selectedNeurons = data ?? [];
  }

  // Fetch related data for selected neurons
  const populationData = new Map<number, { count_value: number | null; lower_bound: number | null; upper_bound: number | null }>();
  const connectionCounts = new Map<number, { outgoing: number; incoming: number }>();
  const firingPatternData = new Map<number, { overall_fp: string | null; isi_avg_ms: number | null }[]>();

  if (selectedIds.length > 0) {
    const [popRes, connRes, fpRes] = await Promise.all([
      supabase
        .from("population_count")
        .select("type_id, count_value, lower_bound, upper_bound")
        .in("type_id", selectedIds),
      supabase
        .from("connectivity_data")
        .select("source_type_id, target_type_id")
        .or(
          selectedIds.map((id) => `source_type_id.eq.${id}`).join(",") +
            "," +
            selectedIds.map((id) => `target_type_id.eq.${id}`).join(",")
        ),
      supabase
        .from("firing_pattern")
        .select("type_id, overall_fp, isi_avg_ms")
        .in("type_id", selectedIds),
    ]);

    popRes.data?.forEach((p) => {
      populationData.set(p.type_id, p);
    });

    // Count connections per neuron
    selectedIds.forEach((id) => {
      const outgoing =
        connRes.data?.filter((c) => c.source_type_id === id).length ?? 0;
      const incoming =
        connRes.data?.filter((c) => c.target_type_id === id).length ?? 0;
      connectionCounts.set(id, { outgoing, incoming });
    });

    // Group firing patterns
    fpRes.data?.forEach((fp) => {
      if (!firingPatternData.has(fp.type_id)) {
        firingPatternData.set(fp.type_id, []);
      }
      firingPatternData.get(fp.type_id)!.push(fp);
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Compare Neurons</h1>
      <p className="mt-1 text-sm text-gray-500">
        Select neuron types to compare side by side
      </p>

      <CompareView
        allNeurons={allNeurons ?? []}
        selectedNeurons={selectedNeurons}
        selectedIds={selectedIds}
        populationData={Object.fromEntries(populationData)}
        connectionCounts={Object.fromEntries(connectionCounts)}
        firingPatternData={Object.fromEntries(firingPatternData)}
      />
    </div>
  );
}
