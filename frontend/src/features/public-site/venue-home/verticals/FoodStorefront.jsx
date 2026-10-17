// Live online ordering on the restaurant's own website: menu, cart, checkout, order tracking.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, ShoppingBag, X, CheckCircle2 } from "lucide-react";
import api from "../../../../services/api";
import { SectionShell } from "../SectionShell.jsx";
import { onAccent } from "../../../../lib/verticals";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const TRACK_KEY = (id) => `in2fest-food-order-${id}`;
const readToken = (id) => { try { return window.localStorage.getItem(TRACK_KEY(id)); } catch { return null; } };
const saveToken = (id, t) => { try { window.localStorage.setItem(TRACK_KEY(id), t); } catch { /* private mode */ } };
const TYPE_LABEL = { delivery: "Delivery", takeaway: "Pickup", dine_in: "Dine-in" };
const STEPS = [["new", "Received"], ["preparing", "Preparing"], ["ready", "Ready"], ["completed", "Done"]];

function Dot({ type }) {
  const c = type === "nonveg" ? "#dc2626" : type === "egg" ? "#d97706" : "#16a34a";
  return <span className="inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0" style={{ borderColor: c }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /></span>;
}

function Sheet({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-stone-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-stone-400"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tracker({ token, venue, theme, onClose }) {
  const [o, setO] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setO((await api.get(`/public/food/order/${token}`)).data.data); setErr(""); }
    catch { setErr("We could not load this order."); }
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const claim = async () => { try { await api.post(`/public/food/order/${token}/claimed`); load(); } catch { /* ignore */ } };

  if (err) return <Sheet onClose={onClose} title="Your order"><p className="text-sm text-red-500">{err}</p></Sheet>;
  if (!o) return <Sheet onClose={onClose} title="Your order"><p className="text-sm text-stone-500">Loading…</p></Sheet>;

  const idx = STEPS.findIndex(([k]) => k === o.status);
  const wa = o.restaurant.whatsapp
    ? `https://wa.me/${o.restaurant.whatsapp}?text=${encodeURIComponent(`Hi, this is about my order #${o.order_no} (token ${o.token_no}).`)}` : null;

  return (
    <Sheet onClose={onClose} title={`Order #${o.order_no}`}>
      <div className="text-center mb-4">
        <CheckCircle2 size={40} className="mx-auto mb-1" style={{ color: theme }} />
        <p className="font-semibold text-stone-900 dark:text-white">{o.status === "cancelled" ? "Order cancelled" : o.status === "completed" ? "Enjoy your meal!" : "Order placed"}</p>
        <p className="text-sm text-stone-500">Your token: <b className="text-lg" style={{ color: theme }}>{o.token_no}</b> · {TYPE_LABEL[o.order_type]}{o.table_name ? ` · Table ${o.table_name}` : ""}</p>
        {o.status !== "cancelled" && o.status !== "completed" && <p className="text-xs text-stone-500 mt-1">Usually ready in about {o.eta_min} minutes</p>}
      </div>

      {o.status !== "cancelled" && (
        <div className="flex items-center justify-between mb-4">
          {STEPS.map(([k, l], i) => (
            <div key={k} className="flex-1 text-center">
              <div className="mx-auto w-3 h-3 rounded-full" style={{ backgroundColor: i <= idx ? theme : "#d6d3d1" }} />
              <p className={`text-[11px] mt-1 ${i <= idx ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-400"}`}>{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-stone-200 dark:border-stone-700 pt-3 text-sm space-y-1">
        {o.items.map((l, i) => <div key={i} className="flex justify-between text-stone-700 dark:text-stone-300"><span>{l.quantity} × {l.name}</span><span>{money(l.amount)}</span></div>)}
        {o.charges.map((c, i) => <div key={i} className="flex justify-between text-stone-500"><span>{c.name}</span><span>{money(c.amount)}</span></div>)}
        {o.tax > 0 && <div className="flex justify-between text-stone-500"><span>GST</span><span>{money(o.tax)}</span></div>}
        <div className="flex justify-between font-bold text-stone-900 dark:text-white pt-1"><span>Total</span><span>{money(o.total)}</span></div>
      </div>

      {o.payment_status === "paid" ? (
        <p className="mt-3 text-center text-sm font-semibold text-green-600">Payment received. Thank you!</p>
      ) : o.status !== "cancelled" && (
        <div className="mt-4 space-y-2">
          {o.upi_link && <a href={o.upi_link} className="block text-center py-3 rounded-xl font-bold" style={{ backgroundColor: theme, color: onAccent(theme) }}>Pay {money(o.total)} with UPI</a>}
          {o.upi_link && !o.claimed && <button onClick={claim} className="w-full text-sm py-2 text-stone-600 dark:text-stone-300 underline">I have paid</button>}
          {o.claimed && <p className="text-center text-xs text-stone-500">Thanks! The restaurant will confirm your payment.</p>}
          {!o.upi_link && <p className="text-center text-xs text-stone-500">Pay at the counter or on delivery.</p>}
        </div>
      )}
      <div className="flex gap-3 mt-3 justify-center text-sm">
        {o.restaurant.phone && <a href={`tel:${o.restaurant.phone}`} className="underline text-stone-600 dark:text-stone-300">Call restaurant</a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="underline text-stone-600 dark:text-stone-300">WhatsApp</a>}
      </div>
    </Sheet>
  );
}

export default function FoodStorefront({ config, theme, toneIdx, venue, Fallback }) {
  const [menu, setMenu] = useState(null); // null = loading, false = not available
  const [cart, setCart] = useState([]);
  const [q, setQ] = useState("");
  const [veg, setVeg] = useState(false);
  const [pick, setPick] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [type, setType] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "", website: "" });
  const [bill, setBill] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const [saved, setSaved] = useState(() => readToken(venue.id));

  const tableParam = useMemo(() => new URLSearchParams(window.location.search).get("table"), []);

  useEffect(() => {
    let off = false;
    api.get(`/public/food/${venue.id}/menu`, { params: tableParam ? { table: tableParam } : {} })
      .then((r) => { if (!off) setMenu(r.data.data); })
      .catch(() => { if (!off) setMenu(false); });
    return () => { off = true; };
  }, [venue.id, tableParam]);

  const cfg = menu && menu.config;
  const types = useMemo(() => {
    if (!menu) return [];
    if (menu.table) return cfg.allow_dine_in ? ["dine_in"] : [];
    return [cfg.allow_delivery && "delivery", cfg.allow_pickup && "takeaway"].filter(Boolean);
  }, [menu, cfg]);
  useEffect(() => { if (types.length && !types.includes(type)) setType(types[0]); }, [types, type]);

  const lines = (list = cart) => list.map((l) => ({ item_id: l.item_id, variant: l.variant, qty: l.qty }));

  // The server prices the order, so the customer sees the final amount before paying.
  useEffect(() => {
    if (!checkout || !type || cart.length === 0) return undefined;
    const t = setTimeout(() => {
      api.post(`/public/food/${venue.id}/preview`, { order_type: type, items: lines() })
        .then((r) => { setBill(r.data.data); setError(""); })
        .catch((e) => { setBill(null); setError(e.response?.data?.message || ""); });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, type, cart, venue.id]);

  const categories = useMemo(() => {
    if (!menu) return [];
    const withItems = menu.categories.filter((c) => menu.items.some((i) => i.category_id === c.id));
    return menu.items.some((i) => !i.category_id) ? [...withItems, { id: "none", name: "More" }] : withItems;
  }, [menu]);

  const visible = (catId) => menu.items.filter((i) =>
    (catId === "none" ? !i.category_id : i.category_id === catId) && (!veg || i.food_type === "veg") && (!q || i.name.toLowerCase().includes(q.toLowerCase())));

  const canOrder = Boolean(cfg && cfg.accepting_orders && types.length);
  const add = (item, variant) => {
    const key = `${item.id}|${variant?.name || ""}`;
    setCart((c) => (c.some((l) => l.key === key) ? c.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + 1, 50) } : l))
      : [...c, { key, item_id: item.id, name: item.name, variant: variant?.name || "", price: variant ? variant.price : item.price, qty: 1, food_type: item.food_type }]));
  };
  const change = (key, d) => setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));
  const qtyOf = (id) => cart.filter((l) => l.item_id === id).reduce((s, l) => s + l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);

  const place = async (e) => {
    e.preventDefault();
    setPlacing(true);
    setError("");
    try {
      const r = await api.post(`/public/food/${venue.id}/orders`, {
        order_type: type, table: menu.table || undefined, items: lines(), notes: form.notes, website: form.website,
        customer: { name: form.name, phone: form.phone, address: form.address }
      });
      const t = r.data.data?.tracking_token;
      if (t) { saveToken(venue.id, t); setSaved(t); setToken(t); }
      setCart([]); setCheckout(false); setBill(null);
    } catch (err) { setError(err.response?.data?.message || "Could not place the order. Please try again."); }
    finally { setPlacing(false); }
  };

  if (menu === false || (menu && menu.items.length === 0)) return Fallback ? <Fallback config={config} theme={theme} toneIdx={toneIdx} /> : null;
  if (menu === null) {
    return <SectionShell title="Our Menu" toneIdx={toneIdx} theme={theme} subtitle="Menu"><p className="text-center text-stone-400">Loading the menu…</p></SectionShell>;
  }

  const input = "w-full px-3 py-2.5 border border-stone-300 dark:border-stone-600 rounded-xl text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2";

  return (
    <SectionShell title={menu.table ? `Table ${menu.table}: order from your phone` : canOrder ? "Order Online" : "Our Menu"} toneIdx={toneIdx} theme={theme} subtitle={menu.table ? "Dine-in" : "Menu"}>
      {!cfg.accepting_orders && <p className="max-w-xl mx-auto mb-6 text-center text-sm rounded-xl bg-amber-50 text-amber-800 px-4 py-3">We are not taking online orders right now. You can still see our menu{cfg.phone ? ` or call ${cfg.phone}` : ""}.</p>}
      {canOrder && !menu.table && <p className="text-center text-sm text-stone-500 dark:text-stone-400 -mt-8 mb-6">{cfg.delivery_note || `Ready in about ${cfg.prep_time_min} minutes`}{cfg.min_order > 0 ? ` · Minimum order ${money(cfg.min_order)}` : ""}</p>}

      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1"><Search size={15} className="absolute left-3 top-3.5 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className={`${input} pl-9`} /></div>
          <button type="button" onClick={() => setVeg(!veg)} className="px-4 rounded-xl text-sm font-semibold border-2" style={veg ? { backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#fff" } : { borderColor: "#16a34a", color: "#16a34a" }}>Veg</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 sticky top-16 z-10 bg-white/90 dark:bg-stone-950/90 backdrop-blur py-2">
          {categories.map((c) => (
            <a key={c.id} href={`#food-cat-${c.id}`} className="px-4 py-1.5 rounded-full text-sm font-semibold border whitespace-nowrap" style={{ borderColor: `${theme}60`, color: theme }}>{c.name}</a>
          ))}
        </div>

        {categories.map((c) => {
          const list = visible(c.id);
          if (!list.length) return null;
          return (
            <div key={c.id} id={`food-cat-${c.id}`} className="mb-8 scroll-mt-32">
              <h3 className="text-xl font-extrabold text-stone-900 dark:text-white mb-3">{c.name}</h3>
              <div className="space-y-3">
                {list.map((i) => {
                  const n = qtyOf(i.id);
                  return (
                    <div key={i.id} className={`flex gap-3 rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 shadow-sm ${i.is_available ? "" : "opacity-50"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5"><Dot type={i.food_type} />{i.is_bestseller && <span className="text-[10px] font-bold text-amber-600">★ BESTSELLER</span>}</div>
                        <p className="font-bold text-stone-900 dark:text-white mt-1">{i.name}</p>
                        <p className="font-semibold text-sm mt-0.5" style={{ color: theme }}>{i.variants.length ? `from ${money(i.price)}` : money(i.price)}{i.spice_level > 0 && <span className="ml-2">{"🌶️".repeat(i.spice_level)}</span>}</p>
                        {i.stall && <p className="text-[11px] text-stone-400">From {i.stall}</p>}
                        {i.description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">{i.description}</p>}
                      </div>
                      <div className="relative w-24 flex-shrink-0 flex flex-col items-center justify-end">
                        {i.image_url && <img src={i.image_url} alt={i.name} loading="lazy" className="w-24 h-20 object-cover rounded-xl mb-2" />}
                        {!i.is_available ? <span className="text-xs font-semibold text-stone-500">Sold out</span> : canOrder && (
                          n > 0 && !i.variants.length ? (
                            <div className="flex items-center gap-2 rounded-full border-2 px-1" style={{ borderColor: theme }}>
                              <button onClick={() => change(`${i.id}|`, -1)} className="p-1"><Minus size={14} style={{ color: theme }} /></button>
                              <span className="text-sm font-bold" style={{ color: theme }}>{n}</span>
                              <button onClick={() => add(i)} className="p-1"><Plus size={14} style={{ color: theme }} /></button>
                            </div>
                          ) : (
                            <button onClick={() => (i.variants.length ? setPick(i) : add(i))} className="px-5 py-1.5 rounded-full text-sm font-bold border-2" style={{ borderColor: theme, color: theme }}>{n > 0 ? `Add (${n})` : "Add"}</button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {saved && <div className="text-center"><button onClick={() => setToken(saved)} className="text-sm underline text-stone-500 dark:text-stone-400">Track my last order</button></div>}
      </div>

      {canOrder && count > 0 && (
        <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-40 px-4">
          <button onClick={() => setCheckout(true)} className="w-full max-w-md mx-auto flex items-center justify-between px-5 py-3.5 rounded-full shadow-2xl font-bold" style={{ backgroundColor: theme, color: onAccent(theme) }}>
            <span className="flex items-center gap-2"><ShoppingBag size={18} /> {count} item{count > 1 ? "s" : ""}</span>
            <span>View cart · {money(subtotal)}</span>
          </button>
        </div>
      )}

      {pick && (
        <Sheet onClose={() => setPick(null)} title={pick.name}>
          <div className="space-y-2">
            {pick.variants.map((v) => (
              <button key={v.name} onClick={() => { add(pick, v); setPick(null); }} className="w-full flex justify-between items-center px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white">
                <span className="font-semibold">{v.name}</span><span style={{ color: theme }} className="font-bold">{money(v.price)}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {checkout && (
        <Sheet onClose={() => setCheckout(false)} title="Your order">
          <div className="space-y-2 mb-4">
            {cart.map((l) => (
              <div key={l.key} className="flex items-center gap-2 text-sm">
                <Dot type={l.food_type} />
                <span className="flex-1 text-stone-800 dark:text-stone-100">{l.name}{l.variant && ` (${l.variant})`}</span>
                <button onClick={() => change(l.key, -1)} className="w-6 h-6 rounded-full border flex items-center justify-center"><Minus size={12} /></button>
                <span className="w-5 text-center font-semibold text-stone-900 dark:text-white">{l.qty}</span>
                <button onClick={() => change(l.key, 1)} className="w-6 h-6 rounded-full border flex items-center justify-center"><Plus size={12} /></button>
                <span className="w-16 text-right text-stone-700 dark:text-stone-300">{money(l.price * l.qty)}</span>
              </div>
            ))}
            {cart.length === 0 && <p className="text-sm text-stone-400">Your cart is empty.</p>}
          </div>

          <form onSubmit={place} className="space-y-3">
            {!menu.table && types.length > 1 && (
              <div className="flex gap-2">
                {types.map((t) => (
                  <button type="button" key={t} onClick={() => setType(t)} className="flex-1 py-2 rounded-xl text-sm font-semibold border-2" style={type === t ? { backgroundColor: theme, borderColor: theme, color: onAccent(theme) } : { borderColor: `${theme}50`, color: theme }}>{TYPE_LABEL[t]}</button>
                ))}
              </div>
            )}
            <input className={input} placeholder="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="Mobile number" inputMode="numeric" maxLength={10} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {type === "delivery" && <textarea className={input} rows={2} placeholder="Full delivery address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />}
            <input className={input} placeholder="Any request? (less spicy, no onion…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <input className="hidden" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />

            {bill && (
              <div className="text-sm border-t border-stone-200 dark:border-stone-700 pt-3 space-y-1 text-stone-600 dark:text-stone-300">
                <div className="flex justify-between"><span>Items</span><span>{money(bill.subtotal - bill.lines.filter((l) => l.kind === "charge").reduce((s, l) => s + l.amount, 0))}</span></div>
                {bill.lines.filter((l) => l.kind === "charge").map((l, i) => <div key={i} className="flex justify-between"><span>{l.name}</span><span>{money(l.amount)}</span></div>)}
                {bill.cgst + bill.sgst > 0 && <div className="flex justify-between"><span>GST</span><span>{money(bill.cgst + bill.sgst)}</span></div>}
                <div className="flex justify-between text-base font-extrabold text-stone-900 dark:text-white"><span>Total</span><span>{money(bill.total)}</span></div>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={placing || cart.length === 0 || (bill && !bill.min_order_ok)} className="w-full py-3 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: theme, color: onAccent(theme) }}>
              {placing ? "Placing order…" : bill && !bill.min_order_ok ? `Minimum order ${money(bill.min_order)}` : "Place order"}
            </button>
            <p className="text-[11px] text-center text-stone-400">Pay by UPI after ordering, or at the counter or on delivery.</p>
          </form>
        </Sheet>
      )}

      {token && <Tracker token={token} venue={venue} theme={theme} onClose={() => setToken(null)} />}
    </SectionShell>
  );
}