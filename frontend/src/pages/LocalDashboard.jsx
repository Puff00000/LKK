import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  CalendarIcon, Clock, Phone, CheckCircle2, XCircle,
  Plus, Pencil, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import BankVerificationCard from "@/components/BankVerificationCard";

const STATUS = {
  pending_payment: { text: "Awaiting payment", className: "bg-amber-50 text-amber-800 border-amber-200" },
  paid:            { text: "Awaiting acceptance", className: "bg-amber-50 text-amber-900 border-amber-300" },
  accepted:        { text: "Accepted", className: "bg-green-50 text-green-800 border-green-200" },
  itinerary_delivered: { text: "Itinerary delivered", className: "bg-blue-50 text-blue-800 border-blue-200" },
  completed:       { text: "Completed", className: "bg-stone-100 text-stone-700 border-stone-200" },
  cancelled:       { text: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  disputed:        { text: "In dispute", className: "bg-red-50 text-red-800 border-red-200" },
};

const CATEGORIES = [
  { value: "food", label: "🍜 Food & Drink" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "culture", label: "🏛️ Culture & Heritage" },
  { value: "photography", label: "📸 Photography" },
  { value: "experience", label: "🎨 Experience" },
  { value: "nature", label: "🌿 Nature" },
];

const DURATIONS = [2, 3, 4, 5, 6, 7, 8];

function computePrice(hours) {
  return 499 + (Number(hours) - 2) * 250;
}

const EMPTY_SERVICE = {
  title: "",
  description: "",
  category: "food",
  duration_hours: 2,
  extra_food_min: "", extra_food_max: "",
  extra_entry_min: "", extra_entry_max: "",
  extra_shopping_min: "", extra_shopping_max: "",
  extra_transport_min: "", extra_transport_max: "",
  cost_note: "",
  is_active: true,
};

function toNumOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function serviceToForm(s) {
  return {
    id: s.id,
    title: s.title || "",
    description: s.description || "",
    category: s.category || "food",
    duration_hours: s.duration_hours || 2,
    extra_food_min: s.extra_food_min ?? "", extra_food_max: s.extra_food_max ?? "",
    extra_entry_min: s.extra_entry_min ?? "", extra_entry_max: s.extra_entry_max ?? "",
    extra_shopping_min: s.extra_shopping_min ?? "", extra_shopping_max: s.extra_shopping_max ?? "",
    extra_transport_min: s.extra_transport_min ?? "", extra_transport_max: s.extra_transport_max ?? "",
    cost_note: s.cost_note || "",
    is_active: s.is_active !== false,
  };
}

function ServiceForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial.id);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Add a title and description");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        duration_hours: Number(form.duration_hours),
        extra_food_min: toNumOrNull(form.extra_food_min),
        extra_food_max: toNumOrNull(form.extra_food_max),
        extra_entry_min: toNumOrNull(form.extra_entry_min),
        extra_entry_max: toNumOrNull(form.extra_entry_max),
        extra_shopping_min: toNumOrNull(form.extra_shopping_min),
        extra_shopping_max: toNumOrNull(form.extra_shopping_max),
        extra_transport_min: toNumOrNull(form.extra_transport_min),
        extra_transport_max: toNumOrNull(form.extra_transport_max),
        cost_note: form.cost_note.trim(),
        is_active: form.is_active,
      };
      if (isEdit) {
        await api.put(`/services/${initial.id}`, payload);
        toast.success("Service updated");
      } else {
        await api.post("/services", payload);
        toast.success("Service added");
      }
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-green-700 bg-green-50/40 p-5 space-y-4" data-testid="service-form">
      <div className="flex items-center justify-between">
        <div className="font-heading text-base font-semibold text-stone-900">{isEdit ? "Edit service" : "New service"}</div>
        <button type="button" onClick={onCancel} className="text-stone-400 hover:text-stone-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <Label htmlFor="svc-title">Title</Label>
        <Input id="svc-title" data-testid="svc-title" value={form.title} onChange={set("title")} placeholder='e.g. "Bargain like a local at Johari Bazaar"' className="mt-1.5" required />
      </div>

      <div>
        <Label htmlFor="svc-desc">Description</Label>
        <Textarea id="svc-desc" data-testid="svc-description" value={form.description} onChange={set("description")} rows={3} placeholder="What exactly will you do together? Be specific." className="mt-1.5" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger data-testid="svc-category" className="mt-1.5 border-stone-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duration</Label>
          <Select value={String(form.duration_hours)} onValueChange={(v) => setForm((f) => ({ ...f, duration_hours: Number(v) }))}>
            <SelectTrigger data-testid="svc-duration" className="mt-1.5 border-stone-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((h) => <SelectItem key={h} value={String(h)}>{h} hours — {inr(computePrice(h))}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg bg-white border border-stone-200 px-4 py-3 text-sm flex items-center justify-between">
        <span className="text-stone-500">Traveller pays (your time only)</span>
        <span className="font-heading text-lg font-bold text-stone-900" data-testid="svc-computed-price">{inr(computePrice(form.duration_hours))}</span>
      </div>

      <div>
        <Label>Extra costs traveller may pay on the ground <span className="text-stone-400 font-normal">(optional — leave blank if none)</span></Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {[
            { key: "food", label: "Food & drinks" },
            { key: "entry", label: "Entry fees" },
            { key: "shopping", label: "Shopping" },
            { key: "transport", label: "Transport" },
          ].map((row) => (
            <div key={row.key} className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs font-medium text-stone-600">{row.label}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min ₹"
                  value={form[`extra_${row.key}_min`]}
                  onChange={set(`extra_${row.key}_min`)}
                  className="h-9 text-sm"
                  data-testid={`svc-${row.key}-min`}
                />
                <span className="text-stone-400 text-xs">–</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Max ₹"
                  value={form[`extra_${row.key}_max`]}
                  onChange={set(`extra_${row.key}_max`)}
                  className="h-9 text-sm"
                  data-testid={`svc-${row.key}-max`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="svc-note">Cost note for travellers <span className="text-stone-400 font-normal">(optional)</span></Label>
        <Textarea id="svc-note" data-testid="svc-cost-note" value={form.cost_note} onChange={set("cost_note")} rows={2} placeholder="e.g. Carry cash — most stalls don't accept cards." className="mt-1.5" />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-stone-900">Active</div>
          <div className="text-xs text-stone-500">Inactive services are hidden from Browse.</div>
        </div>
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} data-testid="svc-active-toggle" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} data-testid="svc-save-btn" className="bg-green-800 text-white hover:bg-green-900 hover:text-white">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add service"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="border-stone-300">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function LocalDashboard() {
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | "new" | serviceId being edited
  const [deletingId, setDeletingId] = useState(null);

  const loadAll = async () => {
    const [b, p] = await Promise.all([api.get("/bookings/mine"), api.get("/profile/guide/me")]);
    setBookings(b.data);
    setProfile(p.data.guide);
    if (p.data.guide) {
      const s = await api.get(`/guides/${p.data.guide.id}/services`);
      setServices(s.data);
    } else {
      setServices([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

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

  const handleDeleteService = async (serviceId) => {
    setDeletingId(serviceId);
    try {
      await api.delete(`/services/${serviceId}`);
      toast.success("Service deleted");
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const onServiceSaved = async () => {
    setFormMode(null);
    await loadAll();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10" data-testid="local-dashboard">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Local Dashboard</div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Your guide hub
          </h1>
          <p className="mt-1 text-stone-500 text-sm">Manage your services, review new requests, and mark trips complete to earn.</p>
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
          <Link to="/local/profile" className="font-medium underline">Create your profile</Link> to start listing services.
        </div>
      )}
      {profile && !profile.is_complete && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Your profile is incomplete — you need a city, bio, and at least one active service to appear in Browse.
        </div>
      )}

      {/* Payout details only become relevant once a traveller has actually booked
          and this local has accepted at least one trip — no point asking for
          bank details before there's any money to receive. Checks the full
          lifecycle (not just bookings currently sitting in "accepted"), since a
          trip that's since moved on to itinerary_delivered/completed/disputed
          necessarily passed through acceptance too — otherwise the card would
          wrongly disappear again once a trip completes. */}
      {profile && bookings.some((b) => ["accepted", "itinerary_delivered", "completed", "disputed"].includes(b.status)) && (
        <BankVerificationCard guide={profile} onUpdated={setProfile} />
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

      {/* Services */}
      {profile && (
        <div className="mt-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-heading text-xl font-bold text-stone-900">Your services ({services.length})</h2>
            {formMode !== "new" && (
              <Button
                onClick={() => setFormMode("new")}
                data-testid="add-service-btn"
                className="bg-green-800 text-white hover:bg-green-900 h-10"
              >
                <Plus className="mr-2 h-4 w-4" /> Add service
              </Button>
            )}
          </div>

          {formMode === "new" && (
            <div className="mt-4">
              <ServiceForm initial={EMPTY_SERVICE} onCancel={() => setFormMode(null)} onSaved={onServiceSaved} />
            </div>
          )}

          {services.length === 0 && formMode !== "new" ? (
            <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
              No services yet. Add at least one bite-sized experience (2–8 hours) to start receiving bookings.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((s) =>
                formMode === s.id ? (
                  <ServiceForm key={s.id} initial={serviceToForm(s)} onCancel={() => setFormMode(null)} onSaved={onServiceSaved} />
                ) : (
                  <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-5" data-testid={`service-row-${s.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-heading text-base font-semibold text-stone-900">{s.title}</div>
                          {!s.is_active && (
                            <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-500">Inactive</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-stone-500 line-clamp-2">{s.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.duration_hours}h</span>
                          <span className="font-medium text-stone-900">{inr(s.price)}</span>
                          <span className="capitalize">{s.category}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFormMode(s.id)}
                          data-testid={`edit-service-${s.id}`}
                          className="border-stone-300 h-9"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteService(s.id)}
                          disabled={deletingId === s.id}
                          data-testid={`delete-service-${s.id}`}
                          className="border-red-200 text-red-700 hover:bg-red-50 h-9"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking inbox */}
      <div className="mt-10">
        <h2 className="font-heading text-xl font-bold text-stone-900">Booking inbox</h2>
        {loading ? (
          <div className="mt-4 text-stone-500">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
            No bookings yet. Once travellers book one of your services, they'll show up here.
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
                      <div className="text-sm text-stone-700 mt-1">{b.service_title}</div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {b.booking_date} · {b.booking_time}
                        </span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {b.duration_hours}h</span>
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
