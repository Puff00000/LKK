import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Languages, Sparkles, ArrowLeft, ShieldCheck, ShieldAlert, Clock } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const absoluteUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_URL}${u}`);

const CATEGORY_LABELS = {
  food: "🍜 Food & Drink",
  shopping: "🛍️ Shopping",
  culture: "🏛️ Culture & Heritage",
  photography: "📸 Photography",
  experience: "🎨 Experience",
  nature: "🌿 Nature",
};

export default function GuideProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/guides/${id}`).then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="grid place-items-center py-20 text-stone-500" data-testid="guide-loading">Loading…</div>;
  if (!data) return <div className="py-20 text-center text-stone-500">Guide not found</div>;

  const { guide, reviews, services } = data;

  return (
    <div data-testid="guide-profile-page" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        data-testid="back-btn"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-green-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px] items-start">
        <div>
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-1 ring-stone-200">
              {guide.avatar_url ? (
                <img src={absoluteUrl(guide.avatar_url)} alt={guide.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-green-50 font-heading text-2xl text-green-800">
                  {guide.name?.[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">{guide.name}</h1>
                {guide.verified ? (
                  <Badge data-testid="guide-verified" className="bg-green-800 text-white hover:bg-green-800 gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified
                  </Badge>
                ) : (
                  <Badge data-testid="guide-unverified" variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Unverified
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-green-700" /> {guide.city}</span>
                <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-green-700 text-green-700" /> {guide.rating?.toFixed(1) || "New"} · {guide.review_count || 0} reviews</span>
              </div>
            </div>
          </div>

          {guide.video_url && (
            <div className="mt-6 overflow-hidden rounded-2xl bg-stone-900" data-testid="guide-intro-video">
              <video src={guide.video_url} controls className="w-full max-h-[360px] object-cover" />
            </div>
          )}

          <p className="mt-7 text-base text-stone-700 leading-relaxed whitespace-pre-line">{guide.bio}</p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-800">
                <Languages className="h-4 w-4" /> Languages
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(guide.languages || []).map((l) => <span key={l} className="chip">{l}</span>)}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-800">
                <Sparkles className="h-4 w-4" /> Specialities
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(guide.specialities || []).map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-2xl font-bold text-stone-900">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-stone-500" data-testid="no-reviews">No reviews yet. Be the first to book {guide.name.split(" ")[0]}.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} data-testid={`review-${r.id}`} className="rounded-xl border border-stone-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-stone-900">{r.traveller_name}</div>
                      <div className="flex items-center gap-1 text-sm text-stone-700">
                        <Star className="h-4 w-4 fill-green-700 text-green-700" /> {r.rating}/5
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-stone-600 leading-relaxed">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Services list */}
        <aside className="space-y-3 lg:sticky lg:top-24" data-testid="services-list">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
            {services.length} bookable experience{services.length !== 1 ? "s" : ""}
          </div>
          {services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
              No services listed yet.
            </div>
          ) : (
            services.map((s) => (
              <Link
                key={s.id}
                to={`/services/${s.id}`}
                data-testid={`service-link-${s.id}`}
                className="block rounded-2xl border-2 border-stone-200 bg-white p-5 hover:border-green-700 transition-colors"
              >
                <div className="text-xs font-medium text-stone-500">{CATEGORY_LABELS[s.category] || s.category}</div>
                <div className="mt-1 font-heading text-base font-semibold text-stone-900">{s.title}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-stone-500"><Clock className="h-3.5 w-3.5" /> {s.duration_hours}h</span>
                  <span className="font-heading font-bold text-stone-900">{inr(s.price)}</span>
                </div>
              </Link>
            ))
          )}
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
