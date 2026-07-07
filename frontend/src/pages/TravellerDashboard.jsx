import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, Plus } from "lucide-react";
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

function TripCard({ trip }) {
  const total = trip.bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const dayCount = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5" data-testid={`trip-card-${trip.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-heading text-lg font-semibold text-stone-900">
            {trip.trip_name || `Trip to ${trip.city}`}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-stone-500">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {trip.city}</span>
            <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> {trip.start_date} → {trip.end_date} ({dayCount}d)</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-xl font-bold text-stone-900">{inr(total)}</div>
          <div className="text-xs text-stone-400 mt-0.5">{trip.bookings.length} experience{trip.bookings.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
        {trip.bookings.map((b) => {
          const meta = STATUS[b.status] || STATUS.pending_payment;
          return (
            <li key={b.id}>
              <Link to={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-green-800">
                <div>
                  <span className="text-sm text-stone-700">{b.service_title}</span>
                  <span className="ml-2 text-xs text-stone-400">{b.booking_date} · {b.booking_time}</span>
                </div>
                <Badge variant="outline" className={meta.className}>{meta.text}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function TravellerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/bookings/mine"), api.get("/trips/mine")]).then(([b, t]) => {
      setBookings(b.data);
      setTrips(t.data);
      setLoading(false);
    });
  }, []);

  // Bookings not linked to any trip (e.g. booked directly via Browse, skipping the Create-a-trip flow)
  const linkedBookingIds = new Set(
    [...trips.upcoming, ...trips.past].flatMap((t) => t.bookings.map((b) => b.id))
  );
  const unlinkedBookings = bookings.filter((b) => !linkedBookingIds.has(b.id));
  const upcoming = unlinkedBookings.filter((b) => !["completed", "cancelled"].includes(b.status));
  const past = unlinkedBookings.filter((b) => ["completed", "cancelled"].includes(b.status));

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
        <Link to="/create-trip">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white h-11 px-5">
            <Plus className="mr-2 h-4 w-4" /> Plan a new trip
          </Button>
        </Link>
      </div>

      {/* Trips */}
      {!loading && (trips.upcoming.length > 0 || trips.past.length > 0) && (
        <>
          {trips.upcoming.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold text-stone-900">Upcoming trips</h2>
              <div className="mt-4 space-y-4">
                {trips.upcoming.map((t) => <TripCard key={t.id} trip={t} />)}
              </div>
            </div>
          )}
          {trips.past.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold text-stone-900">Past trips</h2>
              <div className="mt-4 space-y-4 opacity-80">
                {trips.past.map((t) => <TripCard key={t.id} trip={t} />)}
              </div>
            </div>
          )}
        </>
      )}

      {loading ? (
        <div className="mt-10 text-stone-500">Loading…</div>
      ) : bookings.length === 0 && trips.upcoming.length === 0 && trips.past.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-16 text-center">
          <div className="font-heading text-xl text-stone-900">No trips yet</div>
          <p className="mt-2 text-stone-500">Tell us where you're headed and we'll line up locals there.</p>
          <Link to="/create-trip" className="mt-4 inline-block text-green-800 font-medium hover:underline">
            Create a trip →
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming (not linked to a trip) */}
          {upcoming.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold text-stone-900">Other upcoming bookings</h2>
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

          {/* Past (not linked to a trip) */}
          {past.length > 0 && (
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold text-stone-900">Other past bookings</h2>
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
