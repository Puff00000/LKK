import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, AlertTriangle } from "lucide-react";

/**
 * Live camera capture for the profile photo. Deliberately does NOT accept
 * file uploads — for identity verification, the photo needs to be taken
 * right now, in front of the camera, not picked from a gallery/stock image.
 * Calls onCapture(blob) with a JPEG blob once the person confirms the shot.
 */
export default function CameraCaptureModal({ open, onOpenChange, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  useEffect(() => {
    if (!open) {
      stopStream();
      setPhotoBlob(null);
      setPhotoPreviewUrl("");
      setError("");
      return;
    }
    startStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startStream = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      setError(
        e.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permission for this site and try again."
          : e.name === "NotFoundError"
          ? "No camera was found on this device."
          : "Couldn't access the camera. Try again."
      );
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setPhotoBlob(blob);
        setPhotoPreviewUrl(URL.createObjectURL(blob));
        stopStream();
      },
      "image/jpeg",
      0.9
    );
  };

  const retake = () => {
    setPhotoBlob(null);
    setPhotoPreviewUrl("");
    startStream();
  };

  const confirm = () => {
    if (!photoBlob) return;
    onCapture(photoBlob);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="camera-capture-modal">
        <DialogHeader>
          <DialogTitle>Take your profile photo</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" data-testid="camera-error">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-black aspect-square grid place-items-center">
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" data-testid="photo-capture-preview" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" data-testid="camera-live-preview" />
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-3">
          {!photoBlob ? (
            <Button
              type="button"
              onClick={capture}
              disabled={!!error}
              data-testid="capture-photo-btn"
              className="w-full h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={retake} data-testid="retake-photo-btn" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                type="button"
                onClick={confirm}
                data-testid="use-photo-btn"
                className="flex-1 bg-green-800 text-white hover:bg-green-900 hover:text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Use this photo
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
