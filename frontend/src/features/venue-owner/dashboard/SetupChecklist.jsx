import React from "react";
import { Link } from "react-router-dom";
import { Check, Circle, X, Sparkles } from "lucide-react";
import { useVenueStore } from "../../../store/venueStore";
import { SECTION_TYPES } from "../../../lib/sectionLibrary";

function buildSteps(pageSections) {
  const sections = pageSections || [];
  const isVisible = (type) => sections.some((s) => s.type === type && s.visible !== false);

  const steps = [
    { key: "hero_image", label: "Upload hero image", path: "/dashboard/website/hero", feature: "website_builder" }
  ];

  if (isVisible("about")) {
    steps.push({ key: "about", label: "Write about section", path: "/dashboard/website/about", feature: "website_builder" });
  }
  if (isVisible("services")) {
    steps.push({ key: "services", label: "Add at least one service", path: "/dashboard/website/services", feature: "website_builder" });
  }
  if (isVisible("gallery")) {
    steps.push({ key: "gallery", label: "Add gallery photos", path: "/dashboard/website/gallery", feature: "website_builder" });
  }

  steps.push({ key: "slots", label: "Configure slots", path: "/dashboard/slots", feature: "slots" });

  // One entry per pluggable section the vendor actually has on their site  -
  // this is what makes the checklist different for a Mehendi Artist vs a
  // Card Printing shop vs a Tent House.
  sections.forEach((section) => {
    const def = SECTION_TYPES[section.type];
    if (!def?.removable || section.visible === false) return;
    steps.push({
      key: section.type,
      label: `Fill in your ${def.label}`,
      path: `/dashboard/website/section/${section.type}`,
      feature: "website_builder"
    });
  });

  return steps;
}

export default function SetupChecklist({ completedSteps = [], planFeatures = [], pageSections = [] }) {
  const { setupChecklistOpen, closeSetupChecklist } = useVenueStore();

  if (!setupChecklistOpen) return null;

  const steps = buildSteps(pageSections);
  const availableSteps = steps.filter((step) => planFeatures.includes(step.feature));

  if (availableSteps.length === 0) {
    return (
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl p-5 mb-6 relative text-white overflow-hidden">
        <button onClick={closeSetupChecklist} className="absolute top-4 right-4 text-white/70 hover:text-white">
          <X size={16} />
        </button>
        <div className="flex items-start gap-4">
          <div className="bg-white/15 rounded-lg p-2.5 flex-shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Build your own branded website</h3>
            <p className="text-sm text-white/85 mb-3 max-w-md">
              Your current plan covers your Marketplace Profile. Upgrade to unlock a custom website with your own
              hero image, gallery, services, and booking slots.
            </p>
            <Link
              to="/dashboard/settings/subscription"
              className="inline-block bg-white text-primary-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const doneCount = completedSteps.filter((k) => availableSteps.some((s) => s.key === k)).length;
  const completionRate = Math.round((doneCount / availableSteps.length) * 100);
  if (completionRate === 100) return null;

  return (
    <div className="bg-white rounded-xl border border-primary-100 p-5 mb-6 relative">
      <button onClick={closeSetupChecklist} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
      <h3 className="font-semibold mb-1">Finish setting up your venue ({completionRate}%)</h3>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
      </div>
      <div className="space-y-2">
        {availableSteps.map((step) => {
          const done = completedSteps.includes(step.key);
          return (
            <Link
              key={step.key}
              to={step.path}
              className="flex items-center gap-3 text-sm hover:bg-gray-50 p-2 rounded-lg"
            >
              {done ? <Check size={16} className="text-green-600" /> : <Circle size={16} className="text-gray-300" />}
              <span className={done ? "text-gray-400 line-through" : "text-gray-700"}>{step.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}