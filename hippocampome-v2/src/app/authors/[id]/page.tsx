import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { SubregionBadge } from "@/components/ui/SubregionBadge";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("author")
    .select("name")
    .eq("id", Number(id))
    .single();

  return {
    title: data?.name
      ? `${data.name} — Hippocampome Authors`
      : "Author — Hippocampome",
  };
}

export default async function AuthorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const authorId = Number(id);
  if (isNaN(authorId)) notFound();

  const supabase = await createServerSupabase();

  // Fetch author
  const { data: author, error } = await supabase
    .from("author")
    .select("id, name")
    .eq("id", authorId)
    .single();

  if (error || !author) notFound();

  // Fetch all articles by this author with co-authors and linked neuron types
  const { data: articleRels } = await supabase
    .from("article_author")
    .select(
      `
      position,
      article:article_id(
        id, title, publication, year, pmid_isbn, citation_count,
        article_author(position, author:author_id(id, name)),
        article_evidence(
          evidence:evidence_id(
            evidence_property_type(
              type:type_id(id, nickname, subregion_id)
            )
          )
        )
      )
    `
    )
    .eq("author_id", authorId)
    .order("position");

  // Process articles
  const articles = (articleRels ?? [])
    .map((rel) => {
      const article = Array.isArray(rel.article)
        ? rel.article[0]
        : (rel.article as Record<string, unknown> | null);
      if (!article) return null;

      // Get co-authors
      const authorLinks = Array.isArray(article.article_author)
        ? article.article_author
        : [];
      const coAuthors = (authorLinks as Record<string, unknown>[])
        .sort(
          (a, b) =>
            ((a.position as number) ?? 0) - ((b.position as number) ?? 0)
        )
        .map((aa) => {
          const a = Array.isArray(aa.author) ? aa.author[0] : aa.author;
          return a as { id: number; name: string } | null;
        })
        .filter(Boolean) as { id: number; name: string }[];

      // Get neuron types
      const neuronTypes = new Map<
        number,
        { id: number; nickname: string; subregion_id: string }
      >();
      const evidenceLinks = Array.isArray(article.article_evidence)
        ? article.article_evidence
        : [];
      (evidenceLinks as Record<string, unknown>[]).forEach((ae) => {
        const evi = Array.isArray(ae.evidence)
          ? ae.evidence[0]
          : (ae.evidence as Record<string, unknown> | null);
        if (!evi) return;
        const epts = Array.isArray(evi.evidence_property_type)
          ? evi.evidence_property_type
          : [];
        (epts as Record<string, unknown>[]).forEach((ept) => {
          const t = (
            Array.isArray(ept.type) ? ept.type[0] : ept.type
          ) as { id: number; nickname: string; subregion_id: string } | null;
          if (t && !neuronTypes.has(t.id)) neuronTypes.set(t.id, t);
        });
      });

      return {
        id: article.id as number,
        title: article.title as string | null,
        publication: article.publication as string | null,
        year: article.year as string | null,
        pmid_isbn: article.pmid_isbn as number | null,
        citation_count: article.citation_count as number | null,
        coAuthors,
        neuronTypes: Array.from(neuronTypes.values()).sort((a, b) =>
          a.nickname.localeCompare(b.nickname)
        ),
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[0]>[];

  // Sort by year descending
  articles.sort((a, b) => {
    const ya = parseInt((a as { year: string | null }).year ?? "0");
    const yb = parseInt((b as { year: string | null }).year ?? "0");
    return yb - ya;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/authors" className="hover:text-gray-700">
          Authors
        </Link>
        <span>/</span>
        <span className="text-gray-900">{author.name}</span>
      </nav>

      {/* Header */}
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-gray-900">{author.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {articles.length} {articles.length === 1 ? "article" : "articles"} in
          the Hippocampome database
        </p>
      </div>

      {/* Articles */}
      <div className="mt-8 space-y-4">
        {articles.map((article) => {
          const a = article as {
            id: number;
            title: string | null;
            publication: string | null;
            year: string | null;
            pmid_isbn: number | null;
            citation_count: number | null;
            coAuthors: { id: number; name: string }[];
            neuronTypes: { id: number; nickname: string; subregion_id: string }[];
          };
          return (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <Link
                href={`/articles/${a.id}`}
                className="text-base font-medium text-gray-900 hover:text-blue-600"
              >
                {a.title || "Untitled"}
              </Link>

              {/* Co-authors */}
              <p className="mt-2 text-sm text-gray-500">
                {a.coAuthors.map((ca, i) => (
                  <span key={ca.id}>
                    {i > 0 && ", "}
                    {ca.id === authorId ? (
                      <span className="font-semibold text-gray-900">
                        {ca.name}
                      </span>
                    ) : (
                      <Link
                        href={`/authors/${ca.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {ca.name}
                      </Link>
                    )}
                  </span>
                ))}
              </p>

              {/* Metadata */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {a.publication && (
                  <span className="italic text-gray-500">
                    {a.publication}
                  </span>
                )}
                {a.year && (
                  <span className="text-gray-400">({a.year})</span>
                )}
                {a.pmid_isbn && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                    PMID: {a.pmid_isbn}
                  </span>
                )}
                {a.citation_count != null && a.citation_count > 0 && (
                  <span className="text-xs text-gray-400">
                    {a.citation_count} citations
                  </span>
                )}
              </div>

              {/* Neuron types */}
              {a.neuronTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.neuronTypes.map((n) => (
                    <Link
                      key={n.id}
                      href={`/neurons/${n.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:text-blue-600"
                    >
                      <SubregionBadge subregion={n.subregion_id} size="sm" />
                      {n.nickname}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {articles.length === 0 && (
        <p className="mt-8 text-center text-gray-400">
          No articles found for this author.
        </p>
      )}
    </div>
  );
}
