import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import VoiceOnboardWidget, { LANGUAGES } from "@/components/VoiceOnboardWidget";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import CameraRecordModal from "@/components/CameraRecordModal";
import { Camera, Video, Check, Languages as LanguagesIcon } from "lucide-react";

// Same lists your manual service form uses — kept in sync on purpose so a
// voice-filled category/duration always lands on a value this page can show.
// Category values (not labels) — the backend's Literal enum, unaffected by language.
const CATEGORY_VALUES = ["food", "shopping", "culture", "photography", "experience", "nature"];
const DURATIONS = [2, 3, 4, 5, 6, 7, 8];

const STEPS = ["welcome", "profile", "photo", "video", "service", "review"];

// Only Hindi and Odia are translated here — those are the two languages we
// can actually verify are correct. Every other language in the picker still
// works (guide can speak in it, and the AI extraction understands it) but
// falls back to English on-screen text below, since guessing at translations
// nobody here can check for accuracy risks putting something wrong in front
// of a real guide.
const STRINGS = {
  "en-IN": {
    welcomeTitle: "Let's set up your profile",
    welcomeSubtitle: "Answer a few questions by speaking in your own language — we'll fill in the form for you. You can always type or edit anything along the way.",
    getStarted: "Get started",
    profileHeading: "Tell me about yourself",
    profileSubtext: "Where you're based, and what kind of trips you create.",
    labelCity: "City", placeholderCity: "e.g. Jaipur",
    labelBio: "Bio",
    labelLanguages: "Languages you speak", placeholderLanguages: "Hindi, English",
    labelSpecialities: "What you're known for", placeholderSpecialities: "Street food, heritage walks",
    back: "Back", next: "Next",
    photoHeading: "Add a photo",
    photoSubtext: "Live camera only — a real photo of you helps travellers trust your profile.",
    takePhoto: "Take photo", retakePhoto: "Retake photo", uploadingPhoto: "Uploading…",
    videoHeading: "Record a short intro video",
    videoSubtext: "Up to 60 seconds, live camera only. This gets reviewed before your listing goes public.",
    recordVideo: "Record video", rerecordVideo: "Re-record video",
    serviceHeading: "Now, tell me about your experience",
    serviceSubtext: "What you'll show travellers, and how long it takes.",
    labelTitle: "Title", labelDescription: "Description", labelCategory: "Category", chooseOne: "Choose one",
    labelDuration: "Duration (hours)", hoursSuffix: "hours",
    labelCostNote: "Extra cost note (optional)", placeholderCostNote: "e.g. Entry tickets not included",
    reviewHeading: "Review before you go live",
    speaksLabel: "Speaks:", knownForLabel: "Known for:",
    reviewNote: "Go back to any step to make changes — nothing is saved until you confirm below.",
    confirmButton: "Confirm & create profile", creating: "Creating…",
    categories: { food: "🍜 Food & Drink", shopping: "🛍️ Shopping", culture: "🏛️ Culture & Heritage", photography: "📸 Photography", experience: "🎨 Experience", nature: "🌿 Nature" },
  },
  "hi-IN": {
    welcomeTitle: "चलिए आपकी प्रोफ़ाइल बनाते हैं",
    welcomeSubtitle: "अपनी भाषा में बोलकर कुछ सवालों के जवाब दें — हम फॉर्म खुद भर देंगे। आप कभी भी टाइप करके या बदलकर ठीक कर सकते हैं।",
    getStarted: "शुरू करें",
    profileHeading: "अपने बारे में बताएं",
    profileSubtext: "आप कहाँ से हैं, और आप किस तरह की यात्राएं कराते हैं।",
    labelCity: "शहर", placeholderCity: "जैसे जयपुर",
    labelBio: "आपके बारे में",
    labelLanguages: "आप कौन सी भाषाएं बोलते हैं", placeholderLanguages: "हिंदी, अंग्रेज़ी",
    labelSpecialities: "आप किस चीज़ के लिए जाने जाते हैं", placeholderSpecialities: "स्ट्रीट फूड, हेरिटेज वॉक",
    back: "पीछे", next: "आगे",
    photoHeading: "एक फोटो जोड़ें",
    photoSubtext: "सिर्फ लाइव कैमरा — आपकी असली फोटो यात्रियों को भरोसा दिलाती है।",
    takePhoto: "फोटो लें", retakePhoto: "फिर से फोटो लें", uploadingPhoto: "अपलोड हो रहा है…",
    videoHeading: "एक छोटा परिचय वीडियो रिकॉर्ड करें",
    videoSubtext: "अधिकतम 60 सेकंड, सिर्फ लाइव कैमरा। यह पब्लिक होने से पहले जांचा जाएगा।",
    recordVideo: "वीडियो रिकॉर्ड करें", rerecordVideo: "फिर से रिकॉर्ड करें",
    serviceHeading: "अब अपने अनुभव के बारे में बताएं",
    serviceSubtext: "आप यात्रियों को क्या दिखाएंगे, और इसमें कितना समय लगता है।",
    labelTitle: "शीर्षक", labelDescription: "विवरण", labelCategory: "श्रेणी", chooseOne: "एक चुनें",
    labelDuration: "अवधि (घंटे)", hoursSuffix: "घंटे",
    labelCostNote: "अतिरिक्त खर्च (वैकल्पिक)", placeholderCostNote: "जैसे प्रवेश टिकट शामिल नहीं",
    reviewHeading: "लाइव होने से पहले जांच लें",
    speaksLabel: "भाषाएं:", knownForLabel: "जाना जाता है:",
    reviewNote: "बदलाव करने के लिए किसी भी चरण पर वापस जाएं — नीचे कन्फर्म करने तक कुछ भी सेव नहीं होगा।",
    confirmButton: "पुष्टि करें और प्रोफ़ाइल बनाएं", creating: "बनाया जा रहा है…",
    categories: { food: "🍜 खाना-पीना", shopping: "🛍️ शॉपिंग", culture: "🏛️ संस्कृति और विरासत", photography: "📸 फोटोग्राफी", experience: "🎨 अनुभव", nature: "🌿 प्रकृति" },
  },
  "or-IN": {
    welcomeTitle: "ଆସନ୍ତୁ ଆପଣଙ୍କର ପ୍ରୋଫାଇଲ୍ ତିଆରି କରିବା",
    welcomeSubtitle: "ନିଜ ଭାଷାରେ କହି କିଛି ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ — ଆମେ ଫର୍ମ ନିଜେ ପୂରଣ କରିଦେବୁ। ଆପଣ ଯେକୌଣସି ସମୟରେ ଟାଇପ୍ କରି କିମ୍ବା ବଦଳାଇ ଠିକ୍ କରିପାରିବେ।",
    getStarted: "ଆରମ୍ଭ କରନ୍ତୁ",
    profileHeading: "ନିଜ ବିଷୟରେ କୁହନ୍ତୁ",
    profileSubtext: "ଆପଣ କେଉଁଠାରୁ, ଏବଂ କେଉଁ ପ୍ରକାର ଭ୍ରମଣ ଆପଣ କରାନ୍ତି।",
    labelCity: "ସହର", placeholderCity: "ଯେମିତି ଜୟପୁର",
    labelBio: "ଆପଣଙ୍କ ବିଷୟରେ",
    labelLanguages: "ଆପଣ କେଉଁ ଭାଷା କହନ୍ତି", placeholderLanguages: "ହିନ୍ଦୀ, ଇଂରାଜୀ",
    labelSpecialities: "ଆପଣ କେଉଁଥିପାଇଁ ଜଣାଶୁଣା", placeholderSpecialities: "ଷ୍ଟ୍ରିଟ୍ ଫୁଡ୍, ହେରିଟେଜ୍ ୱାକ୍",
    back: "ପଛକୁ", next: "ପରବର୍ତ୍ତୀ",
    photoHeading: "ଏକ ଫଟୋ ଯୋଡ଼ନ୍ତୁ",
    photoSubtext: "କେବଳ ଲାଇଭ୍ କ୍ୟାମେରା — ଆପଣଙ୍କର ପ୍ରକୃତ ଫଟୋ ଯାତ୍ରୀଙ୍କୁ ଭରସା ଦିଏ।",
    takePhoto: "ଫଟୋ ନିଅନ୍ତୁ", retakePhoto: "ପୁଣି ଫଟୋ ନିଅନ୍ତୁ", uploadingPhoto: "ଅପଲୋଡ୍ ହେଉଛି…",
    videoHeading: "ଏକ ଛୋଟ ପରିଚୟ ଭିଡିଓ ରେକର୍ଡ କରନ୍ତୁ",
    videoSubtext: "ସର୍ବାଧିକ 60 ସେକେଣ୍ଡ, କେବଳ ଲାଇଭ୍ କ୍ୟାମେରା। ଏହା ପବ୍ଲିକ୍ ହେବା ପୂର୍ବରୁ ଯାଞ୍ଚ ହେବ।",
    recordVideo: "ଭିଡିଓ ରେକର୍ଡ କରନ୍ତୁ", rerecordVideo: "ପୁଣି ରେକର୍ଡ କରନ୍ତୁ",
    serviceHeading: "ବର୍ତ୍ତମାନ ଆପଣଙ୍କ ଅନୁଭୂତି ବିଷୟରେ କୁହନ୍ତୁ",
    serviceSubtext: "ଆପଣ ଯାତ୍ରୀଙ୍କୁ କଣ ଦେଖାଇବେ, ଏବଂ ଏଥିରେ କେତେ ସମୟ ଲାଗେ।",
    labelTitle: "ଶୀର୍ଷକ", labelDescription: "ବର୍ଣ୍ଣନା", labelCategory: "ଶ୍ରେଣୀ", chooseOne: "ଗୋଟିଏ ବାଛନ୍ତୁ",
    labelDuration: "ଅବଧି (ଘଣ୍ଟା)", hoursSuffix: "ଘଣ୍ଟା",
    labelCostNote: "ଅତିରିକ୍ତ ଖର୍ଚ୍ଚ (ଇଚ୍ଛାଧୀନ)", placeholderCostNote: "ଯେମିତି ପ୍ରବେଶ ଟିକେଟ୍ ଅନ୍ତର୍ଭୁକ୍ତ ନୁହେଁ",
    reviewHeading: "ଲାଇଭ୍ ହେବା ପୂର୍ବରୁ ଯାଞ୍ଚ କରନ୍ତୁ",
    speaksLabel: "ଭାଷା:", knownForLabel: "ଏଥିପାଇଁ ଜଣାଶୁଣା:",
    reviewNote: "ପରିବର୍ତ୍ତନ କରିବାକୁ ଯେକୌଣସି ଷ୍ଟେପ୍‌କୁ ଫେରନ୍ତୁ — ତଳେ ନିଶ୍ଚିତ ନକରିବା ପର୍ଯ୍ୟନ୍ତ କିଛି ସେଭ୍ ହେବ ନାହିଁ।",
    confirmButton: "ନିଶ୍ଚିତ କରନ୍ତୁ ଏବଂ ପ୍ରୋଫାଇଲ୍ ତିଆରି କରନ୍ତୁ", creating: "ତିଆରି ହେଉଛି…",
    categories: { food: "🍜 ଖାଦ୍ୟ ଓ ପାନୀୟ", shopping: "🛍️ ସପିଂ", culture: "🏛️ ସଂସ୍କୃତି ଓ ଐତିହ୍ୟ", photography: "📸 ଫଟୋଗ୍ରାଫି", experience: "🎨 ଅନୁଭୂତି", nature: "🌿 ପ୍ରକୃତି" },
  },
};

