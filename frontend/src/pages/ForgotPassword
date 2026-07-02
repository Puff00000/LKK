import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-green-800 mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="bg-white rounded-3xl border border-stone-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-700" />
                </div>
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900">Check your email</h1>
              <p className="mt-3 text-stone-500 text-sm leading-relaxed">
                We sent a password reset link to <span className="font-medium text-stone-900">{email}</span>.
                Check your inbox and click the link to reset your password.
              </p>
              <p className="mt-4 text-xs text-stone-400">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-green-800 underline"
                >
                  try again
                </button>
              </p>
              <Link to="/login">
                <Button className="mt-6 w-full bg-green-800 text-white hover:bg-green-900">
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-700" />
                </div>
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900 text-center">Forgot password?</h1>
              <p className="mt-2 text-stone-500 text-sm text-center leading-relaxed">
                No worries! Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1.5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-green-800 text-white hover:bg-green-900"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-stone-500">
                Remember your password?{" "}
                <Link to="/login" className="text-green-800 font-medium hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
