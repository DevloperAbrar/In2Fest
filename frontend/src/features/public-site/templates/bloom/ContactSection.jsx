import React from "react";
import { Phone, MapPin, ExternalLink, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { inquiryFormSchema } from "../../../../components/forms/validationSchemas";
import { inquiryService } from "../../../../services/inquiryService";
import { showSuccess, showError } from "../../../../components/common/Toast";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(36px)" }}
    >
      {children}
    </div>
  );
}

export default function ContactSection({ venue, slots }) {
  const theme = venue.theme_color || "#c2410c";
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(inquiryFormSchema) });
  const mapsLink = venue.google_maps_link;
  const isEmbeddable = mapsLink?.includes("/maps/embed");

  const onSubmit = async (values) => {
    try {
      await inquiryService.submitPublic(venue.id, values);
      showSuccess("Thank you! We'll be in touch soon.");
      reset();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit inquiry");
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 transition-all duration-200";

  return (
    <section
      id="contact"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <span className="inline-block text-xs tracking-[0.35em] uppercase font-semibold py-1.5 px-4 rounded-full mb-4" style={{ color: theme, backgroundColor: `${theme}12` }}>
            Reach Us
          </span>
          <h2 className="font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2.2rem, 4vw, 3.5rem)", letterSpacing: "-0.025em" }}>
            Get In Touch
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <Reveal delay={100} className="space-y-4">
            {venue.phone && (
              <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-stone-100">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme}15`, color: theme }}>
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide mb-0.5">Phone</p>
                  <a href={`tel:${venue.phone}`} className="font-bold text-stone-900 hover:underline">{venue.phone}</a>
                </div>
              </div>
            )}
            {venue.address && (
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-stone-100">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme}15`, color: theme }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide mb-0.5">Address</p>
                  <p className="font-bold text-stone-900">{venue.address}</p>
                  {venue.city && <p className="text-xs text-stone-400 mt-0.5">{venue.city}</p>}
                </div>
              </div>
            )}
            {mapsLink && (
              <div className="rounded-2xl overflow-hidden h-52 border border-stone-100">
                {isEmbeddable ? (
                  <iframe src={mapsLink} title="Venue location" className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                ) : (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-3 bg-white hover:bg-stone-50 transition-colors">
                    <MapPin size={28} style={{ color: theme }} />
                    <span className="font-bold text-stone-800 text-sm">View on Google Maps</span>
                    <span className="flex items-center gap-1 text-xs text-stone-400"><ExternalLink size={12} /> Open map</span>
                  </a>
                )}
              </div>
            )}
          </Reveal>

          <Reveal delay={200} id="inquiry">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100">
              <h3 className="font-bold text-stone-900 text-xl mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>Send an Enquiry</h3>
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
                    <input type="date" className={inputClass} {...register("event_date")} min={new Date().toISOString().split("T")[0]} />
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
                <textarea className={inputClass} rows={3} style={{ resize: "none" }} placeholder="Message (optional)" {...register("message")} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)`, boxShadow: `0 8px 24px ${theme}44` }}
                >
                  <Send size={16} />
                  {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
    </section>
  );
}