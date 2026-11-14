import React from "react";
import { Phone, MapPin, ExternalLink, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useInquiryConfig } from "../../inquiry-form/inquiryConfig";
import InquiryFields from "../../inquiry-form/InquiryFields";
import { inquiryService } from "../../../../services/inquiryService";
import { showSuccess, showError } from "../../../../components/common/Toast";
import { useInquiryDatePrefill } from "../../../../hooks/useInquiryDatePrefill";
import { getMapEmbedUrl, getMapOpenUrl } from "../../../../lib/mapEmbed";
import { ForgeStyles, Reveal, INK, FONT_HEAD, FONT_BODY } from "./shared.jsx";

export default function ContactSection({ venue, slots }) {
  const theme = venue.theme_color || "#facc15";
  const { cfg, schema, showSlots } = useInquiryConfig(venue, slots);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema) });
  useInquiryDatePrefill(setValue);
  const mapEmbedUrl = getMapEmbedUrl(venue);
  const mapOpenUrl = getMapOpenUrl(venue);

  const onSubmit = async (values) => {
    try {
      await inquiryService.submitPublic(venue.id, values);
      showSuccess("Thank you! We'll be in touch soon.");
      reset();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit inquiry");
    }
  };

  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", fontFamily: FONT_BODY };
  const inputClass = "w-full px-4 py-3.5 text-sm text-white placeholder-white/35 outline-none transition-all duration-200 focus:border-white/60";

  const infoCard = "flex items-start gap-4 p-5 border border-white/10";

  return (
    <section id="contact" className="relative py-28 md:py-36 overflow-hidden" style={{ background: "#0f0f0f", fontFamily: FONT_BODY }}>
      <ForgeStyles />
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="mb-16">
          <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{ color: theme }}>Reach Us</p>
          <h2 className="uppercase text-white font-black leading-[0.9]" style={{ fontFamily: FONT_HEAD, fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>
            Get In <span style={{ color: theme }}>Touch</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <Reveal from="left" className="space-y-4">
            {venue.phone && (
              <div className={infoCard} style={{ background: INK }}>
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: theme, color: INK }}><Phone size={20} /></div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Phone</p>
                  <a href={`tel:${venue.phone}`} className="font-bold text-white text-lg">{venue.phone}</a>
                </div>
              </div>
            )}
            {venue.address && (
              <div className={infoCard} style={{ background: INK }}>
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: theme, color: INK }}><MapPin size={20} /></div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Address</p>
                  <p className="font-bold text-white">{venue.address}</p>
                  {venue.city && <p className="text-xs text-white/45 mt-0.5">{venue.city}</p>}
                </div>
              </div>
            )}
            {mapEmbedUrl && (
              <div className="overflow-hidden border border-white/10" style={{ background: INK }}>
                <iframe src={mapEmbedUrl} title="Location" className="w-full h-80 border-0 block" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                {mapOpenUrl && (
                  <a href={mapOpenUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wider hover:underline" style={{ color: theme }}>
                    Open in Google Maps <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </Reveal>

          <Reveal from="right" id="inquiry">
            <div className="p-8 md:p-10 border border-white/10" style={{ background: INK, borderTop: `4px solid ${theme}` }}>
              <h3 className="uppercase font-black text-3xl text-white mb-6" style={{ fontFamily: FONT_HEAD }}>Send an Enquiry</h3>
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
                <InquiryFields
                  register={register}
                  errors={errors}
                  cfg={cfg}
                  showSlots={showSlots}
                  slots={slots}
                  inputClass={inputClass}
                  inputStyle={inputStyle}
                  selectStyle={{ colorScheme: "dark" }}
                  errorClass="text-red-400 text-xs mt-1"
                />
                <textarea className={inputClass} style={{ ...inputStyle, resize: "none" }} rows={3} placeholder="Message (optional)" {...register("message")} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 font-extrabold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: theme, color: INK, boxShadow: `0 12px 36px ${theme}40` }}
                >
                  <Send size={16} />
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