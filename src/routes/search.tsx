import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Magnifier, CalendarMark, MapPoint, ClockCircle, CloseCircle } from "@solar-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Find a Business — Cadence" }] }),
  component: SearchPage,
});

type Business = {
  _id: string;
  name: string;
  industry: string;
  timezone: string;
};

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Smart autocomplete - search as user types
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length >= 1) {
        setLoading(true);
        try {
          const data = await apiFetch<{ success: boolean; businesses: Business[] }>(
            `/business/search?q=${encodeURIComponent(query)}`,
          );
          setResults(data.businesses || []);
          setShowDropdown(data.businesses && data.businesses.length > 0);
        } catch (err) {
          console.error("Search failed:", err);
          setResults([]);
          setShowDropdown(false);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setShowDropdown(false);
  };

  const handleBusinessClick = (businessId: string) => {
    setShowDropdown(false);
    window.location.href = `/book/${businessId}`;
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSearched(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <CalendarMark className="h-5 w-5" />
            Cadence
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link to="/signup" className="text-sm font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">Find a business</h1>
          <p className="text-muted-foreground">
            Search for businesses by name to book appointments
          </p>
        </div>

        {/* Search form with autocomplete */}
        <div className="relative mb-8">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Magnifier className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by business name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowDropdown(results.length > 0)}
                  className="pl-10 pr-10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <CloseCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {/* Autocomplete dropdown */}
          {showDropdown && results.length > 0 && !searched && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-card shadow-lg">
              <div className="max-h-96 overflow-y-auto">
                {results.map((business) => (
                  <button
                    key={business._id}
                    type="button"
                    onClick={() => handleBusinessClick(business._id.toString())}
                    className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{business.name}</h3>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPoint className="h-3.5 w-3.5" />
                            {business.industry.replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockCircle className="h-3.5 w-3.5" />
                            {business.timezone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results after search submit */}
        {searched && (
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">No businesses found matching "{query}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} {results.length === 1 ? "business" : "businesses"}
                </p>
                {results.map((business) => (
                  <a
                    key={business._id}
                    href={`/book/${business._id.toString()}`}
                    className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{business.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPoint className="h-3.5 w-3.5" />
                            {business.industry.replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockCircle className="h-3.5 w-3.5" />
                            {business.timezone}
                          </span>
                        </div>
                      </div>
                      <Button size="sm">Book</Button>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
