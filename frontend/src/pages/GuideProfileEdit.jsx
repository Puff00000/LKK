import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, ShieldAlert, Upload, Video, Trash2, Clock, XCircle } from "lucide-react";

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
    avatar_url: "",
  });
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const fileRef = useRef(null);
  const videoFileRef = useRef(null);

  useEffect(() => {
    api.get("/profile/guide/me").then(({ data }) => {
      if (data.guide) {
        setGuide(data.guide);
        setForm({
          city: data.guide.city || "",
          bio: data.guide.bio || "",
          languages: (data.guide.languages || []).join(", "),
          specialities: (data.guide.specialities || []).join(", "),
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
      const { data } = await api.post("/profile/guide", {
        city: form.city.trim(),
        bio: form.bio.trim(),
        languages: form.languages.split(",").map((x) => x.trim()).filter(Boolean),
        specialities: form.specialities.split(",").map((x) => x.trim()).filter(Boolean),
        avatar_url: form.avatar_url.trim() || null,
      });
      setGuide(data.guide);
      toast.success(guide ? "Profile updated." : "Profile saved — now add at least one service on your dashboard to go live.");
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

  const onVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "mov", "webm"].includes(ext)) {
      toast.error("Only MP4, MOV, or WEBM videos are allowed");
      if (videoFileRef.current) videoFileRef.current.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video is too large (max 50MB)");
      if (videoFileRef.current) videoFileRef.current.value = "";
      return;
    }
    setVideoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/profile/guide/video", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGuide(data.guide);
      toast.success("Video uploaded — it'll show on your profile once approved.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setVideoUploading(false);
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  };

  const removeVideo = async () => {
    setVideoUploading(true);
    try {
      await api.delete("/profile/guide/video");
      setGuide((g) => (g ? { ...g, video_url: null, video_approved: false, video_rejected: false, video_rejection_reason: null, video_status: "none" } : g));
      toast.success("Video removed");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setVideoUploading(false);
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
            <div>Add your bio, photo, and expertise here, then list your bite-sized experiences on your dashboard. You'll go live as <span className="font-semibold">Unverified</span> until you complete 3 trips (or an admin verifies you).</div>
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

        {/* INTRO VIDEO */}
        <div>
          <Label>Intro video <span className="text-stone-400 font-normal">(optional)</span></Label>
          <p className="mt-1 text-xs text-stone-500">
            A short video of yourself builds trust with travellers. Every upload is reviewed by our team before it goes live.
          </p>

          {guide?.video_url && (
            <div className="mt-3 flex items-center gap-2">
              {guide.video_status === "approved" && (
                <Badge data-testid="video-status-approved" className="bg-green-800 text-white hover:bg-green-800 gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved — live on your profile
                </Badge>
              )}
              {guide.video_status === "pending" && (
                <Badge data-testid="video-status-pending" variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1">
                  <Clock className="h-3.5 w-3.5" /> Pending review
                </Badge>
              )}
              {guide.video_status === "rejected" && (
                <Badge data-testid="video-status-rejected" variant="outline" className="border-red-300 bg-red-50 text-red-800 gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Rejected
                </Badge>
              )}
            </div>
          )}

          {guide?.video_status === "rejected" && guide?.video_rejection_reason && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="video-rejection-reason">
              {guide.video_rejection_reason}
            </div>
          )}

          <div className="mt-3 flex items-start gap-4">
            <div className="h-24 w-40 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200 grid place-items-center">
              {guide?.video_url ? (
                <video src={guide.video_url} className="h-full w-full object-cover" muted controls data-testid="video-preview" />
              ) : (
                <Video className="h-8 w-8 text-stone-300" />
              )}
            </div>
            <div>
              <input
                ref={videoFileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={onVideoFile}
                className="hidden"
                data-testid="video-file-input"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => guide ? videoFileRef.current?.click() : toast.error("Save your profile first, then add a video")}
                  disabled={videoUploading}
                  data-testid="video-upload-btn"
                  className="border-stone-300"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {videoUploading ? "Uploading…" : guide?.video_url ? "Replace video" : "Upload video"}
                </Button>
                {guide?.video_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removeVideo}
                    disabled={videoUploading}
                    data-testid="video-remove-btn"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-stone-500">MP4 / MOV / WEBM up to 50MB.</p>
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

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
          Pricing and services are managed separately.{" "}
          <button type="button" onClick={() => navigate("/local")} className="font-medium text-green-800 underline">
            Add or edit your bite-sized experiences on your dashboard
          </button>{" "}
          — each is 2–8 hours, priced from ₹499.
        </div>

        <Button type="submit" data-testid="profile-save" disabled={saving} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
