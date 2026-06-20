import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError, inr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ShieldCheck, Lock, MessageCircle, Sparkles, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PRICE_CHAT = 199;
const PRICE_IN_PERSON_PER_DAY = 499;

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTier = searchParams.get("tier") === "in_person" ? "in_person" : "chat";
  const [guide, setGuide] = useState(null);
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState(initialTier);
  const [days, setDays] = useState(1);
  const [tripStart, setTripStart] = useState(null);
  const [tripEnd, setTripEnd] = useState(null);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    api.get(`/guides/${id}`).then(({ data }) => {
      setGuide(data.guide);
      // if URL asked for in_person but guide doesn't offer it, fall back to chat
      if (initialTier === "in_person" && data.guide.offers_in_person !== true) setTier("chat");
      if (initialTier === "chat" && data.guide.offers_chat === false && data.guide.offers_in_person) setTier("in_person");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!guide) return <div className="py-20 text-center text-stone-500" data-testid="booking-loading">Loading…</div>;

  const amount = tier === "chat" ? PRICE_CHAT : PRICE_IN_PERSON_PER_DAY * days;
  const fee = Math.round((amount * 10) / 100);
  const localGets = amount - fee;

  const offersChat = guide.offers_chat !== false;
  const offersInPerson = guide.offers_in_person === true;

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
        package_type: tier,
        days: tier === "in_person" ? days : 1,
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
              {/* TIER PICKER */}
              <div>
                <Label>Choose your package</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {offersChat && (
                    <button
                      type="button"
                      data-testid="tier-pick-chat"
                      onClick={() => setTier("chat")}
                      className={`text-left rounded-xl border-2 p-4 transition-colors ${
                        tier === "chat" ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-700">
                        <MessageCircle className="h-4 w-4" /> Chat-only
                      </div>
                      <div className="mt-2 font-heading text-xl font-bold text-stone-900">{inr(PRICE_CHAT)}<span className="text-xs font-normal text-stone-500"> one-time</span></div>
                    </button>
                  )}
                  {offersInPerson && (
                    <button
                      type="button"
                      data-testid="tier-pick-in-person"
                      onClick={() => setTier("in_person")}
                      className={`text-left rounded-xl border-2 p-4 transition-colors ${
                        tier === "in_person" ? "border-green-700 bg-green-50" : "border-stone-200 bg-white hover:border-green-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-800">
                        <Sparkles className="h-4 w-4" /> In-person
                      </div>
                      <div className="mt-2 font-heading text-xl font-bold text-stone-900">{inr(PRICE_IN_PERSON_PER_DAY)}<span className="text-xs font-normal text-stone-500"> / day</span></div>
                    </button>
                  )}
                </div>
              </div>

              {tier === "in_person" && (
                <div>
                  <Label>Number of days with you in person</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      data-testid="days-minus"
                      onClick={() => setDays((d) => Math.max(1, d - 1))}
                      className="h-10 w-10 border-stone-300"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div data-testid="days-count" className="font-heading text-2xl font-bold text-stone-900 w-12 text-center">{days}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      data-testid="days-plus"
                      onClick={() => setDays((d) => Math.min(30, d + 1))}
                      className="h-10 w-10 border-stone-300"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-stone-500">× ₹{PRICE_IN_PERSON_PER_DAY} = <span className="font-medium text-stone-900">{inr(amount)}</span></div>
                  </div>
                </div>
              )}

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
                Continue to payment — {inr(amount)}
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
                <div className="flex justify-between"><span className="text-stone-500">{booking?.package_type === "in_person" ? `In-person · ${booking.days} day${booking.days > 1 ? "s" : ""}` : "Chat-only"}</span><span className="text-stone-900">{inr(booking?.amount || amount)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">LKK platform fee (10%)</span><span className="text-stone-900">{inr(booking?.platform_fee || fee)}</span></div>
                <div className="flex justify-between border-t border-stone-100 pt-3 font-heading text-base font-semibold"><span>Total</span><span>{inr(booking?.amount || amount)}</span></div>
                <div className="text-xs text-stone-500">Your local receives {inr(booking?.local_payout || localGets)} after you confirm the itinerary.</div>
              </div>

              <Button data-testid="pay-now-btn" onClick={mockPay} disabled={submitting} className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
                {submitting ? "Processing…" : `Pay ${inr(booking?.amount || amount)} (mock)`}
              </Button>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-stone-200 bg-white p-6 md:sticky md:top-24">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Your local</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-green-50">
              {guide.avatar_url && <img src={guide.avatar_url.startsWith("http") ? guide.avatar_url : `${process.env.REACT_APP_BACKEND_URL}${guide.avatar_url}`} alt="" className="h-full w-full object-cover" />}
            </div>
            <div>
              <div className="font-heading text-base font-semibold text-stone-900">{guide.name}</div>
              <div className="text-xs text-stone-500">{guide.city}</div>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
            <div className="text-xs text-stone-500 uppercase tracking-wide">{tier === "chat" ? "Chat-only" : `In-person · ${days} day${days > 1 ? "s" : ""}`}</div>
            <div className="mt-1 font-heading text-2xl font-bold text-stone-900">{inr(amount)}</div>
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
