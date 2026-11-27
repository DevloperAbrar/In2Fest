import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ChevronDown, Download, Pencil, Trash2 } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg, todayISO, fmtDate, downloadBlob } from "./gymShared.jsx";
import { Surface, EmptyState } from "./gymUi.jsx";

const CM_PER_IN = 2.54;
const r1 = (n) => Math.round(n * 10) / 10;
const TONE = { good: "text-emerald-700 bg-emerald-50", warn: "text-amber-700 bg-amber-50", bad: "text-red-700 bg-red-50", neutral: "text-navy-600 bg-navy-50" };
const GROUP_LABEL = { derived: "Calculated" };

function fmtTime(sec) {
  const s = r1(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = r1(s - m * 60);
  return `${m}:${String(Math.floor(rest)).padStart(2, "0")}`;
}

// number (stored in cm / kg / seconds)  ->  text shown to the user
function fmtVal(def, v, unit) {
  if (def.kind === "length") return unit === "in" ? `${r1(v / CM_PER_IN)} in` : `${r1(v)} cm`;
  if (def.kind === "time") return fmtTime(v);
  const n = Number(Number(v).toFixed(def.decimals === 0 ? 0 : def.decimals || 1));
  return def.unit ? (def.unit === "%" ? `${n}%` : `${n} ${def.unit}`) : String(n);
}

// number  ->  text for an input box
function toInput(def, v, unit) {
  if (def.kind === "length" && unit === "in") return String(r1(v / CM_PER_IN));
  if (def.kind === "time" && v >= 60) return fmtTime(v);
  return String(v);
}

// text from an input box  ->  number in cm / kg / seconds  (null = empty, NaN = invalid)
function fromInput(def, raw, unit) {
  const s = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!s) return null;
  let n;
  if (def.kind === "time" && s.includes(":")) {
    const [mm, ss] = s.split(":");
    n = Number(mm) * 60 + Number(ss);
  } else n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return def.kind === "length" && unit === "in" ? r1(n * CM_PER_IN) : n;
}

