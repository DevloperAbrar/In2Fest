import React from "react";
import { Check, Dumbbell, BookOpen, UtensilsCrossed, Store, CalendarDays } from "lucide-react";
import { Reveal, SectionHead } from "./ui";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

const ITEMS = [
  {
    id: "gym",
    icon: Dumbbell,
    title: "Gyms & fitness",
    lead: "Everything a gym owner does daily, without the register.",
    points: [
      "Member cards and fee receipts",
      "Plans, renewals and discounts",
      "QR attendance and shifts",
      "Workout plan for every member",
      "Supplement store with stock",
    ],
    big: true,
  },
  {
    id: "library",
    icon: BookOpen,
    title: "Library & study rooms",
    lead: "Seats, shifts and fees under control.",
    points: ["Seat allocation by hall and shift", "Student fees and receipts", "QR attendance", "Book issue and return"],
  },
  {
    id: "food",
    icon: UtensilsCrossed,
    title: "Restaurants & food",
    lead: "Take orders on your own website.",
    points: ["Menu with photos", "Live order board", "Customer order tracking", "Sales reports"],
  },
  {
    id: "shops",
    icon: Store,
    title: "Shops & retail",
    lead: "Know what is in stock and what sold.",
    points: ["Item catalogue", "Stock and low-stock alerts", "GST bills", "Your own online catalogue page"],
  },
  {
    id: "events",
    icon: CalendarDays,
    title: "Events & venues",
    lead: "No more double bookings.",
    points: ["Availability calendar", "Enquiries and bookings", "Client records", "Invoices and balances"],
  },
];

export default function VerticalsSection() {
  return (
    <section className="bg-[#faf9f6] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHead
          eyebrow="Built for local businesses"
          title="Made for the way you actually work."
          sub="Each business type gets its own tools, so you only see what you need."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal
                key={it.id}
                delay={(i % 3) * 0.08}
                className={it.big ? "lg:col-span-2" : ""}
              >
                <article
                  className={`h-full rounded-3xl border border-navy-100 p-7 md:p-8 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(26,32,53,0.4)] ${
                    it.big ? "bg-navy-700 text-white" : "bg-white"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${it.big ? "bg-white/10" : "bg-navy-50"}`}>
                    <Icon size={20} className={it.big ? "text-gold-500" : "text-navy-600"} />
                  </div>
                  <h3
                    className={`mt-5 font-display font-extrabold ${it.big ? "text-white text-2xl md:text-3xl" : "text-navy-700 text-xl"}`}
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {it.title}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed ${it.big ? "text-white/70" : "text-navy-400"}`}>{it.lead}</p>
                  <ul className={`mt-5 space-y-2.5 ${it.big ? "sm:columns-2 sm:gap-8" : ""}`}>
                    {it.points.map((p) => (
                      <li key={p} className={`flex gap-2.5 text-sm break-inside-avoid ${it.big ? "text-white/85" : "text-navy-500"}`}>
                        <Check size={16} className="text-gold-500 mt-0.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  {it.big && (
                    <a
                      href={`${APP_URL}/login`}
                      className="inline-flex mt-7 rounded-xl bg-accent-500 hover:bg-accent-600 transition px-5 py-2.5 text-sm font-bold text-white"
                    >
                      Start free
                    </a>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}