import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("checking"); // checking | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message || "Email verified — you can now log in.");
      })
      .catch((e) => {
        setStatus("error");
        setMessage(formatApiError(e.response?.data?.detail) || e.message);
      });
  }, [token]);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12 text-center" data-testid="verify-email-page">
      {status === "checking" && (
        <div>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-green-800" />
          <p className="mt-4 text-stone-600">Verifying your email…</p>
        </div>
      )}

      {status === "success" && (
        <div data-testid="verify-success">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-700" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900">Email verified</h1>
          <p className="mt-2 text-stone-600">{message}</p>
          <Button asChild className="mt-6 h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white">
            <Link to="/login">Go to login</Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <div data-testid="verify-error">
          <XCircle className="mx-auto h-10 w-10 text-red-600" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-stone-900">Couldn't verify</h1>
          <p className="mt-2 text-stone-600">{message}</p>
          <Button asChild variant="outline" className="mt-6 h-11">
            <Link to="/register">Back to sign up</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
