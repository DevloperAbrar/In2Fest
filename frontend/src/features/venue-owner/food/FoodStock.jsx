import React, { useCallback, useEffect, useState } from "react";
import { Plus, Share2 } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { foodService } from "../../../services/foodService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import EmptyState from "../../../components/common/EmptyState";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { FoodPage, errMsg, shareContent } from "./foodShared.jsx";

const UNITS = ["kg", "g", "ltr", "ml", "pcs"].map((u) => ({ value: u, label: u }));
const ACTIONS = [{ value: "purchase", label: "Stock in (purchase)" }, { value: "wastage", label: "Wastage / spoilage" }, { value: "adjust", label: "Set real count" }];

export default function FoodStock() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [adj, setAdj] = useState(null);

  const load = useCallback(async () => {
    if (!vid) return;
    try { setRows((await foodService.ingredients(vid)).data.data); } catch (e) { showError(errMsg(e)); setRows([]); }
  }, [vid]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => { try { await fn(); showSuccess(ok); load(); } catch (e) { showError(errMsg(e)); } };

  const shopping = async () => {
    const low = rows.filter((r) => r.low);
    const text = `Shopping list - ${venue.hall_name}\n${low.map((r) => `• ${r.name}: ${Math.max(r.reorder_level * 2 - r.stock_qty, r.reorder_level).toFixed(1)} ${r.unit}`).join("\n")}`;
    const r = await shareContent({ title: "Shopping list", text });
    if (r === "copied") showSuccess("Copied");
  };

  if (!rows) return <FoodPage title="Stock"><Loader /></FoodPage>;
  const low = rows.filter((r) => r.low);

  return (
    <FoodPage title="Ingredient stock" subtitle="Link dishes to ingredients in the Menu tab and stock reduces by itself"
      actions={<><Button variant="outline" disabled={low.length === 0} onClick={shopping}><Share2 size={14} /> Shopping list</Button><Button onClick={() => setForm({ name: "", unit: "kg", stock_qty: "", reorder_level: "", cost_per_unit: "" })}><Plus size={15} /> Add</Button></>}>
      {rows.length === 0 ? <EmptyState title="No ingredients yet" description="Add paneer, rice, oil, flour... with their cost. Then food cost % shows on every dish." /> : (
        <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
          {rows.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-500">₹{r.cost_per_unit}/{r.unit} · reorder at {r.reorder_level} {r.unit}</p>
              </div>
              <span className={`text-sm font-semibold ${r.low ? "text-red-600" : "text-gray-900"}`}>{r.stock_qty} {r.unit}</span>
              {r.low && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">LOW</span>}
              <Button variant="outline" className="!py-1.5 !px-3" onClick={() => setAdj({ id: r.id, name: r.name, type: "purchase", qty: "", cost_per_unit: "", note: "" })}>Update</Button>
              <button className="text-xs text-gray-500 underline" onClick={() => setForm({ ...r })}>Edit</button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit ingredient" : "Add ingredient"} size="sm">
        {form && (
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} options={UNITS} />
              <Input label="Cost per unit (₹)" type="number" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} />
              {!form.id && <Input label="Opening stock" type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />}
              <Input label="Alert when below" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
            <div className="flex justify-between pt-2">
              {form.id ? <button className="text-sm text-red-600" onClick={() => { if (window.confirm("Remove this ingredient?")) run(async () => { await foodService.deleteIngredient(vid, form.id); setForm(null); }, "Removed"); }}>Remove</button> : <span />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={() => run(async () => {
                  const body = { name: form.name, unit: form.unit, cost_per_unit: form.cost_per_unit || 0, reorder_level: form.reorder_level || 0, stock_qty: form.stock_qty };
                  if (form.id) await foodService.updateIngredient(vid, form.id, body); else await foodService.createIngredient(vid, body);
                  setForm(null);
                }, "Saved")}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!adj} onClose={() => setAdj(null)} title={`Update ${adj?.name || ""}`} size="sm">
        {adj && (
          <div className="space-y-3">
            <Select label="What happened?" value={adj.type} onChange={(e) => setAdj({ ...adj, type: e.target.value })} options={ACTIONS} />
            <Input label={adj.type === "adjust" ? "Real count now" : "Quantity"} type="number" step="any" value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} />
            {adj.type === "purchase" && <Input label="New cost per unit (optional)" type="number" value={adj.cost_per_unit} onChange={(e) => setAdj({ ...adj, cost_per_unit: e.target.value })} />}
            <Input label="Note (optional)" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdj(null)}>Cancel</Button>
              <Button onClick={() => run(async () => { await foodService.adjustStock(vid, adj.id, adj); setAdj(null); }, "Stock updated")}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </FoodPage>
  );
}