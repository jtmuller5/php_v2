import { createServerSupabase } from "@/lib/supabase/server";
import { GeneExpressionView } from "./GeneExpressionView";

export const revalidate = 3600;

export const metadata = {
  title: "Gene Expression — Hippocampome",
  description:
    "Gene expression levels across hippocampal parcels with confidence ratings.",
};

export default async function GeneExpressionPage() {
  const supabase = await createServerSupabase();

  const [genesRes, neuronsRes] = await Promise.all([
    supabase
      .from("gene_expression")
      .select(
        "gene_name, parcel, expression_level, confidence, type_id, neuron_type:type_id(nickname, subregion_id)"
      )
      .order("gene_name")
      .limit(2000),
    supabase
      .from("neuron_type")
      .select("id, nickname, subregion_id")
      .eq("status", "active")
      .order("position"),
  ]);

  // Get unique gene names
  const geneNames = [
    ...new Set((genesRes.data ?? []).map((g) => g.gene_name)),
  ].sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Gene Expression</h1>
      <p className="mt-1 text-sm text-gray-500">
        Expression levels across hippocampal parcels with confidence ratings
      </p>

      <div className="mt-6">
        <GeneExpressionView
          data={genesRes.data ?? []}
          geneNames={geneNames}
          neurons={neuronsRes.data ?? []}
        />
      </div>
    </div>
  );
}
