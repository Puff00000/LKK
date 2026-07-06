import { Link } from "react-router-dom";
import { MapPin, Star, ShieldCheck, Clock } from "lucide-react";
import { inr } from "@/lib/api";

const CATEGORY_LABELS = {
  food: "🍜 Food & Drink",
  shopping: "🛍️ Shopping",
  culture: "🏛️ Culture & Heritage",
  photography: "📸 Photography",
  experience: "🎨 Experience",
  nature: "🌿 Nature",
};

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
  for (let i = 0; i < (name || "").length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ServiceCard({ service }) {
  const avatarColor = getColor(service.guide_name);

  return (
    <Link
      to={`/services/${service.id}`}
      data-testid={`service-card-${service.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-green-800 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-500">{CATEGORY_LABELS[service.category] || service.category}</span>
        <span className="flex items-center gap-1 text-xs text-stone-500">
          <Clock className="h-3.5 w-3.5" /> {service.duration_hours}h
        </span>
      </div>

      <h3 className="mt-2 font-heading text-lg font-semibold text-stone-900 leading-snug">{service.title}</h3>
      <p className="mt-1.5 text-sm text-stone-600 leading-relaxed line-clamp-2">{service.description}</p>

      <div className="mt-4 flex items-center gap-2">
        <div className={`h-7 w-7 shrink-0 rounded-full ${avatarColor} flex items-center justify-center overflow-hidden`}>
          {service.guide_avatar_url ? (
            <img src={service.guide_avatar_url} alt={service.guide_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-white font-heading font-bold text-[10px]">{getInitials(service.guide_name)}</span>
          )}
        </div>
        <span className="text-sm text-stone-700">{service.guide_name}</span>
        {service.guide_verified && <ShieldCheck className="h-3.5 w-3.5 text-green-700" />}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        <div className="flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="h-3.5 w-3.5" /> {service.guide_city}
        </div>
        <div className="flex items-center gap-3">
          {service.guide_review_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {service.guide_rating?.toFixed(1)}
            </span>
          )}
          <span className="font-heading font-semibold text-stone-900">{inr(service.price)}</span>
        </div>
      </div>
    </Link>
  );
}
