import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import Button from "../../../components/common/Button";
import { showSuccess, showError } from "../../../components/common/Toast";
import { SECTION_TYPES, emptyItem } from "../../../lib/sectionLibrary";
import { FoodPage } from "./foodShared.jsx";

// Offers shown on the restaurant's website ("Offers & Deals" section). Same data as the
// Website Builder offers editor, so both places stay in sync.
export default function FoodOffers() {
  const { venue, refetchVenue } = useVenue();
  const def = SECTION_TYPES.offers;
  const [title, setTitle] = useState("Today's Offers");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!venue?.page_sections) return;
    const existing = venue.page_sections.find((s) => s.type === "offers");
    setTitle(existing?.config?.title || def?.defaultConfig?.title || "Today's Offers");
    setItems(existing?.config?.items || []);
  }, [venue]);

  const updateItem = (id, field, value) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  const addItem = () => setItems((list) => [...list, emptyItem()]);
  const removeItem = (id) => setItems((list) => list.filter((it) => it.id !== id));

  const save = async () => {
    const sections = Array.isArray(venue?.page_sections) ? venue.page_sections : [];
    if (!sections.length) {
      showError("Open Website Builder once so your website sections are created, then come back.");
      return;
    }
    const config = { title, items: items.filter((it) => it.title?.trim()) };
    const exists = sections.some((s) => s.type === "offers");

    let next;
    if (exists) {
      next = sections.map((s) => (s.type === "offers" ? { ...s, visible: true, config } : s));
    } else {
      const section = { type: "offers", visible: true, config };
      const at = sections.findIndex((s) => s.type === "contact");
      next = at === -1 ? [...sections, section] : [...sections.slice(0, at), section, ...sections.slice(at)];
    }

    setSaving(true);
    try {
      await venueService.update(venue.id, { page_sections: next });
      await refetchVenue();
      showSuccess("Offers updated on your website");
    } catch (e) {
      showError(e?.response?.data?.message || "Could not save offers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const labels = def?.fieldLabels || {};

  return (
    <FoodPage title="Offers & Deals" subtitle="These show as scrollable offer cards on your website. Customers can claim them on WhatsApp.">
      <div className="max-w-2xl bg-white p-6 rounded-2xl border border-navy-100/60 space-y-5">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Section heading</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No offers yet. Add your first one below.</p>
        )}

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Offer {idx + 1}</span>
                <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{labels.title || "Offer headline"}</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem(item.id, "title", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{labels.tag || "Badge (e.g. 20% OFF)"}</label>
                <input
                  type="text"
                  value={item.tag || ""}
                  onChange={(e) => updateItem(item.id, "tag", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{labels.description || "Details / validity"}</label>
                <textarea
                  value={item.description || ""}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Offer
        </button>

        <Button onClick={save} loading={saving} className="w-full">Save Offers</Button>
      </div>
    </FoodPage>
  );
}