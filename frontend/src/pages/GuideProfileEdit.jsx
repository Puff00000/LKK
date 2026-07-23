import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, ShieldAlert, Upload, Video, Clock, XCircle, AlertTriangle } from "lucide-react";

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
    video_url: "",
  });
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadPct, setVideoUploadPct] = useState(0);
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
          video_url: data.guide.video_url || "",
        });
      }
      setLoading(false);
    });
  }, []);

  const missingPhoto = !form.avatar_url;
  const missingVideo = !form.video_url;
  const canSave = !missingPhoto && !missingVideo;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) {
      toast.error("A profile photo and an intro video are both required before you can save.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/profile/guide", {
        city: form.city.trim(),
        bio: form.bio.trim(),
        languages: form.languages.split(",").map((x) => x.trim()).filter(Boolean),
        specialities: form.specialities.split(",").map((x) => x.trim()).filter(Boolean),
        avatar_url: form.avatar_url.trim(),
        video_url: form.video_url.trim(),
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
        timeout: 60000,
      });
      setForm((f) => ({ ...f, avatar_url: data.url }));
      toast.success("Photo uploaded");
    } catch (e) {
      if (e.code === "ECONNABORTED") {
        toast.error("Upload timed out. Check your connection and try again.");
      } else {
        toast.error(formatApiError(e.response?.data?.detail) || e.message);
      }
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
    setVideoUploadPct(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Plain storage upload — doesn't touch your saved profile yet. It only
      // becomes part of your public profile (and enters review) once you hit
      // "Save profile" below.
      const { data } = await api.post("/upload/video", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // videos are bigger; give this more room than the photo upload
        onUploadProgress: (evt) => {
          if (evt.total) setVideoUploadPct(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      setForm((f) => ({ ...f, video_url: data.url }));
      toast.success("Video uploaded — hit Save profile to submit it for review.");
    } catch (e) {
      if (e.code === "ECONNABORTED") {
        toast.error("Video upload timed out. Try a smaller file or check your connection.");
      } else {
        toast.error(formatApiError(e.response?.data?.detail) || e.message);
      }
    } finally {
      setVideoUploading(false);
      setVideoUploadPct(0);
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading…</div>;

  const verified = guide?.verified === true;
  const previewSrc = form.avatar_url ? absoluteUrl(form.avatar_url) : null;
  // The saved video's moderation status only applies while the staged video
  // matches what's actually saved — if they've picked a new file, the old
  // approved/rejected badge would be misleading.
  const videoUnchanged = guide?.video_url && guide.video_url === form.video_url;

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
            <div>Add your bio, photo, video, and expertise here, then list your bite-sized experiences on your dashboard. You'll go live as <span className="font-semibold">Unverified</span> until you complete 3 trips (or an admin verifies you).</div>
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
          <Label>Profile photo <span className="text-red-600 font-normal">*required</span></Label>
          <div className="mt-2 flex items-center gap-4">
            <div className={`h-20 w-20 overflow-hidden rounded-full bg-stone-100 ring-1 ${missingPhoto ? "ring-red-300" : "ring-stone-200"}`}>
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
              {missingPhoto && <p className="mt-1 text-xs text-red-600" data-testid="photo-missing-hint">A profile photo is required.</p>}
            </div>
          </div>
        </div>

        {/* INTRO VIDEO */}
        <div>
          <Label>Intro video <span className="text-red-600 font-normal">*required</span></Label>
          <p className="mt-1 text-xs text-stone-500">
            A short video of yourself builds trust with travellers. Every upload is reviewed by our team before it goes live.
          </p>

          <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed">
              Your video must show <span className="font-medium">you, speaking, introducing yourself and the experience(s) you offer</span> — not random footage, stock clips, or anything unrelated. Accounts found uploading random or obscene content will be <span className="font-medium">permanently blocked from LKK</span>.
            </p>
          </div>

          {videoUnchanged && (
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
          {!videoUnchanged && form.video_url && (
            <div className="mt-3">
              <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-900 gap-1" data-testid="video-status-unsaved">
                New video ready — hit Save profile to submit for review
              </Badge>
            </div>
          )}

          {videoUnchanged && guide?.video_status === "rejected" && guide?.video_rejection_reason && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="video-rejection-reason">
              {guide.video_rejection_reason}
            </div>
          )}

          <div className="mt-3 flex items-start gap-4">
            <div className={`h-24 w-40 overflow-hidden rounded-xl bg-stone-100 ring-1 ${missingVideo ? "ring-red-300" : "ring-stone-200"} grid place-items-center`}>
              {form.video_url ? (
                <video src={form.video_url} className="h-full w-full object-cover" muted controls data-testid="video-preview" />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => videoFileRef.current?.click()}
                disabled={videoUploading}
                data-testid="video-upload-btn"
                className="border-stone-300"
              >
                <Upload className="mr-2 h-4 w-4" />
                {videoUploading ? `Uploading… ${videoUploadPct}%` : form.video_url ? "Replace video" : "Upload video"}
              </Button>
              <p className="mt-1.5 text-xs text-stone-500">MP4 / MOV / WEBM up to 50MB.</p>
              {missingVideo && <p className="mt-1 text-xs text-red-600" data-testid="video-missing-hint">An intro video is required.</p>}
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

        {!canSave && (
          <p className="text-center text-sm text-red-600" data-testid="save-blocked-hint">
            Add a profile photo and an intro video to save your profile.
          </p>
        )}
        <Button type="submit" data-testid="profile-save" disabled={saving || !canSave} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white disabled:opacity-40">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
