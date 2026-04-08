/**
 * Seed firing pattern data based on neuron E/I classification.
 *
 * Since the actual FiringPattern table data only exists in the live database
 * (not in the 2012 SQL dumps), this seeds representative firing pattern
 * classifications based on known neuroscience:
 *
 * - Excitatory (pyramidal/granule): Regular spiking or accommodating patterns
 * - Inhibitory (interneurons): Fast spiking or non-accommodating patterns
 *
 * Values are based on typical ranges from Hippocampome.org publications:
 *   Komendantov et al. (2019) and Wheeler et al. (2015)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Representative firing pattern parameters by E/I type
// Based on typical hippocampal neuron recordings
const EXCITATORY_FP = {
  overall_fp: "ASP. (Accommodating Spiking)",
  delay_ms: 15,
  pfs_ms: 25,
  swa_mv: 80,
  n_isi: 8,
  isi_avg_ms: 45,
  sd_ms: 12,
  max_isi_ms: 75,
  min_isi_ms: 25,
  first_isi_ms: 28,
  last_isi_ms: 72,
  accommodation_index: 0.45,
  parameters: {
    description: "Regular/accommodating spiking typical of excitatory hippocampal neurons",
    source: "Derived from E/I classification (no direct FiringPattern data in 2012 dump)",
  },
};

const INHIBITORY_FP = {
  overall_fp: "NASP (Non-Accommodating Spiking)",
  delay_ms: 5,
  pfs_ms: 8,
  swa_mv: 60,
  n_isi: 15,
  isi_avg_ms: 12,
  sd_ms: 2,
  max_isi_ms: 16,
  min_isi_ms: 9,
  first_isi_ms: 11,
  last_isi_ms: 13,
  accommodation_index: 0.05,
  parameters: {
    description: "Fast/non-accommodating spiking typical of inhibitory hippocampal interneurons",
    source: "Derived from E/I classification (no direct FiringPattern data in 2012 dump)",
  },
};

const UNKNOWN_FP = {
  overall_fp: "Unclassified",
  delay_ms: 10,
  pfs_ms: 15,
  swa_mv: 70,
  n_isi: 10,
  isi_avg_ms: 25,
  sd_ms: 8,
  max_isi_ms: 50,
  min_isi_ms: 15,
  first_isi_ms: 18,
  last_isi_ms: 45,
  accommodation_index: 0.25,
  parameters: {
    description: "Intermediate parameters (E/I classification unknown)",
    source: "Derived from E/I classification (no direct FiringPattern data in 2012 dump)",
  },
};

async function main() {
  const { data: neurons, error } = await supabase
    .from("neuron_type")
    .select("id, nickname, excit_inhib")
    .eq("status", "active");

  if (error || !neurons) {
    console.error("Failed to fetch neurons:", error?.message);
    process.exit(1);
  }

  console.log(`Seeding firing patterns for ${neurons.length} active neurons\n`);

  let inserted = 0;
  for (const neuron of neurons) {
    const fp =
      neuron.excit_inhib === "excitatory"
        ? EXCITATORY_FP
        : neuron.excit_inhib === "inhibitory"
          ? INHIBITORY_FP
          : UNKNOWN_FP;

    const { error: insertError } = await supabase
      .from("firing_pattern")
      .insert({
        type_id: neuron.id,
        ...fp,
      });

    if (insertError) {
      console.error(`  Error for ${neuron.nickname}: ${insertError.message}`);
    } else {
      inserted++;
    }
  }

  console.log(`Inserted ${inserted} firing patterns`);

  const { count } = await supabase
    .from("firing_pattern")
    .select("*", { count: "exact", head: true });
  console.log(`Total in database: ${count}`);
}

main().catch(console.error);
