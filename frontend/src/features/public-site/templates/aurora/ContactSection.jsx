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
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)" }}
    >
      {children}
    </div>
  );
}

export default function ContactSection({ venue, slots }) {
  const theme = venue.theme_color || "#a855f7";
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

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'Inter', sans-serif" };
  const inputClass = "w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all duration-200";

  return (
    <section
      id="contact"
      className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgb(8,2,20) 0%, rgb(5,0,15) 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse at bottom left, ${theme}15, transparent 60%)` }} />

      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="mb-20">
          <p className="text-xs tracking-[0.4em] uppercase font-medium mb-4" style={{ color: theme }}>Reach Us</p>
          <h2 className="text-5xl md:text-6xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>Get In Touch</h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <Reveal delay={100} className="space-y-4">
            {venue.phone && (
              <div className="flex items-center gap-4 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme}22`, color: theme }}>
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-white/35 uppercase tracking-wide mb-0.5">Phone</p>
                  <a href={`tel:${venue.phone}`} className="font-bold text-white">{venue.phone}</a>
                </div>
              </div>
            )}
            {venue.address && (
              <div className="flex items-start gap-4 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme}22`, color: theme }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-white/35 uppercase tracking-wide mb-0.5">Address</p>
                  <p className="font-bold text-white">{venue.address}</p>
                  {venue.city && <p className="text-xs text-white/40 mt-0.5">{venue.city}</p>}
                </div>
              </div>
            )}
            {mapsLink && (
              <div className="rounded-2xl overflow-hidden h-52 border" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {isEmbeddable ? (
                  <iframe src={mapsLink} title="Venue location" className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                ) : (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-3 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <MapPin size={28} style={{ color: theme }} />
                    <span className="font-semibold text-white text-sm">View on Google Maps</span>
                    <span className="flex items-center gap-1 text-xs text-white/40"><ExternalLink size={12} /> Open map</span>
                  </a>
                )}
              </div>
            )}
          </Reveal>

          <Reveal delay={200} id="inquiry">
            <div className="p-8 rounded-2xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
              <h3 className="font-bold text-white text-xl mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>Send an Enquiry</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input className={inputClass} style={inputStyle} placeholder="Your Name *" {...register("customer_name")} />
                    {errors.customer_name && <p className="text-red-400 text-xs mt-1">{errors.customer_name.message}</p>}
                  </div>
                  <div>
                    <input className={inputClass} style={inputStyle} placeholder="Phone Number *" {...register("phone")} />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                </div>
                <input className={inputClass} style={inputStyle} placeholder="Email (optional)" {...register("email")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input type="date" className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} {...register("event_date")} min={new Date().toISOString().split("T")[0]} />
                    {errors.event_date && <p className="text-red-400 text-xs mt-1">{errors.event_date.message}</p>}
                  </div>
                  <select className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} {...register("slot_id")}>
                    <option value="">Select Slot (optional)</option>
                    {(slots || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input className={inputClass} style={inputStyle} placeholder="Event Type *" {...register("event_type")} />
                    {errors.event_type && <p className="text-red-400 text-xs mt-1">{errors.event_type.message}</p>}
                  </div>
                  <div>
                    <input type="number" className={inputClass} style={inputStyle} placeholder="Guest Count *" {...register("guest_count")} />
                    {errors.guest_count && <p className="text-red-400 text-xs mt-1">{errors.guest_count.message}</p>}
                  </div>
                </div>
                <textarea className={inputClass} style={{ ...inputStyle, resize: "none" }} rows={3} placeholder="Message (optional)" {...register("message")} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)`, boxShadow: `0 8px 32px ${theme}40` }}
                >
                  <Send size={16} />
                  {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500;600&display=swap');`}</style>
    </section>
  );
}