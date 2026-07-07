import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getTripDraft, setTripDraft } from "@/lib/tripDraft";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarRange, ArrowRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const MAX_TRIP_DAYS = 30;

export default function TripDates() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => getTripDraft());
  const [range, setRange] = useState(() => {
    const d = getTripDraft();
    return d?.startDate && d?.endDate
      ? { from: new Date(d.startDate), to: new Date(d.endDate) }
      : undefined;
  });

  useEffect(() => {
    if (!draft?.city) {
      toast.error("Tell us your destination first");
      navigate("/create-trip");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayCount = range?.from && range?.to
    ? Math.round((range.to - range.from) / (1000 * 60 * 60 * 24)) + 1
    : null;

  const disabledDays = (d) => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    if (d < today) return true;
    if (range?.from && !range?.to) {
      const maxEnd = new Date(range.from);
      maxEnd.setDate(maxEnd.getDate() + MAX_TRIP_DAYS - 1);
      return d > maxEnd;
    }
    return false;
  };

  const submit = () => {
    if (!range?.from || !range?.to) {
      toast.error("Pick both a start and end date");
      return;
    }
    setTripDraft({
      startDate: format(range.from, "yyyy-MM-dd"),
      endDate: format(range.to, "yyyy-MM-dd"),
    });
    navigate("/create-trip/confirm");
  };

  if (!draft?.city) return null;

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-14" data-testid="trip-dates-page">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-green-800">Step 2 of 3</div>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          When's the trip?
        </h1>
        <p className="mt-2 text-stone-500 text-sm">Pick your travel window — you'll choose exact meetup times per experience later.</p>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <span>Trip to <span className="font-semibold">{draft.city}</span></span>
        <Link to="/create-trip" data-testid="edit-city-link" className="flex items-center gap-1 font-medium hover:underline">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 flex justify-center">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          disabled={disabledDays}
          numberOfMonths={1}
          data-testid="trip-date-range-calendar"
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-600" data-testid="trip-day-count">
        <CalendarRange className="h-4 w-4 text-stone-400" />
        {dayCount ? (
          <span>
            {format(range.from, "d MMM")} → {format(range.to, "d MMM")} · {dayCount} day{dayCount !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-stone-400">Select a start and end date</span>
        )}
      </div>

      <Button
        onClick={submit}
        disabled={!dayCount}
        data-testid="trip-dates-continue-btn"
        className="mt-6 w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white disabled:opacity-40"
      >
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
