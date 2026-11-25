import React from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle, AlertTriangle, Sparkles, CheckCircle2, Plus, Repeat } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { showSuccess, showError } from "../../../components/common/Toast";
import { expenseService } from "../../../services/expenseService";
import { Panel, inr, errMsg, fmtDate, shiftMonth, monthName, todayISO, compact } from "./expenseShared.jsx";

const LEVEL = {
  critical: { icon: AlertCircle, box: "bg-red-50 border-red-200", ic: "text-red-600" },
  warning: { icon: AlertTriangle, box: "bg-amber-50 border-amber-200", ic: "text-amber-600" },
  tip: { icon: Sparkles, box: "bg-violet-50 border-violet-200", ic: "text-violet-600" },
  good: { icon: CheckCircle2, box: "bg-emerald-50 border-emerald-200", ic: "text-emerald-600" }
};

function Delta({ value, goodWhenUp = true }) {
  if (value == null) return null;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11.5px] font-medium ${good ? "text-emerald-600" : "text-red-600"}`}>
      <Icon size={13} />{Math.abs(Math.round(value))}% vs last month
    </span>
  );
}

function Stat({ label, value, tone, children }) {
  return (
    <Panel className="p-4">
      <p className="text-[12px] text-navy-400 font-medium">{label}</p>
      <p className={`font-display text-2xl font-bold mt-0.5 tabular-nums ${tone}`}>{value}</p>
      <div className="mt-1 min-h-[16px]">{children}</div>
    </Panel>
  );
}

function BreakdownRow({ row, showBudget }) {
  const over = row.budget_used != null && row.budget_used >= 100;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
          <span className="truncate text-navy-800">{row.label}</span>
          {row.auto && <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-500 shrink-0">Auto</span>}
        </span>
        <span className="tabular-nums font-semibold text-navy-900 shrink-0">{inr(row.amount)} <span className="text-navy-400 font-normal text-[12px]">{Math.round(row.share)}%</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-navy-100 mt-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(row.share, 100)}%`, background: row.color }} />
      </div>
      {showBudget && row.budget ? (
        <p className={`text-[11.5px] mt-1 ${over ? "text-red-600" : "text-navy-400"}`}>
          Budget {inr(row.budget)} · {Math.round(row.budget_used)}% used
        </p>
      ) : null}
    </div>
  );
}

