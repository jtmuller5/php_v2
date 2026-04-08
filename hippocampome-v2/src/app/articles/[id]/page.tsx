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
    .from("article")
    .select("title")
    .eq("id", Number(id))
    .single();

  return {
    title: data?.title
      ? `${data.title.slice(0, 60)} — Hippocampome`
      : "Article — Hippocampome",
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const articleId = Number(id);
  if (isNaN(articleId)) notFound();

  const supabase = await createServerSupabase();

  // Fetch article with authors
  const { data: article, error } = await supabase
    .from("article")
    .select("*")
    .eq("id", articleId)
    .single();

  if (error || !article) notFound();

  // Fetch authors
  const { data: authorRels } = await supabase
    .from("article_author")
    .select("position, author:author_id(id, name)")
    .eq("article_id", articleId)
    .order("position");

  // Fetch evidence linked to this article -> neuron types
  const { data: evidenceRels } = await supabase
    .from("article_evidence")
    .select(
      `
      evidence:evidence_id(
        id,
        evidence_property_type(
          type:type_id(id, nickname, subregion_id),
          property:property_id(subject, predicate, object)
        ),
        evidence_fragment(
          fragment:fragment_id(id, quote, page_location)
        )
      )
    `
    )
    .eq("article_id", articleId);

  const authors = (authorRels ?? [])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((r) => r.author)
    .filter(Boolean);

  // Collect unique neuron types and associate fragments with their neurons
  const neuronTypes = new Map<
    number,
    { id: number; nickname: string; subregion_id: string }
  >();

  interface FragmentWithNeurons {
    id: number;
    quote: string | null;
    page_location: string | null;
    neurons: { id: number; nickname: string; subregion_id: string }[];
    property: string | null;
  }

  const fragmentMap = new Map<number, FragmentWithNeurons>();

  evidenceRels?.forEach((rel) => {
    const evi = rel.evidence as unknown as Record<string, unknown> | null;
    if (!evi) return;

    // Collect neuron types and properties from this evidence record
    const evidenceNeurons: { id: number; nickname: string; subregion_id: string }[] = [];
    let propertyStr: string | null = null;

    const epts = Array.isArray(evi.evidence_property_type)
      ? evi.evidence_property_type
      : evi.evidence_property_type
        ? [evi.evidence_property_type]
        : [];
    (epts as Record<string, unknown>[]).forEach((ept) => {
      const t = (Array.isArray(ept.type) ? ept.type[0] : ept.type) as {
        id: number;
        nickname: string;
        subregion_id: string;
      } | null;
      if (t) {
        if (!neuronTypes.has(t.id)) neuronTypes.set(t.id, t);
        evidenceNeurons.push(t);
      }
      const p = (Array.isArray(ept.property) ? ept.property[0] : ept.property) as {
        subject: string;
        predicate: string;
        object: string;
      } | null;
      if (p && !propertyStr) {
        propertyStr = `${p.subject} ${p.predicate} ${p.object}`;
      }
    });

    // Collect fragments and attach the neurons from this evidence
    const frags = Array.isArray(evi.evidence_fragment)
      ? evi.evidence_fragment
      : evi.evidence_fragment
        ? [evi.evidence_fragment]
        : [];
    (frags as Record<string, unknown>[]).forEach((ef) => {
      const f = (Array.isArray(ef.fragment) ? ef.fragment[0] : ef.fragment) as {
        id: number;
        quote: string | null;
        page_location: string | null;
      } | null;
      if (f && f.quote) {
        const existing = fragmentMap.get(f.id);
        if (existing) {
          // Merge neurons from additional evidence records
          evidenceNeurons.forEach((n) => {
            if (!existing.neurons.some((en) => en.id === n.id)) {
              existing.neurons.push(n);
            }
          });
        } else {
          fragmentMap.set(f.id, {
            ...f,
            neurons: [...evidenceNeurons],
            property: propertyStr,
          });
        }
      }
    });
  });

  const sortedNeurons = Array.from(neuronTypes.values()).sort((a, b) =>
    a.nickname.localeCompare(b.nickname)
  );

  const uniqueFragments = Array.from(fragmentMap.values());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/articles" className="hover:text-gray-700">
          Articles
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          {article.pmid_isbn ? `PMID: ${article.pmid_isbn}` : `#${article.id}`}
        </span>
      </nav>

      {/* Article header */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">
          {article.title || "Untitled Article"}
        </h1>

        {authors.length > 0 && (
          <p className="mt-3 text-gray-600">
            {authors
              .map((a) => {
                const author = Array.isArray(a) ? a[0] : a;
                return (author as { name: string } | null)?.name ?? "";
              })
              .filter(Boolean)
              .join(", ")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {article.publication && (
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 italic">
              {article.publication}
            </span>
          )}
          {article.year && (
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600">
              {article.year}
            </span>
          )}
          {article.volume && (
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600">
              Vol. {article.volume}
              {article.issue ? `(${article.issue})` : ""}
            </span>
          )}
          {article.first_page && (
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600">
              pp. {article.first_page}
              {article.last_page ? `–${article.last_page}` : ""}
            </span>
          )}
          {article.pmid_isbn && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid_isbn}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 font-mono text-sm text-blue-700 transition-colors hover:bg-blue-100"
            >
              PMID: {article.pmid_isbn}
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {article.doi && (
            <a
              href={`https://doi.org/${article.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-600 transition-colors hover:bg-gray-200"
            >
              DOI: {article.doi}
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {article.citation_count != null && (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">
              {article.citation_count} citations
            </span>
          )}
          {article.open_access && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-green-700">
              Open Access
            </span>
          )}
        </div>
      </div>

      {/* Referenced neuron types */}
      {sortedNeurons.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">
            Referenced Neuron Types ({sortedNeurons.length})
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {sortedNeurons.map((n) => (
              <Link
                key={n.id}
                href={`/neurons/${n.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <SubregionBadge subregion={n.subregion_id} size="sm" />
                {n.nickname}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Evidence fragments */}
      {uniqueFragments.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">
            Evidence Fragments ({uniqueFragments.length})
          </h2>
          <div className="mt-4 space-y-4">
            {uniqueFragments.slice(0, 50).map((f) => (
              <blockquote
                key={f.id}
                className="rounded-lg border-l-4 border-blue-200 bg-blue-50/50 py-3 pl-4 pr-4"
              >
                {/* Associated neuron types */}
                {f.neurons.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {f.neurons.map((n) => (
                      <Link
                        key={n.id}
                        href={`/neurons/${n.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:text-blue-600"
                      >
                        <SubregionBadge subregion={n.subregion_id} size="sm" />
                        {n.nickname}
                      </Link>
                    ))}
                    {f.property && (
                      <span className="text-xs text-gray-400">
                        — {f.property}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm leading-relaxed text-gray-700 italic">
                  &ldquo;{f.quote}&rdquo;
                </p>
                {f.page_location && (
                  <p className="mt-1 text-xs text-gray-400">
                    p. {f.page_location}
                  </p>
                )}
              </blockquote>
            ))}
            {uniqueFragments.length > 50 && (
              <p className="text-sm text-gray-400">
                +{uniqueFragments.length - 50} more fragments
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
