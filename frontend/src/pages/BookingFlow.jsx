import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError, inr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarIcon, ShieldCheck, Lock, Clock, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getTripDraft, setTripDraft, getPendingBooking, setPendingBooking, clearPendingBooking } from "@/lib/tripDraft";
import { openRazorpayCheckout } from "@/lib/razorpay";

const TIME_SLOTS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM",
];

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const [bookingDate, setBookingDate] = useState(null);
  const [bookingTime, setBookingTime] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api.get(`/services/${id}`).then(({ data }) => {
      setService(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // If we're arriving back here after a login/signup wall, restore whatever
  // the traveller had already filled in before we sent them off to auth.
  useEffect(() => {
    if (!user) return;
    const pending = getPendingBooking(id);
    if (pending) {
      if (pending.bookingDate) setBookingDate(new Date(pending.bookingDate));
      if (pending.bookingTime) setBookingTime(pending.bookingTime);
      if (pending.phone) setPhone(pending.phone);
      if (pending.notes) setNotes(pending.notes);
      clearPendingBooking();
    }
  }, [user, id]);

  if (loading) return <div className="py-20 text-center text-stone-500">Loading…</div>;
  if (!service) return <div className="py-20 text-center text-stone-500">Service not found</div>;

  const formIsValid = bookingDate && bookingTime && phone;

  const goPayment = async () => {
    if (!formIsValid) {
      toast.error("Please pick a date, time, and add your phone number.");
      return;
    }
    if (!user) {
      // Save the in-progress form and send them to register/log in — they'll
      // land right back here with everything still filled in.
      setPendingBooking(id, {
        bookingDate: format(bookingDate, "yyyy-MM-dd"),
        bookingTime,
        phone,
        notes,
      });
      setAuthPromptOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const draft = getTripDraft();
      const { data } = await api.post("/bookings", {
        service_id: service.id,
        booking_date: format(bookingDate, "yyyy-MM-dd"),
        booking_time: bookingTime,
        traveller_phone: phone,
        notes,
        trip_id: draft?.tripId || null,
        trip_city: !draft?.tripId ? draft?.city || null : null,
        trip_name: !draft?.tripId ? draft?.tripName || null : null,
        trip_traveller_count: !draft?.tripId ? draft?.travellerCount || 1 : null,
        trip_start_date: !draft?.tripId ? draft?.startDate || null : null,
        trip_end_date: !draft?.tripId ? draft?.endDate || null : null,
      });
      if (data.trip_id) {
        setTripDraft({ tripId: data.trip_id });
      }
      setBooking(data);
      setStep(2);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const payNow = async () => {
    setSubmitting(true);
    try {
      const { data: order } = await api.post(`/bookings/${booking.id}/pay/create-order`);
      await openRazorpayCheckout(
        order,
        async (result) => {
          try {
            await api.post(`/bookings/${booking.id}/pay/verify`, result);
            toast.success("Payment successful! Your local has been notified.");
            navigate(`/bookings/${booking.id}`);
          } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || e.message);
          } finally {
            setSubmitting(false);
          }
        },
        (err) => {
          // Widget closed without paying, or payment failed client-side
          if (err) toast.error(err.message);
          setSubmitting(false);
        }
      );
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10" data-testid="booking-flow-page">
      <div className="text-xs uppercase tracking-[0.2em] text-green-800">
        {step === 1 ? "Step 1 of 2 — Details" : "Step 2 of 2 — Payment"}
      </div>
      <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
        {service.title}
      </h1>
      <div className="mt-1 text-sm text-stone-500">
        {service.guide_name} · {service.guide_city} · {service.duration_hours}h
      </div>

      {step === 1 && (
        <div className="mt-8 space-y-5 rounded-2xl border border-stone-200 bg-white p-6" data-testid="booking-step-1">
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="booking-date-trigger" className="mt-1.5 w-full justify-start border-stone-300 font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4 text-stone-500" />
                  {bookingDate ? format(bookingDate, "EEE, d MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={setBookingDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Time</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-testid={`time-slot-${t}`}
                  onClick={() => setBookingTime(t)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    bookingTime === t
                      ? "border-green-700 bg-green-50 text-green-900"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Your phone number</Label>
            <Input id="phone" data-testid="booking-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1.5" />
          </div>

          <div>
            <Label htmlFor="notes">Notes for your local <span className="text-stone-400 font-normal">(optional)</span></Label>
            <Textarea id="notes" data-testid="booking-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything they should know before you meet?" className="mt-1.5" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-stone-50 border border-stone-200 px-4 py-3 text-sm">
            <span className="text-stone-500">Service fee ({service.duration_hours}h, in person)</span>
            <span className="font-heading text-lg font-bold text-stone-900">{inr(service.price)}</span>
          </div>

          <Button
            onClick={goPayment}
            disabled={submitting || !formIsValid}
            data-testid="booking-continue-btn"
            className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white disabled:opacity-40"
          >
            {submitting ? "Please wait…" : "Proceed to pay"}
          </Button>
          {!user && (
            <p className="text-center text-xs text-stone-400">You'll be asked to log in or sign up before payment.</p>
          )}
        </div>
      )}

      {step === 2 && booking && (
        <div className="mt-8 space-y-5 rounded-2xl border border-stone-200 bg-white p-6" data-testid="booking-step-2">
          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm">
            <span className="text-green-900">Booking created — awaiting payment</span>
            <span className="font-heading text-lg font-bold text-green-900">{inr(booking.amount)}</span>
          </div>
          <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            <div className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4" /> Secure payment via Razorpay</div>
            Pay by card, UPI, netbanking, or wallet. Your local is only notified once payment is confirmed.
          </div>
          <Button
            onClick={payNow}
            disabled={submitting}
            data-testid="booking-pay-btn"
            className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white"
          >
            {submitting ? "Processing…" : `Pay ${inr(booking.amount)}`}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Held in escrow until you confirm the experience happened
          </div>
        </div>
      )}

      {/* Auth wall — only reached at the actual pay step */}
      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent data-testid="auth-wall-dialog">
          <DialogHeader>
            <DialogTitle>Almost there — log in to pay</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            Your booking details are saved. Log in or create a traveller account to continue — you'll land right back here.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => navigate(`/login?next=/book/${id}`)}
              data-testid="auth-wall-login-btn"
              className="w-full bg-green-800 text-white hover:bg-green-900 hover:text-white"
            >
              <LogIn className="mr-2 h-4 w-4" /> Log in
            </Button>
            <Button
              onClick={() => navigate(`/register?role=traveller&next=/book/${id}`)}
              data-testid="auth-wall-signup-btn"
              variant="outline"
              className="w-full border-stone-300"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Sign up as a traveller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
