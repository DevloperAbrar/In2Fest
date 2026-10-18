import React, { useCallback, useEffect, useRef, useState } from "react";
import { Printer, BedDouble, Clock } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { foodService } from "../../../services/foodService";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Select from "../../../components/common/Select";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { FoodPage, FoodDot, inr2, errMsg, useFoodContext, printTicket, PAY_MODES, TYPE_LABEL, SOURCE_LABEL } from "./foodShared.jsx";

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    [0, 0.25].forEach((t) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 880; g.gain.value = 0.15;
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.18);
    });
  } catch { /* sound is optional */ }
}

const minutesAgo = (d) => Math.max(Math.floor((Date.now() - new Date(d).getTime()) / 60000), 0);
const clock = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

function OrderCard({ o, onStatus, onEta, onPay, onCancel, onPrint }) {
  const age = minutesAgo(o.createdAt);
  const late = age > 20 && (o.status === "new" || o.status === "preparing");
  const lines = (o.items || []).filter((l) => l.kind !== "charge");
  const next = { new: ["Accept", "preparing"], preparing: ["Mark ready", "ready"], ready: ["Complete", "completed"] }[o.status];
  const etaAt = o.status === "preparing" ? o.meta?.eta_at : null;
  const left = etaAt ? Math.ceil((Date.parse(etaAt) - Date.now()) / 60000) : null;

  return (
    <div className={`bg-white rounded-2xl border p-3 ${o.status === "new" ? "border-red-300 shadow-md" : "border-navy-100/60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">#{o.order_no} <span className="text-xs font-medium text-gray-500">· Token {o.token_no}</span></p>
          <p className="text-xs text-gray-500">
            {TYPE_LABEL[o.order_type]}{o.table_name ? ` · Table ${o.table_name}` : ""}{o.room_no ? ` · Room ${o.room_no}` : ""} · {SOURCE_LABEL[o.source]}
          </p>
        </div>
        <span className={`text-xs font-semibold ${late ? "text-red-600" : "text-gray-400"}`}>{age}m</span>
      </div>
      {(o.customer_name || o.customer_phone) && <p className="text-xs text-gray-600 mt-1">{o.customer_name} {o.customer_phone && <a className="text-primary-600" href={`tel:+91${o.customer_phone}`}>{o.customer_phone}</a>}</p>}
      <div className="mt-2 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-start gap-1.5 text-sm"><FoodDot type={l.food_type} /><span className="font-semibold">{l.quantity}×</span><span className="flex-1">{l.description}{l.note && <span className="block text-xs text-amber-700">↳ {l.note}</span>}</span></div>
        ))}
      </div>
      {o.notes && <p className="mt-2 text-xs bg-amber-50 text-amber-800 rounded-lg px-2 py-1">Note: {o.notes}</p>}
      {etaAt && (
        <p className="mt-2 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg px-2 py-1 flex items-center gap-1">
          <Clock size={12} /> Customer sees: ready by {clock(etaAt)} · {left > 0 ? `${left} min left` : "time is up"}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="font-bold text-gray-900">{inr2(o.total)}</p>
        {o.payment_status === "paid"
          ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Paid · {String(o.payment_mode).toUpperCase()}</span>
          : o.payment_mode === "room"
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">Room {o.room_no}</span>
            : <button onClick={() => onPay(o)} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">{o.meta?.claimed_at ? "Customer says paid · confirm" : "Unpaid · mark paid"}</button>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {next && <Button className="!py-1.5 !px-3" onClick={() => (o.status === "new" ? onEta(o) : onStatus(o, next[1]))}>{next[0]}</Button>}
        {o.status === "preparing" && <Button variant="outline" className="!py-1.5 !px-3" onClick={() => onEta(o)}><Clock size={13} /> Change time</Button>}
        <Button variant="outline" className="!py-1.5 !px-3" onClick={() => onPrint(o, "kot")}><Printer size={13} /> KOT</Button>
        <Button variant="outline" className="!py-1.5 !px-3" onClick={() => onPrint(o, "bill")}><Printer size={13} /> Bill</Button>
        {o.status !== "completed" && <Button variant="outline" className="!py-1.5 !px-3 !text-red-600" onClick={() => onCancel(o)}>{o.status === "new" ? "Reject" : "Cancel"}</Button>}
      </div>
    </div>
  );
}

export default function FoodOrders() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: ctx } = useFoodContext(vid);
  const roomTabsOn = Boolean(ctx?.subtype?.room_tabs);
  const [board, setBoard] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [payFor, setPayFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [settle, setSettle] = useState(null);
  const [etaFor, setEtaFor] = useState(null);
  const [etaMin, setEtaMin] = useState("20");
  const [mode, setMode] = useState("cash");
  const [reason, setReason] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const prevNew = useRef(0);

  const load = useCallback(async () => {
    if (!vid) return;
    try {
      const d = (await foodService.board(vid)).data.data;
      const n = d.active.filter((o) => o.status === "new").length;
      if (n > prevNew.current) beep();
      prevNew.current = n;
      setBoard(d);
      if (roomTabsOn) setTabs((await foodService.roomTabs(vid)).data.data);
    } catch { /* keep the last board on screen */ }
  }, [vid, roomTabsOn]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (fn, ok) => {
    try { await fn(); if (ok) showSuccess(ok); load(); } catch (e) { showError(errMsg(e)); }
  };
  const print = (o, kind) => { if (!printTicket(o, ctx, kind)) showError("Allow pop-ups to print"); };

  // Accept / change time: ask how many minutes the food will take.
  const openEta = (o) => {
    const prep = Number(ctx?.settings?.prep_time_min) || 20;
    const old = o.meta?.eta_at ? Math.ceil((Date.parse(o.meta.eta_at) - Date.now()) / 60000) : 0;
    setEtaMin(String(o.status === "preparing" && old > 0 ? old : prep));
    setEtaFor(o);
  };

  if (!board) return <FoodPage title="Live orders"><Loader /></FoodPage>;
  const cols = [["new", "New"], ["preparing", "Preparing"], ["ready", "Ready"]];

  return (
    <FoodPage title="Live orders" subtitle="Refreshes every few seconds and beeps when a new order arrives">
      <div className="grid md:grid-cols-3 gap-4">
        {cols.map(([key, label]) => {
          const list = board.active.filter((o) => o.status === key);
          return (
            <div key={key}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{label} <span className="text-gray-400">({list.length})</span></p>
              <div className="space-y-3">
                {list.length === 0 && <p className="text-xs text-gray-400 py-6 text-center border border-dashed rounded-xl">Nothing here</p>}
                {list.map((o) => (
                  <OrderCard key={o.id} o={o} onPrint={print} onEta={openEta}
                    onStatus={(ord, st) => run(() => foodService.setStatus(vid, ord.id, st))}
                    onPay={(ord) => { setMode("cash"); setPayFor(ord); }}
                    onCancel={(ord) => { setReason(""); setCancelFor(ord); }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {roomTabsOn && tabs.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-navy-100/60 p-4">
          <p className="font-semibold text-gray-800 flex items-center gap-2 mb-2"><BedDouble size={16} /> Open room tabs</p>
          {tabs.map((t) => (
            <div key={t.room} className="flex items-center justify-between py-2 border-b last:border-0">
              <div><p className="text-sm font-medium">Room {t.room}</p><p className="text-xs text-gray-500">{t.orders.length} order(s)</p></div>
              <div className="flex items-center gap-3"><span className="font-semibold">{inr2(t.total)}</span><Button variant="outline" className="!py-1.5" onClick={() => { setMode("cash"); setSettle(t); }}>Settle</Button></div>
            </div>
          ))}
        </div>
      )}

      {board.done.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Completed today</p>
          <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
            {board.done.map((o) => (
              <div key={o.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span>#{o.order_no} · {TYPE_LABEL[o.order_type]} · {o.customer_name || "Walk-in"}</span>
                <span className="flex items-center gap-3"><b>{inr2(o.total)}</b>
                  {o.payment_status !== "paid" && o.payment_mode !== "room" && <button className="text-xs text-amber-700 underline" onClick={() => { setMode("cash"); setPayFor(o); }}>mark paid</button>}
                  <button onClick={() => print(o, "bill")} className="text-gray-500"><Printer size={14} /></button></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={!!etaFor} onClose={() => setEtaFor(null)} title={`${etaFor?.status === "new" ? "Accept" : "Change time for"} #${etaFor?.order_no || ""}`} size="sm">
        <p className="text-sm text-gray-600 mb-3">In how many minutes will the food be ready? The customer sees this as a live countdown and any change shows up on their phone.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <button key={m} type="button" onClick={() => setEtaMin(String(m))}
              className={`px-3 py-1.5 rounded-full text-sm border ${String(etaMin) === String(m) ? "bg-primary-600 text-white border-primary-600" : "text-gray-700"}`}>{m} min</button>
          ))}
        </div>
        <Input label="Or type minutes" type="number" value={etaMin} onChange={(e) => setEtaMin(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setEtaFor(null)}>Close</Button>
          <Button onClick={() => run(async () => { await foodService.setStatus(vid, etaFor.id, "preparing", Number(etaMin)); setEtaFor(null); }, etaFor?.status === "new" ? "Order accepted" : "Time updated")}>
            {etaFor?.status === "new" ? "Accept order" : "Update time"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!payFor} onClose={() => setPayFor(null)} title={`Payment · #${payFor?.order_no || ""}`} size="sm">
        <p className="text-2xl font-bold mb-3">{inr2(payFor?.total)}</p>
        <Select label="Received by" value={mode} onChange={(e) => setMode(e.target.value)} options={[...PAY_MODES, ...(roomTabsOn ? [{ value: "room", label: "Charge to room" }] : [])]} />
        {mode === "room" && <div className="mt-3"><Input label="Room number" value={roomNo} onChange={(e) => setRoomNo(e.target.value)} /></div>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setPayFor(null)}>Close</Button>
          <Button onClick={() => run(async () => { await foodService.payOrder(vid, payFor.id, { mode, room_no: roomNo }); setPayFor(null); }, "Saved")}>Confirm</Button>
        </div>
      </Modal>

      <Modal isOpen={!!cancelFor} onClose={() => setCancelFor(null)} title={`Cancel #${cancelFor?.order_no || ""}`} size="sm">
        <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item not available" />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setCancelFor(null)}>Keep order</Button>
          <Button variant="danger" onClick={() => run(async () => { await foodService.cancelOrder(vid, cancelFor.id, reason); setCancelFor(null); }, "Order cancelled")}>Cancel order</Button>
        </div>
      </Modal>

      <Modal isOpen={!!settle} onClose={() => setSettle(null)} title={`Settle Room ${settle?.room || ""}`} size="sm">
        <p className="text-2xl font-bold mb-3">{inr2(settle?.total)}</p>
        <Select label="Guest paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={PAY_MODES} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setSettle(null)}>Close</Button>
          <Button onClick={() => run(async () => { await foodService.settleRoom(vid, settle.room, mode); setSettle(null); }, "Room settled")}>Mark settled</Button>
        </div>
      </Modal>
    </FoodPage>
  );
}