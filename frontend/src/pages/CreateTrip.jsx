import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getTripDraft, setTripDraft } from "@/lib/tripDraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function CreateTrip() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const draft = getTripDraft();
  const [city, setCity] = useState(draft?.city || "");
  const [tripName, setTripName] = useState(draft?.tripName || "");
  const [travellerCount, setTravellerCount] = useState(draft?.travellerCount || 1);

  useEffect(() => {
    api.get("/guides/cities").then(({ data }) => setCities(data));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!city.trim()) {
      toast.error("Pick where you're headed first");
      return;
    }
    setTripDraft({ city: city.trim(), tripName: tripName.trim(), travellerCount: Number(travellerCount) || 1 });
    navigate("/create-trip/dates");
  };

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-14" data-testid="create-trip-page">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-green-800">Step 1 of 3</div>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          Where are you headed?
        </h1>
        <p className="mt-2 text-stone-500 text-sm">Tell us your destination and we'll line up locals there for you.</p>
      </div>

      <form onSubmit={submit} className="mt-10 space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
        <div>
          <Label htmlFor="trip-city">Destination city</Label>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              id="trip-city"
              data-testid="trip-city-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jaipur"
              list="trip-cities"
              className="pl-9"
              required
              autoFocus
            />
            <datalist id="trip-cities">
              {cities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div>
          <Label htmlFor="trip-name">Trip name <span className="text-stone-400 font-normal">(optional)</span></Label>
          <Input
            id="trip-name"
            data-testid="trip-name-input"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder='e.g. "Jaipur with Meera"'
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="trip-travellers">Number of travellers</Label>
          <div className="relative mt-1.5">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              id="trip-travellers"
              data-testid="trip-travellers-input"
              type="number"
              min="1"
              max="20"
              value={travellerCount}
              onChange={(e) => setTravellerCount(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Button type="submit" data-testid="trip-continue-btn" className="w-full h-12 bg-green-800 text-white hover:bg-green-900 hover:text-white">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
