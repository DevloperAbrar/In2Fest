import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, Trash2, GripVertical } from "lucide-react";

const ICON_OPTIONS = [
  "🎪", "🍽️", "🎵", "💡", "🪑", "🎨", "📸", "🚗", "🌸", "🎤",
  "🏟️", "❄️", "🔊", "🎭", "🌿", "🛎️", "💐", "🎂", "🎬", "✨"
];

const EMPTY_SERVICE = { id: "", name: "", description: "", icon: "✨", visible: true };

export default function ServicesEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venue?.services) setServices(venue.services);
  }, [venue]);

  const addService = () => {
    setServices([...services, { ...EMPTY_SERVICE, id: Date.now().toString() }]);
  };

  const updateService = (id, field, value) => {
    setServices(services.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeService = (id) => setServices(services.filter((s) => s.id !== id));

  const save = async () => {
    const valid = services.filter((s) => s.name.trim());
    if (valid.length === 0) return showError("Add at least one service");
    setSaving(true);
    try {
      await venueService.update(venue.id, { services: valid });
      await refetchVenue();
      showSuccess("Services updated");
      navigate("/dashboard");
    } catch {
      showError("Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Services">
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-100 space-y-4">

        {services.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No services yet. Add your first service below.
          </p>
        )}

        <div className="space-y-4">
          {services.map((s, idx) => (
            <div key={s.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Service {idx + 1}</span>
                <button
                  onClick={() => removeService(s.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Icon</label>
                <div className="flex flex-wrap gap-1">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => updateService(s.id, "icon", icon)}
                      className={`text-lg p-1 rounded-lg border-2 transition-all ${
                        s.icon === icon
                          ? "border-primary-500 bg-primary-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Service Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Catering & Live Counters"
                  value={s.name}
                  onChange={(e) => updateService(s.id, "name", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  placeholder="e.g. Shahi thalis, regional specialities and live food stations for every guest count"
                  value={s.description || ""}
                  onChange={(e) => updateService(s.id, "description", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button
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