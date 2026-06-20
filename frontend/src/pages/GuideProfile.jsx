import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MapPin, Languages, Sparkles, ArrowLeft, ShieldCheck, ShieldAlert, MessageCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const absoluteUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_URL}${u}`);

export default function GuideProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const { guide, reviews } = data;

  const handleBook = (tier) => {
    if (!user) return navigate(`/login?next=/book/${guide.id}?tier=${tier}`);
    if (user.role !== "traveller") return navigate("/");
    navigate(`/book/${guide.id}?tier=${tier}`);
  };

  const offersChat = guide.offers_chat !== false;
  const offersInPerson = guide.offers_in_person === true;

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
              <p className="mt-3 text-stone-500" data-testid="no-reviews">No reviews yet. Be the first to travel with {guide.name.split(" ")[0]}.</p>
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

        {/* Book card(s) */}
        <aside className="space-y-4 lg:sticky lg:top-24" data-testid="booking-tiers">
          {offersChat && (
            <div className="rounded-2xl border-2 border-amber-300 bg-white p-5" data-testid="tier-chat-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-700">
                <MessageCircle className="h-4 w-4" /> Chat-only
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-heading">
                <span className="text-3xl font-bold text-stone-900">{inr(199)}</span>
                <span className="text-xs text-stone-500">/ one-time</span>
              </div>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Custom itinerary in writing + in-app chat with {guide.name.split(" ")[0]} before & during your trip.
              </p>
              <Button
                data-testid="book-chat-btn"
                onClick={() => handleBook("chat")}
                className="mt-4 w-full h-11 bg-amber-600 text-white hover:bg-amber-700 hover:text-white"
              >
                Book chat-only
              </Button>
            </div>
          )}
          {offersInPerson && (
            <div className="rounded-2xl border-2 border-green-700 bg-white p-5" data-testid="tier-in-person-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-800">
                <Sparkles className="h-4 w-4" /> In-person
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-heading">
                <span className="text-3xl font-bold text-stone-900">{inr(499)}</span>
                <span className="text-xs text-stone-500">/ per day</span>
              </div>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Everything in chat-only — plus {guide.name.split(" ")[0]} walks the city with you, booked per day.
              </p>
              <Button
                data-testid="book-in-person-btn"
                onClick={() => handleBook("in_person")}
                className="mt-4 w-full h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white"
              >
                Book in-person
              </Button>
            </div>
          )}
          <ul className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-xs text-stone-600">
            <li>✓ Payment held until itinerary received</li>
            <li>✓ Dispute resolution within 24 hours</li>
            <li>✓ 90% of every booking goes to your local</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
