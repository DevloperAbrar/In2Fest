import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import SocialIcon from "../../../components/common/SocialIcon.jsx";
import { SocialLinksView } from "../../public-site/venue-home/SocialLinksSection.jsx";
import { PLATFORMS, PLATFORM_KEYS, MAX_SOCIAL_LINKS, getPlatform, normalizeSocialUrl } from "../../../lib/socialPlatforms";
import { GripVertical, ChevronUp, ChevronDown, Trash2, ExternalLink, CheckCircle2, AlertCircle, LayoutGrid, Rows3 } from "lucide-react";

const TYPE = "social_links";
const makeId = () => `soc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function linkStatus(item) {
  const value = item.url.trim();
  if (!value) return { state: "empty" };
  const url = normalizeSocialUrl(item.platform, value);
  return url ? { state: "ok", url } : { state: "bad" };
}

export default function SocialLinksEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();

  const [title, setTitle] = useState("Follow Us");
  const [subtitle, setSubtitle] = useState("");
  const [style, setStyle] = useState("cards");
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [focusId, setFocusId] = useState(null);

  // Load once. Later venue refetches must not wipe what the vendor is typing.
  useEffect(() => {
    if (!venue || loaded) return;
    const existing = (venue.page_sections || []).find((s) => s.type === TYPE);
    const cfg = existing?.config || {};
    setTitle(cfg.title || "Follow Us");
    setSubtitle(cfg.subtitle || "");
    setStyle(cfg.style === "icons" ? "icons" : "cards");
    setItems(
      (cfg.items || []).map((it) => ({
        id: it.id || makeId(),
        platform: PLATFORMS[it.platform] ? it.platform : "other",
        url: it.url || "",
        label: it.label || ""
      }))
    );
    setLoaded(true);
  }, [venue, loaded]);

  // Put the cursor in the link box of a row that was just added.
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`soc-url-${focusId}`);
    if (el) el.focus();
    setFocusId(null);
  }, [focusId, items]);

  const atLimit = items.length >= MAX_SOCIAL_LINKS;

  const addItem = (platform) => {
    if (atLimit) return;
    const id = makeId();
    setItems((prev) => [...prev, { id, platform, url: "", label: "" }]);
    setFocusId(id);
  };

  const updateItem = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const move = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
  };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    setItems(next);
  };

  const previewItems = items
    .map((it) => ({ ...it, url: linkStatus(it).url }))
    .filter((it) => it.url);

  const save = async () => {
    if (!venue?.page_sections) return;

    if (items.some((it) => linkStatus(it).state === "bad")) {
      showError("Some links are not valid. Please fix the ones marked in red.");
      return;
    }

    setSaving(true);
    try {
      const config = {
        title: title.trim() || "Follow Us",
        subtitle: subtitle.trim(),
        style,
        items: previewItems.map((it) => ({ id: it.id, platform: it.platform, url: it.url, label: it.label.trim() }))
      };

      const exists = venue.page_sections.some((s) => s.type === TYPE);
      let next;
      if (exists) {
        next = venue.page_sections.map((s) => (s.type === TYPE ? { ...s, config } : s));
      } else {
        // Section was added in the builder but the layout was not saved yet:
        // add it now, just above the Contact section.
        const section = { type: TYPE, visible: true, config };
        const contactIndex = venue.page_sections.findIndex((s) => s.type === "contact");
        next = [...venue.page_sections];
        next.splice(contactIndex === -1 ? next.length : contactIndex, 0, section);
      }

      await venueService.update(venue.id, { page_sections: next });
      await refetchVenue();
      showSuccess("Social media links updated");
      navigate("/dashboard/website");
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save social links");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Social Media Links">
      <div className="max-w-3xl space-y-6">

        {/* Heading + style */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Section heading</label>
              <input
                type="text"
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Small line above heading (optional)</label>
              <input
                type="text"
                value={subtitle}
                maxLength={100}
                placeholder="Stay Connected"
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">How should it look?</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "cards", label: "Cards", hint: "Big cards with name and handle", Icon: LayoutGrid },
                { key: "icons", label: "Icon row", hint: "Compact round buttons", Icon: Rows3 }
              ].map(({ key, label, hint, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStyle(key)}
                  className={`flex items-center gap-3 text-left p-3 rounded-xl border transition-all ${
                    style === key ? "border-primary-400 bg-primary-50 ring-2 ring-primary-100" : "border-gray-200 hover:border-primary-200"
                  }`}
                >
                  <span className={`p-2 rounded-lg ${style === key ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">{label}</span>
                    <span className="block text-xs text-gray-500">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick add */}
        <div className="bg-white p-5 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Add a link</h3>
            <span className="text-xs text-gray-400">{items.length} / {MAX_SOCIAL_LINKS}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {PLATFORM_KEYS.map((key) => {
              const p = PLATFORMS[key];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={atLimit}
                  onClick={() => addItem(key)}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3 transition-all hover:border-transparent hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-none"
                >
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                    style={{ background: `${p.color}1a`, color: p.color }}
                  >
                    <SocialIcon platform={key} size={22} />
                  </span>
                  <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Link rows */}
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
              No links yet. Tap a platform above to add your first one.
            </p>
          )}

          {items.map((it, index) => {
            const p = getPlatform(it.platform);
            const status = linkStatus(it);
            return (
              <div
                key={it.id}
                onDragOver={(e) => dragIndex !== null && e.preventDefault()}
                onDrop={() => handleDrop(index)}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  dragIndex === index ? "opacity-40" : ""
                } ${status.state === "bad" ? "border-red-300" : "border-gray-100"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    draggable
                    title="Drag to reorder"
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", it.id);
                      const row = e.currentTarget.closest("div.border");
                      if (row) e.dataTransfer.setDragImage(row, 20, 20);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className="mt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                  >
                    <GripVertical size={18} />
                  </span>

                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${p.color}1a`, color: p.color }}
                  >
                    <SocialIcon platform={it.platform} size={22} />
                  </span>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={it.platform}
                        onChange={(e) => updateItem(it.id, { platform: e.target.value })}
                        className="sm:w-44 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {PLATFORM_KEYS.map((key) => (
                          <option key={key} value={key}>{PLATFORMS[key].label}</option>
                        ))}
                      </select>
                      <input
                        id={`soc-url-${it.id}`}
                        type="text"
                        value={it.url}
                        placeholder={p.placeholder}
                        onChange={(e) => updateItem(it.id, { url: e.target.value })}
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <input
                      type="text"
                      value={it.label}
                      maxLength={40}
                      placeholder="Display name (optional), e.g. @nextgenacademy"
                      onChange={(e) => updateItem(it.id, { label: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />

                    {status.state === "ok" && (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-600 min-w-0">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span className="truncate">Opens {status.url}</span>
                      </p>
                    )}
                    {status.state === "bad" && (
                      <p className="flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle size={13} className="shrink-0" /> Enter a valid link or handle for {p.label}.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-25"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      title="Move down"
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-25"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    {status.state === "ok" && (
                      <a
                        href={status.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Test this link"
                        className="p-1 text-gray-400 hover:text-primary-600"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      title="Remove"
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live preview */}
        {previewItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Live preview</h3>
              <span className="text-xs text-gray-400">This is how visitors will see it. Links are live.</span>
            </div>
            <div className="p-6 sm:p-8 bg-stone-50">
              <div className="text-center mb-8">
                {subtitle.trim() && (
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{subtitle}</p>
                )}
                <h2 className="text-2xl font-extrabold text-stone-900" style={{ letterSpacing: "-0.02em" }}>
                  {title || "Follow Us"}
                </h2>
              </div>
              <SocialLinksView items={previewItems} style={style} />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={save} loading={saving} className="flex-1">Save Social Links</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}