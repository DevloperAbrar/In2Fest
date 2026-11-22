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
import { GymPage, errMsg, fmtDate, inr, todayISO, TextArea, downloadBlob } from "./gymShared.jsx";
import { Surface, EmptyState } from "./gymUi.jsx";
import { useGymVariant } from "./gymVariant.js";

const TYPES = [
  ["tournament", "Tournament"], ["match", "Match"], ["camp", "Camp"], ["trial", "Trial"],
  ["exam", "Exam / grading"], ["recital", "Recital / show"], ["workshop", "Workshop"], ["other", "Other"]
].map(([value, label]) => ({ value, label }));
const STATUS = [["scheduled", "Scheduled"], ["completed", "Completed"], ["cancelled", "Cancelled"]].map(([value, label]) => ({ value, label }));
const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label || t;
const EMPTY = { title: "", type: "tournament", discipline: "", event_date: todayISO(), location: "", fee: "", description: "", status: "scheduled" };

function EventForm({ vid, config, event, onClose, onSaved }) {
  const [f, setF] = useState(event ? Object.fromEntries(Object.entries({ ...EMPTY, ...event }).map(([k, v]) => [k, v === null ? "" : v])) : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { title: f.title, type: f.type, discipline: f.discipline, event_date: f.event_date, location: f.location, fee: f.fee, description: f.description, status: f.status };
      if (event) await gymService.acUpdateEvent(vid, event.id, body); else await gymService.acCreateEvent(vid, body);
      showSuccess("Saved");
      onSaved();
    } catch (e) { showError(errMsg(e)); setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this event and its entries?")) return;
    setBusy(true);
    try { await gymService.acDeleteEvent(vid, event.id); onSaved(); } catch (e) { showError(errMsg(e)); setBusy(false); }
  };
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={event ? "Edit event" : "New event"} size="md">
      <div className="space-y-3">
        <Input label="Title" maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. District U-14 Cricket Tournament" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Type" value={f.type} onChange={(e) => set("type", e.target.value)} options={TYPES} />
          <Select label="For" value={f.discipline} onChange={(e) => set("discipline", e.target.value)} options={[{ value: "", label: "Everyone" }, ...(config?.disciplines || []).map((d) => ({ value: d.key, label: d.label }))]} />
          <Input label="Date" type="date" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} />
          <Input label="Entry fee (₹)" type="number" min={0} value={f.fee} onChange={(e) => set("fee", e.target.value)} />
        </div>
        <Input label="Place" maxLength={120} value={f.location} onChange={(e) => set("location", e.target.value)} />
        {event && <Select label="Status" value={f.status} onChange={(e) => set("status", e.target.value)} options={STATUS} />}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <TextArea rows={3} maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="flex gap-2">
          {event && <Button variant="outline" onClick={remove} disabled={busy}>Delete</Button>}
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1" onClick={save} loading={busy} disabled={!f.title.trim() || !f.event_date}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function ParticipantRow({ vid, eventId, p, onChanged }) {
  const [result, setResult] = useState(p.result || "");
  const patch = async (body) => {
    try { await gymService.acEventPart(vid, eventId, p.id, body); onChanged(); } catch (e) { showError(errMsg(e)); }
  };
  const certificate = async () => {
    try {
      const r = await gymService.acCertificate(vid, eventId, p.id);
      downloadBlob(r.data, `certificate-${p.name.replace(/\W+/g, "_")}.pdf`);
    } catch { showError("Could not create the certificate"); }
  };
  return (
    <div className="px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy-900 truncate">{p.name}</p>
          <p className="text-xs text-navy-400">{p.member_code}</p>
        </div>
        <button type="button" className="text-xs font-semibold text-red-600" onClick={async () => { try { await gymService.acEventRemove(vid, eventId, p.id); onChanged(); } catch (e) { showError(errMsg(e)); } }}>Remove</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={result} maxLength={60} onChange={(e) => setResult(e.target.value)} onBlur={() => result !== (p.result || "") && patch({ result })}
          placeholder="Result (e.g. Gold, Winner, Passed)" className="flex-1 min-w-[10rem] px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm" />
        <label className="flex items-center gap-1.5 text-xs text-navy-600"><input type="checkbox" checked={!!p.fee_paid} onChange={(e) => patch({ fee_paid: e.target.checked })} /> Fee paid</label>
        <button type="button" className="text-xs font-semibold text-primary-600" onClick={certificate}>Certificate</button>
      </div>
    </div>
  );
}

