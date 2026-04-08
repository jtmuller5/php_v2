import { SupabaseClient } from "@supabase/supabase-js";
import type { NeuronConnection } from "@/types/database";

export async function getAllConnectivity(client: SupabaseClient) {
  const { data, error } = await client
    .from("connectivity_data")
    .select(
      "source_type_id, target_type_id, layers"
    );
  if (error) throw error;
  return data;
}

export async function getNeuronConnections(
  client: SupabaseClient,
  typeId: number
): Promise<NeuronConnection[]> {
  const { data, error } = await client.rpc("get_neuron_connections", {
    p_type_id: typeId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getSynapseProbability(
  client: SupabaseClient,
  sourceId: number,
  targetId: number
) {
  const { data, error } = await client
    .from("synapse_probability")
    .select("*")
    .eq("source_type_id", sourceId)
    .eq("target_type_id", targetId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getConnectionDetail(
  client: SupabaseClient,
  sourceId: number,
  targetId: number
) {
  const [sp, noc, nops, tm] = await Promise.all([
    client
      .from("synapse_probability")
      .select("*")
      .eq("source_type_id", sourceId)
      .eq("target_type_id", targetId)
      .maybeSingle(),
    client
      .from("number_of_contacts")
      .select("*")
      .eq("source_type_id", sourceId)
      .eq("target_type_id", targetId)
      .maybeSingle(),
    client
      .from("number_of_potential_synapses")
      .select("*")
      .eq("source_type_id", sourceId)
      .eq("target_type_id", targetId)
      .maybeSingle(),
    client
      .from("tm_synapse_model")
      .select("*")
      .eq("source_type_id", sourceId)
      .eq("target_type_id", targetId),
  ]);

  return {
    synapse_probability: sp.data,
    number_of_contacts: noc.data,
    number_of_potential_synapses: nops.data,
    tm_synapse_models: tm.data ?? [],
  };
}
