import React, { useEffect, useMemo, useState } from "react";
import { Search, Pencil, Trash2, Download } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { expenseService } from "../../../services/expenseService";
import { Panel, inr, errMsg, fmtDate, todayISO, monthEndISO, downloadBlob, inputCls, MODES } from "./expenseShared.jsx";

export default function ExpenseTransactions({ vid, categories = [], categoryOf, preset, refreshKey, onEdit, onChanged }) {
  const today = todayISO();
  const [f, setF] = useState({ from: `${today.slice(0, 8)}01`, to: monthEndISO(today.slice(0, 7)), type: "", category: "", status: preset?.status || "", q: "", page: 1 });
  const [qInput, setQInput] = useState("");
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, page: 1, ...patch }));

  useEffect(() => {
    const t = setTimeout(() => setF((p) => (p.q === qInput.trim() ? p : { ...p, q: qInput.trim(), page: 1 })), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ from: f.from, to: f.to, page: String(f.page), limit: "25" });
    ["type", "category", "status", "q"].forEach((k) => f[k] && p.set(k, f[k]));
    return p.toString();
  }, [f]);

  const { data, loading } = useFetch(vid ? `/venues/${vid}/expenses/entries?${qs}` : null, { skip: !vid, deps: [refreshKey] });
  const pages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  const modeLabel = (m) => MODES.find((x) => x.value === m)?.label || m;

  const markPaid = async (id) => {
    try { await expenseService.payEntry(vid, id, {}); showSuccess("Marked as paid"); onChanged?.(); }
    catch (e) { showError(errMsg(e, "Could not mark as paid")); }
  };
  const remove = async () => {
    setBusy(true);
    try { await expenseService.deleteEntry(vid, del.id); showSuccess("Entry deleted"); setDel(null); onChanged?.(); }
    catch (e) { showError(errMsg(e, "Could not delete")); }
    finally { setBusy(false); }
  };
  const exportCsv = async () => {
    try {
      const params = { from: f.from, to: f.to };
      ["type", "category", "status", "q"].forEach((k) => f[k] && (params[k] = f[k]));
      const r = await expenseService.exportCsv(vid, params);
      downloadBlob(new Blob([r.data], { type: "text/csv" }), `expenses_${f.from}_to_${f.to}.csv`);
    } catch (e) { showError(errMsg(e, "Could not export")); }
  };

  const s = data?.summary;
  return (
    <>
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <label className="block"><span className="block text-[12px] text-navy-500 mb-1">From</span>
          <input type="date" value={f.from} max={f.to} onChange={(e) => set({ from: e.target.value })} className={inputCls} /></label>
        <label className="block"><span className="block text-[12px] text-navy-500 mb-1">To</span>
          <input type="date" value={f.to} min={f.from} onChange={(e) => set({ to: e.target.value })} className={inputCls} /></label>
        <select value={f.type} onChange={(e) => set({ type: e.target.value, category: "" })} className={`${inputCls} w-auto`}>
          <option value="">All types</option><option value="expense">Expenses</option><option value="income">Income</option>
        </select>
        <select value={f.category} onChange={(e) => set({ category: e.target.value })} className={`${inputCls} w-auto max-w-[190px]`}>
          <option value="">All categories</option>
          {categories.filter((c) => !f.type || c.kind === f.type).map((c) => <option key={`${c.kind}:${c.slug}`} value={c.slug}>{c.label}</option>)}
        </select>
        <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={`${inputCls} w-auto`}>
          <option value="">Paid & due</option><option value="paid">Paid</option><option value="due">Due</option>
        </select>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search party, note or bill no." className={`${inputCls} pl-9`} />
        </div>
        <Button variant="outline" onClick={exportCsv}><Download size={15} />CSV</Button>
      </div>

      {loading && !data ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Panel className="p-3"><p className="text-[11.5px] text-navy-400">Expenses</p><p className="font-display text-lg font-bold text-red-600">{inr(s?.expense)}</p></Panel>
            <Panel className="p-3"><p className="text-[11.5px] text-navy-400">Income (manual)</p><p className="font-display text-lg font-bold text-emerald-600">{inr(s?.income)}</p></Panel>
            <Panel className="p-3"><p className="text-[11.5px] text-navy-400">Net</p><p className="font-display text-lg font-bold text-navy-900">{inr(s?.net)}</p></Panel>
            <Panel className="p-3"><p className="text-[11.5px] text-navy-400">Bills due</p><p className="font-display text-lg font-bold text-amber-600">{inr(s?.due)}</p></Panel>
          </div>

          {(data?.items || []).length === 0 ? (
            <Panel className="p-8 text-center text-sm text-navy-400">No entries in this period.</Panel>
          ) : (
            <div className="space-y-2">
              {data.items.map((e) => {
                const c = categoryOf(e.type, e.category_slug);
                const due = e.status === "due";
                return (
                  <Panel key={e.id} className="p-3 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c?.color || "#94a3b8" }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy-900 truncate">
                        {c?.label || e.category_slug}
                        {e.vendor_name && <span className="text-navy-400 font-normal"> · {e.vendor_name}</span>}
                        {due && <span className="ml-2 text-[10.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">DUE</span>}
                        {e.recurring_id && <span className="ml-2 text-[10.5px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-500">Recurring</span>}
                      </p>
                      <p className="text-[12.5px] text-navy-500 truncate">
                        {fmtDate(e.entry_date)} · {modeLabel(e.mode)}{e.reference ? ` · ${e.reference}` : ""}{e.note ? ` · ${e.note}` : ""}
                      </p>
                    </div>
                    <b className={`tabular-nums ${e.type === "income" ? "text-emerald-600" : "text-red-600"}`}>{e.type === "income" ? "+" : "-"}{inr(e.amount)}</b>
                    {due && <Button variant="outline" onClick={() => markPaid(e.id)}>Paid</Button>}
                    <button type="button" title="Edit" onClick={() => onEdit(e)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500"><Pencil size={16} /></button>
                    <button type="button" title="Delete" onClick={() => setDel(e)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                  </Panel>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5 text-sm">
              <Button variant="outline" disabled={f.page <= 1} onClick={() => setF((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button>
              <span className="text-navy-500">Page {f.page} of {pages}</span>
              <Button variant="outline" disabled={f.page >= pages} onClick={() => setF((p) => ({ ...p, page: p.page + 1 }))}>Next</Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy}
        title="Delete this entry?" confirmText="Delete"
        message={del ? `${inr(del.amount)} on ${fmtDate(del.entry_date)} will be removed from your books.` : ""}
      />
    </>
  );
}