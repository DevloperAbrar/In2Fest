import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Search, Download, Copy, Phone, MessageCircle, Trash2, Plus, RefreshCw, ClipboardList, BarChart3, QrCode } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import KpiCard from "../../../components/common/KpiCard";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg, todayISO, fmtDate, downloadBlob, copyText, waUrl } from "./gymShared.jsx";

/* ---------- small helpers ---------- */
const ymdMs = (ymd) => { const [y, m, d] = String(ymd).split("-").map(Number); return Date.UTC(y, m - 1, d); };
const addDays = (ymd, n) => new Date(ymdMs(ymd) + n * 86400000).toISOString().slice(0, 10);
const monthStart = (ymd) => `${ymd.slice(0, 8)}01`;
const prevMonthRange = (ymd) => {
  const [y, m] = ymd.split("-").map(Number);
  return [new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10), new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10)];
};
const dayLabel = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase() : "");
const hourLabel = (h) => (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`);
const hourRange = (h) => `${hourLabel(h).replace(/([ap])$/, " $1m")} - ${hourLabel((h + 1) % 24).replace(/([ap])$/, " $1m")}`;
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const chip = (on) => `px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-colors ${on ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-200"}`;

function Avatar({ m }) {
  return m.photo_url
    ? <img src={m.photo_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
    : <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold flex-shrink-0">{String(m.name || "?")[0]}</div>;
}

/* ================= 1. REGISTER (mark attendance) ================= */
function Register({ vid }) {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const { data, loading, refetch } = useFetch(`/venues/${vid}/gym/attendance/day?date=${date}`);

  useEffect(() => { if (data && data.date === date) setRows(data.items || []); }, [data, date]);

  const present = rows.filter((r) => r.att_status === "present").length;
  const absent = rows.filter((r) => r.att_status === "absent").length;
  const unmarked = rows.length - present - absent;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "present" && r.att_status !== "present") return false;
      if (filter === "absent" && r.att_status !== "absent") return false;
      if (filter === "none" && r.att_status) return false;
      return !s || String(r.name).toLowerCase().includes(s) || String(r.member_code).toLowerCase().includes(s) || String(r.phone).includes(s);
    });
  }, [rows, q, filter]);

  const mark = async (m, status) => {
    const next = m.att_status === status ? "clear" : status;
    setRows((rs) => rs.map((r) => (r.id === m.id ? {
      ...r, att_status: next === "clear" ? null : next, source: "manual",
      check_in_at: next === "present" && date === today ? new Date().toISOString() : null
    } : r)));
    try { await gymService.attPost(vid, "/mark", { date, member_id: m.id, status: next }); }
    catch (e) { showError(errMsg(e)); refetch(); }
  };

  const markAll = async () => {
    setBusyAll(true);
    try {
      const r = await gymService.attPost(vid, "/mark-all", { date, status: "present" });
      showSuccess(`${r.data.data.marked} members marked present`);
      setConfirmAll(false);
      refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusyAll(false); }
  };

  const ready = !loading && data && data.date === date;
  const sub = (r) => {
    if (r.att_status === "present") return `Present${r.check_in_at ? ` · ${fmtTime(r.check_in_at)}` : ""} · ${r.source === "qr" ? "by QR" : "by staff"}`;
    if (r.att_status === "absent") return "Marked absent";
    return "Not marked yet";
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => setDate(addDays(date, -1))} className="w-11 h-11 rounded-xl border border-navy-200 bg-white flex items-center justify-center" aria-label="Previous day"><ChevronLeft size={20} /></button>
        <div className="flex-1 min-w-[170px]">
          <input type="date" max={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-full h-11 px-3 border border-navy-200 rounded-xl text-sm font-semibold text-navy-900 bg-white" />
        </div>
        <button disabled={date >= today} onClick={() => setDate(addDays(date, 1))} className="w-11 h-11 rounded-xl border border-navy-200 bg-white flex items-center justify-center disabled:opacity-40" aria-label="Next day"><ChevronRight size={20} /></button>
        {date !== today && <Button variant="outline" onClick={() => setDate(today)}>Today</Button>}
      </div>
      <p className="text-sm font-semibold text-navy-800 mb-2">{dayLabel(date)}{date === today ? " (Today)" : ""}</p>

      {ready && data.off_reason && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3 mb-3"><b>{data.off_reason}</b> — gym is closed this day. You can still mark attendance if someone came.</p>
      )}

      {!ready ? <Loader /> : rows.length === 0 ? (
        <EmptyState title="No active members on this day" description="Members with a running membership on this date will show here." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[["present", "Present", present, "text-emerald-700 bg-emerald-50 border-emerald-200"], ["absent", "Absent", absent, "text-red-700 bg-red-50 border-red-200"], ["none", "Not marked", unmarked, "text-navy-700 bg-navy-50 border-navy-200"]].map(([k, label, n, cls]) => (
              <button key={k} onClick={() => setFilter(filter === k ? "all" : k)}
                className={`rounded-2xl border p-3 text-center ${cls} ${filter === k ? "ring-2 ring-navy-900" : ""}`}>
                <p className="text-2xl font-bold">{n}</p><p className="text-xs font-medium">{label}</p>
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9" placeholder="Search name, mobile or member ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {unmarked > 0 && filter !== "present" && (
            <button onClick={() => setConfirmAll(true)} className="w-full mb-3 h-11 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-semibold">
              Mark all {unmarked} not-marked members as Present
            </button>
          )}

          <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
            {list.length === 0 && <p className="text-sm text-gray-400 p-4">No members found.</p>}
            {list.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-3">
                <Avatar m={m} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-navy-900 truncate">{m.name}</p>
                  <p className="text-xs text-navy-400 truncate">{m.member_code} · {sub(m)}{m.member_status === "frozen" ? " · Frozen" : ""}</p>
                </div>
                <button onClick={() => mark(m, "present")} aria-label="Present"
                  className={`h-11 px-3 sm:px-4 rounded-xl text-sm font-bold flex items-center gap-1 border ${m.att_status === "present" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-300"}`}>
                  <Check size={17} /><span className="hidden sm:inline">Present</span>
                </button>
                <button onClick={() => mark(m, "absent")} aria-label="Absent"
                  className={`h-11 px-3 sm:px-4 rounded-xl text-sm font-bold flex items-center gap-1 border ${m.att_status === "absent" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-300"}`}>
                  <X size={17} /><span className="hidden sm:inline">Absent</span>
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-navy-400 mt-2">Tap a button again to remove the mark. Members you did not mark are counted as absent in reports.</p>
          {data.truncated && <p className="text-xs text-amber-700 mt-1">Only the first 1500 members are shown. Use search to find others.</p>}
        </>
      )}

      <ConfirmDialog isOpen={confirmAll} onClose={() => setConfirmAll(false)} title="Mark everyone present?" confirmText="Yes, mark present" variant="primary" loading={busyAll}
        message={`${unmarked} members who are not marked yet will be marked Present for ${dayLabel(date)}. You can change any of them afterwards.`} onConfirm={markAll} />
    </>
  );
}

/* ================= 2. REPORTS ================= */
function Bars({ items, height = 112, color = "bg-primary-500" }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: height + 34 }}>
      {items.map((i) => (
        <div key={i.key} title={i.title} className="flex flex-col items-center justify-end flex-1 min-w-[20px]">
          <span className="text-[10px] text-navy-500 mb-0.5 h-3">{i.value > 0 ? i.value : ""}</span>
          <div className={`w-full rounded-t ${i.muted ? "bg-navy-100" : i.highlight ? "bg-emerald-500" : color}`} style={{ height: Math.max(Math.round((i.value / max) * height), i.value > 0 ? 4 : 2) }} />
          <span className="text-[10px] text-navy-400 mt-1">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function Reports({ vid }) {
  const today = todayISO();
  const [range, setRange] = useState("month");
  const [inactiveDays, setInactiveDays] = useState("7");
  const [from, to] = useMemo(() => {
    if (range === "week") return [addDays(today, -6), today];
    if (range === "30") return [addDays(today, -29), today];
    if (range === "last") return prevMonthRange(today);
    return [monthStart(today), today];
  }, [range, today]);
  const { data: d, loading } = useFetch(`/venues/${vid}/gym/attendance/analytics?from=${from}&to=${to}&inactive_days=${inactiveDays}`);

  const ranges = [["week", "Last 7 days"], ["month", "This month"], ["last", "Last month"], ["30", "Last 30 days"]];
  return (
    <>
      <div className="flex gap-1.5 mb-4 overflow-x-auto">{ranges.map(([k, l]) => <button key={k} onClick={() => setRange(k)} className={chip(range === k)}>{l}</button>)}</div>
      {loading || !d ? <Loader /> : (
        <>
          {!d.tracking_started && <p className="text-sm text-sky-800 bg-sky-50 rounded-xl px-4 py-3 mb-4">No attendance has been marked yet. Reports fill up automatically as you mark attendance or members scan the QR.</p>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard label="Today present" value={`${d.today_snapshot.present} / ${d.today_snapshot.expected}`} sublabel="of active members" accent="#16a34a" />
            <KpiCard label="Total check-ins" value={d.summary.total_checkins} sublabel={`${d.summary.working_days} open days`} accent="#2563eb" />
            <KpiCard label="Average per day" value={d.summary.avg_per_day} sublabel={d.summary.peak_hour != null ? `Busiest: ${hourRange(d.summary.peak_hour)}` : "members per open day"} accent="#7c3aed" />
            <KpiCard label="Attendance rate" value={d.summary.rate != null ? `${d.summary.rate}%` : "-"} sublabel={`${d.summary.unique_members} members came`} accent="#dc2626" />
          </div>

          <Card title="Members present each day" className="mb-3">
            <Bars items={d.days.map((x) => ({
              key: x.date, value: x.present, label: x.date.slice(8), muted: !!x.off,
              title: `${dayLabel(x.date)}: ${x.present} present${x.off ? ` (${x.off})` : ""}`
            }))} />
            <p className="text-xs text-navy-400 mt-1">Grey bars are off days / holidays.</p>
          </Card>

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <Card title="Busy hours">
              {d.hours.every((h) => h.count === 0) ? <p className="text-sm text-gray-400">Times are saved for QR check-ins and for attendance marked on the same day.</p> : (
                <Bars height={90} items={d.hours.filter((h) => h.hour >= 4 && h.hour <= 23).map((h) => ({ key: h.hour, value: h.count, label: hourLabel(h.hour), highlight: h.hour === d.summary.peak_hour, title: `${hourRange(h.hour)}: ${h.count} check-ins` }))} />
              )}
            </Card>
            <Card title="Average by weekday">
              <Bars height={90} color="bg-violet-500" items={d.weekdays.map((w) => ({ key: w.dow, value: w.avg, label: WEEK[w.dow], title: `${w.name}: ${w.avg} on average` }))} />
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Most regular members">
              {d.regulars.length === 0 ? <p className="text-sm text-gray-400">No attendance in this period.</p> : d.regulars.map((m, i) => (
                <div key={m.id} className="py-2 flex justify-between gap-2 border-b last:border-0 text-sm">
                  <span className="truncate">{i + 1}. {m.name} <span className="text-gray-400">{m.member_code}</span></span>
                  <span className="font-semibold whitespace-nowrap">{m.days} days</span>
                </div>
              ))}
            </Card>
            <Card title="Not coming lately">
              <div className="w-44 mb-2"><Select value={inactiveDays} onChange={(e) => setInactiveDays(e.target.value)} options={[{ value: "7", label: "Not seen in 7 days" }, { value: "14", label: "Not seen in 14 days" }, { value: "30", label: "Not seen in 30 days" }]} /></div>
              {!d.inactive_ready ? <p className="text-sm text-gray-400">This list appears after attendance has been used for {d.inactive_days} days.</p>
                : d.inactive.length === 0 ? <p className="text-sm text-gray-400">Everyone has visited recently. 🎉</p> : d.inactive.map((m) => (
                  <div key={m.id} className="py-2 flex items-center justify-between gap-2 border-b last:border-0 text-sm">
                    <div className="min-w-0"><p className="truncate font-medium">{m.name} <span className="text-gray-400 font-normal">{m.member_code}</span></p>
                      <p className="text-xs text-gray-500">{m.last_visit ? `Last visit ${fmtDate(m.last_visit)}` : "No visit recorded"}</p></div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <a href={`tel:+91${m.phone}`} className="w-9 h-9 rounded-lg border flex items-center justify-center text-primary-600" aria-label="Call"><Phone size={15} /></a>
                      <a href={waUrl(`91${m.phone}`, `Hi ${String(m.name).split(" ")[0]}, we missed you at the gym! Hope all is well. Come back soon 💪`)} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border flex items-center justify-center text-emerald-600" aria-label="WhatsApp"><MessageCircle size={15} /></a>
                    </div>
                  </div>
                ))}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

/* ================= 3. QR + SETTINGS ================= */
function QrSettings({ vid, canEdit }) {
  const { data, loading, refetch } = useFetch(`/venues/${vid}/gym/attendance/settings`);
  const [f, setF] = useState(null);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [hol, setHol] = useState({ date: "", name: "" });

  useEffect(() => {
    if (data) setF({ weekly_off: data.weekly_off || [], holidays: data.holidays || [], qr_enabled: !!data.qr_enabled, require_phone: !!data.require_phone });
  }, [data]);

  // The QR picture needs the login, so it is fetched as a file.
  const qrKey = data?.checkin_url;
  useEffect(() => {
    if (!qrKey) return undefined;
    let off = false;
    let url = "";
    gymService.attBlob(vid, "/qr.png").then((r) => { if (!off) { url = URL.createObjectURL(r.data); setQr(url); } }).catch(() => {});
    return () => { off = true; if (url) URL.revokeObjectURL(url); };
  }, [vid, qrKey]);

  if (loading || !data || !f) return <Loader />;

  const dirty = JSON.stringify(f) !== JSON.stringify({ weekly_off: data.weekly_off || [], holidays: data.holidays || [], qr_enabled: !!data.qr_enabled, require_phone: !!data.require_phone });
  const toggleDay = (i) => setF((s) => ({ ...s, weekly_off: s.weekly_off.includes(i) ? s.weekly_off.filter((x) => x !== i) : [...s.weekly_off, i].sort() }));
  const addHoliday = () => {
    if (!hol.date) return;
    setF((s) => ({ ...s, holidays: [...s.holidays.filter((h) => h.date !== hol.date), { date: hol.date, name: hol.name.trim() }].sort((a, b) => a.date.localeCompare(b.date)) }));
    setHol({ date: "", name: "" });
  };

  const save = async () => {
    setBusy(true);
    try { await gymService.attPut(vid, "/settings", f); showSuccess("Saved"); refetch(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const poster = async () => {
    try { downloadBlob((await gymService.attBlob(vid, "/poster.pdf")).data, "attendance-qr-poster.pdf"); } catch { showError("Could not download the poster"); }
  };
  const png = async () => {
    try { downloadBlob((await gymService.attBlob(vid, "/qr.png", { download: 1 })).data, "attendance-qr.png"); } catch { showError("Could not download the QR"); }
  };
  const copy = async () => ((await copyText(data.checkin_url)) ? showSuccess("Link copied") : showError("Could not copy"));
  const regenerate = async () => {
    setBusy(true);
    try { await gymService.attPost(vid, "/qr/regenerate", {}); setConfirmNew(false); showSuccess("New QR created. Print the new poster."); refetch(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const Toggle = ({ on, onChange, label, hint }) => (
    <label className="flex items-start gap-3 py-2">
      <input type="checkbox" className="mt-1 w-5 h-5" checked={on} disabled={!canEdit} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block text-sm font-semibold text-navy-900">{label}</span>{hint && <span className="block text-xs text-navy-400">{hint}</span>}</span>
    </label>
  );

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <Card title="Your gym's attendance QR">
        <div className="flex flex-col items-center">
          {qr ? <img src={qr} alt="Attendance QR code" className="w-56 h-56 border rounded-2xl p-2 bg-white" /> : <div className="w-56 h-56 flex items-center justify-center"><Loader /></div>}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button onClick={poster}><Download size={15} /> Download poster (PDF)</Button>
            <Button variant="outline" onClick={png}>QR image</Button>
            <Button variant="outline" onClick={copy}><Copy size={14} /> Copy link</Button>
          </div>
        </div>
        <ol className="text-sm text-navy-700 space-y-1.5 mt-4 list-decimal pl-5">
          <li>Print the poster and stick it at your gym entrance.</li>
          <li>Member scans it with the phone camera.</li>
          <li>Member types their Member ID (or mobile number) and taps <b>Mark Attendance</b>.</li>
        </ol>
        <p className="text-xs text-navy-400 mt-3">This QR belongs only to your gym. Expired and frozen members cannot mark attendance.</p>
        {canEdit && <button onClick={() => setConfirmNew(true)} className="mt-3 text-xs text-red-600 flex items-center gap-1"><RefreshCw size={12} /> Create a new QR (old poster stops working)</button>}
      </Card>

      <div className="space-y-3">
        <Card title="QR rules">
          <Toggle on={f.qr_enabled} onChange={(v) => setF((s) => ({ ...s, qr_enabled: v }))} label="QR attendance is ON" hint="Switch off to stop members from marking attendance themselves." />
          <Toggle on={f.require_phone} onChange={(v) => setF((s) => ({ ...s, require_phone: v }))} label="Also ask last 4 digits of mobile" hint="Safer: stops a friend from marking attendance with your ID." />
        </Card>

        <Card title="Weekly off day">
          <div className="flex flex-wrap gap-2">
            {WEEK.map((w, i) => (
              <button key={w} disabled={!canEdit} onClick={() => toggleDay(i)} className={chip(f.weekly_off.includes(i))}>{w}</button>
            ))}
          </div>
          <p className="text-xs text-navy-400 mt-2">Selected days are counted as gym closed. Members are not marked absent on these days.</p>
        </Card>

        <Card title="Festival / holiday off">
          {canEdit && (
            <div className="grid grid-cols-5 gap-2 items-end mb-3">
              <div className="col-span-2"><Input label="Date" type="date" value={hol.date} onChange={(e) => setHol((s) => ({ ...s, date: e.target.value }))} /></div>
              <div className="col-span-2"><Input label="Name (optional)" placeholder="Diwali" maxLength={60} value={hol.name} onChange={(e) => setHol((s) => ({ ...s, name: e.target.value }))} /></div>
              <Button onClick={addHoliday} disabled={!hol.date}><Plus size={15} /> Add</Button>
            </div>
          )}
          {f.holidays.length === 0 ? <p className="text-sm text-gray-400">No holidays added.</p> : f.holidays.map((h) => (
            <div key={h.date} className="py-2 flex items-center justify-between gap-2 border-b last:border-0 text-sm">
              <span><b>{fmtDate(h.date)}</b> {h.name && <span className="text-gray-500">· {h.name}</span>}</span>
              {canEdit && <button onClick={() => setF((s) => ({ ...s, holidays: s.holidays.filter((x) => x.date !== h.date) }))} className="p-1 text-gray-400 hover:text-red-600" aria-label="Remove"><Trash2 size={15} /></button>}
            </div>
          ))}
        </Card>

        {canEdit ? <Button className="w-full" onClick={save} loading={busy} disabled={!dirty}>Save settings</Button>
          : <p className="text-xs text-navy-400">Only the owner can change these settings.</p>}
      </div>

      <ConfirmDialog isOpen={confirmNew} onClose={() => setConfirmNew(false)} title="Create a new QR?" confirmText="Create new QR" loading={busy}
        message="The old poster will stop working immediately. You must print and stick the new poster." onConfirm={regenerate} />
    </div>
  );
}

/* ================= page ================= */
export default function GymAttendance() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { user } = useAuth();
  const canEdit = user?.role !== "team_member" || !!user?.isDemo;
  const [tab, setTab] = useState("register");

  if (!vid) return <GymPage title="Attendance"><Loader /></GymPage>;

  const tabs = [["register", "Mark attendance", ClipboardList], ["reports", "Reports", BarChart3], ["qr", "QR & settings", QrCode]];
  return (
    <GymPage title="Attendance" subtitle="Daily register, QR check-in and reports for your members">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {tabs.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`h-14 rounded-2xl border flex items-center justify-center gap-2 text-sm font-bold ${tab === k ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </div>
      {tab === "register" && <Register vid={vid} />}
      {tab === "reports" && <Reports vid={vid} />}
      {tab === "qr" && <QrSettings vid={vid} canEdit={canEdit} />}
    </GymPage>
  );
}