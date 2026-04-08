-- ============================================================
-- MATERIALIZED SEARCH VIEW
-- ============================================================

CREATE MATERIALIZED VIEW search_index AS
SELECT
  'neuron_type' AS entity_type,
  id AS entity_id,
  nickname AS title,
  name AS subtitle,
  subregion_id AS subregion,
  search_vector
FROM neuron_type WHERE status = 'active'
UNION ALL
SELECT
  'article' AS entity_type,
  id AS entity_id,
  title,
  publication AS subtitle,
  NULL AS subregion,
  search_vector
FROM article
UNION ALL
SELECT
  'synonym' AS entity_type,
  s.id AS entity_id,
  s.name AS title,
  nt.nickname AS subtitle,
  nt.subregion_id AS subregion,
  s.search_vector
FROM synonym s
JOIN synonym_type st ON s.id = st.synonym_id
JOIN neuron_type nt ON st.type_id = nt.id
UNION ALL
SELECT
  'fragment' AS entity_type,
  id AS entity_id,
  LEFT(quote, 120) AS title,
  page_location AS subtitle,
  NULL AS subregion,
  search_vector
FROM fragment WHERE quote IS NOT NULL;

CREATE INDEX idx_search_index_vector ON search_index USING GIN (search_vector);

-- ============================================================
-- SEARCH RPC FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION search_all(
  query TEXT,
  entity_filter TEXT[] DEFAULT NULL,
  limit_val INT DEFAULT 20,
  offset_val INT DEFAULT 0
)
RETURNS TABLE(
  entity_type TEXT,
  entity_id INT,
  title TEXT,
  subtitle TEXT,
  subregion TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.entity_type,
    si.entity_id,
    si.title,
    si.subtitle,
    si.subregion,
    ts_rank_cd(si.search_vector, websearch_to_tsquery('english', query)) AS rank
  FROM search_index si
  WHERE si.search_vector @@ websearch_to_tsquery('english', query)
    AND (entity_filter IS NULL OR si.entity_type = ANY(entity_filter))
  ORDER BY rank DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- DASHBOARD STATS RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'neuron_count', (SELECT count(*) FROM neuron_type WHERE status = 'active'),
    'article_count', (SELECT count(*) FROM article),
    'connection_count', (SELECT count(*) FROM connectivity_data),
    'evidence_count', (SELECT count(*) FROM evidence),
    'subregion_counts', (
      SELECT json_agg(json_build_object('id', subregion_id, 'count', cnt) ORDER BY s.display_order)
      FROM (
        SELECT subregion_id, count(*) cnt
        FROM neuron_type WHERE status = 'active'
        GROUP BY subregion_id
      ) sub
      JOIN subregion s ON s.id = sub.subregion_id
    )
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- NEURON CONNECTIONS RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_neuron_connections(p_type_id INT)
RETURNS TABLE(
  direction TEXT,
  connected_type_id INT,
  connected_nickname TEXT,
  connected_subregion TEXT,
  connected_excit_inhib neurotransmitter_type,
  layers TEXT,
  sp_mean DOUBLE PRECISION,
  noc_mean DOUBLE PRECISION
) AS $$
  SELECT 'outgoing', cd.target_type_id, nt.nickname, nt.subregion_id, nt.excit_inhib, cd.layers,
    sp.sp_mean, noc.noc_mean
  FROM connectivity_data cd
  JOIN neuron_type nt ON nt.id = cd.target_type_id
  LEFT JOIN synapse_probability sp ON sp.source_type_id = cd.source_type_id AND sp.target_type_id = cd.target_type_id
  LEFT JOIN number_of_contacts noc ON noc.source_type_id = cd.source_type_id AND noc.target_type_id = cd.target_type_id
  WHERE cd.source_type_id = p_type_id
  UNION ALL
  SELECT 'incoming', cd.source_type_id, nt.nickname, nt.subregion_id, nt.excit_inhib, cd.layers,
    sp.sp_mean, noc.noc_mean
  FROM connectivity_data cd
  JOIN neuron_type nt ON nt.id = cd.source_type_id
  LEFT JOIN synapse_probability sp ON sp.source_type_id = cd.source_type_id AND sp.target_type_id = cd.target_type_id
  LEFT JOIN number_of_contacts noc ON noc.source_type_id = cd.source_type_id AND noc.target_type_id = cd.target_type_id
  WHERE cd.target_type_id = p_type_id;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- EVIDENCE TRAIL RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_evidence_trail(p_type_id INT, p_property_id INT)
RETURNS TABLE(
  evidence_id INT,
  fragment_quote TEXT,
  fragment_page TEXT,
  article_title TEXT,
  article_pmid BIGINT,
  article_year TEXT,
  authors TEXT
) AS $$
  SELECT
    e.id,
    f.quote,
    f.page_location,
    a.title,
    a.pmid_isbn,
    a.year,
    string_agg(au.name, ', ' ORDER BY aa.position)
  FROM evidence_property_type ept
  JOIN evidence e ON e.id = ept.evidence_id
  LEFT JOIN evidence_fragment ef ON ef.evidence_id = e.id
  LEFT JOIN fragment f ON f.id = ef.fragment_id
  LEFT JOIN article_evidence ae ON ae.evidence_id = e.id
  LEFT JOIN article a ON a.id = ae.article_id
  LEFT JOIN article_author aa ON aa.article_id = a.id
  LEFT JOIN author au ON au.id = aa.author_id
  WHERE ept.type_id = p_type_id AND ept.property_id = p_property_id
  GROUP BY e.id, f.quote, f.page_location, a.title, a.pmid_isbn, a.year;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- REFRESH SEARCH INDEX
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS VOID AS $$
  REFRESH MATERIALIZED VIEW search_index;
$$ LANGUAGE sql;
