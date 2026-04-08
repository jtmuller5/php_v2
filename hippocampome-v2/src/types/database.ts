export type NeuronStatus = "active" | "frozen";
export type NeurotransmitterType = "excitatory" | "inhibitory" | "unknown";
export type ConnectionStatus = "positive" | "negative" | "unknown";
export type FragmentKind = "data" | "protocol" | "animal";
export type ErrorType = "std" | "sem";
export type EvidenceRelationType = "interpretation" | "inference";

export interface Subregion {
  id: string;
  name: string;
  display_order: number;
}

export interface NeuronType {
  id: number;
  subregion_id: string;
  name: string;
  nickname: string;
  status: NeuronStatus;
  excit_inhib: NeurotransmitterType;
  supertype: string | null;
  type_subtype: string | null;
  position: number | null;
  ranks: string | null;
  notes: string | null;
  explanatory_notes: string | null;
  v2p0: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  pmid_isbn: number | null;
  pmcid: string | null;
  nihmsid: string | null;
  doi: string | null;
  open_access: boolean | null;
  title: string | null;
  publication: string | null;
  volume: string | null;
  issue: string | null;
  first_page: number | null;
  last_page: number | null;
  year: string | null;
  citation_count: number | null;
  created_at: string;
}

export interface Author {
  id: number;
  name: string;
}

export interface Evidence {
  id: number;
  created_at: string;
}

export interface Property {
  id: number;
  subject: string;
  predicate: string;
  object: string;
}

export interface EvidencePropertyType {
  id: number;
  evidence_id: number;
  property_id: number;
  type_id: number;
  article_id: number | null;
  priority: number | null;
  unvetted: boolean;
  linking_quote: string | null;
  interpretation_notes: string | null;
  created_at: string;
}

export interface Fragment {
  id: number;
  original_id: number | null;
  quote: string | null;
  page_location: string | null;
  fragment_type: FragmentKind | null;
  attachment: string | null;
  attachment_type: string | null;
  created_at: string;
}

export interface Synonym {
  id: number;
  name: string;
}

export interface MarkerData {
  id: number;
  expression: string | null;
  animal: string | null;
  protocol: string | null;
}

export interface EpData {
  id: number;
  raw: string | null;
  value1: string | null;
  value2: string | null;
  error: string | null;
  std_sem: ErrorType | null;
  n: string | null;
  istim: string | null;
  time_val: string | null;
  unit: string | null;
  location: string | null;
}

export interface TypeConnection {
  id: number;
  source_type_id: number;
  target_type_id: number;
  connection_status: ConnectionStatus;
  connection_location: string | null;
}

export interface ConnectivityData {
  id: number;
  source_type_id: number;
  target_type_id: number;
  layers: string;
}

export interface SynapseProbability {
  id: number;
  source_type_id: number;
  target_type_id: number;
  sp_mean: number | null;
  sp_stdev: number | null;
}

export interface NumberOfContacts {
  id: number;
  source_type_id: number;
  target_type_id: number;
  noc_mean: number | null;
  noc_stdev: number | null;
}

export interface PopulationCount {
  id: number;
  type_id: number;
  count_value: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
}

export interface FiringPattern {
  id: number;
  type_id: number;
  overall_fp: string | null;
  delay_ms: number | null;
  pfs_ms: number | null;
  swa_mv: number | null;
  n_isi: number | null;
  isi_avg_ms: number | null;
  sd_ms: number | null;
  max_isi_ms: number | null;
  min_isi_ms: number | null;
  first_isi_ms: number | null;
  last_isi_ms: number | null;
  accommodation_index: number | null;
  parameters: Record<string, unknown>;
}

export interface IzhModel {
  id: number;
  type_id: number;
  name: string | null;
  preferred: boolean;
  is_multi_compartment: boolean;
  created_at: string;
}

export interface IzhCompartment {
  id: number;
  model_id: number;
  compartment_index: number;
  k: number | null;
  a: number | null;
  b: number | null;
  d: number | null;
  capacitance: number | null;
  v_rest: number | null;
  v_threshold: number | null;
  v_peak: number | null;
  v_min: number | null;
  coupling_g: number | null;
  coupling_p: number | null;
}

export interface TmSynapseModel {
  id: number;
  source_type_id: number;
  target_type_id: number;
  conductance_mean: number | null;
  tau_d_mean: number | null;
  tau_r_mean: number | null;
  tau_f_mean: number | null;
  utilization_mean: number | null;
  species: string | null;
  sex: string | null;
  age: string | null;
  temperature: string | null;
  recording_mode: string | null;
}

export interface NeuriteLength {
  id: number;
  type_id: number;
  parcel: string;
  neurite_id: number | null;
  total_length_avg: number | null;
  total_length_std: number | null;
  values_count: number | null;
}

export interface GeneExpression {
  id: number;
  type_id: number;
  gene_name: string;
  parcel: string;
  expression_level: number | null;
  confidence: number | null;
}

// ============================================================
// RPC return types
// ============================================================

export interface SearchResult {
  entity_type: "neuron_type" | "article" | "synonym" | "fragment";
  entity_id: number;
  title: string;
  subtitle: string | null;
  subregion: string | null;
  rank: number;
}

export interface DashboardStats {
  neuron_count: number;
  article_count: number;
  connection_count: number;
  evidence_count: number;
  subregion_counts: Array<{ id: string; count: number }>;
}

export interface NeuronConnection {
  direction: "incoming" | "outgoing";
  connected_type_id: number;
  connected_nickname: string;
  connected_subregion: string;
  connected_excit_inhib: NeurotransmitterType;
  layers: string;
  sp_mean: number | null;
  noc_mean: number | null;
}

export interface EvidenceTrailItem {
  evidence_id: number;
  fragment_quote: string | null;
  fragment_page: string | null;
  article_title: string | null;
  article_pmid: number | null;
  article_year: string | null;
  authors: string | null;
}

// ============================================================
// Joined/enriched types for UI
// ============================================================

export interface NeuronTypeWithRelations extends NeuronType {
  population_count: PopulationCount[];
  synonyms: Synonym[];
  izh_models: (IzhModel & { izh_compartment: IzhCompartment[] })[];
}

export interface ArticleWithAuthors extends Article {
  authors: (Author & { position: number })[];
}
