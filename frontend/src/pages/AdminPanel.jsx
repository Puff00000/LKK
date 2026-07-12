import { useEffect, useState } from "react";
import { api, inr } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldAlert, Search, RefreshCw, CheckCircle2, XCircle, Clock, Ban, ShieldOff, Landmark, Undo2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  pending_payment: "bg-amber-50 text-amber-800 border-amber-200",
  paid:            "bg-blue-50 text-blue-800 border-blue-200",
  accepted:        "bg-green-50 text-green-800 border-green-200",
  itinerary_delivered: "bg-blue-50 text-blue-900 border-blue-300",
  completed:       "bg-stone-100 text-stone-700 border-stone-200",
  cancelled:       "bg-red-50 text-red-700 border-red-200",
  disputed:        "bg-red-50 text-red-800 border-red-200",
};

const ROLE_COLORS = {
  traveller: "bg-amber-50 text-amber-800 border-amber-200",
  local:     "bg-green-50 text-green-800 border-green-200",
  admin:     "bg-stone-100 text-stone-700 border-stone-200",
};

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoFilter, setVideoFilter] = useState("pending");
  const [payouts, setPayouts] = useState([]);
  const [payoutFilter, setPayoutFilter] = useState("pending");
  const [payoutNotes, setPayoutNotes] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [banReasons, setBanReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acting, setActing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, b, u, d, v, p] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/bookings"),
        api.get("/admin/users"),
        api.get("/admin/disputes"),
        api.get("/admin/videos"),
        api.get("/admin/payouts"),
      ]);
      setStats(s.data);
      setBookings(b.data);
      setUsers(u.data);
      setDisputes(d.data);
      setVideos(v.data);
      setPayouts(p.data);
    } catch (e) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (guideId, verified) => {
    setActing(guideId);
    try {
      await api.post(`/admin/guides/${guideId}/verify`, null, { params: { verified } });
      toast.success(verified ? "Guide verified!" : "Guide unverified");
      load();
    } catch (e) {
      toast.error("Failed to update guide");
    } finally {
      setActing(null);
    }
  };

  const handleResolve = async (bookingId, refund) => {
    setActing(bookingId);
    try {
      await api.post(`/admin/disputes/${bookingId}/resolve`, null, { params: { refund_to_traveller: refund } });
      toast.success(refund ? "Refund issued to traveller" : "Payment released to local");
      load();
    } catch (e) {
      toast.error("Failed to resolve dispute");
    } finally {
      setActing(null);
    }
  };

  const handleVideoReview = async (guideId, approved) => {
    const reason = rejectReasons[guideId]?.trim();
    if (!approved && !reason) {
      toast.error("Add a reason before rejecting");
      return;
    }
    setActing(guideId);
    try {
      await api.post(`/admin/guides/${guideId}/video/review`, { approved, reason: approved ? null : reason });
      toast.success(approved ? "Video approved — now live" : "Video rejected");
      setRejectReasons((r) => ({ ...r, [guideId]: "" }));
      load();
    } catch (e) {
      toast.error("Failed to review video");
    } finally {
      setActing(null);
    }
  };

  const handleBan = async (userId, key, explicitReason) => {
    const reason = (explicitReason ?? banReasons[key])?.trim();
    if (!reason) {
      toast.error("Add a reason before banning");
      return;
    }
    setActing(key);
    try {
      await api.post(`/admin/users/${userId}/ban`, { reason });
      toast.success("User banned — their profile is now hidden and they can't log in");
      setBanReasons((r) => ({ ...r, [key]: "" }));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to ban user");
    } finally {
      setActing(null);
    }
  };

  const handleUnban = async (userId, key) => {
    setActing(key);
    try {
      await api.post(`/admin/users/${userId}/unban`);
      toast.success("User unbanned");
      load();
    } catch (e) {
      toast.error("Failed to unban user");
    } finally {
      setActing(null);
    }
  };

  const handleMarkPaid = async (bookingId) => {
    setActing(`payout-${bookingId}`);
    try {
      await api.post(`/admin/bookings/${bookingId}/payout`, { note: payoutNotes[bookingId] || null });
      toast.success("Marked as paid out");
      setPayoutNotes((n) => ({ ...n, [bookingId]: "" }));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to mark payout");
    } finally {
      setActing(null);
    }
  };

  const handleUndoPayout = async (bookingId) => {
    setActing(`undo-payout-${bookingId}`);
    try {
      await api.post(`/admin/bookings/${bookingId}/payout/undo`);
      toast.success("Reverted to pending payout");
      load();
    } catch (e) {
      toast.error("Failed to undo payout");
    } finally {
      setActing(null);
    }
  };

  const filteredPayouts = payouts.filter((p) =>
    payoutFilter === "all" ? true : payoutFilter === "pending" ? !p.payout_paid_out : p.payout_paid_out
  );

  const filteredVideos = videos.filter((g) => videoFilter === "all" || g.video_status === videoFilter);

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  const filteredUsers = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" data-testid="admin-panel">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Admin Dashboard</div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Operations
          </h1>
          <p className="mt-1 text-stone-500 text-sm">Platform overview — bookings, users, earnings, refund queue.</p>
        </div>
        <Button variant="outline" onClick={load} className="border-stone-300 h-11">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Users", value: stats.total_users, sub: `${stats.total_locals} locals`, dot: "bg-stone-400" },
            { label: "Platform fees (all time)", value: inr(stats.platform_revenue), sub: `GMV ${inr(stats.gmv)}`, dot: "bg-amber-400" },
            { label: "Completed bookings", value: stats.completed_bookings, sub: `of ${stats.total_bookings} total`, dot: "bg-green-500" },
            { label: "Disputed", value: stats.disputed_bookings, sub: "Needs resolution", dot: "bg-red-500" },
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
      )}

      {/* Booking status summary */}
      {stats && (
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-5">
          {[
            { label: "Paid", value: bookings.filter(b => b.status === "paid").length },
            { label: "Accepted", value: bookings.filter(b => b.status === "accepted").length },
            { label: "Completed", value: stats.completed_bookings },
            { label: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length },
            { label: "Disputed", value: stats.disputed_bookings },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-4 text-center">
              <div className="text-xs uppercase tracking-[0.15em] text-stone-500">{s.label}</div>
              <div className="mt-2 font-heading text-2xl font-bold text-stone-900">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Disputes */}
      {disputes.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-xl font-bold text-red-800">⚠️ Open Disputes ({disputes.length})</h2>
          <ul className="mt-4 space-y-3">
            {disputes.map((b) => (
              <li key={b.id} className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-stone-900">{b.traveller_name} → {b.guide_name}</div>
                    <div className="text-sm text-stone-500 mt-1">{b.service_title} · {b.booking_date} · {inr(b.amount)}</div>
                    {b.dispute_reason && (
                      <div className="mt-2 text-sm text-red-800 bg-white rounded-lg px-3 py-2 border border-red-100">
                        "{b.dispute_reason}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResolve(b.id, false)}
                      disabled={acting === b.id}
                      className="bg-green-800 text-white hover:bg-green-900 h-9 text-xs"
                    >
                      Release to local
                    </Button>
                    <Button
                      onClick={() => handleResolve(b.id, true)}
                      disabled={acting === b.id}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 h-9 text-xs"
                    >
                      Refund traveller
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Video moderation */}
      <div className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-heading text-xl font-bold text-stone-900">
            Intro videos ({filteredVideos.length})
          </h2>
          <select
            value={videoFilter}
            onChange={(e) => setVideoFilter(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
            data-testid="video-filter-select"
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : filteredVideos.length === 0 ? (
          <div className="mt-4 text-stone-500">No videos in this filter.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredVideos.map((g) => (
              <div key={g.id} className="rounded-2xl border border-stone-200 bg-white p-5" data-testid={`video-row-${g.id}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="h-24 w-40 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200 shrink-0">
                    <video src={g.video_url} className="h-full w-full object-cover" muted controls />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-stone-900">{g.name}</div>
                      <span className="text-xs text-stone-400">{g.city}</span>
                      {g.user_is_banned && (
                        <Badge className="bg-stone-900 text-white hover:bg-stone-900 gap-1">
                          <Ban className="h-3.5 w-3.5" /> Banned
                        </Badge>
                      )}
                      {g.video_status === "approved" && (
                        <Badge className="bg-green-800 text-white hover:bg-green-800 gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                        </Badge>
                      )}
                      {g.video_status === "pending" && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </Badge>
                      )}
                      {g.video_status === "rejected" && (
                        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800 gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Rejected
                        </Badge>
                      )}
                    </div>
                    {g.video_status === "rejected" && g.video_rejection_reason && (
                      <div className="mt-2 text-xs text-red-700">Reason: {g.video_rejection_reason}</div>
                    )}
                    {g.video_status !== "approved" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          onClick={() => handleVideoReview(g.id, true)}
                          disabled={acting === g.id}
                          className="bg-green-800 text-white hover:bg-green-900 h-9 text-xs"
                          data-testid={`approve-video-${g.id}`}
                        >
                          Approve
                        </Button>
                        <Input
                          value={rejectReasons[g.id] || ""}
                          onChange={(e) => setRejectReasons((r) => ({ ...r, [g.id]: e.target.value }))}
                          placeholder="Reason for rejection"
                          className="h-9 text-xs w-56"
                          data-testid={`reject-reason-${g.id}`}
                        />
                        <Button
                          onClick={() => handleVideoReview(g.id, false)}
                          disabled={acting === g.id}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50 h-9 text-xs"
                          data-testid={`reject-video-${g.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {g.video_status === "approved" && (
                      <div className="mt-3">
                        <Button
                          onClick={() => handleVideoReview(g.id, false)}
                          disabled={acting === g.id}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50 h-9 text-xs"
                        >
                          Revoke (needs a reason above)
                        </Button>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                      {g.user_is_banned ? (
                        <Button
                          onClick={() => handleUnban(g.user_id, `unban-${g.id}`)}
                          disabled={acting === `unban-${g.id}`}
                          variant="outline"
                          className="border-stone-300 h-9 text-xs"
                          data-testid={`unban-user-${g.id}`}
                        >
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Unban this user
                        </Button>
                      ) : (
                        <>
                          <Input
                            value={banReasons[`ban-${g.id}`] || ""}
                            onChange={(e) => setBanReasons((r) => ({ ...r, [`ban-${g.id}`]: e.target.value }))}
                            placeholder="Reason (e.g. obscene/random content)"
                            className="h-9 text-xs w-64"
                            data-testid={`ban-reason-${g.id}`}
                          />
                          <Button
                            onClick={() => handleBan(g.user_id, `ban-${g.id}`)}
                            disabled={acting === `ban-${g.id}`}
                            variant="outline"
                            className="border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white h-9 text-xs"
                            data-testid={`ban-user-${g.id}`}
                          >
                            <Ban className="mr-1.5 h-3.5 w-3.5" /> Ban user
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payouts queue */}
      <div className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-heading text-xl font-bold text-stone-900">
            Payouts ({filteredPayouts.length})
          </h2>
          <select
            value={payoutFilter}
            onChange={(e) => setPayoutFilter(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
            data-testid="payout-filter-select"
          >
            <option value="pending">Awaiting payout</option>
            <option value="paid">Paid out</option>
            <option value="all">All</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          These trips are confirmed complete. Money is sitting in your Razorpay account — transfer each local's share
          manually, then mark it here. Always check the bank status below before sending.
        </p>

        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : filteredPayouts.length === 0 ? (
          <div className="mt-4 text-stone-500">Nothing in this filter.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredPayouts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-stone-200 bg-white p-5" data-testid={`payout-row-${p.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-stone-900">{p.guide_name}</div>
                      {p.bank_verification_status === "verified" && (
                        <Badge className="bg-green-800 text-white hover:bg-green-800 gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Bank verified
                        </Badge>
                      )}
                      {p.bank_verification_status === "pending" && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1">
                          <Clock className="h-3.5 w-3.5" /> Verifying…
                        </Badge>
                      )}
                      {(p.bank_verification_status === "failed" || p.bank_verification_status === "none" || !p.bank_verification_status) && (
                        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800 gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Not verified — don't send yet
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-stone-400">{p.service_title} · {p.booking_date}</div>
                  </div>

                  <div className="min-w-[200px] rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-sm">
                    {p.upi_vpa ? (
                      <div>
                        <div className="text-xs text-stone-400">UPI</div>
                        <div className="font-mono text-stone-800">{p.upi_vpa}</div>
                      </div>
                    ) : p.bank_account_number_masked ? (
                      <div>
                        <div className="text-xs text-stone-400">{p.bank_account_name} · {p.bank_ifsc}</div>
                        <div className="font-mono text-stone-800">{p.bank_account_number_masked}</div>
                      </div>
                    ) : (
                      <span className="text-stone-400">No payout details on file</span>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-heading text-xl font-bold text-stone-900">{inr(p.local_payout)}</div>
                    <div className="text-xs text-stone-400">their 90% share</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                  {p.payout_paid_out ? (
                    <>
                      <span className="text-xs text-stone-500">
                        Paid out {p.payout_paid_out_at ? new Date(p.payout_paid_out_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        {p.payout_note ? ` — ${p.payout_note}` : ""}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUndoPayout(p.id)}
                        disabled={acting === `undo-payout-${p.id}`}
                        className="border-stone-300 h-8 text-xs"
                        data-testid={`undo-payout-${p.id}`}
                      >
                        <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={payoutNotes[p.id] || ""}
                        onChange={(e) => setPayoutNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                        placeholder="Note (e.g. UPI ref number)"
                        className="h-9 text-xs w-64"
                        data-testid={`payout-note-${p.id}`}
                      />
                      <Button
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={acting === `payout-${p.id}`}
                        className="bg-green-800 text-white hover:bg-green-900 h-9 text-xs"
                        data-testid={`mark-paid-${p.id}`}
                      >
                        <Landmark className="mr-1.5 h-3.5 w-3.5" /> Mark as paid out
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All bookings */}
      <div className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-heading text-xl font-bold text-stone-900">
            All bookings ({filteredBookings.length})
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <option value="all">All statuses</option>
            <option value="pending_payment">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="accepted">Accepted</option>
            <option value="itinerary_delivered">Itinerary delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : filteredBookings.length === 0 ? (
          <div className="mt-4 text-stone-500">No bookings found.</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {["Booking", "Traveller", "Local", "Service", "Meetup", "Amount", "Fee", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-[0.15em] text-stone-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-stone-400">{String(b.id).slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{b.traveller_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{b.guide_name}</div>
                      <div className="text-xs text-stone-400">{b.guide_city}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <div>{b.service_title}</div>
                      <div className="text-xs text-stone-400">{b.duration_hours}h</div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{b.booking_date} {b.booking_time}</td>
                    <td className="px-4 py-3 font-medium text-stone-900">{inr(b.amount)}</td>
                    <td className="px-4 py-3 text-green-700">{inr(b.platform_fee)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_COLORS[b.status] || ""}>
                        {b.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Users */}
      <div className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-heading text-xl font-bold text-stone-900">
            Users ({filteredUsers.length})
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone"
              className="pl-9 w-72"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {["Name", "Phone", "Email", "Role", "Status", "Joined", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-[0.15em] text-stone-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-900">{u.name}</td>
                    <td className="px-4 py-3 text-stone-600">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={ROLE_COLORS[u.role] || ""}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_banned ? (
                        <Badge className="bg-stone-900 text-white hover:bg-stone-900 gap-1">
                          <Ban className="h-3.5 w-3.5" /> Banned
                        </Badge>
                      ) : (
                        <span className="text-xs text-stone-400">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== "admin" && (
                        u.is_banned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnban(u.id, `unban-user-${u.id}`)}
                            disabled={acting === `unban-user-${u.id}`}
                            className="border-stone-300 h-8 text-xs"
                            data-testid={`unban-${u.id}`}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = window.prompt("Reason for banning this user?");
                              if (reason && reason.trim()) {
                                handleBan(u.id, `user-${u.id}`, reason.trim());
                              }
                            }}
                            disabled={acting === `user-${u.id}`}
                            className="border-red-200 text-red-700 hover:bg-red-50 h-8 text-xs"
                            data-testid={`ban-${u.id}`}
                          >
                            Ban
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
