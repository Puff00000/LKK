import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL = {
  pending_payment: { text: "Awaiting payment", className: "bg-amber-50 text-amber-800 border-amber-200" },
  paid: { text: "Deliver itinerary", className: "bg-green-50 text-green-800 border-green-200" },
  itinerary_delivered: { text: "Awaiting confirmation", className: "bg-blue-50 text-blue-800 border-blue-200" },
  completed: { text: "Paid out", className: "bg-stone-100 text-stone-700 border-stone-200" },
  cancelled: { text: "Cancelled", className: "bg-stone-100 text-stone-500 border-stone-200" },
  disputed: { text: "In dispute", className: "bg-red-50 text-red-800 border-red-200" },
};

export default function LocalDashboard() {
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/bookings/mine"), api.get("/profile/guide/me")]).then(([b, p]) => {
      setBookings(b.data);
      setProfile(p.data.guide);
      setLoading(false);
    });
  }, []);

  const completed = bookings.filter((b) => b.status === "completed");
  const totalEarnings = completed.reduce((sum, b) => sum + (b.local_payout || 0), 0);
  const pendingCount = bookings.filter((b) => ["paid", "itinerary_delivered"].includes(b.status)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10" data-testid="local-dashboard">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-green-800">Local dashboard</div>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          Hello{profile ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
      </div>

      {profile && !profile.is_complete && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" data-testid="incomplete-profile-banner">
          Your profile is incomplete. <Link to="/local/profile" className="font-medium underline">Complete it now</Link> to appear in search.
        </div>
      )}
      {!profile && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" data-testid="no-profile-banner">
          You haven't created a guide profile yet. <Link to="/local/profile" className="font-medium underline">Create your profile</Link> to start receiving bookings.
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Card data-testid="stat-earnings">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.2em] text-stone-500 font-medium">Total earnings</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-3xl font-bold text-stone-900">{inr(totalEarnings)}</CardContent>
        </Card>
        <Card data-testid="stat-completed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.2em] text-stone-500 font-medium">Completed trips</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-3xl font-bold text-stone-900">{completed.length}</CardContent>
        </Card>
        <Card data-testid="stat-pending">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.2em] text-stone-500 font-medium">Active bookings</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-3xl font-bold text-stone-900">{pendingCount}</CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="font-heading text-2xl font-bold text-stone-900">Bookings</h2>
        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : bookings.length === 0 ? (
          <div data-testid="local-bookings-empty" className="mt-4 rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
            No bookings yet. Once travellers book your package, they'll show up here.
          </div>
        ) : (
          <ul className="mt-4 grid gap-4">
            {bookings.map((b) => {
              const meta = STATUS_LABEL[b.status] || STATUS_LABEL.pending_payment;
              return (
                <li key={b.id}>
                  <Link
                    to={`/bookings/${b.id}`}
                    data-testid={`local-booking-${b.id}`}
                    className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-green-800 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-heading text-lg font-semibold text-stone-900">{b.traveller_name}</div>
                        <div className="text-sm text-stone-500 mt-1">{b.trip_start} → {b.trip_end}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={meta.className}>{meta.text}</Badge>
                        <div className="text-right">
                          <div className="font-heading text-lg font-bold text-stone-900">{inr(b.local_payout)}</div>
                          <div className="text-xs text-stone-500">your share</div>
                        </div>
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
