import { createServerSupabase } from "@/lib/supabase/server";
import { getNeuronCompleteness, getConnectionCompleteness } from "@/lib/queries/gaps";
import { DataGapsView } from "./DataGapsView";

export const revalidate = 3600;

export const metadata = {
  title: "Data Gaps — Hippocampome",
  description:
    "Identify missing data across neuron types and connections in the Hippocampome database.",
};

export default async function DataGapsPage() {
  const supabase = await createServerSupabase();

  const [neuronGaps, connectionGaps] = await Promise.all([
    getNeuronCompleteness(supabase),
    getConnectionCompleteness(supabase),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Gaps</h1>
        <p className="mt-1 text-sm text-gray-500">
          Identify missing data across neuron types and connections. Green =
          data present, red = missing.
        </p>
      </div>

      <div className="mt-6">
        <DataGapsView
          neuronGaps={neuronGaps}
          connectionGaps={connectionGaps}
        />
      </div>
    </div>
  );
}
