import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe2, CalendarCheck2, MessageCircle, Menu, X, Bell } from "lucide-react";
import logo from "../../assets/logo.png";
import heroImage from "../../assets/hero.png";
import websiteBuilderImg from "../../assets/vendor-toolkit/website-builder.jpg";
import bookingCalendarImg from "../../assets/vendor-toolkit/booking-calendar.jpg";
import dashboardImg from "../../assets/vendor-toolkit/dashboard.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

function RevealSection({ children, className = "" }) {
  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger}
    >
      {children}
    </motion.section>
  );
}

const FEATURES = [
  {
    img: websiteBuilderImg,
    title: "A website that's actually yours",
    text: "A branded page at your own address, built the same day - photos, services and pricing laid out the way you'd want a customer to see them.",
  },
  {
    img: bookingCalendarImg,
    title: "One calendar, no double-bookings",
    text: "Every slot you open is held the moment someone books it, so the same evening never gets promised to two families.",
  },
  {
    img: dashboardImg,
    title: "Run it all from one dashboard",
    text: "Bookings, inquiries, GST-ready invoices and QR payments - without switching between five different apps.",
  },
];

const STEPS = [
  { n: "1", t: "Tell us about your venue", d: "Name, photos, services and the dates you already have booked." },
  { n: "2", t: "We build your site", d: "Live the same day, at a link you can put on your visiting card." },
  { n: "3", t: "Share it everywhere", d: "Instagram bio, WhatsApp status, Google - one link does it all." },
  { n: "4", t: "Run it from one dashboard", d: "Bookings, inquiries and invoices, without switching apps." },
];

export default function PlatformHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "What you get", href: "#what-you-get" },
    { label: "How it works", href: "#how-it-works" },
  ];

  return (
    <div className="min-h-screen bg-paper text-navy-900 font-sans overflow-x-hidden">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-paper/90 backdrop-blur-md shadow-sm shadow-navy-900/5" : "bg-paper/70 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="In2Fest" className="h-7 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-navy-500 hover:text-navy-900 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold px-5 py-2.5 rounded-full bg-accent-500 text-white hover:bg-accent-600 transition-colors shadow-sm shadow-accent-500/30"
            >
              Get started
            </Link>
          </div>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-5 space-y-3 border-t border-navy-900/10 bg-paper">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block pt-3 text-sm text-navy-600">
                {l.label}
              </a>
            ))}
            <Link to="/login" className="block text-center pt-2 text-sm font-medium px-4 py-2 rounded-full border border-navy-900/15">
              Sign in
            </Link>
            <Link to="/login" className="block text-center text-sm font-semibold px-4 py-2 rounded-full bg-accent-500 text-white">
              Get started
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-20 lg:pt-32 lg:pb-28 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.p variants={fadeUp} className="text-sm font-semibold text-accent-500 mb-5">
            For venue &amp; event businesses in India
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight text-navy-900"
          >
            Your business gets a website.
            <br />
            Your calendar gets a brain.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 text-base text-navy-500 leading-relaxed max-w-md">
            Banquet halls, photographers, decorators and caterers use In2Fest for a branded
            booking site, one shared slot calendar so nothing gets double-booked, and a WhatsApp
            ping the moment an inquiry comes in.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              to="/login"
              className="px-6 py-3 rounded-full bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors shadow-md shadow-accent-500/30"
            >
              Get started
            </Link>
            <a href="#how-it-works" className="text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
              See how it works
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-12 flex items-center gap-6 sm:gap-8">
            <div>
              <p className="font-display text-2xl font-bold text-navy-900">500+</p>
              <p className="text-xs text-navy-400 mt-1">venues live</p>
            </div>
            <div className="h-9 w-px bg-navy-900/10" />
            <div>
              <p className="font-display text-2xl font-bold text-navy-900">0%</p>
              <p className="text-xs text-navy-400 mt-1">booking commission</p>
            </div>
            <div className="h-9 w-px bg-navy-900/10" />
            <div>
              <p className="font-display text-2xl font-bold text-navy-900">1 day</p>
              <p className="text-xs text-navy-400 mt-1">to go live</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero photo with floating UI badges */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-navy-900/20">
            <img src={heroImage} alt="A venue set up for an event, booked through In2Fest" className="w-full h-[360px] object-cover" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl shadow-navy-900/15 px-4 py-3.5 flex items-center gap-3 max-w-[220px]"
          >
            <span className="h-9 w-9 rounded-full bg-accent-50 flex items-center justify-center shrink-0">
              <Bell size={16} className="text-accent-500" />
            </span>
            <div>
              <p className="text-xs font-semibold text-navy-900">New inquiry</p>
              <p className="text-[11px] text-navy-400">Sent via WhatsApp, just now</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="absolute -top-5 -right-4 bg-navy-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-gold-400" />
            <p className="text-xs font-semibold">Sat - fully booked</p>
          </motion.div>
        </motion.div>
      </section>

      {/* What you get */}
      <RevealSection className="border-t border-navy-900/10">
        <div id="what-you-get" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
          <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl font-bold max-w-lg">
            Everything a venue owner used to hire three people for
          </motion.h2>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="group">
                <div className="rounded-2xl overflow-hidden shadow-lg shadow-navy-900/10">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="font-display font-semibold mt-5">{f.title}</h3>
                <p className="mt-2 text-sm text-navy-500 leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* How it works - genuine sequence, timeline styling */}
      <RevealSection className="border-t border-navy-900/10 bg-navy-50/50">
        <div id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-20">
          <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl font-bold max-w-lg">
            How it works
          </motion.h2>

          <div className="mt-14 relative">
            <div className="hidden lg:block absolute top-4 left-0 right-0 h-px bg-navy-900/10" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {STEPS.map((step) => (
                <motion.div key={step.n} variants={fadeUp} className="relative">
                  <div className="hidden lg:flex h-8 w-8 rounded-full bg-accent-500 text-white items-center justify-center font-display text-sm font-bold mb-5">
                    {step.n}
                  </div>
                  <p className="lg:hidden font-display text-sm text-accent-500 font-bold">{step.n}</p>
                  <h3 className="font-display font-semibold mt-2 lg:mt-0">{step.t}</h3>
                  <p className="mt-2 text-sm text-navy-500 leading-relaxed">{step.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </RevealSection>

      {/* CTA band */}
      <RevealSection>
        <div className="bg-navy-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-20 text-center">
            <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl font-bold max-w-xl mx-auto">
              Put your calendar online this week
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/60 max-w-md mx-auto">
              No setup fee, no commission on your bookings. Just your business, live.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                to="/login"
                className="inline-block mt-8 px-7 py-3 rounded-full bg-gold-500 text-navy-900 text-sm font-semibold hover:bg-gold-400 transition-colors"
              >
                Get started
              </Link>
            </motion.div>
          </div>
        </div>
      </RevealSection>

      {/* Footer */}
      <footer className="border-t border-navy-900/10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <img src={logo} alt="In2Fest" className="h-6 w-auto" />
            <p className="text-xs text-navy-400">Built for venues, halls and event vendors across India</p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-1">
          <p className="text-xs text-navy-400 text-center sm:text-right">
              © {new Date().getFullYear()}{" "}
              
              <a  href="https://campussafar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-navy-700 transition-colors"
              >
                Campussafar Technologies Private Limited®
              </a>
              . All rights reserved.
            </p>
            <p className="text-[11px] text-navy-400/80 text-center sm:text-right">
              In2Fest™ is a trademark of Campussafar Technologies Private Limited®.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}