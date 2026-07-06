import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarIcon, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STATUS = {
  pending_payment: { text: "Awaiting payment", className: "bg-amber-50 text-amber-800 border-amber-200" },
  paid:            { text: "Paid · awaiting acceptance", className: "bg-blue-50 text-blue-800 border-blue-200" },
  accepted:        { text: "Accepted", className: "bg-green-50 text-green-800 border-green-200" },
  itinerary_delivered: { text: "Itinerary received", className: "bg-green-50 text-green-900 border-green-300" },
  completed:       { text: "Completed", className: "bg-stone-100 text-stone-700 border-stone-200" },
  cancelled:       { text: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  disputed:        { text: "In dispute", className: "bg-red-50 text-red-800 border-red-200" },
};

export default function TravellerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bookings/mine").then(({ data }) => {
      setBookings(data);
      setLoading(false);
    });
  }, []);

  const upcoming = bookings.filter((b) => !["completed", "cancelled"].includes(b.status));
  const past = bookings.filter((b) => ["completed", "cancelled"].includes(b.status));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10" data-testid="traveller-dashboard">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Traveller Dashboard</div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Your trips
          </h1>
          <p className="mt-1 text-stone-500 text-sm">Manage upcoming bookings and look back at past adventures.</p>
        </div>
        <Link to="/browse">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white h-11 px-5">
            Browse locals <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-10 text-stone-500">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-16 text-center">
          <div className="font-heading text-xl text-stone-900">No trips yet</div>
          <p className="mt-2 text-stone-500">Pick a local from any city and start your first journey.</p>
          <Link to="/browse" className="mt-4 inline-block text-green-800 font-medium hover:underline">
            Browse locals →
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold text-stone-900">Upcoming</h2>
              <ul className="mt-4 space-y-4">
                {upcoming.map((b) => {
                  const meta = STATUS[b.status] || STATUS.pending_payment;
                  return (
                    <li key={b.id}>
                      <Link
                        to={`/bookings/${b.id}`}
                        className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-green-800 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-heading text-lg font-semibold text-stone-900">{b.guide_name}</div>
                              <Badge variant="outline" className={meta.className}>{meta.text}</Badge>
                            </div>
                            <div className="text-sm text-stone-700 mt-1">{b.service_title}</div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {b.guide_city}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3.5 w-3.5" /> {b.booking_date} · {b.booking_time}
                              </span>
                              <span>{b.duration_hours}h in person</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-heading text-xl font-bold text-stone-900">{inr(b.amount)}</div>
                            <div className="text-xs text-stone-400 mt-0.5">MOCK PAYMENT</div>
                          </div>
                        </div>
                        {b.status === "itinerary_delivered" && (
                          <div className="mt-3 rounded-lg bg-green-50 border border-green-100 px-4 py-2 text-sm text-green-800 font-medium">
                            ✓ Your itinerary is ready — confirm to release payment to your local
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Past trips */}
          {past.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold text-stone-900">Past trips</h2>
              <ul className="mt-4 space-y-4">
                {past.map((b) => {
                  const meta = STATUS[b.status] || STATUS.completed;
                  return (
                    <li key={b.id}>
                      <Link
                        to={`/bookings/${b.id}`}
                        className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-400 transition-colors opacity-80"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-heading text-lg font-semibold text-stone-900">{b.guide_name}</div>
                              <Badge variant="outline" className={meta.className}>{meta.text}</Badge>
                            </div>
                            <div className="text-sm text-stone-700 mt-1">{b.service_title}</div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {b.guide_city}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3.5 w-3.5" /> {b.booking_date}
                              </span>
                              <span>{b.duration_hours}h in person</span>
                            </div>
                          </div>
                          <div className="font-heading text-xl font-bold text-stone-900">{inr(b.amount)}</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
