const crypto = require("crypto");
const { Op, QueryTypes, fn, col } = require("sequelize");
const { AppError } = require("../../middleware/error.middleware");
const { getSequelize } = require("../../utils/db");
const U = require("../gym/gym.utils");
const CFG = require("../../config/expenseCategories");
const { ExpenseCategory, ExpenseEntry, ExpenseRecurring } = require("./expense.models");
const { autoTotals, describeAuto } = require("./expense.sources");
const { metricsFor, insightsFor } = require("./expense.insights");

const num = (v) => Number(v) || 0;
const r2 = (n) => Math.round(num(n) * 100) / 100;
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const clean = (v, max) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, max);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TYPES = ["expense", "income"];
const STATUSES = ["paid", "due"];
const FREQUENCIES = ["weekly", "monthly", "yearly"];
const MODES = CFG.PAYMENT_MODES;
const MAX_AMOUNT = 99999999.99;
const MAX_CUSTOM_CATEGORIES = 60;
const MAX_RECURRING = 50;
const MAX_BACKFILL = 24;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (k) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const monthShort = (k) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;
const addMonthKey = (k, n) => U.addMonths(`${k}-01`, n).slice(0, 7);
const monthEnd = (k) => U.addDays(U.addMonths(`${k}-01`, 1), -1);
const daysIn = (k) => Number(monthEnd(k).slice(8, 10));

function parseAmount(v, field = "Amount") {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`${field} must be greater than 0`, 400);
  if (n > MAX_AMOUNT) throw new AppError(`${field} is too large`, 400);
  return r2(n);
}
function parseDate(v, field = "Date") {
  if (!U.isYmd(v)) throw new AppError(`${field} is invalid`, 400);
  return v;
}
async function findOwned(Model, venueId, id, label) {
  if (!UUID_RE.test(String(id))) throw new AppError(`${label} not found`, 404);
  const row = await Model.findOne({ where: { id, venue_id: venueId } });
  if (!row) throw new AppError(`${label} not found`, 404);
  return row;
}

/* ───────────── categories ───────────── */

const shapeCategory = (c) => ({
  id: c.id, kind: c.kind, slug: c.slug, label: c.label, color: c.color, cost_group: c.cost_group,
  monthly_budget: c.monthly_budget == null ? null : Number(c.monthly_budget),
  is_system: c.is_system, is_active: c.is_active, sort_order: c.sort_order
});

// Inserts any default category the vendor does not have yet. Never updates or deletes anything.
const seeded = new Set();
async function ensureCategories(venueId, kind) {
  const tag = `${venueId}:${kind}`;
  if (seeded.has(tag)) return;
  const defs = CFG.defaultsFor(kind);
  const wanted = [...defs.expense.map((d) => ({ ...d, kind: "expense" })), ...defs.income.map((d) => ({ ...d, kind: "income" }))];
  const have = new Set(
    (await ExpenseCategory.findAll({ where: { venue_id: venueId }, attributes: ["kind", "slug"], raw: true })).map((c) => `${c.kind}:${c.slug}`)
  );
  const missing = wanted.filter((d) => !have.has(`${d.kind}:${d.slug}`));
  if (missing.length) {
    await ExpenseCategory.bulkCreate(
      missing.map((d) => ({
        venue_id: venueId, kind: d.kind, slug: d.slug, label: d.label, color: d.color,
        cost_group: d.cost_group, sort_order: d.sort_order, is_system: true, is_active: true
      })),
      { ignoreDuplicates: true }
    );
  }
  seeded.add(tag);
}

async function listCategories(venueId) {
  const rows = await ExpenseCategory.findAll({ where: { venue_id: venueId }, order: [["sort_order", "ASC"], ["label", "ASC"]], raw: true });
  return rows.map(shapeCategory);
}

