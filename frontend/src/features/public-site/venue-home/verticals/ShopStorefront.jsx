import React, { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, X, Plus, Minus, Trash2, ChevronRight } from "lucide-react";
import { Reveal, SectionShell } from "../SectionShell.jsx";
import { inr, waLink, isFoodVenue, onAccent } from "../../../../lib/verticals";
import { publicOrders } from "../../../../services/ordersService";

// Categories are stored as "Men" or "Men > Shirts"
const splitCategory = (value) => {
  const [top = "", sub = ""] = String(value || "").split(">").map((p) => p.trim());
  return { top, sub };
};

const ACTIVE = ["pending", "accepted", "ready"];
const tokenKey = (venueId) => `in2fest_orders_${venueId}`;
const readTokens = (venueId) => { try { return JSON.parse(localStorage.getItem(tokenKey(venueId)) || "[]"); } catch { return []; } };
const saveToken = (venueId, token) => {
  try { localStorage.setItem(tokenKey(venueId), JSON.stringify([token, ...readTokens(venueId).filter((t) => t !== token)].slice(0, 5))); } catch { /* ignore */ }
};
const clock = (d) => (d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
const STATUS_TEXT = { pending: "Waiting for the shop to accept", accepted: "Being prepared", ready: "Ready for pickup" };

/* Small banner: "Your order #12 · Preparing" for returning visitors */
function ActiveOrderBanner({ venueId, theme }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let stop = false;
    const check = async () => {
      for (const token of readTokens(venueId)) {
        try {
          const o = (await publicOrders.track(token)).data.data;
          if (ACTIVE.includes(o.status)) { if (!stop) setInfo({ token, o }); return; }
        } catch { /* try the next one */ }
      }
      if (!stop) setInfo(null);
    };
    check();
    const id = setInterval(check, 20000);
    return () => { stop = true; clearInterval(id); };
  }, [venueId]);

  if (!info) return null;
  return (
    <a href={`/order/${info.token}`} className="mb-6 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm bg-white dark:bg-stone-800" style={{ borderColor: `${theme}66` }}>
      <span className="text-stone-800 dark:text-stone-100">
        <b>Your order #{info.o.order_no}</b> · {STATUS_TEXT[info.o.status]}
        {info.o.promised_at && info.o.status !== "ready" ? ` · ready by ${clock(info.o.promised_at)}` : ""}
      </span>
      <span className="inline-flex items-center font-semibold shrink-0" style={{ color: theme }}>Track <ChevronRight size={16} /></span>
    </a>
  );
}

