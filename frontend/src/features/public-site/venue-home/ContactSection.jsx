import React from "react";
import { Phone, MapPin, ExternalLink, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { inquiryFormSchema } from "../../../components/forms/validationSchemas";
import { inquiryService } from "../../../services/inquiryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function ContactSection({ venue, slots }) {
  const theme = venue.theme_color || "#7c3aed";
  const mapsLink = venue.google_maps_link;
  const isEmbeddable = mapsLink && mapsLink.includes("/maps/embed");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(inquiryFormSchema),
  });

  const onSubmit = async (values) => {
    try {
      await inquiryService.submitPublic(venue.id, values);
      showSuccess("Thank you! We'll get back to you shortly.");
      reset();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit inquiry");
    }
  };

  const inputClass = `w-full px-4 py-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800
    text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 text-sm
    focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 focus:bg-white dark:focus:bg-stone-800 transition-all duration-200`;

  return (
    <section id="contact" className="relative py-28 bg-stone-50 dark:bg-stone-900 overflow-hidden">
      {/* BG accent */}
      <div
        className="absolute top-0 right-0 w-1/3 h-full opacity-[0.04] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${theme}, transparent 60%)` }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>Reach Us</span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white" style={{ letterSpacing: "-0.02em" }}>
            Get In Touch
          </h2>
          <p className="text-stone-400 dark:text-stone-500 mt-3 text-sm max-w-md mx-auto">
            Fill in your details and we'll get back to you within 24 hours.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* LEFT  - Contact info + map */}
          <Reveal delay={100} className="space-y-5">
            {venue.phone && (
              <div className="flex items-center gap-4 p-5 bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg" style={{ backgroundColor: theme }}>
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-0.5">Phone</p>
                  <a href={`tel:${venue.phone}`} className="font-bold text-stone-900 dark:text-white hover:underline text-base">
                    {venue.phone}
                  </a>
                </div>
              </div>
            )}

            {venue.address && (
              <div className="flex items-start gap-4 p-5 bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg" style={{ backgroundColor: theme }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-0.5">Address</p>
                  <p className="font-bold text-stone-900 dark:text-white">{venue.address}</p>
                  {venue.city && <p className="text-sm text-stone-400 dark:text-stone-500 mt-0.5">{venue.city}</p>}
                </div>
              </div>
            )}

            {mapsLink && (
              <div className="rounded-2xl overflow-hidden shadow-lg h-56 border border-stone-100 dark:border-stone-700">
                {isEmbeddable ? (
                  <iframe
                    src={mapsLink}
                    title="Venue location"
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  
                <a    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex flex-col items-center justify-center gap-3 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-center px-6"
                  >
                    <MapPin size={32} style={{ color: theme }} />
                    <span className="font-bold text-stone-900 dark:text-white">View on Google Maps</span>
                    <span className="flex items-center gap-1 text-sm text-stone-400 dark:text-stone-500">
                      Open map <ExternalLink size={13} />
                    </span>
                  </a>
                )}
              </div>
            )}
          </Reveal>

          {/* RIGHT  - Enquiry form */}
          <Reveal delay={200} id="inquiry">
            <div className="bg-white dark:bg-stone-800 rounded-3xl p-8 shadow-xl shadow-black/5 dark:shadow-black/30 border border-stone-100 dark:border-stone-700">
              <h3 className="font-extrabold text-xl text-stone-900 dark:text-white mb-6">Send an Enquiry</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input className={inputClass} placeholder="Your Name *" {...register("customer_name")} />
                    {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
                  </div>
                  <div>
                    <input className={inputClass} placeholder="Phone Number *" {...register("phone")} />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <input className={inputClass} placeholder="Email (optional)" {...register("email")} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input type="date" className={inputClass} {...register("event_date")}
                      min={new Date().toISOString().split("T")[0]} />
                    {errors.event_date && <p className="text-red-500 text-xs mt-1">{errors.event_date.message}</p>}
                  </div>
                  <select className={inputClass} {...register("slot_id")}>
                    <option value="">Select Slot (optional)</option>
                    {(slots || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input className={inputClass} placeholder="Event Type *" {...register("event_type")} />
                    {errors.event_type && <p className="text-red-500 text-xs mt-1">{errors.event_type.message}</p>}
                  </div>
                  <div>
                    <input type="number" className={inputClass} placeholder="Guest Count *" {...register("guest_count")} />
                    {errors.guest_count && <p className="text-red-500 text-xs mt-1">{errors.guest_count.message}</p>}
                  </div>
                </div>

                <textarea className={inputClass} rows={3} placeholder="Message (optional)" {...register("message")} />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)`, boxShadow: `0 8px 24px ${theme}44` }}
                >
                  <Send size={18} />
                  {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}