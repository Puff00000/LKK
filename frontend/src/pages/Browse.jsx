import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import ServiceCard from "@/components/ServiceCard";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Sparkles, CalendarRange, Pencil } from "lucide-react";
import { getTripDraft, tripDraftDayCount } from "@/lib/tripDraft";

const CATEGORIES = [
  { value: "any", label: "All categories" },
  { value: "food", label: "🍜 Food & Drink" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "culture", label: "🏛️ Culture & Heritage" },
  { value: "photography", label: "📸 Photography" },
  { value: "experience", label: "🎨 Experience" },
  { value: "nature", label: "🌿 Nature" },
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [tripDraft, setLocalTripDraft] = useState(() => getTripDraft());
  const [citySearch, setCitySearch] = useState(params.get("city") || tripDraft?.city || "");
  const category = params.get("category") || "any";
  const sort = params.get("sort") || "newest";

  useEffect(() => {
    // Refresh in case the draft changed since last visit (e.g. they went back and edited it)
    setLocalTripDraft(getTripDraft());
  }, []);

  useEffect(() => {
    api.get("/guides/cities").then(({ data }) => setCities(data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = { sort };
    if (citySearch.trim()) query.city = citySearch.trim();
    if (category !== "any") query.category = category;
    api.get("/services", { params: query }).then(({ data }) => {
      setServices(data);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, category, citySearch]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return services;
    const q = keyword.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.guide_name.toLowerCase().includes(q)
    );
  }, [services, keyword]);

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
          Find a bite-sized experience
        </h1>
        <p className="mt-3 text-stone-500 text-base max-w-xl mx-auto">
          Bargain a market, walk a street food trail, chase the sunrise — book 2 to 8 hours with a real local, in person.
        </p>
      </div>

      {/* Trip context banner */}
      {tripDraft?.city && (
        <div data-testid="trip-context-banner" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-green-900">
            <CalendarRange className="h-4 w-4 shrink-0" />
            <span>
              Your trip: <span className="font-semibold">{tripDraft.city}</span>
              {tripDraft.startDate && tripDraft.endDate && (
                <> · {tripDraft.startDate} → {tripDraft.endDate} ({tripDraftDayCount(tripDraft)} day{tripDraftDayCount(tripDraft) !== 1 ? "s" : ""})</>
              )}
            </span>
          </div>
          <Link to="/create-trip" data-testid="edit-trip-link" className="flex items-center gap-1 text-sm font-medium text-green-800 hover:underline">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </div>
      )}

      {/* Search bar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-0 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r border-stone-200">
          <Sparkles className="h-4 w-4 text-stone-400 shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">Service</div>
            <input
              data-testid="browse-search-service"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Street food, bargaining, sunrise…"
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
              list="browse-cities"
              className="w-full mt-0.5 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent outline-none"
            />
            <datalist id="browse-cities">
              {cities.map((c) => <option key={c} value={c} />)}
            </datalist>
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

      {/* Category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            data-testid={`category-chip-${c.value}`}
            onClick={() => update("category", c.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              category === c.value
                ? "border-green-800 bg-green-800 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-green-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Results header */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-stone-500">
          {loading ? "Loading…" : `${filtered.length} experience${filtered.length !== 1 ? "s" : ""} found`}
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span>SORT</span>
          <Select value={sort} onValueChange={(v) => update("sort", v)}>
            <SelectTrigger data-testid="filter-sort" className="h-9 border-stone-200 text-stone-700 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Top rated local</SelectItem>
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
            No experiences match your search yet. Try a different keyword, city, or category.
          </div>
        ) : (
          <div data-testid="browse-grid" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
