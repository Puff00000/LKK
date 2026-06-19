import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function GuideProfileEdit() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    city: "",
    bio: "",
    languages: "",
    specialities: "",
    price: 899,
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/profile/guide/me").then(({ data }) => {
      if (data.guide) {
        setForm({
          city: data.guide.city || "",
          bio: data.guide.bio || "",
          languages: (data.guide.languages || []).join(", "),
          specialities: (data.guide.specialities || []).join(", "),
          price: data.guide.price || 899,
          avatar_url: data.guide.avatar_url || "",
        });
      }
      setLoading(false);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/profile/guide", {
        city: form.city.trim(),
        bio: form.bio.trim(),
        languages: form.languages.split(",").map((x) => x.trim()).filter(Boolean),
        specialities: form.specialities.split(",").map((x) => x.trim()).filter(Boolean),
        price: Number(form.price),
        avatar_url: form.avatar_url.trim() || null,
      });
      toast.success("Profile saved. You're now visible to travellers.");
      navigate("/local");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10" data-testid="guide-profile-edit">
      <div className="text-xs uppercase tracking-[0.2em] text-green-800">My profile</div>
      <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
        Your guide profile
      </h1>
      <p className="mt-2 text-stone-600">Travellers will see this. Be specific — what makes your city yours?</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
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
          <Label htmlFor="specialities">Specialities <span className="text-stone-400 font-normal">(comma separated)</span></Label>
          <Input id="specialities" data-testid="profile-specialities" value={form.specialities} onChange={(e) => setForm({ ...form, specialities: e.target.value })} placeholder="Street food, heritage walks, photography" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="avatar">Avatar URL <span className="text-stone-400 font-normal">(optional)</span></Label>
          <Input id="avatar" data-testid="profile-avatar" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" className="mt-1.5" />
        </div>
        <div>
          <Label>Package price · <span className="text-green-800 font-semibold">₹{form.price}</span></Label>
          <div className="mt-3 px-1">
            <Slider
              data-testid="profile-price"
              min={199}
              max={1999}
              step={50}
              value={[form.price]}
              onValueChange={([v]) => setForm({ ...form, price: v })}
            />
            <div className="mt-1.5 flex justify-between text-xs text-stone-500">
              <span>₹199 · chat-only</span><span>₹499+/day · in-person</span>
            </div>
          </div>
        </div>

        <Button type="submit" data-testid="profile-save" disabled={saving} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
