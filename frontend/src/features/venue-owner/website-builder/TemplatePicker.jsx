import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { CheckCircle2, ArrowLeft, Eye } from "lucide-react";

import auroraPreview from "../../../assets/templates/aurora.png";
import bloomPreview from "../../../assets/templates/bloom.png";
import slatePreview from "../../../assets/templates/slate.png";
import classicPreview from "../../../assets/templates/classic.png";

const TEMPLATES = [
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Dark Luxury",
    description: "Cinematic full-bleed hero, deep navy/black palette, Playfair Display typeface. Ideal for premium banquet halls and upscale venues.",
    defaultColor: "#a855f7",
    font: "'Playfair Display', serif",
    tags: ["Luxury", "Dark", "Elegant"],
    image: auroraPreview,
  },
  {
    id: "bloom",
    name: "Bloom",
    tagline: "Warm Editorial",
    description: "Split hero layout, warm cream/terracotta palette, DM Serif Display typeface. Perfect for garden venues, wedding halls, and farmhouses.",
    defaultColor: "#c2410c",
    font: "'DM Serif Display', serif",
    tags: ["Warm", "Organic", "Editorial"],
    image: bloomPreview,
  },
  {
    id: "slate",
    name: "Slate",
    tagline: "Bold Minimal",
    description: "Swiss-grid layout, stark black/white contrast, Space Grotesk typeface. Great for modern event spaces, party lawns, and corporate venues.",
    defaultColor: "#2563eb",
    font: "'Space Grotesk', sans-serif",
    tags: ["Modern", "Bold", "Minimal"],
    image: slatePreview,
  },
  {
    id: null,
    name: "Classic",
    tagline: "Original",
    description: "The original In2Fest template — clean white with animated colour accents, smooth wave transitions, and a traditional section layout.",
    defaultColor: "#7c3aed",
    font: "'Inter', sans-serif",
    tags: ["Clean", "Versatile", "Classic"],
    image: classicPreview,
  },
];

function TemplateMockup({ tpl }) {
  return (
    <img
      src={tpl.image}
      alt={`${tpl.name} template preview`}
      className="w-full h-full object-cover object-top"
      loading="lazy"
    />
  );
}

export default function TemplatePicker() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const [saving, setSaving] = useState(null);
  const [hovered, setHovered] = useState(null);

  const activeId = venue?.template_id ?? null;

  const selectTemplate = async (templateId, defaultColor) => {
    setSaving(templateId ?? "classic");
    try {
      await venueService.update(venue.id, {
        template_id: templateId,
        ...(venue.template_id !== templateId ? { theme_color: defaultColor } : {}),
      });
      await refetchVenue();
      showSuccess("Template updated — visit your public site to see the change.");
    } catch (err) {
      showError("Failed to update template");
    } finally {
      setSaving(null);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Choose Template">
      <button
        onClick={() => navigate("/dashboard/website")}
        className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Website Builder
      </button>

      <p className="text-navy-500 text-sm mb-8 max-w-xl">
        Choose a template for your public venue website. Each template has a distinct visual style — you can switch anytime without losing your content.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {TEMPLATES.map((tpl) => {
          const isActive = (tpl.id ?? null) === (activeId ?? null);
          const isSaving = saving === (tpl.id ?? "classic");
          const isHovered = hovered === (tpl.id ?? "classic");

          return (
            <div
              key={tpl.id ?? "classic"}
              onMouseEnter={() => setHovered(tpl.id ?? "classic")}
              onMouseLeave={() => setHovered(null)}
              className="group flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer"
              style={{
                borderColor: isActive ? tpl.defaultColor : isHovered ? `${tpl.defaultColor}55` : "rgba(0,0,0,0.08)",
                boxShadow: isActive ? `0 0 0 4px ${tpl.defaultColor}22` : isHovered ? "0 8px 32px rgba(0,0,0,0.1)" : "none",
              }}
              onClick={() => !isActive && !saving && selectTemplate(tpl.id, tpl.defaultColor)}
            >
              <div className="relative h-56 overflow-hidden bg-gray-100">
                <TemplateMockup tpl={tpl} />

                {isActive && (
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-semibold shadow-lg"
                    style={{ backgroundColor: tpl.defaultColor }}
                  >
                    <CheckCircle2 size={12} /> Active
                  </div>
                )}

                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: "rgba(0,0,0,0.35)" }}>
                    <span className="px-5 py-2.5 rounded-full text-white font-semibold text-sm shadow-xl" style={{ backgroundColor: tpl.defaultColor }}>
                      {isSaving ? "Applying..." : "Use This Template"}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-navy-900 text-sm">{tpl.name}</p>
                    <p className="text-xs font-medium" style={{ color: tpl.defaultColor }}>{tpl.tagline}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 border-2 border-white shadow" style={{ backgroundColor: tpl.defaultColor }} />
                </div>

                <p className="text-xs text-navy-400 leading-relaxed">{tpl.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tpl.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${tpl.defaultColor}15`, color: tpl.defaultColor }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-xs mt-1 opacity-40" style={{ fontFamily: tpl.font }}>
                  Aa — {tpl.font.split(",")[0].replace(/'/g, "")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-navy-50 border border-navy-100 flex items-start gap-3 max-w-xl">
        <Eye size={16} className="text-navy-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-navy-500 leading-relaxed">
          After selecting a template, visit your public site link from the Website Builder page to preview the full result. Your theme colour can be adjusted in Settings → Venue Profile.
        </p>
      </div>
    </DashboardLayout>
  );
}