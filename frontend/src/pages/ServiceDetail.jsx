import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MapPin, Clock, ArrowLeft, ShieldCheck, ShieldAlert, IndianRupee } from "lucide-react";

const CATEGORY_LABELS = {
  food: "🍜 Food & Drink",
  shopping: "🛍️ Shopping",
  culture: "🏛️ Culture & Heritage",
  photography: "📸 Photography",
  experience: "🎨 Experience",
  nature: "🌿 Nature",
};

const EXTRA_COST_ROWS = [
  { key: "food", label: "Food & drinks" },
  { key: "entry", label: "Entry fees" },
  { key: "shopping", label: "Shopping" },
  { key: "transport", label: "Transport" },
];

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/services/${id}`).then(({ data }) => {
      setService(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="grid place-items-center py-20 text-stone-500" data-testid="service-loading">Loading…</div>;
  if (!service) return <div className="py-20 text-center text-stone-500">Service not found</div>;

  const extraCostRows = EXTRA_COST_ROWS
    .map((r) => ({
      ...r,
      min: service[`extra_${r.key}_min`],
      max: service[`extra_${r.key}_max`],
    }))
    .filter((r) => r.min != null || r.max != null);

  const allInclusive = extraCostRows.length === 0;

  const handleBook = () => {
    if (user && user.role !== "traveller") return navigate("/");
    navigate(`/book/${service.id}`);
  };

  return (
    <div data-testid="service-detail-page" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        data-testid="back-btn"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-green-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px] items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-green-800">
              {CATEGORY_LABELS[service.category] || service.category}
            </span>
          </div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            {service.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-stone-600">
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-green-700" /> {service.duration_hours} hours</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-green-700" /> {service.guide_city}</span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-green-700 text-green-700" /> {service.guide_rating?.toFixed(1) || "New"} · {service.guide_review_count || 0} reviews
            </span>
          </div>

          <p className="mt-7 text-base text-stone-700 leading-relaxed whitespace-pre-line">{service.description}</p>

          {/* Local */}
          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-green-50 grid place-items-center font-heading text-lg text-green-800">
                {service.guide_avatar_url ? (
                  <img src={service.guide_avatar_url} alt={service.guide_name} className="h-full w-full object-cover" />
                ) : (
                  service.guide_name?.[0]
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-semibold text-stone-900">{service.guide_name}</span>
                  {service.guide_verified ? (
                    <Badge className="bg-green-800 text-white hover:bg-green-800 gap-1 h-5 text-[10px]">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1 h-5 text-[10px]">
                      <ShieldAlert className="h-3 w-3" /> Unverified
                    </Badge>
                  )}
                </div>
                {service.guide_bio && (
                  <p className="mt-1 text-sm text-stone-600 leading-relaxed line-clamp-2">{service.guide_bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="mt-8">
            <h2 className="font-heading text-xl font-bold text-stone-900">What's included</h2>
            <div className="mt-3 rounded-xl border border-stone-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <ShieldCheck className="h-4 w-4" /> The service fee always covers your local's time, expertise, and guidance.
              </div>

              {allInclusive ? (
                <div className="mt-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-900 font-medium">
                  ✅ All inclusive — no extra costs flagged for this experience.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="text-xs uppercase tracking-[0.15em] text-stone-400">Extra costs, paid on the ground</div>
                  {extraCostRows.map((r) => (
                    <div key={r.key} className="flex items-center justify-between text-sm">
                      <span className="text-stone-600 flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> {r.label}</span>
                      <span className="text-stone-900 font-medium">
                        {inr(r.min || 0)}{r.max ? ` – ${inr(r.max)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {service.cost_note && (
                <div className="mt-4 rounded-lg bg-stone-50 border border-stone-100 px-4 py-3 text-sm text-stone-700">
                  <span className="font-medium">{service.guide_name.split(" ")[0]}'s note: </span>{service.cost_note}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Book card */}
        <aside className="space-y-4 lg:sticky lg:top-24" data-testid="booking-card">
          <div className="rounded-2xl border-2 border-green-700 bg-white p-5">
            <div className="flex items-baseline gap-1 font-heading">
              <span className="text-3xl font-bold text-stone-900">{inr(service.price)}</span>
              <span className="text-xs text-stone-500">/ {service.duration_hours}h</span>
            </div>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Covers {service.guide_name.split(" ")[0]}'s time only. In-person meetup, {service.duration_hours} hours.
            </p>
            <Button
              data-testid="book-service-btn"
              onClick={handleBook}
              className="mt-4 w-full h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            >
              Book for {inr(service.price)}
            </Button>
          </div>
          <ul className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-xs text-stone-600">
            <li>✓ Payment held until you confirm the meetup happened</li>
            <li>✓ Dispute resolution within 24 hours</li>
            <li>✓ 90% of every booking goes to your local</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