async function getMeta(venue, kind) {
  await ensureCategories(venue.id, kind);
  return {
    kind,
    categories: await listCategories(venue.id),
    modes: MODES,
    cost_groups: CFG.COST_GROUPS,
    auto: describeAuto(kind),
    hints: { payroll_auto: ["gym", "academy", "studio"].includes(kind), stock_auto: kind === "retail" }
  };
}

function parseBudget(v) {
  if (v === null || v === "" || v === undefined) return null;
  return parseAmount(v, "Budget");
}

async function createCategory(venueId, kind, body) {
  await ensureCategories(venueId, kind);
  const type = body.kind;
  if (!TYPES.includes(type)) throw new AppError("Category type must be expense or income", 400);
  const label = clean(body.label, 60);
  if (label.length < 2) throw new AppError("Enter a category name (at least 2 letters)", 400);
  if ((await ExpenseCategory.count({ where: { venue_id: venueId, is_system: false } })) >= MAX_CUSTOM_CATEGORIES) {
    throw new AppError(`You can add up to ${MAX_CUSTOM_CATEGORIES} custom categories`, 400);
  }
  const dup = await ExpenseCategory.findOne({ where: { venue_id: venueId, kind: type, label: { [Op.iLike]: U.likeEscape(label) } }, attributes: ["id"], raw: true });
  if (dup) throw new AppError("A category with this name already exists", 409);

  const group = CFG.COST_GROUPS.includes(body.cost_group) ? body.cost_group : "operations";
  const color = /^#[0-9a-f]{6}$/i.test(body.color || "") ? body.color : CFG.PALETTE[crypto.randomInt(CFG.PALETTE.length)];
  const row = await ExpenseCategory.create({
    venue_id: venueId, kind: type, slug: `c_${crypto.randomBytes(4).toString("hex")}`, label, color,
    cost_group: type === "expense" ? group : "other",
    monthly_budget: type === "expense" ? parseBudget(body.monthly_budget) : null,
    is_system: false, is_active: true, sort_order: 500
  });
  return shapeCategory(row.get({ plain: true }));
}