function Participants({ vid, terms, eventId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await gymService.acEvent(vid, eventId); setDetail(r.data.data); }
    catch (e) { showError(errMsg(e)); onClose(); }
  }, [vid, eventId, onClose]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let off = false;
    const t = setTimeout(async () => {
      try { const r = await gymService.acListMembers(vid, { q: q.trim(), limit: 10 }); if (!off) setResults(r.data.data.items || []); }
      catch { if (!off) setResults([]); }
    }, 300);
    return () => { off = true; clearTimeout(t); };
  }, [vid, q]);

  const have = useMemo(() => new Set((detail?.participants || []).map((p) => p.id)), [detail]);
  const candidates = results.filter((m) => !have.has(m.id));
  const refresh = async () => { await load(); onChanged(); };

  const add = async () => {
    setBusy(true);
    try { await gymService.acEventAdd(vid, eventId, [...picked]); setPicked(new Set()); await refresh(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={detail ? detail.event.title : "Entries"} size="lg">
      {!detail ? <Loader /> : (
        <div className="space-y-4">
          <div className="max-h-72 overflow-y-auto divide-y divide-navy-100 border border-navy-100 rounded-xl">
            {detail.participants.length === 0 && <p className="p-3 text-sm text-navy-400">No {terms.people.toLowerCase()} added yet.</p>}
            {detail.participants.map((p) => <ParticipantRow key={p.id} vid={vid} eventId={eventId} p={p} onChanged={refresh} />)}
          </div>
          <div>
            <Input label={`Add ${terms.people.toLowerCase()}`} placeholder="Search by name, mobile or ID" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-navy-100 border border-navy-100 rounded-xl">
              {candidates.length === 0 && <p className="p-3 text-sm text-navy-400">No one to add.</p>}
              {candidates.map((m) => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })} />
                  <span className="text-sm text-navy-900 truncate">{m.name}</span>
                  <span className="text-xs text-navy-400 ml-auto">{m.member_code}</span>
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

export default function AcademyEvents() {
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const { terms } = useGymVariant();
  const isOwner = user?.role !== "team_member";
  const [items, setItems] = useState(null);
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [manage, setManage] = useState(null);

  const load = useCallback(async () => {
    if (!vid) return;
    try { const r = await gymService.acEvents(vid); setItems(r.data.data || []); }
    catch (e) { showError(errMsg(e)); setItems([]); }
  }, [vid]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (vid) gymService.acConfig(vid).then((r) => setConfig(r.data.data)).catch(() => {}); }, [vid]);

  return (
    <GymPage title="Events" subtitle="Tournaments, camps, exams and shows, with entries, results and certificates"
      actions={isOwner ? <Button onClick={() => setForm({})}><Plus size={16} /> New event</Button> : null}>
      {!items ? <Loader /> : items.length === 0 ? (
        <Surface className="p-6"><EmptyState title="No events yet" description="Add a tournament, camp or exam and enter your students." /></Surface>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((e) => (
            <Surface key={e.id} className={`p-4 ${e.status === "cancelled" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900">{e.title}</p>
                  <p className="text-xs text-navy-500">{typeLabel(e.type)} · {fmtDate(e.event_date)}{e.location ? ` · ${e.location}` : ""}</p>
                </div>
                {isOwner && <button type="button" onClick={() => setForm(e)} className="text-xs font-semibold text-primary-600 shrink-0">Edit</button>}
              </div>
              <p className="mt-2 text-xs text-navy-500">
                {e.status === "completed" ? "Completed" : e.status === "cancelled" ? "Cancelled" : "Scheduled"}
                {Number(e.fee) > 0 ? ` · Fee ${inr(e.fee)}` : ""}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-800">{e.participant_count} entered</p>
                <Button variant="outline" onClick={() => setManage(e.id)}>Entries &amp; results</Button>
              </div>
            </Surface>
          ))}
        </div>
      )}
      {form && <EventForm vid={vid} config={config} event={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {manage && <Participants vid={vid} terms={terms} eventId={manage} onClose={() => setManage(null)} onChanged={load} />}
    </GymPage>
  );
}