export default function ShopStorefront({ config, theme, toneIdx, venue }) {
  const items = venue.catalog_items || [];
  const food = isFoodVenue(venue);

  const [q, setQ] = useState("");
  const [top, setTop] = useState("All");
  const [sub, setSub] = useState("All");
  const [sort, setSort] = useState("relevant");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onOffer, setOnOffer] = useState(false);
  const [pick, setPick] = useState({});
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // checkout
  const [cfg, setCfg] = useState(null); // public ordering settings
  const [step, setStep] = useState("cart"); // cart | details | done
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [hp, setHp] = useState(""); // honeypot
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    publicOrders.config(venue.id).then((r) => setCfg(r.data.data)).catch(() => setCfg({ enabled: false }));
  }, [venue.id]);

  // The hero search box and category chips talk to the storefront through these events.
  useEffect(() => {
    const onSearch = (e) => { setQ(String(e.detail || "")); setTop("All"); setSub("All"); };
    const onCategory = (e) => { setTop(String(e.detail || "All")); setSub("All"); };
    window.addEventListener("shop:search", onSearch);
    window.addEventListener("shop:category", onCategory);
    return () => {
      window.removeEventListener("shop:search", onSearch);
      window.removeEventListener("shop:category", onCategory);
    };
  }, []);

  const categories = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const { top: t } = splitCategory(i.category);
      if (!t) return;
      const row = map.get(t) || { name: t, count: 0, image: "" };
      row.count += 1;
      if (!row.image && i.image_url) row.image = i.image_url;
      map.set(t, row);
    });
    return [...map.values()];
  }, [items]);

  const subs = useMemo(() => {
    if (top === "All") return [];
    return Array.from(new Set(items.map((i) => splitCategory(i.category)).filter((c) => c.top === top && c.sub).map((c) => c.sub)));
  }, [items, top]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items.filter((i) => {
      const c = splitCategory(i.category);
      if (top !== "All" && c.top !== top) return false;
      if (sub !== "All" && c.sub !== sub) return false;
      if (inStockOnly && i.in_stock === false) return false;
      if (onOffer && !(i.discount_percent > 0 || i.offer_label)) return false;
      if (needle && ![i.title, i.brand, i.category, i.description].some((s) => String(s || "").toLowerCase().includes(needle))) return false;
      return true;
    });
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "discount") list = [...list].sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
    return list;
  }, [items, q, top, sub, sort, inStockOnly, onOffer]);

  /* ─── cart ─── */
  const addToCart = (it) => {
    const size = pick[it.id] || "";
    const key = `${it.id}|${size}`;
    setCart((c) => {
      const found = c.find((x) => x.key === key);
      if (found) return c.map((x) => (x.key === key ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { key, id: it.id, title: it.title, price: it.price, size, qty: 1, image: it.image_url }];
    });
  };
  const changeQty = (key, d) => setCart((c) => c.map((x) => (x.key === key ? { ...x, qty: Math.max(1, x.qty + d) } : x)));
  const removeLine = (key) => setCart((c) => c.filter((x) => x.key !== key));

  const count = cart.reduce((s, x) => s + x.qty, 0);
  const total = cart.reduce((s, x) => s + x.qty * x.price, 0);
  const minOrder = Number(cfg?.min_order_amount || 0);
  const ordering = Boolean(cfg?.enabled);

  const closeDrawer = () => { setCartOpen(false); if (step === "done") setStep("cart"); };

  const submit = async () => {
    const phone = form.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
    if (form.name.trim().length < 2) return setErr("Please enter your name");
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr("Enter a valid 10-digit mobile number");
    setPlacing(true);
    setErr("");
    try {
      const res = await publicOrders.place(venue.id, {
        name: form.name.trim(), phone, note: form.note.trim(), website: hp,
        items: cart.map((x) => ({ item_id: x.id, variant: x.size, qty: x.qty }))
      });
      const data = res.data.data;
      if (data?.token) saveToken(venue.id, data.token);
      setPlaced(data);
      setCart([]);
      setStep("done");
    } catch (e) {
      setErr(e.response?.data?.message || "Could not place your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Fallback when online ordering is not switched on: a plain WhatsApp enquiry (pickup only, no delivery).
  const waText = [
    `Hi ${venue.hall_name}, I'd like to order for pickup:`,
    ...cart.map((x, i) => `${i + 1}. ${x.title}${x.size ? ` (${x.size})` : ""} x${x.qty} - ${inr(x.price * x.qty)}`),
    `Total: ${inr(total)}`,
    "Please confirm when it will be ready."
  ].join("\n");
  const orderLink = waLink(venue, waText);

  const chip = (active) =>
    active ? { backgroundColor: theme, borderColor: theme, color: onAccent(theme) } : { borderColor: `${theme}40`, color: theme };
  const field = "w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2";

  return (
    <SectionShell title={config?.title || (food ? "Order for Pickup" : "Shop Our Collection")} toneIdx={toneIdx} theme={theme} subtitle={food ? "Order & collect" : "Shop"}>
      {ordering && <ActiveOrderBanner venueId={venue.id} theme={theme} />}

      {ordering && cfg.accepting === false && (
        <p className="mb-5 rounded-2xl bg-amber-50 text-amber-800 text-sm px-4 py-3">Online orders are paused right now. Please call us, or try again a little later.</p>
      )}

      {/* Category tiles */}
      {categories.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-3 mb-6 -mx-2 px-2">
          {[{ name: "All", count: items.length, image: "" }, ...categories].map((c) => (
            <button key={c.name} type="button" onClick={() => { setTop(c.name); setSub("All"); }} className="shrink-0 w-24 text-center group">
              <span className="block w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all group-hover:-translate-y-1" style={{ borderColor: top === c.name ? theme : "transparent", backgroundColor: `${theme}15` }}>
                {c.image ? <img src={c.image} alt={c.name} loading="lazy" className="w-full h-full object-cover" /> : (
                  <span className="w-full h-full flex items-center justify-center text-2xl font-extrabold" style={{ color: theme }}>{c.name[0]}</span>
                )}
              </span>
              <span className="mt-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-200 truncate">{c.name}</span>
              <span className="block text-[10px] text-stone-400">{c.count} items</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={food ? "Search dishes…" : "Search products, brands…"} className="w-full pl-11 pr-4 py-3 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-3 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-white">
          <option value="relevant">Sort: Featured</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
          <option value="discount">Biggest discount</option>
        </select>
        <button type="button" onClick={() => setInStockOnly((v) => !v)} className="px-4 py-2.5 rounded-full text-sm font-semibold border" style={chip(inStockOnly)}>Available</button>
        <button type="button" onClick={() => setOnOffer((v) => !v)} className="px-4 py-2.5 rounded-full text-sm font-semibold border" style={chip(onOffer)}>On offer</button>
      </div>

      {subs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {["All", ...subs].map((s) => (
            <button key={s} type="button" onClick={() => setSub(s)} className="px-3 py-1 rounded-full text-xs font-semibold border" style={chip(sub === s)}>{s}</button>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-400 mb-4">{visible.length} {food ? "dish" : "product"}{visible.length === 1 ? "" : food ? "es" : "s"}</p>
      {visible.length === 0 && <p className="text-center py-16 text-stone-400">Nothing matched. Try another search.</p>}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {visible.map((it, idx) => {
          const soldOut = it.in_stock === false;
          const needsSize = Array.isArray(it.variants) && it.variants.length > 0;
          const canAdd = !soldOut && (!needsSize || pick[it.id]);
          return (
            <Reveal key={it.id} delay={(idx % 8) * 50}>
              <div className={`h-full flex flex-col rounded-3xl border border-stone-100 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${soldOut ? "opacity-70" : ""}`}>
                <div className="relative aspect-square bg-stone-100 dark:bg-stone-700 overflow-hidden">
                  {it.image_url && <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />}
                  {soldOut && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">Unavailable</span>}
                  {!soldOut && it.discount_percent > 0 && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{it.discount_percent}% OFF</span>}
                  {!soldOut && it.offer_label && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold">{it.offer_label}</span>}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  {it.brand && <p className="text-[10px] uppercase tracking-wide text-stone-400">{it.brand}</p>}
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white leading-snug">{it.title}</h3>
                  <p className="mt-1 font-extrabold" style={{ color: theme }}>
                    {inr(it.price)}
                    {it.mrp > 0 && <span className="ml-2 text-xs font-normal text-stone-400 line-through">{inr(it.mrp)}</span>}
                  </p>
                  {it.low_stock && !soldOut && <p className="text-[11px] font-semibold text-amber-600 mt-1">Only a few left</p>}
                  {needsSize && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {it.variants.map((s) => (
                        <button key={s} type="button" onClick={() => setPick((p) => ({ ...p, [it.id]: s }))} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border" style={chip(pick[it.id] === s)}>{s}</button>
                      ))}
                    </div>
                  )}
                  <button type="button" disabled={!canAdd} onClick={() => addToCart(it)} className="mt-auto w-full">
                    <span className="mt-3 block py-2 rounded-xl text-xs font-bold transition-opacity" style={{ backgroundColor: theme, color: onAccent(theme), opacity: canAdd ? 1 : 0.4 }}>
                      {soldOut ? "Unavailable" : needsSize && !pick[it.id] ? (food ? "Select portion" : "Select a size") : "Add to order"}
                    </span>
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Floating cart bar */}
      {count > 0 && !cartOpen && (
        <button type="button" onClick={() => { setStep("cart"); setCartOpen(true); }} className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-40 flex items-center gap-3 px-6 py-3 rounded-full font-bold shadow-2xl" style={{ backgroundColor: theme, color: onAccent(theme) }}>
          <ShoppingBag size={18} /> {count} item{count > 1 ? "s" : ""} · {inr(total)} · View order
        </button>
      )}

      {/* Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={closeDrawer}>
          <div className="w-full max-w-md h-full bg-white dark:bg-stone-900 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-extrabold text-lg text-stone-900 dark:text-white">
                {step === "done" ? "Order placed" : step === "details" ? "Your details" : `Your order (${count})`}
              </h3>
              <button type="button" onClick={closeDrawer} className="text-stone-400" aria-label="Close"><X size={20} /></button>
            </div>

            {/* STEP: cart */}
            {step === "cart" && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {cart.length === 0 && <p className="text-center text-stone-400 py-10">Your order is empty.</p>}
                  {cart.map((x) => (
                    <div key={x.key} className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">{x.image && <img src={x.image} alt="" className="w-full h-full object-cover" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">{x.title}</p>
                        {x.size && <p className="text-xs text-stone-400">{x.size}</p>}
                        <div className="mt-1 flex items-center gap-2">
                          <button type="button" onClick={() => changeQty(x.key, -1)} className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300"><Minus size={12} /></button>
                          <span className="text-sm font-bold text-stone-900 dark:text-white w-5 text-center">{x.qty}</span>
                          <button type="button" onClick={() => changeQty(x.key, 1)} className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300"><Plus size={12} /></button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: theme }}>{inr(x.price * x.qty)}</p>
                        <button type="button" onClick={() => removeLine(x.key)} className="mt-2 text-stone-400 hover:text-red-500" aria-label="Remove"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="p-5 border-t border-stone-100 dark:border-stone-800 space-y-3">
                    <div className="flex justify-between font-extrabold text-stone-900 dark:text-white"><span>Total</span><span>{inr(total)}</span></div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Pickup only · you pay at the shop when you collect.</p>
                    {ordering && cfg.accepting !== false ? (
                      <>
                        {minOrder > 0 && total < minOrder && <p className="text-xs text-amber-600">Minimum order is {inr(minOrder)}. Add {inr(minOrder - total)} more.</p>}
                        <button type="button" disabled={minOrder > 0 && total < minOrder} onClick={() => { setErr(""); setStep("details"); }} className="w-full py-3 rounded-xl font-bold disabled:opacity-40" style={{ backgroundColor: theme, color: onAccent(theme) }}>
                          Continue
                        </button>
                      </>
                    ) : ordering ? (
                      <p className="text-xs text-center text-amber-600">Orders are paused right now. Please call us.</p>
                    ) : orderLink ? (
                      <a href={orderLink} target="_blank" rel="noopener noreferrer" className="block text-center py-3 rounded-xl bg-green-600 text-white font-bold">Send order on WhatsApp</a>
                    ) : (
                      <p className="text-xs text-center text-stone-400">Please call the shop to place your order.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* STEP: details */}
            {step === "details" && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="rounded-2xl bg-stone-50 dark:bg-stone-800 p-4 text-sm text-stone-700 dark:text-stone-200">
                    <p className="font-semibold">{count} item{count > 1 ? "s" : ""} · {inr(total)}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">You'll get a pickup code. Show it at the counter to collect your order.</p>
                  </div>
                  <input className={field} placeholder="Your name" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                  <input className={field} placeholder="Mobile number" inputMode="numeric" value={form.phone} maxLength={14} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
                  <input className={field} placeholder="Note for the shop (optional)" value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden="true" />
                  {cfg?.instructions && <p className="text-xs text-stone-500 dark:text-stone-400">{cfg.instructions}</p>}
                  {err && <p className="text-sm text-red-600">{err}</p>}
                </div>
                <div className="p-5 border-t border-stone-100 dark:border-stone-800 space-y-2">
                  <button type="button" onClick={submit} disabled={placing} className="w-full py-3 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: theme, color: onAccent(theme) }}>
                    {placing ? "Placing order…" : `Place pickup order · ${inr(total)}`}
                  </button>
                  <button type="button" onClick={() => setStep("cart")} className="w-full py-2 text-sm text-stone-500">Back</button>
                </div>
              </>
            )}

            {/* STEP: done */}
            {step === "done" && placed && (
              <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
                <p className="text-4xl">🎉</p>
                <p className="font-extrabold text-stone-900 dark:text-white text-lg">Order #{placed.order_no} sent to {placed.business?.name}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">The shop will accept it shortly. Show this code when you collect:</p>
                <div className="rounded-2xl py-5" style={{ backgroundColor: `${theme}15` }}>
                  <p className="font-mono text-5xl font-black tracking-[0.3em]" style={{ color: theme }}>{placed.pickup_code}</p>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Keep this code private. Pay at the counter when you collect.</p>
                <a href={`/order/${placed.token}`} className="block py-3 rounded-xl font-bold" style={{ backgroundColor: theme, color: onAccent(theme) }}>Track my order</a>
                <button type="button" onClick={closeDrawer} className="text-sm text-stone-500">Keep browsing</button>
              </div>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  );
}