import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle, Landmark, IndianRupee } from "lucide-react";

export default function BankVerificationCard({ guide, onUpdated }) {
  const [mode, setMode] = useState(guide.upi_vpa ? "upi" : "bank");
  const [accountName, setAccountName] = useState(guide.bank_account_name || "");
  const [accountNumber, setAccountNumber] = useState(guide.bank_account_number || "");
  const [ifsc, setIfsc] = useState(guide.bank_ifsc || "");
  const [vpa, setVpa] = useState(guide.upi_vpa || "");
  const [submitting, setSubmitting] = useState(false);

  const status = guide.bank_verification_status || "none";

  const submit = async (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast.error("Add the name on the account");
      return;
    }
    if (mode === "bank" && (!accountNumber.trim() || !ifsc.trim())) {
      toast.error("Add both account number and IFSC code");
      return;
    }
    if (mode === "upi" && !vpa.trim()) {
      toast.error("Add your UPI ID");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/profile/guide/bank", {
        account_name: accountName.trim(),
        account_number: mode === "bank" ? accountNumber.trim() : null,
        ifsc: mode === "bank" ? ifsc.trim() : null,
        upi_vpa: mode === "upi" ? vpa.trim() : null,
      });
      onUpdated(data.guide);
      toast.success("Details submitted — verification usually takes a few minutes.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6" data-testid="bank-verification-card">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-stone-400" />
        <h2 className="font-heading text-lg font-semibold text-stone-900">Payout details</h2>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Trips are paid to LKK first — we transfer your share to this account after each completed trip. We verify these
        details with a small ₹1 check before trusting them.
      </p>

      <div className="mt-3 flex items-center gap-2">
        {status === "verified" && (
          <Badge data-testid="bank-status-verified" className="bg-green-800 text-white hover:bg-green-800 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </Badge>
        )}
        {status === "pending" && (
          <Badge data-testid="bank-status-pending" variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 gap-1">
            <Clock className="h-3.5 w-3.5" /> Verifying…
          </Badge>
        )}
        {status === "failed" && (
          <Badge data-testid="bank-status-failed" variant="outline" className="border-red-300 bg-red-50 text-red-800 gap-1">
            <XCircle className="h-3.5 w-3.5" /> Verification failed
          </Badge>
        )}
      </div>
      {status === "failed" && guide.bank_verification_reason && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="bank-failure-reason">
          {guide.bank_verification_reason}
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("bank")}
            data-testid="bank-mode-bank"
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              mode === "bank" ? "border-green-700 bg-green-50 text-green-900" : "border-stone-200 text-stone-600"
            }`}
          >
            Bank account
          </button>
          <button
            type="button"
            onClick={() => setMode("upi")}
            data-testid="bank-mode-upi"
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              mode === "upi" ? "border-green-700 bg-green-50 text-green-900" : "border-stone-200 text-stone-600"
            }`}
          >
            UPI
          </button>
        </div>

        <div>
          <Label htmlFor="account-name">Name on the account</Label>
          <Input
            id="account-name"
            data-testid="bank-account-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="As it appears on your bank account"
            className="mt-1.5"
          />
        </div>

        {mode === "bank" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="account-number">Account number</Label>
              <Input
                id="account-number"
                data-testid="bank-account-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ifsc">IFSC code</Label>
              <Input
                id="ifsc"
                data-testid="bank-ifsc"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="mt-1.5"
              />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="vpa">UPI ID</Label>
            <Input
              id="vpa"
              data-testid="bank-vpa"
              value={vpa}
              onChange={(e) => setVpa(e.target.value)}
              placeholder="yourname@bank"
              className="mt-1.5"
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          data-testid="bank-submit-btn"
          className="w-full h-11 bg-green-800 text-white hover:bg-green-900 hover:text-white"
        >
          <IndianRupee className="mr-2 h-4 w-4" />
          {submitting ? "Submitting…" : status === "none" ? "Submit for verification" : "Update & re-verify"}
        </Button>
      </form>
    </div>
  );
}
