import React, { useCallback, useEffect, useRef, useState } from "react";
import { Phone, Settings as SettingsIcon, Clock, Pencil, Search, ShieldCheck, FileText } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { ordersService } from "../../../services/ordersService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { inputCls } from "../billing/billingShared.jsx";
import { AcceptModal, ReasonModal, CompleteModal, EditOrderModal, SettingsModal, money } from "./OrderModals.jsx";

const STATUS = {
  pending: { label: "New", cls: "bg-amber-50 text-amber-700" },
  accepted: { label: "Preparing", cls: "bg-blue-50 text-blue-700" },
  ready: { label: "Ready", cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Picked up", cls: "bg-navy-50 text-navy-600" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-600" },
  no_show: { label: "No-show", cls: "bg-orange-50 text-orange-700" },
  fake: { label: "Fake", cls: "bg-red-50 text-red-700" }
};

const time = (d) => (d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
const dateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const minsAgo = (d, now) => Math.max(0, Math.round((now - new Date(d).getTime()) / 60000));

// short double beep for a new order (silently ignored if the browser blocks audio)
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.12;
      o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.15);
    });
  } catch { /* ignore */ }
}

function Stat({ label, value, tone = "text-navy-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-3.5">
      <p className="text-xs text-navy-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function OrderCard({ o, now, onAct }) {
  const st = STATUS[o.status] || STATUS.pending;
  const open = ["pending", "accepted", "ready"].includes(o.status);
  const late = o.status === "accepted" && o.promised_at && new Date(o.promised_at).getTime() < now;
  const btn = "text-xs font-medium px-2.5 h-8 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50";

  return (
    <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-navy-900">#{o.order_no} · {o.customer_name}</p>
          <a href={`tel:${o.customer_phone}`} className="inline-flex items-center gap-1 text-xs text-primary-600 mt-0.5">
            <Phone size={12} /> {o.customer_phone}
          </a>
        </div>
        <div className="text-right shrink-0">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span>
          <p className="mt-1 font-semibold text-navy-900">{money(o.total)}</p>
        </div>
      </div>

      <ul className="mt-3 text-sm text-navy-700 space-y-0.5">
        {o.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ""}</span>
            <span className="text-navy-400 shrink-0">{money(i.line_total)}</span>
          </li>
        ))}
      </ul>
      {o.customer_note && <p className="mt-2 text-xs rounded-lg bg-amber-50 text-amber-800 px-2.5 py-1.5">Note: {o.customer_note}</p>}

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-navy-400">
        <span className="inline-flex items-center gap-1"><Clock size={12} /> {open ? `${minsAgo(o.createdAt, now)} min ago` : dateTime(o.createdAt)}</span>
        {open && o.promised_at && <span className={late ? "text-red-600 font-medium" : ""}>{late ? "Late · was " : "Ready by "}{time(o.promised_at)}</span>}
        {o.edited_at && <span className="text-navy-500">Edited</span>}
      </div>

      {open && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-navy-50/70 px-3 py-2">
          <span className="text-xs text-navy-500">Pickup code</span>
          <span className="font-mono text-lg font-bold tracking-[0.3em] text-navy-900">{o.pickup_code}</span>
        </div>
      )}
      {o.status === "cancelled" || o.status === "no_show" || o.status === "fake" ? (
        <p className="mt-2 text-xs text-navy-400">{o.cancel_reason}</p>
      ) : null}
      {o.code_override_reason && <p className="mt-2 text-xs text-orange-600">Code skipped: {o.code_override_reason}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {o.status === "pending" && <>
          <Button className="!h-8 !px-3 !text-xs" onClick={() => onAct("accept", o)}>Accept</Button>
          <button className={btn} onClick={() => onAct("edit", o)}><Pencil size={12} className="inline mr-1" />Edit</button>
          <button className={`${btn} !text-red-600`} onClick={() => onAct("cancel", o)}>Reject</button>
          <button className={`${btn} !text-red-600`} onClick={() => onAct("fake", o)}>Fake</button>
        </>}
        {o.status === "accepted" && <>
          <Button className="!h-8 !px-3 !text-xs" onClick={() => onAct("ready", o)}>Mark ready</Button>
          <button className={btn} onClick={() => onAct("eta", o)}>Change time</button>
          <button className={btn} onClick={() => onAct("edit", o)}><Pencil size={12} className="inline mr-1" />Edit</button>
          <button className={btn} onClick={() => onAct("complete", o)}>Hand over</button>
          <button className={`${btn} !text-red-600`} onClick={() => onAct("cancel", o)}>Cancel</button>
        </>}
        {o.status === "ready" && <>
          <Button className="!h-8 !px-3 !text-xs" onClick={() => onAct("complete", o)}>Hand over &amp; bill</Button>
          <button className={btn} onClick={() => onAct("edit", o)}><Pencil size={12} className="inline mr-1" />Edit</button>
          <button className={btn} onClick={() => onAct("noshow", o)}>No-show</button>
          <button className={`${btn} !text-red-600`} onClick={() => onAct("cancel", o)}>Cancel</button>
        </>}
        {open && !o.invoice_id && <button className={btn} onClick={() => onAct("bill", o)}><FileText size={12} className="inline mr-1" />Bill only</button>}
        {o.invoice_id && <span className="text-xs text-emerald-600 self-center">Bill generated ✓</span>}
      </div>
    </div>
  );
}

