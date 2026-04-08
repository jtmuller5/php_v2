/**
 * Fix missing neurons:
 * 1. Import the 5 SUB neurons from the 2012 dump (were filtered out due to "SUB" vs "Sub" case)
 * 2. Extract and import neurons referenced in CSV files that don't exist in the 2012 dump
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ORIGINAL_REPO = resolve(__dirname, "../..");

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = values[i]?.trim() ?? ""));
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else current += ch;
  }
  result.push(current);
  return result;
}

async function main() {
  // Step 1: Fix SUB neurons from the dump
  console.log("=== Step 1: Fix SUB neurons from 2012 dump ===\n");

  const dump = readFileSync(
    resolve(ORIGINAL_REPO, "import/hippocampome_backup_01-11-2012.sql"),
    "utf-8"
  );

  // Extract Type tuples with SUB subregion
  const typePattern = /\((\d+),(\d+),'[^']*','SUB','([^']*)','([^']*)','([^']*)',/g;
  let match;
  const subNeurons: {
    id: number;
    position: number;
    name: string;
    nickname: string;
    status: string;
  }[] = [];

  // Reset regex
  const marker = "INSERT INTO `Type` VALUES ";
  const typeStart = dump.indexOf(marker);
  const typeEnd = dump.indexOf(";", typeStart);
  const typeValues = dump.substring(typeStart, typeEnd);

  const re = /\((\d+),(\d+),'[^']*','SUB','([^']*)','([^']*)','(active|frozen)'/g;
  while ((match = re.exec(typeValues)) !== null) {
    subNeurons.push({
      id: parseInt(match[1]),
      position: parseInt(match[2]),
      name: match[3],
      nickname: match[4],
      status: match[5],
    });
  }

  console.log(`Found ${subNeurons.length} SUB neurons in dump`);

  for (const n of subNeurons) {
    const { error } = await supabase.from("neuron_type").upsert({
      id: n.id,
      position: n.position,
      subregion_id: "Sub",
      name: n.name,
      nickname: n.nickname,
      status: n.status,
      excit_inhib: "unknown",
    }, { onConflict: "id" });
    if (error) {
      console.error(`  Error inserting ${n.nickname}: ${error.message}`);
    } else {
      console.log(`  Inserted/updated: ${n.id} - ${n.nickname}`);
    }
  }

  // Step 2: Extract neurons from CSV files that we don't have yet
  console.log("\n=== Step 2: Import neurons from CSV data ===\n");

  // Get existing neuron IDs
  const { data: existing } = await supabase.from("neuron_type").select("id");
  const existingIds = new Set((existing ?? []).map((n) => n.id));
  console.log(`Currently have ${existingIds.size} neurons in database`);

  // Parse conndata.csv which has Source_ID, Source_Name, Target_ID, Target_Name
  const connCsv = readFileSync(
    resolve(ORIGINAL_REPO, "data/conndata.csv"),
    "utf-8"
  );
  const connRows = parseCSV(connCsv);

  // Parse sp_values.csv which has source_name, source_id, target_name, target_id
  const spCsv = readFileSync(
    resolve(ORIGINAL_REPO, "synap_prob/data/sp_values.csv"),
    "utf-8"
  );
  const spRows = parseCSV(spCsv);

  // Collect all unique neuron IDs and names from CSVs
  const csvNeurons = new Map<number, { name: string; excitInhib: "excitatory" | "inhibitory" | "unknown" }>();

  // From conndata.csv
  connRows.forEach((r) => {
    if (r.Source_ID && r.Source_Name) {
      const id = parseInt(r.Source_ID);
      const name = r.Source_Name.trim();
      csvNeurons.set(id, {
        name,
        excitInhib: "unknown",
      });
    }
    if (r.Target_ID && r.Target_Name) {
      const id = parseInt(r.Target_ID);
      const name = r.Target_Name.trim();
      csvNeurons.set(id, {
        name,
        excitInhib: "unknown",
      });
    }
  });

  // From sp_values.csv (has E/I in names)
  spRows.forEach((r) => {
    if (r.source_id && r.source_name) {
      const id = parseInt(r.source_id);
      const name = r.source_name.trim();
      const ei = name.includes("(e)")
        ? "excitatory" as const
        : name.includes("(i)")
          ? "inhibitory" as const
          : "unknown" as const;
      csvNeurons.set(id, { name, excitInhib: ei });
    }
    if (r.target_id && r.target_name) {
      const id = parseInt(r.target_id);
      const name = r.target_name.trim();
      const ei = name.includes("(e)")
        ? "excitatory" as const
        : name.includes("(i)")
          ? "inhibitory" as const
          : "unknown" as const;
      csvNeurons.set(id, { name, excitInhib: ei });
    }
  });

  // Find missing neurons
  const missing = new Map<number, { name: string; excitInhib: "excitatory" | "inhibitory" | "unknown" }>();
  csvNeurons.forEach((info, id) => {
    if (!existingIds.has(id)) {
      missing.set(id, info);
    }
  });

  console.log(`Found ${missing.size} neurons in CSVs not in database\n`);

  // Determine subregion from name prefix or ID range
  function guessSubregion(id: number, name: string): string {
    const lower = name.toLowerCase();
    if (lower.startsWith("dg ") || lower.startsWith("dg_")) return "DG";
    if (lower.startsWith("ca3 ") || lower.startsWith("ca3_")) return "CA3";
    if (lower.startsWith("ca2 ") || lower.startsWith("ca2_")) return "CA2";
    if (lower.startsWith("ca1 ") || lower.startsWith("ca1_")) return "CA1";
    if (lower.startsWith("sub ") || lower.startsWith("sub_")) return "Sub";
    if (lower.startsWith("ec ") || lower.startsWith("ec_") ||
        lower.startsWith("mec ") || lower.startsWith("lec ")) return "EC";

    // Fallback: guess from ID range
    if (id >= 1000 && id < 2000) return "DG";
    if (id >= 2000 && id < 3000) return "CA3";
    if (id >= 3000 && id < 4000) return "CA2";
    if (id >= 4000 && id < 5000) return "CA1";
    if (id >= 5000 && id < 6000) return "Sub";
    if (id >= 6000 && id < 7000) return "EC";
    return "DG"; // fallback
  }

  // Clean up name to create a nickname
  function cleanNickname(name: string): string {
    // Remove the encoded suffix like "(e)2201p" or "(i)2232"
    return name
      .replace(/\s*\([ei]\)\d+\w*$/, "")
      .replace(/\s*\([ei]\)\s*$/, "")
      .trim();
  }

  // Insert missing neurons
  let inserted = 0;
  for (const [id, info] of missing) {
    const subregion = guessSubregion(id, info.name);
    const nickname = cleanNickname(info.name);

    const { error } = await supabase.from("neuron_type").upsert({
      id,
      subregion_id: subregion,
      name: info.name,
      nickname: nickname || info.name,
      status: "active",
      excit_inhib: info.excitInhib,
      position: id, // use ID as position for ordering
    }, { onConflict: "id" });

    if (error) {
      console.error(`  Error: ${id} "${nickname}": ${error.message}`);
    } else {
      inserted++;
      console.log(`  Added: ${id} - ${subregion}: ${nickname} (${info.excitInhib})`);
    }
  }

  console.log(`\nInserted ${inserted} new neurons`);

  // Step 3: Also fix E/I for the SUB neurons we just added
  console.log("\n=== Step 3: Update E/I for all neurons from CSV data ===\n");
  let eiUpdated = 0;
  for (const [id, info] of csvNeurons) {
    if (info.excitInhib !== "unknown") {
      const { error } = await supabase
        .from("neuron_type")
        .update({ excit_inhib: info.excitInhib })
        .eq("id", id)
        .eq("excit_inhib", "unknown"); // only update if currently unknown
      if (!error) eiUpdated++;
    }
  }
  console.log(`Updated E/I for ${eiUpdated} neurons`);

  // Step 4: Seed Izhikevich models and firing patterns for new neurons
  console.log("\n=== Step 4: Seed simulation data for new neurons ===\n");

  const { data: neuronsWithoutIzh } = await supabase
    .from("neuron_type")
    .select("id, nickname, excit_inhib")
    .eq("status", "active")
    .not("id", "in", `(${(await supabase.from("izh_model").select("type_id")).data?.map(r => r.type_id).join(",") || "0"})`);

  const DEFAULT_E = { C: 100, k: 0.7, Vr: -60, Vt: -40, a: 0.03, b: -2, Vpeak: 35, Vmin: -50, d: 100 };
  const DEFAULT_I = { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 };
  const DEFAULT_U = { C: 50, k: 0.85, Vr: -57, Vt: -40, a: 0.08, b: 3, Vpeak: 30, Vmin: -52, d: 150 };

  let izhSeeded = 0;
  for (const neuron of (neuronsWithoutIzh ?? [])) {
    const p = neuron.excit_inhib === "excitatory" ? DEFAULT_E
      : neuron.excit_inhib === "inhibitory" ? DEFAULT_I : DEFAULT_U;

    const { data: model } = await supabase
      .from("izh_model")
      .insert({
        type_id: neuron.id,
        name: `${neuron.nickname} (default ${neuron.excit_inhib})`,
        preferred: true,
        is_multi_compartment: false,
      })
      .select("id")
      .single();

    if (model) {
      await supabase.from("izh_compartment").insert({
        model_id: model.id,
        compartment_index: 0,
        k: p.k, a: p.a, b: p.b, d: p.d,
        capacitance: p.C, v_rest: p.Vr, v_threshold: p.Vt,
        v_peak: p.Vpeak, v_min: p.Vmin,
      });
      izhSeeded++;
    }
  }
  console.log(`Seeded ${izhSeeded} Izhikevich models`);

  // Seed firing patterns for new neurons
  const { data: neuronsWithoutFP } = await supabase
    .from("neuron_type")
    .select("id, excit_inhib")
    .eq("status", "active")
    .not("id", "in", `(${(await supabase.from("firing_pattern").select("type_id")).data?.map(r => r.type_id).join(",") || "0"})`);

  let fpSeeded = 0;
  for (const neuron of (neuronsWithoutFP ?? [])) {
    const fp = neuron.excit_inhib === "excitatory"
      ? { overall_fp: "ASP. (Accommodating Spiking)", delay_ms: 15, isi_avg_ms: 45, swa_mv: 80, accommodation_index: 0.45 }
      : neuron.excit_inhib === "inhibitory"
        ? { overall_fp: "NASP (Non-Accommodating Spiking)", delay_ms: 5, isi_avg_ms: 12, swa_mv: 60, accommodation_index: 0.05 }
        : { overall_fp: "Unclassified", delay_ms: 10, isi_avg_ms: 25, swa_mv: 70, accommodation_index: 0.25 };

    const { error } = await supabase.from("firing_pattern").insert({
      type_id: neuron.id,
      ...fp,
      parameters: { source: "default" },
    });
    if (!error) fpSeeded++;
  }
  console.log(`Seeded ${fpSeeded} firing patterns`);

  // Final count
  const { count } = await supabase
    .from("neuron_type")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: totalAll } = await supabase
    .from("neuron_type")
    .select("*", { count: "exact", head: true });

  console.log(`\n=== Final: ${count} active neurons (${totalAll} total) ===`);

  // Show breakdown by subregion
  const { data: breakdown } = await supabase
    .from("neuron_type")
    .select("subregion_id")
    .eq("status", "active");

  const regionCounts = new Map<string, number>();
  (breakdown ?? []).forEach((n) => {
    regionCounts.set(n.subregion_id, (regionCounts.get(n.subregion_id) ?? 0) + 1);
  });

  console.log("\nBy subregion:");
  for (const [region, count] of [...regionCounts.entries()].sort()) {
    console.log(`  ${region}: ${count}`);
  }
}

main().catch(console.error);
