/**
 * Import core data from the MySQL dump into Supabase (Postgres).
 *
 * This script parses the MySQL dump file and inserts rows into the
 * new Postgres schema. It handles the table name mapping and column
 * mapping between the old MySQL schema and the new Postgres schema.
 *
 * Usage:
 *   npx tsx scripts/import-mysql-dump.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - The MySQL dump file at ../import/hippocampome_backup_01-11-2012.sql
 *
 * IMPORTANT: Run this BEFORE import-csv-data.ts, since the CSV data
 * has foreign key references to neuron_type rows.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env.local
config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  console.error(
    "You can find the service role key in Supabase Dashboard > Settings > API"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DUMP_PATH = resolve(
  __dirname,
  "../../import/hippocampome_backup_01-11-2012.sql"
);

// ============================================================
// MySQL INSERT parser
// ============================================================

/**
 * Parse a MySQL VALUES tuple like: (1,'hello','world',NULL,3)
 * Handles escaped quotes, NULL values, and nested parentheses.
 */
function parseValueTuple(tuple: string): (string | null)[] {
  const values: (string | null)[] = [];
  let i = 0;
  const len = tuple.length;

  // Skip leading (
  if (tuple[0] === "(") i = 1;

  while (i < len) {
    if (tuple[i] === ")" && values.length > 0) break;

    if (tuple[i] === "N" && tuple.substring(i, i + 4) === "NULL") {
      values.push(null);
      i += 4;
      if (tuple[i] === ",") i++; // skip comma
    } else if (tuple[i] === "'") {
      // String value
      let str = "";
      i++; // skip opening quote
      while (i < len) {
        if (tuple[i] === "\\" && i + 1 < len) {
          // Escaped character
          const next = tuple[i + 1];
          if (next === "'") str += "'";
          else if (next === "\\") str += "\\";
          else if (next === "n") str += "\n";
          else if (next === "r") str += "\r";
          else if (next === "t") str += "\t";
          else if (next === "0") str += "\0";
          else str += next;
          i += 2;
        } else if (tuple[i] === "'" && tuple[i + 1] === "'") {
          // Double quote escape
          str += "'";
          i += 2;
        } else if (tuple[i] === "'") {
          // End of string
          i++; // skip closing quote
          break;
        } else {
          str += tuple[i];
          i++;
        }
      }
      values.push(str);
      if (tuple[i] === ",") i++; // skip comma
    } else if (
      tuple[i] === "-" ||
      tuple[i] === "." ||
      (tuple[i] >= "0" && tuple[i] <= "9")
    ) {
      // Numeric value
      let num = "";
      while (
        i < len &&
        tuple[i] !== "," &&
        tuple[i] !== ")"
      ) {
        num += tuple[i];
        i++;
      }
      values.push(num.trim());
      if (tuple[i] === ",") i++; // skip comma
    } else {
      i++; // skip whitespace or unexpected chars
    }
  }

  return values;
}

/**
 * Extract all INSERT rows for a given table from the dump file content.
 */
function extractInserts(
  dumpContent: string,
  tableName: string
): (string | null)[][] {
  const rows: (string | null)[][] = [];

  // Find INSERT INTO `TableName` VALUES ...
  const pattern = `INSERT INTO \`${tableName}\` VALUES `;
  let searchFrom = 0;

  while (true) {
    const idx = dumpContent.indexOf(pattern, searchFrom);
    if (idx === -1) break;

    const valuesStart = idx + pattern.length;
    // Find the end of the statement (;)
    // We need to be careful about semicolons inside strings
    let i = valuesStart;
    let inString = false;
    let escaped = false;
    let depth = 0;
    let tupleStart = -1;

    while (i < dumpContent.length) {
      const ch = dumpContent[i];

      if (escaped) {
        escaped = false;
        i++;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        i++;
        continue;
      }

      if (ch === "'" && !escaped) {
        inString = !inString;
        i++;
        continue;
      }

      if (inString) {
        i++;
        continue;
      }

      if (ch === "(") {
        if (depth === 0) tupleStart = i;
        depth++;
      } else if (ch === ")") {
        depth--;
        if (depth === 0 && tupleStart >= 0) {
          const tupleStr = dumpContent.substring(tupleStart, i + 1);
          const values = parseValueTuple(tupleStr);
          rows.push(values);
          tupleStart = -1;
        }
      } else if (ch === ";" && depth === 0) {
        break;
      }

      i++;
    }

    searchFrom = i;
  }

  return rows;
}

