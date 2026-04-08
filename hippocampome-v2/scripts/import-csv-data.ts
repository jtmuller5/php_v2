/**
 * Import CSV data files from the original Hippocampome repository into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-csv-data.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *   - CSV files at the paths specified below (relative to the original repo)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  console.error(
    "You can find the service role key in Supabase Dashboard > Settings > API"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Path to the original hippocampome repo
const ORIGINAL_REPO = resolve(__dirname, "../..");

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = values[i]?.trim() ?? "";
    });
    return row;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Fetch all valid neuron type IDs to filter FK violations
let validNeuronIds: Set<number>;

async function loadValidNeuronIds() {
  const { data, error } = await supabase
    .from("neuron_type")
    .select("id");
  if (error) {
    console.error("Failed to load neuron IDs:", error.message);
    process.exit(1);
  }
  validNeuronIds = new Set(data.map((r) => r.id));
  console.log(`Loaded ${validNeuronIds.size} valid neuron type IDs\n`);
}

function hasValidNeuronId(id: number): boolean {
  return validNeuronIds.has(id);
}

async function importConnectivity() {
  console.log("Importing connectivity data...");
  const csv = readFileSync(
    resolve(ORIGINAL_REPO, "data/conndata.csv"),
    "utf-8"
  );
  const rows = parseCSV(csv);

  const data = rows
    .filter((r) => r.Source_ID && r.Target_ID)
    .map((r) => ({
      source_type_id: parseInt(r.Source_ID),
      target_type_id: parseInt(r.Target_ID),
      layers: r.Layers || "",
    }))
    .filter((r) => hasValidNeuronId(r.source_type_id) && hasValidNeuronId(r.target_type_id));

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < data.length; i += 500) {
    const batch = data.slice(i, i + 500);
    const { error } = await supabase.from("connectivity_data").insert(batch);
    if (error) console.error("connectivity_data error:", error.message);
    else inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} of ${data.length} connectivity rows`);
}

async function importSynapseProbability() {
  console.log("Importing synapse probabilities...");
  const csv = readFileSync(
    resolve(ORIGINAL_REPO, "synap_prob/data/sp_values.csv"),
    "utf-8"
  );
  const rows = parseCSV(csv);

  const data = rows
    .filter((r) => r.source_id && r.target_id)
    .map((r) => ({
      source_type_id: parseInt(r.source_id),
      target_type_id: parseInt(r.target_id),
      sp_mean: r.synaptic_probabilties_mean
        ? parseFloat(r.synaptic_probabilties_mean)
        : null,
      sp_stdev:
        r.synaptic_probabilties_stdev && r.synaptic_probabilties_stdev !== "N/A"
          ? parseFloat(r.synaptic_probabilties_stdev)
          : null,
    }))
    .filter((r) => hasValidNeuronId(r.source_type_id) && hasValidNeuronId(r.target_type_id));

  let inserted = 0;
  for (let i = 0; i < data.length; i += 500) {
    const batch = data.slice(i, i + 500);
    const { error } = await supabase.from("synapse_probability").insert(batch);
    if (error) console.error("synapse_probability error:", error.message);
    else inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} of ${data.length} synapse probability rows`);
}

async function importNumberOfContacts() {
  console.log("Importing number of contacts...");
  const csv = readFileSync(
    resolve(ORIGINAL_REPO, "synap_prob/data/noc_values.csv"),
    "utf-8"
  );
  const rows = parseCSV(csv);

  const data = rows
    .filter((r) => r.source_id && r.target_id)
    .map((r) => ({
      source_type_id: parseInt(r.source_id),
      target_type_id: parseInt(r.target_id),
      noc_mean: r.number_of_contacts_mean
        ? parseFloat(r.number_of_contacts_mean)
        : null,
      noc_stdev:
        r.number_of_contacts_stdev && r.number_of_contacts_stdev !== "N/A"
          ? parseFloat(r.number_of_contacts_stdev)
          : null,
    }))
    .filter((r) => hasValidNeuronId(r.source_type_id) && hasValidNeuronId(r.target_type_id));

  let inserted = 0;
  for (let i = 0; i < data.length; i += 500) {
    const batch = data.slice(i, i + 500);
    const { error } = await supabase
      .from("number_of_contacts")
      .insert(batch);
    if (error) console.error("number_of_contacts error:", error.message);
    else inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} of ${data.length} NOC rows`);
}

async function importNumberOfPotentialSynapses() {
  console.log("Importing number of potential synapses...");
  const csv = readFileSync(
    resolve(ORIGINAL_REPO, "synap_prob/data/nops_values.csv"),
    "utf-8"
  );
  const rows = parseCSV(csv);

  const data = rows
    .filter((r) => r.source_id && r.target_id)
    .map((r) => ({
      source_type_id: parseInt(r.source_id),
      target_type_id: parseInt(r.target_id),
      nops_mean: r.number_of_potential_synapses_mean
        ? parseFloat(r.number_of_potential_synapses_mean)
        : null,
      nops_stdev:
        r.number_of_potential_synapses_stdev &&
        r.number_of_potential_synapses_stdev !== "N/A"
          ? parseFloat(r.number_of_potential_synapses_stdev)
          : null,
    }))
    .filter((r) => hasValidNeuronId(r.source_type_id) && hasValidNeuronId(r.target_type_id));

  let inserted = 0;
  for (let i = 0; i < data.length; i += 500) {
    const batch = data.slice(i, i + 500);
    const { error } = await supabase
      .from("number_of_potential_synapses")
      .insert(batch);
    if (error) console.error("nops error:", error.message);
    else inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} of ${data.length} NOPS rows`);
}

async function importNeuriteLengths() {
  console.log("Importing neurite lengths...");
  const csv = readFileSync(
    resolve(ORIGINAL_REPO, "synap_prob/data/adl_values.csv"),
    "utf-8"
  );
  const rows = parseCSV(csv);

  const data = rows
    .filter((r) => r.unique_id)
    .map((r) => ({
      type_id: parseInt(r.unique_id),
      parcel: r.parcel || "",
      neurite_id: r.neurite_id ? parseInt(r.neurite_id) : null,
      total_length_avg: r.total_length_avg
        ? parseFloat(r.total_length_avg)
        : null,
      total_length_std: r.total_length_std
        ? parseFloat(r.total_length_std)
        : null,
      values_count: r.total_length_values_count
        ? parseInt(r.total_length_values_count)
        : null,
    }))
    .filter((r) => hasValidNeuronId(r.type_id));

  const { error } = await supabase.from("neurite_length").insert(data);
  if (error) console.error("neurite_length error:", error.message);
  else console.log(`  Inserted ${data.length} neurite length rows`);
}

async function importSomaticDistances() {
  console.log("Importing somatic distances...");
  const csv = readFileSync(
    resolve(ORIGINAL_REPO, "synap_prob/data/sd_values.csv"),
    "utf-8"
  );
  const rows = parseCSV(csv);

  const data = rows
    .filter((r) => r.unique_id)
    .map((r) => ({
      type_id: parseInt(r.unique_id),
      parcel: r.parcel || "",
      neurite_id: r.neurite_id ? parseInt(r.neurite_id) : null,
      sd_avg: r.somatic_distance_avg
        ? parseFloat(r.somatic_distance_avg)
        : null,
      sd_std: r.somatic_distance_std
        ? parseFloat(r.somatic_distance_std)
        : null,
      values_count: r.somatic_distance_values_count
        ? parseInt(r.somatic_distance_values_count)
        : null,
      sd_min: r.somatic_distance_min
        ? parseFloat(r.somatic_distance_min)
        : null,
      sd_max: r.somatic_distance_max
        ? parseFloat(r.somatic_distance_max)
        : null,
    }))
    .filter((r) => hasValidNeuronId(r.type_id));

  const { error } = await supabase.from("somatic_distance").insert(data);
  if (error) console.error("somatic_distance error:", error.message);
  else console.log(`  Inserted ${data.length} somatic distance rows`);
}

async function main() {
  console.log("Starting CSV data import...\n");

  await loadValidNeuronIds();

  await importConnectivity();
  await importSynapseProbability();
  await importNumberOfContacts();
  await importNumberOfPotentialSynapses();
  await importNeuriteLengths();
  await importSomaticDistances();

  console.log("\nCSV import complete!");
  console.log(
    "Remember to refresh the search index: SELECT refresh_search_index();"
  );
}

main().catch(console.error);
