import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import GuideCard from "@/components/GuideCard";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search } from "lucide-react";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [guides, setGuides] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  const city = params.get("city") || "";
  const sort = params.get("sort") || "rating";
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState([
    Number(params.get("min_price") || 499),
    Number(params.get("max_price") || 1999),
  ]);

  useEffect(() => {
    api.get("/guides/cities").then(({ data }) => setCities(data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = {};
    if (city) query.city = city;
    if (sort) query.sort = sort;
    query.min_price = priceRange[0];
    query.max_price = priceRange[1];
    api.get("/guides", { params: query }).then(({ data }) => {
      setGuides(data);
      setLoading(false);
    });
  }, [city, sort, priceRange]);

  const filtered = useMemo(() => {
    if (!search.trim()) return guides;
    const q = search.toLowerCase();
    return guides.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.bio.toLowerCase().includes(q) ||
        (g.specialities || []).some((s) => s.toLowerCase().includes(q))
    );
  }, [guides, search]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "" || value === "any") next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  return (
    <div data-testid="browse-page" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Browse</div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Find your local
          </h1>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            data-testid="browse-search"
            placeholder="Search by name, speciality…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">City</label>
            <Select value={city || "any"} onValueChange={(v) => update("city", v)}>
              <SelectTrigger data-testid="filter-city" className="mt-2">
                <SelectValue placeholder="Any city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any city</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">Sort by</label>
            <Select value={sort} onValueChange={(v) => update("sort", v)}>
              <SelectTrigger data-testid="filter-sort" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="price_low">Price: low to high</SelectItem>
                <SelectItem value="price_high">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Price ₹{priceRange[0]} – ₹{priceRange[1]}
            </label>
            <div className="mt-4 px-1">
              <Slider
                data-testid="filter-price"
                min={499}
                max={1999}
                step={100}
                value={priceRange}
                onValueChange={(v) => setPriceRange(v)}
              />
            </div>
          </div>
        </aside>

        <section>
          {loading ? (
            <div data-testid="browse-loading" className="grid place-items-center py-20 text-stone-500">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div data-testid="browse-empty" className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
              No locals match your filters yet. Try widening the search.
            </div>
          ) : (
            <div data-testid="browse-grid" className="grid gap-5 sm:grid-cols-2">
              {filtered.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
