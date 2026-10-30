import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, Download } from "lucide-react";
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

const TABS = [["all", "All"], ["active", "Active"], ["expiring", "Expiring"], ["expired", "Expired"], ["frozen", "Frozen"], ["dues", "Dues"]];
 

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
  const blank = { shift_id: "", name: "", phone: "", gender: "", goal: "", health_notes: "", emergency_name: "", emergency_phone: "", trainer_name: "", plan_id: "", start_date: todayISO(), include_pt: false, extra_discount: "", waive_joining: false, pay_amount: "", pay_mode: "cash", reference: "" };
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
        emergency_phone: f.emergency_phone, trainer_name: f.trainer_name, plan_id: f.plan_id, start_date: f.start_date,
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
        <PhotoPicker name={f.name} file={photo} onChange={setPhoto} disabled={busy} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Name *" value={f.name} onChange={set("name")} />
          <Input label="Mobile *" inputMode="numeric" maxLength={10} value={f.phone} onChange={set("phone")} />
          <Select label="Goal" value={f.goal} onChange={set("goal")} options={[{ value: "", label: "Select goal" }, ...GOALS]} />
          <Select label="Gender" value={f.gender} onChange={set("gender")} options={[{ value: "", label: "Select" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
          <Input label="Emergency contact name" value={f.emergency_name} onChange={set("emergency_name")} />
          <Input label="Emergency contact phone" inputMode="numeric" value={f.emergency_phone} onChange={set("emergency_phone")} />
        </div>
        <Field label="Health notes (injury, medical condition)"><TextArea value={f.health_notes} onChange={set("health_notes")} /></Field>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
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
          <div className="flex flex-wrap gap-4 text-sm">
            {+plan.pt_addon_price > 0 && <label className="flex items-center gap-2"><input type="checkbox" checked={f.include_pt} onChange={set("include_pt")} /> Personal training (+{inr(plan.pt_addon_price)})</label>}
            {+plan.joining_fee > 0 && <label className="flex items-center gap-2"><input type="checkbox" checked={f.waive_joining} onChange={set("waive_joining")} /> Waive joining fee ({inr(plan.joining_fee)})</label>}
          </div>
        )}
        {plan && <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-sm"><span>Total payable</span><b>{inr(total)}</b></div>}

        <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t">
          <Input label="Paid now (₹)" inputMode="decimal" value={f.pay_amount} onChange={set("pay_amount")} />
          <Select label="Mode" value={f.pay_mode} onChange={set("pay_mode")} options={MODES} />
          <Input label="Reference / UTR" value={f.reference} onChange={set("reference")} />
        </div>
        {plan && +f.pay_amount > 0 && <p className="text-xs text-gray-500">Balance due after this payment: {inr(Math.max(total - +f.pay_amount, 0))}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!f.name || !f.phone || !f.plan_id}>Add member</Button>
        </div>
      </div>
    </Modal>
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
  
    useEffect(() => {
      const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 350);
      return () => clearTimeout(t);
    }, [q]);
  
    const url = vid ? `/venues/${vid}/gym/members?status=${tab}&q=${encodeURIComponent(dq)}&page=${page}&limit=25` : null;
    const { data, loading } = useFetch(url, { skip: !vid });
    const items = data?.items || [];
  
    const exportCsv = async () => {
      try {
        const r = await gymService.exportMembers(vid, { status: tab, q: dq });
        downloadBlob(r.data, `gym-members-${tab}.csv`);
      } catch { showError("Could not download the list"); }
    };
  
    return (
      <GymPage title="Members"
        actions={<>
          <Button variant="outline" onClick={exportCsv}><Download size={15} /> Download</Button>
          <Button onClick={() => setOpen(true)}><Plus size={15} /> Add member</Button>
        </>}>
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${tab === k ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>{label}</button>
          ))}
        </div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search name, mobile or member ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
  
        {loading ? <Loader /> : items.length === 0 ? (
          <EmptyState title="No members found" description="Add your first member or change the filter." />
        ) : (
          <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
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
        )}
  
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-gray-500">Page {data.page} of {data.pages} · {data.total} members</span>
            <Button variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
  
        <EnrollModal isOpen={open} onClose={() => setOpen(false)} vid={vid} lead={state?.lead} onDone={(id) => nav(`/dashboard/gym/members/${id}`)} />
      </GymPage>
    );
  }