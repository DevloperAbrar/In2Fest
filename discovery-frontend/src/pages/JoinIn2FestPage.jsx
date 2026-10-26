import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import {
  Globe, CalendarCheck, MessageCircle, Star, BarChart3, ShieldCheck,
  CheckCircle2, ArrowRight, Sparkles, LogIn, Send, UserPlus, Search, Smartphone
} from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const FEATURES = [
  { icon: Globe, title: "Your own branded website", desc: "A mobile-ready website on your own in2fest.com address with your name, services, gallery and contact details." },
  { icon: CalendarCheck, title: "Bookings and availability", desc: "Show real open dates, take bookings and manage slots, packages and clients from one dashboard." },
  { icon: MessageCircle, title: "Direct leads, zero commission", desc: "Inquiries reach you on WhatsApp and in your dashboard. We never take a cut of your bookings." },
  { icon: Star, title: "Reviews that build trust", desc: "Collect genuine customer reviews and show them on your website and marketplace profile." },
  { icon: BarChart3, title: "Billing and insights", desc: "Create quotations and invoices with GST, and see how many people view your profile and send inquiries." },
  { icon: ShieldCheck, title: "Discovered by customers", desc: "Get listed in your city and category on the In2Fest marketplace, with a verified badge once approved." }
];

const STEPS = [
  { icon: UserPlus, title: "Apply for a free listing", desc: "Fill the short form below. It takes about two minutes." },
  { icon: ShieldCheck, title: "We review and approve", desc: "Our team checks your details and confirms on WhatsApp." },
  { icon: Search, title: "Get discovered", desc: "Customers in your city find you when they search your category." },
  { icon: Sparkles, title: "Upgrade when you are ready", desc: "Log in to the vendor app to choose a plan and unlock your website and tools." }
];

const COMPARE = [
  { label: "Listing on the In2Fest marketplace", free: true, paid: true },
  { label: "Customers can contact you", free: true, paid: true },
  { label: "Your own branded website", free: false, paid: true },
  { label: "Bookings, slots and packages", free: false, paid: true },
  { label: "Clients, quotations and invoices", free: false, paid: true },
  { label: "Reviews, WhatsApp inquiries and analytics", free: false, paid: true }
];

const inputCls = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500";

