"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AuthorSearchProps {
  initialQuery: string;
}

export function AuthorSearch({ initialQuery }: AuthorSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/authors?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Search by author name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Search
      </button>
      {initialQuery && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            router.push("/authors");
          }}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Clear
        </button>
      )}
    </form>
  );
}
