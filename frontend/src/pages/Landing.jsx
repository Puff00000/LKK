import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, MapPinned, Sparkles, ShieldCheck, IndianRupee, Star } from "lucide-react";

const cities = ["Jaipur", "Goa", "Manali", "Varanasi", "Bangalore", "Udaipur"];

const steps = [
  {
    icon: MapPinned,
    title: "Pick your city",
    body: "Browse verified locals in your destination. Filter by price, language, and what they're best at.",
  },
  {
    icon: Sparkles,
    title: "Book a package",
    body: "Choose your dates and pay securely. Packages start at ₹499 — no hidden tourist mark-ups.",
  },
  {
    icon: MessageCircle,
    title: "Get a real itinerary",
    body: "Your local crafts a custom day-by-day plan, chats with you in-app, and can meet you in person.",
  },
];

export default function Landing() {
  return (
    <div data-testid="landing-page" className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-grain">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-green-100 blur-3xl opacity-60" />
        <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-amber-50 blur-3xl opacity-80" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-medium text-stone-700">
                <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-green-700" />
                Made in India · Travel with someone who lives there
              </div>
              <h1 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900">
                Skip the tourist trail. <br />
                <span className="text-green-800">Travel like a local.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base sm:text-lg text-stone-600 leading-relaxed">
                Localink connects you with verified people who actually live in your destination city. Book a package,
                get a custom itinerary, chat in-app, and meet up — all from ₹499.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/browse">
                  <Button
                    data-testid="hero-browse-btn"
                    className="h-12 bg-green-800 px-6 text-white hover:bg-green-900 hover:text-white"
                  >
                    Browse locals
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="outline"
                    data-testid="hero-become-local-btn"
                    className="h-12 border-stone-300 px-6 text-stone-800 hover:bg-stone-50"
                  >
                    Become a local
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-stone-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-700" />
                  Verified locals only
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-green-700" />
                  Payment held until you confirm
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-green-700" />
                  Reviewed by real travellers
                </div>
              </div>
            </div>

            {/* Right decorative card */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl bg-green-100/60 blur-2xl" />
                <div className="relative rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_10px_40px_rgba(22,101,52,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Today in Jaipur</div>
                      <div className="font-heading text-2xl font-bold text-stone-900">A day with Aarav</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-800 text-white font-heading font-bold">
                      AS
                    </div>
                  </div>
                  <ul className="mt-6 space-y-4">
                    {[
                      { t: "7:00 AM", v: "Sunrise chai at Nahargarh fort" },
                      { t: "10:30 AM", v: "Hidden haveli walk in old city" },
                      { t: "1:00 PM", v: "Laal maas at a 60-year-old dhaba" },
                      { t: "5:30 PM", v: "Rooftop bazaar with a poet friend" },
                    ].map((row) => (
                      <li key={row.t} className="flex gap-4">
                        <span className="w-20 shrink-0 text-xs font-medium text-green-800">{row.t}</span>
                        <span className="text-sm text-stone-700">{row.v}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 text-sm">
                    <span className="text-green-900">Package · 1 day</span>
                    <span className="font-heading text-lg font-bold text-green-900">₹899</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CITY MARQUEE */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-stone-500">
          <span className="font-medium uppercase tracking-[0.2em] text-stone-400 text-xs">Locals available in</span>
          {cities.map((c) => (
            <Link
              key={c}
              to={`/browse?city=${c}`}
              data-testid={`landing-city-${c}`}
              className="font-heading text-base text-stone-700 hover:text-green-800"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <div className="text-xs uppercase tracking-[0.2em] text-green-800">How it works</div>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Three steps from <br /> stranger to friend
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              We don't sell tours. We connect you with one person whose job is to make your trip feel personal.
            </p>
          </div>
          <div className="lg:col-span-8 grid gap-5 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.title}
                data-testid={`how-step-${i}`}
                className="rounded-2xl border border-stone-200 bg-white p-6"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-100 text-green-800">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-xs font-medium text-stone-400">Step {i + 1}</div>
                <h3 className="mt-1 font-heading text-lg font-semibold text-stone-900">{s.title}</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-stone-50 border-y border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-green-800">Pricing</div>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Honest, transparent, set by your local.
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              Locals set their own package price between ₹499 and ₹1999. Localink takes a 10% platform fee. That's it —
              no surge pricing, no booking fees.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { label: "Starter", price: 499, body: "A few hours, café recommendations, in-app chat." },
              { label: "Day with a local", price: 999, body: "Custom day itinerary + 1 in-person meet-up." },
              { label: "Insider weekend", price: 1999, body: "Two-day immersive plan with deep neighbourhood access." },
            ].map((p) => (
              <div key={p.label} className="rounded-2xl border border-stone-200 bg-white p-7">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{p.label}</div>
                <div className="mt-4 flex items-baseline gap-1 font-heading">
                  <span className="text-4xl font-bold text-stone-900">₹{p.price}</span>
                  <span className="text-sm text-stone-500">/ package</span>
                </div>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-green-800">Trust & safety</div>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              You're safe because your money is.
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              Every booking is held in escrow. Your local gets paid only after you confirm you've received your
              itinerary. If anything feels off, raise a dispute and our team reviews it within 24 hours.
            </p>
          </div>
          <ul className="grid gap-4">
            {[
              "10% platform fee · 90% goes to the local",
              "Payment held until you confirm itinerary received",
              "Verified profile + reviews from real travellers",
              "Dispute resolution within 24 hours",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-700 mt-0.5" />
                <span className="text-sm text-stone-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-200 bg-green-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-xl">
            Your next trip should feel personal. Start with a local.
          </h2>
          <Link to="/browse">
            <Button
              data-testid="cta-browse-btn"
              className="h-12 bg-white px-6 text-green-900 hover:bg-green-50 hover:text-green-900"
            >
              Browse locals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-stone-50 border-t border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-stone-500">
          <div className="font-heading text-base text-stone-700">© {new Date().getFullYear()} Localink</div>
          <div className="flex gap-6">
            <a href="#how" className="hover:text-green-800">How it works</a>
            <a href="#pricing" className="hover:text-green-800">Pricing</a>
            <Link to="/login" className="hover:text-green-800">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
