import React, { useEffect, useState } from "react";
import { Phone, MapPin, ExternalLink, Send, Star, X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useInquiryConfig } from "../../inquiry-form/inquiryConfig";
import InquiryFields from "../../inquiry-form/InquiryFields";
import { inquiryService } from "../../../../services/inquiryService";
import { showSuccess, showError } from "../../../../components/common/Toast";
import { useInquiryDatePrefill } from "../../../../hooks/useInquiryDatePrefill";
import { getMapEmbedUrl, getMapOpenUrl } from "../../../../lib/mapEmbed";
import { useVenueReviews } from "../../../../hooks/useVenueReviews";
import { onAccent } from "../../../../lib/verticals";
import ServiceIcon from "../../../../components/common/ServiceIcon.jsx";
import { Reveal, AnimatedValue } from "../forge/shared.jsx";

/* ───────── shared bits used by the Pulse / Ember / Sunrise / Monolith / Vertex templates ───────── */

export function TplStyles({ fonts }) {
  return (
    <style>{`
      @import url('${fonts}');
      @keyframes tplRise { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
      @keyframes tplFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
      @keyframes tplBlob { 0%,100% { border-radius: 42% 58% 56% 44% / 48% 42% 58% 52%; } 50% { border-radius: 58% 42% 44% 56% / 42% 56% 44% 58%; } }
      @keyframes tplGlow { 0%,100% { opacity: .3; } 50% { opacity: .55; } }
      .tpl-in::placeholder { opacity: .6; }
      @media (prefers-reduced-motion: reduce) { .tpl-anim { animation: none !important; opacity: 1 !important; transform: none !important; } }
    `}</style>
  );
}

export const rise = (d = 0) => ({ animation: `tplRise 0.9s cubic-bezier(.16,1,.3,1) ${d}s both` });

export function splitTitle(venue) {
  const words = (venue.hero_heading || venue.hall_name || "").trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : "";
  return { first: words.join(" "), last };
}

const cardStyle = (ui) => ({
  background: ui.card,
  border: `1px solid ${ui.border}`,
  borderRadius: ui.radius,
  ...(ui.glass ? { backdropFilter: "blur(14px)" } : {}),
  ...(ui.shadow ? { boxShadow: ui.shadow } : {})
});

const headStyle = (ui, size = "clamp(2.2rem,5vw,4rem)") => ({
  fontFamily: ui.head,
  fontWeight: ui.hw,
  textTransform: ui.upper ? "uppercase" : "none",
  fontSize: size,
  lineHeight: 1.04,
  letterSpacing: ui.upper ? "0.005em" : "-0.02em"
});

function Sec({ id, ui, i = 0, children }) {
  return (
    <section id={id} className="relative overflow-hidden py-24 md:py-32" style={{ background: ui.bgs[i % 2], color: ui.text, fontFamily: ui.body }}>
      <TplStyles fonts={ui.fonts} />
      <div className="max-w-7xl mx-auto px-6 relative">{children}</div>
    </section>
  );
}

function Head({ eyebrow, a, b, ui, accent, center, mb = "mb-14 md:mb-16" }) {
  const c = center ?? ui.align === "center";
  return (
    <Reveal className={`${mb} ${c ? "text-center" : ""}`}>
      <p className="text-xs font-bold uppercase mb-4" style={{ color: accent, letterSpacing: "0.3em" }}>{eyebrow}</p>
      <h2 style={headStyle(ui)}>
        {a} <span style={{ color: accent, fontStyle: ui.italic ? "italic" : "normal" }}>{b}</span>
      </h2>
    </Reveal>
  );
}

function Photo({ venue, ui, accent, className = "" }) {
  return venue.hero_image_url ? (
    <img src={venue.hero_image_url} alt={venue.hall_name} loading="lazy" className={`object-cover ${className}`} style={{ borderRadius: ui.radius }} />
  ) : (
    <div className={`flex items-center justify-center text-8xl font-black ${className}`} style={{ borderRadius: ui.radius, background: `${accent}22`, color: accent, fontFamily: ui.head }}>
      {venue.hall_name?.[0]}
    </div>
  );
}

function Stats({ items, ui, accent, cols = "grid-cols-2" }) {
  if (!items.length) return null;
  return (
    <div className={`grid ${cols} gap-4`}>
      {items.map((h, i) => (
        <div key={i} className="p-5" style={cardStyle(ui)}>
          <p className="text-3xl font-black leading-none" style={{ color: accent, fontFamily: ui.head }}>
            <AnimatedValue value={h.value || h.title} />
          </p>
          {h.value && <p className="text-xs uppercase tracking-wider mt-2" style={{ color: ui.muted }}>{h.title}</p>}
        </div>
      ))}
    </div>
  );
}

