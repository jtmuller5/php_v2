/**
 * Seed Izhikevich model parameters from the hardcoded defaults in the PHP
 * source code (simulation_params/functions/default_data_type_synap.php),
 * plus reasonable defaults for excitatory/inhibitory neurons without specific params.
 *
 * Column order from the PHP: nickname, e/i, ranks, population, C, k, Vr, Vt, a, b, Vpeak, Vmin, d
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Hardcoded parameters from default_data_type_synap.php
// Format: [nickname, e/i, ranks, population, C, k, Vr, Vt, a, b, Vpeak, Vmin, d]
const HARDCODED_PARAMS: Record<string, { C: number; k: number; Vr: number; Vt: number; a: number; b: number; Vpeak: number; Vmin: number; d: number }> = {
  "CA1 Interneuron Specific LMO-O": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Interneuron Specific LM-R": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Interneuron Specific LMR-R": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Interneuron Specific O-R": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Interneuron Specific O-Targeting QuadD": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Interneuron Specific R-O": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Interneuron Specific RO-O": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 LMR Projecting": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Oriens-Bistratified Projecting": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Cajal-Retzius": { C: 100, k: 0.7, Vr: -60, Vt: -40, a: 0.03, b: -2, Vpeak: 35, Vmin: -50, d: 100 },
  "CA1 Schaffer Collateral-Receiving R-Targeting": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA1 Hippocampo-subicular Projecting ENK+": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Basket CCK": { C: 135, k: 0.58, Vr: -59, Vt: -39.4, a: 0.01, b: -1.24, Vpeak: 18.27, Vmin: -42.77, d: 54 },
  "CA3 Bistratified": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Interneuron Specific Oriens": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Interneuron Specific Quad": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Ivy": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Lucidum LAX": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Lucidum-Radiatum": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 QuadD-LM": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 Radiatum": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 R-LM": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "CA3 SO-SO": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "DG Basket CCK": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "DG MOCAP": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "DG Outer Molecular Layer": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "DG Mossy MOLDEN": { C: 100, k: 0.7, Vr: -60, Vt: -40, a: 0.03, b: -2, Vpeak: 35, Vmin: -50, d: 100 },
  "EC LIV-V Pyramidal-Horizontal": { C: 100, k: 0.7, Vr: -60, Vt: -40, a: 0.03, b: -2, Vpeak: 35, Vmin: -50, d: 100 },
  "EC LII Basket Multipolar Interneuron": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "EC LII Axo-axonic": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "MEC LII Basket": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "LEC LIII Multipolar Interneuron": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "Sub Axo-axonic": { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 },
  "Sub EC-Projecting Pyramidal": { C: 100, k: 0.7, Vr: -60, Vt: -40, a: 0.03, b: -2, Vpeak: 35, Vmin: -50, d: 100 },
};

// Default parameters for neurons without specific values (from Izhikevich 2003)
const DEFAULT_EXCITATORY = { C: 100, k: 0.7, Vr: -60, Vt: -40, a: 0.03, b: -2, Vpeak: 35, Vmin: -50, d: 100 };
const DEFAULT_INHIBITORY = { C: 20, k: 1, Vr: -55, Vt: -40, a: 0.15, b: 8, Vpeak: 25, Vmin: -55, d: 200 };
const DEFAULT_UNKNOWN = { C: 50, k: 0.85, Vr: -57, Vt: -40, a: 0.08, b: 3, Vpeak: 30, Vmin: -52, d: 150 };

async function main() {
  // Fetch all active neuron types
  const { data: neurons, error } = await supabase
    .from("neuron_type")
    .select("id, nickname, excit_inhib")
    .eq("status", "active");

  if (error || !neurons) {
    console.error("Failed to fetch neurons:", error?.message);
    process.exit(1);
  }

  console.log(`Found ${neurons.length} active neuron types\n`);

  let fromHardcoded = 0;
  let fromDefault = 0;

  for (const neuron of neurons) {
    const hardcoded = HARDCODED_PARAMS[neuron.nickname];
    const params = hardcoded
      ? hardcoded
      : neuron.excit_inhib === "excitatory"
        ? DEFAULT_EXCITATORY
        : neuron.excit_inhib === "inhibitory"
          ? DEFAULT_INHIBITORY
          : DEFAULT_UNKNOWN;

    const isHardcoded = !!hardcoded;
    if (isHardcoded) fromHardcoded++;
    else fromDefault++;

    // Insert izh_model
    const { data: model, error: modelError } = await supabase
      .from("izh_model")
      .insert({
        type_id: neuron.id,
        name: isHardcoded ? `${neuron.nickname} (from literature)` : `${neuron.nickname} (default ${neuron.excit_inhib})`,
        preferred: true,
        is_multi_compartment: false,
      })
      .select("id")
      .single();

    if (modelError) {
      console.error(`  Error creating model for ${neuron.nickname}: ${modelError.message}`);
      continue;
    }

    // Insert compartment (single compartment, index 0)
    const { error: compError } = await supabase
      .from("izh_compartment")
      .insert({
        model_id: model.id,
        compartment_index: 0,
        k: params.k,
        a: params.a,
        b: params.b,
        d: params.d,
        capacitance: params.C,
        v_rest: params.Vr,
        v_threshold: params.Vt,
        v_peak: params.Vpeak,
        v_min: params.Vmin,
      });

    if (compError) {
      console.error(`  Error creating compartment for ${neuron.nickname}: ${compError.message}`);
    }
  }

  console.log(`Created Izhikevich models:`);
  console.log(`  From hardcoded literature values: ${fromHardcoded}`);
  console.log(`  From E/I defaults: ${fromDefault}`);
  console.log(`  Total: ${fromHardcoded + fromDefault}`);

  // Verify
  const { count: modelCount } = await supabase.from("izh_model").select("*", { count: "exact", head: true });
  const { count: compCount } = await supabase.from("izh_compartment").select("*", { count: "exact", head: true });
  console.log(`\nDatabase: ${modelCount} models, ${compCount} compartments`);
}

main().catch(console.error);
