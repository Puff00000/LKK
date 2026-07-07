import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, MapPinned, Sparkles, ShieldCheck, IndianRupee, Star } from "lucide-react";

const cities = ["Jaipur", "Goa", "Manali", "Varanasi", "Bangalore", "Udaipur"];

const steps = [
  {
    icon: MapPinned,
    title: "Pick your city",
    body: "Browse verified locals in your destination. Filter by price, language, and what they're best at.",
    accent: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  {
    icon: Sparkles,
    title: "Book a service",
    body: "Pick a bite-sized experience — 2 to 8 hours, in person. Starts at ₹499 for 2 hours, scaling with duration.",
    accent: "bg-green-50 text-green-800 ring-green-200",
  },
  {
    icon: MessageCircle,
    title: "Meet in person",
    body: "Chat with your local to confirm the meeting point, then do the experience together — no written itinerary needed.",
    accent: "bg-rose-50 text-rose-800 ring-rose-200",
  },
];

// Decorative marigold motif — subtle ornamental accent
const Marigold = ({ className = "" }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden>
    <g fill="currentColor">
      {Array.from({ length: 8 }).map((_, i) => (
        <ellipse key={i} cx="20" cy="8" rx="3.5" ry="7" transform={`rotate(${i * 45} 20 20)`} opacity="0.85" />
      ))}
      <circle cx="20" cy="20" r="3.5" fill="#fff" />
      <circle cx="20" cy="20" r="2" />
    </g>
  </svg>
);

// Headline rendered uniformly in Bagel Fat One, all green, no per-letter scaling.
function MeltHeadline({ text }) {
  return (
    <h2
      data-testid="melt-headline"
      aria-label={text}
      className="select-none text-green-900"
      style={{
        fontFamily: "'Bagel Fat One', serif",
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {text}
    </h2>
  );
}

export default function Landing() {
  return (
    <div data-testid="landing-page" className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-grain">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-marigold-spot blur-2xl" />
        <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-green-100 blur-3xl opacity-60" />
        <Marigold className="absolute right-10 top-24 hidden h-16 w-16 text-amber-500/70 md:block animate-[spin_60s_linear_infinite]" />
        <Marigold className="absolute left-10 bottom-16 hidden h-10 w-10 text-rose-500/60 md:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-20 sm:pt-20 sm:pb-28">
          {/* THE MELT HEADLINE — single hero anchor */}
          <div className="text-[clamp(48px,8.5vw,128px)] leading-none">
            <MeltHeadline text="log kya kahenge" />
          </div>

          <div className="mt-8 grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-medium text-amber-900">
                <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-amber-600" />
                Travel the way locals do
              </div>

              <h1 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900">
                Skip the tourist trail. <br />
                <span className="relative inline-block">
                  <span className="relative z-10 text-green-800">Travel like a local.</span>
                  <span className="absolute inset-x-0 -bottom-1 h-3 -z-0 bg-amber-200/60 rounded" />
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base sm:text-lg text-stone-600 leading-relaxed">
                <span className="font-display text-stone-900">LKK</span> connects you with verified people who live in
                your destination city, for bite-sized in-person experiences — bargaining a market, a street food
                crawl, chasing the sunrise. 2 to 8 hours, from <span className="font-semibold text-stone-900">₹499</span>.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/login">
                  <Button
                    data-testid="hero-login-btn"
                    variant="outline"
                    className="h-12 border-stone-300 px-6 text-stone-800 hover:bg-stone-50"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/create-trip">
                  <Button
                    data-testid="hero-get-started-btn"
                    className="h-12 bg-green-800 px-6 text-white hover:bg-green-900 hover:text-white shadow-[0_6px_0_0_rgba(180,83,9,0.95)] hover:shadow-[0_4px_0_0_rgba(180,83,9,0.95)] transition-all"
                  >
                    Create a trip
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-stone-500">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-700" /> Verified locals only</div>
                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-amber-700" /> Payment held until you confirm</div>
                <div className="flex items-center gap-2"><Star className="h-4 w-4 text-rose-700" /> Reviewed by real travellers</div>
              </div>
            </div>

            {/* Right itinerary card */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl bg-amber-100/70 blur-2xl" />
                <div className="relative rounded-3xl border-2 border-stone-900 bg-white p-6 shadow-[10px_10px_0_0_rgba(245,158,11,0.85)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="kicker-saffron">Today in Jaipur</div>
                      <div className="font-heading text-2xl font-bold text-stone-900">Street food walk with Aarav</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-800 text-white font-display">
                      AS
                    </div>
                  </div>
                  <div className="divider-mandala mt-4" />
                  <ul className="mt-4 space-y-4">
                    {[
                      { t: "🍜 Food & Drink", v: "10 iconic spots in the Old City" },
                      { t: "🕐 3 hours", v: "6:30 PM meetup at Hawa Mahal" },
                      { t: "💳 ₹749", v: "Covers Aarav's time only" },
                    ].map((row) => (
                      <li key={row.t} className="flex gap-4">
                        <span className="w-32 shrink-0 text-xs font-medium text-amber-700">{row.t}</span>
                        <span className="text-sm text-stone-700">{row.v}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 text-sm border border-green-100">
                    <span className="text-green-900">In-person · 3 hours</span>
                    <span className="font-heading text-lg font-bold text-green-900">₹749</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CITY MARQUEE */}
      <section className="border-y border-stone-200 bg-white bg-jaali">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <span className="kicker">Locals available in</span>
          {cities.map((c, i) => (
            <Link
              key={c}
              to={`/browse?city=${c}`}
              data-testid={`landing-city-${c}`}
              className={`font-heading text-base hover:text-green-800 ${
                ["text-stone-800", "text-amber-800", "text-green-900", "text-rose-800", "text-stone-800", "text-amber-800"][i % 6]
              }`}
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
            <div className="kicker">How it works</div>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              Three steps from <br />
              <span className="text-amber-700">stranger</span> to <span className="text-green-800">friend</span>
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
                className="relative rounded-2xl border border-stone-200 bg-white p-6 hover:-translate-y-1 transition-transform"
              >
                <div className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ${s.accent}`}>
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

      {/* PRICING — DURATION BASED */}
      <section id="pricing" className="bg-stone-50 border-y border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="kicker-saffron">Pricing — simple and duration-based</div>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              One rule: ₹499 for 2 hours, ₹250 per extra hour.
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              Every service is in person, 2 to 8 hours. The fee covers your local's time only — food, entry fees,
              shopping, and transport are separate and shown upfront on each listing. LKK takes a 10% platform fee.
              That's it — no surge pricing, no booking fees.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { h: 2, p: 499 }, { h: 3, p: 749 }, { h: 4, p: 999 }, { h: 5, p: 1249 },
              { h: 6, p: 1499 }, { h: 7, p: 1749 }, { h: 8, p: 1999 },
            ].map((row) => (
              <div key={row.h} className="rounded-xl border-2 border-stone-200 bg-white p-4 text-center hover:border-green-700 transition-colors">
                <div className="text-xs uppercase tracking-[0.15em] text-stone-500">{row.h} hours</div>
                <div className="mt-2 font-heading text-2xl font-bold text-stone-900">₹{row.p.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: MessageCircle, label: "🍜 Food & Drink", body: "Street food walks, chai trails, local restaurant tours." },
              { icon: Sparkles, label: "🛍️ Shopping", body: "Bazaar bargaining, textile shopping, spice markets." },
              { icon: ShieldCheck, label: "🏛️ Culture & more", body: "Heritage walks, photography, craft workshops, nature." },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="font-heading text-base font-semibold text-stone-900">{c.label}</div>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="kicker">Trust & safety</div>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              You're safe because your money is.
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              Every booking is held in escrow. Your local gets paid only after you confirm the experience happened.
              If anything feels off, raise a dispute and our team reviews it within 24 hours.
            </p>
          </div>
          <ul className="grid gap-4">
            {[
              "10% platform fee · 90% goes to the local",
              "Payment held until you confirm the experience happened",
              "Verified profile + reviews from real travellers",
              "Dispute resolution within 24 hours",
            ].map((t, i) => (
              <li
                key={t}
                className={`flex items-start gap-3 rounded-xl border bg-white p-4 ${
                  ["border-green-200", "border-amber-200", "border-rose-200", "border-stone-200"][i]
                }`}
              >
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-700 mt-0.5" />
                <span className="text-sm text-stone-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-stone-200 bg-green-800 overflow-hidden">
        <Marigold className="absolute -left-6 top-1/2 -translate-y-1/2 h-32 w-32 text-amber-400/40" />
        <Marigold className="absolute -right-8 bottom-2 h-24 w-24 text-amber-300/50" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-xl">
            Your next trip should feel personal. Start with a local.
          </h2>
          <Link to="/browse">
            <Button
              data-testid="cta-browse-btn"
              className="h-12 bg-amber-400 px-6 text-stone-900 hover:bg-amber-300 hover:text-stone-900 font-semibold"
            >
              Browse locals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
     {/* FOOTER */}
<footer className="bg-stone-50 border-t border-stone-200">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
    <div>LKK © {new Date().getFullYear()} · All rights reserved</div>
    <div className="flex gap-6">
      <span className="cursor-default">Contact</span>
      <Link to="/legal" className="hover:text-green-800 transition-colors">Legal</Link>
      <Link to="/about" className="hover:text-green-800 transition-colors">About</Link>
    </div>
  </div>
</footer>
    </div>
  );
}
