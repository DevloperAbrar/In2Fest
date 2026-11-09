import React, { useEffect, useState } from "react";
import { QrCode, CheckCheck, LogOut, Download, Monitor, Copy } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, useLib, errMsg, todayISO, downloadBlob, shiftRange } from "./libraryShared.jsx";

const fmtT = (d) => (d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "");

function QrModal({ vid, settings, onClose }) {
  const [src, setSrc] = useState("");
  const rotating = settings?.qr_mode === "rotating";
  useEffect(() => {
    let url = "";
    if (rotating) return undefined;
    libraryService.qrPng(vid).then((r) => { url = URL.createObjectURL(r.data); setSrc(url); }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [vid, rotating]);
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); showSuccess("Link copied"); } catch { showError("Could not copy"); } };
  return (
    <Modal isOpen onClose={onClose} title="Attendance QR" size="md">
      {rotating ? (
        <div className="space-y-3 text-sm text-navy-600">
          <p>Rotating QR is on. Open the kiosk screen on a tablet or PC at the entrance. The code changes every minute, so a photo shared on WhatsApp stops working.</p>
          <Button onClick={() => window.open(settings.kiosk_url, "_blank", "noopener")}><Monitor size={15} /> Open kiosk screen</Button>
          <Button variant="outline" onClick={() => copy(settings.kiosk_url)}><Copy size={15} /> Copy kiosk link</Button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          {src ? <img src={src} alt="Attendance QR" className="mx-auto w-64 h-64" /> : <Loader />}
          <p className="text-[13px] text-navy-500">Print this and stick it at the entrance. Students scan it and type their Student ID.</p>
          <div className="flex justify-center gap-2">
            <Button onClick={async () => { try { const r = await libraryService.posterPdf(vid); downloadBlob(r.data, "library-attendance-qr.pdf"); } catch (e) { showError(errMsg(e)); } }}><Download size={15} /> Download poster (PDF)</Button>
            <Button variant="outline" onClick={() => copy(settings.checkin_url)}><Copy size={15} /> Copy link</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function LibraryAttendance() {
  const { vid } = useLib();
  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const url = vid ? `/venues/${vid}/library/attendance?date=${date}${shift ? `&shift_id=${shift}` : ""}` : null;
  const { data, loading, refetch } = useFetch(url, { skip: !vid });
  const { data: shiftData } = useFetch(vid ? `/venues/${vid}/library/shifts` : null, { skip: !vid });
  const { data: settings } = useFetch(vid ? `/venues/${vid}/library/settings` : null, { skip: !vid });
  const [busyId, setBusyId] = useState("");
  const isToday = date === todayISO();

  const act = async (id, fn, ok) => {
    setBusyId(id);
    try { await fn(); if (ok) showSuccess(ok); refetch(); } catch (e) { showError(errMsg(e)); } finally { setBusyId(""); }
  };
  const markAll = async () => {
    try { const r = await libraryService.markAll(vid, { date, shift_id: shift || undefined, status: "present" }); showSuccess(`${r.data.data.marked} students marked present`); refetch(); }
    catch (e) { showError(errMsg(e)); }
  };

  const items = data?.items || [];
  const sum = data?.summary || {};

  return (
    <LibraryPage title="Attendance" subtitle="Mark manually or let students scan the QR"
      actions={<Button variant="outline" onClick={() => setQrOpen(true)}><QrCode size={15} /> QR / Kiosk</Button>}>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block"><span className="block text-[12px] text-navy-500 mb-1">Date</span><input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value || todayISO())} className="px-3 py-2 border border-navy-200 rounded-lg text-sm" /></label>
        <label className="block"><span className="block text-[12px] text-navy-500 mb-1">Shift</span>
          <select value={shift} onChange={(e) => setShift(e.target.value)} className="px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white"><option value="">All shifts</option>{(shiftData?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <Button onClick={markAll} disabled={!!data?.off_reason || items.every((r) => r.mark)}><CheckCheck size={15} /> Mark all present</Button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[["Expected", sum.expected, "text-navy-900"], ["Present", sum.present, "text-emerald-600"], ["Absent", sum.absent, "text-red-600"], ["Inside now", sum.inside, "text-sky-600"]].map(([l, v, c]) => (
          <Panel key={l} className="p-3 text-center"><p className={`font-display text-xl font-bold tabular-nums ${c}`}>{v ?? 0}</p><p className="text-[11.5px] text-navy-400">{l}</p></Panel>
        ))}
      </div>

      {data?.off_reason && <Panel className="p-3 mb-3 text-sm text-amber-700 bg-amber-50 border-amber-200">Closed on this day: {data.off_reason}</Panel>}

      {loading && !data ? <Loader /> : items.length === 0 ? <Panel className="p-8 text-center text-sm text-navy-400">No students expected on this day.</Panel> : (
        <div className="space-y-2">
          {items.map((r) => (
            <Panel key={r.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900 truncate">{r.name} <span className="text-[11.5px] text-navy-400 font-normal">{r.student_code}</span></p>
                  <p className="text-[12.5px] text-navy-500 truncate">{r.hall_name} · Seat {r.seat_no} · {r.shift_name} ({shiftRange(r)})</p>
                  {r.mark === "present" && <p className="text-[12px] text-emerald-600">In {fmtT(r.check_in_at) || "marked"}{r.check_out_at ? ` · Out ${fmtT(r.check_out_at)}` : ""}{r.source === "qr" ? " · QR" : ""}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => libraryService.markAttendance(vid, { student_id: r.id, date, status: "present" }))}
                    className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${r.mark === "present" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200"}`}>Present</button>
                  <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => libraryService.markAttendance(vid, { student_id: r.id, date, status: "absent" }))}
                    className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${r.mark === "absent" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-700 border-red-200"}`}>Absent</button>
                  {isToday && r.mark === "present" && !r.check_out_at && (
                    <button type="button" title="Check out" disabled={busyId === r.id} onClick={() => act(r.id, () => libraryService.checkout(vid, { student_id: r.id, date }), "Checked out")} className="p-2 rounded-lg border border-navy-200 text-navy-500"><LogOut size={15} /></button>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {qrOpen && <QrModal vid={vid} settings={settings} onClose={() => setQrOpen(false)} />}
    </LibraryPage>
  );
}