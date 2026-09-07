import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, Trash2, Star } from "lucide-react";

const EMPTY_TESTIMONIAL = { id: "", name: "", location: "", description: "", rating: 5 };

export default function TestimonialsEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venue?.testimonials) setTestimonials(venue.testimonials);
  }, [venue]);

  const addTestimonial = () => {
    setTestimonials([...testimonials, { ...EMPTY_TESTIMONIAL, id: Date.now().toString() }]);
  };

  const updateTestimonial = (id, field, value) => {
    setTestimonials(testimonials.map((t) => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTestimonial = (id) => setTestimonials(testimonials.filter((t) => t.id !== id));

  const save = async () => {
    const valid = testimonials.filter((t) => t.name.trim() && t.description.trim());
    if (valid.length === 0) return showError("Add at least one testimonial with a name and description");
    setSaving(true);
    try {
      await venueService.update(venue.id, { testimonials: valid });
      await refetchVenue();
      showSuccess("Testimonials updated");
      navigate("/dashboard/website");
    } catch {
      showError("Failed to save testimonials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Testimonials">
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-100 space-y-4">

        {testimonials.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No testimonials yet. Add your first customer review below.
          </p>
        )}

        <div className="space-y-4">
          {testimonials.map((t, idx) => (
            <div key={t.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Testimonial {idx + 1}</span>
                <button
                  onClick={() => removeTestimonial(t.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Name + Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={t.name}
                    onChange={(e) => updateTestimonial(t.id, "name", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Indore, MP"
                    value={t.location || ""}
                    onChange={(e) => updateTestimonial(t.id, "location", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateTestimonial(t.id, "rating", star)}
                      className="p-0.5"
                    >
                      <Star
                        size={20}
                        className={star <= (t.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Review / Description *</label>
                <textarea
                  placeholder="e.g. The venue and staff made our wedding day unforgettable..."
                  value={t.description || ""}
                  onChange={(e) => updateTestimonial(t.id, "description", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addTestimonial}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Testimonial
        </button>

        <div className="flex gap-3">
          <Button onClick={save} loading={saving} className="flex-1">Save Testimonials</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}