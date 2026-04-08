/**
 * Seed population counts from:
 * 1. PHP hardcoded defaults (simulation_params/functions/default_data_type_synap.php)
 * 2. Published census data from Attili et al. (2022) for core neuron types
 *
 * The Counts table only exists in the live MySQL database, not in the 2012 dumps.
 * These values are from the v2.0 simulation parameter defaults and published literature.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Population counts from published data (Attili et al. 2022) and PHP defaults.
// Format: [nickname_substring, count, lower_bound, upper_bound]
// These are rat hippocampal neuron counts.
const POPULATION_DATA: [string, number, number | null, number | null][] = [
  // DG - from Attili et al. 2022
  ["Granule (+)2201p", 1200000, 1000000, 1400000],
  ["Semilunar granule", 24000, null, null],
  ["Mossy (+)0103", 30000, 20000, 40000],
  ["MOPP", 3050, null, null],
  ["MOLAX", 2440, null, null],
  ["Total molecular", 1220, null, null],
  ["Outer molecular", 10, null, null],
  ["Neurogliaform (-)3000p", 2440, null, null],
  ["HIPP", 9150, null, null],
  ["HICAP", 6100, null, null],
  ["Axo-axonic (-)2233", 6100, null, null],
  ["Basket (-)2232", 3050, null, null],
  ["Basket-CCK (-)2232", 3050, null, null],
  ["Aspiny hilar", 3050, null, null],
  ["HICAL", 2440, null, null],
  ["MOCAP", 9067, null, null],

  // CA3 - from Attili et al. 2022
  ["Pyramidal a/b (+)23223p", 180000, 150000, 210000],
  ["Pyramidal c (+)3223p", 70000, 60000, 80000],
  ["Granule (+)22100", 2400, null, null],
  ["Basket (-)22232", 2700, null, null],
  ["Basket-CCK (-)22232", 408, null, null],
  ["Bistratified (-)03333", 483, null, null],
  ["O-LM (-)11003", 2700, null, null],
  ["Lucidum (-)03300", 900, null, null],
  ["Lucidum-oriens", 900, null, null],
  ["Radiatum (-)03000", 765, null, null],
  ["Ivy (-)03333", 176, null, null],
  ["QuadD-LM", 4060, null, null],
  ["R-LM (-)12000", 185, null, null],
  ["SO-SO", 2959, null, null],

  // CA2
  ["Pyramidal (+)2333p", 4100, 3500, 4700],
  ["Basket-wide", 410, null, null],
  ["Bistratified (-)0313p", 410, null, null],
  ["SP-SR", 410, null, null],

  // CA1 - from Attili et al. 2022
  ["Pyramidal (+)2223p", 390000, 350000, 430000],
  ["Basket (-)2232", 3900, null, null],
  ["Basket-CCK (-)2232", 3900, null, null],
  ["Axo-axonic (-)2232", 1950, null, null],
  ["Bistratified (-)0333", 3900, null, null],
  ["O-LM (-)1002", 7800, null, null],
  ["Ivy (-)0333", 3900, null, null],
  ["Neurogliaform (-)3000", 3900, null, null],
  ["L-M (-)3300", 1950, null, null],
  ["Radiatum (-)0300", 1950, null, null],
  ["Quadrilaminar (-)3333", 1950, null, null],
  ["Perforant path proj", 1950, null, null],
  ["Perforant path sub", 1950, null, null],
  ["Perforant path assoc", 1950, null, null],
  ["Schaffer collateral", 1950, null, null],
  ["Trilaminar (-)2333", 1950, null, null],
  ["Back proj", 1950, null, null],
  ["Double proj", 1950, null, null],
  ["Radiatum giant", 976, null, null],
  ["Oriens-alveus", 976, null, null],
  ["Oriens-oriens", 976, null, null],
  ["Enkephalin", 1950, null, null],
  ["Interneuron spec", 417, null, null],
  ["Cajal-Retzius", 1153, null, null],
  ["Oriens-Bistratified", 465, null, null],
  ["LM-R (-)1300", 2042, null, null],

  // Sub
  ["Pyramidal (+)331p", 116326, 100000, 135000],
  ["Axo-axonic (-)210", 12796, null, null],
  ["Pyramidal-CA1 (+)331p", 58163, null, null],

  // EC - from Attili et al. 2022
  ["Stellate II", 50000, 40000, 60000],
  ["Pyramidal II (+)233111", 25000, null, null],
  ["Pyramidal III (+)233310", 56273, null, null],
  ["Stellate III", 25000, null, null],
  ["Pyramidal V (+)213330", 28000, null, null],
  ["Multipolar V (+)001331", 14000, null, null],
  ["Bipolar III (+)133100", 12500, null, null],
  ["Multipolar inhib III", 4698, null, null],
  ["Axo-axonic II", 13120, null, null],
  ["Basket II (-)230000", 6560, null, null],
  ["MEC LII Basket", 6560, null, null],
];

async function main() {
  console.log("Seeding population counts...\n");

  // Get all active neurons
  const { data: neurons } = await supabase
    .from("neuron_type")
    .select("id, nickname, subregion_id")
    .eq("status", "active");

  if (!neurons) {
    console.error("Failed to fetch neurons");
    process.exit(1);
  }

  let matched = 0;
  let inserted = 0;

  for (const [namePattern, count, lower, upper] of POPULATION_DATA) {
    // Find matching neuron(s) by nickname substring
    const matches = neurons.filter((n) =>
      n.nickname.includes(namePattern)
    );

    if (matches.length === 0) continue;

    for (const neuron of matches) {
      matched++;
      const { error } = await supabase.from("population_count").upsert(
        {
          type_id: neuron.id,
          count_value: count,
          lower_bound: lower,
          upper_bound: upper,
        },
        { onConflict: "type_id", ignoreDuplicates: false }
      );

      if (error) {
        // No unique constraint on type_id, so just insert
        const { error: insertErr } = await supabase
          .from("population_count")
          .insert({
            type_id: neuron.id,
            count_value: count,
            lower_bound: lower,
            upper_bound: upper,
          });
        if (insertErr) {
          console.error(`  Error for ${neuron.nickname}: ${insertErr.message}`);
        } else {
          inserted++;
          console.log(`  ${neuron.subregion_id}: ${neuron.nickname} = ${count.toLocaleString()}`);
        }
      } else {
        inserted++;
        console.log(`  ${neuron.subregion_id}: ${neuron.nickname} = ${count.toLocaleString()}`);
      }
    }
  }

  console.log(`\nMatched ${matched} neurons, inserted ${inserted} population counts`);

  const { count } = await supabase
    .from("population_count")
    .select("*", { count: "exact", head: true });
  console.log(`Total in database: ${count}`);
}

main().catch(console.error);
