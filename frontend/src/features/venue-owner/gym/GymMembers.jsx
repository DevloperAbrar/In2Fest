import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Search, Download, Upload, UserPlus, UserRound, HeartPulse, Ticket, Wallet, Camera,
  Phone, CalendarDays, Clock, ChevronRight, X
} from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, StatusPill, Field, TextArea, GOALS, MODES, inr, fmtDate, errMsg, todayISO, downloadBlob } from "./gymShared.jsx";
import PhotoPicker from "./PhotoPicker.jsx";
import { shiftRange } from "./GymShifts.jsx";
import ImportMembersModal from "./ImportMembersModal.jsx";
import ModalErrorBoundary from "./ModalErrorBoundary.jsx";
import { MemberAvatar, EmptyMembersArt, SheetSection } from "./memberUi.jsx";

const TABS = [["all", "All"], ["active", "Active"], ["expiring", "Expiring"], ["expired", "Expired"], ["frozen", "Frozen"], ["dues", "Dues"]];
// Mobile shows the filters in this order (desktop keeps TABS above).
const MOBILE_TABS = [["all", "All"], ["active", "Active"], ["expiring", "Expiring"], ["dues", "Dues"], ["expired", "Expired"], ["frozen", "Frozen"]];
// Mobile filter chip colours (desktop keeps its own style below).
const TAB_STYLE = {
  all: { dot: "bg-navy-400", on: "bg-navy-900 border-navy-900" },
  active: { dot: "bg-emerald-500", on: "bg-emerald-600 border-emerald-600" },
  expiring: { dot: "bg-amber-500", on: "bg-amber-500 border-amber-500" },
  expired: { dot: "bg-primary-500", on: "bg-primary-600 border-primary-600" },
  frozen: { dot: "bg-sky-500", on: "bg-sky-500 border-sky-500" },
  dues: { dot: "bg-violet-500", on: "bg-violet-600 border-violet-600" }
};

// Thin coloured edge on each mobile member card.
const STATUS_ACCENT = {
  active: "bg-emerald-500",
  expiring: "bg-amber-400",
  expired: "bg-primary-500",
  frozen: "bg-sky-400",
  new: "bg-navy-200"
};

const previewTotal = (plan, f) => {
  if (!plan) return 0;
  const base = +plan.price;
  const pd = (base * (+plan.discount_percent || 0)) / 100;
  const extra = Math.min(+f.extra_discount || 0, base - pd);
  return Math.round((base - pd - extra + (f.waive_joining ? 0 : +plan.joining_fee) + (f.include_pt ? +plan.pt_addon_price : 0)) * 100) / 100;
};

