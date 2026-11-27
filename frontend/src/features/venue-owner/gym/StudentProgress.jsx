import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, MessageCircle, Plus } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg, todayISO, fmtDate, waUrl, TextArea, downloadBlob } from "./gymShared.jsx";
import { Surface, EmptyState } from "./gymUi.jsx";
import { useGymVariant } from "./gymVariant.js";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMPTY_PROFILE = { disciplines: [], fields: {}, levels: {}, school: "", blood_group: "", kit_size: "", parent_phone: "", medical_notes: "" };

const fmtVal = (v, unit) => (unit ? (unit.startsWith("/") ? `${v}${unit}` : `${v} ${unit}`) : String(v));

function MiniLine({ values, better }) {
  if (!values || values.length < 2) return null;
  const w = 120, h = 32, pad = 3;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${pad + (i * (w - pad * 2)) / (values.length - 1)},${h - pad - ((v - min) / span) * (h - pad * 2)}`).join(" ");
  const first = values[0], last = values[values.length - 1];
  const good = better === "lower" ? last < first : better === "higher" ? last > first : null;
  const stroke = good === null ? "#64748b" : good ? "#059669" : "#dc2626";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TestModal({ vid, config, onClose, onSaved }) {
  const [f, setF] = useState({ name: "", unit: "", better: "lower", kind: "measure", discipline: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    try { await gymService.acCreateTest(vid, f); showSuccess("Test added"); onSaved(); }
    catch (e) { showError(errMsg(e)); setBusy(false); }
  };
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title="Add your own test" size="sm">
      <div className="space-y-3">
        <Input label="Test name" maxLength={80} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 50 m sprint" />
        <Select label="Type" value={f.kind} onChange={(e) => set("kind", e.target.value)}
          options={[{ value: "measure", label: "Number (time, distance, count)" }, { value: "rating", label: "Rating 1 to 5" }]} />
        {f.kind === "measure" && (
          <>
            <Input label="Unit" maxLength={15} value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="s, m, cm, kg, count" />
            <Select label="Better result is" value={f.better} onChange={(e) => set("better", e.target.value)}
              options={[{ value: "lower", label: "Lower (time)" }, { value: "higher", label: "Higher (distance, count)" }, { value: "none", label: "Just record it" }]} />
          </>
        )}
        <Select label="For" value={f.discipline} onChange={(e) => set("discipline", e.target.value)}
          options={[{ value: "", label: "Everyone" }, ...(config?.disciplines || []).map((d) => ({ value: d.key, label: d.label }))]} />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1" onClick={save} loading={busy} disabled={!f.name.trim()}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function StudentProgress() {
  const { id } = useParams();
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const { terms } = useGymVariant();

  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [pf, setPf] = useState(EMPTY_PROFILE);
  const [progress, setProgress] = useState(null);
  const [rf, setRf] = useState({ date: todayISO(), note: "", values: {} });
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(null);
  const [testModal, setTestModal] = useState(false);
  const isOwner = user?.role !== "team_member";

  const loadConfig = useCallback(async () => {
    const r = await gymService.acConfig(vid);
    setConfig(r.data.data);
  }, [vid]);
  const loadProfile = useCallback(async () => {
    const r = await gymService.acProfile(vid, id);
    setData(r.data.data);
    setPf({ ...EMPTY_PROFILE, ...r.data.data.profile });
  }, [vid, id]);
  const loadProgress = useCallback(async () => {
    const r = await gymService.acProgress(vid, id);
    setProgress(r.data.data.items || []);
  }, [vid, id]);

  useEffect(() => {
    if (!vid) return;
    Promise.all([loadConfig(), loadProfile(), loadProgress()]).catch((e) => showError(errMsg(e)));
  }, [vid, loadConfig, loadProfile, loadProgress]);

  const discMap = useMemo(() => Object.fromEntries((config?.disciplines || []).map((d) => [d.key, d])), [config]);

  const groups = useMemo(() => {
    if (!config) return [];
    const out = [];
    if (config.common_tests?.length) out.push({ title: "Fitness tests", tests: config.common_tests });
    pf.disciplines.forEach((dk) => {
      const d = discMap[dk];
      if (!d) return;
      if (d.tests.length) out.push({ title: `${d.label}: tests`, tests: d.tests });
      if (d.skills.length) out.push({ title: `${d.label}: skills (1 to 5)`, tests: d.skills });
    });
    const custom = (config.custom_tests || []).filter((t) => t.is_active && (!t.discipline || pf.disciplines.includes(t.discipline)));
    if (custom.length) out.push({ title: "Your tests", tests: custom });
    return out;
  }, [config, pf.disciplines, discMap]);

  const toggleDisc = (k) => setPf((p) => ({ ...p, disciplines: p.disciplines.includes(k) ? p.disciplines.filter((x) => x !== k) : [...p.disciplines, k] }));
  const setField = (dk, fk, v) => setPf((p) => ({ ...p, fields: { ...p.fields, [dk]: { ...(p.fields[dk] || {}), [fk]: v } } }));
  const setLevel = (dk, v) => setPf((p) => ({ ...p, levels: { ...p.levels, [dk]: v } }));

  const saveProfile = async () => {
    setBusy("profile");
    try {
      await gymService.acSaveProfile(vid, id, pf);
      showSuccess("Saved");
      await loadProfile();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(""); }
  };

  const saveResults = async () => {
    const entries = Object.entries(rf.values).filter(([, v]) => v !== "" && v !== null && v !== undefined).map(([test_key, value]) => ({ test_key, value: Number(value) }));
    if (!entries.length) { showError("Enter at least one result"); return; }
    setBusy("results");
    try {
      await gymService.acRecord(vid, id, { recorded_on: rf.date, note: rf.note, entries });
      showSuccess("Results saved");
      setRf({ date: todayISO(), note: "", values: {} });
      await loadProgress();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(""); }
  };

  const removeResult = async (rid) => {
    if (!window.confirm("Delete this result?")) return;
    try { await gymService.acDeleteResult(vid, rid); await loadProgress(); } catch (e) { showError(errMsg(e)); }
  };

  const shareText = () => {
    const lines = (progress || []).map((p) => `• ${p.label}: ${fmtVal(p.latest.value, p.unit)}${p.delta !== null && p.delta !== 0 ? ` (${p.delta > 0 ? "+" : ""}${p.delta} since last time)` : ""}`);
    return `Progress update for ${data.member.name}\n${venue?.name || ""}\n\n${lines.join("\n")}\n\nThank you for your support.`;
  };
  const sendWhatsApp = () => {
    const phone = pf.parent_phone || data.member.phone;
    window.open(waUrl(`91${phone}`, shareText()), "_blank", "noopener");
  };

  const downloadReport = async () => {
    setBusy("report");
    try {
      const r = await gymService.acProgressReport(vid, id);
      downloadBlob(r.data, `progress-report-${String(data.member.name || "student").replace(/\W+/g, "_")}.pdf`);
      showSuccess("Report downloaded");
    } catch { showError("Could not create the report. Please try again."); } finally { setBusy(""); }
  };

  if (!data || !config || !progress) return <GymPage title="Progress"><Loader /></GymPage>;

  const setVal = (key, v) => setRf((p) => ({ ...p, values: { ...p.values, [key]: v } }));

  return (
    <GymPage
      title={data.member.name}
      subtitle={`${data.member.member_code}${data.member.age !== null ? ` · ${data.member.age} yrs` : ""}${data.batches.length ? ` · ${data.batches.map((b) => b.name).join(", ")}` : ""}`}
      actions={<Link to="/dashboard/gym/progress" className="tap-scale inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-navy-200 text-sm font-medium text-navy-700"><ArrowLeft size={15} /> Back</Link>}
    >
      <div className="space-y-4">
        {/* Profile */}
        <Surface className="p-4">
          <h3 className="font-semibold text-navy-900 mb-3">{config.variant.group === "studio" ? "Class details" : "Sport details"}</h3>
          <p className="text-xs text-navy-500 mb-2">{config.variant.group === "studio" ? "Which classes does this member take?" : "Which sports does this student play?"}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {config.disciplines.map((d) => (
              <button key={d.key} type="button" onClick={() => toggleDisc(d.key)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium ${pf.disciplines.includes(d.key) ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}>
                {d.label}
              </button>
            ))}
          </div>

          {pf.disciplines.map((dk) => {
            const d = discMap[dk];
            if (!d) return null;
            return (
              <div key={dk} className="rounded-xl border border-navy-100 p-3 mb-3">
                <p className="text-sm font-semibold text-navy-800 mb-2">{d.label}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {d.levels.length > 0 && (
                    <Select label={d.level_label} value={pf.levels[dk] || ""} onChange={(e) => setLevel(dk, e.target.value)}
                      options={[{ value: "", label: "Not set" }, ...d.levels.map((l) => ({ value: l, label: l }))]} />
                  )}
                  {d.fields.map((fd) => fd.type === "select" ? (
                    <Select key={fd.key} label={fd.label} value={pf.fields[dk]?.[fd.key] || ""} onChange={(e) => setField(dk, fd.key, e.target.value)}
                      options={[{ value: "", label: "Not set" }, ...fd.options.map((o) => ({ value: o, label: o }))]} />
                  ) : (
                    <Input key={fd.key} label={fd.label} maxLength={fd.max || 40} value={pf.fields[dk]?.[fd.key] || ""} onChange={(e) => setField(dk, fd.key, e.target.value)} />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="School / college" maxLength={120} value={pf.school} onChange={(e) => setPf({ ...pf, school: e.target.value })} />
            <Input label="Parent mobile" inputMode="numeric" maxLength={14} value={pf.parent_phone} onChange={(e) => setPf({ ...pf, parent_phone: e.target.value })} />
            <Select label="Blood group" value={pf.blood_group} onChange={(e) => setPf({ ...pf, blood_group: e.target.value })} options={[{ value: "", label: "Not set" }, ...BLOOD.map((b) => ({ value: b, label: b }))]} />
            <Input label="Kit / uniform size" maxLength={10} value={pf.kit_size} onChange={(e) => setPf({ ...pf, kit_size: e.target.value })} />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Injury or medical note</label>
            <TextArea rows={2} maxLength={1000} value={pf.medical_notes} onChange={(e) => setPf({ ...pf, medical_notes: e.target.value })} />
          </div>
          <Button className="mt-3" onClick={saveProfile} loading={busy === "profile"}>Save details</Button>
        </Surface>

        {/* Record results */}
        <Surface className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-navy-900">Record results</h3>
            {isOwner && <button type="button" onClick={() => setTestModal(true)} className="text-xs font-semibold text-primary-600 inline-flex items-center gap-1"><Plus size={13} /> Add your own test</button>}
          </div>
          {groups.length === 0 ? (
            <EmptyState title="Choose a sport or class above" description="Tests appear here once you pick what this student does." />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <Input label="Date" type="date" max={todayISO()} value={rf.date} onChange={(e) => setRf({ ...rf, date: e.target.value })} />
                <Input label="Note (optional)" maxLength={200} value={rf.note} onChange={(e) => setRf({ ...rf, note: e.target.value })} />
              </div>
              {groups.map((g) => (
                <div key={g.title} className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400 mb-2">{g.title}</p>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                    {g.tests.map((t) => (
                      <div key={t.key} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-navy-800">{t.label}{t.kind !== "rating" && t.unit ? <span className="text-navy-400"> ({t.unit})</span> : null}</span>
                        {t.kind === "rating" ? (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" onClick={() => setVal(t.key, rf.values[t.key] === n ? "" : n)}
                                className={`w-8 h-8 rounded-lg text-sm font-semibold border ${rf.values[t.key] === n ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}>{n}</button>
                            ))}
                          </div>
                        ) : (
                          <input type="number" step="any" min="0" inputMode="decimal" value={rf.values[t.key] ?? ""} onChange={(e) => setVal(t.key, e.target.value)}
                            className="w-24 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={saveResults} loading={busy === "results"}>Save results</Button>
            </>
          )}
        </Surface>

        {/* Progress */}
        <Surface className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-navy-900">Progress</h3>
            {progress.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={sendWhatsApp}><MessageCircle size={15} /> Send to parent</Button>
                <Button onClick={downloadReport} loading={busy === "report"}><Download size={15} /> Download PDF</Button>
              </div>
            )}
          </div>
          {progress.length === 0 ? (
            <EmptyState title="No results yet" description="Saved results appear here with a trend line." />
          ) : (
            <div className="divide-y divide-navy-100">
              {progress.map((p) => (
                <div key={p.test_key} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{p.label}</p>
                      <p className="text-xs text-navy-400">Last: {fmtDate(p.latest.date)}{p.best !== null ? ` · Best ${fmtVal(p.best, p.unit)}` : ""}</p>
                    </div>
                    <MiniLine values={p.series.map((s) => s.value)} better={p.better} />
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-navy-900">{fmtVal(p.latest.value, p.unit)}</p>
                      {p.delta !== null && p.delta !== 0 && (
                        <p className={`text-xs font-semibold ${p.improved === null ? "text-navy-400" : p.improved ? "text-emerald-600" : "text-red-600"}`}>
                          {p.delta > 0 ? "+" : ""}{p.delta}{p.improved === true ? " better" : p.improved === false ? " slower" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="button" className="mt-1 text-xs font-semibold text-primary-600" onClick={() => setOpen(open === p.test_key ? null : p.test_key)}>
                    {open === p.test_key ? "Hide history" : `History (${p.series.length})`}
                  </button>
                  {open === p.test_key && (
                    <div className="mt-2 rounded-xl bg-navy-50/60 divide-y divide-navy-100">
                      {[...p.series].reverse().map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="text-navy-600">{fmtDate(s.date)}{s.note ? ` · ${s.note}` : ""}</span>
                          <span className="flex items-center gap-3">
                            <b className="text-navy-900">{fmtVal(s.value, p.unit)}</b>
                            <button type="button" onClick={() => removeResult(s.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>

      {testModal && <TestModal vid={vid} config={config} onClose={() => setTestModal(false)} onSaved={async () => { setTestModal(false); await loadConfig(); }} />}
    </GymPage>
  );
}