import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Download, Check } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import { showError, showSuccess } from "../../../components/common/Toast";
import { errMsg, downloadBlob } from "./gymShared.jsx";
import { UploadArt } from "./memberUi.jsx";
import { FIELDS, decodeBuffer, parseCsv, autoMap, guessDateFormat, distinctPlans, autoMatchPlans, buildRows, toCsv } from "./importUtils.js";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const CHECK_BATCH = 200;
const IMPORT_BATCH = 100;

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const Stat = ({ label, value, tone = "gray" }) => {
  const tones = { gray: "bg-gray-50 text-gray-900", green: "bg-green-50 text-green-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700" };
  return (
    <div className={`rounded-2xl md:rounded-xl p-3.5 md:p-3 ${tones[tone]}`}>
      <p className="text-xs opacity-80 leading-tight">{label}</p>
      <p className="mt-1 md:mt-0 text-2xl md:text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
};

// Mobile only: shows where the owner is in the 4 steps.
const STEPS = ["Upload", "Match", "Check", "Import"];
const stepIndex = (step) => ({ upload: 0, map: 1, check: 2, importing: 3, done: 3 }[step] ?? 0);

function StepBar({ step }) {
  const cur = stepIndex(step);
  return (
    <ol className="md:hidden flex items-start mb-5" aria-label="Import progress">
      {STEPS.map((label, i) => {
        const done = i < cur || step === "done";
        const active = i === cur && step !== "done";
        return (
          <li key={label} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span
                className={`absolute top-[13px] right-1/2 w-full h-0.5 -z-0 ${i <= cur || step === "done" ? "bg-primary-500" : "bg-navy-100"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                done ? "bg-primary-600 text-white" : active ? "bg-navy-900 text-white ring-4 ring-navy-100" : "bg-navy-50 text-navy-400"
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className={`mt-1.5 text-[11px] font-medium ${active ? "text-navy-900" : "text-navy-400"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ImportMembersModal({ vid, onClose, onDone }) {
  const { data: plans } = useFetch(vid ? `/venues/${vid}/gym/plans` : null, { skip: !vid });
  const [step, setStep] = useState("upload"); // upload | map | check | importing | done
  const [file, setFile] = useState(null);
  const [map, setMap] = useState({});
  const [dateFmt, setDateFmt] = useState("dmy");
  const [planMap, setPlanMap] = useState({});
  const [opts, setOpts] = useState({ on_duplicate: "skip", import_payments: false });
  const [built, setBuilt] = useState([]);
  const [checked, setChecked] = useState([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const processed = useRef(new Map());

  const distinct = useMemo(() => (file ? distinctPlans(file.records, map) : []), [file, map]);
  useEffect(() => { setPlanMap(autoMatchPlans(distinct, plans || [])); }, [distinct, plans]);

  const counts = useMemo(() => {
    const c = { created: 0, updated: 0, skipped: 0, error: 0 };
    checked.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [checked]);
  const importable = counts.created + counts.updated;

  const safeClose = () => { if (!busy) onClose(); };

  const downloadSample = async () => {
    try {
      const r = await gymService.importTemplate(vid);
      downloadBlob(r.data, "member-import-sample.csv");
    } catch { showError("Could not download the sample file"); }
  };

  const pickFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) return showError("File is too large. Please keep it under 5 MB.");
    try {
      const { headers, records } = parseCsv(decodeBuffer(await f.arrayBuffer()));
      if (!headers.length || !records.length) return showError("No member rows were found in this file");
      if (records.length > MAX_ROWS) return showError(`This file has ${records.length} rows. Please split it into files of up to ${MAX_ROWS} members.`);
      const m = autoMap(headers);
      processed.current = new Map();
      setFile({ name: f.name, headers, records });
      setMap(m);
      setDateFmt(guessDateFormat(records, m));
      setStep("map");
    } catch (err) { showError(err.message || "Could not read this file"); }
  };

  const setCol = (key) => (e) => setMap((s) => ({ ...s, [key]: Number(e.target.value) }));
  const canCheck = map.phone >= 0 && (map.name >= 0 || map.first_name >= 0);

  const runCheck = async () => {
    setBusy(true);
    setProgress(0);
    try {
      const rows = buildRows(file.records, map, { dateFmt, planMap });
      const out = [];
      for (const part of chunk(rows, CHECK_BATCH)) {
        const res = await gymService.importValidate(vid, { rows: part, options: opts });
        out.push(...res.data.data.rows);
        setProgress(out.length);
      }
      // the server only sees one batch at a time, so the same mobile in two batches is caught here
      const seen = new Map();
      out.forEach((r) => {
        if (r.status === "error" || !r.phone) return;
        if (seen.has(r.phone)) { r.status = "error"; r.messages = [`Same mobile number as row ${seen.get(r.phone)} in this file`]; }
        else seen.set(r.phone, r.row);
      });
      processed.current = new Map();
      setBuilt(rows);
      setChecked(out);
      setImportError("");
      setStep("check");
    } catch (e) { showError(errMsg(e, "Could not check the file")); } finally { setBusy(false); }
  };

  const runImport = async () => {
    setBusy(true);
    setImportError("");
    setStep("importing");
    const todo = built.filter((row, i) => ["created", "updated"].includes(checked[i].status) && !processed.current.has(row._row));
    setProgress(processed.current.size);
    try {
      for (const part of chunk(todo, IMPORT_BATCH)) {
        const res = await gymService.importRun(vid, { rows: part, options: opts });
        res.data.data.rows.forEach((r) => processed.current.set(r.row, r));
        setProgress(processed.current.size);
      }
      setStep("done");
      if (onDone) onDone();
      showSuccess("Import finished");
    } catch (e) {
      setImportError(errMsg(e, "Connection problem. Members already imported are saved. Press Continue to resume."));
      if (onDone && processed.current.size) onDone();
    } finally { setBusy(false); }
  };

  const doneRows = [...processed.current.values()];
  const result = {
    created: doneRows.filter((r) => r.status === "created").length,
    updated: doneRows.filter((r) => r.status === "updated").length,
    failed: doneRows.filter((r) => r.status === "error").length
  };

  const downloadProblems = () => {
    const byLine = new Map(file.records.map((r) => [r.line, r.cells]));
    const problems = [
      ...checked.filter((r) => r.status === "error" || r.status === "skipped"),
      ...doneRows.filter((r) => r.status === "error")
    ];
    const lines = [["Row", "Problem", ...file.headers], ...problems.map((r) => [r.row, (r.messages || []).join("; "), ...(byLine.get(r.row) || [])])];
    downloadBlob(new Blob([toCsv(lines)], { type: "text/csv;charset=utf-8" }), "member-import-problems.csv");
  };

  const colOptions = file ? [{ value: -1, label: "Don't import" }, ...file.headers.map((h, i) => ({ value: i, label: h }))] : [];
  const issues = checked.filter((r) => r.status === "error" || r.status === "skipped" || (r.warnings && r.warnings.length));

  return (
    <Modal isOpen onClose={safeClose} title="Import members from another software" size="xl">
      <StepBar step={step} />
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Export your members from your old gym software as a CSV file and upload it here. You will match the columns and check everything
            before anything is saved.
          </p>
          {/* Mobile */}
          <label className="md:hidden tap-scale block rounded-3xl border-2 border-dashed border-primary-200 bg-primary-50/40 px-5 py-6 text-center cursor-pointer">
            <UploadArt className="w-28 h-24 mx-auto" />
            <span className="block mt-1 text-[15px] font-display font-semibold text-navy-900">Tap to choose a CSV file</span>
            <span className="block text-xs text-navy-400 mt-1">Up to {MAX_ROWS} members, 5 MB</span>
            <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={pickFile} />
          </label>
          {/* Desktop / tablet (unchanged) */}
          <label className="hidden md:block border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-400">
            <Upload size={26} className="mx-auto text-gray-400 mb-2" />
            <span className="block text-sm font-medium text-gray-800">Choose a CSV file</span>
            <span className="block text-xs text-gray-500 mt-1">Up to {MAX_ROWS} members, 5 MB</span>
            <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={pickFile} />
          </label>
          <div className="bg-gray-50 rounded-2xl md:rounded-xl p-3.5 md:p-3 text-xs text-gray-600 space-y-1.5 md:space-y-1">
            <p><b>Only Name and Mobile are required.</b> Plan, dates, amounts, trainer, goal and notes are optional.</p>
            <p>Excel file? Open it and choose File &gt; Save As &gt; CSV, then upload that file.</p>
            <p>Only the latest membership of each member is imported. Photos and old payment receipts are not.</p>
          </div>
          <div className="flex gap-2 md:justify-between">
            <Button variant="outline" className="flex-1 md:flex-none" onClick={downloadSample}><Download size={15} /> Sample file</Button>
            <Button variant="outline" className="flex-1 md:flex-none" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}

      {step === "map" && file && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600"><b>{file.records.length}</b> rows found in <b>{file.name}</b>. Check that each of our fields points to the right column.</p>

          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => {
              const idx = map[f.key] == null ? -1 : map[f.key];
              const sample = idx >= 0 && file.records[0] ? file.records[0].cells[idx] : "";
              return (
                <div key={f.key}>
                  <Select label={`${f.label}${f.required ? " *" : ""}`} value={idx} onChange={setCol(f.key)} options={colOptions} />
                  {sample ? <p className="text-xs text-gray-400 mt-1 truncate">e.g. {String(sample)}</p> : null}
                </div>
              );
            })}
          </div>
          {!canCheck && <p className="text-sm text-red-600">Choose the Mobile column and the Name column (or First name).</p>}

          <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t">
            <Select label="Date format in your file" value={dateFmt} onChange={(e) => setDateFmt(e.target.value)}
              options={[{ value: "dmy", label: "DD/MM/YYYY (31/12/2026)" }, { value: "mdy", label: "MM/DD/YYYY (12/31/2026)" }]} />
            <Select label="If the mobile number already exists" value={opts.on_duplicate} onChange={(e) => setOpts((s) => ({ ...s, on_duplicate: e.target.value }))}
              options={[{ value: "skip", label: "Skip that row (recommended)" }, { value: "fill", label: "Fill only the blank details of that member" }]} />
          </div>

          {distinct.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-sm font-medium text-gray-800 mb-1">Match your plans</p>
              <p className="text-xs text-gray-500 mb-3">Members of an unlinked plan still get their dates and dues, but you will choose a plan when you renew them.</p>
              <div className="grid sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {distinct.map((d) => (
                  <Select key={d.key} label={`${d.label} (${d.count})`} value={planMap[d.key] || ""}
                    onChange={(e) => setPlanMap((s) => ({ ...s, [d.key]: e.target.value }))}
                    options={[{ value: "", label: "Don't link, keep the name only" }, ...(plans || []).map((p) => ({ value: p.id, label: p.name }))]} />
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm pt-3 border-t">
            <input type="checkbox" className="mt-1" checked={opts.import_payments} onChange={(e) => setOpts((s) => ({ ...s, import_payments: e.target.checked }))} />
            <span>
              Also bring over the <b>amount already paid</b> as payment history
              <span className="block text-xs text-gray-500">Off (recommended): only pending dues are imported, so your collection reports start fresh. On: the paid amount counts as collection in the month the plan started.</span>
            </span>
          </label>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep("upload")} disabled={busy}>Back</Button>
            <Button onClick={runCheck} loading={busy} disabled={!canCheck}>{busy ? `Checking ${progress}/${file.records.length}` : "Check file"}</Button>
          </div>
        </div>
      )}

      {step === "check" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Will be added" value={counts.created} tone="green" />
            <Stat label="Will be updated" value={counts.updated} tone="green" />
            <Stat label="Already members (skipped)" value={counts.skipped} tone="amber" />
            <Stat label="Problems (left out)" value={counts.error} tone="red" />
          </div>

          {issues.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600">Rows that need attention{issues.length > 100 ? " (first 100)" : ""}</div>
              <div className="max-h-64 overflow-y-auto divide-y text-sm">
                {issues.slice(0, 100).map((r, i) => (
                  <div key={`${r.row}-${i}`} className="px-3 py-2 flex gap-3">
                    <span className="text-xs text-gray-400 w-12 shrink-0">Row {r.row}</span>
                    <div className="min-w-0">
                      <p className="truncate text-gray-800">{r.name || "(no name)"} <span className="text-xs text-gray-400">{r.phone || ""}</span></p>
                      {(r.messages || []).map((m, j) => <p key={j} className={`text-xs ${r.status === "error" ? "text-red-600" : "text-amber-700"}`}>{m}</p>)}
                      {(r.warnings || []).map((m, j) => <p key={`w${j}`} className="text-xs text-gray-500">{m}</p>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">Rows with problems are left out. Download them, fix the file and import again. Members that are already added are skipped automatically, so importing the same file twice is safe.</p>

          <div className="flex flex-wrap justify-between gap-2 pt-1">
            <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
            <div className="flex gap-2">
              {(counts.error > 0 || counts.skipped > 0) && <Button variant="outline" onClick={downloadProblems}><Download size={15} /> Problem rows</Button>}
              <Button onClick={runImport} disabled={importable === 0}>Import {importable} member{importable === 1 ? "" : "s"}</Button>
            </div>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-700">{importError ? "Import paused" : "Importing members. Please keep this window open."}</p>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary-600 transition-all" style={{ width: `${importable ? Math.min(100, Math.round((progress / importable) * 100)) : 0}%` }} />
          </div>
          <p className="text-xs text-gray-500">{progress} of {importable} done</p>
          {importError && (
            <>
              <p className="text-sm text-red-600">{importError}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={runImport} loading={busy}>Continue</Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Members added" value={result.created} tone="green" />
            <Stat label="Members updated" value={result.updated} tone="green" />
            <Stat label="Failed" value={result.failed} tone={result.failed ? "red" : "gray"} />
          </div>
          {(counts.error > 0 || counts.skipped > 0 || result.failed > 0) && (
            <p className="text-sm text-gray-600">Some rows were left out. Download them, fix the file and import again. Members already added will not be duplicated.</p>
          )}
          <div className="flex justify-end gap-2">
            {(counts.error > 0 || counts.skipped > 0 || result.failed > 0) && <Button variant="outline" onClick={downloadProblems}><Download size={15} /> Problem rows</Button>}
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}