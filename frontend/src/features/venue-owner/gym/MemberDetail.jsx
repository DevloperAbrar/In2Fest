import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Phone, RefreshCw, IndianRupee, Snowflake, Link2, Dumbbell, Camera, Pencil,
  MessageSquare, FileText, Share2, Copy, CreditCard, Trash2, Archive
} from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import { API_BASE_URL } from "../../../lib/constants";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import PhotoPicker from "./PhotoPicker.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import {
  GymPage, StatusPill, Field, TextArea, MessageModal,
  inr, fmtDate, errMsg, todayISO, MODES, GOALS, downloadBlob, copyText, shareContent, waUrl
} from "./gymShared.jsx";

function RenewModal({ isOpen, onClose, vid, member, onDone }) {
  const { data: plans } = useFetch(isOpen ? `/venues/${vid}/gym/plans` : null, { skip: !isOpen });
  const [f, setF] = useState({ plan_id: "", start_date: "", include_pt: false, extra_discount: "", pay_amount: "", pay_mode: "cash" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) setF((s) => ({ ...s, plan_id: member.plan_id || "", include_pt: !!member.has_pt })); }, [isOpen, member]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const plan = (plans || []).find((p) => p.id === f.plan_id);
  const total = plan ? Math.max(+plan.price - (+plan.price * (+plan.discount_percent || 0)) / 100 - (+f.extra_discount || 0) + (f.include_pt ? +plan.pt_addon_price : 0), 0) : 0;

  const submit = async () => {
    setBusy(true);
    try {
      await gymService.renew(vid, member.id, {
        plan_id: f.plan_id, start_date: f.start_date || undefined, include_pt: f.include_pt, extra_discount: f.extra_discount || 0,
        payment: +f.pay_amount > 0 ? { amount: +f.pay_amount, mode: f.pay_mode } : undefined
      });
      showSuccess("Membership renewed");
      onDone();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renew membership">
      <div className="space-y-3">
        <Select label="Plan" value={f.plan_id} onChange={set("plan_id")} options={[{ value: "", label: "Select plan" }, ...(plans || []).map((p) => ({ value: p.id, label: `${p.name} - ${inr(p.price)}` }))]} />
        <Input label="Start date (blank = right after current expiry)" type="date" value={f.start_date} onChange={set("start_date")} />
        <Input label="Extra discount (₹)" inputMode="decimal" value={f.extra_discount} onChange={set("extra_discount")} />
        {plan && +plan.pt_addon_price > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.include_pt} onChange={set("include_pt")} /> Personal training (+{inr(plan.pt_addon_price)})</label>}
        {plan && <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-sm"><span>Renewal amount</span><b>{inr(total)}</b></div>}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Paid now (₹)" inputMode="decimal" value={f.pay_amount} onChange={set("pay_amount")} />
          <Select label="Mode" value={f.pay_mode} onChange={set("pay_mode")} options={MODES} />
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy} disabled={!f.plan_id}>Renew</Button></div>
      </div>
    </Modal>
  );
}

function PayModal({ isOpen, onClose, vid, member, onDone }) {
  const [f, setF] = useState({ amount: "", mode: "cash", reference: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) setF({ amount: member.balance_due > 0 ? member.balance_due : "", mode: "cash", reference: "" }); }, [isOpen, member]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true);
    try { await gymService.recordPayment(vid, member.id, { ...f, amount: +f.amount }); showSuccess("Payment recorded"); onDone(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record payment" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Balance due: <b className="text-gray-900">{inr(member.balance_due)}</b></p>
        <Input label="Amount (₹)" inputMode="decimal" value={f.amount} onChange={set("amount")} />
        <Select label="Mode" value={f.mode} onChange={set("mode")} options={MODES} />
        <Input label="Reference / UTR" value={f.reference} onChange={set("reference")} />
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy} disabled={!+f.amount}>Save</Button></div>
      </div>
    </Modal>
  );
}

