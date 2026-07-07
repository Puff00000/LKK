import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getTripDraft, tripDraftDayCount } from "@/lib/tripDraft";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarRange, Users, Pencil, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function TripConfirm() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => getTripDraft());

  useEffect(() => {
    if (!draft?.city) {
      navigate("/create-trip");
    } else if (!draft?.startDate || !draft?.endDate) {
      navigate("/create-trip/dates");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft?.city || !draft?.startDate || !draft?.endDate) return null;

  const dayCount = tripDraftDayCount(draft);

  const confirmAndBrowse = () => {
    toast.success("Trip confirmed! Here are locals in " + draft.city + ".");
    navigate(`/browse?city=${encodeURIComponent(draft.city)}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-14" data-testid="trip-confirm-page">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-green-800">Step 3 of 3</div>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          Confirm your trip
        </h1>
        <p className="mt-2 text-stone-500 text-sm">Here's what we've got — edit anything before you start browsing.</p>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-green-700 bg-green-50/40 p-6 space-y-4" data-testid="trip-summary-card">
        {draft.tripName && (
          <div className="font-heading text-lg font-semibold text-stone-900">{draft.tripName}</div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-white border border-stone-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-stone-700">
            <MapPin className="h-4 w-4 text-stone-400" /> Destination
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-stone-900">{draft.city}</span>
            <Link to="/create-trip" data-testid="edit-city" className="text-green-800 hover:text-green-900">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-white border border-stone-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-stone-700">
            <CalendarRange className="h-4 w-4 text-stone-400" /> Dates
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-stone-900">{draft.startDate} → {draft.endDate} ({dayCount}d)</span>
            <Link to="/create-trip/dates" data-testid="edit-dates" className="text-green-800 hover:text-green-900">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-white border border-stone-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-stone-700">
            <Users className="h-4 w-4 text-stone-400" /> Travellers
          </div>
          <span className="font-medium text-stone-900">{draft.travellerCount || 1}</span>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-stone-400">
        Nothing's booked yet — this just helps us show you the right locals. You'll only need to sign in when you're ready to book.
      </p>

      <Button
        onClick={confirmAndBrowse}
        data-testid="confirm-trip-btn"
        className="mt-6 w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white"
      >
        Confirm & browse locals <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
