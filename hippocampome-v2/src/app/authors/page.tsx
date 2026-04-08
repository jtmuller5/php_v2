import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { AuthorSearch } from "./AuthorSearch";

export const revalidate = 3600;

export const metadata = {
  title: "Authors — Hippocampome",
  description: "Browse authors who contributed to the Hippocampome database.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; letter?: string }>;
}

export default async function AuthorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabase();

  // Fetch authors with their article counts
  let query = supabase
    .from("author")
    .select("id, name, article_author(article_id)", { count: "exact" })
    .order("name");

  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  } else if (params.letter) {
    query = query.ilike("name", `${params.letter}%`);
  }

  const { data: authors, error } = await query;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-red-500">Failed to load authors: {error.message}</p>
      </div>
    );
  }

  // Sort by article count descending for search results, alphabetical for letter browse
  const enriched = (authors ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    articleCount: Array.isArray(a.article_author)
      ? a.article_author.length
      : 0,
  }));

  if (params.q) {
    enriched.sort((a, b) => b.articleCount - a.articleCount);
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Authors</h1>
        <p className="mt-1 text-sm text-gray-500">
          {enriched.length} authors
          {params.q
            ? ` matching "${params.q}"`
            : params.letter
              ? ` starting with "${params.letter}"`
              : ""}
        </p>
      </div>

      <div className="mt-6">
        <AuthorSearch initialQuery={params.q ?? ""} />
      </div>

      {/* Alphabet filter */}
      <div className="mt-4 flex flex-wrap gap-1">
        <Link
          href="/authors"
          className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
            !params.letter && !params.q
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {alphabet.map((letter) => (
          <Link
            key={letter}
            href={`/authors?letter=${letter}`}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
              params.letter === letter
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {letter}
          </Link>
        ))}
      </div>

      {/* Author list */}
      <div className="mt-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((author) => (
            <Link
              key={author.id}
              href={`/authors/${author.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <span className="text-sm font-medium text-gray-900">
                {author.name}
              </span>
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {author.articleCount}{" "}
                {author.articleCount === 1 ? "article" : "articles"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {enriched.length === 0 && (
        <p className="mt-8 text-center text-gray-400">
          No authors found.
        </p>
      )}
    </div>
  );
}
