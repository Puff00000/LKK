import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [step, setStep] = useState(1);
  const [tripStart, setTripStart] = useState(null);
  const [tripEnd, setTripEnd] = useState(null);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    api.get(`/guides/${id}`).then(({ data }) => setGuide(data.guide));
  }, [id]);

  if (!guide) return <div className="py-20 text-center text-stone-500" data-testid="booking-loading">Loading…</div>;

  const fee = Math.round((guide.price * 10) / 100);
  const localGets = guide.price - fee;

  const goPayment = async () => {
    if (!tripStart || !tripEnd || !phone) {
      toast.error("Please fill all trip details.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        guide_id: guide.id,
        trip_start: format(tripStart, "yyyy-MM-dd"),
        trip_end: format(tripEnd, "yyyy-MM-dd"),
        traveller_phone: phone,
        notes,
      });
      setBooking(data);
      setStep(2);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const mockPay = async () => {
    setSubmitting(true);
    try {
      await api.post(`/bookings/${booking.id}/pay`);
      toast.success("Payment successful (mock). Your local has been notified.");
      navigate(`/bookings/${booking.id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10" data-testid="booking-flow">
      <div className="text-xs uppercase tracking-[0.2em] text-green-800">Booking</div>
      <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
        Book a day with {guide.name.split(" ")[0]}
      </h1>

      <ol className="mt-6 flex items-center gap-4 text-sm">
        {[
          { n: 1, t: "Trip details" },
          { n: 2, t: "Payment" },
        ].map((s) => (
          <li
            key={s.n}
            className={`flex items-center gap-2 ${step >= s.n ? "text-green-800" : "text-stone-400"}`}
            data-testid={`step-${s.n}`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-medium ${step >= s.n ? "bg-green-800 text-white" : "bg-stone-100 text-stone-500"}`}>{s.n}</span>
            {s.t}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_280px] items-start">
        <div className="space-y-6">
          {step === 1 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Trip start</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="trip-start-btn"
                        className="mt-1.5 w-full justify-start font-normal border-stone-200"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-stone-500" />
                        {tripStart ? format(tripStart, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar mode="single" selected={tripStart} onSelect={setTripStart} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Trip end</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="trip-end-btn"
                        className="mt-1.5 w-full justify-start font-normal border-stone-200"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-stone-500" />
                        {tripEnd ? format(tripEnd, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar mode="single" selected={tripEnd} onSelect={setTripEnd} disabled={(d) => !tripStart || d < tripStart} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Your phone number</Label>
                <Input data-testid="trip-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9xxxxxxxxx" className="mt-1.5" />
              </div>

              <div>
                <Label>Notes for your local <span className="text-stone-400 font-normal">(optional)</span></Label>
                <Textarea data-testid="trip-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tell them what you love — food, art, off-beat places…" className="mt-1.5" rows={4} />
              </div>

              <Button data-testid="booking-continue" onClick={goPayment} disabled={submitting} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
                Continue to payment
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5" data-testid="payment-step">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-900">
                <div className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4" /> Mock Razorpay (test mode)</div>
                <p className="mt-1 text-green-900/80">
                  Payment is simulated for the MVP. In production, this calls Razorpay's order + checkout flow. Your
                  money is held in escrow until you confirm your itinerary.
                </p>
              </div>

              <div className="grid gap-3 rounded-xl border border-stone-200 p-4 text-sm">
                <div className="flex justify-between"><span className="text-stone-500">Package</span><span className="text-stone-900">{inr(guide.price)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">LKK platform fee (10%)</span><span className="text-stone-900">{inr(fee)}</span></div>
                <div className="flex justify-between border-t border-stone-100 pt-3 font-heading text-base font-semibold"><span>Total</span><span>{inr(guide.price)}</span></div>
                <div className="text-xs text-stone-500">Your local receives {inr(localGets)} after you confirm the itinerary.</div>
              </div>

              <Button data-testid="pay-now-btn" onClick={mockPay} disabled={submitting} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
                {submitting ? "Processing…" : `Pay ${inr(guide.price)} (mock)`}
              </Button>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-stone-200 bg-white p-6 md:sticky md:top-24">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Your local</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-green-50">
              {guide.avatar_url && <img src={guide.avatar_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div>
              <div className="font-heading text-base font-semibold text-stone-900">{guide.name}</div>
              <div className="text-xs text-stone-500">{guide.city}</div>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
            <div className="font-heading text-2xl font-bold text-stone-900">{inr(guide.price)}</div>
            <div className="text-xs text-stone-500">Custom itinerary + in-app chat</div>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-stone-500">
            <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-green-700" /> Held in escrow</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-green-700" /> Refundable if no itinerary</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
