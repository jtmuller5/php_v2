import { SupabaseClient } from "@supabase/supabase-js";

export async function getAllNeurons(client: SupabaseClient) {
  const { data, error } = await client
    .from("neuron_type")
    .select(
      "id, name, nickname, subregion_id, excit_inhib, status, position, ranks"
    )
    .eq("status", "active")
    .order("position");
  if (error) throw error;
  return data;
}

export async function getNeuronsBySubregion(
  client: SupabaseClient,
  subregion: string
) {
  const { data, error } = await client
    .from("neuron_type")
    .select("id, nickname, name, excit_inhib, position, ranks")
    .eq("subregion_id", subregion)
    .eq("status", "active")
    .order("position");
  if (error) throw error;
  return data;
}

export async function getNeuronById(client: SupabaseClient, id: number) {
  const { data, error } = await client
    .from("neuron_type")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getNeuronWithRelations(
  client: SupabaseClient,
  id: number
) {
  const [neuron, synonyms, population, izhModels, firingPatterns, phases] =
    await Promise.all([
      getNeuronById(client, id),
      getNeuronSynonyms(client, id),
      getNeuronPopulation(client, id),
      getNeuronIzhModels(client, id),
      getNeuronFiringPatterns(client, id),
      getNeuronPhases(client, id),
    ]);

  return {
    ...neuron,
    synonyms,
    population,
    izh_models: izhModels,
    firing_patterns: firingPatterns,
    phases,
  };
}

export async function getNeuronSynonyms(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("synonym_type")
    .select("synonym:synonym_id(id, name)")
    .eq("type_id", typeId);
  if (error) throw error;
  return data?.map((row) => row.synonym).filter(Boolean) ?? [];
}

export async function getNeuronPopulation(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("population_count")
    .select("*")
    .eq("type_id", typeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getNeuronIzhModels(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("izh_model")
    .select("*, izh_compartment(*)")
    .eq("type_id", typeId)
    .order("preferred", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNeuronFiringPatterns(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("firing_pattern")
    .select("*")
    .eq("type_id", typeId);
  if (error) throw error;
  return data ?? [];
}

export async function getNeuronPhases(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("oscillation_phase")
    .select("*")
    .eq("type_id", typeId);
  if (error) throw error;
  return data ?? [];
}