function MiniLine({ values, color }) {
  if (!values || values.length < 2) return null;
  const v = values.slice(-12);
  const w = 90, h = 28, pad = 3;
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((x, i) => `${pad + (i * (w - pad * 2)) / (v.length - 1)},${h - pad - ((x - min) / span) * (h - pad * 2)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NumField({ def, label, value, onChange, unit }) {
    const isTime = def.kind === "time";
    const suffix = def.kind === "length" ? unit : isTime ? "s or m:ss" : def.unit;
    return (
      <div>
        <label className="block text-xs font-medium text-navy-600 mb-1">{label}{suffix ? <span className="text-navy-400"> ({suffix})</span> : null}</label>
        <input
          type={isTime ? "text" : "number"} inputMode="decimal" step="any"
          value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    );
  }

export default function BodyMeasurementDetail() {
  const { id } = useParams();
  const { venue } = useVenue();
  const vid = venue?.id;

  const [config, setConfig] = useState(null);
  const [view, setView] = useState(null);
  const [unit, setUnit] = useState(() => { try { return localStorage.getItem("gym_body_unit") === "in" ? "in" : "cm"; } catch { return "cm"; } });
  const [rf, setRf] = useState({ date: todayISO(), note: "", values: {} });
  const [open, setOpen] = useState({ size: true });
  const [busy, setBusy] = useState("");

  const sex = view?.member?.sex || null;
  const labelOf = (m) => (sex === "female" && m.label_f ? m.label_f : m.label);

  const formFrom = useCallback((date, v, u) => {
    const rec = (v?.records || []).find((r) => r.date === date);
    const values = {};
    if (rec && config) Object.entries(rec.metrics).forEach(([k, val]) => { const d = config.metrics.find((m) => m.key === k); if (d) values[k] = toInput(d, val, u); });
    return { date, note: rec ? rec.note || "" : "", values };
  }, [config]);

  const load = useCallback(async () => {
    const r = await gymService.bodyMember(vid, id);
    setView(r.data.data);
    return r.data.data;
  }, [vid, id]);

  useEffect(() => {
    if (!vid) return;
    Promise.all([gymService.bodyConfig(vid), gymService.bodyMember(vid, id)])
      .then(([c, v]) => { setConfig(c.data.data); setView(v.data.data); })
      .catch((e) => showError(errMsg(e)));
  }, [vid, id]);

  // fill the form once when both are ready (a record may already exist for today)
  const [primed, setPrimed] = useState(false);
  useEffect(() => {
    if (primed || !config || !view) return;
    setRf(formFrom(rf.date, view, unit));
    setPrimed(true);
  }, [primed, config, view, formFrom, rf.date, unit]);

  const metricsFor = useCallback((gk) => (config?.metrics || []).filter((m) => m.group === gk && (!m.sex || (m.sex === "m" && sex === "male") || (m.sex === "f" && sex === "female"))), [config, sex]);

  const setVal = (k, v) => setRf((p) => ({ ...p, values: { ...p.values, [k]: v } }));
  const changeDate = (d) => setRf(formFrom(d, view, unit));
  const changeUnit = (u) => {
    if (u === unit) return;
    setRf((p) => {
      const values = { ...p.values };
      (config?.metrics || []).forEach((m) => {
        if (m.kind !== "length" || !values[m.key]) return;
        const n = fromInput(m, values[m.key], unit);
        if (n !== null && !Number.isNaN(n)) values[m.key] = toInput(m, n, u);
      });
      return { ...p, values };
    });
    setUnit(u);
    try { localStorage.setItem("gym_body_unit", u); } catch { /* ignore */ }
  };
  const fillLast = () => {
    const last = view?.records?.[0];
    if (!last) return;
    const values = {};
    Object.entries(last.metrics).forEach(([k, val]) => { const d = config.metrics.find((m) => m.key === k); if (d) values[k] = toInput(d, val, unit); });
    setRf((p) => ({ ...p, values }));
  };
  const editRecord = (rec) => { setRf(formFrom(rec.date, view, unit)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const save = async () => {
    const metrics = {};
    for (const m of config.metrics) {
      const n = fromInput(m, rf.values[m.key], unit);
      if (n === null) continue;
      if (Number.isNaN(n)) { showError(`Enter a valid number for ${labelOf(m)}`); return; }
      metrics[m.key] = n;
    }
    if (!Object.keys(metrics).length) { showError("Enter at least one measurement"); return; }
    setBusy("save");
    try {
      await gymService.bodySave(vid, id, { recorded_on: rf.date, note: rf.note, metrics });
      showSuccess("Measurements saved");
      const fresh = await load();
      setRf(formFrom(rf.date, fresh, unit));
    } catch (e) { showError(errMsg(e)); } finally { setBusy(""); }
  };

  const removeRecord = async (rec) => {
    if (!window.confirm(`Delete all readings of ${fmtDate(rec.date)}?`)) return;
    try { await gymService.bodyDelete(vid, rec.id); await load(); } catch (e) { showError(errMsg(e)); }
  };

  const downloadReport = async () => {
    setBusy("pdf");
    try {
      const r = await gymService.bodyReport(vid, id, unit);
      downloadBlob(r.data, `body-report-${String(view.member.name || "member").replace(/\W+/g, "_")}.pdf`);
      showSuccess("Report downloaded");
    } catch { showError("Could not create the report. Please try again."); } finally { setBusy(""); }
  };

  const groups = config?.groups || [];
  const seriesByGroup = useMemo(() => {
    const map = new Map();
    (view?.series || []).forEach((s) => { if (!map.has(s.group)) map.set(s.group, []); map.get(s.group).push(s); });
    return map;
  }, [view]);

  if (!config || !view) return <GymPage title="Body Measurement"><Loader /></GymPage>;

  const m0 = view.member;
  const snap = view.snapshot;
  const insight = (k) => snap.insights.find((i) => i.key === k);
  const wS = view.series.find((s) => s.key === "weight");
  const tiles = [
    { label: "Weight", value: wS ? fmtVal({ kind: "weight", unit: "kg", decimals: 1 }, wS.latest.value) : "-", sub: wS && wS.points.length > 1 ? `${wS.delta > 0 ? "+" : ""}${r1(wS.delta)} kg since first` : "Latest weight", tone: null },
    { label: "BMI", value: snap.derived.bmi !== undefined ? String(snap.derived.bmi) : "-", sub: insight("bmi") ? insight("bmi").note.split(" (")[0] : "Needs weight and height", tone: insight("bmi")?.tone },
    { label: snap.derived.body_fat_source === "estimated" ? "Body fat (est.)" : "Body fat", value: snap.derived.body_fat !== undefined ? `${snap.derived.body_fat}%` : "-", sub: insight("body_fat") ? insight("body_fat").note : "Needs waist and neck", tone: insight("body_fat")?.tone },
    { label: "Waist : hip", value: snap.derived.whr !== undefined ? String(snap.derived.whr) : "-", sub: insight("whr") ? insight("whr").note : "Needs waist and hips", tone: insight("whr")?.tone }
  ];

  const renderGroupFields = (gk) => {
    const list = metricsFor(gk);
    const done = new Set();
    const items = [];
    list.forEach((m) => {
      if (done.has(m.key)) return;
      done.add(m.key);
      if (m.pair) {
        const mate = list.find((x) => x.pair === m.pair && x.key !== m.key);
        if (mate) done.add(mate.key);
        items.push({ pair: true, label: m.pairLabel, a: m, b: mate });
      } else items.push({ pair: false, m });
    });
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pt-3">
        {items.map((it) => it.pair ? (
          <div key={it.a.key} className="sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-navy-600 mb-1">{it.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <NumField def={it.a} label="Right" unit={unit} value={rf.values[it.a.key]} onChange={(v) => setVal(it.a.key, v)} />
              {it.b && <NumField def={it.b} label="Left" unit={unit} value={rf.values[it.b.key]} onChange={(v) => setVal(it.b.key, v)} />}
            </div>
          </div>
        ) : (
          <NumField key={it.m.key} def={it.m} label={labelOf(it.m)} unit={unit} value={rf.values[it.m.key]} onChange={(v) => setVal(it.m.key, v)} />
        ))}
      </div>
    );
  };

  const filled = (gk) => metricsFor(gk).filter((m) => String(rf.values[m.key] ?? "").trim() !== "").length;
  const trendColor = (s) => (s.state === "better" ? "#059669" : s.state === "worse" ? "#dc2626" : "#64748b");

  return (
    <GymPage
      title={m0.name}
      subtitle={`${m0.member_code}${m0.age !== null ? ` · ${m0.age} yrs` : ""}${m0.sex ? ` · ${m0.sex === "male" ? "Male" : "Female"}` : ""}`}
      actions={(
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/gym/body" className="tap-scale inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-navy-200 text-sm font-medium text-navy-700"><ArrowLeft size={15} /> Back</Link>
          {view.series.length > 0 && <Button onClick={downloadReport} loading={busy === "pdf"}><Download size={15} /> Download PDF</Button>}
        </div>
      )}
    >
      <div className="space-y-4">
        {!m0.sex && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Gender is not set for this member. Set it in the member profile to get the right fields, body-fat ranges and waist limits. <Link to={`/dashboard/gym/members/${m0.id}`} className="font-semibold underline">Open profile</Link></span>
          </div>
        )}

        {/* latest numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <Surface key={t.label} className="p-3">
              <p className="text-xl font-bold text-navy-900 truncate">{t.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{t.label}</p>
              <p className={`mt-1 inline-block max-w-full truncate text-xs font-semibold rounded-full px-2 py-0.5 ${t.tone ? TONE[t.tone] : "text-navy-500"}`}>{t.sub}</p>
            </Surface>
          ))}
        </div>

        {snap.insights.length > 0 && (
          <Surface className="p-4">
            <h3 className="font-semibold text-navy-900 mb-2">Health snapshot</h3>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {snap.insights.map((i) => (
                <div key={i.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-navy-600 truncate">{i.label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[i.tone]}`}>{i.value}{i.note ? ` · ${i.note}` : ""}</span>
                </div>
              ))}
            </div>
          </Surface>
        )}

        {/* new measurement */}
        <Surface className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-navy-900">Record measurements</h3>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-navy-200 overflow-hidden text-xs font-semibold" role="group" aria-label="Length unit">
                {["cm", "in"].map((u) => (
                  <button key={u} type="button" onClick={() => changeUnit(u)} className={`px-3 py-1.5 ${unit === u ? "bg-navy-900 text-white" : "bg-white text-navy-700"}`}>{u === "in" ? "inch" : "cm"}</button>
                ))}
              </div>
              {view.records.length > 0 && <button type="button" onClick={fillLast} className="text-xs font-semibold text-primary-600">Fill from last record</button>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" max={todayISO()} value={rf.date} onChange={(e) => changeDate(e.target.value)} />
            <Input label="Note (optional)" maxLength={300} value={rf.note} onChange={(e) => setRf({ ...rf, note: e.target.value })} placeholder="e.g. after 4 weeks of diet" />
          </div>
          {view.records.some((r) => r.date === rf.date) && <p className="mt-2 text-xs text-amber-700">A record already exists for this date. Saving will replace it.</p>}

          <div className="mt-3 divide-y divide-navy-100 border-t border-navy-100">
            {groups.map((g) => {
              const isOpen = !!open[g.key];
              const n = filled(g.key);
              return (
                <div key={g.key} className="py-2">
                  <button type="button" onClick={() => setOpen((p) => ({ ...p, [g.key]: !p[g.key] }))} className="w-full flex items-center justify-between gap-2 text-left" aria-expanded={isOpen}>
                    <span>
                      <span className="text-sm font-semibold text-navy-900">{g.label}</span>
                      <span className="block text-xs text-navy-400">{g.hint}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {n > 0 && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">{n} filled</span>}
                      <ChevronDown size={16} className={`text-navy-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {isOpen && <div className="pb-2">{renderGroupFields(g.key)}</div>}
                </div>
              );
            })}
          </div>
          <Button className="mt-3" onClick={save} loading={busy === "save"}>Save measurements</Button>
        </Surface>

        {/* progress */}
        <Surface className="p-4">
          <h3 className="font-semibold text-navy-900 mb-1">Progress</h3>
          {view.series.length === 0 ? (
            <EmptyState title="No measurements yet" description="Saved readings appear here with a trend line. The weight and height from the member profile are used as the starting point." />
          ) : (
            [...groups.map((g) => g.key), "derived"].map((gk) => {
              const list = seriesByGroup.get(gk);
              if (!list || !list.length) return null;
              const title = GROUP_LABEL[gk] || groups.find((g) => g.key === gk)?.label;
              return (
                <div key={gk} className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400 mb-1">{title}</p>
                  <div className="divide-y divide-navy-100">
                    {list.map((s) => (
                      <div key={s.key} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy-900 truncate">{sex === "female" && s.label_f ? s.label_f : s.label}</p>
                          <p className="text-xs text-navy-400">{fmtDate(s.latest.date)} · {s.points.length} record{s.points.length === 1 ? "" : "s"}</p>
                        </div>
                        <MiniLine values={s.points.map((p) => p.value)} color={trendColor(s)} />
                        <div className="text-right shrink-0 min-w-[84px]">
                          <p className="text-base font-bold text-navy-900">{fmtVal(s, s.latest.value, unit)}</p>
                          {s.state !== "first" && s.state !== "same" && (
                            <p className={`text-xs font-semibold ${s.state === "better" ? "text-emerald-600" : s.state === "worse" ? "text-red-600" : "text-navy-400"}`}>
                              {s.delta > 0 ? "+" : "-"}{fmtVal(s, Math.abs(s.delta), unit)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </Surface>

        {/* history */}
        {view.records.length > 0 && (
          <Surface className="p-4">
            <h3 className="font-semibold text-navy-900 mb-2">Records</h3>
            <div className="divide-y divide-navy-100">
              {view.records.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">{fmtDate(r.date)}</p>
                    <p className="text-xs text-navy-400 truncate">{Object.keys(r.metrics).length} readings{r.metrics.weight ? ` · ${r.metrics.weight} kg` : ""}{r.note ? ` · ${r.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" onClick={() => editRecord(r)} className="text-xs font-semibold text-primary-600 inline-flex items-center gap-1"><Pencil size={12} /> Edit</button>
                    <button type="button" onClick={() => removeRecord(r)} className="text-xs font-semibold text-red-600 inline-flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {view.truncated && <p className="mt-2 text-xs text-navy-400">Showing the latest 1000 records.</p>}
          </Surface>
        )}
      </div>
    </GymPage>
  );
}