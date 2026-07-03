import { Link } from "react-router-dom";
import { MapPin, Star, ShieldCheck, MessageCircle, Sparkles } from "lucide-react";
import { inr } from "@/lib/api";

const AVATAR_COLORS = [
  "bg-amber-500",
  "bg-rose-500", 
  "bg-green-600",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function GuideCard({ guide }) {
  const isNew = !guide.review_count || guide.review_count === 0;
  const topSpeciality = (guide.specialities || [])[0] || "";
  const avatarColor = getColor(guide.name);

  return (
    <Link
      to={`/guides/${guide.id}`}
      data-testid={`guide-card-${guide.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-green-800 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`h-12 w-12 shrink-0 rounded-full ${avatarColor} flex items-center justify-center overflow-hidden`}>
            {guide.avatar_url ? (
              <img
                src={guide.avatar_url}
                alt={guide.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-white font-heading font-bold text-sm">
                {getInitials(guide.name)}
              </span>
            )}
          </div>

          {/* Name + speciality */}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-semibold text-stone-900">{guide.name}</span>
              {guide.verified && (
                <ShieldCheck className="h-4 w-4 text-green-700 shrink-0" />
              )}
            </div>
            {topSpeciality && (
              <div className="text-xs text-stone-500 mt-0.5 capitalize">{topSpeciality}</div>
            )}
          </div>
        </div>

        {/* New badge */}
        {isNew && (
          <span className="shrink-0 text-xs font-semibold text-amber-600">New</span>
        )}
      </div>

      {/* Bio */}
      <p className="mt-4 text-sm text-stone-600 leading-relaxed line-clamp-3">
        {guide.bio}
      </p>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="h-3.5 w-3.5" />
          {guide.city}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {guide.review_count > 0 && (
            <span className="flex items-center gap-1 text-stone-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {guide.rating?.toFixed(1)}
            </span>
          )}
          <div className="font-heading font-semibold text-stone-900">
            {guide.offers_chat && (
              <span className="flex items-center gap-1">
                {inr(199)}
                <span className="font-normal text-stone-400">chat</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
