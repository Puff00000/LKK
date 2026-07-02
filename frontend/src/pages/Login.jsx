import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = new URLSearchParams(location.search).get("next") || null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Welcome back, ${res.user.name}`);
    if (next) navigate(next);
    else if (res.user.role === "admin") navigate("/admin");
    else if (res.user.role === "local") navigate("/local");
    else navigate("/dashboard");
  };

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-4 py-12" data-testid="login-page">
      <div className="w-full">
        {roleParam && (
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            roleParam === "local"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-green-200 bg-green-50 text-green-900"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${roleParam === "local" ? "bg-amber-600" : "bg-green-700"}`} />
            {roleParam === "local" ? "Logging in as Local" : "Logging in as Traveller"}
          </div>
        )}
        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-900">Welcome back</h1>
        <p className="mt-2 text-stone-600">Log in to continue your journey.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1.5"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-green-800 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              data-testid="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1.5"
            />
          </div>
          <Button
            type="submit"
            data-testid="login-submit"
            disabled={submitting}
            className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white"
          >
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-stone-600">
          New to LKK?{" "}
          <Link
            to={`/register${roleParam ? `?role=${roleParam}` : ""}`}
            className="font-medium text-green-800 hover:underline"
            data-testid="login-to-register"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
