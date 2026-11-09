import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronRight, Mail, Phone, MessageCircle, MapPin, Clock, Send,
  CheckCircle2, Loader2, ArrowRight, Store, AlertCircle, Headphones,
} from "lucide-react";

import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";
import { LEGAL } from "../../lib/legalConfig";
import { inquiryApi } from "../../lib/api";

// Keep these keys in sync with TOPICS in backend/src/modules/contact/contact.controller.js
const TOPICS = [
  { key: "general", label: "General question" },
  { key: "list_business", label: "List my business" },
  { key: "vendor_support", label: "Vendor support" },
  { key: "billing", label: "Billing" },
  { key: "website", label: "My website" },
  { key: "partnership", label: "Partnership" },
  { key: "report", label: "Report a listing or review" },
  { key: "feedback", label: "Feedback" },
];

const EMPTY = { name: "", email: "", phone: "", topic: "general", message: "", website: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE = 2000;

function normalizeIndianMobile(raw) {
  let digits = String(raw || "").replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  digits = digits.replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email address";
  if (f.phone.trim() && !normalizeIndianMobile(f.phone)) e.phone = "Enter a valid 10-digit mobile number";
  if (f.message.trim().length < 10) e.message = "Please write a little more (at least 10 characters)";
  return e;
}

/* Decorative arches, same motif as the home and legal page heroes. */
function Arches({ className = "", flip = false }) {
  const c = flip ? ["#1a2035", "#e8192c", "#f5a623"] : ["#f5a623", "#e8192c", "#1a2035"];
  return (
    <svg className={className} width="260" height="130" viewBox="0 0 220 110" aria-hidden="true">
      <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={c[0]} strokeWidth="18" strokeLinecap="round" />
      <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={c[1]} strokeWidth="18" strokeLinecap="round" />
      <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={c[2]} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

function Field({ id, label, optional = false, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-xs font-extrabold uppercase tracking-[0.12em] text-navy-500">
        <span>{label}</span>
        {optional && <span className="font-bold normal-case tracking-normal text-navy-300">Optional</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-bold text-accent-600">
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError) =>
  [
    "w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-semibold text-navy-700",
    "placeholder:font-medium placeholder:text-navy-300 transition-colors focus:outline-none",
    hasError ? "border-accent-500 focus:border-accent-600" : "border-navy-100 focus:border-navy-700",
  ].join(" ");

export default function ContactPage() {
  const reduce = useReducedMotion();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState(null); // { name, email } after success

  const fade = (delay = 0) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay } };

  const waDigits = String(LEGAL.phone || "").replace(/\D/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}` : null;
  const telHref = LEGAL.phone ? `tel:${String(LEGAL.phone).replace(/[^\d+]/g, "")}` : null;

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const found = validate(form);
    setErrors(found);
    setServerError("");
    if (Object.keys(found).length) return;

    setSending(true);
    try {
      await inquiryApi.post("/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        topic: form.topic,
        message: form.message.trim(),
        website: form.website, // honeypot, left empty by real visitors
      });
      setSentTo({ name: form.name.trim(), email: form.email.trim() });
      setForm(EMPTY);
    } catch (err) {
      setServerError(
        err.response?.status === 429
          ? "You have sent a few messages recently. Please try again later, or email us directly."
          : err.response?.data?.message || "We could not send your message. Please try again, or email us directly."
      );
    } finally {
      setSending(false);
    }
  };

  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${BRAND_NAME}`,
    url: `https://${BASE_DOMAIN}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: BRAND_NAME,
      legalName: LEGAL.company,
      url: `https://${BASE_DOMAIN}`,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: LEGAL.email,
          telephone: LEGAL.phone,
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `https://${BASE_DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: "Contact Us", item: `https://${BASE_DOMAIN}/contact` },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{`Contact Us | ${BRAND_NAME}`}</title>
        <meta
          name="description"
          content={`Get in touch with the ${BRAND_NAME} team for support, partnerships or vendor listing queries.`}
        />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/contact`} />
        <meta property="og:title" content={`Contact Us | ${BRAND_NAME}`} />
        <meta
          property="og:description"
          content={`Get in touch with the ${BRAND_NAME} team for support, partnerships or vendor listing queries.`}
        />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#FFF6E8]">
        <Arches className="absolute -left-10 -bottom-6 hidden opacity-90 md:block" />
        <Arches className="absolute -right-10 -bottom-6 hidden opacity-90 md:block" flip />

        <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-8 text-center md:pb-16 md:pt-10">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-1.5 text-xs font-bold text-navy-400">
            <Link to="/" className="transition-colors hover:text-navy-700">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-navy-700" aria-current="page">Contact Us</span>
          </nav>

          <motion.div
            {...fade(0)}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_18px_30px_-18px_rgba(26,32,53,0.45)]"
          >
            <Headphones size={28} strokeWidth={2.2} className="text-accent-500" />
          </motion.div>

          <motion.h1
            {...fade(0.05)}
            className="mb-4 font-display font-extrabold text-navy-700"
            style={{ fontSize: "clamp(2rem,5.5vw,3.4rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
          >
            Contact <span className="text-accent-500">Us</span>
          </motion.h1>

          <motion.p {...fade(0.1)} className="mx-auto mb-6 max-w-xl text-base text-navy-500 md:text-lg">
            Questions about listing your business, your account, or something you found on {BRAND_NAME}?
            Write to us and a real person will reply.
          </motion.p>

          <motion.div {...fade(0.15)} className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-navy-600 shadow-sm">
              <Clock size={13} className="text-gold-600" /> We reply within 48 hours
            </span>
            <span className="rounded-full border border-navy-100 bg-white/70 px-3.5 py-1.5 text-xs font-bold text-navy-500">
              For customers and vendors
            </span>
          </motion.div>
        </div>
      </section>

      {/* BODY */}
      <section className="bg-[#FFFBF3] pb-16">
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_370px]">
          {/* FORM CARD */}
          <div className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-[0_24px_50px_-34px_rgba(26,32,53,0.45)] sm:p-10">
            {sentTo ? (
              <div className="py-6 text-center" role="status">
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 size={34} className="text-emerald-600" />
                </span>
                <h2 className="font-display text-2xl font-extrabold text-navy-700" style={{ letterSpacing: "-0.02em" }}>
                  Message sent
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-navy-500">
                  Thank you, {sentTo.name.split(" ")[0]}. We will reply to{" "}
                  <span className="font-bold text-navy-700">{sentTo.email}</span> within 48 hours.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center rounded-full bg-navy-700 px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-navy-600"
                  >
                    Back to home
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSentTo(null)}
                    className="inline-flex items-center rounded-full border-2 border-navy-100 px-6 py-3 text-sm font-extrabold text-navy-600 transition-colors hover:border-navy-700"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2 className="font-display text-xl font-extrabold text-navy-700 md:text-2xl" style={{ letterSpacing: "-0.02em" }}>
                  Send us a message
                </h2>
                <p className="mt-1 text-sm text-navy-400">Fields marked optional can be left empty.</p>

                {/* Honeypot: hidden from people, bots tend to fill it */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={set("website")}
                  />
                </div>

                <div className="mt-6">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-navy-500">What is this about?</p>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => {
                      const active = form.topic === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setForm((f) => ({ ...f, topic: t.key }))}
                          className={[
                            "rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                            active
                              ? "border-navy-700 bg-navy-700 text-white"
                              : "border-navy-100 bg-white text-navy-500 hover:border-navy-700 hover:text-navy-700",
                          ].join(" ")}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field id="contact-name" label="Your name" error={errors.name}>
                    <input
                      id="contact-name"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Your full name"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "contact-name-error" : undefined}
                      className={inputClass(!!errors.name)}
                    />
                  </Field>

                  <Field id="contact-email" label="Email" error={errors.email}>
                    <input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      maxLength={150}
                      value={form.email}
                      onChange={set("email")}
                      placeholder="you@example.com"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "contact-email-error" : undefined}
                      className={inputClass(!!errors.email)}
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field id="contact-phone" label="Mobile number" optional error={errors.phone}>
                    <input
                      id="contact-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={20}
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="10-digit mobile number"
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                      className={inputClass(!!errors.phone)}
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field id="contact-message" label="Your message" error={errors.message}>
                    <textarea
                      id="contact-message"
                      rows={6}
                      maxLength={MAX_MESSAGE}
                      value={form.message}
                      onChange={set("message")}
                      placeholder="Tell us how we can help"
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? "contact-message-error" : undefined}
                      className={`${inputClass(!!errors.message)} resize-y`}
                    />
                    <p className="mt-1.5 text-right text-[11px] font-bold text-navy-300">
                      {form.message.length}/{MAX_MESSAGE}
                    </p>
                  </Field>
                </div>

                {serverError && (
                  <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-accent-100 bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{serverError}</span>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_4px_0_0_#9e0f1b] transition hover:bg-accent-600 active:translate-y-[2px] active:shadow-[0_2px_0_0_#9e0f1b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        Send message <Send size={15} />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-navy-400">
                    By sending, you agree to our{" "}
                    <Link to="/privacy" className="font-bold text-navy-600 underline-offset-2 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* SIDE CARDS */}
          <aside className="space-y-4 lg:sticky lg:top-[92px]">
            <div className="rounded-[1.75rem] bg-navy-700 p-6 text-white">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-500">Reach us directly</p>
              <ul className="mt-4 space-y-3">
                {LEGAL.email && (
                  <li>
                    <a
                      href={`mailto:${LEGAL.email}`}
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <Mail size={18} className="text-gold-500" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-white/60">Email</span>
                        <span className="block truncate text-sm font-extrabold">{LEGAL.email}</span>
                      </span>
                    </a>
                  </li>
                )}
                {LEGAL.phone && telHref && (
                  <li>
                    <a
                      href={telHref}
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <Phone size={18} className="text-gold-500" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-white/60">Phone</span>
                        <span className="block text-sm font-extrabold">{LEGAL.phone}</span>
                      </span>
                    </a>
                  </li>
                )}
                {waHref && (
                  <li>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <MessageCircle size={18} className="text-gold-500" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-white/60">WhatsApp</span>
                        <span className="block text-sm font-extrabold">Chat with us</span>
                      </span>
                    </a>
                  </li>
                )}
                {LEGAL.address && (
                  <li className="flex items-start gap-3 rounded-2xl bg-white/5 p-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <MapPin size={18} className="text-gold-500" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-white/60">Registered office</span>
                      <span className="block text-sm font-semibold leading-snug">{LEGAL.address}</span>
                    </span>
                  </li>
                )}
              </ul>
              <p className="mt-4 text-xs text-white/60">{LEGAL.company}</p>
            </div>

            <Link
              to="/register-free"
              className="group block rounded-[1.75rem] border-2 border-navy-100 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-navy-700"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF6E8]">
                <Store size={18} className="text-accent-500" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-600">Own a local business?</p>
              <p className="mt-1.5 font-display text-lg font-extrabold text-navy-700">List it on {BRAND_NAME} free</p>
              <p className="mt-1 text-sm text-navy-400">Get found by customers near you. No commission.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-accent-600">
                Start free <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}