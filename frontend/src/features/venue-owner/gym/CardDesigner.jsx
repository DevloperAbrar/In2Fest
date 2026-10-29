import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { errMsg } from "./gymShared.jsx";

const SHOW_LABELS = [
  ["logo", "Gym logo"], ["gym_name", "Gym name"], ["status", "Active / Expired status"], ["photo", "Member photo"],
  ["member_id", "Member ID"], ["plan", "Plan"], ["valid", "Valid dates"], ["owner", "Owner name"],
  ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["achievements", "Achievements"]
];
const SWATCHES = ["#dc2626", "#f97316", "#d4af37", "#22c55e", "#0ea5e9", "#8b5cf6", "#ec4899"];
const THEME_DOT = { classic: "#0b1220", light: "#e2e8f0", gold: "#d4af37", ocean: "#0e7490" };

// Designs the membership card: theme, accent colour, visible details and achievements.
export default function CardDesigner() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const isPro = (venue?.subscription?.plan?.features || []).includes("gym_pro");
  const { data, loading } = useFetch(vid ? `/venues/${vid}/gym/card-settings` : null, { skip: !vid });
  const [cfg, setCfg] = useState(null);
  const [img, setImg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const urlRef = useRef("");

  useEffect(() => { if (data) setCfg({ theme: data.theme, accent: data.accent, title: data.title, show: data.show, achievements: data.achievements }); }, [data]);

  // live preview from the server (same renderer as the real card), debounced
  useEffect(() => {
    if (!cfg || !vid || !isPro) return undefined;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      gymService.cardPreview(vid, { config: cfg }, ctl.signal)
        .then((r) => {
          const u = URL.createObjectURL(r.data);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = u;
          setImg(u);
          setErr("");
        })
        .catch((e) => { if (e?.code !== "ERR_CANCELED") setErr("Could not load the preview"); });
    }, 450);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [cfg, vid, isPro]);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  if (loading || !cfg) return <Loader />;
  const max = data?.max_achievements || 4;
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const toggle = (k) => setCfg((c) => ({ ...c, show: { ...c.show, [k]: !c.show[k] } }));
  const setAch = (i, v) => set({ achievements: cfg.achievements.map((a, j) => (j === i ? v : a)) });

  const save = async () => {
    setBusy(true);
    try {
      await gymService.saveCardSettings(vid, { ...cfg, achievements: cfg.achievements.filter((a) => a.trim()) });
      showSuccess("Member card design saved");
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!isPro && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Member cards are part of the Gym Pro plan. Upgrade to design and download cards.</p>}
      {isPro && (
        <div className="rounded-2xl bg-navy-50 p-2 min-h-[120px] flex items-center justify-center">
          {img ? <img src={img} alt="Card preview" className="w-full max-w-md rounded-xl shadow" /> : err ? <p className="text-sm text-red-500">{err}</p> : <Loader />}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-navy-700 mb-1.5">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(data.themes || []).map((t) => (
            <button key={t.key} type="button" onClick={() => set({ theme: t.key })}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${cfg.theme === t.key ? "border-navy-900 ring-1 ring-navy-900" : "border-navy-200"}`}>
              <span className="w-4 h-4 rounded-full border border-navy-200" style={{ background: THEME_DOT[t.key] }} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-navy-700 mb-1.5">Accent colour</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => set({ accent: null })}
            className={`px-3 py-1.5 rounded-full text-xs border ${!cfg.accent ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600"}`}>Theme default</button>
          {SWATCHES.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => set({ accent: c })}
              className={`w-7 h-7 rounded-full border-2 ${cfg.accent === c ? "border-navy-900" : "border-white shadow"}`} style={{ background: c }} />
          ))}
          <input type="color" value={cfg.accent || "#dc2626"} onChange={(e) => set({ accent: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
        </div>
      </div>

      <Input label="Card title" maxLength={24} value={cfg.title} onChange={(e) => set({ title: e.target.value })} />

      <div>
        <p className="text-sm font-medium text-navy-700 mb-1.5">Show on the card</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {SHOW_LABELS.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={!!cfg.show[k]} onChange={() => toggle(k)} /> {l}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-navy-700 mb-1.5">Achievements (up to {max})</p>
        <div className="space-y-2">
          {cfg.achievements.map((a, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={a} maxLength={40} placeholder="e.g. 10+ Years, 5000+ Members" onChange={(e) => setAch(i, e.target.value)}
                className="flex-1 px-3 py-2 border border-navy-200 rounded-lg text-sm" />
              <button type="button" onClick={() => set({ achievements: cfg.achievements.filter((_, j) => j !== i) })} className="p-2 text-navy-400 hover:text-red-600"><X size={16} /></button>
            </div>
          ))}
          {cfg.achievements.length < max && (
            <button type="button" onClick={() => set({ achievements: [...cfg.achievements, ""], show: { ...cfg.show, achievements: true } })}
              className="flex items-center gap-1 text-sm text-primary-600 font-medium"><Plus size={14} /> Add achievement</button>
          )}
        </div>
        <p className="text-xs text-navy-400 mt-1">With achievements on, the address is shown on one line. Hide it if you want it fully visible.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setCfg({ theme: "classic", accent: null, title: data.default_title, show: { ...data.show, ...Object.fromEntries(SHOW_LABELS.map(([k]) => [k, k !== "achievements"])) }, achievements: [] })}>Reset design</Button>
        <Button onClick={save} loading={busy}>Save design</Button>
      </div>
    </div>
  );
}