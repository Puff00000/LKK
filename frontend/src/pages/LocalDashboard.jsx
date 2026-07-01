import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, Mail, Phone, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS = {
  pending_payment: { text: "Awaiting payment", className: "bg-amber-50 text-amber-800 border-amber-200" },
  paid:            { text: "Awaiting acceptance", className: "bg-amber-50 text-amber-900 border-amber-300" },
  accepted:        { text: "Accepted", className: "bg-green-50 text-green-800 border-green-200" },
  itinerary_delivered: { text: "Itinerary delivered", className: "bg-blue-50 text-blue-800 border-blue-200" },
  completed:       { text: "Completed", className: "bg-stone-100 text-stone-700 border-stone-200" },
  cancelled:       { text: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  disputed:        { text: "In dispute", className: "bg-red-50 text-red-800 border-red-200" },
};

export default function LocalDashboard() {
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/bookings/mine"), api.get("/profile/guide/me")]).then(([b, p]) => {
      setBookings(b.data);
      setProfile(p.data.guide);
      setLoading(false);
    });
  }, []);

  const completed = bookings.filter((b) => b.status === "completed");
  const totalEarnings = completed.reduce((sum, b) => sum + (b.local_payout || 0), 0);
  const thisMonthEarnings = completed
    .filter((b) => new Date(b.created_at).getMonth() === new Date().getMonth())
    .reduce((sum, b) => sum + (b.local_payout || 0), 0);
  const newRequests = bookings.filter((b) => b.status === "paid").length;
  const accepted = bookings.filter((b) => b.status === "accepted").length;

  const handleAccept = async (bookingId) => {
    setActing(bookingId + "_accept");
    try {
      await api.post(`/bookings/${bookingId}/accept`);
      toast.success("Booking accepted! Send your itinerary now.");
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "accepted" } : b));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Something went wrong");
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (bookingId) => {
    setActing(bookingId + "_decline");
    try {
      await api.post(`/bookings/${bookingId}/decline`);
      toast.success("Booking declined.");
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "cancelled" } : b));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Something went wrong");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10" data-testid="local-dashboard">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Local Dashboard</div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Your guide hub
          </h1>
          <p className="mt-1 text-stone-500 text-sm">Review new requests, accept the ones you want, and mark trips complete to earn.</p>
        </div>
        <Link to="/local/profile">
          <Button variant="outline" className="border-stone-300 h-11">
            ✏️ Edit my profile
          </Button>
        </Link>
      </div>

      {/* Profile warnings */}
      {!profile && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          You haven't created a guide profile yet.{" "}
          <Link to="/local/profile" className="font-medium underline">Create your profile</Link> to start receiving bookings.
        </div>
      )}
      {profile && !profile.is_complete && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Your profile is incomplete.{" "}
          <Link to="/local/profile" className="font-medium underline">Complete it now</Link> to appear in search.
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Earned this month", value: inr(thisMonthEarnings), sub: "90% payout of completed trips", dot: "bg-amber-400" },
          { label: "Earned all time", value: inr(totalEarnings), sub: `${completed.length} completed trip${completed.length !== 1 ? "s" : ""}`, dot: "bg-stone-400" },
          { label: "New requests", value: newRequests, sub: "Awaiting your acceptance", dot: "bg-amber-500" },
          { label: "Accepted", value: accepted, sub: "Trips in progress", dot: "bg-green-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.15em] text-stone-500">{s.label}</div>
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            </div>
            <div className="mt-3 font-heading text-3xl font-bold text-stone-900">{s.value}</div>
            <div className="mt-1 text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Verified badge */}
      {profile?.verified && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
              <CheckCircle2 className="h-5 w-5" /> You are a Verified Local
            </div>
            <div className="text-xs text-stone-500">{completed.length} of 3 trips</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-green-600 transition-all"
              style={{ width: `${Math.min(100, (completed.length / 3) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-stone-500">You've unlocked the Verified badge — keep delivering 5-star trips!</div>
        </div>
      )}

      {/* Booking inbox */}
      <div className="mt-10">
        <h2 className="font-heading text-xl font-bold text-stone-900">Booking inbox</h2>
        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
            No bookings yet. Once travellers book your package, they'll show up here.
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {bookings.map((b) => {
              const meta = STATUS[b.status] || STATUS.pending_payment;
              const isPaid = b.status === "paid";
              const isAccepted = b.status === "accepted";
              return (
                <li key={b.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-heading text-lg font-semibold text-stone-900">{b.traveller_name}</div>
                        <Badge variant="outline" className={meta.className}>{meta.text}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {b.trip_start} → {b.trip_end}
                        </span>
                        <span>{b.package_type === "chat" ? "Chat-only" : `${b.days}d in-person`}</span>
                        <span className="text-green-700 font-medium">{inr(b.local_payout)} payout</span>
                        <span className="text-xs text-stone-400 uppercase tracking-wide">Mock payment</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-stone-400">
                        {b.traveller_phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.traveller_phone}</span>
                        )}
                      </div>
                      {b.notes && (
                        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-stone-700">
                          <span className="font-medium">Note:</span> {b.notes}
                        </div>
                      )}
                      {isPaid && (
                        <div className="mt-2 text-xs text-amber-700">
                          ⏰ Accept before deadline — expires in 23h · auto-cancels otherwise.
                        </div>
                      )}
                    </div>

                    {/* Accept/Decline buttons */}
                    {(isPaid || isAccepted) && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {isPaid && (
                          <Button
                            onClick={() => handleAccept(b.id)}
                            disabled={acting === b.id + "_accept"}
                            className="bg-green-800 text-white hover:bg-green-900 h-10 px-5"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {acting === b.id + "_accept" ? "Accepting…" : "Accept"}
                          </Button>
                        )}
                        {(isPaid || isAccepted) && (
                          <Button
                            onClick={() => handleDecline(b.id)}
                            disabled={acting === b.id + "_decline"}
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 h-10 px-5"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            {acting === b.id + "_decline" ? "Declining…" : "Decline"}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Link for other statuses */}
                    {!isPaid && !isAccepted && (
                      <Link
                        to={`/bookings/${b.id}`}
                        className="text-sm text-green-800 hover:underline shrink-0"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
