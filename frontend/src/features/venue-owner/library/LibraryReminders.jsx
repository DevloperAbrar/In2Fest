import React, { useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, useLib, errMsg, fmtDate, inr, waUrl } from "./libraryShared.jsx";

export default function LibraryReminders() {
  const { vid } = useLib();
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/library/reminders` : null, { skip: !vid });
  const [kind, setKind] = useState("");
  const [sent, setSent] = useState(new Set());

  if (loading || !data) return <LibraryPage title="Reminders"><Loader /></LibraryPage>;
  const groups = data.groups;
  const active = groups.find((g) => g.key === kind) || groups.find((g) => g.items.length) || groups[0];
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const send = async (g, it) => {
    window.open(waUrl(`91${it.phone}`, it.message), "_blank", "noopener");
    setSent((s) => new Set(s).add(`${g.key}:${it.student_id}`));
    try { await libraryService.markReminders(vid, { kind: g.key, student_ids: [it.student_id] }); }
    catch (e) { showError(errMsg(e, "Could not save that the reminder was sent")); }
  };
  const markRest = async () => {
    const ids = active.items.filter((i) => !sent.has(`${active.key}:${i.student_id}`)).map((i) => i.student_id).slice(0, 100);
    if (!ids.length) return;
    try { await libraryService.markReminders(vid, { kind: active.key, student_ids: ids }); refetch(); } catch (e) { showError(errMsg(e)); }
  };

  return (
    <LibraryPage title="Reminders" subtitle={`${total} students to remind. Tap WhatsApp to send from your own number`}>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {groups.map((g) => (
          <button key={g.key} type="button" onClick={() => setKind(g.key)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border ${active.key === g.key ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-100"}`}>
            {g.label} <span className="opacity-60">{g.items.length}</span>
          </button>
        ))}
      </div>
      {active.items.length === 0 ? <Panel className="p-8 text-center text-sm text-navy-400">Nobody to remind in this group. 🎉</Panel> : (
        <>
          <div className="flex justify-end mb-2"><button type="button" onClick={markRest} className="text-[12.5px] text-navy-500 underline">Hide all (I sent them another way)</button></div>
          <div className="space-y-2">
            {active.items.map((it) => {
              const done = sent.has(`${active.key}:${it.student_id}`);
              return (
                <Panel key={it.student_id} className={`p-3.5 flex items-center gap-3 ${done ? "opacity-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900 truncate">{it.name} <span className="text-[11.5px] text-navy-400 font-normal">{it.code}</span></p>
                    <p className="text-[12.5px] text-navy-500 truncate">
                      {active.key === "dues" ? `Due ${inr(it.balance_due)}` : `Valid till ${fmtDate(it.end_date)} (${it.days_left} days)`}{it.hall_name ? ` · ${it.hall_name} Seat ${it.seat_no}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => send(active, it)} disabled={done}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-medium disabled:bg-navy-200">
                    {done ? <><Check size={14} /> Sent</> : <><MessageCircle size={14} /> WhatsApp</>}
                  </button>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </LibraryPage>
  );
}