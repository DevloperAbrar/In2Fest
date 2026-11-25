// Rule-based business-health engine. Pure functions: no database, easy to test.
// Input months[] (chronological, last = selected month): { month, label, income, expense, byCat:{id:amount}, byGroup:{group:amount} }
const { THRESHOLDS, MIN_MARGIN } = require("../../config/expenseCategories");

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const inr = (n) => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString("en-IN")}`;
const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
const LEVEL_ORDER = { critical: 0, warning: 1, tip: 2, good: 3 };

// Break-even: fixed = everything except direct (cogs) cost and one-time (capex).
// Contribution-margin form:  break-even income = fixed / (1 - cogs / income).
const FIXED_GROUPS = ["people", "fixed", "growth", "operations", "other"];

function metricsFor({ months, isCurrent, dayOfMonth, daysInMonth }) {
  const cur = months[months.length - 1];
  const history = months.slice(0, -1).filter((m) => m.income > 0 || m.expense > 0).slice(-3);
  const base = history.length ? history : [cur];

  const fixedAvg = avg(base.map((m) => FIXED_GROUPS.reduce((s, g) => s + (m.byGroup[g] || 0), 0)));
  const incomeAvg = avg(base.map((m) => m.income));
  const cogsAvg = avg(base.map((m) => m.byGroup.cogs || 0));
  const variableRatio = incomeAvg > 0 ? cogsAvg / incomeAvg : 0;
  const breakEven = fixedAvg > 0 && variableRatio < 0.95 ? r2(fixedAvg / (1 - variableRatio)) : null;

  let projection = null;
  if (isCurrent && dayOfMonth >= 5) {
    const f = daysInMonth / dayOfMonth;
    projection = {
      income: r2(cur.income * f),
      expense: r2(cur.expense * f),
      profit: r2((cur.income - cur.expense) * f),
      confidence: dayOfMonth >= 15 ? "medium" : "low"
    };
  }

  const daysElapsed = isCurrent ? Math.max(dayOfMonth, 1) : daysInMonth;
  return { break_even: breakEven, projection, daily_burn: r2(cur.expense / daysElapsed) };
}

function insightsFor(ctx, metrics) {
  const { months, kind, isCurrent, dayOfMonth, catMeta, bills } = ctx;
  const cur = months[months.length - 1];
  const prev = months.length > 1 ? months[months.length - 2] : null;
  const history = months.slice(0, -1);
  const confident = !isCurrent || dayOfMonth >= 10; // early in the month, income and costs are lumpy: avoid false alarms
  const { income, expense } = cur;
  const profit = income - expense;
  const margin = pct(profit, income);
  const out = [];
  const add = (level, id, title, detail, action) => out.push({ level, id, title, detail, action: action || null });
  const metaOf = (id) => catMeta.get(id) || { label: id, group: "other", budget: null };

  // 1. Bills
  if (bills.overdueCount > 0) {
    add("critical", "bills_overdue", `${bills.overdueCount} bill${bills.overdueCount > 1 ? "s are" : " is"} overdue`,
      `${inr(bills.overdueTotal)} is past its due date. Pay or reschedule it to avoid late fees.`, "bills");
  } else if (bills.soonCount > 0) {
    add("warning", "bills_soon", `${bills.soonCount} bill${bills.soonCount > 1 ? "s" : ""} due in 7 days`,
      `${inr(bills.soonTotal)} will need to go out this week. Keep cash ready.`, "bills");
  }

  // 2. Nothing recorded yet
  if (income === 0 && expense === 0) {
    add("tip", "get_started", "Start with your fixed costs",
      "Add rent, salaries and electricity once as Recurring entries. They post themselves every month, so your profit stays up to date.", "recurring");
    return out;
  }

  if (income === 0 && expense > 0 && confident) {
    add("warning", "no_income", "No income recorded this month",
      "Income from fees, sales or bookings is picked up automatically. If you earned money outside the app, add it as Income.");
  }

  // 3. Profit health
  if (confident && income > 0) {
    if (profit < 0) {
      add("critical", "loss", `Running at a loss of ${inr(profit)}`,
        `Expenses are ${Math.round(pct(expense, income))}% of income. Check the biggest categories below first.`);
    } else {
      const floor = MIN_MARGIN[kind] != null ? MIN_MARGIN[kind] : MIN_MARGIN.default;
      if (margin < floor) {
        add("warning", "thin_margin", `Profit margin is only ${Math.round(margin)}%`,
          `A healthy target for your business type is ${floor}% or more. One bad month could push you into loss.`);
      }
    }
  }

  // 4. Cost ratios against guide thresholds (top 3 offenders)
  if (confident && income > 0) {
    const hits = [];
    (THRESHOLDS[kind] || THRESHOLDS.general).forEach((t) => {
      const spent = Object.entries(cur.byCat).reduce((s, [id, a]) => {
        const g = metaOf(id).group;
        const hit = (t.keys && !id.startsWith("auto:") && t.keys.includes(id)) || (t.groups && t.groups.includes(g));
        return s + (hit ? a : 0);
      }, 0);
      const ratio = pct(spent, income);
      if (ratio > t.max) hits.push({ t, spent, ratio });
    });
    hits.sort((a, b) => b.ratio / b.t.max - a.ratio / a.t.max).slice(0, 3).forEach(({ t, spent, ratio }) => {
      const over = spent - (income * t.max) / 100;
      add(ratio > t.max * 1.5 ? "critical" : "warning", `ratio_${t.id}`,
        `${t.label} is ${Math.round(ratio)}% of income`,
        `Guide is ${t.max}% or less. Trimming about ${inr(over)} a month, or growing income, brings it back in range.`, "budgets");
    });
  }

  // 5. Category spikes vs. the last 3 active months (one-time capex excluded)
  const past = history.filter((m) => m.income > 0 || m.expense > 0).slice(-3);
  if (past.length >= 2) {
    Object.entries(cur.byCat)
      .map(([id, spent]) => {
        const base = avg(past.map((m) => m.byCat[id] || 0));
        return { id, spent, base };
      })
      .filter(({ id, spent, base }) => metaOf(id).group !== "capex" && base > 0 && spent > base * 1.5 && spent - base >= Math.max(1000, income * 0.03))
      .sort((a, b) => b.spent - b.base - (a.spent - a.base))
      .slice(0, 3)
      .forEach(({ id, spent, base }) => {
        add("warning", `spike_${id}`, `${metaOf(id).label} is up ${Math.round((spent / base - 1) * 100)}% on your usual`,
          `${inr(spent)} this month vs about ${inr(base)} on average. Check for a one-off, a price rise or a billing error.`);
      });
  }

  // 6. Costs growing faster than income (needs 4 complete months)
  const complete = (isCurrent ? history : months).slice(-4);
  if (complete.length === 4 && complete.every((m) => m.income > 0)) {
    const inc = [avg([complete[0].income, complete[1].income]), avg([complete[2].income, complete[3].income])];
    const exp = [avg([complete[0].expense, complete[1].expense]), avg([complete[2].expense, complete[3].expense])];
    const incG = exp[0] >= 0 && inc[0] > 0 ? ((inc[1] - inc[0]) / inc[0]) * 100 : 0;
    const expG = exp[0] > 0 ? ((exp[1] - exp[0]) / exp[0]) * 100 : 0;
    if (expG > 10 && expG - incG > 10) {
      add("warning", "costs_outpacing", "Expenses are growing faster than income",
        `Over the last 4 months costs rose about ${Math.round(expG)}% while income moved ${Math.round(incG)}%. Margin will keep shrinking at this rate.`);
    }
  }

  // 7. Budgets
  catMeta.forEach((meta, id) => {
    if (!meta.budget || meta.budget <= 0 || id.startsWith("auto:")) return;
    const spent = cur.byCat[id] || 0;
    const used = pct(spent, meta.budget);
    if (used >= 100) add("critical", `budget_${id}`, `${meta.label} is over budget`, `${inr(spent)} spent against a ${inr(meta.budget)} budget (${Math.round(used)}%).`, "budgets");
    else if (used >= 80) add("warning", `budget_${id}`, `${meta.label} has used ${Math.round(used)}% of its budget`, `${inr(meta.budget - spent)} left for the month.`, "budgets");
  });

  // 8. Hygiene tips
  const otherAmt = cur.byCat.other || 0;
  if (expense >= 3000 && pct(otherAmt, expense) > 15) {
    add("tip", "too_much_other", `"Other" is ${Math.round(pct(otherAmt, expense))}% of your expenses`,
      "Move these into proper categories so you can see where money really goes.");
  }
  const top = Object.entries(cur.byCat).filter(([id]) => metaOf(id).group !== "capex").sort((a, b) => b[1] - a[1])[0];
  if (top && expense >= 5000 && pct(top[1], expense) > 50) {
    add("tip", "concentration", `${metaOf(top[0]).label} is ${Math.round(pct(top[1], expense))}% of your costs`,
      "One cost line drives most of your spending. Renegotiating it, or growing income to dilute it, has the biggest effect on profit.");
  }

  // 9. Break-even and month-end pace
  const incomeRef = isCurrent && metrics.projection ? metrics.projection.income : income;
  if (metrics.break_even && incomeRef > 0 && (confident || metrics.projection) && incomeRef < metrics.break_even) {
    add("warning", "below_break_even", `Break-even is about ${inr(metrics.break_even)} a month`,
      `${isCurrent ? "At the current pace you will reach" : "You reached"} ${inr(incomeRef)}. Aim for ${inr(metrics.break_even - incomeRef)} more income to cover your running costs.`);
  }
  if (isCurrent && dayOfMonth >= 10 && metrics.projection && metrics.projection.profit < 0 && profit >= 0) {
    add("warning", "projected_loss", "On pace for a loss this month",
      `You are in profit today, but at the current pace the month ends about ${inr(metrics.projection.profit)} in loss.`);
  }

  // 10. Good news
  if (confident && income > 0 && profit > 0) {
    const prevProfit = prev ? prev.income - prev.expense : 0;
    if (prevProfit > 0 && profit > prevProfit * 1.1) {
      add("good", "profit_up", `Profit is up ${Math.round(((profit - prevProfit) / prevProfit) * 100)}% on last month`, `${inr(profit)} this month vs ${inr(prevProfit)}.`);
    } else if (margin >= 25) {
      add("good", "strong_margin", `Strong ${Math.round(margin)}% profit margin`, "Your costs are well under control this month.");
    }
    if (!out.some((i) => i.level === "critical" || i.level === "warning") && !out.some((i) => i.level === "good")) {
      add("good", "healthy", "Healthy month", "No cost spikes or overruns detected.");
    }
  }

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]).slice(0, 8);
}

module.exports = { metricsFor, insightsFor };