function Stars({ n = 5, accent }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={15} style={i < n ? { color: accent, fill: accent } : { color: "#9994", fill: "#9994" }} />
      ))}
    </div>
  );
}

/* ───────── About: split | card | stack ───────── */
export function ThemedAbout({ venue, ui, variant = "split", i = 1 }) {
  if (!venue.about_text) return null;
  const accent = venue.theme_color;
  const hl = venue.about_highlights || [];
  const text = <p className="leading-[1.9] whitespace-pre-line" style={{ color: ui.muted }}>{venue.about_text}</p>;

  if (variant === "stack") {
    return (
      <Sec id="about" ui={ui} i={i}>
        <Reveal className="text-center max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase mb-6" style={{ color: accent, letterSpacing: "0.3em" }}>Our Story</p>
          <p className="whitespace-pre-line" style={{ fontFamily: ui.head, fontWeight: 500, fontSize: "clamp(1.1rem,1.9vw,1.6rem)", lineHeight: 1.6 }}>{venue.about_text}</p>
        </Reveal>
        <Reveal delay={150} className="mt-14"><Stats items={hl} ui={ui} accent={accent} cols="grid-cols-2 md:grid-cols-4" /></Reveal>
        {venue.hero_image_url && <Reveal delay={200} className="mt-14"><Photo venue={venue} ui={ui} accent={accent} className="w-full h-72 md:h-[420px]" /></Reveal>}
      </Sec>
    );
  }

  if (variant === "card") {
    return (
      <Sec id="about" ui={ui} i={i}>
        <Reveal><Photo venue={venue} ui={ui} accent={accent} className="w-full h-[360px] md:h-[500px]" /></Reveal>
        <Reveal delay={120} className="relative -mt-20 md:-mt-32 md:ml-auto md:mr-8 max-w-2xl">
          <div className="p-8 md:p-10" style={{ ...cardStyle(ui), background: ui.bgs[(i + 1) % 2], borderTop: `4px solid ${accent}` }}>
            <Head eyebrow="Our Story" a="About" b={venue.hall_name} ui={ui} accent={accent} center={false} mb="mb-6" />
            {text}
            {hl.length > 0 && <div className="mt-8"><Stats items={hl} ui={ui} accent={accent} /></div>}
          </div>
        </Reveal>
      </Sec>
    );
  }

  return (
    <Sec id="about" ui={ui} i={i}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24 items-center">
        <Reveal from="left">
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full pointer-events-none" style={{ border: `2px solid ${accent}`, borderRadius: ui.radius }} />
            <Photo venue={venue} ui={ui} accent={accent} className="relative w-full h-[440px] md:h-[520px]" />
          </div>
        </Reveal>
        <div>
          <Head eyebrow="Our Story" a="About" b={venue.hall_name} ui={ui} accent={accent} center={false} mb="mb-6" />
          <Reveal delay={120}>{text}</Reveal>
          {hl.length > 0 && <Reveal delay={220} className="mt-8"><Stats items={hl} ui={ui} accent={accent} /></Reveal>}
        </div>
      </div>
    </Sec>
  );
}

/* ───────── Services: cards | rows | bento | blocks ───────── */
function RowItem({ s, idx, ui, accent }) {
  const [h, setH] = useState(false);
  return (
    <Reveal delay={idx * 60}>
      <div
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        className="grid grid-cols-12 items-center gap-4 py-8 px-4 border-b transition-colors duration-300"
        style={{ borderColor: ui.border, background: h ? accent : "transparent", color: h ? onAccent(accent) : ui.text }}
      >
        <span className="col-span-2 md:col-span-1 text-sm font-bold tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
        <h3 className="col-span-10 md:col-span-5" style={{ fontFamily: ui.head, fontWeight: ui.hw, fontSize: "clamp(1.5rem,3vw,2.6rem)", lineHeight: 1.1 }}>{s.name}</h3>
        <p className="col-span-10 col-start-3 md:col-start-auto md:col-span-5 text-sm" style={{ opacity: 0.7 }}>{s.description}</p>
        <ArrowUpRight className="hidden md:block col-span-1 justify-self-end transition-transform duration-300" style={{ transform: h ? "translate(4px,-4px)" : "none" }} />
      </div>
    </Reveal>
  );
}

