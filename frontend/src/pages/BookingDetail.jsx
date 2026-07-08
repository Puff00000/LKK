import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatApiError, inr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Send, Star, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL = {
  pending_payment: "Awaiting payment",
  paid: "Paid · awaiting local's acceptance",
  accepted: "Accepted · meetup confirmed",
  itinerary_delivered: "Accepted · meetup confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "In dispute",
};

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const messagesEndRef = useRef(null);

  const loadAll = async () => {
    const [{ data: b }, { data: m }] = await Promise.all([
      api.get(`/bookings/${id}`),
      api.get(`/bookings/${id}/messages`),
    ]);
    setBooking(b);
    setMessages(m);
  };

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!booking) return <div className="py-20 text-center text-stone-500">Loading…</div>;

  const isTraveller = user?.id === booking.traveller_user_id;
  const isLocal = user?.id === booking.local_user_id;

  const sendMessage = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    try {
      const { data } = await api.post(`/bookings/${id}/messages`, { content });
      setMessages((p) => [...p, data]);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const confirmCompletion = async () => {
    setConfirming(true);
    try {
      await api.post(`/bookings/${id}/confirm`);
      toast.success("Confirmed! Payment released to your local.");
      loadAll();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setConfirming(false);
    }
  };

  const payNow = async () => {
    setPaying(true);
    try {
      await api.post(`/bookings/${id}/pay`);
      toast.success("Payment successful (mock). Your local has been notified.");
      loadAll();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setPaying(false);
    }
  };

  const submitReview = async () => {
    try {
      await api.post(`/bookings/${id}/review`, { rating: reviewRating, comment: reviewComment });
      toast.success("Thanks for your review!");
      setReviewOpen(false);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const raiseDispute = async () => {
    try {
      await api.post(`/bookings/${id}/dispute`, { reason: disputeReason });
      toast.success("Dispute raised. Our team will review within 24 hours.");
      setDisputeOpen(false);
      loadAll();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8" data-testid="booking-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-green-800">Booking</div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            {isTraveller ? booking.guide_name : booking.traveller_name} · {booking.guide_city}
          </h1>
          <div className="mt-1 text-sm text-stone-700">{booking.service_title}</div>
          <div className="mt-1 text-sm text-stone-500">
            {booking.booking_date} · {booking.booking_time} · {booking.duration_hours}h
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" data-testid="booking-status" className="bg-green-50 text-green-900 border-green-200">
            {STATUS_LABEL[booking.status]}
          </Badge>
          <div className="text-right">
            <div className="font-heading text-2xl font-bold text-stone-900">{inr(booking.amount)}</div>
            <div className="text-xs text-stone-500">{isLocal ? `${inr(booking.local_payout)} your share` : `incl. ${inr(booking.platform_fee)} fee`}</div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Left: Meetup + actions */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6" data-testid="meetup-section">
            <h2 className="font-heading text-xl font-bold text-stone-900">Your experience</h2>

            {booking.status === "pending_payment" && (
              <div className="mt-4">
                <p className="text-stone-500">
                  {isTraveller
                    ? "This booking is saved but not paid for yet."
                    : "Waiting on the traveller to complete payment."}
                </p>
                {isTraveller && (
                  <Button
                    onClick={payNow}
                    disabled={paying}
                    data-testid="pay-now-btn"
                    className="mt-4 bg-green-800 text-white hover:bg-green-900 hover:text-white"
                  >
                    {paying ? "Processing…" : `Pay ${inr(booking.amount)} (mock)`}
                  </Button>
                )}
              </div>
            )}

            {booking.status === "paid" && (
              <p className="mt-4 text-stone-500">
                {isLocal
                  ? "Accept or decline this booking from your dashboard to confirm the meetup."
                  : "Waiting for your local to accept the booking."}
              </p>
            )}

            {(booking.status === "accepted" || booking.status === "itinerary_delivered") && (
              <div className="mt-4">
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-900">
                  Meetup confirmed for <span className="font-medium">{booking.booking_date} at {booking.booking_time}</span>, {booking.duration_hours} hours. Use chat to sort out the exact meeting point.
                </div>
                {isTraveller && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      data-testid="confirm-itinerary-btn"
                      onClick={confirmCompletion}
                      disabled={confirming}
                      className="bg-green-800 text-white hover:bg-green-900 hover:text-white"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {confirming ? "Confirming…" : "Confirm experience happened & release payment"}
                    </Button>
                    <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" data-testid="raise-dispute-btn" className="border-stone-300 text-stone-700 hover:bg-stone-50">
                          <AlertTriangle className="mr-2 h-4 w-4" /> Raise dispute
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>What went wrong?</DialogTitle></DialogHeader>
                        <Textarea data-testid="dispute-reason" rows={5} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
                        <DialogFooter>
                          <Button data-testid="dispute-submit" onClick={raiseDispute} className="bg-red-700 text-white hover:bg-red-800 hover:text-white">Submit</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {isLocal && (
                  <p className="mt-4 text-sm text-stone-500">Once you've delivered the experience, your traveller confirms it here and your payout is released.</p>
                )}
              </div>
            )}

            {booking.status === "completed" && (
              <div className="mt-4">
                <div className="rounded-lg bg-stone-50 border border-stone-100 px-4 py-3 text-sm text-stone-700">
                  ✓ Experience completed on {booking.booking_date}.
                </div>
                {isTraveller && (
                  <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="leave-review-btn" variant="outline" className="mt-5 border-stone-300 text-stone-700 hover:bg-stone-50">
                        <Star className="mr-2 h-4 w-4" /> Leave a review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>How was your experience?</DialogTitle></DialogHeader>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            data-testid={`review-star-${n}`}
                            onClick={() => setReviewRating(n)}
                            className="p-1"
                          >
                            <Star className={`h-7 w-7 ${n <= reviewRating ? "fill-green-700 text-green-700" : "text-stone-300"}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea data-testid="review-comment" rows={4} placeholder="A few words…" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                      <DialogFooter>
                        <Button data-testid="review-submit" onClick={submitReview} className="bg-green-800 text-white hover:bg-green-900 hover:text-white">Post review</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            {booking.status === "cancelled" && (
              <p className="mt-4 text-stone-500">This booking was cancelled.</p>
            )}

            {booking.status === "disputed" && (
              <p className="mt-4 text-red-700">This booking is under dispute — our team is reviewing it.</p>
            )}
          </section>

          {booking.notes && (
            <section className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-heading text-base font-semibold text-stone-900">Traveller notes</h3>
              <p className="mt-2 text-sm text-stone-700 whitespace-pre-line">{booking.notes}</p>
            </section>
          )}
        </div>

        {/* Right: chat */}
        <aside className="rounded-2xl border border-stone-200 bg-white flex flex-col h-[600px] lg:sticky lg:top-24" data-testid="chat-panel">
          <div className="border-b border-stone-200 p-4">
            <div className="font-heading text-base font-semibold text-stone-900">Chat</div>
            <div className="text-xs text-stone-500">Messages refresh every few seconds.</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
            {messages.length === 0 && (
              <div className="text-sm text-stone-400 text-center py-8">No messages yet. Say hi.</div>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  data-testid={`chat-msg-${m.id}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine ? "bg-green-800 text-white rounded-br-sm" : "bg-stone-100 text-stone-800 rounded-bl-sm"
                    }`}
                  >
                    <div className={`text-[10px] mb-0.5 ${mine ? "text-green-100/90" : "text-stone-500"}`}>{m.sender_name}</div>
                    <div className="whitespace-pre-line">{m.content}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-stone-200 p-3 flex gap-2">
            <Input
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message…"
            />
            <Button data-testid="chat-send" onClick={sendMessage} className="bg-green-800 text-white hover:bg-green-900 hover:text-white shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
