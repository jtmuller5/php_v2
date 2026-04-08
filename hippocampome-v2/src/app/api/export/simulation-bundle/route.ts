import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSimulationBundle } from "@/lib/queries/simulation";
import { toCSV } from "@/lib/utils/export";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { neuron_ids, format } = body as {
    neuron_ids: number[];
    format?: "csv" | "json";
  };

  if (!neuron_ids || neuron_ids.length === 0) {
    return NextResponse.json(
      { error: "neuron_ids array is required" },
      { status: 400 }
    );
  }

  if (neuron_ids.length > 200) {
    return NextResponse.json(
      { error: "Maximum 200 neurons per export" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const bundle = await getSimulationBundle(supabase, neuron_ids);

  if (format === "csv") {
    const neuronCsv = toCSV(bundle.neurons as unknown as Record<string, unknown>[]);
    const connectionCsv = toCSV(bundle.connections as unknown as Record<string, unknown>[]);

    const combined = [
      "# Hippocampome Simulation Parameters Export",
      `# Exported: ${bundle.metadata.exported_at}`,
      `# Neurons: ${bundle.metadata.neuron_count}`,
      `# Connections: ${bundle.metadata.connection_count}`,
      "",
      "# === NEURON PARAMETERS ===",
      neuronCsv,
      "",
      "# === CONNECTION PARAMETERS ===",
      connectionCsv,
    ].join("\n");

    return new NextResponse(combined, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition":
          'attachment; filename="hippocampome_simulation_params.csv"',
      },
    });
  }

  // Default: JSON
  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition":
        'attachment; filename="hippocampome_simulation_params.json"',
    },
  });
}
