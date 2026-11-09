import React, { useEffect, useState } from "react";
import { libraryService } from "../../../services/libraryService";
import { fmtTime, errMsg, downloadBlob } from "./libraryShared.jsx";
import { showError } from "../../../components/common/Toast";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";

const SEAT = {
  free: "bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  occupied: "bg-navy-800 border-navy-800 text-white",
  conflict: "bg-amber-100 border-amber-300 text-amber-800",
  blocked: "bg-navy-100 border-navy-200 text-navy-300 line-through"
};

// Grid of seats. Only "free" seats can be selected.
export function SeatGrid({ seats = [], perRow = 10, selected = null, onSelect, onView }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(perRow, 1), 30)}, minmax(0, 1fr))` }}>
      {seats.map((s) => {
        const isSel = selected === s.no;
        const who = s.student
          ? `${s.student.name} (${s.student.code}) · ${s.student.shift_name}${s.student.expired ? " · fee expired" : ""}`
          : s.state === "free" ? `Seat ${s.no} · free` : `Seat ${s.no}`;
        const clickable = s.state === "free" ? !!onSelect : !!onView && !!s.student;
        return (
          <button
            key={s.no}
            type="button"
            title={who}
            disabled={!clickable}
            onClick={() => (s.state === "free" ? onSelect && onSelect(s.no) : onView && onView(s))}
            className={`h-10 min-w-0 rounded-lg border text-[12px] font-semibold flex items-center justify-center transition ${SEAT[s.state]} ${
              isSel ? "ring-2 ring-primary-500 bg-primary-600 !text-white !border-primary-600" : ""
            } ${s.student && s.student.expired ? "!bg-red-500 !border-red-500 text-white" : ""} ${!clickable ? "cursor-default" : ""}`}
          >
            {s.no}
          </button>
        );
      })}
    </div>
  );
}

export const SeatLegend = () => (
  <div className="flex flex-wrap gap-3 text-[11.5px] text-navy-500">
    {[["bg-white border-emerald-300", "Free"], ["bg-navy-800 border-navy-800", "Occupied"], ["bg-red-500 border-red-500", "Fee expired"], ["bg-amber-100 border-amber-300", "Taken via overlapping shift"], ["bg-navy-100 border-navy-200", "Blocked"]].map(([c, l]) => (
      <span key={l} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded border ${c}`} />{l}</span>
    ))}
  </div>
);

const selectCls = "w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40";

// Hall + shift + seat chooser used when adding a student, renewing and changing seat.
export function SeatPicker({ vid, halls = [], shifts = [], value, onChange }) {
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const { hall_id, shift_id, seat_no } = value;

  useEffect(() => {
    if (!vid || !hall_id || !shift_id) { setMap(null); return undefined; }
    let live = true;
    setLoading(true);
    libraryService.seatMap(vid, hall_id, shift_id)
      .then((r) => { if (live) setMap(r.data.data); })
      .catch((e) => { if (live) { setMap(null); showError(errMsg(e, "Could not load seats")); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [vid, hall_id, shift_id]);

  const set = (patch) => onChange({ ...value, ...patch });
  const freeCount = map ? map.seats.filter((s) => s.state === "free").length : 0;

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[13px] font-medium text-navy-700 mb-1.5">Shift *</span>
          <select className={selectCls} value={shift_id || ""} onChange={(e) => set({ shift_id: e.target.value, seat_no: "" })}>
            <option value="">Choose shift</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} · {fmtTime(s.start_time)}-{fmtTime(s.end_time)} · ₹{Number(s.price).toLocaleString("en-IN")}/mo</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[13px] font-medium text-navy-700 mb-1.5">Hall / Room *</span>
          <select className={selectCls} value={hall_id || ""} onChange={(e) => set({ hall_id: e.target.value, seat_no: "" })}>
            <option value="">Choose hall</option>
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.total_seats} seats)</option>)}
          </select>
        </label>
      </div>
      {hall_id && shift_id && (
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-navy-700">Seat * {seat_no ? <span className="text-primary-600">· selected {seat_no}</span> : null}</p>
            {map && <p className="text-[12px] text-navy-400">{freeCount} free</p>}
          </div>
          {loading ? <p className="text-sm text-navy-400 py-4 text-center">Loading seats…</p>
            : map ? <SeatGrid seats={map.seats} perRow={map.hall.seats_per_row} selected={Number(seat_no) || null} onSelect={(n) => set({ seat_no: n })} /> : null}
          <div className="mt-3"><SeatLegend /></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- CSV import (students and books) ---------------- */
export function parseCsv(text) {
  const s = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const push = () => { row.push(cell); cell = ""; };
  const endRow = () => { push(); if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") push();
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; endRow(); }
    else cell += c;
  }
  if (cell !== "" || row.length) endRow();
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((x) => x.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

// columns: [{ key, required }]   sample: array of objects shown in the downloadable template
export function CsvImport({ title, hint, columns, sample, onImport, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const missing = columns.filter((c) => c.required && rows.length && !(c.key in rows[0])).map((c) => c.key);

  const template = () => {
    const head = columns.map((c) => c.key).join(",");
    const lines = sample.map((r) => columns.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(","));
    downloadBlob(new Blob([`${head}\n${lines.join("\n")}\n`], { type: "text/csv" }), "import-template.csv");
  };
  const pick = async (f) => {
    if (!f) return;
    setFile(f.name);
    setResult(null);
    setRows(parseCsv(await f.text()));
  };
  const go = async () => {
    setBusy(true);
    try { setResult(await onImport(rows)); }
    catch (e) { showError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <p className="text-[13px] text-navy-500">{hint}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={template}>Download template</Button>
          <label className="px-4 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-medium cursor-pointer">
            Choose CSV file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {file && <span className="text-[13px] text-navy-500">{file} · {rows.length} rows</span>}
        </div>
        {missing.length > 0 && <p className="text-sm text-red-600">Missing column(s): {missing.join(", ")}. Download the template and keep its headings.</p>}
        {!result && rows.length > 0 && missing.length === 0 && (
          <div className="overflow-x-auto border border-navy-100 rounded-xl">
            <table className="w-full text-[12px]">
              <thead className="bg-navy-50 text-navy-500"><tr>{columns.slice(0, 6).map((c) => <th key={c.key} className="text-left px-2.5 py-2 font-medium">{c.key}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-navy-50">{columns.slice(0, 6).map((c) => <td key={c.key} className="px-2.5 py-1.5 text-navy-700">{r[c.key]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {result && (
          <div className="space-y-2">
            <p className="text-sm"><b className="text-emerald-600">{result.created} imported</b>{result.failed > 0 && <>, <b className="text-red-600">{result.failed} failed</b></>}</p>
            {result.failed > 0 && (
              <div className="max-h-48 overflow-y-auto border border-red-100 rounded-xl divide-y divide-red-50">
                {result.results.filter((r) => !r.ok).map((r) => <p key={r.row} className="px-3 py-2 text-[12.5px] text-red-700">Row {r.row}: {r.error}</p>)}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={result ? onDone : onClose}>{result ? "Done" : "Cancel"}</Button>
          {!result && <Button onClick={go} loading={busy} disabled={!rows.length || missing.length > 0}>Import {rows.length || ""} rows</Button>}
        </div>
      </div>
    </Modal>
  );
}