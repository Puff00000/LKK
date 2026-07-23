import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeBookingCount, setActiveBookingCount] = useState(0);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    api
      .get("/account/delete-preview")
      .then(({ data }) => setActiveBookingCount(data.active_booking_count || 0))
      .catch(() => setActiveBookingCount(0));
  }, []);

  const hasActiveBooking = activeBookingCount > 0;

  const handleDelete = async () => {
    if (!password) {
      toast.error("Enter your password to confirm.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/account/delete", { password });
      toast.success("Your account has been deleted.");
      logout();
      navigate("/");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10" data-testid="settings-page">
      <div className="text-xs uppercase tracking-[0.2em] text-green-800">Settings</div>
      <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-stone-900">
        Account settings
      </h1>

      <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="font-heading text-lg font-semibold text-red-700">Danger zone</h2>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          Deleting your account is permanent. Your name, email, and phone number will be removed, and you won't be
          able to log in again. Past bookings, reviews, and messages stay on record for the other party involved, but
          will show as "Deleted user" instead of your name.
        </p>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              data-testid="delete-account-trigger"
              variant="outline"
              className="mt-4 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-700">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-left">
                  <p>This can't be undone. Your account will be permanently deleted.</p>

                  {hasActiveBooking && user?.role === "local" && (
                    <p
                      data-testid="active-booking-warning-local"
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900"
                    >
                      You have {activeBookingCount} active booking{activeBookingCount !== 1 ? "s" : ""}. Deleting your
                      account will cancel {activeBookingCount !== 1 ? "them" : "it"} — you will not receive payment
                      for {activeBookingCount !== 1 ? "these trips" : "this trip"}.
                    </p>
                  )}

                  {hasActiveBooking && user?.role === "traveller" && (
                    <p
                      data-testid="active-booking-warning-traveller"
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900"
                    >
                      You have {activeBookingCount} active booking{activeBookingCount !== 1 ? "s" : ""} that
                      {activeBookingCount !== 1 ? " have" : " has"} already been paid for. Deleting your account will
                      cancel {activeBookingCount !== 1 ? "them" : "it"} — you will NOT receive a refund. Are you sure
                      you want to cancel?
                    </p>
                  )}

                  <div className="pt-1">
                    <Label htmlFor="delete-password" className="text-stone-700">
                      Enter your password to confirm
                    </Label>
                    <Input
                      id="delete-password"
                      data-testid="delete-account-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1.5"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPassword("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                data-testid="confirm-delete-account"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={submitting || !password}
                className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              >
                {submitting ? "Deleting…" : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
