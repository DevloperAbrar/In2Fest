import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Sparkles, X } from "lucide-react";
import { useVenueStore } from "../../../store/venueStore";
import { SECTION_TYPES } from "../../../lib/sectionLibrary";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";
import { ProgressRing, Surface } from "./dashboardUi.jsx";

function buildSteps(pageSections, { isShop, isFood, hasSlots, hasBilling }) {
  const sections = pageSections || [];
  const isVisible = (type) => sections.some((s) => s.type === type && s.visible !== false);

  // Shops manage products on the dedicated "Products & Catalog" page (needs the billing module).
  const catalogOnShopPage = isShop && hasBilling;

  const steps = [
    { key: "hero_image", label: "Upload hero image", path: "/dashboard/website/hero", feature: "website_builder" }
  ];

  if (catalogOnShopPage && isVisible("product_catalog")) {
    steps.push({
      key: "product_catalog",
      label: "Add your products (photo + price)",
      path: "/dashboard/catalog",
      feature: "billing"
    });
  }

  if (isVisible("about")) {
    steps.push({ key: "about", label: "Write about section", path: "/dashboard/website/about", feature: "website_builder" });
  }
  if (isVisible("services")) {
    steps.push({ key: "services", label: "Add at least one service", path: "/dashboard/website/services", feature: "website_builder" });
  }
  if (isVisible("gallery")) {
    steps.push({ key: "gallery", label: "Add gallery photos", path: "/dashboard/website/gallery", feature: "website_builder" });
  }

  // Slots only make sense for business types that actually take appointments/bookings.
  if (hasSlots) {
    steps.push({ key: "slots", label: "Configure slots", path: "/dashboard/slots", feature: "slots" });
  }

  // One entry per pluggable section the vendor actually has on their site.
  sections.forEach((section) => {
    const def = SECTION_TYPES[section.type];
    if (!def?.removable || section.visible === false) return;
    // Packages are managed on the Slots page, not as a website section step
    if (section.type === "packages") return;
    // Already added above for shops
    if (section.type === "product_catalog" && catalogOnShopPage) return;

    let label = `Fill in your ${def.label}`;
    let path = `/dashboard/website/section/${section.type}`;
    let feature = "website_builder";

    // Restaurants manage their menu and offers inside the Restaurant area.
    if (isFood && section.type === "menu") {
      label = "Add your dishes to the menu";
      path = "/dashboard/food/menu";
      feature = "food";
    }
    if (isFood && section.type === "offers") {
      label = "Add your offers & deals";
      path = "/dashboard/food/offers";
      feature = "food";
    }

    steps.push({ key: section.type, label, path, feature });
  });

  return steps;
}

export default function SetupChecklist({ completedSteps = [], planFeatures = [], pageSections = [] }) {
  const { setupChecklistOpen, closeSetupChecklist } = useVenueStore();
  const { profile, loading: profileLoading } = useBusinessProfile();
  const [expanded, setExpanded] = useState(false);

  if (!setupChecklistOpen) return null;
  // Wait for the business type so the list never flashes steps that don't apply.
  if (profileLoading) return null;

  const modules = profile?.modules || [];
  const steps = buildSteps(pageSections, {
    isShop: profile?.key === "retail",
    isFood: profile?.key === "food",
    hasSlots: modules.includes("slots"),
    hasBilling: planFeatures.includes("billing") && modules.includes("billing")
  });
  const availableSteps = steps.filter((step) => planFeatures.includes(step.feature));

  if (availableSteps.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-card">
        <button
          onClick={closeSetupChecklist}
          aria-label="Dismiss"
          className="tap-scale absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3.5 pr-6">
          <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles size={19} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-white">Build your own branded website</h3>
            <p className="text-[13px] text-white/80 mt-1 leading-relaxed">
              Your plan covers your Marketplace Profile. Upgrade to unlock a custom website with hero image,
              gallery, services and booking slots.
            </p>
            <Link
              to="/dashboard/settings/subscription"
              className="tap-scale mt-3 inline-flex items-center gap-1 bg-white text-primary-700 text-[13px] font-semibold px-4 py-2 rounded-xl"
            >
              View plans <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const doneCount = completedSteps.filter((k) => availableSteps.some((s) => s.key === k)).length;
  const completionRate = Math.round((doneCount / availableSteps.length) * 100);
  if (completionRate === 100) return null;

  const nextStep = availableSteps.find((s) => !completedSteps.includes(s.key));
  const remaining = availableSteps.length - doneCount;

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center gap-3.5 p-4">
        <ProgressRing percent={completionRate} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[14.5px] text-navy-900">Finish setting up</h3>
          <p className="text-xs text-navy-400 mt-0.5">
            {remaining} {remaining === 1 ? "step" : "steps"} left
          </p>
        </div>
        <button
          onClick={closeSetupChecklist}
          aria-label="Dismiss"
          className="tap-scale w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-navy-300 hover:text-navy-600 hover:bg-navy-50"
        >
          <X size={16} />
        </button>
      </div>

      {nextStep && (
        <Link
          to={nextStep.path}
          className="tap-scale mx-4 mb-4 flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-3.5 py-3 hover:bg-primary-100/70 transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-primary-600">Up next</span>
            <span className="block text-[13.5px] font-medium text-navy-900 truncate">{nextStep.label}</span>
          </span>
          <ChevronRight size={18} className="text-primary-600 shrink-0" />
        </Link>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-navy-100/70 text-xs font-medium text-navy-500 hover:bg-navy-50/60"
      >
        {expanded ? "Hide checklist" : "View full checklist"}
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-navy-100/70"
          >
            {availableSteps.map((step) => {
              const done = completedSteps.includes(step.key);
              return (
                <li key={step.key}>
                  <Link
                    to={step.path}
                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-navy-50/60"
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        done ? "bg-emerald-500 text-white" : "border-2 border-navy-200"
                      }`}
                    >
                      {done && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={done ? "text-navy-300" : "text-navy-700 font-medium"}>{step.label}</span>
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </Surface>
  );
}