async function updateCategory(venueId, id, body) {
  const row = await findOwned(ExpenseCategory, venueId, id, "Category");
  const patch = {};
  if (body.label !== undefined) {
    const label = clean(body.label, 60);
    if (label.length < 2) throw new AppError("Enter a category name (at least 2 letters)", 400);
    const dup = await ExpenseCategory.findOne({
      where: { venue_id: venueId, kind: row.kind, label: { [Op.iLike]: U.likeEscape(label) }, id: { [Op.ne]: row.id } }, attributes: ["id"], raw: true
    });
    if (dup) throw new AppError("A category with this name already exists", 409);
    patch.label = label;
  }
  if (body.monthly_budget !== undefined && row.kind === "expense") patch.monthly_budget = parseBudget(body.monthly_budget);
  if (body.is_active !== undefined) patch.is_active = !!body.is_active;
  if (/^#[0-9a-f]{6}$/i.test(body.color || "")) patch.color = body.color;
  if (!row.is_system && row.kind === "expense" && CFG.COST_GROUPS.includes(body.cost_group)) patch.cost_group = body.cost_group;
  await row.update(patch);
  return shapeCategory(row.get({ plain: true }));
}

async function deleteCategory(venueId, id) {
  const row = await findOwned(ExpenseCategory, venueId, id, "Category");
  if (row.is_system) throw new AppError("Default categories cannot be deleted. Archive it instead.", 400);
  const [entries, rules] = await Promise.all([
    ExpenseEntry.count({ where: { venue_id: venueId, type: row.kind, category_slug: row.slug } }),
    ExpenseRecurring.count({ where: { venue_id: venueId, type: row.kind, category_slug: row.slug } })
  ]);
  if (entries + rules > 0) throw new AppError(`This category is used by ${entries + rules} entries. Archive it instead.`, 409);
  await row.destroy();
  return { deleted: true };
}

async function assertCategory(venueId, type, slug) {
  const c = await ExpenseCategory.findOne({ where: { venue_id: venueId, kind: type, slug }, attributes: ["is_active"], raw: true });
  if (!c) throw new AppError("Category not found", 400);
  if (!c.is_active) throw new AppError("This category is archived. Restore it or pick another.", 400);
}

/* ───────────── entries ───────────── */

const shapeEntry = (e) => {
  const r = e.get ? e.get({ plain: true }) : e;
  return {
    id: r.id, type: r.type, category_slug: r.category_slug, amount: num(r.amount), entry_date: r.entry_date,
    status: r.status, mode: r.mode, vendor_name: r.vendor_name, reference: r.reference, note: r.note,
    recurring_id: r.recurring_id
  };
};

async function normalizeEntry(venueId, body, existing) {
  const has = (k) => body[k] !== undefined;
  const type = has("type") ? body.type : existing ? existing.type : "expense";
  if (!TYPES.includes(type)) throw new AppError("Type must be expense or income", 400);

  const slug = has("category_slug") ? clean(body.category_slug, 40) : existing && existing.category_slug;
  if (!slug) throw new AppError("Choose a category", 400);
  if (!existing || slug !== existing.category_slug || type !== existing.type) await assertCategory(venueId, type, slug);

  const amount = has("amount") ? parseAmount(body.amount) : existing.amount;
  const status = has("status") ? body.status : existing ? existing.status : "paid";
  if (!STATUSES.includes(status)) throw new AppError("Status must be paid or due", 400);
  if (status === "due" && type !== "expense") throw new AppError("Only expenses can be saved as due", 400);

  const entryDate = has("entry_date") ? parseDate(body.entry_date) : existing ? existing.entry_date : U.todayIST();
  if (status === "paid" && entryDate > U.todayIST()) {
    throw new AppError("A paid entry cannot be dated in the future. Use Pay later for upcoming bills.", 400);
  }

  const mode = has("mode") ? body.mode || "cash" : existing ? existing.mode : "cash";
  if (!MODES.includes(mode)) throw new AppError("Payment mode is invalid", 400);

  const text = (k, max) => (has(k) ? clean(body[k], max) : existing ? existing[k] || "" : "") || null;
  return {
    type, category_slug: slug, amount, status, entry_date: entryDate, mode,
    vendor_name: text("vendor_name", 100), reference: text("reference", 80), note: text("note", 300)
  };
}

const actor = (user) => String((user && (user.name || user.email)) || "").slice(0, 80) || null;

async function createEntry(venueId, user, body) {
  const n = await normalizeEntry(venueId, body, null);
  const row = await ExpenseEntry.create({ ...n, venue_id: venueId, created_by: actor(user) });
  return shapeEntry(row);
}

async function updateEntry(venueId, id, body) {
  const row = await findOwned(ExpenseEntry, venueId, id, "Entry");
  const n = await normalizeEntry(venueId, body, shapeEntry(row));
  await row.update(n);
  return shapeEntry(row);
}

// Marks a "due" bill as paid. It counts in the books on the day it was paid.
async function payEntry(venueId, id, body) {
  const row = await findOwned(ExpenseEntry, venueId, id, "Entry");
  if (row.status !== "due") throw new AppError("This entry is already paid", 400);
  const today = U.todayIST();
  const paidOn = body.paid_on ? parseDate(body.paid_on, "Paid date") : today;
  if (paidOn > today) throw new AppError("Paid date cannot be in the future", 400);
  const mode = body.mode || row.mode || "cash";
  if (!MODES.includes(mode)) throw new AppError("Payment mode is invalid", 400);
  await row.update({ status: "paid", entry_date: paidOn, mode });
  return shapeEntry(row);
}

async function deleteEntry(venueId, id) {
  const row = await findOwned(ExpenseEntry, venueId, id, "Entry");
  await row.destroy();
  return { deleted: true };
}

function entryWhere(venueId, q) {
  const today = U.todayIST();
  let from = U.isYmd(q.from) ? q.from : `${today.slice(0, 7)}-01`;
  let to = U.isYmd(q.to) ? q.to : monthEnd(today.slice(0, 7));
  if (from > to) [from, to] = [to, from];
  const where = { venue_id: venueId, entry_date: { [Op.between]: [from, to] } };
  if (TYPES.includes(q.type)) where.type = q.type;
  if (STATUSES.includes(q.status)) where.status = q.status;
  if (q.category) where.category_slug = clean(q.category, 40);
  if (MODES.includes(q.mode)) where.mode = q.mode;
  const s = clean(q.q, 60);
  if (s) {
    const like = `%${U.likeEscape(s)}%`;
    where[Op.or] = [{ vendor_name: { [Op.iLike]: like } }, { note: { [Op.iLike]: like } }, { reference: { [Op.iLike]: like } }];
  }
  return { where, from, to };
}

async function listEntries(venueId, q) {
  const { where, from, to } = entryWhere(venueId, q);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 25, 1), 100);

  const [{ rows, count }, sums] = await Promise.all([
    ExpenseEntry.findAndCountAll({
      where, order: [["entry_date", "DESC"], ["createdAt", "DESC"]], limit, offset: (page - 1) * limit
    }),
    ExpenseEntry.findAll({ where, attributes: ["type", "status", [fn("SUM", col("amount")), "total"]], group: ["type", "status"], raw: true })
  ]);

  const summary = { expense: 0, income: 0, due: 0 };
  sums.forEach((r) => {
    const t = num(r.total);
    if (r.status === "due") summary.due += t;
    else summary[r.type] += t;
  });
  summary.net = summary.income - summary.expense;
  Object.keys(summary).forEach((k) => { summary[k] = r2(summary[k]); });

  return { items: rows.map(shapeEntry), total: count, page, limit, from, to, summary };
}