function useT(languageCode) {
  const dict = STRINGS[languageCode] || STRINGS["en-IN"];
  return (key) => dict[key] ?? STRINGS["en-IN"][key] ?? key;
}

function categoryLabel(languageCode, value) {
  const dict = STRINGS[languageCode] || STRINGS["en-IN"];
  return dict.categories?.[value] ?? STRINGS["en-IN"].categories[value] ?? value;
}

export default function GuideOnboardWizard() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const [languageCode, setLanguageCode] = useState("hi-IN");
  const t = useT(languageCode);

  const [profile, setProfile] = useState({ city: "", bio: "", languages: "", specialities: "" });
  const [service, setService] = useState({ title: "", description: "", category: "", duration_hours: "", cost_note: "" });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadPct, setVideoUploadPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const onProfileExtracted = (extracted) => {
    setProfile((f) => ({
      ...f,
      ...(extracted.city !== undefined ? { city: extracted.city } : {}),
      ...(extracted.bio !== undefined ? { bio: extracted.bio } : {}),
      ...(extracted.languages !== undefined ? { languages: extracted.languages.join(", ") } : {}),
      ...(extracted.specialities !== undefined ? { specialities: extracted.specialities.join(", ") } : {}),
    }));
  };

  const onServiceExtracted = (extracted) => {
    setService((f) => ({
      ...f,
      ...(extracted.title !== undefined ? { title: extracted.title } : {}),
      ...(extracted.description !== undefined ? { description: extracted.description } : {}),
      ...(extracted.category !== undefined ? { category: extracted.category } : {}),
      ...(extracted.duration_hours !== undefined ? { duration_hours: String(extracted.duration_hours) } : {}),
      ...(extracted.cost_note !== undefined ? { cost_note: extracted.cost_note } : {}),
    }));
  };

  const onPhotoCaptured = async (blob) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      setAvatarUrl(data.url);
      toast.success("Photo captured");
    } catch (e) {
      toast.error(e.code === "ECONNABORTED" ? "Upload timed out — check your connection and try again." : formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setUploading(false);
    }
  };

  const onVideoCaptured = async (blob) => {
    if (blob.size > 50 * 1024 * 1024) {
      toast.error("Recording is too large (max 50MB) — try a shorter take.");
      return;
    }
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    setVideoUploading(true);
    setVideoUploadPct(0);
    try {
      const fd = new FormData();
      fd.append("file", blob, `video.${ext}`);
      const { data } = await api.post("/upload/video", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
        onUploadProgress: (evt) => { if (evt.total) setVideoUploadPct(Math.round((evt.loaded / evt.total) * 100)); },
      });
      setVideoUrl(data.url);
      toast.success("Video recorded");
    } catch (e) {
      toast.error(e.code === "ECONNABORTED" ? "Video upload timed out — try again." : formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setVideoUploading(false);
    }
  };

  const confirmAndCreate = async () => {
    setSubmitting(true);
    try {
      await api.post("/profile/guide", {
        city: profile.city.trim(),
        bio: profile.bio.trim(),
        languages: profile.languages.split(",").map((s) => s.trim()).filter(Boolean),
        specialities: profile.specialities.split(",").map((s) => s.trim()).filter(Boolean),
        avatar_url: avatarUrl,
        video_url: videoUrl,
      });

      try {
        await api.post("/services", {
          title: service.title.trim(),
          description: service.description.trim(),
          category: service.category,
          duration_hours: Number(service.duration_hours),
          cost_note: service.cost_note?.trim() || undefined,
        });
        toast.success("Profile and listing created — welcome to LKK!");
      } catch (svcErr) {
        // Expected, not a bug: a brand-new video always needs admin approval
        // before a listing can go live. Profile creation above still
        // succeeded, so tell the guide plainly rather than showing an error.
        toast.warning(
          "Profile created! Your listing will go live once your intro video is approved by an admin — usually quick. Add it again from your dashboard after that."
        );
      }
      navigate("/local");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const profileReady = profile.city.trim() && profile.bio.trim();
  const serviceReady = service.title.trim() && service.description.trim() && service.category && service.duration_hours;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-green-700" : "bg-stone-200"}`} />
        ))}
      </div>

      {step === "welcome" && (
        <div className="space-y-6 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">{t("welcomeTitle")}</h1>
          <p className="text-stone-500">{t("welcomeSubtitle")}</p>
          <div className="flex items-center justify-center gap-2">
            <LanguagesIcon className="h-4 w-4 text-stone-500" />
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              data-testid="wizard-language-select"
              className="text-sm rounded-md border border-stone-300 bg-white px-3 py-2"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={goNext} className="bg-green-800 text-white hover:bg-green-900">{t("getStarted")}</Button>
        </div>
      )}

      {step === "profile" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-stone-900">{t("profileHeading")}</h2>
          <p className="text-sm text-stone-500">{t("profileSubtext")}</p>
          <VoiceOnboardWidget target="profile" languageCode={languageCode} onLanguageChange={setLanguageCode} hideLanguagePicker onExtracted={onProfileExtracted} />
          <div>
            <Label htmlFor="w-city">{t("labelCity")}</Label>
            <Input id="w-city" value={profile.city} onChange={(e) => setProfile((f) => ({ ...f, city: e.target.value }))} placeholder={t("placeholderCity")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="w-bio">{t("labelBio")}</Label>
            <Textarea id="w-bio" value={profile.bio} onChange={(e) => setProfile((f) => ({ ...f, bio: e.target.value }))} rows={4} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="w-languages">{t("labelLanguages")}</Label>
            <Input id="w-languages" value={profile.languages} onChange={(e) => setProfile((f) => ({ ...f, languages: e.target.value }))} placeholder={t("placeholderLanguages")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="w-specialities">{t("labelSpecialities")}</Label>
            <Input id="w-specialities" value={profile.specialities} onChange={(e) => setProfile((f) => ({ ...f, specialities: e.target.value }))} placeholder={t("placeholderSpecialities")} className="mt-1.5" />
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={goBack}>{t("back")}</Button>
            <Button onClick={goNext} disabled={!profileReady} className="bg-green-800 text-white hover:bg-green-900">{t("next")}</Button>
          </div>
        </div>
      )}

      {step === "photo" && (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-stone-900">{t("photoHeading")}</h2>
          <p className="text-sm text-stone-500">{t("photoSubtext")}</p>
          {avatarUrl ? (
            <img src={avatarUrl} alt="You" className="mx-auto h-40 w-40 rounded-full object-cover" />
          ) : (
            <div className="mx-auto h-40 w-40 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
              <Camera className="h-10 w-10" />
            </div>
          )}
          <Button variant="outline" onClick={() => setCameraOpen(true)} disabled={uploading} className="border-stone-300">
            <Camera className="mr-2 h-4 w-4" /> {uploading ? t("uploadingPhoto") : avatarUrl ? t("retakePhoto") : t("takePhoto")}
          </Button>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={goBack}>{t("back")}</Button>
            <Button onClick={goNext} disabled={!avatarUrl} className="bg-green-800 text-white hover:bg-green-900">{t("next")}</Button>
          </div>
          <CameraCaptureModal open={cameraOpen} onOpenChange={setCameraOpen} onCapture={onPhotoCaptured} />
        </div>
      )}

      {step === "video" && (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-stone-900">{t("videoHeading")}</h2>
          <p className="text-sm text-stone-500">{t("videoSubtext")}</p>
          {videoUrl ? (
            <video src={videoUrl} className="mx-auto h-40 w-64 rounded-lg object-cover" muted controls />
          ) : (
            <div className="mx-auto h-40 w-64 rounded-lg bg-stone-100 flex items-center justify-center text-stone-300">
              <Video className="h-10 w-10" />
            </div>
          )}
          <Button variant="outline" onClick={() => setVideoRecorderOpen(true)} disabled={videoUploading} className="border-stone-300">
            <Video className="mr-2 h-4 w-4" /> {videoUploading ? `${t("uploadingPhoto")} ${videoUploadPct}%` : videoUrl ? t("rerecordVideo") : t("recordVideo")}
          </Button>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={goBack}>{t("back")}</Button>
            <Button onClick={goNext} disabled={!videoUrl} className="bg-green-800 text-white hover:bg-green-900">{t("next")}</Button>
          </div>
          <CameraRecordModal open={videoRecorderOpen} onOpenChange={setVideoRecorderOpen} onCapture={onVideoCaptured} />
        </div>
      )}

      {step === "service" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-stone-900">{t("serviceHeading")}</h2>
          <p className="text-sm text-stone-500">{t("serviceSubtext")}</p>
          <VoiceOnboardWidget target="service" languageCode={languageCode} onLanguageChange={setLanguageCode} hideLanguagePicker onExtracted={onServiceExtracted} />
          <div>
            <Label htmlFor="w-title">{t("labelTitle")}</Label>
            <Input id="w-title" value={service.title} onChange={(e) => setService((f) => ({ ...f, title: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="w-desc">{t("labelDescription")}</Label>
            <Textarea id="w-desc" value={service.description} onChange={(e) => setService((f) => ({ ...f, description: e.target.value }))} rows={4} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="w-category">{t("labelCategory")}</Label>
            <select id="w-category" value={service.category} onChange={(e) => setService((f) => ({ ...f, category: e.target.value }))} className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">
              <option value="">{t("chooseOne")}</option>
              {CATEGORY_VALUES.map((v) => <option key={v} value={v}>{categoryLabel(languageCode, v)}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="w-duration">{t("labelDuration")}</Label>
            <select id="w-duration" value={service.duration_hours} onChange={(e) => setService((f) => ({ ...f, duration_hours: e.target.value }))} className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">
              <option value="">{t("chooseOne")}</option>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} {t("hoursSuffix")}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="w-cost">{t("labelCostNote")}</Label>
            <Input id="w-cost" value={service.cost_note} onChange={(e) => setService((f) => ({ ...f, cost_note: e.target.value }))} placeholder={t("placeholderCostNote")} className="mt-1.5" />
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={goBack}>{t("back")}</Button>
            <Button onClick={goNext} disabled={!serviceReady} className="bg-green-800 text-white hover:bg-green-900">{t("next")}</Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-stone-900">{t("reviewHeading")}</h2>
          <div className="rounded-xl border border-stone-200 p-4 space-y-1 text-sm">
            <p className="font-medium text-stone-900">{profile.city}</p>
            <p className="text-stone-600">{profile.bio}</p>
            {profile.languages && <p className="text-stone-500">{t("speaksLabel")} {profile.languages}</p>}
            {profile.specialities && <p className="text-stone-500">{t("knownForLabel")} {profile.specialities}</p>}
          </div>
          <div className="rounded-xl border border-stone-200 p-4 space-y-1 text-sm">
            <p className="font-medium text-stone-900">{service.title}</p>
            <p className="text-stone-600">{service.description}</p>
            <p className="text-stone-500">{service.duration_hours} {t("hoursSuffix")} · {categoryLabel(languageCode, service.category)}</p>
          </div>
          <p className="text-xs text-stone-400">{t("reviewNote")}</p>
          <Button onClick={confirmAndCreate} disabled={submitting} className="w-full bg-green-800 text-white hover:bg-green-900">
            <Check className="mr-2 h-4 w-4" /> {submitting ? t("creating") : t("confirmButton")}
          </Button>
          <Button variant="outline" onClick={goBack} className="w-full">{t("back")}</Button>
        </div>
      )}
    </div>
  );
}