function LinkModal({ isOpen, onClose, vid, member, hasDue }) {
    const [purpose, setPurpose] = useState("renewal");
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (isOpen) { setUrl(""); setPurpose(hasDue ? "dues" : "renewal"); } }, [isOpen, hasDue]);
    const make = async () => {
      setBusy(true);
      try { const r = await gymService.paymentLink(vid, member.id, { purpose }); setUrl(r.data.data.url); }
      catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
    };
    const copy = async () => ((await copyText(url)) ? showSuccess("Link copied") : showError("Could not copy"));
    const share = async () => {
      const r = await shareContent({ title: "Payment link", text: url });
      if (r === "copied") showSuccess("Link copied");
    };
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Payment / renewal link" size="sm">
        <div className="space-y-3">
          <Select label="Link for" value={purpose} onChange={(e) => { setPurpose(e.target.value); setUrl(""); }}
            options={[{ value: "renewal", label: "Renewal (member renews and pays)" }, ...(hasDue ? [{ value: "dues", label: "Pending dues" }] : [])]} />
          {url && <div className="bg-gray-50 rounded-xl p-3 text-xs break-all">{url}</div>}
          <div className="flex justify-end gap-2">
            {!url ? <Button onClick={make} loading={busy}>Create link</Button> : (
              <>
                <Button variant="outline" onClick={copy}><Copy size={14} /> Copy</Button>
                <Button onClick={share}><Share2 size={14} /> Share</Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  const EDIT_KEYS = ["name", "phone", "email", "gender", "dob", "goal", "trainer_name", "emergency_name", "emergency_phone", "health_notes", "notes"];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
  const editBase = (m) => Object.fromEntries(EDIT_KEYS.map((k) => [k, m[k] ?? ""]));
  const ymdMs = (ymd) => { const [y, m, d] = String(ymd).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((ymdMs(b) - ymdMs(a)) / 86400000);
  const shiftYmd = (ymd, days) => new Date(ymdMs(ymd) + days * 86400000).toISOString().slice(0, 10);
  // The membership that drives the member's status: the active one with the latest end date.
  const currentMembership = (list) =>
    [...(list || [])].filter((x) => x.status === "active")
      .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)) || String(b.start_date).localeCompare(String(a.start_date)))[0] || null;
  
  // Edits the member's profile and the start / end date of the current membership.
  // Plan, fee and payments change through Renew / Record payment, so receipts always stay correct.
  function EditModal({ isOpen, onClose, vid, member, memberships, onDone }) {
    const current = currentMembership(memberships);
    const frozen = member.status === "frozen";
    const [f, setF] = useState(() => editBase(member));
    const [ms, setMs] = useState(() => ({ start_date: current?.start_date || "", end_date: current?.end_date || "" }));
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    useEffect(() => {
      if (isOpen) {
        setPhoto(null); setShowErrors(false); setF(editBase(member));
        setMs({ start_date: current?.start_date || "", end_date: current?.end_date || "" });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, member, memberships]);
    const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
    // Moving the start date moves the end date by the same number of days (the owner can still adjust it).
    const onStart = (e) => {
      const v = e.target.value;
      setMs((s) => (v && s.start_date && s.end_date ? { start_date: v, end_date: shiftYmd(s.end_date, daysBetween(s.start_date, v)) } : { ...s, start_date: v }));
    };
    const onEnd = (e) => { const v = e.target.value; setMs((s) => ({ ...s, end_date: v })); };
  
    const base = editBase(member);
    const changed = EDIT_KEYS.filter((k) => String(f[k] ?? "").trim() !== String(base[k] ?? "").trim());
    const msChanged = !!current && !frozen && (ms.start_date !== current.start_date || ms.end_date !== current.end_date);
    const dirty = changed.length > 0 || msChanged || !!photo;
  
    // Only fields the user actually changed are checked, so old data can never block an unrelated edit.
    const errors = {};
    if (changed.includes("name") && f.name.trim().length < 2) errors.name = "Enter the member's name";
    if (changed.includes("phone") && !/^[6-9]\d{9}$/.test(onlyDigits(f.phone))) errors.phone = "Enter a valid 10-digit mobile number";
    if (changed.includes("email") && f.email.trim() && !EMAIL_RE.test(f.email.trim())) errors.email = "Enter a valid email address";
    if (changed.includes("emergency_phone") && f.emergency_phone.trim() && onlyDigits(f.emergency_phone).length < 10) errors.emergency_phone = "Enter a valid phone number";
    if (msChanged) {
      if (!ms.start_date) errors.start_date = "Choose a start date";
      if (!ms.end_date) errors.end_date = "Choose an end date";
      if (ms.start_date && ms.end_date && ms.end_date < ms.start_date) errors.end_date = "End date cannot be before the start date";
    }
    const err = (k) => (showErrors ? errors[k] : undefined);
  
    const submit = async () => {
      if (Object.keys(errors).length) { setShowErrors(true); return; }
      setBusy(true);
      try {
        if (changed.length || msChanged) {
          const payload = {};
          changed.forEach((k) => { payload[k] = k === "phone" || k === "emergency_phone" ? onlyDigits(f[k]) : String(f[k]).trim(); });
          if (msChanged) payload.membership = { id: current.id, start_date: ms.start_date, end_date: ms.end_date };
          await gymService.updateMember(vid, member.id, payload);
        }
        if (photo) {
          try { await gymService.uploadPhoto(vid, member.id, photo); }
          catch (e) { showError(errMsg(e, "Details saved, but the photo could not be uploaded")); }
        }
        onDone();
      } catch (e) { showError(errMsg(e, "Could not save the changes")); } finally { setBusy(false); }
    };
  
    return (
      <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title="Edit member" size="lg">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{member.member_code} · Fee and payments are changed from Renew and Record payment.</p>
          <PhotoPicker currentUrl={member.photo_url} name={f.name || member.name} file={photo} onChange={setPhoto} disabled={busy} />
          {current && (
            <div className="pt-3 border-t space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Membership period</p>
                <p className="text-xs text-gray-500">{current.plan_name} · {inr(current.total_amount)}. The fee and payments stay the same.</p>
              </div>
              {frozen ? (
                <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2">This member is frozen. Unfreeze first to change the membership dates.</p>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input label="Start date" type="date" value={ms.start_date} onChange={onStart} error={err("start_date")} />
                    <Input label="End date" type="date" min={ms.start_date || undefined} value={ms.end_date} onChange={onEnd} error={err("end_date")} />
                  </div>
                  {ms.start_date && ms.end_date && ms.end_date >= ms.start_date && (
                    <p className="text-xs text-gray-500">{daysBetween(ms.start_date, ms.end_date) + 1} days in total. Changing the start date moves the end date by the same number of days.</p>
                  )}
                  {msChanged && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">This changes when the membership expires. The member card, reminders and reports will use the new dates.</p>}
                </>
              )}
            </div>
          )}
          <p className="text-sm font-medium text-gray-900 pt-3 border-t">Member details</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Name *" value={f.name} onChange={set("name")} error={err("name")} />
            <Input label="Mobile *" inputMode="numeric" maxLength={10} value={f.phone} onChange={set("phone")} error={err("phone")} />
            <Input label="Email" type="email" value={f.email} onChange={set("email")} error={err("email")} />
            <Select label="Gender" value={f.gender} onChange={set("gender")} options={[{ value: "", label: "Select" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
            <Input label="Date of birth" type="date" max={todayISO()} value={f.dob} onChange={set("dob")} />
            <Select label="Goal" value={f.goal} onChange={set("goal")} options={[{ value: "", label: "Select goal" }, ...GOALS]} />
            <Input label="Trainer" value={f.trainer_name} onChange={set("trainer_name")} />
            <Input label="Emergency contact name" value={f.emergency_name} onChange={set("emergency_name")} />
            <Input label="Emergency contact phone" inputMode="numeric" value={f.emergency_phone} onChange={set("emergency_phone")} error={err("emergency_phone")} />
          </div>
          {changed.includes("phone") && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">The mobile number is used for WhatsApp messages and payment links. Check it before saving.</p>}
          <Field label="Health notes"><TextArea value={f.health_notes} onChange={set("health_notes")} /></Field>
          <Field label="Internal notes"><TextArea value={f.notes} onChange={set("notes")} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={submit} loading={busy} disabled={!dirty}>Save changes</Button>
          </div>
        </div>
      </Modal>
    );
  }

// Permanent delete, meant for members added by mistake. Owner only (the server enforces this too).
// If real payments exist, the owner has to type the member ID before the button unlocks.
function DeleteMemberModal({ isOpen, onClose, vid, member, memberships, payments, workoutCount, onDeleted }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) { setTyped(""); setBusy(false); } }, [isOpen]);

  const paid = payments.filter((p) => p.status === "paid");
  const paidTotal = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const needsTyping = paid.length > 0;
  const unlocked = !needsTyping || typed.trim().toUpperCase() === String(member.member_code).toUpperCase();

  const submit = async () => {
    setBusy(true);
    try {
      await gymService.deleteMember(vid, member.id, member.member_code);
      showSuccess("Member deleted");
      onDeleted();
    } catch (e) { showError(errMsg(e, "Could not delete the member")); setBusy(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title="Delete member permanently?" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Use this only if <b>{member.name}</b> ({member.member_code}) was added by mistake. This cannot be undone.</p>
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
          <p className="font-medium text-gray-900">This will permanently remove:</p>
          <p>· Member profile and photo</p>
          <p>· {memberships.length} membership record(s)</p>
          <p>· {payments.length}{payments.length >= 100 ? "+" : ""} payment record(s){paid.length ? ` (${inr(paidTotal)} received)` : ""}</p>
          {workoutCount > 0 && <p>· {workoutCount} assigned workout plan(s)</p>}
        </div>
        {needsTyping && (
          <>
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              {paid.length} paid receipt(s) worth {inr(paidTotal)} will also be removed from your revenue reports, and receipts already shared with this member will no longer match your records.
            </p>
            <Input label={`Type ${member.member_code} to confirm`} placeholder={member.member_code} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </>
        )}
        <p className="text-xs text-gray-500">Only want to hide this member and keep all records? Use <b>Archive</b> instead.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!unlocked}><Trash2 size={14} /> Delete permanently</Button>
        </div>
      </div>
    </Modal>
  );
}

  // Opened from the small camera button on the member's photo.
  function PhotoModal({ isOpen, onClose, vid, member, onDone }) {
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (isOpen) setFile(null); }, [isOpen]);
    const submit = async () => {
      if (!file) return;
      setBusy(true);
      try { await gymService.uploadPhoto(vid, member.id, file); onDone(); }
      catch (e) { showError(errMsg(e, "Could not upload the photo")); }
      finally { setBusy(false); }
    };
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Member photo" size="sm">
        <div className="space-y-4">
          <PhotoPicker currentUrl={member.photo_url} name={member.name} file={file} onChange={setFile} disabled={busy} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={busy} disabled={!file}>Save photo</Button>
          </div>
        </div>
      </Modal>
    );
  }

function AssignWorkoutModal({ isOpen, onClose, vid, member, onDone }) {
    const { data: tpls, loading } = useFetch(isOpen ? `/venues/${vid}/gym/workout-plans?template=true` : null, { skip: !isOpen });
    const nav = useNavigate();
    const assign = async (id) => {
      try { await gymService.assignWorkout(vid, id, { member_ids: [member.id] }); showSuccess("Workout plan assigned. Download or share it from the list below."); onDone(); }
      catch (e) { showError(errMsg(e)); }
    };
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Assign workout plan">
        {loading ? <Loader /> : (
          <div className="space-y-2">
            {(tpls || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-xl px-3 py-2.5">
                <div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-gray-500">{t.days.length} days</p></div>
                <Button onClick={() => assign(t.id)}>Assign</Button>
              </div>
            ))}
            {(!tpls || tpls.length === 0) && <p className="text-sm text-gray-500">No templates yet. Create one under Workouts.</p>}
            <Button variant="outline" className="w-full" onClick={() => nav(`/dashboard/gym/workouts/new?member=${member.id}`)}>Build a custom plan for {member.name.split(" ")[0]}</Button>
          </div>
        )}
      </Modal>
    );
  }

  function MemberCardModal({ isOpen, onClose, vid, member, cardLink }) {
    const [url, setUrl] = useState("");
    const [blob, setBlob] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileName = `${member.member_code || "member"}-membership-card.png`;
  
    useEffect(() => {
      if (!isOpen) return undefined;
      let off = false;
      let objectUrl = "";
      setLoading(true);
      setError("");
      setUrl("");
      setBlob(null);
      gymService.memberCard(vid, member.id)
        .then((r) => {
          if (off) return;
          objectUrl = URL.createObjectURL(r.data);
          setBlob(r.data);
          setUrl(objectUrl);
        })
        .catch(() => { if (!off) setError("Could not create the membership card"); })
        .finally(() => { if (!off) setLoading(false); });
      return () => {
        off = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [isOpen, vid, member.id, member.plan_name, member.end_date, member.photo_url]);
  
    // Option 1: phone share sheet with the card image (the vendor picks the contact).
    const share = async () => {
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Membership card" }); }
        catch (e) { if (e?.name !== "AbortError") showError("Could not share the card"); }
      } else {
        downloadBlob(blob, fileName);
      }
    };

    // Option 2: opens this member's own WhatsApp chat directly, with the card link ready.
    // No await before window.open, so the browser treats it as a normal tap and does not block it.
    const sendLink = () => {
      const digits = String(member.phone || "").replace(/\D/g, "");
      const number = digits.length === 10 ? `91${digits}` : digits;
      if (number.length < 11 || number.length > 15) {
        showError("This member does not have a valid mobile number");
        return;
      }
      if (!cardLink) {
        showError("Card link is not ready. Please refresh the page and try again.");
        return;
      }
      const planText = member.plan_name ? ` Plan: ${member.plan_name}.` : "";
      const validTill = member.end_date ? ` Valid till ${fmtDate(member.end_date)}.` : "";
      const text = `Hi ${member.name || ""}, here is your membership card (${member.member_code || "member"}).${planText}${validTill}\n${cardLink}`;
      window.open(waUrl(number, text), "_blank", "noopener,noreferrer");
    };
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Membership card" size="md">
        <div className="space-y-3">
          {loading && <Loader />}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {url && <img src={url} alt="Membership card" className="w-full rounded-2xl shadow" />}
          <p className="text-xs text-gray-500">Card shows the gym name, member details, plan validity and your gym logo.</p>
          <p className="text-xs text-gray-500"><b>Share</b> sends the card image (you choose the contact). <b>Send link</b> opens this member's WhatsApp chat directly with a card link; the member can view and download the card from it.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={sendLink} disabled={!cardLink}><MessageSquare size={14} /> Send link</Button>
            <Button variant="outline" onClick={share} disabled={!blob}>Share</Button>
            <Button onClick={() => downloadBlob(blob, fileName)} disabled={!blob}>Download</Button>
          </div>
        </div>
      </Modal>
    );
  }

  export default function MemberDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const { venue } = useVenue();
    const vid = venue?.id;
    const { user } = useAuth();
    const canDelete = user?.role !== "team_member"; // team members can archive, only the owner can delete
    const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/members/${id}` : null, { skip: !vid });
    const [modal, setModal] = useState(null);
    const [msg, setMsg] = useState(null);
    const [freezeDays, setFreezeDays] = useState("7");

  
    if (loading || !data) return <GymPage title="Member"><Loader /></GymPage>;
    const { member: m, memberships, payments, workout_plans: plans, renewal_quote: rq, pay_ready: pr, plan, card_link: cardLink } = data;
    const done = (text) => () => { setModal(null); if (text) showSuccess(text); refetch(); };
    const act = async (fn, ok) => { try { await fn(); showSuccess(ok); refetch(); } catch (e) { showError(errMsg(e)); } };
 
    const downloadReceipt = async (p) => {
      try { const r = await gymService.receiptPdf(vid, p.id); downloadBlob(r.data, `${p.receipt_no || "receipt"}.pdf`); }
      catch { showError("Could not download the receipt"); }
    };
  
    const hasDue = +m.balance_due > 0;
    const msgTypes = [
      ...(m.end_date ? [{ key: "renewal", label: "Renewal reminder" }] : []),
      ...(hasDue ? [{ key: "dues", label: "Dues" }] : []),
      { key: "welcome", label: "Welcome" }
    ];
    if (hasDue && m.display_status === "active") msgTypes.sort((a, b) => (b.key === "dues") - (a.key === "dues"));
  
    return (
      <GymPage title={m.name} subtitle={`${m.member_code} · ${m.phone}`}
        actions={<Button variant="outline" onClick={() => setModal("edit")}><Pencil size={14} /> Edit</Button>}>
        <Card className="mb-3">
          <div className="flex items-start gap-4">
            <div className="relative">
              {m.photo_url ? <img src={m.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-semibold">{m.name[0]}</div>}
              <button onClick={() => setModal("photo")} aria-label="Change photo" className="absolute -bottom-1 -right-1 bg-white border rounded-full p-1.5"><Camera size={13} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><StatusPill status={m.display_status} daysLeft={m.days_left} />{m.has_pt && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">PT</span>}</div>
              <p className="text-sm text-gray-700 mt-2">{m.plan_name || "No plan"}{m.end_date ? ` · ${fmtDate(m.start_date)} → ${fmtDate(m.end_date)}` : ""}</p>
              {m.status === "frozen" && <p className="text-xs text-sky-700 mt-1">Frozen since {fmtDate(m.frozen_on)} until {fmtDate(m.freeze_until)}</p>}
              {hasDue && <p className="text-sm font-semibold text-red-600 mt-1">Due: {inr(m.balance_due)}</p>}
              <div className="flex gap-3 mt-2 text-sm">
                <a href={`tel:+91${m.phone}`} className="flex items-center gap-1 text-primary-600"><Phone size={14} /> Call</a>
              </div>
            </div>
          </div>
          {(m.health_notes || m.goal) && (
            <div className="mt-3 pt-3 border-t text-sm text-gray-600 space-y-1">
              {m.goal && <p><b>Goal:</b> {m.goal.replace(/_/g, " ")}</p>}
              {m.health_notes && <p><b>Health:</b> {m.health_notes}</p>}
            </div>
          )}
        </Card>
  
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Button onClick={() => setModal("renew")} disabled={m.status === "frozen"}><RefreshCw size={14} /> Renew{rq ? ` ${inr(rq.total)}` : ""}</Button>
          <Button variant="outline" onClick={() => setModal("pay")} disabled={!hasDue}><IndianRupee size={14} /> Record payment</Button>
          <Button variant="outline" onClick={() => setModal("link")} disabled={!pr.razorpay && !pr.upi}><Link2 size={14} /> Payment link</Button>
          {m.status === "frozen"
            ? <Button variant="outline" onClick={() => act(() => gymService.unfreeze(vid, m.id), "Membership resumed")}><Snowflake size={14} /> Unfreeze</Button>
            : <Button variant="outline" onClick={() => setModal("freeze")} disabled={!m.end_date || m.days_left < 0 || (plan && !plan.freeze_allowed)}><Snowflake size={14} /> Freeze</Button>}
          <Button variant="outline" onClick={() => setMsg({ title: "Message", types: msgTypes })}><MessageSquare size={14} /> Message</Button>
          <Button variant="outline" onClick={() => setModal("workout")}><Dumbbell size={14} /> Workout</Button>
          <Button variant="outline" onClick={() => setModal("card")}><CreditCard size={14} /> Card</Button>
          <Button variant="outline" onClick={() => setModal("edit")}><Pencil size={14} /> Edit details</Button>
          <Button variant="outline" className="sm:col-span-2 text-red-600" onClick={() => setModal("archive")}><Archive size={14} /> Archive member</Button>
          {canDelete && <Button variant="outline" className="sm:col-span-2 text-red-600" onClick={() => setModal("delete")}><Trash2 size={14} /> Delete member</Button>}
        </div>
        {!pr.razorpay && !pr.upi && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">Add your UPI ID (Settings &gt; Payment) or connect Razorpay in Gym Settings to create payment links.</p>}
  
        <div className="grid md:grid-cols-2 gap-3">
          <Card title="Membership history">
            <div className="divide-y text-sm">
              {memberships.map((ms) => (
                <div key={ms.id} className="py-2.5">
                  <div className="flex justify-between"><span className="font-medium">{ms.plan_name} <span className="text-xs text-gray-400">({ms.kind})</span></span><span>{inr(ms.total_amount)}</span></div>
                  <p className="text-xs text-gray-500">{fmtDate(ms.start_date)} → {fmtDate(ms.end_date)} · paid {inr(ms.amount_paid)}{ms.freeze_days_used ? ` · ${ms.freeze_days_used}d frozen` : ""}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Payments">
            <div className="divide-y text-sm">
              {payments.length === 0 && <p className="text-gray-400">No payments yet.</p>}
              {payments.map((p) => (
                <div key={p.id} className="py-2.5 flex justify-between gap-2">
                  <div><p className="font-medium">{inr(p.amount)} <span className="text-xs text-gray-400 uppercase">{p.mode}</span></p><p className="text-xs text-gray-500">{p.status === "paid" ? `${fmtDate(p.paid_on)} · ${p.receipt_no}` : p.status}</p></div>
                  {p.status === "paid" && (
                    <div className="flex gap-1">
                      <Button variant="outline" onClick={() => downloadReceipt(p)}><FileText size={13} /> Receipt</Button>
                      <Button variant="outline" onClick={() => setMsg({ title: "Receipt message", params: { type: "receipt", payment_id: p.id } })}><MessageSquare size={13} /></Button>
                    </div>
                  )}
                  {p.status === "pending" && (
                    <div className="flex gap-1">
                      {!p.rzp_link_id && <Button onClick={() => act(() => gymService.confirmPayment(vid, p.id), "Confirmed")}>Confirm</Button>}
                      <Button variant="outline" onClick={() => act(() => gymService.cancelPayment(vid, p.id), "Cancelled")}>Cancel</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card title="Workout plans" className="md:col-span-2">
            {plans.length === 0 ? <p className="text-sm text-gray-400">No plan assigned yet.</p> : (
              <div className="divide-y text-sm">
                {plans.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div><Link to={`/dashboard/gym/workouts/${p.id}`} className="font-medium">{p.name}</Link><p className="text-xs text-gray-500">Assigned {fmtDate(String(p.createdAt).slice(0, 10))}</p></div>
                    <div className="flex gap-2 items-center">
                      <a href={`${API_BASE_URL}/public/gym/workout/${p.share_token}/pdf`} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs font-medium">Download PDF</a>
                      <Button variant="outline" onClick={() => setMsg({ title: "Workout plan message", params: { type: "workout", plan_id: p.id } })}><MessageSquare size={13} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
  
        {msg && <MessageModal key={msg.title} onClose={() => setMsg(null)} vid={vid} memberId={m.id} title={msg.title} types={msg.types} params={msg.params} />}
        <RenewModal isOpen={modal === "renew"} onClose={() => setModal(null)} vid={vid} member={m} onDone={done("Renewed")} />
        <MemberCardModal isOpen={modal === "card"} onClose={() => setModal(null)} vid={vid} member={m} cardLink={cardLink} />
        <PayModal isOpen={modal === "pay"} onClose={() => setModal(null)} vid={vid} member={m} onDone={done()} />
        <LinkModal isOpen={modal === "link"} onClose={() => setModal(null)} vid={vid} member={m} hasDue={hasDue} />
        <EditModal isOpen={modal === "edit"} onClose={() => setModal(null)} vid={vid} member={m} memberships={memberships} onDone={done("Member details updated")} />
        <DeleteMemberModal isOpen={modal === "delete"} onClose={() => setModal(null)} vid={vid} member={m} memberships={memberships} payments={payments} workoutCount={plans.length} onDeleted={() => nav("/dashboard/gym/members")} />
        <PhotoModal isOpen={modal === "photo"} onClose={() => setModal(null)} vid={vid} member={m} onDone={done("Photo updated")} />
        <AssignWorkoutModal isOpen={modal === "workout"} onClose={() => setModal(null)} vid={vid} member={m} onDone={done()} />
        <Modal isOpen={modal === "freeze"} onClose={() => setModal(null)} title="Freeze membership" size="sm">
          <div className="space-y-3">
            <p className="text-sm text-gray-500">The expiry date moves forward by the days actually frozen.{plan ? ` Max ${plan.max_freeze_days} days on this plan.` : ""}</p>
            <Input label="Days" inputMode="numeric" value={freezeDays} onChange={(e) => setFreezeDays(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={() => act(() => gymService.freeze(vid, m.id, { days: +freezeDays }), "Membership frozen").then(() => setModal(null))}>Freeze</Button>
            </div>
          </div>
        </Modal>
        <ConfirmDialog isOpen={modal === "archive"} onClose={() => setModal(null)} title="Archive member?" confirmText="Archive"
          message="The member is hidden from lists and pending payment links are cancelled. Payment history is kept."
          onConfirm={async () => { try { await gymService.archiveMember(vid, m.id); showSuccess("Archived"); nav("/dashboard/gym/members"); } catch (e) { showError(errMsg(e)); } }} />
      </GymPage>
    );
  }