// ============================================================
// Table importers
// ============================================================

async function insertBatch(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 200
) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error(`  Error in ${table} batch ${i}: ${error.message}`);
      // Try one by one
      for (const row of batch) {
        const { error: singleError } = await supabase
          .from(table)
          .upsert(row, { onConflict: "id", ignoreDuplicates: true });
        if (singleError) {
          console.error(
            `  Skipping row in ${table}: ${singleError.message}`
          );
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function insertBatchNoId(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 200
) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  Error in ${table} batch ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function importArticles(dump: string) {
  console.log("Importing articles...");
  const rows = extractInserts(dump, "Article");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    pmid_isbn: r[1] ? parseInt(r[1]) : null,
    pmcid: r[2],
    nihmsid: r[3],
    doi: r[4],
    open_access: r[5] ? r[5] === "1" : null,
    title: r[7],
    publication: r[8],
    volume: r[9],
    issue: r[10],
    first_page: r[11] ? parseInt(r[11]) : null,
    last_page: r[12] ? parseInt(r[12]) : null,
    year: r[13],
    citation_count: r[14] ? parseInt(r[14]) : null,
  }));
  const n = await insertBatch("article", data);
  console.log(`  Inserted ${n} of ${data.length} articles`);
}

async function importAuthors(dump: string) {
  console.log("Importing authors...");
  const rows = extractInserts(dump, "Author");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    name: r[2] ?? "Unknown",
  }));
  const n = await insertBatch("author", data);
  console.log(`  Inserted ${n} of ${data.length} authors`);
}

async function importEvidence(dump: string) {
  console.log("Importing evidence...");
  const rows = extractInserts(dump, "Evidence");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
  }));
  const n = await insertBatch("evidence", data);
  console.log(`  Inserted ${n} of ${data.length} evidence records`);
}

async function importProperty(dump: string) {
  console.log("Importing properties...");
  const rows = extractInserts(dump, "Property");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    subject: r[2] ?? "",
    predicate: r[3] ?? "",
    object: r[4] ?? "",
  }));
  const n = await insertBatch("property", data);
  console.log(`  Inserted ${n} of ${data.length} properties`);
}

async function importTypes(dump: string) {
  console.log("Importing neuron types...");
  const rows = extractInserts(dump, "Type");

  // The Type table columns in the 2012 dump:
  // id, position, dt, subregion, name, nickname, status, notes
  const validSubregions = new Set(["DG", "CA3", "CA2", "CA1", "Sub", "EC"]);

  const data = rows
    .filter((r) => {
      const subregion = r[3] ?? "";
      return validSubregions.has(subregion);
    })
    .map((r) => ({
      id: parseInt(r[0]!),
      position: r[1] ? parseInt(r[1]) : null,
      subregion_id: r[3]!,
      name: r[4] ?? "Unknown",
      nickname: r[5] ?? r[4] ?? "Unknown",
      status: r[6] === "active" ? "active" : "frozen",
      notes: r[7],
      excit_inhib: "unknown" as const,
    }));

  const n = await insertBatch("neuron_type", data);
  console.log(`  Inserted ${n} of ${data.length} neuron types`);
}

async function importFragments(dump: string) {
  console.log("Importing fragments...");
  const rows = extractInserts(dump, "Fragment");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    original_id: r[1] ? parseInt(r[1]) : null,
    quote: r[3],
    page_location: r[4],
    fragment_type: r[5] as "data" | "protocol" | "animal" | null,
    attachment: r[6],
    attachment_type: r[7],
  }));
  const n = await insertBatch("fragment", data);
  console.log(`  Inserted ${n} of ${data.length} fragments`);
}

async function importSynonyms(dump: string) {
  console.log("Importing synonyms...");
  const rows = extractInserts(dump, "Synonym");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    name: r[2] ?? "Unknown",
  }));
  const n = await insertBatch("synonym", data);
  console.log(`  Inserted ${n} of ${data.length} synonyms`);
}

