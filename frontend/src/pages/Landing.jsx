import { useState } from "react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, MessageCircle, MapPinned, Sparkles, ShieldCheck, IndianRupee, Star } from "lucide-react";
@@ -61,6 +61,18 @@ function MeltHeadline({ text }) {
export default function Landing() {
  const [demoHours, setDemoHours] = useState(2);
  const demoPrice = 499 + (demoHours - 2) * 250;
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      // Small delay so the section has actually painted before we scroll to it
      const t = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [location]);

  return (
    <div data-testid="landing-page" className="min-h-screen bg-white">
@@ -165,7 +177,7 @@ export default function Landing() {
      </section>

      {/* CITY MARQUEE */}
      <section className="border-y border-stone-200 bg-white bg-jaali">
      <section className="border-y border-stone-200 bg-amber-50/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <span className="kicker">Locals available in</span>
          {cities.map((c, i) => (
@@ -184,7 +196,8 @@ export default function Landing() {
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <section id="how" className="scroll-mt-24 bg-green-50/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <div className="kicker">How it works</div>
@@ -213,10 +226,11 @@ export default function Landing() {
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* PRICING — DURATION BASED */}
      <section id="pricing" className="bg-stone-50 border-y border-stone-200">
      <section id="pricing" className="scroll-mt-24 bg-amber-50/50 border-y border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="kicker-saffron">Pricing — simple and duration-based</div>
@@ -276,7 +290,7 @@ export default function Landing() {
      </section>

      {/* TRUST */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-green-50/30 rounded-3xl my-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="kicker">Trust & safety</div>
@@ -311,18 +325,18 @@ export default function Landing() {

      {/* CTA */}
      <section className="relative border-t border-stone-200 bg-green-800 overflow-hidden">
        <Marigold className="absolute -left-6 top-1/2 -translate-y-1/2 h-32 w-32 text-amber-400/40" />
        <Marigold className="absolute -right-8 bottom-2 h-24 w-24 text-amber-300/50" />
        <Marigold className="absolute -left-6 top-1/2 -translate-y-1/2 h-32 w-32 text-amber-400/40 hidden sm:block" />
        <Marigold className="absolute -right-8 bottom-2 h-24 w-24 text-amber-300/50 hidden sm:block" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-xl">
            Your next trip should feel personal. Start with a local.
          </h2>
         
            
        
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
