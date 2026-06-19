import { useEffect, useState } from "react";
import { api, inr, formatApiError } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [disputes, setDisputes] = useState([]);

  const loadAll = async () => {
    const [s, u, b, d] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/bookings"),
      api.get("/admin/disputes"),
    ]);
    setStats(s.data);
    setUsers(u.data);
    setBookings(b.data);
    setDisputes(d.data);
  };

  useEffect(() => { loadAll(); }, []);

  const resolve = async (id, refund) => {
    try {
      await api.post(`/admin/disputes/${id}/resolve`, null, { params: { refund_to_traveller: refund } });
      toast.success("Dispute resolved.");
      loadAll();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" data-testid="admin-panel">
      <div className="text-xs uppercase tracking-[0.2em] text-green-800">Admin</div>
      <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">Operations</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats && [
          { k: "Total users", v: stats.total_users, t: "admin-stat-users" },
          { k: "GMV", v: inr(stats.gmv), t: "admin-stat-gmv" },
          { k: "Platform revenue", v: inr(stats.platform_revenue), t: "admin-stat-revenue" },
          { k: "Disputed bookings", v: stats.disputed_bookings, t: "admin-stat-disputes" },
        ].map((s) => (
          <Card key={s.k} data-testid={s.t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-[0.2em] text-stone-500 font-medium">{s.k}</CardTitle>
            </CardHeader>
            <CardContent className="font-heading text-3xl font-bold text-stone-900">{s.v}</CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bookings" className="mt-10">
        <TabsList data-testid="admin-tabs">
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="disputes" data-testid="tab-disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {bookings.map((b) => (
              <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3" data-testid={`admin-booking-${b.id}`}>
                <div>
                  <div className="font-heading text-base font-semibold text-stone-900">{b.traveller_name} → {b.guide_name}</div>
                  <div className="text-xs text-stone-500">{b.guide_city} · {b.trip_start} → {b.trip_end}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{b.status}</Badge>
                  <div className="text-sm font-medium text-stone-900">{inr(b.amount)}</div>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <div className="p-8 text-center text-stone-500">No bookings yet.</div>}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex flex-wrap items-center justify-between gap-3" data-testid={`admin-user-${u.id}`}>
                <div>
                  <div className="font-heading text-base font-semibold text-stone-900">{u.name}</div>
                  <div className="text-xs text-stone-500">{u.email}</div>
                </div>
                <Badge variant="outline" className="capitalize">{u.role}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {disputes.length === 0 ? (
              <div className="p-8 text-center text-stone-500" data-testid="no-disputes">No active disputes.</div>
            ) : disputes.map((b) => (
              <div key={b.id} className="p-5 flex flex-wrap items-start justify-between gap-3" data-testid={`admin-dispute-${b.id}`}>
                <div className="flex-1">
                  <div className="font-heading text-base font-semibold text-stone-900">{b.traveller_name} ↔ {b.guide_name}</div>
                  <div className="text-xs text-stone-500 mt-1">{b.guide_city} · {b.trip_start} → {b.trip_end}</div>
                  <p className="mt-2 text-sm text-stone-700">{b.dispute_reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" data-testid={`resolve-refund-${b.id}`} onClick={() => resolve(b.id, true)} variant="outline" className="border-stone-300">
                    Refund traveller
                  </Button>
                  <Button size="sm" data-testid={`resolve-release-${b.id}`} onClick={() => resolve(b.id, false)} className="bg-green-800 text-white hover:bg-green-900 hover:text-white">
                    Release to local
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
