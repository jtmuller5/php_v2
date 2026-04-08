import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { searchAll } from "@/lib/queries/search";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import { SearchPageInput } from "./SearchPageInput";

export const metadata = {
  title: "Search — Hippocampome",
};

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

const ENTITY_LABELS: Record<string, string> = {
  neuron_type: "Neuron Type",
  article: "Article",
  synonym: "Synonym",
  fragment: "Fragment",
};

const ENTITY_COLORS: Record<string, string> = {
  neuron_type: "bg-blue-100 text-blue-700",
  article: "bg-amber-100 text-amber-700",
  synonym: "bg-violet-100 text-violet-700",
  fragment: "bg-gray-100 text-gray-600",
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const typeFilter = params.type;

  let results: Awaited<ReturnType<typeof searchAll>> = [];

  if (query.length >= 2) {
    const supabase = await createServerSupabase();
    results = await searchAll(supabase, query, {
      entityFilter: typeFilter ? [typeFilter] : undefined,
      limit: 50,
    });
  }

  // Count by entity type
  const typeCounts = new Map<string, number>();
  if (query.length >= 2 && !typeFilter) {
    // For counts, we'd need unfiltered results — approximate from what we have
    results.forEach((r) => {
      typeCounts.set(r.entity_type, (typeCounts.get(r.entity_type) ?? 0) + 1);
    });
  }

  function resultHref(r: (typeof results)[0]) {
    switch (r.entity_type) {
      case "neuron_type":
        return `/neurons/${r.entity_id}`;
      case "synonym":
        return `/neurons/${r.entity_id}`;
      case "article":
        return `/articles/${r.entity_id}`;
      default:
        return "#";
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Search</h1>

      <div className="mt-6">
        <SearchPageInput initialQuery={query} initialType={typeFilter} />
      </div>

      {query.length >= 2 && (
        <>
          {/* Entity type filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                !typeFilter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({results.length})
            </Link>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => {
              const count = typeCounts.get(key) ?? 0;
              if (count === 0 && !typeFilter) return null;
              return (
                <Link
                  key={key}
                  href={`/search?q=${encodeURIComponent(query)}&type=${key}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    typeFilter === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label} {count > 0 ? `(${count})` : ""}
                </Link>
              );
            })}
          </div>

          {/* Results */}
          <div className="mt-6 space-y-3">
            {results.length === 0 && (
              <p className="py-8 text-center text-gray-500">
                No results found for &ldquo;{query}&rdquo;
              </p>
            )}
            {results.map((r) => (
              <Link
                key={`${r.entity_type}-${r.entity_id}`}
                href={resultHref(r)}
                className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      ENTITY_COLORS[r.entity_type] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ENTITY_LABELS[r.entity_type] ?? r.entity_type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{r.title}</p>
                    {r.subtitle && (
                      <p className="mt-0.5 truncate text-sm text-gray-500">
                        {r.subtitle}
                      </p>
                    )}
                  </div>
                  {r.subregion && (
                    <SubregionBadge subregion={r.subregion} size="sm" />
                  )}
                  <span className="shrink-0 text-xs text-gray-300">
                    {r.rank.toFixed(3)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="mt-8 text-center text-gray-400">
          Type at least 2 characters to search.
        </p>
      )}
    </div>
  );
}
