import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import ExpenseOverview from "./ExpenseOverview.jsx";
import ExpenseTransactions from "./ExpenseTransactions.jsx";
import ExpenseRecurring from "./ExpenseRecurring.jsx";
import ExpenseFormModal from "./ExpenseFormModal.jsx";
import CategoryManager from "./CategoryManager.jsx";
import { useExpenses, todayISO } from "./expenseShared.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "transactions", label: "Transactions" },
  { key: "recurring", label: "Recurring" }
];

export default function ExpensesPage() {
  const { vid, meta, categories, categoryOf, loading, refetchMeta } = useExpenses();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "overview";
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [refreshKey, setRefreshKey] = useState(0);
  const [preset, setPreset] = useState(null);
  const [form, setForm] = useState({ open: false, entry: null, type: "expense" });
  const [catOpen, setCatOpen] = useState(false);

  const changed = () => setRefreshKey((k) => k + 1);
  const goTab = (key, p = null) => {
    setPreset(p);
    setParams(key === "overview" ? {} : { tab: key }, { replace: true });
  };
  const openAdd = (type = "expense") => setForm({ open: true, entry: null, type });

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Expenses">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-navy-900">Expenses & Profit</h1>
          <p className="text-[13px] text-navy-400 mt-0.5">Track every rupee in and out, and see how your business is really doing</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setCatOpen(true)}>Categories</Button>
          <Button onClick={() => openAdd("expense")}><Plus size={16} />Add</Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-navy-50 rounded-xl mb-5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => goTab(t.key)}
            className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-white shadow-sm text-navy-900" : "text-navy-400 hover:text-navy-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && !meta ? <Loader /> : (
        <>
          {tab === "overview" && (
            <ExpenseOverview
              vid={vid} month={month} setMonth={setMonth} refreshKey={refreshKey}
              onAdd={openAdd} onGoTab={goTab} onManageCategories={() => setCatOpen(true)} onChanged={changed}
            />
          )}
          {tab === "transactions" && (
            <ExpenseTransactions
              key={preset?.status || "all"} vid={vid} categories={categories} categoryOf={categoryOf} preset={preset}
              refreshKey={refreshKey} onEdit={(entry) => setForm({ open: true, entry, type: entry.type })} onChanged={changed}
            />
          )}
          {tab === "recurring" && (
            <ExpenseRecurring vid={vid} categories={categories} categoryOf={categoryOf} refreshKey={refreshKey} onChanged={changed} />
          )}
        </>
      )}

      <ExpenseFormModal
        isOpen={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))}
        vid={vid} categories={categories} entry={form.entry} defaultType={form.type} hints={meta?.hints} onSaved={changed}
      />
      <CategoryManager
        isOpen={catOpen} onClose={() => setCatOpen(false)} vid={vid} categories={categories}
        onChanged={() => { refetchMeta(); changed(); }}
      />
    </DashboardLayout>
  );
}