async function importMarkerData(dump: string) {
  console.log("Importing marker data...");
  const rows = extractInserts(dump, "Markerdata");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    expression: r[2],
    animal: r[3],
    protocol: r[4],
  }));
  const n = await insertBatch("marker_data", data);
  console.log(`  Inserted ${n} of ${data.length} marker data records`);
}

async function importEpData(dump: string) {
  console.log("Importing electrophysiology data...");
  const rows = extractInserts(dump, "Epdata");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    raw: r[2],
    value1: r[3],
    value2: r[4],
    error: r[5],
    std_sem: r[6] === "std" || r[6] === "sem" ? r[6] : null,
    n: r[7],
    istim: r[8],
    time_val: r[9],
    unit: r[10],
    location: r[11],
  }));
  const n = await insertBatch("ep_data", data);
  console.log(`  Inserted ${n} of ${data.length} ephys records`);
}

// ============================================================
// Junction / relationship tables
// ============================================================

async function importArticleAuthorRel(dump: string) {
  console.log("Importing article-author relationships...");
  const rows = extractInserts(dump, "ArticleAuthorRel");
  const data = rows.map((r) => ({
    author_id: parseInt(r[2]!),
    article_id: parseInt(r[3]!),
    position: r[4] ? parseInt(r[4]) : null,
  }));
  // Deduplicate by composite key
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.article_id}-${r.author_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("article_author", unique);
  console.log(`  Inserted ${n} of ${unique.length} article-author rels`);
}

async function importArticleEvidenceRel(dump: string) {
  console.log("Importing article-evidence relationships...");
  const rows = extractInserts(dump, "ArticleEvidenceRel");
  const data = rows.map((r) => ({
    article_id: parseInt(r[2]!),
    evidence_id: parseInt(r[3]!),
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.article_id}-${r.evidence_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("article_evidence", unique);
  console.log(`  Inserted ${n} of ${unique.length} article-evidence rels`);
}

async function importEvidencePropertyTypeRel(dump: string) {
  console.log("Importing evidence-property-type relationships...");
  const rows = extractInserts(dump, "EvidencePropertyTypeRel");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    evidence_id: parseInt(r[2]!),
    property_id: parseInt(r[3]!),
    type_id: parseInt(r[4]!),
    article_id: r[5] ? parseInt(r[5]) : null,
    priority: r[6] ? parseInt(r[6]) : null,
    unvetted: r[7] === "1",
  }));
  const n = await insertBatch("evidence_property_type", data);
  console.log(`  Inserted ${n} of ${data.length} EPT rels`);
}

