import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Sparkles, X } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { foodService } from "../../../services/foodService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import EmptyState from "../../../components/common/EmptyState";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { FoodPage, FoodDot, Field, TextArea, Toggle, inr, errMsg, useFoodContext } from "./foodShared.jsx";

const EMPTY = {
  name: "", category_id: "", price: "", variants: [], food_type: "veg", spice_level: 0, tax_rate: "", description: "",
  image_url: "", show_on_website: true, is_bestseller: false, is_available: true, unit_id: "", recipe: [], prep_time_min: ""
};

export default function FoodMenu() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: ctx } = useFoodContext(vid);
  const unitInfo = ctx?.subtype?.unit;

  const [cats, setCats] = useState([]);
  const [items, setItems] = useState(null);
  const [ings, setIngs] = useState([]);
  const [units, setUnits] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vid) return;
    try {
      const [c, i, g, u] = await Promise.all([foodService.categories(vid), foodService.items(vid), foodService.ingredients(vid), foodService.units(vid)]);
      setCats(c.data.data); setItems(i.data.data); setIngs(g.data.data); setUnits(u.data.data);
    } catch (e) { showError(errMsg(e)); setItems([]); }
  }, [vid]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => { try { await fn(); if (ok) showSuccess(ok); load(); } catch (e) { showError(errMsg(e)); } };

  const grouped = useMemo(() => {
    const list = (items || []).filter((i) => (cat === "all" || (cat === "none" ? !i.category_id : i.category_id === cat)) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
    const groups = cats.map((c) => ({ id: c.id, name: c.name, items: list.filter((i) => i.category_id === c.id) }));
    groups.push({ id: "none", name: "Others", items: list.filter((i) => !i.category_id) });
    return groups.filter((g) => g.items.length > 0);
  }, [items, cats, cat, q]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...form, category_id: form.category_id || null, unit_id: form.unit_id || null, variants: form.variants.filter((v) => v.name) };
      if (form.id) await foodService.updateItem(vid, form.id, body); else await foodService.createItem(vid, body);
      showSuccess("Saved"); setForm(null); load();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const upload = async (file) => {
    if (!file || !form?.id) return;
    try { const r = await foodService.uploadPhoto(vid, form.id, file); setForm((f) => ({ ...f, image_url: r.data.data.image_url })); load(); showSuccess("Photo uploaded"); }
    catch (e) { showError(errMsg(e, "Could not upload the photo")); }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVariant = (i, k, v) => setForm((f) => ({ ...f, variants: f.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const setRecipe = (i, k, v) => setForm((f) => ({ ...f, recipe: f.recipe.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  if (!items) return <FoodPage title="Menu"><Loader /></FoodPage>;

  return (
    <FoodPage title="Menu" subtitle="What customers see on your website, QR menu and POS"
      actions={<Button onClick={() => setForm({ ...EMPTY, category_id: cat !== "all" && cat !== "none" ? cat : "" })}><Plus size={15} /> Add dish</Button>}>
      {items.length === 0 ? (
        <EmptyState icon={Sparkles} title="Start with a ready-made menu" description="We add popular dishes and categories. You only change the prices, and your online ordering is ready in minutes."
          action={<Button loading={busy} onClick={async () => { setBusy(true); await run(() => foodService.installStarter(vid), "Starter menu added"); setBusy(false); }}>Add starter menu</Button>} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dish" className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 items-center">
            {[["all", "All"], ...cats.map((c) => [c.id, c.name])].map(([id, name]) => (
              <span key={id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs whitespace-nowrap border ${cat === id ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`}>
                <button onClick={() => setCat(id)}>{name}</button>
                {id !== "all" && cat === id && (
                  <>
                    <button title="Rename" onClick={() => { const n = window.prompt("Category name", name); if (n) run(() => foodService.updateCategory(vid, id, { name: n })); }}><Pencil size={11} /></button>
                    <button title="Delete" onClick={() => { if (window.confirm("Delete this category? Its dishes move to Others.")) { setCat("all"); run(() => foodService.deleteCategory(vid, id)); } }}><X size={12} /></button>
                  </>
                )}
              </span>
            ))}
            <span className="flex items-center gap-1 ml-2">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="w-32 px-2 py-1 border border-gray-300 rounded-lg text-xs" />
              <button onClick={() => { if (newCat.trim()) run(async () => { await foodService.createCategory(vid, { name: newCat }); setNewCat(""); }); }} className="text-xs text-primary-600 font-medium">Add</button>
            </span>
          </div>

          {grouped.map((g) => (
            <div key={g.id} className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">{g.name}</p>
              <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
                {g.items.map((i) => (
                  <div key={i.id} className="px-4 py-3 flex items-center gap-3">
                    <FoodDot type={i.food_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{i.name} {i.is_bestseller && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 align-middle">Bestseller</span>}</p>
                      <p className="text-xs text-gray-500">
                        {i.variants?.length ? i.variants.map((v) => `${v.name} ${inr(v.price)}`).join(" · ") : inr(i.price)}
                        {i.food_cost_percent !== null && <span className={`ml-2 ${i.food_cost_percent > 40 ? "text-red-600" : "text-green-700"}`}>food cost {i.food_cost_percent}%</span>}
                      </p>
                    </div>
                    <button onClick={() => run(() => foodService.setAvailability(vid, i.id, !i.is_available))} title={i.is_available ? "Mark sold out" : "Back in stock"}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${i.is_available ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${i.is_available ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => setForm({ ...EMPTY, ...i, category_id: i.category_id || "", unit_id: i.unit_id || "", tax_rate: i.tax_rate ?? "", prep_time_min: i.prep_time_min ?? "", description: i.description || "", image_url: i.image_url || "" })} className="text-gray-500"><Pencil size={15} /></button>
                    <button onClick={() => setDel(i)} className="text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit dish" : "Add dish"} size="lg">
        {form && (
          <div className="space-y-3">
            <Input label="Dish name" value={form.name} onChange={setF("name")} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Category" value={form.category_id} onChange={setF("category_id")} options={[{ value: "", label: "Others" }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
              <Select label="Type" value={form.food_type} onChange={setF("food_type")} options={[{ value: "veg", label: "Veg" }, { value: "nonveg", label: "Non-veg" }, { value: "egg", label: "Egg" }]} />
            </div>
            {form.variants.length === 0 ? (
              <div className="flex items-end gap-3">
                <div className="flex-1"><Input label="Price (₹)" type="number" value={form.price} onChange={setF("price")} /></div>
                <Button variant="outline" onClick={() => setForm((f) => ({ ...f, variants: [{ name: "Half", price: "" }, { name: "Full", price: "" }] }))}>Add sizes (Half / Full)</Button>
              </div>
            ) : (
              <Field label="Sizes and prices">
                <div className="space-y-2">
                  {form.variants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Size name" value={v.name} onChange={(e) => setVariant(i, "name", e.target.value)} />
                      <input className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm" type="number" placeholder="₹" value={v.price} onChange={(e) => setVariant(i, "price", e.target.value)} />
                      <button onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))} className="text-red-500"><X size={16} /></button>
                    </div>
                  ))}
                  <button className="text-xs text-primary-600 font-medium" onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, { name: "", price: "" }] }))}>+ Add another size</button>
                </div>
              </Field>
            )}
            <TextArea rows={2} placeholder="Short description (optional)" value={form.description} onChange={setF("description")} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="GST % (blank = default)" type="number" value={form.tax_rate} onChange={setF("tax_rate")} />
              <Select label="Spice" value={form.spice_level} onChange={(e) => setForm((f) => ({ ...f, spice_level: Number(e.target.value) }))} options={[{ value: 0, label: "None" }, { value: 1, label: "Mild" }, { value: 2, label: "Medium" }, { value: 3, label: "Hot" }]} />
              <Input label="Prep time (min)" type="number" value={form.prep_time_min} onChange={setF("prep_time_min")} />
            </div>
            {unitInfo && <Select label={unitInfo.one} value={form.unit_id} onChange={setF("unit_id")} options={[{ value: "", label: `Not assigned` }, ...units.map((u) => ({ value: u.id, label: u.name }))]} />}

            <Field label="Photo">
              {form.id ? (
                <div className="flex items-center gap-3">
                  {form.image_url && <img src={form.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                  <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} className="text-sm" />
                </div>
              ) : <p className="text-xs text-gray-500">Save the dish first, then you can add a photo.</p>}
            </Field>

            <Field label="Recipe (per portion). Stock reduces automatically when an order completes">
              <div className="space-y-2">
                {form.recipe.map((r, i) => {
                  const ing = ings.find((x) => x.id === r.ingredient_id);
                  return (
                    <div key={i} className="flex gap-2 items-center">
                      <select className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm" value={r.ingredient_id} onChange={(e) => setRecipe(i, "ingredient_id", e.target.value)}>
                        <option value="">Choose ingredient</option>
                        {ings.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <input type="number" step="any" className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm" value={r.qty} onChange={(e) => setRecipe(i, "qty", e.target.value)} />
                      <span className="text-xs text-gray-500 w-8">{ing?.unit || ""}</span>
                      <button onClick={() => setForm((f) => ({ ...f, recipe: f.recipe.filter((_, j) => j !== i) }))} className="text-red-500"><X size={16} /></button>
                    </div>
                  );
                })}
                <button className="text-xs text-primary-600 font-medium" onClick={() => setForm((f) => ({ ...f, recipe: [...f.recipe, { ingredient_id: "", qty: "" }] }))}>+ Add ingredient</button>
                {ings.length === 0 && <p className="text-xs text-gray-400">Add ingredients in the Stock tab first.</p>}
              </div>
            </Field>

            <div className="border-t pt-2">
              <Toggle label="Show on website and QR menu" checked={form.show_on_website} onChange={(v) => setForm((f) => ({ ...f, show_on_website: v }))} />
              <Toggle label="Mark as bestseller" checked={form.is_bestseller} onChange={(v) => setForm((f) => ({ ...f, is_bestseller: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              <Button loading={busy} onClick={save}>Save dish</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} title="Delete dish?" message={`“${del?.name}” will be removed from your menu. Old bills are not affected.`} confirmText="Delete"
        onConfirm={() => { const id = del.id; setDel(null); run(() => foodService.deleteItem(vid, id), "Dish deleted"); }} />
    </FoodPage>
  );
}