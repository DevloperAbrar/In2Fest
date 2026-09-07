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
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)" }}
    >
      {children}
    </div>
  );
}

export default function ContactSection({ venue, slots }) {
  const theme = venue.theme_color || "#2563eb";
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

  const inputClass = "w-full px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 border-b border-white/[0.1] focus:border-white/50 bg-transparent";

  return (
    <section
      id="contact"
      className="relative py-32 bg-white overflow-hidden"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-8 md:px-16">
        <Reveal className="mb-20">
          <div className="text-[100px] font-black leading-none select-none mb-2" style={{ color: "#f5f5f5", letterSpacing: "-0.04em" }}>06</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8" style={{ backgroundColor: theme }} />
            <span className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>Contact</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900" style={{ letterSpacing: "-0.03em" }}>Get In Touch</h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <Reveal delay={100} className="space-y-8">
            {venue.phone && (
              <div className="flex items-center gap-5 py-6 border-b border-gray-100">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme, borderRadius: "2px" }}>
                  <Phone size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                  <a href={`tel:${venue.phone}`} className="font-bold text-gray-900 hover:text-gray-600 transition-colors">{venue.phone}</a>
                </div>
              </div>
            )}
            {venue.address && (
              <div className="flex items-start gap-5 py-6 border-b border-gray-100">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme, borderRadius: "2px" }}>
                  <MapPin size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Address</p>
                  <p className="font-bold text-gray-900">{venue.address}</p>
                  {venue.city && <p className="text-xs text-gray-400 mt-0.5">{venue.city}</p>}
                </div>
              </div>
            )}
            {mapsLink && (
              <div className="overflow-hidden h-52" style={{ borderRadius: "2px" }}>
                {isEmbeddable ? (
                  <iframe src={mapsLink} title="Venue location" className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                ) : (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <MapPin size={28} style={{ color: theme }} />
                    <span className="font-bold text-gray-900 text-sm">View on Google Maps</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400"><ExternalLink size={12} /> Open map</span>
                  </a>
                )}
              </div>
            )}
          </Reveal>

          <Reveal delay={200} id="inquiry">
            <div className="p-10" style={{ backgroundColor: "#0a0a0a", borderRadius: "4px" }}>
              <h3 className="font-bold text-white text-lg mb-8 tracking-tight">Send an Enquiry</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input className={inputClass} placeholder="Your Name *" {...register("customer_name")} />
                    {errors.customer_name && <p className="text-red-400 text-xs mt-1">{errors.customer_name.message}</p>}
                  </div>
                  <div>
                    <input className={inputClass} placeholder="Phone *" {...register("phone")} />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                </div>
                <input className={inputClass} placeholder="Email (optional)" {...register("email")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input type="date" className={inputClass} style={{ colorScheme: "dark" }} {...register("event_date")} min={new Date().toISOString().split("T")[0]} />
                    {errors.event_date && <p className="text-red-400 text-xs mt-1">{errors.event_date.message}</p>}
                  </div>
                  <select className={inputClass} style={{ colorScheme: "dark" }} {...register("slot_id")}>
                    <option value="" className="bg-gray-900">Select Slot (optional)</option>
                    {(slots || []).map((s) => <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input className={inputClass} placeholder="Event Type *" {...register("event_type")} />
                    {errors.event_type && <p className="text-red-400 text-xs mt-1">{errors.event_type.message}</p>}
                  </div>
                  <div>
                    <input type="number" className={inputClass} placeholder="Guest Count *" {...register("guest_count")} />
                    {errors.guest_count && <p className="text-red-400 text-xs mt-1">{errors.guest_count.message}</p>}
                  </div>
                </div>
                <textarea className={inputClass} rows={3} style={{ resize: "none" }} placeholder="Message (optional)" {...register("message")} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 font-bold text-white text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-85 disabled:opacity-50"
                  style={{ backgroundColor: theme, borderRadius: "2px", letterSpacing: "0.15em" }}
                >
                  <Send size={14} />
                  {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');`}</style>
    </section>
  );
}