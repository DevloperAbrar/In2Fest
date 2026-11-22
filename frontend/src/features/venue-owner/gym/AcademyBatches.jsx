import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Plus, UserCog, Users } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg } from "./gymShared.jsx";
import { Surface, EmptyState } from "./gymUi.jsx";
import { useGymVariant } from "./gymVariant.js";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const EMPTY = { name: "", discipline: "", days: [], start_time: "", end_time: "", coach_name: "", location: "", age_min: "", age_max: "", level: "", capacity: "", notes: "", is_active: true };

function BatchForm({ vid, terms, config, batch, onClose, onSaved }) {
  const [f, setF] = useState(() => (batch ? { ...EMPTY, ...Object.fromEntries(Object.entries(batch).map(([k, v]) => [k, v === null ? "" : v])) } : EMPTY));
  const [busy, setBusy] = useState(false);
  const disc = (config?.disciplines || []).find((d) => d.key === f.discipline);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleDay = (d) => set("days", f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]);

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        name: f.name, discipline: f.discipline, days: f.days, start_time: f.start_time, end_time: f.end_time,
        coach_name: f.coach_name, location: f.location, age_min: f.age_min, age_max: f.age_max,
        level: f.level, capacity: f.capacity, notes: f.notes, is_active: !!f.is_active
      };
      if (batch) await gymService.acUpdateBatch(vid, batch.id, body);
      else await gymService.acCreateBatch(vid, body);
      showSuccess(`${terms.batch} saved`);
      onSaved();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete this ${terms.batch.toLowerCase()}? ${terms.people} stay in your list, only the group is removed.`)) return;
    setBusy(true);
    try { await gymService.acDeleteBatch(vid, batch.id); showSuccess("Deleted"); onSaved(); }
    catch (e) { showError(errMsg(e)); setBusy(false); }
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={batch ? `Edit ${terms.batch.toLowerCase()}` : `New ${terms.batch.toLowerCase()}`} size="lg">
      <div className="space-y-3">
        <Input label="Name" maxLength={60} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Morning cricket (U-14)" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label={config?.variant?.group === "studio" ? "Class type" : "Sport"}
            options={[{ value: "", label: "Select" }, ...(config?.disciplines || []).map((d) => ({ value: d.key, label: d.label }))]}
            value={f.discipline}
            onChange={(e) => set("discipline", e.target.value)}
          />
          {disc?.levels?.length ? (
            <Select label={disc.level_label} options={[{ value: "", label: "All" }, ...disc.levels.map((l) => ({ value: l, label: l }))]} value={f.level} onChange={(e) => set("level", e.target.value)} />
          ) : (
            <Input label="Level (optional)" maxLength={30} value={f.level} onChange={(e) => set("level", e.target.value)} />
          )}
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1">Days</p>
          <div className="flex flex-wrap gap-2">
            {DAY_ORDER.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${f.days.includes(d) ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}>
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start time" type="time" value={f.start_time} onChange={(e) => set("start_time", e.target.value)} />
          <Input label="End time" type="time" value={f.end_time} onChange={(e) => set("end_time", e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Coach / instructor" maxLength={80} value={f.coach_name} onChange={(e) => set("coach_name", e.target.value)} />
          <Input label="Ground / court / room" maxLength={100} value={f.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Min age" type="number" min={2} max={80} value={f.age_min} onChange={(e) => set("age_min", e.target.value)} />
          <Input label="Max age" type="number" min={2} max={80} value={f.age_max} onChange={(e) => set("age_max", e.target.value)} />
          <Input label="Capacity" type="number" min={1} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
        </div>
        <Input label="Notes (optional)" maxLength={300} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active
        </label>
        <div className="flex gap-2 pt-1">
          {batch && <Button variant="outline" onClick={remove} disabled={busy}>Delete</Button>}
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1" onClick={submit} loading={busy}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function ManageStudents({ vid, terms, batchId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(async () => {
    try { const r = await gymService.acBatch(vid, batchId); setDetail(r.data.data); }
    catch (e) { showError(errMsg(e)); onClose(); }
  }, [vid, batchId, onClose]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => {
    let off = false;
    const t = setTimeout(async () => {
      try {
        const r = await gymService.acListMembers(vid, { q: q.trim(), limit: 10 });
        if (!off) setResults(r.data.data.items || []);
      } catch { if (!off) setResults([]); }
    }, 300);
    return () => { off = true; clearTimeout(t); };
  }, [vid, q]);

  const inBatch = useMemo(() => new Set((detail?.students || []).map((s) => s.id)), [detail]);
  const candidates = results.filter((m) => !inBatch.has(m.id));

  const add = async () => {
    if (!picked.size) return;
    setBusy(true);
    try {
      await gymService.acAddStudents(vid, batchId, [...picked]);
      setPicked(new Set());
      await loadDetail();
      onChanged();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    setBusy(true);
    try { await gymService.acRemoveStudent(vid, batchId, id); await loadDetail(); onChanged(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={detail ? `${detail.batch.name}: ${terms.people}` : terms.people} size="lg">
      {!detail ? <Loader /> : (
        <div className="space-y-4">
          <p className="text-xs text-navy-500">
            {detail.students.length}{detail.batch.capacity ? ` / ${detail.batch.capacity}` : ""} {terms.people.toLowerCase()} in this {terms.batch.toLowerCase()}
          </p>
          <div className="max-h-52 overflow-y-auto divide-y divide-navy-100 border border-navy-100 rounded-xl">
            {detail.students.length === 0 && <p className="p-3 text-sm text-navy-400">No {terms.people.toLowerCase()} added yet.</p>}
            {detail.students.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{s.name}</p>
                  <p className="text-xs text-navy-400">{s.member_code} · {s.phone}</p>
                </div>
                <button type="button" onClick={() => remove(s.id)} disabled={busy} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
              </div>
            ))}
          </div>

          <div>
            <Input label={`Add ${terms.people.toLowerCase()}`} placeholder="Search by name, mobile or ID" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-navy-100 border border-navy-100 rounded-xl">
              {candidates.length === 0 && <p className="p-3 text-sm text-navy-400">No one to add.</p>}
              {candidates.map((m) => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={picked.has(m.id)}
                    onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })} />
                  <span className="text-sm text-navy-900 truncate">{m.name}</span>
                  <span className="text-xs text-navy-400 ml-auto shrink-0">{m.member_code}</span>
                </label>
              ))}
            </div>
            <Button className="mt-3 w-full" onClick={add} loading={busy} disabled={!picked.size}>Add selected ({picked.size})</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AcademyBatches() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { terms } = useGymVariant();
  const [items, setItems] = useState(null);
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null); // null = closed, {} = new, batch = edit
  const [manage, setManage] = useState(null);

  const loadBatches = useCallback(async () => {
    if (!vid) return;
    try { const r = await gymService.acBatches(vid, true); setItems(r.data.data || []); }
    catch (e) { showError(errMsg(e)); setItems([]); }
  }, [vid]);

  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => {
    if (!vid) return;
    gymService.acConfig(vid).then((r) => setConfig(r.data.data)).catch(() => {});
  }, [vid]);

  const discLabel = useMemo(() => Object.fromEntries((config?.disciplines || []).map((d) => [d.key, d.label])), [config]);

  return (
    <GymPage
      title={terms.batches}
      subtitle={`Days, timings, coach and ${terms.people.toLowerCase()} for each ${terms.batch.toLowerCase()}`}
      actions={<Button onClick={() => setForm({})}><Plus size={16} /> New {terms.batch.toLowerCase()}</Button>}
    >
      {!items ? <Loader /> : items.length === 0 ? (
        <Surface className="p-6">
          <EmptyState title={`No ${terms.batches.toLowerCase()} yet`} description={`Create your first ${terms.batch.toLowerCase()} and add ${terms.people.toLowerCase()} to it.`} />
        </Surface>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          {items.map((b) => {
            const full = b.capacity && b.student_count >= b.capacity;
            return (
              <Surface key={b.id} className={`p-4 ${b.is_active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{b.name}</p>
                    <p className="text-xs text-navy-500">{[discLabel[b.discipline], b.level].filter(Boolean).join(" · ") || "-"}{b.is_active ? "" : " · Inactive"}</p>
                  </div>
                  <button type="button" onClick={() => setForm(b)} className="text-xs font-semibold text-primary-600 hover:underline shrink-0">Edit</button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {DAY_ORDER.filter((d) => (b.days || []).includes(d)).map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded-md bg-navy-50 text-navy-700 text-[11px] font-semibold">{DAY_LABEL[d]}</span>
                  ))}
                </div>
                <div className="mt-2 space-y-1 text-[13px] text-navy-600">
                  <p className="flex items-center gap-1.5"><Clock size={13} /> {fmtTime(b.start_time)} - {fmtTime(b.end_time)}</p>
                  {b.coach_name && <p className="flex items-center gap-1.5"><UserCog size={13} /> {b.coach_name}</p>}
                  {b.location && <p className="flex items-center gap-1.5"><MapPin size={13} /> {b.location}</p>}
                  {(b.age_min || b.age_max) && <p className="text-xs text-navy-400">Age {b.age_min || "-"} to {b.age_max || "-"}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className={`text-sm font-semibold ${full ? "text-red-600" : "text-navy-800"}`}>
                    <Users size={14} className="inline mr-1" />{b.student_count}{b.capacity ? ` / ${b.capacity}` : ""} {full ? "Full" : ""}
                  </p>
                  <div className="flex gap-2">
                    <Link to={`/dashboard/gym/batches/${b.id}/attendance`} className="tap-scale inline-flex items-center px-3 py-2 rounded-xl border border-navy-200 text-sm font-medium text-navy-700">Attendance</Link>
                    <Button variant="outline" onClick={() => setManage(b.id)}>Manage {terms.people.toLowerCase()}</Button>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      {form && (
        <BatchForm
          vid={vid} terms={terms} config={config}
          batch={form.id ? form : null}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); loadBatches(); }}
        />
      )}
      {manage && <ManageStudents vid={vid} terms={terms} batchId={manage} onClose={() => setManage(null)} onChanged={loadBatches} />}
    </GymPage>
  );
}