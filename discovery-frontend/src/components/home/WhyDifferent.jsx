import React from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, XCircle, LayoutDashboard, Globe2, Store,
  MessageSquareText, CalendarCheck2, Inbox, FileText, BarChart3,
  ArrowRight
} from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";

const COMPARISON = [
  { label: "Verified vendor profiles",              us: true, them: true },
  { label: "Dedicated website per vendor",           us: true, them: false },
  { label: "Live availability calendar",             us: true, them: false },
  { label: "Direct booking & inquiries in-app",      us: true, them: false },
  { label: "Quotation & billing on the platform",    us: true, them: false },
  { label: "Just a phone number & basic listing",    us: false, them: true },
  { label: "Zero commission on bookings",             us: true, them: false },
];

const TOOLKIT = [
  { icon: LayoutDashboard,   title: "Vendor Dashboard",     desc: "One clean panel to manage every operation  - bookings, leads, profile, all in one place." },
  { icon: Globe2,            title: "Website Builder",      desc: "Pick a template, add your details, go live  - a real website, not just a directory entry." },
  { icon: Store,             title: "Market Profile",       desc: "A polished public profile that's easy to create, update and keep current." },
  { icon: MessageSquareText, title: "Reviews Management",   desc: "Collect and respond to genuine customer reviews right from your dashboard." },
  { icon: CalendarCheck2,    title: "Slot Booking System",  desc: "Customers see real availability and book instantly  - no back-and-forth calls." },
  { icon: Inbox,             title: "Direct Inquiries",     desc: "Leads land straight with you, ready to be converted into confirmed clients." },
  { icon: FileText,          title: "Quotation Builder",    desc: "Share professional quotations and invoices from a single platform." },
  { icon: BarChart3,         title: "Analytics",            desc: "Track views, inquiries and bookings to see exactly what's working." },
];

export default function WhyDifferent() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <p
            className="inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
            style={{ color: "#e8192c", background: "#e8192c0d" }}
          >
            Why {BRAND_NAME}
          </p>
          <h2
            className="font-display font-extrabold text-navy-900 mb-3"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "-0.02em" }}
          >
            A directory gives you a number. We give you a booking.
          </h2>
          <p className="text-gray-500 text-sm md:text-base max-w-xl mx-auto">
            Most local search platforms stop at "here's their contact info."
            We built the entire journey  - discovery, comparison, booking and
            billing  - on one platform.
          </p>
        </div>

        {/* ── Comparison table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-16">
          <div className="grid grid-cols-3 text-xs md:text-sm font-semibold text-center" style={{ background: "#1a2035" }}>
            <div className="py-4 text-left pl-4 md:pl-6 text-white/70">Feature</div>
            <div className="py-4 text-white">{BRAND_NAME}</div>
            <div className="py-4 text-white/50">Directory Listings</div>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 items-center text-xs md:text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
            >
              <div className="py-3.5 pl-4 md:pl-6 pr-2 text-gray-700">{row.label}</div>
              <div className="py-3.5 flex justify-center">
                {row.us
                  ? <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
                  : <XCircle size={18} className="text-gray-300" />}
              </div>
              <div className="py-3.5 flex justify-center">
                {row.them
                  ? <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
                  : <XCircle size={18} className="text-gray-300" />}
              </div>
            </div>
          ))}
        </div>

        {/* ── Wave separator ── */}
        <div style={{ lineHeight: 0 }} className="mb-16">
          <svg viewBox="0 0 1440 30" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full block h-7">
            <path d="M0,15 C360,0 1080,30 1440,15" stroke="#e8192c22" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* ── Vendor toolkit  - what powers the difference ── */}
        <div className="text-center mb-10">
          <p
            className="inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
            style={{ color: "#1a2035", background: "#1a20350a" }}
          >
            Built for vendors, felt by you
          </p>
          <h3 className="font-display font-extrabold text-navy-900 text-xl md:text-2xl">
            Every vendor on {BRAND_NAME} runs on the same toolkit
          </h3>
          <p className="text-gray-500 text-sm max-w-lg mx-auto mt-2">
            That's why profiles are current, availability is real, and replies are fast  -
            it's not manual, it's built into how they work.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLKIT.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: "#e8192c12" }}
              >
                <Icon size={17} style={{ color: "#e8192c" }} />
              </div>
              <p className="font-semibold text-navy-900 text-sm mb-1">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            to="/for-vendors"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
          >
            See the Vendor Toolkit <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}