async function importEvidenceFragmentRel(dump: string) {
  console.log("Importing evidence-fragment relationships...");
  const rows = extractInserts(dump, "EvidenceFragmentRel");
  const data = rows.map((r) => ({
    evidence_id: parseInt(r[2]!),
    fragment_id: parseInt(r[3]!),
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.evidence_id}-${r.fragment_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("evidence_fragment", unique);
  console.log(`  Inserted ${n} of ${unique.length} evidence-fragment rels`);
}

async function importEvidenceEvidenceRel(dump: string) {
  console.log("Importing evidence-evidence relationships...");
  const rows = extractInserts(dump, "EvidenceEvidenceRel");
  const data = rows.map((r) => ({
    parent_evidence_id: parseInt(r[2]!),
    child_evidence_id: parseInt(r[3]!),
    relation_type: r[4] === "interpretation" ? "interpretation" : "inference",
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.parent_evidence_id}-${r.child_evidence_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("evidence_evidence", unique);
  console.log(`  Inserted ${n} of ${unique.length} evidence-evidence rels`);
}

async function importEvidenceMarkerDataRel(dump: string) {
  console.log("Importing evidence-marker relationships...");
  const rows = extractInserts(dump, "EvidenceMarkerdataRel");
  const data = rows.map((r) => ({
    evidence_id: parseInt(r[2]!),
    marker_data_id: parseInt(r[3]!),
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.evidence_id}-${r.marker_data_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("evidence_marker_data", unique);
  console.log(`  Inserted ${n} of ${unique.length} evidence-marker rels`);
}

async function importEpDataEvidenceRel(dump: string) {
  console.log("Importing epdata-evidence relationships...");
  const rows = extractInserts(dump, "EpdataEvidenceRel");
  const data = rows.map((r) => ({
    ep_data_id: parseInt(r[2]!),
    evidence_id: parseInt(r[3]!),
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.ep_data_id}-${r.evidence_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("ep_data_evidence", unique);
  console.log(`  Inserted ${n} of ${unique.length} epdata-evidence rels`);
}

async function importSynonymTypeRel(dump: string) {
  console.log("Importing synonym-type relationships...");
  const rows = extractInserts(dump, "SynonymTypeRel");
  const data = rows.map((r) => ({
    synonym_id: parseInt(r[2]!),
    type_id: parseInt(r[3]!),
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.synonym_id}-${r.type_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("synonym_type", unique);
  console.log(`  Inserted ${n} of ${unique.length} synonym-type rels`);
}

async function importArticleSynonymRel(dump: string) {
  console.log("Importing article-synonym relationships...");
  const rows = extractInserts(dump, "ArticleSynonymRel");
  const data = rows.map((r) => ({
    article_id: parseInt(r[2]!),
    synonym_id: parseInt(r[3]!),
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.article_id}-${r.synonym_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("article_synonym", unique);
  console.log(`  Inserted ${n} of ${unique.length} article-synonym rels`);
}

async function importFragmentTypeRel(dump: string) {
  console.log("Importing fragment-type relationships...");
  const rows = extractInserts(dump, "FragmentTypeRel");
  const data = rows.map((r) => ({
    fragment_id: parseInt(r[2]!),
    type_id: parseInt(r[3]!),
    priority: r[4] ? parseInt(r[4]) : null,
  }));
  const seen = new Set<string>();
  const unique = data.filter((r) => {
    const key = `${r.fragment_id}-${r.type_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const n = await insertBatchNoId("fragment_type_rel", unique);
  console.log(`  Inserted ${n} of ${unique.length} fragment-type rels`);
}

async function importTypeTypeRel(dump: string) {
  console.log("Importing type-type connections...");
  const rows = extractInserts(dump, "TypeTypeRel");
  const data = rows.map((r) => ({
    id: parseInt(r[0]!),
    source_type_id: parseInt(r[2]!),
    target_type_id: parseInt(r[3]!),
    connection_status:
      r[4] === "positive"
        ? "positive"
        : r[4] === "negative"
          ? "negative"
          : "unknown",
    connection_location: r[5],
  }));
  const n = await insertBatch("type_connection", data);
  console.log(`  Inserted ${n} of ${data.length} type-type connections`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("=== Hippocampome MySQL Dump Import ===\n");
  console.log(`Reading dump: ${DUMP_PATH}\n`);

  const dump = readFileSync(DUMP_PATH, "utf-8");
  console.log(`Dump size: ${(dump.length / 1024 / 1024).toFixed(1)} MB\n`);

  // Import order matters due to foreign key constraints!
  // 1. Independent tables first
  await importArticles(dump);
  await importAuthors(dump);
  await importEvidence(dump);
  await importProperty(dump);
  await importTypes(dump);
  await importFragments(dump);
  await importSynonyms(dump);
  await importMarkerData(dump);
  await importEpData(dump);

  console.log("\n--- Junction tables ---\n");

  // 2. Junction tables (depend on the above)
  await importArticleAuthorRel(dump);
  await importArticleEvidenceRel(dump);
  await importEvidencePropertyTypeRel(dump);
  await importEvidenceFragmentRel(dump);
  await importEvidenceEvidenceRel(dump);
  await importEvidenceMarkerDataRel(dump);
  await importEpDataEvidenceRel(dump);
  await importSynonymTypeRel(dump);
  await importArticleSynonymRel(dump);
  await importFragmentTypeRel(dump);
  await importTypeTypeRel(dump);

  console.log("\n=== MySQL dump import complete! ===");
  console.log("\nNext steps:");
  console.log("  1. Run: npx tsx scripts/import-csv-data.ts");
  console.log(
    "  2. Refresh search index in Supabase SQL editor: SELECT refresh_search_index();"
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