export default function JoinIn2FestPage() {
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    business_name: "", owner_name: "", phone: "", whatsapp_number: "",
    city_id: "", locality: "", category_id: "", starting_price: "", about: "", photos: []
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/meta/cities`).then(({ data }) => setCities(data.data || [])).catch(() => {});
    axios.get(`${API_BASE_URL}/meta/categories`).then(({ data }) => setCategories(data.data || [])).catch(() => {});
  }, []);

  const wordCount = form.about.trim().split(/\s+/).filter(Boolean).length;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const scrollToForm = () => {
    document.getElementById("free-listing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.business_name || !form.owner_name || !form.phone || !form.city_id || !form.category_id) {
      setError("Please fill all required fields");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10 digit phone number");
      return;
    }
    if (wordCount < 50) {
      setError("About section must be at least 50 words");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/listing/register`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`Join ${BRAND_NAME} - List Your Business Free or Get Your Website`}</title>
        <meta
          name="description"
          content="List your business on In2Fest for free, or log in to the vendor app to buy a plan and get your own website, bookings, billing and more."
        />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/join`} />
      </Helmet>

      {/* Hero */}
      <section className="bg-navy-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 rounded-full px-3 py-1 mb-5">
            <Sparkles size={14} className="text-gold-400" /> Powered by {BRAND_NAME}
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
            Grow your business with {BRAND_NAME}
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/75 max-w-2xl mx-auto">
            Get listed for free, or log in to the vendor app and buy a plan to launch your own website,
            take bookings and manage your customers in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={scrollToForm}
              className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
            >
              List for free <ArrowRight size={16} />
            </button>
            <a
              href={`${APP_URL}/login`}
              className="inline-flex items-center justify-center gap-2 bg-white text-navy-700 hover:bg-gray-100 font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
            >
              <LogIn size={16} /> Login / Buy a plan
            </a>
          </div>
          <p className="mt-4 text-xs text-white/50">
            Vendor app: {APP_URL.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-700 text-center">Everything your business needs</h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-10">One platform for your website, bookings, leads and customers.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center mb-3">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-navy-700">{title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-700 text-center mb-10">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-navy-700 text-white flex items-center justify-center mb-3">
                  <Icon size={20} />
                </div>
                <p className="text-xs font-semibold text-accent-600 mb-1">Step {i + 1}</p>
                <h3 className="font-semibold text-navy-700">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs paid */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-700 text-center mb-8">Free listing or full plan</h2>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_140px_140px] bg-gray-50 text-xs font-semibold text-gray-500 px-4 py-3">
            <span>What you get</span>
            <span className="text-center">Free listing</span>
            <span className="text-center">Paid plan</span>
          </div>
          {COMPARE.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_140px_140px] items-center px-4 py-3 border-t border-gray-50 text-sm">
              <span className="text-gray-700 pr-2">{row.label}</span>
              <span className="flex justify-center">
                {row.free ? <CheckCircle2 size={18} className="text-green-600" /> : <span className="text-gray-300">&mdash;</span>}
              </span>
              <span className="flex justify-center">
                {row.paid ? <CheckCircle2 size={18} className="text-green-600" /> : <span className="text-gray-300">&mdash;</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`${APP_URL}/login`}
            className="inline-flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
          >
            <LogIn size={16} /> Login to buy a plan
          </a>
          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center justify-center gap-2 border border-gray-300 text-navy-700 hover:bg-gray-50 font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
          >
            Start with a free listing
          </button>
        </div>
      </section>

      {/* Free listing form */}
      <section id="free-listing" className="bg-white border-t border-gray-100 scroll-mt-20">
        <div className="max-w-xl mx-auto px-4 py-14">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-700 mb-2">You are registered!</h2>
              <p className="text-sm text-gray-500">
                Your free listing is under review. You will get a WhatsApp confirmation once it is approved.
              </p>
              <a
                href={`${APP_URL}/login`}
                className="mt-6 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
              >
                <Smartphone size={16} /> Want your own website? Login and buy a plan
              </a>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-navy-700 text-center">List your business for free</h2>
              <p className="text-sm text-gray-500 text-center mt-2 mb-8">
                No subscription required. Our team will review your details and contact you.
              </p>

              <div className="space-y-3">
                <input className={inputCls} placeholder="Business name *" value={form.business_name} onChange={set("business_name")} />
                <input className={inputCls} placeholder="Owner name *" value={form.owner_name} onChange={set("owner_name")} />
                <input className={inputCls} type="tel" placeholder="Phone number *" value={form.phone} onChange={set("phone")} />
                <input className={inputCls} type="tel" placeholder="WhatsApp number" value={form.whatsapp_number} onChange={set("whatsapp_number")} />

                <select className={inputCls} value={form.city_id} onChange={set("city_id")}>
                  <option value="">Select city *</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <input className={inputCls} placeholder="Locality / area" value={form.locality} onChange={set("locality")} />

                <select className={inputCls} value={form.category_id} onChange={set("category_id")}>
                  <option value="">Select primary category *</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <input className={inputCls} type="number" min="0" placeholder="Starting price (optional)" value={form.starting_price} onChange={set("starting_price")} />

                <div>
                  <textarea
                    rows={5}
                    className={inputCls}
                    placeholder="About your business (minimum 50 words) *"
                    value={form.about}
                    onChange={set("about")}
                  />
                  <p className={`text-xs mt-1 ${wordCount >= 50 ? "text-green-600" : "text-gray-400"}`}>{wordCount} / 50 words</p>
                </div>

                <p className="text-xs text-gray-400">You can add photos after your listing is approved.</p>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send size={16} /> {loading ? "Submitting..." : "Submit for review"}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-3">Already a vendor, or want to buy a plan right away?</p>
                <a
                  href={`${APP_URL}/login`}
                  className="inline-flex items-center justify-center gap-2 border border-navy-700 text-navy-700 hover:bg-navy-700 hover:text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
                >
                  <LogIn size={16} /> Login to the vendor app
                </a>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}