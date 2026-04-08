import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/queries/search";
import { StatCard } from "@/components/ui/StatCard";
import { SubregionBadge } from "@/components/ui/SubregionBadge";

export const revalidate = 3600;

export default async function HomePage() {
  let stats = null;
  try {
    const supabase = await createServerSupabase();
    stats = await getDashboardStats(supabase);
  } catch {
    // Supabase not configured yet — show static landing
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Hippocampome
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
          A comprehensive knowledge base of neuron types in the rodent
          hippocampus. Explore morphology, electrophysiology, molecular markers,
          connectivity, and run neuron simulations.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/neurons"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Browse Neurons
          </Link>
          <Link
            href="/connectivity"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            View Connectivity
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Neuron Types" value={stats.neuron_count} />
          <StatCard label="Articles" value={stats.article_count} />
          <StatCard label="Connections" value={stats.connection_count} />
          <StatCard label="Evidence Records" value={stats.evidence_count} />
        </div>
      )}

      {/* Subregion Navigation */}
      <div className="mt-16">
        <h2 className="text-center text-2xl font-semibold text-gray-900">
          Explore by Region
        </h2>
        <p className="mt-2 text-center text-gray-500">
          The hippocampal formation is divided into six major subregions
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { id: "DG", name: "Dentate Gyrus", desc: "Granule cells, mossy cells, interneurons" },
            { id: "CA3", name: "CA3", desc: "Pyramidal cells, interneurons" },
            { id: "CA2", name: "CA2", desc: "Pyramidal cells, interneurons" },
            { id: "CA1", name: "CA1", desc: "Pyramidal cells, interneurons" },
            { id: "Sub", name: "Subiculum", desc: "Pyramidal cells, interneurons" },
            { id: "EC", name: "Entorhinal Cortex", desc: "Stellate cells, pyramidal cells" },
          ].map((region) => (
            <Link
              key={region.id}
              href={`/neurons?region=${region.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
            >
              <SubregionBadge subregion={region.id} size="lg" />
              <p className="mt-3 text-sm font-medium text-gray-900">
                {region.name}
              </p>
              <p className="mt-1 text-xs text-gray-400">{region.desc}</p>
              {stats?.subregion_counts && (
                <p className="mt-2 text-lg font-semibold text-gray-700">
                  {stats.subregion_counts.find(
                    (s: { id: string; count: number }) => s.id === region.id
                  )?.count ?? 0}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Evidence-Based",
            desc: "Every data point is traced back to its source publication with direct quotes from the literature.",
            icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
          },
          {
            title: "Interactive Simulator",
            desc: "Run Izhikevich neuron model simulations directly in your browser with real parameters from the database.",
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
          },
          {
            title: "Connectivity Maps",
            desc: "Explore the network of connections between neuron types with synapse probabilities and contact statistics.",
            icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={feature.icon}
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-gray-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
