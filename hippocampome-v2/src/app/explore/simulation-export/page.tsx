import { createServerSupabase } from "@/lib/supabase/server";
import { SimulationExportView } from "./SimulationExportView";

export const revalidate = 3600;

export const metadata = {
  title: "Simulation Export — Hippocampome",
  description:
    "Select neuron types and download complete simulation parameter bundles.",
};

export default async function SimulationExportPage() {
  const supabase = await createServerSupabase();

  const { data: neurons } = await supabase
    .from("neuron_type")
    .select("id, nickname, subregion_id, excit_inhib")
    .eq("status", "active")
    .order("position");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Simulation Export
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Select neuron types and download bundled parameters for spiking neural
          network simulations. Includes Izhikevich model, connectivity, and
          Tsodyks-Markram synapse parameters.
        </p>
      </div>

      <div className="mt-6">
        <SimulationExportView neurons={neurons ?? []} />
      </div>
    </div>
  );
}
