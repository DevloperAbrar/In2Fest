import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Clock, Users, Sun, Sunset, Moon } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, StatusPill, fmtDate, errMsg } from "./gymShared.jsx";
import { TONES } from "./gymUi.jsx";
import { MemberAvatar } from "./memberUi.jsx";

const BLANK = { name: "", start_time: "07:00", end_time: "08:00", capacity: "", is_active: true };
const PRESETS = [["Morning 6-7", "06:00", "07:00"], ["Morning 7-8", "07:00", "08:00"], ["Morning 8-9", "08:00", "09:00"], ["Evening 6-7", "18:00", "19:00"], ["Evening 7-8", "19:00", "20:00"]];

export const fmtTime = (t) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const shiftRange = (s) => `${fmtTime(s.start_time || s.shift_start)} - ${fmtTime(s.end_time || s.shift_end)}`;

// Part of the day decides the icon and colour of the mobile card.
const dayPart = (t) => {
  const h = Number(String(t || "").slice(0, 2));
  if (!Number.isFinite(h) || h < 12) return { label: "Morning", tone: "amber", Icon: Sun };
  if (h < 17) return { label: "Afternoon", tone: "sky", Icon: Sun };
  if (h < 21) return { label: "Evening", tone: "violet", Icon: Sunset };
  return { label: "Night", tone: "navy", Icon: Moon };
};

// Hand-built drawing for "no shifts yet".
function EmptyShiftsArt({ className = "" }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <ellipse cx="80" cy="108" rx="50" ry="7" className="fill-navy-100/70" />
      <circle cx="80" cy="56" r="42" className="fill-white stroke-navy-200" strokeWidth="2" />
      <circle cx="80" cy="56" r="33" className="fill-navy-50" />
      <path d="M80 34v22l15 9" stroke="#1f2a44" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-navy-700" />
      <circle cx="80" cy="56" r="3.5" className="fill-primary-500" />
      <rect x="24" y="22" width="18" height="18" rx="9" className="fill-amber-100" />
      <rect x="122" y="78" width="16" height="16" rx="8" className="fill-violet-100" />
      <circle cx="132" cy="26" r="12" className="fill-primary-500" />
      <path d="M132 20v12M126 26h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Section of the Add / Edit sheet. Mobile: soft card with an icon and title. Desktop: plain block, no title.
function MobilePanel({ icon: Icon, title, hint, tone = "navy", children }) {
  return (
    <section className="rounded-2xl bg-navy-50/50 border border-navy-100/70 p-4 md:rounded-none md:bg-transparent md:border-0 md:p-0">
      <div className="md:hidden flex items-center gap-2.5 mb-3">
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone].chip}`}>
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <p className="font-display font-semibold text-[14px] text-navy-900 leading-tight">{title}</p>
          {hint && <p className="text-[11.5px] text-navy-400 leading-tight mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// One shift on mobile (desktop keeps the original Card grid below).
function MobileShiftCard({ s, isOwner, onView, onEdit, onDelete }) {
  const part = dayPart(s.start_time || s.shift_start);
  const cap = s.capacity ? Math.min(Math.round((s.member_count / s.capacity) * 100), 100) : null;
  const full = cap !== null && cap >= 100;
  const almost = cap !== null && cap >= 80 && !full;

  return (
    <div className={`rounded-3xl bg-white border border-navy-100/70 shadow-card p-4 ${s.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${TONES[part.tone].chip}`}>
          <part.Icon size={22} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-[16px] text-navy-900 truncate">{s.name}</h3>
            {!s.is_active && <span className="text-[10.5px] font-semibold bg-navy-100 text-navy-500 rounded-full px-2 py-0.5">Inactive</span>}
          </div>
          <p className="mt-0.5 text-[12.5px] text-navy-400 flex items-center gap-1.5 tabular-nums">
            <Clock size={12} /> {shiftRange(s)}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`} className="tap-scale w-10 h-10 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
              <Pencil size={16} />
            </button>
            <button type="button" onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`} className="tap-scale w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-end gap-1.5">
          <span className="font-display font-bold text-[34px] leading-none text-navy-900 tabular-nums">{s.member_count}</span>
          <span className="text-[13px] text-navy-400 pb-1">member{s.member_count === 1 ? "" : "s"}</span>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 px-2.5 py-1 text-[11.5px] font-semibold tabular-nums">
          {s.active_count} active
        </span>
      </div>

      {cap !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11.5px] mb-1.5">
            <span className="text-navy-400 tabular-nums">{s.member_count} of {s.capacity} filled</span>
            {full && <span className="font-semibold text-primary-600">Full</span>}
            {almost && <span className="font-semibold text-amber-600">Almost full</span>}
          </div>
          <div className="h-2 bg-navy-50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${full ? "bg-primary-500" : almost ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${cap}%` }} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onView(s)}
        className="tap-scale mt-4 w-full h-11 rounded-2xl bg-navy-900 text-white text-[13.5px] font-semibold flex items-center justify-center gap-2"
      >
        <Users size={15} /> View members
      </button>
    </div>
  );
}

