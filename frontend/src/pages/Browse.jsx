import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import GuideCard from "@/components/GuideCard";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Sparkles } from "lucide-react";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [guides, setGuides] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceSearch, setServiceSearch] = useState("");
  const [citySearch, setCitySearch] = useState(params.get("city") || "");
  const sort = params.get("sort") || "rating";

  useEffect(() => {
    api.get("/guides/cities").then(({ data }) => setCities(data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = {};
    if (sort) query.sort = sort;
    query.min_price = 199;
    query.max_price = 9999;
    api.get("/guides", { params: query }).then(({ data }) => {
      setGuides(data);
      setLoading(false);
    });
  }, [sort]);

  const filtered = useMemo(() => {
    let result = guides;
    if (citySearch.trim()) {
      const q = citySearch.toLowerCase();
      result = result.filter((g) => g.city.toLowerCase().includes(q));
    }
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.bio.toLowerCase().includes(q) ||
          (g.specialities || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [guides, serviceSearch, citySearch]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "" || value === "any") next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  return (
    <div data-testid="browse-page" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-green-800">Browse</div>
        <h1 className="mt-2 font-heading text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
          Find your local
        </h1>
        <p className="mt-3 text-stone-500 text-base max-w-xl mx-auto">
          Search by what you want to do — food trails, heritage walks, café crawls — and the city you're heading to.
        </p>
      </div>

      {/* Search bar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-0 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r border-stone-200">
          <Sparkles className="h-4 w-4 text-stone-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">Service</div>
            <input
              data-testid="browse-search-service"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="e.g. Food trail, Heritage walk..."
              className="w-full mt-0.5 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r border-stone-200">
          <MapPin className="h-4 w-4 text-stone-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">City</div>
            <input
              data-testid="browse-search-city"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="e.g. Jaipur, Goa..."
              className="w-full mt-0.5 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-center px-5 py-4">
          <div className="h-10 w-10 rounded-xl bg-green-800 flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-stone-500">
          {loading ? "Loading…" : `${filtered.length} local${filtered.length !== 1 ? "s" : ""} found`}
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span>SORT</span>
          <Select value={sort} onValueChange={(v) => update("sort", v)}>
            <SelectTrigger data-testid="filter-sort" className="h-9 border-stone-200 text-stone-700 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="price_low">Price: low to high</SelectItem>
              <SelectItem value="price_high">Price: high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <section className="mt-5">
        {loading ? (
          <div data-testid="browse-loading" className="grid place-items-center py-20 text-stone-500">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div data-testid="browse-empty" className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
            No locals match your search yet. Try different keywords or city.
          </div>
        ) : (
          <div data-testid="browse-grid" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {filtered.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
