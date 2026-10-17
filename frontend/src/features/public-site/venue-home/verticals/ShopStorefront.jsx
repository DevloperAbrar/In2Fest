import React, { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import { Reveal, SectionShell } from "../SectionShell.jsx";
import { inr, waLink } from "../../../../lib/verticals";

// Categories are stored as "Men" or "Men > Shirts"
const splitCategory = (value) => {
  const [top = "", sub = ""] = String(value || "").split(">").map((p) => p.trim());
  return { top, sub };
};

export default function ShopStorefront({ config, theme, toneIdx, venue }) {
  const items = venue.catalog_items || [];
  const [q, setQ] = useState("");
  const [top, setTop] = useState("All");
  const [sub, setSub] = useState("All");
  const [sort, setSort] = useState("relevant");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onOffer, setOnOffer] = useState(false);
  const [pick, setPick] = useState({}); // product id -> selected size
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [custName, setCustName] = useState("");

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
    return Array.from(
      new Set(items.map((i) => splitCategory(i.category)).filter((c) => c.top === top && c.sub).map((c) => c.sub))
    );
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
  const changeQty = (key, d) =>
    setCart((c) => c.map((x) => (x.key === key ? { ...x, qty: Math.max(1, x.qty + d) } : x)));
  const removeLine = (key) => setCart((c) => c.filter((x) => x.key !== key));

  const count = cart.reduce((s, x) => s + x.qty, 0);
  const total = cart.reduce((s, x) => s + x.qty * x.price, 0);

  const orderText = () => {
    const lines = cart.map(
      (x, i) => `${i + 1}. ${x.title}${x.size ? ` (Size: ${x.size})` : ""} x${x.qty} - ${inr(x.price * x.qty)}`
    );
    return [
      `Hi ${venue.hall_name}, I'd like to order:`,
      ...lines,
      `Total: ${inr(total)}`,
      custName ? `Name: ${custName}` : "",
      "Please confirm availability and delivery/pickup."
    ].filter(Boolean).join("\n");
  };
  const orderLink = waLink(venue, orderText());

  const chip = (active) =>
    active
      ? { backgroundColor: theme, borderColor: theme, color: "#fff" }
      : { borderColor: `${theme}40`, color: theme };

  return (
    <SectionShell title={config?.title || "Shop Our Collection"} toneIdx={toneIdx} theme={theme} subtitle="Shop">
      {/* Category tiles */}
      {categories.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-3 mb-6 -mx-2 px-2">
          {[{ name: "All", count: items.length, image: "" }, ...categories].map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => { setTop(c.name); setSub("All"); }}
              className="shrink-0 w-24 text-center group"
            >
              <span
                className="block w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all group-hover:-translate-y-1"
                style={{ borderColor: top === c.name ? theme : "transparent", backgroundColor: `${theme}15` }}
              >
                {c.image ? (
                  <img src={c.image} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-2xl font-extrabold" style={{ color: theme }}>
                    {c.name[0]}
                  </span>
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
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands..."
            className="w-full pl-11 pr-4 py-3 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-3 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-white"
        >
          <option value="relevant">Sort: Featured</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
          <option value="discount">Biggest discount</option>
        </select>
        <button type="button" onClick={() => setInStockOnly((v) => !v)} className="px-4 py-2.5 rounded-full text-sm font-semibold border" style={chip(inStockOnly)}>In stock</button>
        <button type="button" onClick={() => setOnOffer((v) => !v)} className="px-4 py-2.5 rounded-full text-sm font-semibold border" style={chip(onOffer)}>On offer</button>
      </div>

      {subs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {["All", ...subs].map((s) => (
            <button key={s} type="button" onClick={() => setSub(s)} className="px-3 py-1 rounded-full text-xs font-semibold border" style={chip(sub === s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-400 mb-4">{visible.length} product{visible.length === 1 ? "" : "s"}</p>

      {visible.length === 0 && (
        <p className="text-center py-16 text-stone-400">Nothing matched. Try another search or message us on WhatsApp.</p>
      )}

      {/* Product grid */}
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
                  {soldOut && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">Out of stock</span>}
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
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPick((p) => ({ ...p, [it.id]: s }))}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border"
                          style={chip(pick[it.id] === s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addToCart(it)}
                    className="mt-auto pt-0 w-full"
                  >
                    <span
                      className="mt-3 block py-2 rounded-xl text-xs font-bold text-white transition-opacity"
                      style={{ backgroundColor: theme, opacity: canAdd ? 1 : 0.4 }}
                    >
                      {soldOut ? "Unavailable" : needsSize && !pick[it.id] ? "Select a size" : "Add to order"}
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
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-40 flex items-center gap-3 px-6 py-3 rounded-full text-white font-bold shadow-2xl"
          style={{ backgroundColor: theme }}
        >
          <ShoppingBag size={18} /> {count} item{count > 1 ? "s" : ""} · {inr(total)} · View order
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setCartOpen(false)}>
          <div
            className="w-full max-w-md h-full bg-white dark:bg-stone-900 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-extrabold text-lg text-stone-900 dark:text-white">Your order ({count})</h3>
              <button type="button" onClick={() => setCartOpen(false)} className="text-stone-400"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 && <p className="text-center text-stone-400 py-10">Your order is empty.</p>}
              {cart.map((x) => (
                <div key={x.key} className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">
                    {x.image && <img src={x.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">{x.title}</p>
                    {x.size && <p className="text-xs text-stone-400">Size: {x.size}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" onClick={() => changeQty(x.key, -1)} className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300"><Minus size={12} /></button>
                      <span className="text-sm font-bold text-stone-900 dark:text-white w-5 text-center">{x.qty}</span>
                      <button type="button" onClick={() => changeQty(x.key, 1)} className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300"><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: theme }}>{inr(x.price * x.qty)}</p>
                    <button type="button" onClick={() => removeLine(x.key)} className="mt-2 text-stone-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-stone-100 dark:border-stone-800 space-y-3">
                <input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-900 dark:text-white"
                />
                <div className="flex justify-between font-extrabold text-stone-900 dark:text-white">
                  <span>Total</span><span>{inr(total)}</span>
                </div>
                {orderLink ? (
                  <a href={orderLink} target="_blank" rel="noopener noreferrer" className="block text-center py-3 rounded-xl bg-green-600 text-white font-bold">
                    Send order on WhatsApp
                  </a>
                ) : (
                  <p className="text-xs text-center text-stone-400">This shop has no WhatsApp number yet. Please use the enquiry form below.</p>
                )}
                <p className="text-[11px] text-center text-stone-400">The shop will confirm availability and payment on WhatsApp.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  );
}