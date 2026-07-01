import { useEffect, useState } from "react";
import { api, inr } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldAlert, Search, RefreshCw } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acting, setActing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, b, u, d] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/bookings"),
        api.get("/admin/users"),
        api.get("/admin/disputes"),
      ]);
      setStats(s.data);
      setBookings(b.data);
      setUsers(u.data);
      setDisputes(d.data);
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
                    <div className="text-sm text-stone-500 mt-1">{b.trip_start} · {inr(b.amount)} · {b.package_type}</div>
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
                  {["Booking", "Traveller", "Local", "Mode", "Start", "Amount", "Fee", "Status"].map((h) => (
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
                      {b.package_type === "chat" ? "Chat" : `${b.days}d in-person`}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{b.trip_start}</td>
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
                  {["Name", "Phone", "Email", "Role", "Joined"].map((h) => (
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
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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
