import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { toCSV } from "@/lib/utils/export";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity");
  const format = searchParams.get("format") ?? "csv";
  const neuronId = searchParams.get("neuron_id");
  const region = searchParams.get("region");

  if (!entity) {
    return NextResponse.json(
      { error: "Missing 'entity' parameter" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  let data: Record<string, unknown>[] = [];
  let filename = entity;

  switch (entity) {
    case "neurons": {
      let query = supabase
        .from("neuron_type")
        .select(
          "id, name, nickname, subregion_id, excit_inhib, status, supertype, ranks"
        )
        .eq("status", "active")
        .order("position");
      if (region) query = query.eq("subregion_id", region);
      const { data: neurons, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      data = neurons ?? [];
      filename = region ? `neurons_${region}` : "neurons";
      break;
    }

    case "connectivity": {
      let query = supabase
        .from("connectivity_data")
        .select(
          "source_type_id, target_type_id, layers, source:source_type_id(nickname), target:target_type_id(nickname)"
        );
      if (neuronId) {
        query = query.or(
          `source_type_id.eq.${neuronId},target_type_id.eq.${neuronId}`
        );
      }
      const { data: conn, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      data = (conn ?? []).map((c) => ({
        source_id: c.source_type_id,
        source_name: Array.isArray(c.source)
          ? c.source[0]?.nickname
          : (c.source as { nickname: string } | null)?.nickname,
        target_id: c.target_type_id,
        target_name: Array.isArray(c.target)
          ? c.target[0]?.nickname
          : (c.target as { nickname: string } | null)?.nickname,
        layers: c.layers,
      }));
      filename = neuronId ? `connectivity_${neuronId}` : "connectivity";
      break;
    }

    case "synapse_probability": {
      const { data: sp, error } = await supabase
        .from("synapse_probability")
        .select("source_type_id, target_type_id, sp_mean, sp_stdev")
        .not("sp_mean", "is", null);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      data = sp ?? [];
      filename = "synapse_probability";
      break;
    }

    case "population_counts": {
      const { data: pop, error } = await supabase
        .from("population_count")
        .select(
          "type_id, count_value, lower_bound, upper_bound, neuron_type:type_id(nickname)"
        )
        .not("count_value", "is", null);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      data = (pop ?? []).map((p) => ({
        type_id: p.type_id,
        neuron: Array.isArray(p.neuron_type)
          ? p.neuron_type[0]?.nickname
          : (p.neuron_type as { nickname: string } | null)?.nickname,
        count: p.count_value,
        lower_bound: p.lower_bound,
        upper_bound: p.upper_bound,
      }));
      filename = "population_counts";
      break;
    }

    case "firing_patterns": {
      let query = supabase
        .from("firing_pattern")
        .select(
          "type_id, overall_fp, delay_ms, pfs_ms, swa_mv, n_isi, isi_avg_ms, sd_ms, max_isi_ms, min_isi_ms, accommodation_index"
        );
      if (neuronId) query = query.eq("type_id", Number(neuronId));
      const { data: fp, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      data = fp ?? [];
      filename = neuronId
        ? `firing_patterns_${neuronId}`
        : "firing_patterns";
      break;
    }

    case "neurite_lengths": {
      let query = supabase
        .from("neurite_length")
        .select(
          "type_id, parcel, neurite_id, total_length_avg, total_length_std, values_count"
        );
      if (neuronId) query = query.eq("type_id", Number(neuronId));
      const { data: nl, error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      data = nl ?? [];
      filename = neuronId
        ? `neurite_lengths_${neuronId}`
        : "neurite_lengths";
      break;
    }

    default:
      return NextResponse.json(
        {
          error: `Unknown entity: ${entity}. Valid: neurons, connectivity, synapse_probability, population_counts, firing_patterns, neurite_lengths`,
        },
        { status: 400 }
      );
  }

  if (format === "json") {
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  // CSV
  const csv = toCSV(data);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
