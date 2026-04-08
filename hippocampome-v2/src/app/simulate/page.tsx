import { createServerSupabase } from "@/lib/supabase/server";
import { NetworkSimulatorView } from "./NetworkSimulatorView";

export const revalidate = 3600;

export const metadata = {
  title: "Network Simulator — Hippocampome",
  description:
    "Run small-scale spiking neural network simulations with real Hippocampome parameters.",
};

export default async function SimulatePage() {
  const supabase = await createServerSupabase();

  // Fetch neurons with Izhikevich params and connectivity data
  const [neuronsRes, izhRes, connRes, spRes] = await Promise.all([
    supabase
      .from("neuron_type")
      .select("id, nickname, subregion_id, excit_inhib")
      .eq("status", "active")
      .order("position"),
    supabase
      .from("izh_model")
      .select(
        "type_id, izh_compartment(compartment_index, k, a, b, d, capacitance, v_rest, v_threshold, v_peak, v_min)"
      )
      .eq("preferred", true),
    supabase
      .from("connectivity_data")
      .select("source_type_id, target_type_id, layers"),
    supabase
      .from("synapse_probability")
      .select("source_type_id, target_type_id, sp_mean"),
  ]);

  // Build Izhikevich param lookup
  const izhMap: Record<
    number,
    {
      k: number;
      a: number;
      b: number;
      d: number;
      C: number;
      Vr: number;
      Vt: number;
      Vpeak: number;
      Vmin: number;
    }
  > = {};

  (izhRes.data ?? []).forEach((m) => {
    const comps = Array.isArray(m.izh_compartment)
      ? m.izh_compartment
      : m.izh_compartment
        ? [m.izh_compartment]
        : [];
    const soma = (comps as Record<string, unknown>[]).find(
      (c) => c.compartment_index === 0
    );
    if (soma) {
      izhMap[m.type_id] = {
        k: (soma.k as number) ?? 1,
        a: (soma.a as number) ?? 0.1,
        b: (soma.b as number) ?? 0,
        d: (soma.d as number) ?? 100,
        C: (soma.capacitance as number) ?? 50,
        Vr: (soma.v_rest as number) ?? -60,
        Vt: (soma.v_threshold as number) ?? -40,
        Vpeak: (soma.v_peak as number) ?? 35,
        Vmin: (soma.v_min as number) ?? -50,
      };
    }
  });

  // Build synapse probability lookup
  const spMap: Record<string, number> = {};
  (spRes.data ?? []).forEach((r) => {
    if (r.sp_mean != null) {
      spMap[`${r.source_type_id}-${r.target_type_id}`] = r.sp_mean;
    }
  });

  // Build connection set
  const connectionSet = new Set<string>();
  (connRes.data ?? []).forEach((c) => {
    connectionSet.add(`${c.source_type_id}-${c.target_type_id}`);
  });

  // Serialize for client
  const neurons = (neuronsRes.data ?? [])
    .filter((n) => izhMap[n.id]) // only neurons with Izh params
    .map((n) => ({
      id: n.id,
      nickname: n.nickname,
      subregion_id: n.subregion_id,
      excit_inhib: n.excit_inhib,
      izh: izhMap[n.id],
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Network Simulator
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Select neuron types to build a small-scale spiking neural network.
          Neurons are connected using real Hippocampome connectivity and synapse
          parameters, then simulated with coupled Izhikevich models.
        </p>
      </div>

      <div className="mt-6">
        <NetworkSimulatorView
          neurons={neurons}
          connectionSet={Array.from(connectionSet)}
          spMap={spMap}
        />
      </div>
    </div>
  );
}
