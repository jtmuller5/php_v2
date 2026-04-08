"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";

const NAV_LINKS = [
  { href: "/neurons", label: "Neurons" },
  { href: "/connectivity", label: "Connectivity" },
  { href: "/simulate", label: "Simulate" },
  { href: "/articles", label: "Articles" },
  { href: "/authors", label: "Authors" },
  { href: "/explore", label: "Explore" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Hippocampome
            </span>
            <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 sm:inline-block">
              v2
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="w-72">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
