import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";
import { normalizeIconKey, DEFAULT_ICON_GROUP_BY_BUSINESS_TYPE } from "../../../lib/serviceIcons";
import ServiceIconPicker from "./ServiceIconPicker.jsx";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

const HINTS = {
  education: { name: "e.g. Class 10th: Maths & Science", desc: "e.g. Board-focused batches with weekly tests and doubt-clearing sessions" },
  retail: { name: "e.g. Fresh Fruits & Vegetables", desc: "e.g. Fresh stock every morning with free home delivery within 5 km" },
  food: { name: "e.g. Home Delivery", desc: "e.g. Hot, freshly cooked meals delivered within 30 minutes" },
  health_wellness: { name: "e.g. Personal Training", desc: "e.g. One-on-one sessions with a certified trainer and a custom plan" },
  professional: { name: "e.g. GST Filing & Returns", desc: "e.g. Monthly and annual filings handled end to end by experts" },
  home_services: { name: "e.g. AC Repair & Service", desc: "e.g. Same-day visit by trained technicians with 30-day service warranty" },
  events: { name: "e.g. Catering & Live Counters", desc: "e.g. Shahi thalis, regional specialities and live food stations for every guest count" },
  general: { name: "e.g. Free Home Delivery", desc: "e.g. Tell customers what makes this service special" }
};

const EMPTY_SERVICE = { id: "", name: "", description: "", icon: "sparkles", visible: true };

export default function ServicesEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const { profile } = useBusinessProfile();
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);

  const typeKey = profile?.key || "general";
  const hint = HINTS[typeKey] || HINTS.general;
  const iconGroup = DEFAULT_ICON_GROUP_BY_BUSINESS_TYPE[typeKey] || "general";

  useEffect(() => {
    if (venue?.services) {
      setServices(
        venue.services.map((s) => ({
          ...s,
          icon: normalizeIconKey(s.icon),
          visible: s.visible !== false
        }))
      );
    }
  }, [venue]);

  const addService = () => {
    setServices((prev) => [...prev, { ...EMPTY_SERVICE, id: `svc_${Date.now()}` }]);
  };

  const updateService = (id, field, value) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeService = (id) => setServices((prev) => prev.filter((s) => s.id !== id));

  const move = (index, dir) => {
    setServices((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    const valid = services
      .map((s) => ({ ...s, name: s.name.trim(), description: (s.description || "").trim() }))
      .filter((s) => s.name);
    if (valid.length === 0) return showError("Add at least one service");
    setSaving(true);
    try {
      await venueService.update(venue.id, { services: valid });
      await refetchVenue();
      showSuccess("Services updated");
      navigate("/dashboard");
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Services">
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-100 space-y-4">
        {services.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No services yet. Add your first service below.</p>
        )}

        <div className="space-y-4">
          {services.map((s, idx) => (
            <div key={s.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Service {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === services.length - 1}
                    aria-label="Move down"
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeService(s.id)}
                    aria-label="Delete service"
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Icon</label>
                <ServiceIconPicker
                  value={s.icon}
                  onChange={(key) => updateService(s.id, "icon", key)}
                  defaultGroup={iconGroup}
                />
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block text-xs text-gray-500 mb-1">Service Name *</label>
                  <span className="text-[11px] text-gray-300">{s.name.length}/80</span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  placeholder={hint.name}
                  value={s.name}
                  onChange={(e) => updateService(s.id, "name", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <span className="text-[11px] text-gray-300">{(s.description || "").length}/300</span>
                </div>
                <textarea
                  maxLength={300}
                  placeholder={hint.desc}
                  value={s.description || ""}
                  onChange={(e) => updateService(s.id, "description", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={s.visible !== false}
                  onChange={(e) => updateService(s.id, "visible", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-primary-600"
                />
                Show this service on my website
              </label>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addService}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Service
        </button>

        <div className="flex gap-3">
          <Button onClick={save} loading={saving} className="flex-1">Save Services</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}