export default function ExpenseOverview({ vid, month, setMonth, refreshKey, onAdd, onGoTab, onManageCategories, onChanged }) {
  const { data, loading, error } = useFetch(vid ? `/venues/${vid}/expenses/overview?month=${month}` : null, { skip: !vid, deps: [refreshKey] });
  const canNext = month < todayISO().slice(0, 7);

  const markPaid = async (id) => {
    try {
      await expenseService.payEntry(vid, id, {});
      showSuccess("Marked as paid");
      onChanged?.();
    } catch (e) {
      showError(errMsg(e, "Could not mark as paid"));
    }
  };

  const onAction = (a) => {
    if (a === "bills") onGoTab("transactions", { status: "due" });
    else if (a === "recurring") onGoTab("recurring");
    else if (a === "budgets") onManageCategories();
  };

  const switcher = (
    <div className="flex items-center justify-center gap-2 mb-4">
      <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-lg hover:bg-navy-50 text-navy-600"><ChevronLeft size={18} /></button>
      <span className="font-display font-semibold text-navy-900 min-w-[150px] text-center">{monthName(month)}</span>
      <button type="button" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-lg hover:bg-navy-50 text-navy-600 disabled:opacity-30"><ChevronRight size={18} /></button>
    </div>
  );

  if (loading && !data) return <>{switcher}<Loader /></>;
  if (error && !data) return <>{switcher}<Panel className="p-8 text-center text-sm text-red-600">{error}</Panel></>;
  if (!data) return switcher;

  const { kpis, metrics, trend, income_breakdown, expense_breakdown, bills, insights, auto } = data;
  const autoLabels = [...auto.income, ...auto.expense].map((a) => a.label);

  if (!data.has_data) {
    return (
      <>
        {switcher}
        <Panel className="p-8 text-center">
          <h3 className="font-display text-lg font-bold text-navy-900">Know your real profit</h3>
          <p className="text-sm text-navy-500 mt-1 max-w-md mx-auto">
            {autoLabels.length ? `${autoLabels.join(", ")} are picked up automatically. ` : ""}
            Add what you spend and we show profit, trends and where to save.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <Button onClick={() => onAdd("expense")}><Plus size={16} />Add first expense</Button>
            <Button variant="outline" onClick={() => onGoTab("recurring")}><Repeat size={16} />Set up rent & salaries</Button>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      {switcher}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Income" value={inr(kpis.income)} tone="text-emerald-600"><Delta value={kpis.income_change} /></Stat>
        <Stat label="Expenses" value={inr(kpis.expense)} tone="text-red-600"><Delta value={kpis.expense_change} goodWhenUp={false} /></Stat>
        <Stat label={kpis.profit >= 0 ? "Net profit" : "Net loss"} value={inr(Math.abs(kpis.profit))} tone={kpis.profit >= 0 ? "text-navy-900" : "text-red-600"}>
          {kpis.margin != null && <span className="text-[11.5px] text-navy-400">{Math.round(kpis.margin)}% margin</span>}
        </Stat>
      </div>

      {(metrics.projection || metrics.break_even) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-navy-500 mb-4 px-1">
          {metrics.projection && (
            <span>Month-end at this pace: <b className={metrics.projection.profit >= 0 ? "text-emerald-600" : "text-red-600"}>{metrics.projection.profit >= 0 ? "+" : "-"}{inr(metrics.projection.profit)}</b></span>
          )}
          {metrics.break_even && <span>Break-even income: <b className="text-navy-800">{inr(metrics.break_even)}/month</b></span>}
          <span>Daily spend: <b className="text-navy-800">{inr(metrics.daily_burn)}</b></span>
        </div>
      )}

      {insights.length > 0 && (
        <Panel className="p-4 mb-4">
          <h3 className="font-display font-semibold text-navy-800 text-[15px] mb-3">Business health check</h3>
          <div className="space-y-2">
            {insights.map((i) => {
              const L = LEVEL[i.level] || LEVEL.tip;
              return (
                <div key={i.id} className={`flex gap-3 p-3 rounded-xl border ${L.box}`}>
                  <L.icon size={18} className={`${L.ic} shrink-0 mt-0.5`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy-900">{i.title}</p>
                    <p className="text-[12.5px] text-navy-600 mt-0.5">{i.detail}</p>
                  </div>
                  {i.action && (
                    <button type="button" onClick={() => onAction(i.action)} className="text-[12.5px] font-medium text-primary-700 hover:underline shrink-0 self-center">
                      {i.action === "bills" ? "View bills" : i.action === "recurring" ? "Set up" : "Budgets"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel className="p-4 mb-4">
        <h3 className="font-display font-semibold text-navy-800 text-[15px] mb-3">Last 6 months</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e5ec" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={compact} />
              <Tooltip formatter={(v, n) => [inr(v), n]} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line dataKey="profit" name="Profit" stroke="#1a2035" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-navy-800 text-[15px]">Where money went</h3>
            <button type="button" onClick={onManageCategories} className="text-[12.5px] text-primary-700 hover:underline">Categories & budgets</button>
          </div>
          {expense_breakdown.length === 0 ? <p className="text-sm text-navy-400">No expenses this month.</p> : (
            <div className="space-y-3.5">{expense_breakdown.map((r) => <BreakdownRow key={r.id} row={r} showBudget />)}</div>
          )}
        </Panel>

        <Panel className="p-4">
          <h3 className="font-display font-semibold text-navy-800 text-[15px] mb-3">Where money came from</h3>
          {income_breakdown.length === 0 ? <p className="text-sm text-navy-400">No income this month.</p> : (
            <div className="space-y-3.5">{income_breakdown.map((r) => <BreakdownRow key={r.id} row={r} />)}</div>
          )}
          {autoLabels.length > 0 && (
            <p className="text-[11.5px] text-navy-400 mt-4">Tracked automatically from your app: {autoLabels.join(", ")}.</p>
          )}
        </Panel>
      </div>

      {bills.items.length > 0 && (
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-navy-800 text-[15px]">Bills to pay</h3>
            <span className="text-[12.5px] text-navy-500">Total {inr(bills.totalDue)}</span>
          </div>
          <div className="space-y-2">
            {bills.items.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-navy-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-900 truncate">{b.label}{b.vendor_name ? ` · ${b.vendor_name}` : ""}</p>
                  <p className={`text-[12px] ${b.overdue ? "text-red-600 font-medium" : "text-navy-400"}`}>{b.overdue ? "Overdue since " : "Due "}{fmtDate(b.date)}</p>
                </div>
                <b className="tabular-nums text-navy-900">{inr(b.amount)}</b>
                <Button variant="outline" onClick={() => markPaid(b.id)}>Mark paid</Button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}