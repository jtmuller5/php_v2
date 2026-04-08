import { SupabaseClient } from "@supabase/supabase-js";
import type {
  SimulationBundle,
  SimulationNeuronParams,
  SimulationConnectionParams,
} from "@/types/simulation";

export async function getSimulationBundle(
  client: SupabaseClient,
  neuronIds: number[]
): Promise<SimulationBundle> {
  const [neuronsRes, izhRes, popRes, fpRes, connRes, spRes, nocRes, tmRes] =
    await Promise.all([
      client
        .from("neuron_type")
        .select("id, nickname, subregion_id, excit_inhib")
        .in("id", neuronIds),
      client
        .from("izh_model")
        .select("type_id, preferred, izh_compartment(compartment_index, k, a, b, d, capacitance, v_rest, v_threshold, v_peak, v_min)")
        .in("type_id", neuronIds)
        .eq("preferred", true),
      client
        .from("population_count")
        .select("type_id, count_value, lower_bound, upper_bound")
        .in("type_id", neuronIds),
      client
        .from("firing_pattern")
        .select("type_id, overall_fp")
        .in("type_id", neuronIds),
      client
        .from("connectivity_data")
        .select("source_type_id, target_type_id, layers")
        .in("source_type_id", neuronIds)
        .in("target_type_id", neuronIds),
      client
        .from("synapse_probability")
        .select("source_type_id, target_type_id, sp_mean, sp_stdev")
        .in("source_type_id", neuronIds)
        .in("target_type_id", neuronIds),
      client
        .from("number_of_contacts")
        .select("source_type_id, target_type_id, noc_mean, noc_stdev")
        .in("source_type_id", neuronIds)
        .in("target_type_id", neuronIds),
      client
        .from("tm_synapse_model")
        .select(
          "source_type_id, target_type_id, conductance_mean, tau_d_mean, tau_r_mean, tau_f_mean, utilization_mean"
        )
        .in("source_type_id", neuronIds)
        .in("target_type_id", neuronIds),
    ]);

  // Build lookup maps
  const neuronMap = new Map(
    (neuronsRes.data ?? []).map((n) => [n.id, n])
  );

  const izhMap = new Map<number, Record<string, unknown>>();
  (izhRes.data ?? []).forEach((m) => {
    const comps = Array.isArray(m.izh_compartment)
      ? m.izh_compartment
      : m.izh_compartment
        ? [m.izh_compartment]
        : [];
    const soma = (comps as Record<string, unknown>[]).find(
      (c) => c.compartment_index === 0
    );
    if (soma) izhMap.set(m.type_id, soma);
  });

  const popMap = new Map(
    (popRes.data ?? []).map((p) => [p.type_id, p])
  );
  const fpMap = new Map(
    (fpRes.data ?? []).map((f) => [f.type_id, f.overall_fp])
  );

  // Build neuron params
  const neurons: SimulationNeuronParams[] = neuronIds
    .map((id) => {
      const n = neuronMap.get(id);
      if (!n) return null;
      const izh = izhMap.get(id);
      const pop = popMap.get(id);
      return {
        id: n.id,
        nickname: n.nickname,
        subregion: n.subregion_id,
        excit_inhib: n.excit_inhib,
        population_count: pop?.count_value ?? null,
        population_lower: pop?.lower_bound ?? null,
        population_upper: pop?.upper_bound ?? null,
        firing_pattern: fpMap.get(id) ?? null,
        izh_k: (izh?.k as number) ?? null,
        izh_a: (izh?.a as number) ?? null,
        izh_b: (izh?.b as number) ?? null,
        izh_d: (izh?.d as number) ?? null,
        izh_C: (izh?.capacitance as number) ?? null,
        izh_Vr: (izh?.v_rest as number) ?? null,
        izh_Vt: (izh?.v_threshold as number) ?? null,
        izh_Vpeak: (izh?.v_peak as number) ?? null,
        izh_Vmin: (izh?.v_min as number) ?? null,
      };
    })
    .filter(Boolean) as SimulationNeuronParams[];

  // Build connection params
  const spKey = (s: number, t: number) => `${s}-${t}`;
  const spMap = new Map(
    (spRes.data ?? []).map((r) => [
      spKey(r.source_type_id, r.target_type_id),
      r,
    ])
  );
  const nocMap = new Map(
    (nocRes.data ?? []).map((r) => [
      spKey(r.source_type_id, r.target_type_id),
      r,
    ])
  );
  const tmMap = new Map(
    (tmRes.data ?? []).map((r) => [
      spKey(r.source_type_id, r.target_type_id),
      r,
    ])
  );

  const connections: SimulationConnectionParams[] = (connRes.data ?? []).map(
    (c) => {
      const k = spKey(c.source_type_id, c.target_type_id);
      const sp = spMap.get(k);
      const noc = nocMap.get(k);
      const tm = tmMap.get(k);
      return {
        source_id: c.source_type_id,
        source_nickname:
          neuronMap.get(c.source_type_id)?.nickname ?? String(c.source_type_id),
        target_id: c.target_type_id,
        target_nickname:
          neuronMap.get(c.target_type_id)?.nickname ?? String(c.target_type_id),
        layers: c.layers,
        sp_mean: sp?.sp_mean ?? null,
        sp_stdev: sp?.sp_stdev ?? null,
        noc_mean: noc?.noc_mean ?? null,
        noc_stdev: noc?.noc_stdev ?? null,
        tm_conductance: tm?.conductance_mean ?? null,
        tm_tau_d: tm?.tau_d_mean ?? null,
        tm_tau_r: tm?.tau_r_mean ?? null,
        tm_tau_f: tm?.tau_f_mean ?? null,
        tm_utilization: tm?.utilization_mean ?? null,
      };
    }
  );

  return {
    metadata: {
      exported_at: new Date().toISOString(),
      neuron_count: neurons.length,
      connection_count: connections.length,
      source: "Hippocampome.org v2 (Next.js rebuild)",
    },
    neurons,
    connections,
  };
}
