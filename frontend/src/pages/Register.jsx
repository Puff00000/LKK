import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "traveller" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await register(form);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Welcome to Localink, ${res.user.name}`);
    if (res.user.role === "local") navigate("/local/profile");
    else navigate("/dashboard");
  };

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-4 py-12" data-testid="register-page">
      <div className="w-full">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-stone-900">Join LKK</h1>
        <p className="mt-2 text-stone-600">Travel like a local — or share your city as one.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <Label>I am joining as a…</Label>
            <RadioGroup
              data-testid="register-role"
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v })}
              className="mt-2 grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="role-traveller"
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  form.role === "traveller" ? "border-green-800 bg-green-50" : "border-stone-200 bg-white"
                }`}
              >
                <RadioGroupItem value="traveller" id="role-traveller" className="sr-only" />
                <div className="font-heading text-base font-semibold text-stone-900">Traveller</div>
                <div className="text-xs text-stone-600 mt-1">Discover & book locals</div>
              </label>
              <label
                htmlFor="role-local"
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  form.role === "local" ? "border-green-800 bg-green-50" : "border-stone-200 bg-white"
                }`}
              >
                <RadioGroupItem value="local" id="role-local" className="sr-only" />
                <div className="font-heading text-base font-semibold text-stone-900">Local guide</div>
                <div className="text-xs text-stone-600 mt-1">Share your city, earn</div>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" data-testid="register-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" data-testid="register-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" />
          </div>
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
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-green-800 hover:underline" data-testid="register-to-login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
