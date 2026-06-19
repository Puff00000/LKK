import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  pending_payment: { text: "Awaiting payment", className: "bg-amber-50 text-amber-800 border-amber-200" },
  paid: { text: "Waiting for itinerary", className: "bg-blue-50 text-blue-800 border-blue-200" },
  itinerary_delivered: { text: "Itinerary received", className: "bg-green-50 text-green-800 border-green-200" },
  completed: { text: "Completed", className: "bg-stone-100 text-stone-700 border-stone-200" },
  cancelled: { text: "Cancelled", className: "bg-stone-100 text-stone-500 border-stone-200" },
  disputed: { text: "In dispute", className: "bg-red-50 text-red-800 border-red-200" },
};

export default function TravellerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bookings/mine").then(({ data }) => {
      setBookings(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10" data-testid="traveller-dashboard">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Your trips</div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">Dashboard</h1>
        </div>
        <Link to="/browse" data-testid="dash-new-trip" className="text-sm font-medium text-green-800 hover:underline">
          Browse locals →
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="text-stone-500">Loading…</div>
        ) : bookings.length === 0 ? (
          <div data-testid="dash-empty" className="rounded-2xl border border-dashed border-stone-300 p-12 text-center">
            <div className="font-heading text-xl text-stone-900">No trips yet</div>
            <p className="mt-2 text-stone-500">Pick a local from any city and start your first journey.</p>
            <Link to="/browse" className="mt-4 inline-block text-green-800 font-medium hover:underline">
              Browse locals →
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4">
            {bookings.map((b) => {
              const meta = STATUS_LABEL[b.status] || STATUS_LABEL.pending_payment;
              return (
                <li key={b.id}>
                  <Link
                    to={`/bookings/${b.id}`}
                    data-testid={`booking-row-${b.id}`}
                    className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-green-800 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-heading text-lg font-semibold text-stone-900">{b.guide_name} · {b.guide_city}</div>
                        <div className="text-sm text-stone-500 mt-1">
                          {b.trip_start} → {b.trip_end}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={meta.className}>{meta.text}</Badge>
                        <div className="font-heading text-lg font-bold text-stone-900">{inr(b.amount)}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
