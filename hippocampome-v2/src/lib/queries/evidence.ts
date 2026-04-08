import { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceTrailItem } from "@/types/database";

export async function getEvidenceTrail(
  client: SupabaseClient,
  typeId: number,
  propertyId: number
): Promise<EvidenceTrailItem[]> {
  const { data, error } = await client.rpc("get_evidence_trail", {
    p_type_id: typeId,
    p_property_id: propertyId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getNeuronMorphology(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("evidence_property_type")
    .select(
      `
      id, priority, unvetted, linking_quote, interpretation_notes,
      property:property_id(id, subject, predicate, object),
      evidence:evidence_id(id)
    `
    )
    .eq("type_id", typeId);
  if (error) throw error;
  return data ?? [];
}

export async function getNeuronMarkers(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("evidence_marker_data")
    .select(
      `
      evidence:evidence_id(
        id,
        article_evidence(article:article_id(id, pmid_isbn, title, year)),
        evidence_property_type!inner(type_id)
      ),
      marker_data:marker_data_id(id, expression, animal, protocol)
    `
    )
    .eq("evidence.evidence_property_type.type_id", typeId);
  if (error) throw error;
  return data ?? [];
}

export async function getNeuronEphys(
  client: SupabaseClient,
  typeId: number
) {
  const { data, error } = await client
    .from("ep_data_evidence")
    .select(
      `
      ep_data:ep_data_id(*),
      evidence:evidence_id(
        id,
        evidence_property_type!inner(type_id, property:property_id(subject, predicate, object)),
        article_evidence(article:article_id(id, pmid_isbn, title, year))
      )
    `
    )
    .eq("evidence.evidence_property_type.type_id", typeId);
  if (error) throw error;
  return data ?? [];
}

export interface NeuronEvidenceItem {
  evidence_id: number;
  property_subject: string | null;
  property_predicate: string | null;
  property_object: string | null;
  fragment_quote: string | null;
  fragment_page: string | null;
  article_id: number | null;
  article_title: string | null;
  article_pmid: number | null;
  article_year: string | null;
}

export async function getEvidenceForNeuron(
  client: SupabaseClient,
  typeId: number
): Promise<NeuronEvidenceItem[]> {
  const { data, error } = await client
    .from("evidence_property_type")
    .select(
      `
      evidence_id,
      property:property_id(subject, predicate, object),
      evidence:evidence_id(
        evidence_fragment(
          fragment:fragment_id(quote, page_location)
        ),
        article_evidence(
          article:article_id(id, title, pmid_isbn, year)
        )
      )
    `
    )
    .eq("type_id", typeId)
    .limit(500);

  if (error) throw error;

  // Flatten the nested joins into a simple array
  const results: NeuronEvidenceItem[] = [];

  (data ?? []).forEach((row: Record<string, unknown>) => {
    const prop = Array.isArray(row.property)
      ? row.property[0]
      : (row.property as Record<string, unknown> | null);
    const evi = Array.isArray(row.evidence)
      ? row.evidence[0]
      : (row.evidence as Record<string, unknown> | null);

    // Get fragment
    let quote: string | null = null;
    let page: string | null = null;
    if (evi) {
      const frags = Array.isArray(evi.evidence_fragment)
        ? evi.evidence_fragment
        : evi.evidence_fragment
          ? [evi.evidence_fragment]
          : [];
      const firstFrag = (frags as Record<string, unknown>[])[0];
      if (firstFrag) {
        const f = Array.isArray(firstFrag.fragment)
          ? firstFrag.fragment[0]
          : (firstFrag.fragment as Record<string, unknown> | null);
        if (f) {
          quote = f.quote as string | null;
          page = f.page_location as string | null;
        }
      }
    }

    // Get article
    let articleId: number | null = null;
    let articleTitle: string | null = null;
    let articlePmid: number | null = null;
    let articleYear: string | null = null;
    if (evi) {
      const artRels = Array.isArray(evi.article_evidence)
        ? evi.article_evidence
        : evi.article_evidence
          ? [evi.article_evidence]
          : [];
      const firstArt = (artRels as Record<string, unknown>[])[0];
      if (firstArt) {
        const a = Array.isArray(firstArt.article)
          ? firstArt.article[0]
          : (firstArt.article as Record<string, unknown> | null);
        if (a) {
          articleId = a.id as number;
          articleTitle = a.title as string | null;
          articlePmid = a.pmid_isbn as number | null;
          articleYear = a.year as string | null;
        }
      }
    }

    results.push({
      evidence_id: row.evidence_id as number,
      property_subject: prop?.subject as string | null ?? null,
      property_predicate: prop?.predicate as string | null ?? null,
      property_object: prop?.object as string | null ?? null,
      fragment_quote: quote,
      fragment_page: page,
      article_id: articleId,
      article_title: articleTitle,
      article_pmid: articlePmid,
      article_year: articleYear,
    });
  });

  return results;
}
