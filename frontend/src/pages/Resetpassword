import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-stone-900">Invalid reset link</h1>
          <p className="mt-2 text-stone-500">This link is invalid or has expired.</p>
          <Link to="/forgot-password">
            <Button className="mt-4 bg-green-800 text-white hover:bg-green-900">
              Request a new link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match!");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid or expired reset link");
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
          {done ? (
            <div className="text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-700" />
                </div>
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900">Password updated!</h1>
              <p className="mt-2 text-stone-500 text-sm">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Button
                onClick={() => navigate("/login")}
                className="mt-6 w-full bg-green-800 text-white hover:bg-green-900"
              >
                Go to login
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-green-700" />
                </div>
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900 text-center">Set new password</h1>
              <p className="mt-2 text-stone-500 text-sm text-center">
                Choose a strong password for your LKK account.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    className="mt-1.5"
                  />
                  {confirm && password !== confirm && (
                    <p className="mt-1 text-xs text-red-600">Passwords don't match</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading || (confirm && password !== confirm)}
                  className="w-full h-12 bg-green-800 text-white hover:bg-green-900"
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
