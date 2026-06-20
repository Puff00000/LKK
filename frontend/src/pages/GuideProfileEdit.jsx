import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, ShieldAlert, Upload, MessageCircle, Sparkles } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function absoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

export default function GuideProfileEdit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const [form, setForm] = useState({
    city: "",
    bio: "",
    languages: "",
    specialities: "",
    offers_chat: true,
    offers_in_person: false,
    avatar_url: "",
  });
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get("/profile/guide/me").then(({ data }) => {
      if (data.guide) {
        setGuide(data.guide);
        setForm({
          city: data.guide.city || "",
          bio: data.guide.bio || "",
          languages: (data.guide.languages || []).join(", "),
          specialities: (data.guide.specialities || []).join(", "),
          price: data.guide.price || 499,
          avatar_url: data.guide.avatar_url || "",
        });
      }
      setLoading(false);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.offers_chat && !form.offers_in_person) {
      toast.error("Turn on at least one package tier");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/profile/guide", {
        city: form.city.trim(),
        bio: form.bio.trim(),
        languages: form.languages.split(",").map((x) => x.trim()).filter(Boolean),
        specialities: form.specialities.split(",").map((x) => x.trim()).filter(Boolean),
        offers_chat: form.offers_chat,
        offers_in_person: form.offers_in_person,
        avatar_url: form.avatar_url.trim() || null,
      });
      setGuide(data.guide);
      toast.success("Profile saved. You're now visible to travellers.");
      navigate("/local");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, avatar_url: data.url }));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading…</div>;

  const verified = guide?.verified === true;
  const previewSrc = form.avatar_url ? absoluteUrl(form.avatar_url) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10" data-testid="guide-profile-edit">
      <div className="text-xs uppercase tracking-[0.2em] text-green-800">My profile</div>
      <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
        Your guide profile
      </h1>

      {welcome && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3" data-testid="welcome-banner">
          <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-700" />
          <div className="text-sm text-green-900">
            <div className="font-medium">Almost done!</div>
            <div>Add your bio, photo, expertise and price. You'll go live as <span className="font-semibold">Unverified</span> until you complete 3 trips (or an admin verifies you).</div>
          </div>
        </div>
      )}

      {guide && (
        <div className="mt-4 flex items-center gap-2">
          {verified ? (
            <Badge data-testid="verified-badge" className="bg-green-800 text-white hover:bg-green-800 gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified
            </Badge>
          ) : (
            <Badge data-testid="unverified-badge" variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Unverified
            </Badge>
          )}
          <span className="text-xs text-stone-500">{verified ? "You appear as Verified to travellers." : "Get verified after 3 completed trips or admin approval."}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 space-y-5">
        {/* PHOTO UPLOAD */}
        <div>
          <Label>Profile photo</Label>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200">
              {previewSrc ? (
                <img src={previewSrc} alt="" className="h-full w-full object-cover" data-testid="avatar-preview" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-heading text-stone-400">?</div>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onFile}
                className="hidden"
                data-testid="avatar-file-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="avatar-upload-btn"
                className="border-stone-300"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : previewSrc ? "Replace photo" : "Upload photo"}
              </Button>
              <p className="mt-1.5 text-xs text-stone-500">JPG / PNG / WEBP up to 5MB.</p>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" data-testid="profile-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required placeholder="e.g. Jaipur" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" data-testid="profile-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required rows={5} placeholder="What's your story? What kind of trips do you create?" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="languages">Languages <span className="text-stone-400 font-normal">(comma separated)</span></Label>
          <Input id="languages" data-testid="profile-languages" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Hindi, English, Marathi" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="specialities">Expertise <span className="text-stone-400 font-normal">(comma separated)</span></Label>
          <Input id="specialities" data-testid="profile-specialities" value={form.specialities} onChange={(e) => setForm({ ...form, specialities: e.target.value })} placeholder="Street food, heritage walks, photography" className="mt-1.5" />
        </div>
        <div>
          <Label>Package tiers</Label>
          <p className="mt-1 text-xs text-stone-500">Turn on each tier you want to offer. At least one must be on.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {/* CHAT-ONLY ₹199 */}
            <div
              data-testid="tier-199-card"
              data-active={form.offers_chat}
              className={`relative rounded-2xl border-2 p-5 transition-colors ${
                form.offers_chat ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-700">
                  <MessageCircle className="h-4 w-4" /> Chat-only
                </div>
                <Switch
                  data-testid="tier-199-toggle"
                  checked={form.offers_chat}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, offers_chat: v }))}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
              <div className="mt-3 flex items-baseline gap-1 font-heading">
                <span className="text-3xl font-bold text-stone-900">₹199</span>
                <span className="text-xs text-stone-500">/ one-time</span>
              </div>
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                Send a custom written itinerary and answer questions on chat. No in-person meet-up.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-stone-600">
                <li>✓ Day-by-day itinerary in writing</li>
                <li>✓ In-app chat before & during trip</li>
                <li className="text-stone-400">✗ No in-person guidance</li>
              </ul>
            </div>

            {/* IN-PERSON ₹499/day */}
            <div
              data-testid="tier-499-card"
              data-active={form.offers_in_person}
              className={`relative rounded-2xl border-2 p-5 transition-colors ${
                form.offers_in_person ? "border-green-700 bg-green-50" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-800">
                  <Sparkles className="h-4 w-4" /> In-person
                </div>
                <Switch
                  data-testid="tier-499-toggle"
                  checked={form.offers_in_person}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, offers_in_person: v }))}
                  className="data-[state=checked]:bg-green-700"
                />
              </div>
              <div className="mt-3 flex items-baseline gap-1 font-heading">
                <span className="text-3xl font-bold text-stone-900">₹499</span>
                <span className="text-xs text-stone-500">/ per day</span>
              </div>
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                Everything in chat-only — plus you walk the city with them, booked per day when you both agree.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-stone-600">
                <li>✓ Day-by-day itinerary in writing</li>
                <li>✓ In-app chat throughout</li>
                <li>✓ Full in-person guidance during their trip</li>
              </ul>
            </div>
          </div>
          {!form.offers_chat && !form.offers_in_person && (
            <p className="mt-2 text-xs text-red-600" data-testid="tier-error">Turn on at least one tier to save your profile.</p>
          )}
        </div>

        <Button type="submit" data-testid="profile-save" disabled={saving} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
