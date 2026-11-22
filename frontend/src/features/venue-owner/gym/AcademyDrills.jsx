import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg, TextArea, shareContent } from "./gymShared.jsx";
import { Surface, EmptyState } from "./gymUi.jsx";

const EMPTY = { title: "", discipline: "", category: "", minutes: "", equipment: "", instructions: "" };

function DrillForm({ vid, config, drill, onClose, onSaved }) {
  const [f, setF] = useState(drill ? Object.fromEntries(Object.entries({ ...EMPTY, ...drill }).map(([k, v]) => [k, v === null ? "" : v])) : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { title: f.title, discipline: f.discipline, category: f.category, minutes: f.minutes, equipment: f.equipment, instructions: f.instructions };
      if (drill) await gymService.acUpdateDrill(vid, drill.id, body); else await gymService.acCreateDrill(vid, body);
      showSuccess("Saved");
      onSaved();
    } catch (e) { showError(errMsg(e)); setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this drill?")) return;
    setBusy(true);
    try { await gymService.acDeleteDrill(vid, drill.id); onSaved(); } catch (e) { showError(errMsg(e)); setBusy(false); }
  };
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={drill ? "Edit drill" : "New drill"} size="md">
      <div className="space-y-3">
        <Input label="Title" maxLength={100} value={f.title} onChange={(e) => set("title", e.target.value)} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="For" value={f.discipline} onChange={(e) => set("discipline", e.target.value)} options={[{ value: "", label: "Everyone" }, ...(config?.disciplines || []).map((d) => ({ value: d.key, label: d.label }))]} />
          <Input label="Category" maxLength={40} value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Batting" />
          <Input label="Minutes" type="number" min={1} max={300} value={f.minutes} onChange={(e) => set("minutes", e.target.value)} />
          <Input label="Equipment" maxLength={120} value={f.equipment} onChange={(e) => set("equipment", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">How to do it</label>
          <TextArea rows={4} maxLength={3000} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} />
        </div>
        <div className="flex gap-2">
          {drill && <Button variant="outline" onClick={remove} disabled={busy}>Delete</Button>}
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1" onClick={save} loading={busy} disabled={!f.title.trim()}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AcademyDrills() {
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const isOwner = user?.role !== "team_member";
  const [config, setConfig] = useState(null);
  const [disc, setDisc] = useState("");
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => { if (vid) gymService.acConfig(vid).then((r) => setConfig(r.data.data)).catch(() => {}); }, [vid]);

  const load = useCallback(async () => {
    if (!vid) return;
    try { const r = await gymService.acDrills(vid, disc ? { discipline: disc } : {}); setData(r.data.data); }
    catch (e) { showError(errMsg(e)); setData({ builtin: [], custom: [] }); }
  }, [vid, disc]);
  useEffect(() => { load(); }, [load]);

  const labels = useMemo(() => Object.fromEntries((config?.disciplines || []).map((d) => [d.key, d.label])), [config]);
  const all = data ? [...data.custom, ...data.builtin] : [];

  const share = async (dr) => {
    const text = `${dr.title}${dr.minutes ? ` (${dr.minutes} min)` : ""}\n${dr.equipment ? `Equipment: ${dr.equipment}\n` : ""}${dr.instructions || ""}`;
    const r = await shareContent({ title: dr.title, text });
    if (r === "copied") showSuccess("Copied");
  };

  return (
    <GymPage title="Drills" subtitle="Practice drills for your coaches" actions={isOwner ? <Button onClick={() => setForm({})}><Plus size={16} /> New drill</Button> : null}>
      <div className="max-w-xs mb-3">
        <Select label="Show" value={disc} onChange={(e) => setDisc(e.target.value)} options={[{ value: "", label: "All" }, ...(config?.disciplines || []).map((d) => ({ value: d.key, label: d.label }))]} />
      </div>
      {!data ? <Loader /> : all.length === 0 ? (
        <Surface className="p-6"><EmptyState title="No drills here yet" description="Add your own drills or choose another sport." /></Surface>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {all.map((dr) => {
            const k = dr.key || dr.id;
            return (
              <Surface key={k} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">{dr.title}</p>
                    <p className="text-xs text-navy-500">{[labels[dr.discipline], dr.category, dr.minutes ? `${dr.minutes} min` : null].filter(Boolean).join(" · ")}{dr.builtin ? "" : " · Yours"}</p>
                  </div>
                  {!dr.builtin && isOwner && <button type="button" className="text-xs font-semibold text-primary-600" onClick={() => setForm(dr)}>Edit</button>}
                </div>
                {dr.equipment && <p className="mt-1 text-xs text-navy-400">Equipment: {dr.equipment}</p>}
                {openKey === k && dr.instructions && <p className="mt-2 text-sm text-navy-700 whitespace-pre-line">{dr.instructions}</p>}
                <div className="mt-2 flex gap-3">
                  <button type="button" className="text-xs font-semibold text-primary-600" onClick={() => setOpenKey(openKey === k ? null : k)}>{openKey === k ? "Hide" : "How to do it"}</button>
                  <button type="button" className="text-xs font-semibold text-primary-600" onClick={() => share(dr)}>Share</button>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
      {form && <DrillForm vid={vid} config={config} drill={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </GymPage>
  );
}