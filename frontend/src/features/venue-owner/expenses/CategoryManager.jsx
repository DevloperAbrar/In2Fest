import React, { useState } from "react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { expenseService } from "../../../services/expenseService";
import { COST_GROUPS, errMsg, inr, inputCls } from "./expenseShared.jsx";

export default function CategoryManager({ isOpen, onClose, vid, categories = [], onChanged }) {
  const [tab, setTab] = useState("expense");
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});
  const [adding, setAdding] = useState({ label: "", monthly_budget: "", cost_group: "operations" });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = categories.filter((c) => c.kind === tab).sort((a, b) => Number(b.is_active) - Number(a.is_active));

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      if (ok) showSuccess(ok);
      onChanged?.();
      return true;
    } catch (e) {
      showError(errMsg(e, "Something went wrong"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setDraft({ label: c.label, monthly_budget: c.monthly_budget ?? "", cost_group: c.cost_group });
  };
  const saveEdit = async (c) => {
    const patch = { label: draft.label };
    if (c.kind === "expense") patch.monthly_budget = draft.monthly_budget === "" ? null : Number(draft.monthly_budget);
    if (!c.is_system && c.kind === "expense") patch.cost_group = draft.cost_group;
    if (await run(() => expenseService.updateCategory(vid, c.id, patch), "Category updated")) setEditId(null);
  };
  const add = async () => {
    const body = { kind: tab, label: adding.label, cost_group: adding.cost_group };
    if (tab === "expense" && adding.monthly_budget !== "") body.monthly_budget = Number(adding.monthly_budget);
    if (await run(() => expenseService.createCategory(vid, body), "Category added")) setAdding({ label: "", monthly_budget: "", cost_group: "operations" });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage categories" size="lg">
      <div className="grid grid-cols-2 gap-1 p-1 bg-navy-50 rounded-xl mb-4">
        {[["expense", "Expense categories"], ["income", "Income categories"]].map(([v, label]) => (
          <button key={v} type="button" onClick={() => { setTab(v); setEditId(null); }}
            className={`py-2 rounded-lg text-sm font-medium ${tab === v ? "bg-white shadow-sm text-navy-900" : "text-navy-400"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <input value={adding.label} maxLength={60} onChange={(e) => setAdding((p) => ({ ...p, label: e.target.value }))}
          placeholder="New category name" className={`${inputCls} flex-1 min-w-[160px]`} />
        {tab === "expense" && (
          <>
            <input type="number" min="0" value={adding.monthly_budget} onChange={(e) => setAdding((p) => ({ ...p, monthly_budget: e.target.value }))}
              placeholder="Monthly budget ₹" className={`${inputCls} w-36`} />
            <select value={adding.cost_group} onChange={(e) => setAdding((p) => ({ ...p, cost_group: e.target.value }))} className={`${inputCls} w-48`}>
              {COST_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </>
        )}
        <Button loading={busy} disabled={adding.label.trim().length < 2} onClick={add}>Add</Button>
      </div>

      <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
        {list.map((c) => (
          <div key={c.id} className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-navy-100 ${c.is_active ? "bg-white" : "bg-navy-50/60 opacity-70"}`}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
            {editId === c.id ? (
              <>
                <input value={draft.label} maxLength={60} onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))} className={`${inputCls} flex-1 min-w-[140px]`} />
                {c.kind === "expense" && (
                  <input type="number" min="0" value={draft.monthly_budget} onChange={(e) => setDraft((p) => ({ ...p, monthly_budget: e.target.value }))}
                    placeholder="Budget ₹/mo" className={`${inputCls} w-32`} />
                )}
                {c.kind === "expense" && !c.is_system && (
                  <select value={draft.cost_group} onChange={(e) => setDraft((p) => ({ ...p, cost_group: e.target.value }))} className={`${inputCls} w-44`}>
                    {COST_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                )}
                <Button loading={busy} onClick={() => saveEdit(c)}>Save</Button>
                <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-900 truncate">{c.label}{!c.is_active && " (archived)"}</p>
                  <p className="text-[11.5px] text-navy-400">
                    {c.is_system ? "Default" : "Custom"}
                    {c.kind === "expense" && (c.monthly_budget ? ` · Budget ${inr(c.monthly_budget)}/month` : " · No budget")}
                  </p>
                </div>
                <button type="button" onClick={() => startEdit(c)} className="text-[12.5px] text-primary-700 hover:underline">Edit</button>
                <button type="button" disabled={busy} onClick={() => run(() => expenseService.updateCategory(vid, c.id, { is_active: !c.is_active }), c.is_active ? "Category archived" : "Category restored")}
                  className="text-[12.5px] text-navy-500 hover:underline">
                  {c.is_active ? "Archive" : "Restore"}
                </button>
                {!c.is_system && (
                  <button type="button" onClick={() => setConfirm(c)} className="text-[12.5px] text-red-600 hover:underline">Delete</button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!confirm} onClose={() => setConfirm(null)} loading={busy}
        title="Delete category?" confirmText="Delete"
        message={`"${confirm?.label}" will be removed. If it already has entries, archive it instead.`}
        onConfirm={async () => { if (await run(() => expenseService.deleteCategory(vid, confirm.id), "Category deleted")) setConfirm(null); }}
      />
    </Modal>
  );
}