const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // blocks spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function exportCsv(venueId, q) {
  const { where } = entryWhere(venueId, q);
  const [rows, cats] = await Promise.all([
    ExpenseEntry.findAll({ where, order: [["entry_date", "ASC"], ["createdAt", "ASC"]], limit: 20000 }),
    ExpenseCategory.findAll({ where: { venue_id: venueId }, raw: true })
  ]);
  const label = new Map(cats.map((c) => [`${c.kind}:${c.slug}`, c.label]));
  const lines = [["Date", "Type", "Category", "Amount", "Status", "Mode", "Party / Vendor", "Reference", "Note"].join(",")];
  rows.forEach((e) => {
    const r = shapeEntry(e);
    lines.push([r.entry_date, r.type, label.get(`${r.type}:${r.category_slug}`) || r.category_slug, r.amount.toFixed(2), r.status, r.mode, r.vendor_name, r.reference, r.note].map(csvCell).join(","));
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

/* ───────────── recurring ───────────── */

const shapeRule = (r) => {
  const p = r.get ? r.get({ plain: true }) : r;
  return {
    id: p.id, type: p.type, category_slug: p.category_slug, amount: num(p.amount), frequency: p.frequency,
    day_of_month: p.day_of_month, start_date: p.start_date, end_date: p.end_date, next_run_on: p.next_run_on,
    mode: p.mode, vendor_name: p.vendor_name, note: p.note, is_active: p.is_active
  };
};

const nextRun = (rule, from) =>
  rule.frequency === "weekly" ? U.addDays(from, 7) : U.addMonths(from, rule.frequency === "yearly" ? 12 : 1);

function firstRun(frequency, day, start) {
  if (frequency === "weekly") return start;
  const d = `${start.slice(0, 8)}${String(day).padStart(2, "0")}`;
  return d >= start ? d : U.addMonths(d, frequency === "yearly" ? 12 : 1);
}

function catchUp(rule, today) {
  let next = rule.next_run_on;
  let guard = 0;
  while (next < today && guard++ < 600) next = nextRun(rule, next);
  return next;
}

// Lazily posts every recurring entry that has come due. Safe to call often: row locks + the
// (recurring_id, entry_date) unique index make it idempotent even when requests race.
async function materializeRecurring(venueId) {
  const today = U.todayIST();
  const dueWhere = { venue_id: venueId, is_active: true, next_run_on: { [Op.lte]: today } };
  if (!(await ExpenseRecurring.count({ where: dueWhere }))) return 0;

  const t = await getSequelize().transaction();
  try {
    const rules = await ExpenseRecurring.findAll({ where: dueWhere, lock: t.LOCK.UPDATE, skipLocked: true, transaction: t });
    let created = 0;
    for (const r of rules) {
      const rows = [];
      let next = r.next_run_on;
      let guard = 0;
      while (next <= today && (!r.end_date || next <= r.end_date) && guard < MAX_BACKFILL) {
        rows.push({
          venue_id: venueId, type: r.type, category_slug: r.category_slug, amount: r.amount, entry_date: next,
          status: "paid", mode: r.mode, vendor_name: r.vendor_name, note: r.note, recurring_id: r.id, created_by: "Recurring"
        });
        next = nextRun(r, next);
        guard++;
      }
      if (rows.length) {
        await ExpenseEntry.bulkCreate(rows, { ignoreDuplicates: true, transaction: t });
        created += rows.length;
      }
      const finished = r.end_date && next > r.end_date;
      await r.update({ next_run_on: next, is_active: finished ? false : r.is_active }, { transaction: t });
    }
    await t.commit();
    return created;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function listRecurring(venueId) {
  await materializeRecurring(venueId).catch((e) => console.error("[expenses] recurring:", e.message));
  const rows = await ExpenseRecurring.findAll({ where: { venue_id: venueId }, order: [["is_active", "DESC"], ["next_run_on", "ASC"]] });
  return rows.map(shapeRule);
}

async function createRecurring(venueId, body) {
  const type = body.type;
  if (!TYPES.includes(type)) throw new AppError("Type must be expense or income", 400);
  const slug = clean(body.category_slug, 40);
  if (!slug) throw new AppError("Choose a category", 400);
  await assertCategory(venueId, type, slug);
  const amount = parseAmount(body.amount);
  if (!FREQUENCIES.includes(body.frequency)) throw new AppError("Choose weekly, monthly or yearly", 400);
  const mode = body.mode || "cash";
  if (!MODES.includes(mode)) throw new AppError("Payment mode is invalid", 400);

  const today = U.todayIST();
  const start = body.start_date ? parseDate(body.start_date, "Start date") : today;
  if (U.diffDays(start, today) > 400) throw new AppError("Start date can be at most 13 months in the past", 400);
  const end = body.end_date ? parseDate(body.end_date, "End date") : null;
  if (end && end < start) throw new AppError("End date must be after the start date", 400);
  const day = Math.min(Math.max(parseInt(body.day_of_month, 10) || Number(start.slice(8, 10)), 1), 28);

  if ((await ExpenseRecurring.count({ where: { venue_id: venueId } })) >= MAX_RECURRING) {
    throw new AppError(`You can keep up to ${MAX_RECURRING} recurring entries`, 400);
  }
  const row = await ExpenseRecurring.create({
    venue_id: venueId, type, category_slug: slug, amount, frequency: body.frequency, day_of_month: day,
    start_date: start, end_date: end, next_run_on: firstRun(body.frequency, day, start), mode,
    vendor_name: clean(body.vendor_name, 100) || null, note: clean(body.note, 300) || null, is_active: true
  });
  await materializeRecurring(venueId).catch((e) => console.error("[expenses] recurring:", e.message));
  await row.reload();
  return shapeRule(row);
}

// Frequency, day and category are fixed once created (delete + recreate to change them).
async function updateRecurring(venueId, id, body) {
  const row = await findOwned(ExpenseRecurring, venueId, id, "Recurring entry");
  const patch = {};
  if (body.amount !== undefined) patch.amount = parseAmount(body.amount);
  if (body.mode !== undefined) {
    if (!MODES.includes(body.mode)) throw new AppError("Payment mode is invalid", 400);
    patch.mode = body.mode;
  }
  if (body.vendor_name !== undefined) patch.vendor_name = clean(body.vendor_name, 100) || null;
  if (body.note !== undefined) patch.note = clean(body.note, 300) || null;
  if (body.end_date !== undefined) {
    patch.end_date = body.end_date ? parseDate(body.end_date, "End date") : null;
    if (patch.end_date && patch.end_date < row.start_date) throw new AppError("End date must be after the start date", 400);
  }
  if (body.is_active !== undefined) {
    patch.is_active = !!body.is_active;
    // Resuming never back-fills the paused months.
    if (patch.is_active && !row.is_active) patch.next_run_on = catchUp(row, U.todayIST());
  }
  await row.update(patch);
  return shapeRule(row);
}

async function deleteRecurring(venueId, id) {
  const row = await findOwned(ExpenseRecurring, venueId, id, "Recurring entry");
  await row.destroy(); // entries it already posted stay in the books
  return { deleted: true };
}

/* ───────────── overview ───────────── */

async function overview(venue, kind, monthParam) {
  const venueId = venue.id;
  const today = U.todayIST();
  const curMonth = today.slice(0, 7);
  let month = MONTH_RE.test(monthParam || "") ? monthParam : curMonth;
  if (month > curMonth) month = curMonth;
  const isCurrent = month === curMonth;

  await ensureCategories(venueId, kind);
  await materializeRecurring(venueId).catch((e) => console.error("[expenses] recurring:", e.message));

  const keys = Array.from({ length: 6 }, (_, i) => addMonthKey(month, i - 5));
  const from = `${keys[0]}-01`;
  const to = monthEnd(month);

  const [manualRows, auto, categories, dueRows] = await Promise.all([
    getSequelize().query(
      `SELECT to_char(entry_date, 'YYYY-MM') AS month, type, category_slug AS slug, SUM(amount)::float AS total
       FROM expense_entries WHERE venue_id = :v AND status = 'paid' AND entry_date BETWEEN :from AND :to GROUP BY 1, 2, 3`,
      { replacements: { v: venueId, from, to }, type: QueryTypes.SELECT }
    ),
    autoTotals(venue, kind, from, to),
    ExpenseCategory.findAll({ where: { venue_id: venueId }, raw: true }),
    ExpenseEntry.findAll({ where: { venue_id: venueId, status: "due", type: "expense" }, order: [["entry_date", "ASC"]], limit: 200 })
  ]);

  // meta lookups
  const expMeta = new Map();
  const incMeta = new Map();
  categories.forEach((c) => {
    const budget = c.monthly_budget == null ? null : Number(c.monthly_budget);
    (c.kind === "expense" ? expMeta : incMeta).set(c.slug, { label: c.label, color: c.color, group: c.cost_group, budget, auto: false });
  });
  Object.entries(CFG.AUTO_EXPENSE).forEach(([k, v]) =>
    expMeta.set(`auto:${k}`, { label: v.label, color: v.color, group: v.cost_group, budget: null, auto: true }));
  Object.entries(CFG.AUTO_INCOME).forEach(([k, label]) =>
    incMeta.set(`auto:${k}`, { label, color: "#10b981", group: "other", budget: null, auto: true }));

  // 6 monthly buckets
  const months = keys.map((k) => ({ month: k, label: monthShort(k), income: 0, expense: 0, inc: {}, byCat: {}, byGroup: {} }));
  const at = new Map(months.map((m) => [m.month, m]));
  const addExp = (m, id, a) => {
    m.expense += a;
    m.byCat[id] = (m.byCat[id] || 0) + a;
    const g = (expMeta.get(id) || {}).group || "other";
    m.byGroup[g] = (m.byGroup[g] || 0) + a;
  };
  const addInc = (m, id, a) => { m.income += a; m.inc[id] = (m.inc[id] || 0) + a; };

  manualRows.forEach((r) => {
    const m = at.get(r.month);
    if (!m) return;
    if (r.type === "income") addInc(m, r.slug, num(r.total));
    else addExp(m, r.slug, num(r.total));
  });
  auto.income.forEach((r) => { const m = at.get(r.month); if (m) addInc(m, `auto:${r.key}`, r.total); });
  auto.expense.forEach((r) => { const m = at.get(r.month); if (m) addExp(m, `auto:${r.key}`, r.total); });

  const cur = months[5];
  const prev = months[4];

  const breakdown = (curMap, prevMap, meta, total, withBudget) =>
    Object.entries(curMap)
      .filter(([, a]) => a > 0)
      .map(([id, a]) => {
        const m = meta.get(id) || { label: id, color: "#94a3b8", budget: null, auto: false };
        return {
          id, label: m.label, color: m.color, auto: !!m.auto, amount: r2(a), prev: r2(prevMap[id] || 0),
          share: r2(pct(a, total)), budget: withBudget ? m.budget : null,
          budget_used: withBudget && m.budget ? r2(pct(a, m.budget)) : null
        };
      })
      .sort((x, y) => y.amount - x.amount);

  // bills
  const bills = { overdueCount: 0, overdueTotal: 0, soonCount: 0, soonTotal: 0, totalDue: 0, items: [] };
  const soonEnd = U.addDays(today, 7);
  dueRows.map(shapeEntry).forEach((e) => {
    bills.totalDue += e.amount;
    if (e.entry_date < today) { bills.overdueCount++; bills.overdueTotal += e.amount; }
    else if (e.entry_date <= soonEnd) { bills.soonCount++; bills.soonTotal += e.amount; }
    if (bills.items.length < 8) {
      bills.items.push({
        id: e.id, label: (expMeta.get(e.category_slug) || {}).label || e.category_slug, amount: e.amount,
        date: e.entry_date, overdue: e.entry_date < today, vendor_name: e.vendor_name, note: e.note
      });
    }
  });
  ["overdueTotal", "soonTotal", "totalDue"].forEach((k) => { bills[k] = r2(bills[k]); });

  const dayOfMonth = isCurrent ? Number(today.slice(8, 10)) : daysIn(month);
  const ctx = { kind, isCurrent, dayOfMonth, daysInMonth: daysIn(month), months, catMeta: expMeta, bills };
  const metrics = metricsFor(ctx);
  const insights = insightsFor(ctx, metrics);

  const change = (a, b) => (b > 0 ? r2(((a - b) / b) * 100) : null);
  const profit = cur.income - cur.expense;
  const prevProfit = prev.income - prev.expense;

  return {
    month, month_label: monthLabel(month), is_current: isCurrent, kind,
    has_data: months.some((m) => m.income > 0 || m.expense > 0),
    kpis: {
      income: r2(cur.income), expense: r2(cur.expense), profit: r2(profit),
      margin: cur.income > 0 ? r2(pct(profit, cur.income)) : null,
      prev: { income: r2(prev.income), expense: r2(prev.expense), profit: r2(prevProfit) },
      income_change: change(cur.income, prev.income),
      expense_change: change(cur.expense, prev.expense),
      profit_change: prevProfit > 0 ? change(profit, prevProfit) : null
    },
    metrics,
    trend: months.map((m) => ({ month: m.month, label: m.label, income: r2(m.income), expense: r2(m.expense), profit: r2(m.income - m.expense) })),
    income_breakdown: breakdown(cur.inc, prev.inc, incMeta, cur.income, false),
    expense_breakdown: breakdown(cur.byCat, prev.byCat, expMeta, cur.expense, true),
    bills,
    insights,
    auto: describeAuto(kind)
  };
}

module.exports = {
  getMeta, createCategory, updateCategory, deleteCategory,
  listEntries, createEntry, updateEntry, payEntry, deleteEntry, exportCsv,
  listRecurring, createRecurring, updateRecurring, deleteRecurring,
  overview
};