export function ThemedServices({ venue, ui, variant = "cards", i = 0 }) {
  const services = (venue.services || []).filter((s) => s.visible !== false);
  if (!services.length) return null;
  const accent = venue.theme_color;
  const ink = onAccent(accent);

  return (
    <Sec id="services" ui={ui} i={i}>
      <Head eyebrow="What We Offer" a="Our" b="Services" ui={ui} accent={accent} />

      {variant === "rows" && (
        <div className="border-t" style={{ borderColor: ui.border }}>
          {services.map((s, idx) => <RowItem key={s.id || idx} s={s} idx={idx} ui={ui} accent={accent} />)}
        </div>
      )}

      {variant === "blocks" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, idx) => {
            const on = idx % 2 === 0;
            return (
              <Reveal key={s.id || idx} delay={(idx % 3) * 80}>
                <div className="h-full p-9 md:p-10 transition-transform duration-500 hover:scale-[1.03] hover:z-10 relative" style={{ background: on ? accent : ui.card, color: on ? ink : ui.text, border: `1px solid ${ui.border}` }}>
                  <p className="font-black leading-none mb-6" style={{ fontFamily: ui.head, fontSize: "3.6rem", opacity: 0.3 }}>{String(idx + 1).padStart(2, "0")}</p>
                  {s.icon && <div className="mb-3"><ServiceIcon name={s.icon} size={30} /></div>}
                  <h3 style={headStyle(ui, "1.7rem")}>{s.name}</h3>
                  {s.description && <p className="text-sm mt-3 leading-relaxed" style={{ opacity: 0.75 }}>{s.description}</p>}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      {variant === "bento" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {services.map((s, idx) => {
            const big = idx === 0;
            return (
              <Reveal key={s.id || idx} delay={(idx % 4) * 70} className={`${big ? "md:col-span-2 md:row-span-2" : idx === 3 ? "md:col-span-2" : ""}`}>
                <div className="h-full p-7 md:p-8 transition-all duration-500 hover:-translate-y-1" style={big ? { borderRadius: ui.radius, background: `linear-gradient(135deg, ${accent}, ${accent}88)`, color: ink, minHeight: 220 } : cardStyle(ui)}>
                  {s.icon && <div className="mb-4" style={{ color: big ? ink : accent }}><ServiceIcon name={s.icon} size={big ? 36 : 26} /></div>}
                  <h3 style={headStyle(ui, big ? "2rem" : "1.25rem")}>{s.name}</h3>
                  {s.description && <p className="text-sm mt-3 leading-relaxed" style={{ opacity: big ? 0.8 : 1, color: big ? ink : ui.muted }}>{s.description}</p>}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      {variant === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, idx) => (
            <Reveal key={s.id || idx} delay={(idx % 3) * 90}>
              <div className="h-full p-8 transition-all duration-500 hover:-translate-y-2" style={cardStyle(ui)}>
                <div className="w-14 h-14 flex items-center justify-center mb-6 font-bold" style={{ background: `${accent}22`, color: accent, borderRadius: ui.btn === "999px" ? "999px" : ui.radius }}>
                  {s.icon ? <ServiceIcon name={s.icon} size={26} /> : idx + 1}
                </div>
                <h3 style={headStyle(ui, "1.35rem")}>{s.name}</h3>
                {s.description && <p className="text-sm mt-3 leading-relaxed" style={{ color: ui.muted }}>{s.description}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </Sec>
  );
}

/* ───────── Gallery: masonry | grid | strip ───────── */
function Lightbox({ gallery, index, setIndex }) {
  if (index === null) return null;
  const move = (d) => setIndex((index + d + gallery.length) % gallery.length);
  const btn = "absolute w-11 h-11 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.95)" }} onClick={() => setIndex(null)}>
      <button onClick={() => setIndex(null)} className={`${btn} top-6 right-6`}><X size={18} /></button>
      {gallery.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); move(-1); }} className={`${btn} left-6`}><ChevronLeft size={18} /></button>
          <button onClick={(e) => { e.stopPropagation(); move(1); }} className={`${btn} right-6`}><ChevronRight size={18} /></button>
        </>
      )}
      <img src={gallery[index]?.url} alt="" className="max-h-[85vh] max-w-[85vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <div className="absolute bottom-6 text-white/40 text-xs tracking-widest tabular-nums">{index + 1} / {gallery.length}</div>
    </div>
  );
}

export function ThemedGallery({ venue, ui, variant = "masonry", i = 1 }) {
  const gallery = venue.gallery || [];
  const [lb, setLb] = useState(null);
  if (!gallery.length) return null;
  const accent = venue.theme_color;
  const zoom = "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110";

  return (
    <Sec id="gallery" ui={ui} i={i}>
      <Head eyebrow="Inside Look" a="Our" b="Gallery" ui={ui} accent={accent} />

      {variant === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:auto-rows-[220px]">
          {gallery.map((img, idx) => (
            <Reveal key={img.id || idx} delay={(idx % 4) * 60} className={idx === 0 ? "col-span-2 row-span-2" : ""}>
              <div onClick={() => setLb(idx)} className="group overflow-hidden cursor-pointer aspect-square md:aspect-auto md:h-full" style={{ borderRadius: ui.radius }}>
                <img src={img.url} alt="" loading="lazy" className={zoom} />
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {variant === "strip" && (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4" style={{ scrollbarWidth: "thin" }}>
          {gallery.map((img, idx) => (
            <div key={img.id || idx} onClick={() => setLb(idx)} className="group shrink-0 snap-center overflow-hidden cursor-pointer w-[78vw] md:w-[420px] h-[360px] md:h-[480px]" style={{ borderRadius: ui.radius }}>
              <img src={img.url} alt="" loading="lazy" className={zoom} />
            </div>
          ))}
        </div>
      )}

      {variant === "masonry" && (
        <div className="columns-2 md:columns-3 gap-3">
          {gallery.map((img, idx) => (
            <Reveal key={img.id || idx} delay={(idx % 3) * 70} className="mb-3 break-inside-avoid">
              <div onClick={() => setLb(idx)} className="group overflow-hidden cursor-pointer" style={{ borderRadius: ui.radius }}>
                <img src={img.url} alt="" loading="lazy" className="w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <Lightbox gallery={gallery} index={lb} setIndex={setLb} />
    </Sec>
  );
}

/* ───────── Testimonials: cards | quote ───────── */
export function ThemedTestimonials({ venue, ui, variant = "cards", i = 0 }) {
  // Same approved reviews that show on the vendor's Marketplace profile
  const { reviews, averageRating, reviewCount } = useVenueReviews(venue.id);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (variant !== "quote" || reviews.length < 2) return undefined;
    const t = setInterval(() => setN((x) => (x + 1) % reviews.length), 6500);
    return () => clearInterval(t);
  }, [variant, reviews.length]);

  if (!reviews.length) return null;
  const accent = venue.theme_color;
  const current = reviews[n % reviews.length];

  return (
    <Sec id="testimonials" ui={ui} i={i}>
      <Head eyebrow="Reviews" a="What They" b="Say" ui={ui} accent={accent} />
      {averageRating && (
        <p className="-mt-8 mb-12 flex items-center gap-2 text-sm" style={{ color: ui.muted, justifyContent: ui.align === "center" ? "center" : "flex-start" }}>
          <Star size={15} style={{ color: accent, fill: accent }} />
          <b style={{ color: ui.text }}>{Number(averageRating).toFixed(1)}</b>
          <span>out of 5 · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
        </p>
      )}

      {variant === "quote" ? (
        <Reveal className="max-w-4xl">
          <p className="text-7xl leading-none" style={{ color: accent, fontFamily: ui.head }}>“</p>
          <p key={n} className="tpl-anim" style={{ ...rise(0), fontFamily: ui.head, fontWeight: ui.hw, fontStyle: ui.italic ? "italic" : "normal", fontSize: "clamp(1.4rem,3vw,2.4rem)", lineHeight: 1.35 }}>
            {current.description}
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4 mt-8">
            <div>
              <Stars n={current.rating || 5} accent={accent} />
              <p className="font-bold mt-2">{current.name}</p>
              {current.location && <p className="text-xs" style={{ color: ui.muted }}>{current.location}</p>}
            </div>
            <div className="flex items-center gap-2">
              {reviews.map((_, k) => (
                <button key={k} aria-label={`Review ${k + 1}`} onClick={() => setN(k)} className="h-2 rounded-full transition-all duration-300" style={{ width: k === n % reviews.length ? 28 : 8, background: k === n % reviews.length ? accent : ui.border }} />
              ))}
            </div>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((t, idx) => (
            <Reveal key={t.id || idx} delay={(idx % 3) * 100}>
              <div className="h-full flex flex-col p-8 transition-all duration-500 hover:-translate-y-2" style={cardStyle(ui)}>
                <Stars n={t.rating || 5} accent={accent} />
                <p className="text-sm leading-relaxed flex-1 mt-5" style={{ color: ui.muted }}>{t.description}</p>
                {t.reply && (
                  <div className="mt-5 p-3 text-xs leading-relaxed border-l-2" style={{ borderColor: accent, color: ui.muted }}>
                    <p className="font-semibold mb-0.5" style={{ color: ui.text }}>Owner&apos;s reply</p>
                    {t.reply}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-6 pt-5 border-t" style={{ borderColor: ui.border }}>
                  <div className="w-11 h-11 flex items-center justify-center font-black flex-shrink-0" style={{ background: accent, color: onAccent(accent), borderRadius: ui.btn === "999px" ? "999px" : ui.radius, fontFamily: ui.head }}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    {t.location && <p className="text-xs" style={{ color: ui.muted }}>{t.location}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </Sec>
  );
}

/* ───────── Contact (enquiry form logic is the same as every other template) ───────── */
export function ThemedContact({ venue, ui, slots, i = 1 }) {
  const accent = venue.theme_color;
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

  const line = ui.input === "underline";
  const inputClass = "tpl-in w-full px-4 py-3.5 text-sm outline-none transition-all duration-200";
  const inputStyle = line
    ? { background: "transparent", border: "none", borderBottom: `1px solid ${ui.text}66`, borderRadius: 0, color: ui.text, paddingLeft: 0 }
    : { background: ui.dark ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${ui.border}`, borderRadius: ui.btn === "999px" ? "14px" : ui.btn, color: ui.text };

  const info = (Icon, label, children) => (
    <div className="flex items-start gap-4 p-5" style={cardStyle(ui)}>
      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: accent, color: onAccent(accent), borderRadius: ui.btn === "999px" ? "999px" : ui.radius }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: ui.muted }}>{label}</p>
        {children}
      </div>
    </div>
  );

  return (
    <Sec id="contact" ui={ui} i={i}>
      <Head eyebrow="Reach Us" a="Get In" b="Touch" ui={ui} accent={accent} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <Reveal from="left" className="space-y-4">
          {venue.phone && info(Phone, "Phone", <a href={`tel:${venue.phone}`} className="font-bold text-lg">{venue.phone}</a>)}
          {venue.address && info(MapPin, "Address", (
            <>
              <p className="font-bold">{venue.address}</p>
              {venue.city && <p className="text-xs" style={{ color: ui.muted }}>{venue.city}</p>}
            </>
          ))}
          {mapEmbedUrl && (
            <div className="overflow-hidden" style={cardStyle(ui)}>
              <iframe src={mapEmbedUrl} title="Location" className="w-full h-80 border-0 block" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              {mapOpenUrl && (
                <a href={mapOpenUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-3 text-sm font-bold hover:underline" style={{ color: accent }}>
                  Open in Google Maps <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}
        </Reveal>

        <Reveal from="right" id="inquiry">
          <div className="p-8 md:p-10" style={{ ...cardStyle(ui), borderTop: `4px solid ${accent}` }}>
            <h3 className="mb-6" style={headStyle(ui, "1.9rem")}>Send an Enquiry</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input className={inputClass} style={inputStyle} placeholder="Your Name *" {...register("customer_name")} />
                  {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
                </div>
                <div>
                  <input className={inputClass} style={inputStyle} placeholder="Phone Number *" {...register("phone")} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
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
                selectStyle={{ colorScheme: ui.dark ? "dark" : "light" }}
                errorClass="text-red-500 text-xs mt-1"
              />
              <textarea className={inputClass} style={{ ...inputStyle, resize: "none" }} rows={3} placeholder="Message (optional)" {...register("message")} />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: accent, color: onAccent(accent), borderRadius: ui.btn, boxShadow: `0 12px 34px ${accent}44` }}
              >
                <Send size={16} />
                {isSubmitting ? "Submitting..." : "Submit Inquiry"}
              </button>
            </form>
          </div>
        </Reveal>
      </div>
    </Sec>
  );
}

/* Builds the six section components a template needs from its own hero + design settings. */
export function makeTemplate({ Hero, ui, about, services, gallery, testimonials }) {
  const fix = (v) => (v.theme_color ? v : { ...v, theme_color: ui.accent });
  return {
    HeroSection: ({ venue }) => <Hero venue={fix(venue)} ui={ui} />,
    AboutSection: ({ venue }) => <ThemedAbout venue={fix(venue)} ui={ui} variant={about} i={1} />,
    ServicesSection: ({ venue }) => <ThemedServices venue={fix(venue)} ui={ui} variant={services} i={0} />,
    GallerySection: ({ venue }) => <ThemedGallery venue={fix(venue)} ui={ui} variant={gallery} i={1} />,
    TestimonialsSection: ({ venue }) => <ThemedTestimonials venue={fix(venue)} ui={ui} variant={testimonials} i={0} />,
    ContactSection: ({ venue, slots }) => <ThemedContact venue={fix(venue)} ui={ui} slots={slots} i={1} />
  };
}