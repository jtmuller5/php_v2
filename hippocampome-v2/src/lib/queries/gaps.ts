import { SupabaseClient } from "@supabase/supabase-js";

export interface NeuronCompleteness {
  neuron_id: number;
  nickname: string;
  subregion_id: string;
  excit_inhib: string;
  has_morphology: boolean;
  has_ephys: boolean;
  has_markers: boolean;
  has_firing_pattern: boolean;
  has_izh_model: boolean;
  has_population: boolean;
  completeness: number;
}

export interface ConnectionCompleteness {
  source_type_id: number;
  target_type_id: number;
  source_nickname: string;
  target_nickname: string;
  source_subregion: string;
  target_subregion: string;
  has_synapse_prob: boolean;
  has_noc: boolean;
  has_tm_params: boolean;
  completeness: number;
}

export async function getNeuronCompleteness(
  client: SupabaseClient
): Promise<NeuronCompleteness[]> {
  const [neuronsRes, morphRes, ephysRes, markerRes, fpRes, izhRes, popRes] =
    await Promise.all([
      client
        .from("neuron_type")
        .select("id, nickname, subregion_id, excit_inhib")
        .eq("status", "active")
        .order("position"),
      client.from("evidence_property_type").select("type_id"),
      client.from("ep_data_evidence").select("evidence_id"),
      client.from("evidence_marker_data").select("evidence_id"),
      client.from("firing_pattern").select("type_id"),
      client.from("izh_model").select("type_id"),
      client.from("population_count").select("type_id"),
    ]);

  const morphSet = new Set(
    (morphRes.data ?? []).map((r) => r.type_id)
  );
  const fpSet = new Set((fpRes.data ?? []).map((r) => r.type_id));
  const izhSet = new Set((izhRes.data ?? []).map((r) => r.type_id));
  const popSet = new Set((popRes.data ?? []).map((r) => r.type_id));

  // For ephys and markers, we need to map evidence_id back to type_id
  // via evidence_property_type
  const ephysEvidenceIds = new Set(
    (ephysRes.data ?? []).map((r) => r.evidence_id)
  );
  const markerEvidenceIds = new Set(
    (markerRes.data ?? []).map((r) => r.evidence_id)
  );

  // Build evidence_id → type_ids mapping from evidence_property_type
  const ephysTypeIds = new Set<number>();
  const markerTypeIds = new Set<number>();
  (morphRes.data ?? []).forEach((ept) => {
    // morphRes contains all evidence_property_type rows with type_id
    // We reuse this data to check ephys/marker links
    // But we need evidence_id too - let's fetch it separately
  });

  // Simpler approach: fetch evidence_property_type with evidence_id
  const { data: eptData } = await client
    .from("evidence_property_type")
    .select("evidence_id, type_id");

  (eptData ?? []).forEach((ept) => {
    if (ephysEvidenceIds.has(ept.evidence_id)) {
      ephysTypeIds.add(ept.type_id);
    }
    if (markerEvidenceIds.has(ept.evidence_id)) {
      markerTypeIds.add(ept.type_id);
    }
  });

  return (neuronsRes.data ?? []).map((n) => {
    const categories = 6;
    const present = [
      morphSet.has(n.id),
      ephysTypeIds.has(n.id),
      markerTypeIds.has(n.id),
      fpSet.has(n.id),
      izhSet.has(n.id),
      popSet.has(n.id),
    ];
    return {
      neuron_id: n.id,
      nickname: n.nickname,
      subregion_id: n.subregion_id,
      excit_inhib: n.excit_inhib,
      has_morphology: present[0],
      has_ephys: present[1],
      has_markers: present[2],
      has_firing_pattern: present[3],
      has_izh_model: present[4],
      has_population: present[5],
      completeness: present.filter(Boolean).length / categories,
    };
  });
}

export async function getConnectionCompleteness(
  client: SupabaseClient
): Promise<ConnectionCompleteness[]> {
  const [connRes, neuronsRes, spRes, nocRes, tmRes] = await Promise.all([
    client
      .from("connectivity_data")
      .select("source_type_id, target_type_id"),
    client
      .from("neuron_type")
      .select("id, nickname, subregion_id")
      .eq("status", "active"),
    client
      .from("synapse_probability")
      .select("source_type_id, target_type_id")
      .not("sp_mean", "is", null),
    client
      .from("number_of_contacts")
      .select("source_type_id, target_type_id")
      .not("noc_mean", "is", null),
    client
      .from("tm_synapse_model")
      .select("source_type_id, target_type_id"),
  ]);

  const neuronMap = new Map(
    (neuronsRes.data ?? []).map((n) => [
      n.id,
      { nickname: n.nickname, subregion_id: n.subregion_id },
    ])
  );

  const key = (s: number, t: number) => `${s}-${t}`;
  const spSet = new Set(
    (spRes.data ?? []).map((r) => key(r.source_type_id, r.target_type_id))
  );
  const nocSet = new Set(
    (nocRes.data ?? []).map((r) => key(r.source_type_id, r.target_type_id))
  );
  const tmSet = new Set(
    (tmRes.data ?? []).map((r) => key(r.source_type_id, r.target_type_id))
  );

  // Deduplicate connections
  const seen = new Set<string>();
  const connections: ConnectionCompleteness[] = [];

  (connRes.data ?? []).forEach((c) => {
    const k = key(c.source_type_id, c.target_type_id);
    if (seen.has(k)) return;
    seen.add(k);

    const source = neuronMap.get(c.source_type_id);
    const target = neuronMap.get(c.target_type_id);
    if (!source || !target) return;

    const hasSP = spSet.has(k);
    const hasNOC = nocSet.has(k);
    const hasTM = tmSet.has(k);
    const present = [hasSP, hasNOC, hasTM];

    connections.push({
      source_type_id: c.source_type_id,
      target_type_id: c.target_type_id,
      source_nickname: source.nickname,
      target_nickname: target.nickname,
      source_subregion: source.subregion_id,
      target_subregion: target.subregion_id,
      has_synapse_prob: hasSP,
      has_noc: hasNOC,
      has_tm_params: hasTM,
      completeness: present.filter(Boolean).length / 3,
    });
  });

  return connections;
}
