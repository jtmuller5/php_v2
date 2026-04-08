"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { searchAll } from "@/lib/queries/search";
import { SubregionBadge } from "@/components/ui/SubregionBadge";
import type { SearchResult } from "@/types/database";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase = createBrowserSupabase();

  const performSearch = useDebouncedCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchAll(supabase, q, { limit: 8 });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 250);

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    switch (result.entity_type) {
      case "neuron_type":
      case "synonym":
        router.push(`/neurons/${result.entity_id}`);
        break;
      case "article":
        router.push(`/articles/${result.entity_id}`);
        break;
      case "fragment":
        router.push(`/search?q=${encodeURIComponent(query)}`);
        break;
    }
  }

  const entityLabel: Record<string, string> = {
    neuron_type: "Neuron",
    article: "Article",
    synonym: "Synonym",
    fragment: "Fragment",
  };

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search neurons, articles..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
          {results.map((result) => (
            <button
              key={`${result.entity_type}-${result.entity_id}`}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
              onMouseDown={() => handleSelect(result)}
            >
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                {entityLabel[result.entity_type] ?? result.entity_type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {result.title}
                </p>
                {result.subtitle && (
                  <p className="truncate text-xs text-gray-400">
                    {result.subtitle}
                  </p>
                )}
              </div>
              {result.subregion && (
                <SubregionBadge subregion={result.subregion} size="sm" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
