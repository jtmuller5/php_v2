import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { ArticleSearch } from "./ArticleSearch";

export const revalidate = 3600;

export const metadata = {
  title: "Articles — Hippocampome",
  description: "Browse publications referenced in the Hippocampome database.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const perPage = 25;

  const supabase = await createServerSupabase();

  let query = supabase
    .from("article")
    .select(
      "id, pmid_isbn, title, publication, year, citation_count",
      { count: "exact" }
    )
    .order("year", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (params.q) {
    query = query.textSearch("search_vector", params.q, {
      type: "websearch",
    });
  }

  const { data: articles, count, error } = await query;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-red-500">Failed to load articles: {error.message}</p>
      </div>
    );
  }

  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">
            {(count ?? 0).toLocaleString()} publications
            {params.q ? ` matching "${params.q}"` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ArticleSearch initialQuery={params.q ?? ""} />
      </div>

      <div className="mt-6 space-y-3">
        {articles?.map((article) => (
          <Link
            key={article.id}
            href={`/articles/${article.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 line-clamp-2">
                  {article.title || "Untitled"}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {article.publication && (
                    <span className="italic">{article.publication}</span>
                  )}
                  {article.year && <span>{article.year}</span>}
                  {article.pmid_isbn && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid_isbn}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-mono text-blue-700 hover:bg-blue-100"
                    >
                      PMID: {article.pmid_isbn}
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
              {article.citation_count != null && article.citation_count > 0 && (
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold text-gray-700">
                    {article.citation_count}
                  </p>
                  <p className="text-xs text-gray-400">citations</p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/articles?${new URLSearchParams({
                ...(params.q ? { q: params.q } : {}),
                page: String(page - 1),
              })}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/articles?${new URLSearchParams({
                ...(params.q ? { q: params.q } : {}),
                page: String(page + 1),
              })}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
