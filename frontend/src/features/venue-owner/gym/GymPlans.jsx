import React, { useState } from "react";
import { Plus, Pencil, Trash2, Snowflake } from "lucide-react";
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

const BLANK = { name: "", duration_unit: "months", duration_value: 1, price: "", discount_percent: "", joining_fee: "", pt_addon_price: "", tax_rate: "", freeze_allowed: true, max_freeze_days: 15, is_popular: false, is_active: true, description: "" };
const PRESETS = [["1 Month", 1], ["3 Months", 3], ["6 Months", 6], ["12 Months", 12]];

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

  return (
    <GymPage title="Membership plans" subtitle="Prices, joining fee, personal training and freeze rules"
      actions={isOwner && <Button onClick={() => openForm(null)}><Plus size={15} /> Add plan</Button>}>
      {loading ? <Loader /> : !plans?.length ? (
        <EmptyState title="No plans yet" description="Create 1, 3, 6 and 12 month plans to start adding members." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add plan" : "Edit plan"} size="lg">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([label, n]) => (
              <button key={n} type="button" onClick={() => setF((s) => ({ ...s, name: s.name || label, duration_unit: "months", duration_value: n }))}
                className="px-3 py-1 rounded-full border text-xs text-gray-600">{label}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Plan name *" value={f.name} onChange={set("name")} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Duration *" inputMode="numeric" value={f.duration_value} onChange={set("duration_value")} />
              <Select label="Unit" value={f.duration_unit} onChange={set("duration_unit")} options={[{ value: "months", label: "Months" }, { value: "days", label: "Days" }]} />
            </div>
            <Input label="Price (₹) *" inputMode="decimal" value={f.price} onChange={set("price")} />
            <Input label="Discount (%)" inputMode="decimal" value={f.discount_percent} onChange={set("discount_percent")} />
            <Input label="Joining fee (₹)" inputMode="decimal" value={f.joining_fee} onChange={set("joining_fee")} />
            <Input label="Personal training add-on (₹)" inputMode="decimal" value={f.pt_addon_price} onChange={set("pt_addon_price")} />
            <Input label="GST (%) included in price" inputMode="decimal" value={f.tax_rate} onChange={set("tax_rate")} />
            <Input label="Max freeze days" inputMode="numeric" value={f.max_freeze_days} onChange={set("max_freeze_days")} />
          </div>
          <Field label="Description"><TextArea value={f.description} onChange={set("description")} /></Field>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.freeze_allowed} onChange={set("freeze_allowed")} /> Allow freeze</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_popular} onChange={set("is_popular")} /> Mark popular</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Active</label>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={busy} disabled={!f.name || !f.price}>Save plan</Button></div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete plan?" confirmText="Delete" message="If members already use this plan it will be deactivated instead of deleted." />
    </GymPage>
  );
}