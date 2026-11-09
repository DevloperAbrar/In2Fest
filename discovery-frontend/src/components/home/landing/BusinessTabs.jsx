import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Users, CalendarCheck, QrCode, ClipboardList, ShoppingBag, LayoutGrid, Wallet, BookOpen,
  UtensilsCrossed, MapPin, BarChart3, Package, Bell, Receipt, Store, FileText, ArrowRight,
} from "lucide-react";
import { SectionHead } from "./ui";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

const TABS = [
  {
    id: "gym", label: "Gyms", tint: "#FFE6D6", title: "Gyms & fitness clubs",
    lead: "Everything a gym owner does every day, without the register.",
    feats: [
      [Users, "Member cards and fee receipts"], [CalendarCheck, "Plans, renewals and discounts"], [QrCode, "QR attendance and shifts"],
      [ClipboardList, "Workout plan for every member"], [ShoppingBag, "Supplement store with stock"],
    ],
  },
  {
    id: "library", label: "Library", tint: "#DDF3E8", title: "Libraries & study rooms",
    lead: "Seats, shifts and fees, always under control.",
    feats: [[LayoutGrid, "Seat allocation by hall and shift"], [Wallet, "Student fees and receipts"], [QrCode, "QR attendance"], [BookOpen, "Book issue and return"]],
  },
  {
    id: "food", label: "Restaurants", tint: "#FFF0C2", title: "Restaurants & food businesses",
    lead: "Take orders on your own website and run the kitchen board.",
    feats: [[UtensilsCrossed, "Menu with photos"], [ClipboardList, "Live order board"], [MapPin, "Customer order tracking"], [BarChart3, "Sales reports"]],
  },
  {
    id: "shops", label: "Shops", tint: "#FFE0E3", title: "Shops & retail",
    lead: "Know what is in stock and what sold today.",
    feats: [[Package, "Item catalogue"], [Bell, "Low-stock alerts"], [Receipt, "Bills with GST"], [Store, "Your own online catalogue page"]],
  },
  {
    id: "events", label: "Events", tint: "#E0EAFF", title: "Events & venues",
    lead: "No more double bookings or lost enquiries.",
    feats: [[CalendarCheck, "Availability calendar"], [Users, "Enquiries and bookings"], [FileText, "Client records"], [Wallet, "Invoices and balances"]],
  },
];

export default function BusinessTabs() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState("gym");
  const tab = TABS.find((t) => t.id === active) || TABS[0];

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHead
          center
          eyebrow="Made for your business"
          title="Pick your business. See what you get."
          sub="Each business type gets its own tools, so you only see what you need."
        />
        <div role="tablist" aria-label="Business type" className="mt-10 flex gap-2.5 overflow-x-auto no-scrollbar justify-start md:justify-center pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === active}
              onClick={() => setActive(t.id)}
              className={`flex-shrink-0 rounded-full px-6 py-2.5 text-sm font-bold border-2 transition ${
                t.id === active
                  ? "bg-accent-500 border-accent-500 text-white shadow-[0_10px_24px_-10px_rgba(232,25,44,0.7)]"
                  : "bg-white border-navy-100 text-navy-600 hover:border-navy-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[2.25rem] p-6 md:p-10 transition-colors duration-500" style={{ background: tab.tint }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab.id}
              role="tabpanel"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
            >
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                <div>
                  <h3 className="font-display font-extrabold text-navy-700 text-2xl md:text-4xl" style={{ letterSpacing: "-0.02em" }}>
                    {tab.title}
                  </h3>
                  <p className="mt-2 text-navy-500 md:text-lg">{tab.lead}</p>
                </div>
                <a
                  href={`${APP_URL}/login`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-700 hover:bg-navy-800 transition px-6 py-3 text-sm font-extrabold text-white self-start md:self-auto"
                >
                  Start free <ArrowRight size={15} />
                </a>
              </div>
              <div className="mt-8 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                {tab.feats.map(([Icon, text]) => (
                  <div key={text} className="rounded-2xl bg-white p-5 shadow-[0_12px_24px_-18px_rgba(26,32,53,0.5)] transition hover:-translate-y-1">
                    <span className="w-11 h-11 rounded-xl bg-navy-700 flex items-center justify-center">
                      <Icon size={20} className="text-gold-500" />
                    </span>
                    <p className="mt-4 text-[15px] font-bold text-navy-700 leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}