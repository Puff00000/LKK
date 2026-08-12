import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

/**
 * Wraps the /local dashboard. A Local's phone has to be verified before they
 * see anything else — this used to happen right after registering (while
 * auto-logged-in), but now that registration requires email verification
 * first, this step moved to right after a real login instead.
 */
export default function RequirePhoneVerified({ children }) {
  const { user, refresh } = useAuth();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!user || user.phone_verified) return children;

  const sendOtp = async () => {
    setSending(true);
    try {
      await api.post("/otp/send", { phone: user.phone });
      setOtpSent(true);
      toast.success("Code sent.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) return;
    setVerifying(true);
    try {
      await api.post("/otp/verify", { phone: user.phone, otp });
      toast.success("Phone verified!");
      await refresh();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-sm place-items-center px-4 py-12 text-center" data-testid="require-phone-verified">
      <div className="w-full">
        <ShieldCheck className="mx-auto h-10 w-10 text-green-800" />
        <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900">Verify your phone</h1>
        <p className="mt-2 text-stone-600">
          One more step before your dashboard — confirm {user.phone ? <span className="font-medium">+91 {user.phone}</span> : "your phone number"} with a one-time code.
        </p>

        {!otpSent ? (
          <Button
            onClick={sendOtp}
            disabled={sending}
            data-testid="phone-send-otp-btn"
            className="mt-6 w-full h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white"
          >
            {sending ? "Sending…" : "Send code"}
          </Button>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex justify-center" data-testid="phone-otp-input">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={verifyOtp}
              disabled={otp.length < 4 || verifying}
              data-testid="phone-verify-otp-btn"
              className="w-full h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            >
              {verifying ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={sending}
              data-testid="phone-resend-otp-btn"
              className="text-sm text-stone-500 hover:underline"
            >
              {sending ? "Sending…" : "Resend code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
