import React, { useEffect, useMemo, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { useFetch } from "../../../../hooks/useFetch";
import { SectionShell } from "../SectionShell.jsx";
import { inr } from "../../../../lib/verticals";

const PAGE = 12; // products shown per step
const TOP_CATS = 8; // category chips shown in the scroll row

function Card({ p, theme, wa, onOpen }) {
  const [vi, setVi] = useState(() => Math.max(p.variants.findIndex((v) => v.in_stock), 0));
  const v = p.variants[vi];
  const text = `Hi, I'm interested in ${p.name} (${v.label}) at ${inr(v.price)}. Is it available?`;
  return (
    <div className={`rounded-2xl sm:rounded-3xl border border-stone-100 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col ${v.in_stock ? "" : "opacity-75"}`}>
      <button type="button" onClick={onOpen} className="relative block h-32 sm:h-44 bg-stone-100 dark:bg-stone-900 overflow-hidden">
        {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-contain p-3" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-stone-300">{p.name[0]}</div>}
        {!v.in_stock && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">Out of stock</span>}
        {v.in_stock && v.discount_percent > 0 && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{v.discount_percent}% OFF</span>}
        {p.offer_label && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold">{p.offer_label}</span>}
      </button>
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        {p.brand && <p className="text-[11px] uppercase tracking-wide text-stone-400 truncate">{p.brand}</p>}
        <button type="button" onClick={onOpen} className="text-left font-bold text-stone-900 dark:text-white text-sm leading-snug line-clamp-2">{p.name}</button>
        {p.variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.variants.map((x, i) => (
              <button key={x.id} type="button" onClick={() => setVi(i)} disabled={!x.in_stock}
                className={`px-2 py-0.5 rounded-full text-[11px] border ${x.in_stock ? "" : "line-through opacity-40"}`}
                style={i === vi ? { backgroundColor: theme, borderColor: theme, color: "#fff" } : { borderColor: `${theme}55`, color: theme }}>{x.label}</button>
            ))}
          </div>
        )}
        <p className="font-extrabold mt-2 text-base sm:text-lg" style={{ color: theme }}>{inr(v.price)}{v.mrp && <span className="ml-2 text-xs font-normal text-stone-400 line-through">{inr(v.mrp)}</span>}</p>
        {v.low_stock && <p className="text-[11px] font-semibold text-amber-600">Only a few left</p>}
        {wa && (
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
            className="mt-auto pt-3 text-xs font-bold hover:underline" style={{ color: theme }}>Enquire on WhatsApp →</a>
        )}
      </div>
    </div>
  );
}

function Detail({ p, theme, wa, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-3">
          <div>{p.brand && <p className="text-xs uppercase tracking-wide text-stone-400">{p.brand}</p>}<h3 className="text-xl font-extrabold text-stone-900 dark:text-white">{p.name}</h3></div>
          <button onClick={onClose} className="p-1 text-stone-400"><X size={20} /></button>
        </div>
        <div className="flex gap-2 overflow-x-auto my-4">
          {[p.image_url, ...(p.gallery || [])].filter(Boolean).map((u) => <img key={u} src={u} alt="" className="h-48 rounded-2xl bg-stone-100 object-contain" />)}
        </div>
        {p.description && <p className="text-sm text-stone-600 dark:text-stone-300 whitespace-pre-line">{p.description}</p>}
        {p.highlights?.length > 0 && <ul className="mt-3 space-y-1.5">{p.highlights.map((h) => <li key={h} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2"><span style={{ color: theme }}>✓</span>{h}</li>)}</ul>}
        <div className="mt-4 space-y-1.5">
          {p.variants.map((v) => (
            <div key={v.id} className="flex justify-between text-sm border-b border-stone-100 dark:border-stone-700 py-1.5">
              <span className="text-stone-700 dark:text-stone-200">{v.label}{!v.in_stock && <span className="ml-2 text-xs text-red-500">Out of stock</span>}</span>
              <span className="font-bold" style={{ color: theme }}>{inr(v.price)}{v.mrp && <span className="ml-2 text-xs font-normal text-stone-400 line-through">{inr(v.mrp)}</span>}</span>
            </div>
          ))}
        </div>
        {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I'm interested in ${p.name}. Is it available?`)}`} target="_blank" rel="noopener noreferrer" className="mt-5 block text-center py-3 rounded-xl font-bold text-white" style={{ backgroundColor: theme }}>Ask on WhatsApp</a>}
      </div>
    </div>
  );
}

// Popup with every category and a search box, so 80+ categories never take over the page.
function CategorySheet({ cats, total, cat, theme, onPick, onClose }) {
  const [term, setTerm] = useState("");
  const n = term.trim().toLowerCase();
  const shown = n ? cats.filter((c) => c.name.toLowerCase().includes(n)) : cats;
  const row = (id, name, count) => {
    const on = cat === id;
    return (
      <button key={id} type="button" onClick={() => onPick(id)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-left ${on ? "font-bold text-white" : "text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
        style={on ? { backgroundColor: theme } : undefined}>
        <span className="truncate">{name}</span>
        <span className={`text-xs ${on ? "text-white/80" : "text-stone-400"}`}>{count}</span>
      </button>
    );
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-lg font-extrabold text-stone-900 dark:text-white">All categories</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-stone-400"><X size={20} /></button>
        </div>
        <div className="px-5 pb-3 relative">
          <Search size={16} className="absolute left-8 top-1/2 -translate-y-[70%] text-stone-400" />
          <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search category"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white" />
        </div>
        <div className="overflow-y-auto px-3 pb-5 space-y-0.5">
          {!n && row("all", "All products", total)}
          {shown.map((c) => row(c.id, c.name, c.count))}
          {n && shown.length === 0 && <p className="text-center text-sm text-stone-400 py-6">No category found.</p>}
        </div>
      </div>
    </div>
  );
}

export default function GymSupplements({ config, theme, toneIdx, venue }) {
  const { data } = useFetch(venue?.id ? `/public/gym/${venue.id}/store` : null, { deps: [venue?.id] });
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [open, setOpen] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const raw = String(venue?.whatsapp_number || venue?.phone || "").replace(/\D/g, "");
  const wa = raw.length === 10 ? `91${raw}` : raw;

  // Only categories that have products, biggest first.
  const cats = useMemo(
    () => [...(data?.categories || [])].filter((c) => (c.count ?? 1) > 0).sort((a, b) => (b.count || 0) - (a.count || 0)),
    [data]
  );
  const topCats = useMemo(() => {
    const top = cats.slice(0, TOP_CATS);
    const picked = cats.find((c) => c.id === cat);
    return picked && !top.some((c) => c.id === cat) ? [picked, ...top] : top;
  }, [cats, cat]);

  const list = useMemo(() => {
    if (!data?.products) return [];
    const n = q.trim().toLowerCase();
    const out = data.products.filter((p) => (cat === "all" || p.category_id === cat) && (!n || `${p.name} ${p.brand || ""}`.toLowerCase().includes(n)));
    if (sort === "low") out.sort((a, b) => a.min_price - b.min_price);
    if (sort === "high") out.sort((a, b) => b.min_price - a.min_price);
    if (sort === "discount") out.sort((a, b) => b.best_discount - a.best_discount);
    return out;
  }, [data, cat, q, sort]);

  // Start from the first page again whenever the filters change.
  useEffect(() => { setShown(PAGE); }, [cat, q, sort]);

  if (!data?.enabled) return null;
  const featured = data.products.filter((p) => p.is_featured && p.in_stock).slice(0, 4);
  const chip = (on) => (on ? { backgroundColor: theme, borderColor: theme, color: "#fff" } : { borderColor: `${theme}40`, color: theme });
  const filtered = cat !== "all" || !!q.trim();
  const clear = () => { setCat("all"); setQ(""); };
  const pick = (id) => { setCat(id); setSheet(false); };
  const visible = list.slice(0, shown);

  return (
    <SectionShell title={config?.title || "Gym Supplements"} toneIdx={toneIdx} theme={theme} subtitle={data.tagline || "Shop at the gym"}>
      {featured.length > 0 && !filtered && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 text-center">Best sellers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">{featured.map((p) => <Card key={p.id} p={p} theme={theme} wa={wa} onOpen={() => setOpen(p)} />)}</div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={() => setCat("all")} className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap" style={chip(cat === "all")}>All ({data.products.length})</button>
          {topCats.map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap" style={chip(cat === c.id)}>{c.name} ({c.count})</button>
          ))}
        </div>
        {cats.length > TOP_CATS && (
          <button type="button" onClick={() => setSheet(true)} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border bg-white dark:bg-stone-900" style={{ borderColor: theme, color: theme }}>
            All categories ({cats.length}) <ChevronDown size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 max-w-2xl mx-auto mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supplements" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-700 dark:text-white">
          <option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="discount">Biggest discount</option>
        </select>
      </div>

      <div className="flex items-center justify-between mb-3 text-xs text-stone-500">
        <span>{list.length} product{list.length === 1 ? "" : "s"}{cat !== "all" && cats.find((c) => c.id === cat) ? ` in ${cats.find((c) => c.id === cat).name}` : ""}</span>
        {filtered && <button type="button" onClick={clear} className="font-semibold hover:underline" style={{ color: theme }}>Clear filters</button>}
      </div>

      {list.length === 0 ? <p className="text-center text-sm text-stone-400 py-8">No products found.</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {visible.map((p) => <Card key={p.id} p={p} theme={theme} wa={wa} onOpen={() => setOpen(p)} />)}
          </div>
          {list.length > shown && (
            <div className="text-center mt-6">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-6 py-2.5 rounded-full text-sm font-bold border" style={{ borderColor: theme, color: theme }}>
                Show more ({list.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}

      {sheet && <CategorySheet cats={cats} total={data.products.length} cat={cat} theme={theme} onPick={pick} onClose={() => setSheet(false)} />}
      {open && <Detail p={open} theme={theme} wa={wa} onClose={() => setOpen(null)} />}
    </SectionShell>
  );
}