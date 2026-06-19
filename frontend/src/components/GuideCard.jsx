import { Link } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { inr } from "@/lib/api";

export default function GuideCard({ guide }) {
  return (
    <Link
      to={`/guides/${guide.id}`}
      data-testid={`guide-card-${guide.id}`}
      className="group flex flex-col rounded-xl border border-stone-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-green-800 hover:shadow-[0_8px_30px_rgba(22,101,52,0.08)]"
    >
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-green-50 ring-1 ring-stone-200">
          {guide.avatar_url ? (
            <img src={guide.avatar_url} alt={guide.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center font-heading text-xl text-green-800">
              {guide.name?.[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg font-semibold text-stone-900 group-hover:text-green-800">
            {guide.name}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-stone-500">
            <MapPin className="h-3.5 w-3.5" />
            {guide.city}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm font-medium text-stone-900">
            <Star className="h-4 w-4 fill-green-700 text-green-700" />
            {guide.rating ? guide.rating.toFixed(1) : "New"}
          </div>
          <div className="text-xs text-stone-500">{guide.review_count || 0} reviews</div>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm text-stone-600 leading-relaxed">{guide.bio}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(guide.specialities || []).slice(0, 3).map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>
      <div className="mt-5 flex items-end justify-between border-t border-stone-100 pt-4">
        <div>
          <div className="text-xs text-stone-500">Starting at</div>
          <div className="font-heading text-2xl font-bold text-stone-900">{inr(guide.price)}</div>
        </div>
        <span className="text-sm font-medium text-green-800 group-hover:underline">View profile →</span>
      </div>
    </Link>
  );
}
