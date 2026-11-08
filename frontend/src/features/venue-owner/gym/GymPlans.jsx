import React, { useState } from "react";
import { Plus, Pencil, Trash2, Snowflake, Star, Tag, CalendarRange, SlidersHorizontal, Dumbbell, IndianRupee, Percent } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, Field, TextArea, inr, errMsg } from "./gymShared.jsx";
import { TONES } from "./gymUi.jsx";
import { SheetSection } from "./memberUi.jsx";

const BLANK = { name: "", duration_unit: "months", duration_value: 1, price: "", discount_percent: "", joining_fee: "", pt_addon_price: "", tax_rate: "", freeze_allowed: true, max_freeze_days: 15, is_popular: false, is_active: true, description: "" };
const PRESETS = [["1 Month", 1], ["3 Months", 3], ["6 Months", 6], ["12 Months", 12]];

const finalPrice = (p) => +p.price - (+p.price * (+p.discount_percent || 0)) / 100;

// Colour of the duration badge on the mobile card.
const durationTone = (p) => {
  if (p.duration_unit !== "months") return "navy";
  const v = +p.duration_value;
  if (v <= 1) return "sky";
  if (v <= 3) return "emerald";
  if (v <= 6) return "violet";
  return "amber";
};

// Hand-built drawing for "no plans yet".
function EmptyPlansArt({ className = "" }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <ellipse cx="80" cy="108" rx="52" ry="7" className="fill-navy-100/70" />
      <rect x="22" y="38" width="76" height="56" rx="14" className="fill-white stroke-navy-200" strokeWidth="2" transform="rotate(-6 60 66)" />
      <rect x="62" y="24" width="76" height="62" rx="14" className="fill-white stroke-navy-200" strokeWidth="2" />
      <rect x="74" y="38" width="30" height="6" rx="3" className="fill-navy-200" />
      <rect x="74" y="52" width="46" height="9" rx="4.5" className="fill-primary-500" />
      <rect x="74" y="68" width="34" height="5" rx="2.5" className="fill-navy-100" />
      <circle cx="132" cy="28" r="14" className="fill-primary-500" />
      <path d="M132 22v12M126 28h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// One plan on mobile (desktop keeps the original Card grid below).
function MobilePlanCard({ p, isOwner, onEdit, onDelete }) {
  const final = finalPrice(p);
  const tone = durationTone(p);
  const hasDiscount = +p.discount_percent > 0;
  const perMonth = p.duration_unit === "months" && +p.duration_value > 1 ? Math.round(final / +p.duration_value) : 0;
  const unitLabel = p.duration_unit === "months" ? (+p.duration_value === 1 ? "month" : "months") : (+p.duration_value === 1 ? "day" : "days");

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-white shadow-card ${p.is_popular ? "border-2 border-primary-300" : "border border-navy-100/70"} ${p.is_active ? "" : "opacity-60"}`}
    >
      {p.is_popular && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-[11px] font-semibold py-1.5">
          <Star size={12} fill="currentColor" /> Most popular
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${TONES[tone].chip}`}>
            <span className="font-display font-bold text-[20px] leading-none tabular-nums">{p.duration_value}</span>
            <span className="text-[10px] font-semibold mt-0.5 leading-none">{unitLabel}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-[16px] text-navy-900 truncate">{p.name}</h3>
              {!p.is_active && <span className="text-[10.5px] font-semibold bg-navy-100 text-navy-500 rounded-full px-2 py-0.5">Inactive</span>}
            </div>
            <div className="mt-1.5 flex items-end gap-2 flex-wrap">
              <span className="font-display font-bold text-[26px] leading-none text-navy-900 tabular-nums">{inr(final)}</span>
              {hasDiscount && <span className="text-[13px] text-navy-300 line-through tabular-nums pb-0.5">{inr(p.price)}</span>}
              {hasDiscount && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 px-2 py-0.5 text-[11px] font-semibold mb-0.5">
                  <Percent size={10} strokeWidth={2.6} /> {Math.round(+p.discount_percent)} off
                </span>
              )}
            </div>
            {perMonth > 0 && <p className="text-[12px] text-navy-400 mt-1 tabular-nums">About {inr(perMonth)} per month</p>}
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {+p.joining_fee > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 text-navy-600 px-2.5 py-1 text-[11.5px] font-medium">
              <IndianRupee size={12} /> Joining fee {inr(p.joining_fee)}
            </span>
          )}
          {+p.pt_addon_price > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-700 px-2.5 py-1 text-[11.5px] font-medium">
              <Dumbbell size={12} /> Personal training +{inr(p.pt_addon_price)}
            </span>
          )}
          {p.freeze_allowed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-700 px-2.5 py-1 text-[11.5px] font-medium">
              <Snowflake size={12} /> Freeze up to {p.max_freeze_days} days
            </span>
          )}
          {+p.tax_rate > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 text-[11.5px] font-medium">
              <Percent size={12} /> GST {+p.tax_rate}% included
            </span>
          )}
        </div>

        {p.description && <p className="mt-3 text-[12.5px] text-navy-500 leading-snug line-clamp-2">{p.description}</p>}

        {isOwner && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(p)}
              className="tap-scale flex-1 h-11 rounded-2xl bg-navy-50 text-navy-800 text-[13.5px] font-semibold flex items-center justify-center gap-2"
            >
              <Pencil size={15} /> Edit plan
            </button>
            <button
              type="button"
              onClick={() => onDelete(p)}
              aria-label={`Delete ${p.name}`}
              className="tap-scale w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GymPlans() {
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const isOwner = user?.role !== "team_member" || !!user?.isDemo;
  const { data: plans, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/plans?all=true` : null, { skip: !vid });
  const [editing, setEditing] = useState(null); // null | "new" | plan
  const [f, setF] = useState(BLANK);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const openForm = (p) => { setF(p ? { ...BLANK, ...p, description: p.description || "" } : BLANK); setEditing(p || "new"); };
  const save = async () => {
    setBusy(true);
    try {
      if (editing === "new") await gymService.createPlan(vid, f); else await gymService.updatePlan(vid, editing.id, f);
      showSuccess("Plan saved"); setEditing(null); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try { const r = await gymService.deletePlan(vid, del.id); showSuccess(r.data.data.archived ? "Plan has members, so it was deactivated" : "Plan deleted"); refetch(); }
    catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };

  // Mobile summary numbers (worked out from the plans already loaded)
  const list = plans || [];
  const activeList = list.filter((p) => p.is_active);
  const cheapest = activeList.length ? Math.min(...activeList.map(finalPrice)) : null;

  // Live price preview inside the form (mobile)
  const formFinal = +f.price > 0 ? finalPrice(f) : null;
  const formPerMonth = formFinal !== null && f.duration_unit === "months" && +f.duration_value > 1 ? Math.round(formFinal / +f.duration_value) : 0;

  const toggleRow = "flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3 py-3 md:border-0 md:bg-transparent md:p-0 md:gap-2 text-sm";

  return (
    <GymPage title="Membership plans" subtitle="Prices, joining fee, personal training and freeze rules"
      actions={isOwner && <div className="hidden md:block"><Button onClick={() => openForm(null)}><Plus size={15} /> Add plan</Button></div>}>

      {/* Mobile: Add button + quick numbers */}
      {isOwner && (
        <button
          type="button"
          onClick={() => openForm(null)}
          className="md:hidden tap-scale w-full h-[54px] mb-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-semibold text-[14.5px] shadow-card flex items-center justify-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Plus size={18} /></span>
          Add plan
        </button>
      )}
      {!loading && list.length > 0 && (
        <div className="md:hidden grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-white border border-navy-100/70 shadow-card px-3 py-2.5">
            <p className="text-[10.5px] text-navy-400">Plans</p>
            <p className="mt-0.5 font-display font-bold text-[18px] text-navy-900 tabular-nums">{list.length}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
            <p className="text-[10.5px] text-emerald-700/70">Active</p>
            <p className="mt-0.5 font-display font-bold text-[18px] text-emerald-700 tabular-nums">{activeList.length}</p>
          </div>
          <div className="rounded-2xl bg-primary-50 border border-primary-100 px-3 py-2.5 min-w-0">
            <p className="text-[10.5px] text-primary-700/70">Starts from</p>
            <p className="mt-0.5 font-display font-bold text-[18px] text-primary-700 tabular-nums truncate">{cheapest === null ? "–" : inr(cheapest)}</p>
          </div>
        </div>
      )}

      {loading ? <Loader /> : !plans?.length ? (
        <>
          <div className="md:hidden flex flex-col items-center text-center px-6 py-8">
            <EmptyPlansArt className="w-44 h-36" />
            <h3 className="mt-2 font-display font-semibold text-[16px] text-navy-900">No plans yet</h3>
            <p className="mt-1 text-[13px] text-navy-400 max-w-[270px] leading-snug">Create 1, 3, 6 and 12 month plans to start adding members.</p>
          </div>
          <div className="hidden md:block">
            <EmptyState title="No plans yet" description="Create 1, 3, 6 and 12 month plans to start adding members." />
          </div>
        </>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {plans.map((p) => (
              <MobilePlanCard key={p.id} p={p} isOwner={isOwner} onEdit={openForm} onDelete={setDel} />
            ))}
          </div>

          {/* Desktop / tablet grid (unchanged) */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p) => {
              const final = +p.price - (+p.price * +p.discount_percent) / 100;
              return (
                <Card key={p.id} className={p.is_active ? "" : "opacity-60"}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">{p.duration_value} {p.duration_unit === "months" ? "month(s)" : "day(s)"}{p.is_popular ? " · ★ Popular" : ""}{p.is_active ? "" : " · Inactive"}</p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-1">
                        <button onClick={() => openForm(p)} className="p-1.5 text-gray-400 hover:text-gray-700"><Pencil size={15} /></button>
                        <button onClick={() => setDel(p)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-3">{inr(final)} {+p.discount_percent > 0 && <span className="text-sm font-normal text-gray-400 line-through">{inr(p.price)}</span>}</p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-0.5">
                    {+p.joining_fee > 0 && <li>Joining fee {inr(p.joining_fee)}</li>}
                    {+p.pt_addon_price > 0 && <li>Personal training +{inr(p.pt_addon_price)}</li>}
                    {p.freeze_allowed && <li className="flex items-center gap-1"><Snowflake size={11} /> Freeze up to {p.max_freeze_days} days</li>}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add plan" : "Edit plan"} size="lg">
        <div className="space-y-3">
          <SheetSection icon={CalendarRange} title="Plan and duration" hint="Pick a quick option or type your own" tone="sky">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(([label, n]) => {
                const on = f.duration_unit === "months" && +f.duration_value === n;
                return (
                  <button key={n} type="button" onClick={() => setF((s) => ({ ...s, name: s.name || label, duration_unit: "months", duration_value: n }))}
                    className={`tap-scale px-3.5 py-1.5 md:px-3 md:py-1 rounded-full border text-[13px] md:text-xs font-medium ${on ? "bg-navy-900 text-white border-navy-900 md:bg-transparent md:text-gray-600 md:border-gray-200" : "bg-white text-gray-600"}`}>{label}</button>
                );
              })}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Plan name *" value={f.name} onChange={set("name")} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Duration *" inputMode="numeric" value={f.duration_value} onChange={set("duration_value")} />
                <Select label="Unit" value={f.duration_unit} onChange={set("duration_unit")} options={[{ value: "months", label: "Months" }, { value: "days", label: "Days" }]} />
              </div>
            </div>
          </SheetSection>

          <SheetSection icon={Tag} title="Pricing" hint="Price is what the member pays" tone="emerald">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price (₹) *" inputMode="decimal" value={f.price} onChange={set("price")} />
              <Input label="Discount (%)" inputMode="decimal" value={f.discount_percent} onChange={set("discount_percent")} />
              <Input label="Joining fee (₹)" inputMode="decimal" value={f.joining_fee} onChange={set("joining_fee")} />
              <Input label="GST (%) included" inputMode="decimal" value={f.tax_rate} onChange={set("tax_rate")} />
              <div className="col-span-2">
                <Input label="Personal training add-on (₹)" inputMode="decimal" value={f.pt_addon_price} onChange={set("pt_addon_price")} />
              </div>
            </div>
            {formFinal !== null && (
              <div className="md:hidden rounded-2xl bg-navy-900 text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-white/60">Member pays</p>
                  {formPerMonth > 0 && <p className="text-[11px] text-white/50 mt-0.5 tabular-nums">About {inr(formPerMonth)} per month</p>}
                </div>
                <p className="font-display font-bold text-[22px] tabular-nums">{inr(formFinal)}</p>
              </div>
            )}
          </SheetSection>

          <SheetSection icon={SlidersHorizontal} title="Freeze and options" tone="violet">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Max freeze days" inputMode="numeric" value={f.max_freeze_days} onChange={set("max_freeze_days")} />
            </div>
            <Field label="Description"><TextArea value={f.description} onChange={set("description")} /></Field>
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-5">
              <label className={toggleRow}><input type="checkbox" className="w-4 h-4 accent-primary-600" checked={f.freeze_allowed} onChange={set("freeze_allowed")} /> Allow freeze</label>
              <label className={toggleRow}><input type="checkbox" className="w-4 h-4 accent-primary-600" checked={f.is_popular} onChange={set("is_popular")} /> Mark popular</label>
              <label className={toggleRow}><input type="checkbox" className="w-4 h-4 accent-primary-600" checked={f.is_active} onChange={set("is_active")} /> Active</label>
            </div>
          </SheetSection>

          <div className="sticky bottom-0 z-10 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 md:mx-0 md:mb-0 px-5 sm:px-6 md:px-0 py-3 md:pt-2 md:pb-0 bg-white/95 backdrop-blur border-t border-navy-100/70 md:border-0 md:bg-transparent md:backdrop-blur-none md:static flex gap-2 md:justify-end">
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="flex-[2] md:flex-none" onClick={save} loading={busy} disabled={!f.name || !f.price}>Save plan</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete plan?" confirmText="Delete" message="If members already use this plan it will be deactivated instead of deleted." />
    </GymPage>
  );
}