// Members of one shift (opened from a shift card).
function ShiftMembersModal({ vid, shift, onClose }) {
  const { data, loading } = useFetch(shift ? `/venues/${vid}/gym/shifts/${shift.id}` : null, { skip: !shift });
  return (
    <Modal isOpen={!!shift} onClose={onClose} title={shift ? `${shift.name} · ${shiftRange(shift)}` : "Shift"} size="lg">
      {loading || !data ? <Loader /> : (
        <div className="space-y-3">
          <p className="hidden md:block text-sm text-gray-600">{data.total} member{data.total === 1 ? "" : "s"} · {data.active} with an active membership</p>
          <div className="md:hidden grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white border border-navy-100/70 shadow-card px-3 py-2.5">
              <p className="text-[10.5px] text-navy-400">Members</p>
              <p className="mt-0.5 font-display font-bold text-[18px] text-navy-900 tabular-nums">{data.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <p className="text-[10.5px] text-emerald-700/70">With active plan</p>
              <p className="mt-0.5 font-display font-bold text-[18px] text-emerald-700 tabular-nums">{data.active}</p>
            </div>
          </div>
          {data.members.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No members in this shift yet. Choose this shift while adding or editing a member.</p>
          ) : (
            <div className="space-y-2 md:space-y-0 md:divide-y md:border md:rounded-xl max-h-[55vh] overflow-y-auto">
              {data.members.map((m) => (
                <Link key={m.id} to={`/dashboard/gym/members/${m.id}`} className="tap-scale flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-2xl border border-navy-100/70 bg-white md:rounded-none md:border-0 md:bg-transparent md:hover:bg-gray-50">
                  <span className="md:hidden shrink-0">
                    <MemberAvatar name={m.name} src={m.photo_url} size={42} status={m.display_status} />
                  </span>
                  {m.photo_url
                    ? <img src={m.photo_url} alt="" className="hidden md:block w-9 h-9 rounded-full object-cover" />
                    : <div className="hidden md:flex w-9 h-9 rounded-full bg-primary-100 text-primary-700 items-center justify-center font-semibold">{m.name[0]}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name} <span className="text-xs text-gray-400">{m.member_code}</span></p>
                    <p className="text-xs text-gray-500 truncate">{m.phone}{m.plan_name ? ` · ${m.plan_name}` : ""}{m.end_date ? ` · till ${fmtDate(m.end_date)}` : ""}</p>
                  </div>
                  <StatusPill status={m.display_status} daysLeft={m.days_left} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function GymShifts() {
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const isOwner = user?.role !== "team_member" || !!user?.isDemo;
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/shifts?all=true` : null, { skip: !vid });
  const [editing, setEditing] = useState(null); // null | "new" | shift
  const [f, setF] = useState(BLANK);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const items = data?.items || [];

  const openForm = (s) => {
    setF(s ? { name: s.name, start_time: s.start_time, end_time: s.end_time, capacity: s.capacity ?? "", is_active: s.is_active } : BLANK);
    setEditing(s || "new");
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name.trim(), start_time: f.start_time, end_time: f.end_time, capacity: f.capacity === "" ? null : +f.capacity, is_active: f.is_active };
      if (editing === "new") await gymService.createShift(vid, body); else await gymService.updateShift(vid, editing.id, body);
      showSuccess("Shift saved"); setEditing(null); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try {
      const r = await gymService.deleteShift(vid, del.id);
      showSuccess(r.data.data.archived ? "Shift has members, so it was deactivated" : "Shift deleted"); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };

  // Mobile summary numbers (worked out from the shifts already loaded)
  const activeShifts = items.filter((s) => s.is_active).length;
  const unassigned = data?.unassigned || 0;

  return (
    <GymPage title="Shifts" subtitle="Optional: create time slots and see which members attend each one"
      actions={isOwner && <div className="hidden md:block"><Button onClick={() => openForm(null)}><Plus size={15} /> Add shift</Button></div>}>

      {/* Mobile: Add button + quick numbers */}
      {isOwner && (
        <button
          type="button"
          onClick={() => openForm(null)}
          className="md:hidden tap-scale w-full h-[54px] mb-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-semibold text-[14.5px] shadow-card flex items-center justify-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Plus size={18} /></span>
          Add shift
        </button>
      )}
      {!loading && items.length > 0 && (
        <div className="md:hidden grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-white border border-navy-100/70 shadow-card px-3 py-2.5">
            <p className="text-[10.5px] text-navy-400">Shifts</p>
            <p className="mt-0.5 font-display font-bold text-[18px] text-navy-900 tabular-nums">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
            <p className="text-[10.5px] text-emerald-700/70">Active</p>
            <p className="mt-0.5 font-display font-bold text-[18px] text-emerald-700 tabular-nums">{activeShifts}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            <p className="text-[10.5px] text-amber-700/70">No shift</p>
            <p className="mt-0.5 font-display font-bold text-[18px] text-amber-700 tabular-nums">{unassigned}</p>
          </div>
        </div>
      )}

      {loading ? <Loader /> : !items.length ? (
        <>
          <div className="md:hidden flex flex-col items-center text-center px-6 py-8">
            <EmptyShiftsArt className="w-44 h-36" />
            <h3 className="mt-2 font-display font-semibold text-[16px] text-navy-900">No shifts yet</h3>
            <p className="mt-1 text-[13px] text-navy-400 max-w-[280px] leading-snug">Shifts are optional. Create slots like Morning 7-8 AM to assign members and see how many attend each slot.</p>
          </div>
          <div className="hidden md:block">
            <EmptyState title="No shifts yet" description="Shifts are optional. Create slots like Morning 7-8 AM to assign members and see how many attend each slot." />
          </div>
        </>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((s) => (
              <MobileShiftCard key={s.id} s={s} isOwner={isOwner} onView={setView} onEdit={openForm} onDelete={setDel} />
            ))}
          </div>

          {/* Desktop / tablet grid (unchanged) */}
          <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((s) => {
              const cap = s.capacity ? Math.min(Math.round((s.member_count / s.capacity) * 100), 100) : null;
              return (
                <Card key={s.id} className={s.is_active ? "" : "opacity-60"}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={12} /> {shiftRange(s)}{s.is_active ? "" : " · Inactive"}</p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-1">
                        <button onClick={() => openForm(s)} aria-label="Edit shift" className="p-1.5 text-gray-400 hover:text-gray-700"><Pencil size={15} /></button>
                        <button onClick={() => setDel(s)} aria-label="Delete shift" className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-3xl font-bold mt-3">{s.member_count} <span className="text-sm font-normal text-gray-500">member{s.member_count === 1 ? "" : "s"}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.active_count} active{s.capacity ? ` · capacity ${s.capacity}` : ""}</p>
                  {cap !== null && (
                    <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${cap >= 100 ? "bg-red-500" : cap >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${cap}%` }} />
                    </div>
                  )}
                  <Button variant="outline" className="mt-3 w-full" onClick={() => setView(s)}><Users size={14} /> View members</Button>
                </Card>
              );
            })}
          </div>
          {data.unassigned > 0 && <p className="hidden md:block text-xs text-gray-500 mt-3">{data.unassigned} member{data.unassigned === 1 ? " has" : "s have"} no shift assigned.</p>}
        </>
      )}

      <ShiftMembersModal vid={vid} shift={view} onClose={() => setView(null)} />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add shift" : "Edit shift"} size="md">
        <div className="space-y-3">
          <MobilePanel icon={Clock} title="Name and time" hint="Pick a quick option or set your own" tone="sky">
            {editing === "new" && (
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(([label, a, b]) => {
                  const on = f.name === label && f.start_time === a && f.end_time === b;
                  return (
                    <button key={label} type="button" onClick={() => setF((s) => ({ ...s, name: label, start_time: a, end_time: b }))}
                      className={`tap-scale px-3.5 py-1.5 md:px-3 md:py-1 rounded-full border text-[13px] md:text-xs ${on ? "bg-navy-900 text-white border-navy-900 md:bg-transparent md:text-gray-600 md:border-gray-200" : "bg-white text-gray-600"}`}>{label}</button>
                  );
                })}
              </div>
            )}
            <Input label="Shift name *" placeholder="Morning batch" maxLength={60} value={f.name} onChange={set("name")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start time *" type="time" value={f.start_time} onChange={set("start_time")} />
              <Input label="End time *" type="time" value={f.end_time} onChange={set("end_time")} />
            </div>
          </MobilePanel>

          <MobilePanel icon={Users} title="Capacity" hint="Optional" tone="emerald">
            <Input label="Capacity (optional)" inputMode="numeric" placeholder="e.g. 30" value={f.capacity} onChange={(e) => setF((s) => ({ ...s, capacity: e.target.value.replace(/\D/g, "") }))} />
            <p className="text-xs text-gray-400">Capacity is only a guide on this page. It never stops you from adding a member.</p>
          </MobilePanel>

          {editing !== "new" && (
            <label className="flex items-center gap-3 md:gap-2 rounded-2xl border border-navy-100 bg-white px-3.5 py-3 md:border-0 md:bg-transparent md:rounded-none md:p-0 text-sm">
              <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={f.is_active} onChange={set("is_active")} /> Active (can be chosen for new members)
            </label>
          )}

          <div className="sticky bottom-0 z-10 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 md:mx-0 md:mb-0 px-5 sm:px-6 md:px-0 py-3 md:pt-0 md:pb-0 bg-white/95 backdrop-blur border-t border-navy-100/70 md:border-0 md:bg-transparent md:backdrop-blur-none md:static flex gap-2 md:justify-end">
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="flex-[2] md:flex-none" onClick={save} loading={busy} disabled={!f.name.trim() || !f.start_time || !f.end_time}>Save shift</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete shift?" confirmText="Delete" message="If members are assigned to this shift it will be deactivated instead of deleted. No member is removed." />
    </GymPage>
  );
}

// Small card for the gym overview. Renders nothing when the gym does not use shifts.
export function ShiftOverviewCard() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data } = useFetch(vid ? `/venues/${vid}/gym/shifts` : null, { skip: !vid });
  const items = data?.items || [];
  if (!items.length) return null;
  const max = Math.max(...items.map((s) => s.member_count), 1);
  return (
    <div className="bg-white rounded-2xl border border-navy-100/60 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-navy-900 text-[15px]">Members by shift</h3>
        <Link to="/dashboard/gym/shifts" className="text-xs text-primary-600 font-medium">View all</Link>
      </div>
      <div className="space-y-2.5">
        {items.map((s) => (
          <div key={s.id}>
            <div className="flex justify-between text-[13px]"><span className="text-navy-800">{s.name} <span className="text-xs text-navy-400">{shiftRange(s)}</span></span><b className="tabular-nums">{s.member_count}</b></div>
            <div className="h-1.5 bg-navy-50 rounded-full mt-1 overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${(s.member_count / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      {data.unassigned > 0 && <p className="text-xs text-navy-400 mt-3">{data.unassigned} without a shift</p>}
    </div>
  );
}