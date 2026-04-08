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
  // Fix SUB neuron nicknames from the dump
  console.log("Fixing SUB neuron nicknames...");
  const updates = [
    { id: 5001, nickname: "Pyramidal (+)331p", name: "SUB (+)331p-EC 000111 pyramidal cells-entorhinal cortex projecting", position: 501 },
    { id: 5002, nickname: "Axo-axonic (-)210", name: "SUB (-)210 axo-axonic (AA) neurons", position: 505 },
    { id: 5005, nickname: "Pyramidal-CA1 (+)331p", name: "SUB (+)331p-CA1 1110 pyramidal cells-CA1 projecting", position: 502 },
  ];

  for (const u of updates) {
    const { error } = await supabase
      .from("neuron_type")
      .update({ nickname: u.nickname, name: u.name, position: u.position })
      .eq("id", u.id);
    console.log(`  ${u.id}: ${error ? error.message : u.nickname}`);
  }

  // Re-import connectivity data with all neuron IDs now present
  console.log("\nReloading connectivity data...");

  // Get valid IDs
  const { data: neurons } = await supabase.from("neuron_type").select("id");
  const validIds = new Set((neurons ?? []).map((n) => n.id));
  console.log(`  Valid neuron IDs: ${validIds.size}`);

  // Clear existing connectivity
  await supabase.from("connectivity_data").delete().gte("id", 0);

  // Re-import
  const csv = readFileSync(resolve(ORIGINAL_REPO, "data/conndata.csv"), "utf-8");
  const lines = csv.trim().split("\n");
  const headers = parseCSVLine(lines[0]);

  const data = lines.slice(1)
    .map((line) => {
      const vals = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h.trim()] = vals[i]?.trim() ?? ""));
      return row;
    })
    .filter((r) => r.Source_ID && r.Target_ID)
    .map((r) => ({
      source_type_id: parseInt(r.Source_ID),
      target_type_id: parseInt(r.Target_ID),
      layers: r.Layers || "",
    }))
    .filter((r) => validIds.has(r.source_type_id) && validIds.has(r.target_type_id));

  let inserted = 0;
  for (let i = 0; i < data.length; i += 500) {
    const batch = data.slice(i, i + 500);
    const { error } = await supabase.from("connectivity_data").insert(batch);
    if (error) console.error("  Error:", error.message);
    else inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} connectivity rows (was 2440)`);

  // Also re-import synapse probability, NOC, NOPS with new IDs
  for (const table of ["synapse_probability", "number_of_contacts", "number_of_potential_synapses"]) {
    await supabase.from(table).delete().gte("id", 0);
  }

  const spCsv = readFileSync(resolve(ORIGINAL_REPO, "synap_prob/data/sp_values.csv"), "utf-8");
  const spLines = spCsv.trim().split("\n");
  const spHeaders = parseCSVLine(spLines[0]);
  const spData = spLines.slice(1)
    .map((line) => { const v = parseCSVLine(line); const r: Record<string, string> = {}; spHeaders.forEach((h, i) => r[h.trim()] = v[i]?.trim() ?? ""); return r; })
    .filter((r) => r.source_id && r.target_id)
    .map((r) => ({
      source_type_id: parseInt(r.source_id),
      target_type_id: parseInt(r.target_id),
      sp_mean: r.synaptic_probabilties_mean ? parseFloat(r.synaptic_probabilties_mean) : null,
      sp_stdev: r.synaptic_probabilties_stdev && r.synaptic_probabilties_stdev !== "N/A" ? parseFloat(r.synaptic_probabilties_stdev) : null,
    }))
    .filter((r) => validIds.has(r.source_type_id) && validIds.has(r.target_type_id));

  inserted = 0;
  for (let i = 0; i < spData.length; i += 500) {
    const { error } = await supabase.from("synapse_probability").insert(spData.slice(i, i + 500));
    if (!error) inserted += spData.slice(i, i + 500).length;
  }
  console.log(`  Synapse probability: ${inserted} rows`);

  // NOC
  const nocCsv = readFileSync(resolve(ORIGINAL_REPO, "synap_prob/data/noc_values.csv"), "utf-8");
  const nocLines = nocCsv.trim().split("\n");
  const nocHeaders = parseCSVLine(nocLines[0]);
  const nocData = nocLines.slice(1)
    .map((line) => { const v = parseCSVLine(line); const r: Record<string, string> = {}; nocHeaders.forEach((h, i) => r[h.trim()] = v[i]?.trim() ?? ""); return r; })
    .filter((r) => r.source_id && r.target_id)
    .map((r) => ({
      source_type_id: parseInt(r.source_id),
      target_type_id: parseInt(r.target_id),
      noc_mean: r.number_of_contacts_mean ? parseFloat(r.number_of_contacts_mean) : null,
      noc_stdev: r.number_of_contacts_stdev && r.number_of_contacts_stdev !== "N/A" ? parseFloat(r.number_of_contacts_stdev) : null,
    }))
    .filter((r) => validIds.has(r.source_type_id) && validIds.has(r.target_type_id));

  inserted = 0;
  for (let i = 0; i < nocData.length; i += 500) {
    const { error } = await supabase.from("number_of_contacts").insert(nocData.slice(i, i + 500));
    if (!error) inserted += nocData.slice(i, i + 500).length;
  }
  console.log(`  Number of contacts: ${inserted} rows`);

  // NOPS
  const nopsCsv = readFileSync(resolve(ORIGINAL_REPO, "synap_prob/data/nops_values.csv"), "utf-8");
  const nopsLines = nopsCsv.trim().split("\n");
  const nopsHeaders = parseCSVLine(nopsLines[0]);
  const nopsData = nopsLines.slice(1)
    .map((line) => { const v = parseCSVLine(line); const r: Record<string, string> = {}; nopsHeaders.forEach((h, i) => r[h.trim()] = v[i]?.trim() ?? ""); return r; })
    .filter((r) => r.source_id && r.target_id)
    .map((r) => ({
      source_type_id: parseInt(r.source_id),
      target_type_id: parseInt(r.target_id),
      nops_mean: r.number_of_potential_synapses_mean ? parseFloat(r.number_of_potential_synapses_mean) : null,
      nops_stdev: r.number_of_potential_synapses_stdev && r.number_of_potential_synapses_stdev !== "N/A" ? parseFloat(r.number_of_potential_synapses_stdev) : null,
    }))
    .filter((r) => validIds.has(r.source_type_id) && validIds.has(r.target_type_id));

  inserted = 0;
  for (let i = 0; i < nopsData.length; i += 500) {
    const { error } = await supabase.from("number_of_potential_synapses").insert(nopsData.slice(i, i + 500));
    if (!error) inserted += nopsData.slice(i, i + 500).length;
  }
  console.log(`  Number of potential synapses: ${inserted} rows`);

  console.log("\nDone!");
}

main().catch(console.error);
