import { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mic, Square, Sparkles, Languages } from "lucide-react";

// Keep in sync with SUPPORTED_LANGUAGES in backend/voice_onboarding.py —
// the codes are what the browser's own speech recognizer understands.
const LANGUAGES = [
  { code: "hi-IN", label: "Hindi" },
  { code: "or-IN", label: "Odia" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "mr-IN", label: "Marathi" },
  { code: "bn-IN", label: "Bengali" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "en-IN", label: "English" },
];

/**
 * Voice onboarding widget: record speech in the guide's own language,
 * review/edit the transcript, then let an AI sort it into form fields.
 *
 * Never writes anything by itself — it only calls onExtracted(fields, warnings)
 * so the parent form can merge the result in and the guide can still edit
 * and hit their own Save/Confirm button.
 *
 * Props:
 *   target: "profile" | "service" — which extraction prompt the backend uses
 *   onExtracted: (fields: object, warnings: string[]) => void
 */
export default function VoiceOnboardWidget({ target, onExtracted }) {
  const [supported, setSupported] = useState(true);
  const [languageCode, setLanguageCode] = useState("hi-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [extracting, setExtracting] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = languageCode;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += chunk;
        else interimChunk += chunk;
      }
      if (finalChunk) setTranscript((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk));
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access was blocked — allow it in your browser settings and try again.");
      } else if (event.error === "no-speech") {
        toast.error("Didn't hear anything — try again a bit closer to the mic.");
      } else {
        toast.error("Recording error — please try again.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
  };

  const useTranscript = async () => {
    if (!transcript.trim()) {
      toast.error("Record something first, or type it in below.");
      return;
    }
    setExtracting(true);
    try {
      const { data } = await api.post("/agent/voice-extract", {
        transcript: transcript.trim(),
        target,
        language_code: languageCode,
      });
      onExtracted(data.extracted, data.warnings || []);
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(`Filled in what we understood — please check: ${data.warnings.join(" ")}`);
      } else {
        toast.success("Form filled in — review it below before saving.");
      }
      setTranscript("");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setExtracting(false);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
        Voice fill-in needs Chrome or Edge on this device — you can still fill the form below by typing.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-3" data-testid={`voice-onboard-${target}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-green-900">
        <Sparkles className="h-4 w-4" /> Fill this in by speaking
      </div>

      <div className="flex items-center gap-2">
        <Languages className="h-4 w-4 text-stone-500 shrink-0" />
        <select
          value={languageCode}
          onChange={(e) => setLanguageCode(e.target.value)}
          disabled={isRecording}
          data-testid="voice-language-select"
          className="text-sm rounded-md border border-stone-300 bg-white px-2 py-1.5"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        {!isRecording ? (
          <Button type="button" size="sm" variant="outline" onClick={startRecording} data-testid="voice-record-start" className="border-stone-300">
            <Mic className="mr-2 h-4 w-4" /> Record
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={stopRecording} data-testid="voice-record-stop" className="bg-red-600 text-white hover:bg-red-700">
            <Square className="mr-2 h-4 w-4" /> Stop
          </Button>
        )}
      </div>

      {(transcript || interim || isRecording) && (
        <div>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="What you say will appear here — you can edit it before continuing"
            rows={3}
            data-testid="voice-transcript"
            className="text-sm bg-white"
          />
          {interim && <p className="mt-1 text-xs text-stone-400 italic">{interim}</p>}
        </div>
      )}

      {transcript && !isRecording && (
        <Button
          type="button"
          size="sm"
          onClick={useTranscript}
          disabled={extracting}
          data-testid="voice-use-transcript"
          className="bg-green-800 text-white hover:bg-green-900"
        >
          {extracting ? "Filling in the form…" : "Use this to fill the form"}
        </Button>
      )}
    </div>
  );
}
