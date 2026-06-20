import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { CheckCircle2, Smartphone } from "lucide-react";

const STEPS = [
  { n: 1, t: "Sign up" },
  { n: 2, t: "Verify phone" },
  { n: 3, t: "Complete profile" },
];

function StepIndicator({ step }) {
  return (
    <ol className="mb-6 flex items-center gap-3 text-xs">
      {STEPS.map((s) => (
        <li
          key={s.n}
          data-testid={`step-indicator-${s.n}`}
          className={`flex items-center gap-1.5 ${step >= s.n ? "text-green-800" : "text-stone-400"}`}
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-medium ${
              step > s.n
                ? "bg-green-800 text-white"
                : step === s.n
                ? "bg-amber-500 text-white"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {step > s.n ? "✓" : s.n}
          </span>
          {s.t}
        </li>
      ))}
    </ol>
  );
}

export default function Register() {
  const { register, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const lockedRole = roleParam === "local" || roleParam === "traveller" ? roleParam : null;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    role: "traveller",
  });
  const role = lockedRole || form.role;
  const isLocal = role === "local";
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mockMode, setMockMode] = useState(false);

  const headline = lockedRole
    ? isLocal
      ? step === 1
        ? "Sign up as a Local"
        : step === 2
        ? "Verify your phone"
        : "Almost there"
      : "Sign up as a Traveller"
    : "Join LKK";
  const subline = lockedRole
    ? isLocal
      ? step === 1
        ? "A few details to get you started."
        : step === 2
        ? "We sent a 6-digit code to your phone."
        : "Add a bio, photo, expertise and price to go live."
      : "Discover local guides in your destination city and book one in minutes."
    : "Travel like a local — or share your city as one.";

  // ---------- STEP 1: signup ------------------------------------------------
  const submitSignup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role,
      phone: form.phone || undefined,
      city: form.city || undefined,
    };
    const res = await register(payload);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (!isLocal) {
      toast.success(`Welcome to LKK, ${res.user.name}`);
      navigate("/dashboard");
      return;
    }
    // local flow → trigger OTP send and move to step 2
    setStep(2);
    await sendOtp();
  };

  // ---------- STEP 2: OTP ---------------------------------------------------
  const sendOtp = async () => {
    try {
      const { data } = await api.post("/otp/send", { phone: form.phone });
      setOtpSent(true);
      setMockMode(!!data.mock);
      toast.success(data.mock ? "OTP sent (mock mode — use 123456)" : "OTP sent to your phone");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault?.();
    if (otp.length < 4) return;
    setSubmitting(true);
    try {
      await api.post("/otp/verify", { phone: form.phone, otp });
      await refresh();
      toast.success("Phone verified");
      setStep(3);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- STEP 3: gateway to profile page -------------------------------
  const goToProfile = () => navigate("/local/profile?welcome=1");

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-4 py-12" data-testid="register-page">
      <div className="w-full">
        {lockedRole && (
          <div
            data-testid="register-role-pill"
            className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              isLocal
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-green-200 bg-green-50 text-green-900"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLocal ? "bg-amber-600" : "bg-green-700"}`} />
            {isLocal ? "I am a Local" : "I am a Traveller"}
          </div>
        )}
        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-900" data-testid="register-headline">
          {headline}
        </h1>
        <p className="mt-2 text-stone-600">{subline}</p>

        {isLocal && <div className="mt-6"><StepIndicator step={step} /></div>}

        {/* STEP 1 — sign up form */}
        {step === 1 && (
          <form onSubmit={submitSignup} className="mt-6 space-y-5">
            {!lockedRole && (
              <div>
                <Label>I am joining as a…</Label>
                <RadioGroup
                  data-testid="register-role"
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                  className="mt-2 grid grid-cols-2 gap-3"
                >
                  <label htmlFor="role-traveller" className={`cursor-pointer rounded-xl border p-4 transition-colors ${form.role === "traveller" ? "border-green-800 bg-green-50" : "border-stone-200 bg-white"}`}>
                    <RadioGroupItem value="traveller" id="role-traveller" className="sr-only" />
                    <div className="font-heading text-base font-semibold text-stone-900">Traveller</div>
                    <div className="text-xs text-stone-600 mt-1">Discover & book locals</div>
                  </label>
                  <label htmlFor="role-local" className={`cursor-pointer rounded-xl border p-4 transition-colors ${form.role === "local" ? "border-green-800 bg-green-50" : "border-stone-200 bg-white"}`}>
                    <RadioGroupItem value="local" id="role-local" className="sr-only" />
                    <div className="font-heading text-base font-semibold text-stone-900">Local guide</div>
                    <div className="text-xs text-stone-600 mt-1">Share your city, earn</div>
                  </label>
                </RadioGroup>
              </div>
            )}

            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" data-testid="register-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="register-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" />
            </div>

            {isLocal && (
              <>
                <div>
                  <Label htmlFor="phone">Phone (Indian, 10 digits)</Label>
                  <div className="mt-1.5 flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-stone-200 bg-stone-50 px-3 text-sm text-stone-600">+91</span>
                    <Input
                      id="phone"
                      data-testid="register-phone"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      required
                      className="rounded-l-none"
                      placeholder="98765 43210"
                    />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">We'll send you a one-time code.</p>
                </div>
                <div>
                  <Label htmlFor="city">City you can show people around</Label>
                  <Input id="city" data-testid="register-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required placeholder="e.g. Jaipur" className="mt-1.5" />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" data-testid="register-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="mt-1.5" />
              <p className="mt-1 text-xs text-stone-500">At least 6 characters.</p>
            </div>

            <Button
              type="submit"
              data-testid="register-submit"
              disabled={submitting}
              className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            >
              {submitting
                ? "Creating account…"
                : isLocal
                ? "Continue to phone verification"
                : "Create traveller account"}
            </Button>

            {lockedRole && (
              <p className="text-xs text-center text-stone-500">
                Wrong choice?{" "}
                <Link
                  to={`/register?role=${isLocal ? "traveller" : "local"}`}
                  data-testid="register-switch-role"
                  className="font-medium text-green-800 hover:underline"
                >
                  Sign up as a {isLocal ? "Traveller" : "Local"} instead
                </Link>
              </p>
            )}
          </form>
        )}

        {/* STEP 2 — OTP */}
        {step === 2 && (
          <div className="mt-6 space-y-5" data-testid="otp-step">
            <div className="rounded-xl border border-stone-200 bg-white p-4 flex items-start gap-3">
              <Smartphone className="h-5 w-5 mt-0.5 text-green-700" />
              <div className="flex-1 text-sm">
                <div className="text-stone-700">Code sent to <span className="font-medium text-stone-900">+91 {form.phone}</span></div>
                {mockMode && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                    Mock mode — use <span className="font-mono">123456</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={verifyOtp} className="space-y-4">
              <Label>Enter the 6-digit code</Label>
              <div className="flex justify-center" data-testid="otp-input">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                type="submit"
                data-testid="otp-verify-btn"
                disabled={otp.length < 4 || submitting}
                className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white"
              >
                {submitting ? "Verifying…" : "Verify & continue"}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  data-testid="otp-resend-btn"
                  onClick={sendOtp}
                  className="text-green-800 hover:underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3 — done, jump to profile */}
        {step === 3 && (
          <div className="mt-6 space-y-5" data-testid="profile-handoff">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-700" />
              <div className="text-sm">
                <div className="font-medium text-green-900">Phone verified.</div>
                <div className="text-green-900/80">Now add a bio, photo, expertise & price. Your profile goes live as <span className="font-semibold">Unverified</span> until 3 trips complete (or admin verifies).</div>
              </div>
            </div>
            <Button
              data-testid="continue-profile-btn"
              onClick={goToProfile}
              className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            >
              Complete profile
            </Button>
          </div>
        )}

        {step === 1 && (
          <p className="mt-6 text-sm text-stone-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-green-800 hover:underline" data-testid="register-to-login">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
