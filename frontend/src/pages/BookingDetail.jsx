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
import { openRazorpayCheckout } from "@/lib/razorpay";

const STATUS_LABEL = {
  requested: "Requested · awaiting response",
  awaiting_payment: "Accepted · awaiting payment",
  accepted: "Accepted · meetup confirmed",
  itinerary_delivered: "Accepted · meetup confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "In dispute",
  declined: "Declined",
  expired: "Expired",
  unavailable: "No longer available",
};

const STATUS_BADGE_COLOR = {
  requested: "bg-amber-50 text-amber-900 border-amber-300",
  awaiting_payment: "bg-blue-50 text-blue-800 border-blue-200",
  accepted: "bg-green-50 text-green-900 border-green-200",
  itinerary_delivered: "bg-green-50 text-green-900 border-green-200",
  completed: "bg-stone-100 text-stone-700 border-stone-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  disputed: "bg-red-50 text-red-800 border-red-200",
  declined: "bg-stone-100 text-stone-500 border-stone-200",
  expired: "bg-stone-100 text-stone-500 border-stone-200",
  unavailable: "bg-stone-100 text-stone-500 border-stone-200",
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
  const [responding, setResponding] = useState(false);
  const [chatUnavailableReason, setChatUnavailableReason] = useState(null);
  const [canSendChat, setCanSendChat] = useState(true);
  const messagesEndRef = useRef(null);

  const loadAll = async () => {
    const { data: b } = await api.get(`/bookings/${id}`);
    setBooking(b);
    // Fetched separately from the booking itself — messages can 403 before
    // payment or after the post-trip window closes, and that shouldn't take
    // the whole page down with it.
    try {
      const { data: m } = await api.get(`/bookings/${id}/messages`);
      setMessages(m);
      setChatUnavailableReason(null);
      const now = Date.now();
      const graceMs = 48 * 60 * 60 * 1000; // mirror backend CHAT_GRACE_HOURS default
      const writable =
        ["accepted", "itinerary_delivered", "disputed"].includes(b.status) ||
        (b.status === "completed" && b.completed_at && now - new Date(b.completed_at).getTime() < graceMs);
      setCanSendChat(writable);
    } catch (e) {
      setMessages([]);
      setCanSendChat(false);
      setChatUnavailableReason(formatApiError(e.response?.data?.detail) || "Chat isn't available for this booking yet.");
    }
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
    if (!input.trim() || !canSendChat) return;
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
      const { data: order } = await api.post(`/bookings/${id}/pay/create-order`);
      await openRazorpayCheckout(
        order,
        async (result) => {
          try {
            await api.post(`/bookings/${id}/pay/verify`, result);
            toast.success("Payment successful! Your local has been notified.");
            loadAll();
          } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || e.message);
          } finally {
            setPaying(false);
          }
        },
        (err) => {
          if (err) toast.error(err.message);
          setPaying(false);
        }
      );
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
      setPaying(false);
    }
  };

  const handleAccept = async () => {
    setResponding(true);
    try {
      await api.post(`/bookings/${id}/accept`);
      toast.success("Accepted! The traveller's been notified to pay.");
      loadAll();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    setResponding(true);
    try {
      await api.post(`/bookings/${id}/decline`);
      toast.success("Declined.");
      loadAll();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setResponding(false);
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
          <Badge variant="outline" data-testid="booking-status" className={STATUS_BADGE_COLOR[booking.status] || "bg-stone-100 text-stone-700 border-stone-200"}>
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

            {booking.status === "requested" && (
              <div className="mt-4">
                <p className="text-stone-500">
                  {isLocal
                    ? "New request — nothing's been charged yet. Accept to let the traveller pay, or decline if you can't make it."
                    : "Your request has been sent. Nothing's charged yet — you'll only pay once they accept."}
                </p>
                {isLocal && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      onClick={handleAccept}
                      disabled={responding}
                      data-testid="accept-request-btn"
                      className="bg-green-800 text-white hover:bg-green-900 hover:text-white"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {responding ? "Accepting…" : "Accept"}
                    </Button>
                    <Button
                      onClick={handleDecline}
                      disabled={responding}
                      variant="outline"
                      data-testid="decline-request-btn"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            )}

            {booking.status === "awaiting_payment" && (
              <div className="mt-4">
                <p className="text-stone-500">
                  {isTraveller
                    ? "Accepted! Pay now to lock in your spot."
                    : "Waiting on the traveller to pay — this releases back to you automatically if they don't within 24 hours."}
                </p>
                {isTraveller && (
                  <Button
                    onClick={payNow}
                    disabled={paying}
                    data-testid="pay-now-btn"
                    className="mt-4 bg-green-800 text-white hover:bg-green-900 hover:text-white"
                  >
                    {paying ? "Processing…" : `Pay ${inr(booking.amount)}`}
                  </Button>
                )}
              </div>
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

            {booking.status === "declined" && (
              <p className="mt-4 text-stone-500">
                {isLocal ? "You declined this request." : "This request was declined. Nothing was charged."}
              </p>
            )}

            {booking.status === "expired" && (
              <p className="mt-4 text-stone-500">
                This request expired without a response. Nothing was charged.
              </p>
            )}

            {booking.status === "unavailable" && (
              <p className="mt-4 text-stone-500">
                Another traveller was accepted for this slot first. Nothing was charged — try another time or local.
              </p>
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
            {chatUnavailableReason && (
              <div className="text-sm text-stone-400 text-center py-8 px-2">{chatUnavailableReason}</div>
            )}
            {!chatUnavailableReason && messages.length === 0 && (
              <div className="text-sm text-stone-400 text-center py-8">No messages yet. Say hi.</div>
            )}
            {!chatUnavailableReason && messages.map((m) => {
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
              onKeyDown={(e) => e.key === "Enter" && canSendChat && sendMessage()}
              placeholder={canSendChat ? "Type a message…" : "Chat is closed for this booking"}
              disabled={!canSendChat}
            />
            <Button
              data-testid="chat-send"
              onClick={sendMessage}
              disabled={!canSendChat}
              className="bg-green-800 text-white hover:bg-green-900 hover:text-white shrink-0 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!canSendChat && !chatUnavailableReason && (
            <div className="px-3 pb-3 text-xs text-stone-400 text-center">
              Chat has closed for this booking. Start a dispute if you still need help.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
