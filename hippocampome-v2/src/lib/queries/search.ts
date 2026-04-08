import { SupabaseClient } from "@supabase/supabase-js";
import type { SearchResult } from "@/types/database";

export async function searchAll(
  client: SupabaseClient,
  query: string,
  options?: {
    entityFilter?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<SearchResult[]> {
  const { data, error } = await client.rpc("search_all", {
    query,
    entity_filter: options?.entityFilter ?? null,
    limit_val: options?.limit ?? 20,
    offset_val: options?.offset ?? 0,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getDashboardStats(client: SupabaseClient) {
  const { data, error } = await client.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}
