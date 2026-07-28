import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Circle, Square, RotateCcw, Check, AlertTriangle } from "lucide-react";

const MAX_SECONDS = 60;

function pickMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

/**
 * Live camera + mic recording for the intro video — deliberately no file
 * upload option, so the video has to actually be recorded now (matches the
 * "you, speaking" requirement) rather than an old/stock clip being uploaded.
 * Calls onCapture(blob) once the person confirms the recording.
 */
export default function CameraRecordModal({ open, onOpenChange, onCapture }) {
  const liveVideoRef = useRef(null);
  const playbackVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");

  useEffect(() => {
    if (!open) {
      cleanup();
      return;
    }
    startStream();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cleanup = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
    setVideoBlob(null);
    setVideoPreviewUrl("");
    setError("");
  };

  const startStream = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
    } catch (e) {
      setError(
        e.name === "NotAllowedError"
          ? "Camera/mic access was denied. Allow camera and microphone permission for this site and try again."
          : e.name === "NotFoundError"
          ? "No camera or microphone was found on this device."
          : "Couldn't access the camera. Try again."
      );
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const mimeType = pickMimeType();
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      setVideoBlob(blob);
      setVideoPreviewUrl(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          stopRecording();
          return MAX_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const retake = () => {
    setVideoBlob(null);
    setVideoPreviewUrl("");
    setSeconds(0);
    startStream();
  };

  const confirm = () => {
    if (!videoBlob) return;
    onCapture(videoBlob);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="camera-record-modal">
        <DialogHeader>
          <DialogTitle>Record your intro video</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" data-testid="camera-record-error">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video grid place-items-center">
            {videoPreviewUrl ? (
              <video ref={playbackVideoRef} src={videoPreviewUrl} controls playsInline className="h-full w-full object-cover" data-testid="video-capture-preview" />
            ) : (
              <video ref={liveVideoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" data-testid="camera-record-live-preview" />
            )}
            {recording && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {seconds}s / {MAX_SECONDS}s
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!videoBlob ? (
            <Button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={!!error}
              data-testid={recording ? "stop-recording-btn" : "start-recording-btn"}
              className={`w-full h-11 ${recording ? "bg-red-600 hover:bg-red-700" : "bg-green-800 hover:bg-green-900"} text-white hover:text-white`}
            >
              {recording ? <Square className="mr-2 h-4 w-4" /> : <Circle className="mr-2 h-4 w-4" />}
              {recording ? "Stop recording" : "Start recording"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={retake} data-testid="retake-video-btn" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                type="button"
                onClick={confirm}
                data-testid="use-video-btn"
                className="flex-1 bg-green-800 text-white hover:bg-green-900 hover:text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Use this video
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
