import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Search } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, MODES, useLib, errMsg, fmtDate, inr, todayISO, downloadBlob } from "./libraryShared.jsx";

export default function LibraryPayments() {
  const { vid } = useLib();
  const today = todayISO();
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [mode, setMode] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ from, to, page: String(page), limit: "25" });
    if (mode) p.set("mode", mode);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [from, to, mode, q, page]);
  const { data, loading } = useFetch(vid ? `/venues/${vid}/library/payments?${qs}` : null, { skip: !vid });
  const pages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  const modeLabel = (m) => MODES.find((x) => x.value === m)?.label || m;

  const receipt = async (p) => {
    try { const r = await libraryService.receipt(vid, p.id); downloadBlob(new Blob([r.data], { type: "application/pdf" }), `${p.receipt_no}.pdf`); }
    catch (e) { showError(errMsg(e, "Could not download receipt")); }
  };

  return (
    <LibraryPage title="Payments" subtitle="Every fee collected, with receipts">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block"><span className="block text-[12px] text-navy-500 mb-1">From</span><input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="px-3 py-2 border border-navy-200 rounded-lg text-sm" /></label>
        <label className="block"><span className="block text-[12px] text-navy-500 mb-1">To</span><input type="date" value={to} min={from} max={today} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="px-3 py-2 border border-navy-200 rounded-lg text-sm" /></label>
        <select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }} className="px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white"><option value="">All modes</option>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Student, phone or receipt no." className="w-full pl-9 pr-3 py-2 border border-navy-200 rounded-lg text-sm" /></div>
      </div>

      {loading && !data ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Panel className="p-3"><p className="text-[11.5px] text-navy-400">Total collected</p><p className="font-display text-xl font-bold text-emerald-600">{inr(data?.total_amount)}</p><p className="text-[11.5px] text-navy-400">{data?.total} payments</p></Panel>
            {(data?.by_mode || []).map((m) => <Panel key={m.mode} className="p-3"><p className="text-[11.5px] text-navy-400">{modeLabel(m.mode)}</p><p className="font-display text-xl font-bold text-navy-900">{inr(m.total)}</p></Panel>)}
          </div>
          {(data?.items || []).length === 0 ? <Panel className="p-8 text-center text-sm text-navy-400">No payments in this period.</Panel> : (
            <div className="space-y-2">
              {data.items.map((p) => (
                <Panel key={p.id} className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/dashboard/library/students/${p.student_id}`} className="font-semibold text-navy-900 hover:text-primary-700 truncate block">{p.student_name} <span className="text-[11.5px] text-navy-400 font-normal">{p.student_code}</span></Link>
                    <p className="text-[12.5px] text-navy-500">{p.receipt_no} · {fmtDate(p.paid_on)} · {modeLabel(p.mode)}{p.reference ? ` · ${p.reference}` : ""}</p>
                  </div>
                  <b className="text-emerald-600 tabular-nums">{inr(p.amount)}</b>
                  <button type="button" title="Download receipt" onClick={() => receipt(p)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500"><Receipt size={17} /></button>
                </Panel>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5 text-sm">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-navy-500">Page {page} of {pages}</span>
              <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </LibraryPage>
  );
}