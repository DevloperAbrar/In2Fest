// Live online ordering on the restaurant's own website: menu, cart, Google sign-in,
// pickup orders and a "My orders" panel with a live countdown.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Minus, ShoppingBag, X, Receipt, LogOut, Clock, ChevronDown } from "lucide-react";
 
import api from "../../../../services/api";
import { SectionShell, Reveal } from "../SectionShell.jsx";
import { onAccent } from "../../../../lib/verticals";
import { visitorApi, getVisitorToken, getVisitorUser, signInWithGooglePopup, visitorSignOut } from "../../../../lib/visitorAuth";
import { FoodOrderCard, isActiveOrder } from "./FoodOrderCard.jsx";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const TYPE_LABEL = { takeaway: "Pickup", dine_in: "Dine-in" };

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

function Drawer({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="bg-stone-50 dark:bg-stone-900 w-full max-w-md h-full overflow-y-auto p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-stone-400"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const PAGE = 12; // dishes shown at a time, so a 200-dish menu never becomes one endless page

function Pill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 shadow-sm">
      {icon}{children}
    </span>
  );
}

function DishCard({ i, qty, canOrder, theme, tag, onAdd, onRemove, onPick }) {
  const hasVariants = i.variants.length > 0;
  const soldOut = !i.is_available;
  const hasImage = Boolean(i.image_url);
  const btn = "px-5 py-1.5 rounded-full text-sm font-bold border-2 bg-white dark:bg-stone-900 shadow-md";

  let control = null;
  if (soldOut) control = <span className="text-xs font-semibold text-stone-500 bg-stone-100 dark:bg-stone-700 dark:text-stone-300 rounded-full px-3 py-1">Sold out</span>;
  else if (canOrder) {
    control = qty > 0 && !hasVariants ? (
      <div className="flex items-center gap-1 rounded-full border-2 bg-white dark:bg-stone-900 shadow-md px-1" style={{ borderColor: theme }}>
        <button type="button" aria-label={`Remove one ${i.name}`} onClick={() => onRemove(i)} className="p-1.5"><Minus size={14} style={{ color: theme }} /></button>
        <span className="text-sm font-bold min-w-[1.25rem] text-center" style={{ color: theme }}>{qty}</span>
        <button type="button" aria-label={`Add one ${i.name}`} onClick={() => onAdd(i)} className="p-1.5"><Plus size={14} style={{ color: theme }} /></button>
      </div>
    ) : (
      <button type="button" onClick={() => (hasVariants ? onPick(i) : onAdd(i))} className={btn} style={{ borderColor: theme, color: theme }}>
        {qty > 0 ? `Add (${qty})` : "Add"}
      </button>
    );
  }

  return (
    <div className={`flex gap-4 rounded-2xl border border-stone-200/80 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-sm hover:shadow-md transition-shadow ${hasImage ? "pb-6" : ""} ${soldOut ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Dot type={i.food_type} />
          {i.is_bestseller && <span className="text-[10px] font-bold text-amber-600 tracking-wide">★ BESTSELLER</span>}
          {tag && <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide truncate">{tag}</span>}
        </div>
        <h4 className="mt-1.5 font-bold leading-snug text-stone-900 dark:text-white">{i.name}</h4>
        <p className="mt-0.5 text-sm font-semibold" style={{ color: theme }}>
          {hasVariants ? `from ${money(i.price)}` : money(i.price)}
          {i.spice_level > 0 && <span className="ml-2">{"🌶️".repeat(i.spice_level)}</span>}
        </p>
        {i.stall && <p className="text-[11px] text-stone-400 mt-0.5">From {i.stall}</p>}
        {i.description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2">{i.description}</p>}
      </div>
      <div className={`relative flex-shrink-0 flex flex-col items-center ${hasImage ? "" : "justify-center"}`}>
        {hasImage && <img src={i.image_url} alt={i.name} loading="lazy" className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl" />}
        {control && <div className={hasImage ? "absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap" : ""}>{control}</div>}
      </div>
    </div>
  );
}

function SignInBox({ note, onDone }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    setErr("");
    try {
      onDone(await signInWithGooglePopup());
    } catch (e) {
      if (e.message === "popup_blocked") setErr("Please allow pop-ups for this site, then try again.");
      else if (e.message !== "closed") setErr("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center space-y-3 py-3">
      <p className="text-sm text-stone-600 dark:text-stone-300">{note}</p>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-stone-300 bg-white text-stone-900 text-sm font-semibold shadow-sm hover:shadow disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        {busy ? "Waiting for Google…" : "Continue with Google"}
      </button>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
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
  const [form, setForm] = useState({ name: "", phone: "", notes: "", website: "" });
  const [bill, setBill] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // signed-in website visitor (Google) + their orders
  const [visitor, setVisitor] = useState(() => (getVisitorToken() ? getVisitorUser() || { name: "" } : null));
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [orders, setOrders] = useState(null); // null = not loaded yet
  const [skew, setSkew] = useState(0); // server clock minus this device's clock
  const [justPlaced, setJustPlaced] = useState(false);

  // menu browsing: one category at a time, a few dishes at a time
  const [activeCat, setActiveCat] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const topRef = useRef(null);

  const tableParam = useMemo(() => new URLSearchParams(window.location.search).get("table"), []);

  useEffect(() => {
    let off = false;
    api.get(`/public/food/${venue.id}/menu`, { params: tableParam ? { table: tableParam } : {} })
      .then((r) => { if (!off) setMenu(r.data.data); })
      .catch(() => { if (!off) setMenu(false); });
    return () => { off = true; };
  }, [venue.id, tableParam]);

  useEffect(() => {
    const out = () => setVisitor(null);
    window.addEventListener("in2fest-visitor-signed-out", out);
    return () => window.removeEventListener("in2fest-visitor-signed-out", out);
  }, []);

  useEffect(() => {
    if (visitor?.name) setForm((f) => (f.name ? f : { ...f, name: visitor.name }));
  }, [visitor]);

  const loadOrders = useCallback(async () => {
    if (!getVisitorToken()) return;
    try {
      const r = await visitorApi.get(`/public/food/${venue.id}/my-orders`);
      const d = r.data.data;
      setSkew(Date.parse(d.server_time) - Date.now());
      setOrders(d.orders);
    } catch { /* keep what is on screen */ }
  }, [venue.id]);

  useEffect(() => { if (visitor) loadOrders(); else setOrders(null); }, [visitor, loadOrders]);

  // Live updates: refresh every 5 seconds while the panel is open or an order is still active.
  const activeCount = (orders || []).filter(isActiveOrder).length;
  useEffect(() => {
    if (!visitor || !(ordersOpen || activeCount > 0)) return undefined;
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [visitor, ordersOpen, activeCount, loadOrders]);

  const cfg = menu && menu.config;
  // Pickup only (or dine-in when the customer scanned a table QR). No delivery.
  const types = useMemo(() => {
    if (!menu) return [];
    if (menu.table) return cfg.allow_dine_in ? ["dine_in"] : [];
    return cfg.allow_pickup ? ["takeaway"] : [];
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

  const term = q.trim().toLowerCase();
  const searching = term.length > 0;

  // dishes that pass the search / veg filter, grouped by category (+ a "Bestsellers" group)
  const grouped = useMemo(() => {
    const g = { popular: [] };
    if (!menu) return g;
    menu.items.forEach((i) => {
      if (veg && i.food_type !== "veg") return;
      if (term && !`${i.name} ${i.description || ""}`.toLowerCase().includes(term)) return;
      const k = i.category_id || "none";
      if (!g[k]) g[k] = [];
      g[k].push(i);
      if (i.is_bestseller) g.popular.push(i);
    });
    return g;
  }, [menu, veg, term]);

  const catName = useMemo(() => {
    const m = {};
    categories.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const visibleTabs = useMemo(() => {
    const all = grouped.popular.length ? [{ id: "popular", name: "Bestsellers" }, ...categories] : categories;
    return all.filter((t) => (grouped[t.id] || []).length > 0);
  }, [grouped, categories]);

  const current = visibleTabs.some((t) => t.id === activeCat) ? activeCat : visibleTabs[0]?.id;
  const currentIdx = visibleTabs.findIndex((t) => t.id === current);
  const nextTab = currentIdx >= 0 ? visibleTabs[currentIdx + 1] : null;

  // available dishes first, sold-out ones at the end
  const fullList = (searching ? categories.flatMap((c) => grouped[c.id] || []) : grouped[current] || [])
    .slice()
    .sort((a, b) => Number(b.is_available) - Number(a.is_available));
  const shownList = fullList.slice(0, limit);
  const remaining = fullList.length - shownList.length;

  useEffect(() => { setLimit(PAGE); }, [current, term, veg]);

  const goTab = (id) => {
    setQ("");
    setActiveCat(id);
    requestAnimationFrame(() => {
      const el = topRef.current;
      if (el && el.getBoundingClientRect().top < 120) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
      await visitorApi.post(`/public/food/${venue.id}/orders`, {
        order_type: type, table: menu.table || undefined, items: lines(), notes: form.notes, website: form.website,
        customer: { name: form.name, phone: form.phone }
      });
      setCart([]); setCheckout(false); setBill(null);
      setJustPlaced(true); setOrdersOpen(true);
      await loadOrders();
    } catch (err) {
      if (err.response?.status === 401) { setVisitor(null); setError("Please continue with Google to place your order."); }
      else setError(err.response?.data?.message || "Could not place the order. Please try again.");
    } finally { setPlacing(false); }
  };

  const signOut = async () => { await visitorSignOut(); setVisitor(null); setOrders(null); };

  if (menu === false || (menu && menu.items.length === 0)) return Fallback ? <Fallback config={config} theme={theme} toneIdx={toneIdx} /> : null;
  if (menu === null) {
    return <SectionShell title="Our Menu" toneIdx={toneIdx} theme={theme} subtitle="Menu"><p className="text-center text-stone-400">Loading the menu…</p></SectionShell>;
  }

  const input = "w-full px-3 py-2.5 border border-stone-300 dark:border-stone-600 rounded-xl text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2";

  const heading = menu.table ? `Table ${menu.table}: order from your phone` : canOrder ? "Order Online" : "Our Menu";
  const tabBtn = (t, on) => (
    <button
      key={t.id}
      type="button"
      aria-pressed={on}
      onClick={() => goTab(t.id)}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${on ? "shadow-sm" : "bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700"}`}
      style={on ? { backgroundColor: theme, borderColor: theme, color: onAccent(theme) } : { borderColor: `${theme}55`, color: theme }}
    >
      {t.name}
    </button>
  );

  return (
    <section className="relative text-stone-900 dark:text-stone-100" style={{ backgroundColor: `var(--tone-${toneIdx % 2})` }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-28">
        <Reveal className="text-center mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>{menu.table ? "Dine-in" : "Menu"}</span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white" style={{ letterSpacing: "-0.02em" }}>{heading}</h2>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-xs font-semibold">
            {canOrder && !menu.table && <Pill icon={<Clock size={13} />}>Pickup · ready in about {cfg.prep_time_min} min</Pill>}
            {canOrder && cfg.min_order > 0 && <Pill>Minimum order {money(cfg.min_order)}</Pill>}
            <Pill>{menu.items.length} dishes</Pill>
          </div>
        </Reveal>

        {!cfg.accepting_orders && <p className="max-w-xl mx-auto mb-6 text-center text-sm rounded-xl bg-amber-50 text-amber-800 px-4 py-3">We are not taking online orders right now. You can still see our menu{cfg.phone ? ` or call ${cfg.phone}` : ""}.</p>}

        {/* Search, veg filter and (on phones) category chips stay in view while scrolling */}
        <div className="sticky top-20 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 backdrop-blur" style={{ backgroundColor: `color-mix(in srgb, var(--tone-${toneIdx % 2}) 92%, transparent)` }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${menu.items.length} dishes`} className={`${input} pl-10 pr-9 py-3 rounded-2xl`} />
              {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-3 top-3.5 text-stone-400"><X size={16} /></button>}
            </div>
            <button
              type="button"
              aria-pressed={veg}
              onClick={() => setVeg(!veg)}
              className="px-4 rounded-2xl text-sm font-semibold border-2 inline-flex items-center gap-2 bg-white dark:bg-stone-800"
              style={veg ? { backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#fff" } : { borderColor: "#16a34a", color: "#16a34a" }}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm bg-white" style={{ borderColor: "#16a34a" }}><span className="w-2 h-2 rounded-full bg-green-600" /></span>
              Veg
            </button>
          </div>
          {!searching && visibleTabs.length > 1 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pt-3 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
              {visibleTabs.map((t) => tabBtn(t, t.id === current))}
            </div>
          )}
        </div>

        <div className="mt-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          {/* Category list (desktop) */}
          {visibleTabs.length > 1 && !searching && (
            <aside className="hidden lg:block sticky top-44 self-start max-h-[calc(100vh-13rem)] overflow-y-auto rounded-2xl border border-stone-200/80 dark:border-stone-700 bg-white dark:bg-stone-800 p-2 shadow-sm">
              {visibleTabs.map((t) => {
                const on = t.id === current;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => goTab(t.id)}
                    className="w-full flex items-center justify-between gap-3 text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-stone-50 dark:hover:bg-stone-700"
                    style={on ? { backgroundColor: `${theme}1a`, color: theme } : undefined}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-xs font-bold text-stone-400">{(grouped[t.id] || []).length}</span>
                  </button>
                );
              })}
            </aside>
          )}

          <div className={visibleTabs.length > 1 && !searching ? "" : "lg:col-span-2"}>
            <div ref={topRef} className="scroll-mt-44 flex items-baseline justify-between gap-3 mb-4">
              <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white">
                {searching ? `Results for “${q.trim()}”` : visibleTabs.find((t) => t.id === current)?.name || "Menu"}
              </h3>
              <span className="text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">{fullList.length} {fullList.length === 1 ? "dish" : "dishes"}</span>
            </div>

            {fullList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-600 py-14 text-center">
                <p className="font-semibold text-stone-700 dark:text-stone-200">No dishes found</p>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Try a different search{veg ? " or turn off the Veg filter" : ""}.</p>
                {(searching || veg) && (
                  <button type="button" onClick={() => { setQ(""); setVeg(false); }} className="mt-4 px-5 py-2 rounded-full text-sm font-bold" style={{ backgroundColor: theme, color: onAccent(theme) }}>Clear filters</button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {shownList.map((i) => (
                  <DishCard
                    key={i.id}
                    i={i}
                    qty={qtyOf(i.id)}
                    canOrder={canOrder}
                    theme={theme}
                    tag={searching ? catName[i.category_id || "none"] : undefined}
                    onAdd={(item) => add(item)}
                    onRemove={(item) => change(`${item.id}|`, -1)}
                    onPick={setPick}
                  />
                ))}
              </div>
            )}

            {remaining > 0 && (
              <div className="mt-6 text-center">
                <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold border-2 bg-white dark:bg-stone-800" style={{ borderColor: theme, color: theme }}>
                  Show {Math.min(PAGE, remaining)} more · {remaining} left <ChevronDown size={16} />
                </button>
              </div>
            )}

            {!searching && remaining === 0 && nextTab && fullList.length > 0 && (
              <div className="mt-8 text-center">
                <button type="button" onClick={() => goTab(nextTab.id)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold shadow-md" style={{ backgroundColor: theme, color: onAccent(theme) }}>
                  Next: {nextTab.name} →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My orders button: always reachable, also after a refresh */}
      <button
        onClick={() => { setJustPlaced(false); setOrdersOpen(true); }}
        className="fixed right-4 bottom-36 sm:bottom-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl text-sm font-bold"
        style={{ backgroundColor: theme, color: onAccent(theme) }}
      >
        <Receipt size={16} /> My orders
        {activeCount > 0 && <span className="ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-white text-stone-900 text-xs flex items-center justify-center">{activeCount}</span>}
      </button>

      {canOrder && count > 0 && (
        <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-40 px-4 pointer-events-none">
          <button onClick={() => setCheckout(true)} className="pointer-events-auto w-full max-w-md mx-auto flex items-center justify-between px-5 py-3.5 rounded-full shadow-2xl font-bold" style={{ backgroundColor: theme, color: onAccent(theme) }}>
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

          {!visitor ? (
            <SignInBox
              note="Continue with Google to place your order. You can then track it live under “My orders”."
              onDone={(u) => { setVisitor(u); setError(""); }}
            />
          ) : (
            <form onSubmit={place} className="space-y-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {TYPE_LABEL[type]}{menu.table ? ` · Table ${menu.table}` : " · collect from the restaurant"} · signed in as {visitor.name || visitor.email}
              </p>
              <input className={input} placeholder="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className={input} placeholder="Mobile number" inputMode="numeric" maxLength={10} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
              <p className="text-[11px] text-center text-stone-400">Pay by UPI after ordering, or at the counter when you collect.</p>
            </form>
          )}
        </Sheet>
      )}

      {ordersOpen && (
        <Drawer title="My orders" onClose={() => setOrdersOpen(false)}>
          {!visitor ? (
            <SignInBox note="Continue with Google to see your orders, token number and live time left." onDone={(u) => setVisitor(u)} />
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-stone-500 mb-3">
                <span>{visitor.name || visitor.email}</span>
                <button onClick={signOut} className="flex items-center gap-1 underline"><LogOut size={12} /> Sign out</button>
              </div>
              {justPlaced && <p className="mb-3 text-sm rounded-xl bg-green-50 text-green-700 px-3 py-2">Order placed! Keep your token number handy. This page updates live.</p>}
              {orders === null ? (
                <p className="text-center text-sm text-stone-400 py-10">Loading your orders…</p>
              ) : orders.length === 0 ? (
                <p className="text-center text-sm text-stone-400 py-10">You have not ordered here yet.</p>
              ) : (
                orders.map((o) => <FoodOrderCard key={o.tracking_token} o={o} theme={theme} skew={skew} onChanged={loadOrders} />)
              )}
            </>
          )}
        </Drawer>
      )}
    </section>
  );
}