function EnrollModal({ isOpen, onClose, vid, lead, onDone }) {
  const { data: plans } = useFetch(isOpen && vid ? `/venues/${vid}/gym/plans` : null, { skip: !isOpen || !vid });
  const { data: shiftData } = useFetch(isOpen && vid ? `/venues/${vid}/gym/shifts` : null, { skip: !isOpen || !vid });
  const shifts = shiftData?.items || [];
  const blank = { shift_id: "", name: "", phone: "", gender: "", goal: "", weight: "", height: "", address: "", health_notes: "", emergency_name: "", emergency_phone: "", parent_name: "", trainer_name: "", plan_id: "", start_date: todayISO(), include_pt: false, extra_discount: "", waive_joining: false, pay_amount: "", pay_mode: "cash", reference: "" };
  const [f, setF] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  useEffect(() => {
    if (isOpen) {
      setF({ ...blank, name: lead?.name || "", phone: lead?.phone || "", goal: lead?.goal || "" });
      setPhoto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead]);

  const plan = (plans || []).find((p) => p.id === f.plan_id);
  const total = previewTotal(plan, f);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await gymService.enroll(vid, {
        name: f.name, phone: f.phone, gender: f.gender, goal: f.goal, health_notes: f.health_notes, emergency_name: f.emergency_name,
        emergency_phone: f.emergency_phone, parent_name: f.parent_name, trainer_name: f.trainer_name, plan_id: f.plan_id, start_date: f.start_date,
        weight: f.weight, height: f.height, address: f.address,
        ...(f.shift_id ? { shift_id: f.shift_id } : {}),
        include_pt: f.include_pt, extra_discount: f.extra_discount || 0, waive_joining: f.waive_joining, lead_id: lead?.id,
        source: lead ? "website_trial" : "walk_in",
        payment: +f.pay_amount > 0 ? { amount: +f.pay_amount, mode: f.pay_mode, reference: f.reference } : undefined
      });
      const memberId = res.data.data.member.id;
      showSuccess("Member added");
      // The photo goes up right after the member exists. If it fails the member is still saved.
      if (photo) {
        try { await gymService.uploadPhoto(vid, memberId, photo); }
        catch (e) { showError(errMsg(e, "Member added, but the photo could not be uploaded. Add it from the member page.")); }
      }
      onDone(memberId);
    } catch (e) { showError(errMsg(e, "Could not add member")); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add member" size="lg">
      <div className="space-y-3">
        <SheetSection icon={Camera} title="Photo" hint="Optional. Take one now or pick from gallery" tone="sky">
          <PhotoPicker name={f.name} file={photo} onChange={setPhoto} disabled={busy} />
        </SheetSection>

        <SheetSection icon={UserRound} title="Basic details" hint="Name and mobile are required" tone="emerald">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Name *" value={f.name} onChange={set("name")} />
            <Input label="Mobile *" inputMode="numeric" maxLength={10} value={f.phone} onChange={set("phone")} />
            <Select label="Goal" value={f.goal} onChange={set("goal")} options={[{ value: "", label: "Select goal" }, ...GOALS]} />
            <Select label="Gender" value={f.gender} onChange={set("gender")} options={[{ value: "", label: "Select" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
            <Input label="Weight (optional)" placeholder="e.g. 72 kg" maxLength={30} value={f.weight} onChange={set("weight")} />
            <Input label="Height (optional)" placeholder="e.g. 172 cm" maxLength={30} value={f.height} onChange={set("height")} />
            <Input label="Emergency contact name" value={f.emergency_name} onChange={set("emergency_name")} />
            <Input label="Emergency contact phone" inputMode="numeric" value={f.emergency_phone} onChange={set("emergency_phone")} />
            <div className="sm:col-span-2">
              <Input label="Parent name (optional)" maxLength={100} value={f.parent_name} onChange={set("parent_name")} />
            </div>
          </div>
        </SheetSection>

        <SheetSection icon={HeartPulse} title="Address and health" hint="Optional" tone="red">
          <Field label="Address (optional)"><TextArea rows={2} maxLength={300} value={f.address} onChange={set("address")} /></Field>
          <Field label="Health notes (injury, medical condition)"><TextArea value={f.health_notes} onChange={set("health_notes")} /></Field>
        </SheetSection>

        <SheetSection icon={Ticket} title="Plan and fees" hint="Choose a plan to see the total" tone="violet" divider>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Plan *" value={f.plan_id} onChange={set("plan_id")}
              options={[{ value: "", label: "Select plan" }, ...(plans || []).map((p) => ({ value: p.id, label: `${p.name} - ${inr(p.price)}` }))]} />
            <Input label="Start date" type="date" value={f.start_date} onChange={set("start_date")} />
            <Input label="Extra discount (₹)" inputMode="decimal" value={f.extra_discount} onChange={set("extra_discount")} />
            <Input label="Trainer" value={f.trainer_name} onChange={set("trainer_name")} />
            {shifts.length > 0 && (
              <Select label="Shift (optional)" value={f.shift_id} onChange={set("shift_id")}
                options={[{ value: "", label: "No shift" }, ...shifts.map((s) => ({ value: s.id, label: `${s.name} (${shiftRange(s)})` }))]} />
            )}
          </div>
          {plan && (
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-4 text-sm">
              {+plan.pt_addon_price > 0 && (
                <label className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3 py-2.5 md:border-0 md:bg-transparent md:p-0 md:gap-2">
                  <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={f.include_pt} onChange={set("include_pt")} /> Personal training (+{inr(plan.pt_addon_price)})
                </label>
              )}
              {+plan.joining_fee > 0 && (
                <label className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3 py-2.5 md:border-0 md:bg-transparent md:p-0 md:gap-2">
                  <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={f.waive_joining} onChange={set("waive_joining")} /> Waive joining fee ({inr(plan.joining_fee)})
                </label>
              )}
            </div>
          )}
          {plan && (
            <div className="rounded-2xl px-4 py-3 flex items-center justify-between text-sm bg-navy-900 text-white md:bg-gray-50 md:text-gray-900 md:rounded-xl md:p-3">
              <span className="text-white/70 md:text-gray-900">Total payable</span>
              <b className="font-display text-lg md:text-sm tabular-nums">{inr(total)}</b>
            </div>
          )}
        </SheetSection>

        <SheetSection icon={Wallet} title="Payment" hint="Leave blank if nothing is paid yet" tone="amber" divider>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Paid now (₹)" inputMode="decimal" value={f.pay_amount} onChange={set("pay_amount")} />
            <Select label="Mode" value={f.pay_mode} onChange={set("pay_mode")} options={MODES} />
            <div className="col-span-2 sm:col-span-1">
              <Input label="Reference / UTR" value={f.reference} onChange={set("reference")} />
            </div>
          </div>
          {plan && +f.pay_amount > 0 && <p className="text-xs text-gray-500">Balance due after this payment: {inr(Math.max(total - +f.pay_amount, 0))}</p>}
        </SheetSection>

        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 md:mx-0 md:mb-0 px-5 sm:px-6 md:px-0 py-3 md:pt-2 md:pb-0 bg-white/95 backdrop-blur border-t border-navy-100/70 md:border-0 md:bg-transparent md:backdrop-blur-none md:static flex gap-2 md:justify-end">
          <Button variant="outline" className="flex-1 md:flex-none" onClick={onClose}>Cancel</Button>
          <Button className="flex-[2] md:flex-none" onClick={submit} loading={busy} disabled={!f.name || !f.phone || !f.plan_id}>Add member</Button>
        </div>
      </div>
    </Modal>
  );
}

// Mobile member card (desktop keeps the original divided list further below).
function MobileMemberCard({ m }) {
  const status = m.display_status || "new";
  const hasDue = +m.balance_due > 0;
  return (
    <Link
      to={`/dashboard/gym/members/${m.id}`}
      className="tap-scale relative block overflow-hidden rounded-2xl bg-white border border-navy-100/70 shadow-card p-3.5 pl-4"
    >
      <span className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full ${STATUS_ACCENT[status] || STATUS_ACCENT.new}`} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <MemberAvatar name={m.name} src={m.photo_url} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display font-semibold text-[14.5px] text-navy-900 truncate">{m.name}</p>
              <p className="text-[11px] text-navy-400 tabular-nums mt-0.5">{m.member_code}</p>
            </div>
            <StatusPill status={m.display_status} daysLeft={m.days_left} />
          </div>
          <div className="mt-2.5 space-y-1.5">
            <p className="flex items-center gap-2 text-[12.5px] text-navy-600">
              <Phone size={13} className="text-navy-300 shrink-0" />
              <span className="tabular-nums">{m.phone}</span>
            </p>
            <p className="flex items-center gap-2 text-[12.5px] text-navy-600 min-w-0">
              <Ticket size={13} className="text-navy-300 shrink-0" />
              <span className="truncate">{m.plan_name || "No plan"}</span>
            </p>
            {m.end_date && (
              <p className="flex items-center gap-2 text-[12.5px] text-navy-600">
                <CalendarDays size={13} className="text-navy-300 shrink-0" />
                <span>Valid till {fmtDate(m.end_date)}</span>
              </p>
            )}
          </div>
          {(hasDue || m.shift_name) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {hasDue && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/70 px-2.5 py-1 text-[11.5px] font-semibold tabular-nums">
                  <Wallet size={12} /> Due {inr(m.balance_due)}
                </span>
              )}
              {m.shift_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 text-navy-600 px-2.5 py-1 text-[11.5px] font-medium">
                  <Clock size={12} /> {m.shift_name}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-navy-300 shrink-0 mt-3" aria-hidden="true" />
      </div>
    </Link>
  );
}

export default function GymMembers() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const nav = useNavigate();
  const { state } = useLocation();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(!!state?.lead);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const url = vid ? `/venues/${vid}/gym/members?status=${tab}&q=${encodeURIComponent(dq)}&page=${page}&limit=25` : null;
  const { data, loading, refetch } = useFetch(url, { skip: !vid });
  const items = data?.items || [];
  const filtered = tab !== "all" || !!dq;

  const exportCsv = async () => {
    try {
      const r = await gymService.exportMembers(vid, { status: tab, q: dq });
      downloadBlob(r.data, `gym-members-${tab}.csv`);
    } catch { showError("Could not download the list"); }
  };

  return (
    <GymPage title="Members"
      actions={
        <div className="hidden md:flex gap-2">
          <Button variant="outline" onClick={() => setImporting(true)}><Upload size={15} /> Import</Button>
          <Button variant="outline" onClick={exportCsv}><Download size={15} /> Download</Button>
          <Button onClick={() => setOpen(true)}><Plus size={15} /> Add member</Button>
        </div>
      }>
      {/* Mobile: one big Add button, with Import and Download beside it */}
      <div className="md:hidden mb-4 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-scale flex-1 h-[54px] rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-semibold text-[14.5px] shadow-card flex items-center justify-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><UserPlus size={17} /></span>
          Add member
        </button>
        <button
          type="button"
          onClick={() => setImporting(true)}
          aria-label="Import members from a file"
          className="tap-scale w-[54px] h-[54px] rounded-2xl bg-white border border-navy-100/70 shadow-card flex flex-col items-center justify-center text-navy-700"
        >
          <Upload size={18} />
          <span className="text-[9.5px] font-medium mt-0.5">Import</span>
        </button>
        <button
          type="button"
          onClick={exportCsv}
          aria-label="Download member list"
          className="tap-scale w-[54px] h-[54px] rounded-2xl bg-white border border-navy-100/70 shadow-card flex flex-col items-center justify-center text-navy-700"
        >
          <Download size={18} />
          <span className="text-[9.5px] font-medium mt-0.5">Download</span>
        </button>
      </div>

      {/* Desktop / tablet filter chips (unchanged) */}
      <div className="hidden md:flex gap-1 mb-3 overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${tab === k ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>{label}</button>
        ))}
      </div>

      {/* Mobile: search first, then coloured filter chips */}
      <div className="md:hidden relative mb-3">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, mobile or member ID"
          aria-label="Search members"
          className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white border border-navy-100 shadow-sm text-[14px] text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="tap-scale absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-navy-50 text-navy-500 flex items-center justify-center"
          >
            <X size={15} />
          </button>
        )}
      </div>
      <div className="md:hidden mb-3 flex flex-wrap gap-1.5">
        {MOBILE_TABS.map(([k, label]) => {
          const on = tab === k;
          const st = TAB_STYLE[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => { setTab(k); setPage(1); }}
              aria-pressed={on}
              className={`tap-scale inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-colors ${
                on ? `${st.on} text-white` : "bg-white text-navy-700 border-navy-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-white/90" : st.dot}`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Desktop / tablet search (unchanged) */}
      <div className="hidden md:block relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search name, mobile or member ID" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <Loader /> : items.length === 0 ? (
        <>
          <div className="md:hidden flex flex-col items-center text-center px-6 py-8">
            <EmptyMembersArt className="w-44 h-36" />
            <h3 className="mt-2 font-display font-semibold text-[16px] text-navy-900">{filtered ? "No members match" : "No members yet"}</h3>
            <p className="mt-1 text-[13px] text-navy-400 max-w-[260px] leading-snug">
              {filtered ? "Try a different filter or search." : "Add your first member, or import your old list from a file."}
            </p>
            {!filtered && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="tap-scale mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-600 text-white px-5 py-3 text-[14px] font-semibold shadow-card"
              >
                <UserPlus size={16} /> Add first member
              </button>
            )}
          </div>
          <div className="hidden md:block">
            <EmptyState title="No members found" description="Add your first member or change the filter." />
          </div>
        </>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden">
            {data && (
              <p className="px-1 mb-2 text-[12px] font-medium text-navy-400">
                {data.total} member{data.total === 1 ? "" : "s"}
              </p>
            )}
            <div className="space-y-2.5">
              {items.map((m) => <MobileMemberCard key={m.id} m={m} />)}
            </div>
          </div>

          {/* Desktop / tablet list (unchanged) */}
          <div className="hidden md:block bg-white rounded-2xl border border-navy-100/60 divide-y">
            {items.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/dashboard/gym/members/${m.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                  {m.photo_url
                    ? <img src={m.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">{m.name[0]}</div>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name} <span className="text-xs text-gray-400">{m.member_code}</span></p>
                    <p className="text-xs text-gray-500 truncate">{m.phone} · {m.plan_name || "No plan"}{m.end_date ? ` · till ${fmtDate(m.end_date)}` : ""}{m.shift_name ? ` · ${m.shift_name}` : ""}</p>
                  </div>
                </Link>
                <div className="text-right flex flex-col items-end gap-1">
                  <StatusPill status={m.display_status} daysLeft={m.days_left} />
                  {+m.balance_due > 0 && <span className="text-xs font-semibold text-red-600">Due {inr(m.balance_due)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between gap-2 mt-4 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-gray-500 text-center text-[12.5px] md:text-sm">Page {data.page} of {data.pages} · {data.total} members</span>
          <Button variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      <ModalErrorBoundary key={open ? "enroll-open" : "enroll-closed"} onClose={() => setOpen(false)}>
        <EnrollModal isOpen={open} onClose={() => setOpen(false)} vid={vid} lead={state?.lead} onDone={(id) => nav(`/dashboard/gym/members/${id}`)} />
      </ModalErrorBoundary>
      {importing && (
        <ModalErrorBoundary onClose={() => setImporting(false)}>
          <ImportMembersModal vid={vid} onClose={() => setImporting(false)} onDone={() => { setPage(1); refetch(); }} />
        </ModalErrorBoundary>
      )}
    </GymPage>
  );
}