function Column({ title, tone, rows, now, onAct }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`w-2 h-2 rounded-full ${tone}`} />
        <h3 className="text-sm font-semibold text-navy-800">{title}</h3>
        <span className="text-xs text-navy-400">{rows.length}</span>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-xs text-navy-300 px-1 py-4">Nothing here</p>}
        {rows.map((o) => <OrderCard key={o.id} o={o} now={now} onAct={onAct} />)}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const isOwner = user?.role !== "team_member";

  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, order, extra }
  const [codeInput, setCodeInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const seen = useRef(null);

  useEffect(() => { const t = setTimeout(() => setQ(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  const load = useCallback(async (silent) => {
    if (!vid) return;
    try {
      const [list, sum] = await Promise.all([
        ordersService.list(vid, { scope: tab, q: q || undefined }),
        ordersService.summary(vid)
      ]);
      const rows = list.data.data || [];
      setOrders(rows);
      setSummary(sum.data.data || {});
      if (tab === "active") {
        const pending = new Set(rows.filter((o) => o.status === "pending").map((o) => o.id));
        if (seen.current && [...pending].some((id) => !seen.current.has(id))) beep();
        seen.current = pending;
      }
    } catch (e) {
      if (!silent) showError(e.response?.data?.message || "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [vid, tab, q]);

  useEffect(() => { setLoading(true); load(false); }, [load]);
  useEffect(() => { const id = setInterval(() => load(true), 15000); return () => clearInterval(id); }, [load]);
  useEffect(() => {
    if (!vid) return;
    ordersService.settings(vid).then((r) => setSettings(r.data.data)).catch(() => {});
  }, [vid]);

  const close = () => setModal(null);
  const fail = (e, fallback) => showError(e.response?.data?.message || fallback);

  // runs an action, refreshes, closes the modal
  const run = async (fn, okMsg) => {
    try {
      const res = await fn();
      if (okMsg) showSuccess(okMsg);
      close();
      await load(true);
      return res;
    } catch (e) {
      fail(e, "Something went wrong");
      return null;
    }
  };

  const onAct = (type, order) => {
    if (type === "ready") return run(() => ordersService.ready(vid, order.id), "Marked ready");
    if (type === "bill") return run(async () => {
      const r = await ordersService.bill(vid, order.id);
      setModal({ type: "billed", invoice: r.data.data.invoice });
      return r;
    });
    setModal({ type, order });
  };

  const toggleAccepting = async () => {
    try {
      const r = await ordersService.setAccepting(vid, !settings.accepting);
      setSettings(r.data.data);
      showSuccess(r.data.data.accepting ? "Now accepting orders" : "Orders paused");
    } catch (e) { fail(e, "Could not update"); }
  };

  const lookup = async (e) => {
    e.preventDefault();
    if (codeInput.trim().length < 4) return;
    try {
      const r = await ordersService.lookup(vid, codeInput.trim());
      const o = r.data.data;
      setCodeInput("");
      if (o.status === "pending") showError(`Order #${o.order_no} is still new. Accept it first.`);
      else setModal({ type: "complete", order: o });
    } catch (err) { fail(err, "No open order has this code"); }
  };

  const by = (s) => orders.filter((o) => o.status === s);
  const m = modal?.order;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Pickup Orders">
      {settings && !settings.enabled && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800">Online pickup ordering is <b>off</b>. Turn it on so customers can order from your website.</p>
          {isOwner && <Button onClick={() => setModal({ type: "settings" })}>Turn on</Button>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="New" value={summary.pending ?? 0} tone="text-amber-600" />
        <Stat label="Preparing" value={summary.accepted ?? 0} tone="text-blue-600" />
        <Stat label="Ready for pickup" value={summary.ready ?? 0} tone="text-emerald-600" />
        <Stat label="Today picked up" value={`${summary.today_completed ?? 0} · ${money(summary.today_revenue)}`} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <form onSubmit={lookup} className="flex items-center gap-2">
          <div className="relative">
            <ShieldCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={4}
              placeholder="Pickup code" aria-label="Pickup code"
              className="h-10 w-36 rounded-xl border border-navy-200 pl-9 pr-2 text-sm font-mono tracking-widest uppercase"
            />
          </div>
          <Button type="submit" variant="outline" className="!h-10">Verify</Button>
        </form>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className={`${inputCls} pl-9`} placeholder="Search name, phone, #" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {settings && (
            <button
              type="button" onClick={toggleAccepting}
              className={`h-10 px-4 rounded-xl text-sm font-medium border ${settings.accepting ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}
            >
              {settings.accepting ? "● Accepting orders" : "● Paused"}
            </button>
          )}
          <button type="button" onClick={() => setModal({ type: "settings" })} className="h-10 w-10 flex items-center justify-center rounded-xl border border-navy-200 text-navy-500" aria-label="Order settings">
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[["active", "Open orders"], ["history", "History"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 h-9 rounded-full text-sm border ${tab === k ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-600 border-navy-200"}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-navy-400 py-12 text-center">Loading…</p>
      ) : tab === "active" ? (
        orders.length === 0 ? (
          <div className="text-center py-16 text-navy-400">
            <p className="font-medium text-navy-600">No open orders</p>
            <p className="text-sm mt-1">New orders from your website appear here with a sound.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-5">
            <Column title="New" tone="bg-amber-400" rows={by("pending")} now={now} onAct={onAct} />
            <Column title="Preparing" tone="bg-blue-400" rows={by("accepted")} now={now} onAct={onAct} />
            <Column title="Ready for pickup" tone="bg-emerald-400" rows={by("ready")} now={now} onAct={onAct} />
          </div>
        )
      ) : orders.length === 0 ? (
        <p className="text-sm text-navy-400 py-12 text-center">No past orders yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => <OrderCard key={o.id} o={o} now={now} onAct={onAct} />)}
        </div>
      )}

      {/* ── modals ── */}
      {modal?.type === "accept" && (
        <AcceptModal order={m} defaultMinutes={settings?.default_prep_minutes || 20} onClose={close}
          onSubmit={(min) => run(() => ordersService.accept(vid, m.id, min), `Order #${m.order_no} accepted`)} />
      )}
      {modal?.type === "eta" && (
        <AcceptModal order={m} title="Change ready time" defaultMinutes={m.prep_minutes || 20} onClose={close}
          onSubmit={(min) => run(() => ordersService.eta(vid, m.id, min), "Time updated")} />
      )}
      {modal?.type === "cancel" && (
        <ReasonModal title={`Cancel order #${m.order_no}`} confirmLabel="Cancel order" onClose={close}
          description="The customer will see this reason on their tracking page."
          quick={["Item not available", "Closing soon", "Too busy right now", "Could not reach customer"]}
          onSubmit={(reason) => run(() => ordersService.cancel(vid, m.id, reason), "Order cancelled")} />
      )}
      {modal?.type === "fake" && (
        <Modal isOpen onClose={close} title="Report as fake order" size="sm">
          <p className="text-sm text-navy-500">This cancels the order and <b>blocks {m.customer_phone}</b> from ordering online. You can unblock it later in settings.</p>
          <Button variant="danger" className="w-full mt-4" onClick={() => run(() => ordersService.fake(vid, m.id), "Order reported and number blocked")}>Report &amp; block</Button>
        </Modal>
      )}
      {modal?.type === "noshow" && (
        <Modal isOpen onClose={close} title="Mark as no-show" size="sm">
          <p className="text-sm text-navy-500">The customer did not come. After {settings?.block_after_no_shows ?? 2} no-shows this number can't order online.</p>
          <Button variant="danger" className="w-full mt-4" onClick={() => run(() => ordersService.noShow(vid, m.id), "Marked as no-show")}>Mark no-show</Button>
        </Modal>
      )}
      {modal?.type === "edit" && (
        <EditOrderModal vid={vid} order={m} onClose={close} onSaved={async () => { showSuccess("Order updated"); close(); await load(true); }} />
      )}
      {modal?.type === "complete" && (
        <CompleteModal order={m} onClose={close}
          onSubmit={async (payload) => {
            const r = await run(() => ordersService.complete(vid, m.id, payload));
            if (r) {
              const d = r.data.data;
              if (d.warning) showError(d.warning);
              setModal({ type: "billed", invoice: d.invoice });
            }
          }} />
      )}
      {modal?.type === "billed" && (
        <Modal isOpen onClose={close} title="Bill generated" size="sm">
          <div className="text-center space-y-3">
            <p className="text-3xl">✅</p>
            <p className="font-semibold text-navy-900">{modal.invoice?.invoice_number}</p>
            <p className="text-sm text-navy-500">{money(modal.invoice?.total)} · {modal.invoice?.payment_status}</p>
            {modal.invoice?.pdf_url && (
              <a href={modal.invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-primary-600 text-white py-2.5 text-sm font-medium">Open / print bill</a>
            )}
            <Button variant="outline" className="w-full" onClick={close}>Done</Button>
          </div>
        </Modal>
      )}
      {modal?.type === "settings" && settings && (
        <SettingsModal vid={vid} settings={settings} isOwner={isOwner} onClose={close}
          onSaved={(s) => { setSettings(s); showSuccess("Settings saved"); close(); }} />
      )}
    </DashboardLayout>
  );
}