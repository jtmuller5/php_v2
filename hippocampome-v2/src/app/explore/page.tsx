import Link from "next/link";

export const metadata = {
  title: "Explore — Hippocampome",
  description: "Explore aggregate data across hippocampal neuron types.",
};

const EXPLORE_SECTIONS = [
  {
    title: "Synapse Probability",
    description:
      "Connection probabilities, number of contacts, and potential synapses between neuron type pairs.",
    href: "/explore/synapse-probability",
    stats: "~1,970 neuron pairs",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "Population Counts",
    description:
      "Estimated population sizes for each neuron type with lower and upper bounds.",
    href: "/explore/population-counts",
    stats: "~120 neuron types",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    title: "Gene Expression",
    description:
      "Gene expression levels across hippocampal parcels with confidence ratings.",
    href: "/explore/gene-expression",
    stats: "Parcel-based expression data",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "Simulation Export",
    description:
      "Select neuron types and download complete simulation parameter bundles including Izhikevich, connectivity, and synaptic parameters.",
    href: "/explore/simulation-export",
    stats: "Izhikevich + TM + connectivity",
    icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  },
  {
    title: "Data Gaps",
    description:
      "Identify missing data across neuron types and connections. See which parameters still need experimental values.",
    href: "/explore/data-gaps",
    stats: "Completeness heatmap",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
];

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Explore</h1>
      <p className="mt-1 text-sm text-gray-500">
        Browse aggregate data across hippocampal neuron types
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {EXPLORE_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 transition-colors group-hover:bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={section.icon}
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-gray-500">{section.description}</p>
            <p className="mt-3 text-xs font-medium text-gray-400">
              {section.stats}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
