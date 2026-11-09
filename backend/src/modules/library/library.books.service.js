// Books and lending. Copies are counted per title (no photos). A loan is a row in lib_book_loans;
// "available" is always calculated from open loans, so it can never drift.
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const { AppError } = require("../../middleware/error.middleware");
const U = require("../gym/gym.utils");
const core = require("./library.core");
const payments = require("./library.payments.service");
const { LibBook, LibBookLoan, LibStudent } = require("./library.models");

const MAX_RENEWALS = 2;
const by = (ctx) => String((ctx.user && (ctx.user.name || ctx.user.email)) || "Owner").slice(0, 80);
const outstanding = (l) => U.money(Number(l.fine_amount) - Number(l.fine_paid) - Number(l.fine_waived));
const overdueDays = (due, on) => Math.max(U.diffDays(due, on), 0);

async function loadBook(venueId, id, tx) {
  const b = core.isUuid(id) ? await LibBook.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
  if (!b) throw new AppError("Book not found", 404);
  return b;
}
async function loadLoan(venueId, id, tx) {
  const l = core.isUuid(id) ? await LibBookLoan.findOne({ where: { id, venue_id: venueId }, transaction: tx }) : null;
  if (!l) throw new AppError("Loan not found", 404);
  return l;
}

/* ---------------- books ---------------- */
function bookFields(b, cur) {
  const o = {};
  if (!cur || b.title !== undefined) {
    const t = core.clean(b.title, 200);
    if (!t) throw new AppError("Book title is required", 400);
    o.title = t;
  }
  [["author", 150], ["isbn", 20], ["subject", 80], ["publisher", 120], ["edition", 40], ["language", 30], ["rack", 40], ["notes", 300]]
    .forEach(([k, max]) => { if (b[k] !== undefined) o[k] = core.clean(b[k], max); });
  if (!cur || b.total_copies !== undefined) o.total_copies = U.num(core.blank(b.total_copies) ? 1 : b.total_copies, "Copies", { min: 0, max: 10000, int: true });
  if (b.price !== undefined) o.price = U.money(U.num(core.blank(b.price) ? 0 : b.price, "Price", { max: 1000000 }));
  if (b.is_active !== undefined) o.is_active = !!b.is_active;
  return o;
}

async function openCount(bookId, tx) {
  const [[r]] = await sequelize.query(`SELECT COUNT(*)::int AS n FROM lib_book_loans WHERE book_id = :b AND status = 'issued'`, { replacements: { b: bookId }, transaction: tx });
  return r.n;
}

async function summary(venueId) {
  const [row] = await sequelize.query(
    `SELECT (SELECT COUNT(*) FROM lib_books WHERE venue_id = :v AND is_active = true)::int AS titles,
            (SELECT COALESCE(SUM(total_copies), 0) FROM lib_books WHERE venue_id = :v AND is_active = true)::int AS copies,
            COUNT(*) FILTER (WHERE status = 'issued')::int AS issued,
            COUNT(*) FILTER (WHERE status = 'issued' AND due_on < :today)::int AS overdue,
            COALESCE(SUM(fine_amount - fine_paid - fine_waived) FILTER (WHERE status <> 'issued'), 0)::float AS fines_due
       FROM lib_book_loans WHERE venue_id = :v`,
    { replacements: { v: venueId, today: U.todayIST() }, type: QueryTypes.SELECT }
  );
  return row;
}

async function list(venueId, q = {}) {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
  const repl = { v: venueId, limit, offset: (page - 1) * limit };
  let where = "b.venue_id = :v";
  if (q.all !== "true") where += " AND b.is_active = true";
  if (!core.blank(q.q)) { where += " AND (b.title ILIKE :like OR b.author ILIKE :like OR b.isbn ILIKE :like OR b.rack ILIKE :like)"; repl.like = `%${U.likeEscape(q.q)}%`; }
  if (!core.blank(q.subject)) { where += " AND b.subject = :subject"; repl.subject = String(q.subject).slice(0, 80); }
  if (q.availability === "available") where += " AND (b.total_copies - COALESCE(l.open, 0)) > 0";
  if (q.availability === "issued") where += " AND COALESCE(l.open, 0) > 0";
  const FROM = `FROM lib_books b LEFT JOIN (SELECT book_id, COUNT(*) AS open FROM lib_book_loans WHERE venue_id = :v AND status = 'issued' GROUP BY book_id) l ON l.book_id = b.id`;
  const [items, [tot], subjects, sum] = await Promise.all([
    sequelize.query(
      `SELECT b.id, b.title, b.author, b.isbn, b.subject, b.publisher, b.edition, b.language, b.rack, b.total_copies, b.price::float AS price,
              b.is_active, b.notes, COALESCE(l.open, 0)::int AS issued, (b.total_copies - COALESCE(l.open, 0))::int AS available
         ${FROM} WHERE ${where} ORDER BY b.title ASC LIMIT :limit OFFSET :offset`,
      { replacements: repl, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT COUNT(*)::int AS n ${FROM} WHERE ${where}`, { replacements: repl, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT DISTINCT subject FROM lib_books WHERE venue_id = :v AND subject IS NOT NULL ORDER BY 1 LIMIT 100`, { replacements: { v: venueId }, type: QueryTypes.SELECT }),
    summary(venueId)
  ]);
  return { items, total: tot.n, page, limit, subjects: subjects.map((s) => s.subject), summary: sum };
}

async function create(venueId, b) {
  const f = bookFields(b, null);
  return LibBook.create({ ...f, venue_id: venueId });
}

async function update(venueId, id, b) {
  const book = await loadBook(venueId, id);
  const f = bookFields(b, book);
  if (f.total_copies !== undefined && f.total_copies < (await openCount(book.id))) {
    throw new AppError("More copies are currently issued than this number. Take the books back first.", 409);
  }
  if (f.is_active === false && (await openCount(book.id))) throw new AppError("Some copies are still issued", 409);
  return book.update(f);
}

async function remove(venueId, id) {
  const book = await loadBook(venueId, id);
  if (await openCount(book.id)) throw new AppError("Some copies are still issued", 409);
  if (await LibBookLoan.count({ where: { book_id: book.id } })) {
    await book.update({ is_active: false });
    return { archived: true };
  }
  await book.destroy();
  return { deleted: true };
}

// Bulk add from a spreadsheet. Same title + author already in the catalogue => copies are added to it.
async function importBooks(venueId, rows) {
  if (!Array.isArray(rows) || !rows.length) throw new AppError("The file has no rows", 400);
  if (rows.length > 500) throw new AppError("Import up to 500 books at a time", 400);
  const existing = await LibBook.findAll({ where: { venue_id: venueId } });
  const key = (t, a) => `${String(t || "").trim().toLowerCase()}|${String(a || "").trim().toLowerCase()}`;
  const index = new Map(existing.map((b) => [key(b.title, b.author), b]));
  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    try {
      const f = bookFields({ ...r, total_copies: r.copies !== undefined ? r.copies : r.total_copies }, null);
      const k = key(f.title, f.author);
      const found = index.get(k);
      if (found) await found.update({ total_copies: found.total_copies + f.total_copies });
      else index.set(k, await LibBook.create({ ...f, venue_id: venueId }));
      results.push({ row: i + 2, ok: true, note: found ? "Copies added to existing book" : "Added" });
    } catch (e) { results.push({ row: i + 2, ok: false, error: e.message }); }
  }
  return { created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

/* ---------------- loans ---------------- */
async function pendingFines(tx, studentId) {
  const [[r]] = await sequelize.query(
    `SELECT COALESCE(SUM(fine_amount - fine_paid - fine_waived), 0)::float AS n FROM lib_book_loans WHERE student_id = :s AND status <> 'issued'`,
    { replacements: { s: studentId }, transaction: tx }
  );
  return U.money(r.n);
}

async function issue(ctx, bookId, b) {
  const { venue, settings } = ctx;
  const today = U.todayIST();
  return sequelize.transaction(async (tx) => {
    // Lock order is always book first, then student, so two staff members cannot deadlock.
    await core.lock(tx, `libbook:${bookId}`);
    if (!core.isUuid(b.student_id)) throw new AppError("Choose a student", 400);
    await core.lock(tx, `libstu:${b.student_id}`);
    const book = await loadBook(venue.id, bookId, tx);
    if (!book.is_active) throw new AppError("This book is not active", 400);
    const student = await core.findStudent(venue.id, b.student_id, tx);
    if (student.status !== "active") throw new AppError("Only active students can borrow books", 400);
    if (!student.end_date || student.end_date < today) throw new AppError("This student's fee has expired. Renew the membership first", 400);

    const open = await LibBookLoan.findAll({ where: { venue_id: venue.id, student_id: student.id, status: "issued" }, transaction: tx });
    if (open.length >= settings.max_books) throw new AppError(`This student already has ${open.length} books (limit ${settings.max_books})`, 400);
    if (open.some((l) => l.due_on < today)) throw new AppError("This student has an overdue book. Take it back first", 400);
    if (open.some((l) => l.book_id === book.id)) throw new AppError("This student already has a copy of this book", 400);
    const fines = await pendingFines(tx, student.id);
    if (fines > 0.009) throw new AppError(`This student has a pending fine of ₹${U.inr(fines)}. Collect or waive it first`, 400);
    if (book.total_copies - (await openCount(book.id, tx)) <= 0) throw new AppError("No copy of this book is available right now", 400);

    const days = core.blank(b.days) ? settings.loan_days : U.num(b.days, "Loan days", { min: 1, max: 90, int: true });
    return LibBookLoan.create({
      venue_id: venue.id, book_id: book.id, student_id: student.id, issued_on: today, due_on: U.addDays(today, days),
      status: "issued", issued_by: by(ctx), note: core.clean(b.note, 200)
    }, { transaction: tx });
  });
}

// Fine handling shared by return and lost. action: collect | later | waive
async function settleFine(tx, ctx, loan, student, fine, b) {
  if (fine <= 0) return "none";
  const action = ["collect", "later", "waive"].includes(b.fine_action) ? b.fine_action : "collect";
  const patch = { fine_amount: fine };
  if (action === "waive") {
    if (ctx.user && ctx.user.role === "team_member") throw new AppError("Only the owner can waive a fine", 403);
    patch.fine_waived = fine;
  }
  if (action === "collect") {
    await payments.recordTx(tx, ctx, { student, membership: null, amount: fine, mode: b.mode, reference: b.reference, note: "Library fine", kind: "fine" });
    patch.fine_paid = fine;
  }
  await loan.update(patch, { transaction: tx });
  return action;
}

async function returnLoan(ctx, id, b) {
  return sequelize.transaction(async (tx) => {
    const probe = await loadLoan(ctx.venue.id, id, tx);
    await core.lock(tx, `libstu:${probe.student_id}`);
    const loan = await loadLoan(ctx.venue.id, id, tx);
    if (loan.status !== "issued") throw new AppError("This book is already returned", 400);
    const student = await LibStudent.findByPk(loan.student_id, { transaction: tx });
    const today = U.todayIST();
    const fine = U.money(overdueDays(loan.due_on, today) * (Number(ctx.settings.fine_per_day) || 0));
    const action = await settleFine(tx, ctx, loan, student, fine, b);
    await loan.update({ status: "returned", returned_on: today, returned_by: by(ctx) }, { transaction: tx });
    if (action === "collect") await core.recompute(tx, student.id);
    return { loan, fine, action };
  });
}

async function markLost(ctx, id, b) {
  return sequelize.transaction(async (tx) => {
    const probe = await loadLoan(ctx.venue.id, id, tx);
    await core.lock(tx, `libbook:${probe.book_id}`);
    await core.lock(tx, `libstu:${probe.student_id}`);
    const loan = await loadLoan(ctx.venue.id, id, tx);
    if (loan.status !== "issued") throw new AppError("This loan is already closed", 400);
    const [book, student] = await Promise.all([LibBook.findByPk(loan.book_id, { transaction: tx }), LibStudent.findByPk(loan.student_id, { transaction: tx })]);
    const today = U.todayIST();
    const late = overdueDays(loan.due_on, today) * (Number(ctx.settings.fine_per_day) || 0);
    const fine = U.money(late + (Number(book.price) || 0));
    const action = await settleFine(tx, ctx, loan, student, fine, b);
    await loan.update({ status: "lost", returned_on: today, returned_by: by(ctx) }, { transaction: tx });
    await book.update({ total_copies: Math.max(book.total_copies - 1, 0) }, { transaction: tx }); // the copy no longer exists
    if (action === "collect") await core.recompute(tx, student.id);
    return { loan, fine, action };
  });
}

async function renewLoan(ctx, id) {
  const today = U.todayIST();
  return sequelize.transaction(async (tx) => {
    const loan = await loadLoan(ctx.venue.id, id, tx);
    await core.lock(tx, `libstu:${loan.student_id}`);
    await loan.reload({ transaction: tx });
    if (loan.status !== "issued") throw new AppError("This book is already returned", 400);
    if (loan.due_on < today) throw new AppError("This book is overdue. Take it back and clear the fine first", 400);
    if (loan.renewals >= MAX_RENEWALS) throw new AppError(`A book can be renewed ${MAX_RENEWALS} times only`, 400);
    const student = await LibStudent.findByPk(loan.student_id, { transaction: tx });
    if (!student.end_date || student.end_date < today) throw new AppError("This student's fee has expired", 400);
    const next = U.addDays(today, ctx.settings.loan_days);
    await loan.update({ due_on: next > loan.due_on ? next : loan.due_on, renewals: loan.renewals + 1 }, { transaction: tx });
    return loan;
  });
}

async function collectFine(ctx, id, b) {
  return sequelize.transaction(async (tx) => {
    const probe = await loadLoan(ctx.venue.id, id, tx);
    await core.lock(tx, `libstu:${probe.student_id}`);
    const loan = await loadLoan(ctx.venue.id, id, tx);
    const due = outstanding(loan);
    if (loan.status === "issued" || due <= 0.009) throw new AppError("There is no fine to collect on this loan", 400);
    const amt = core.blank(b.amount) ? due : U.money(U.num(b.amount, "Amount", { min: 0.01, max: 1000000 }));
    if (amt > due + 0.009) throw new AppError(`Amount is more than the fine due (₹${U.inr(due)})`, 400);
    const student = await LibStudent.findByPk(loan.student_id, { transaction: tx });
    await payments.recordTx(tx, ctx, { student, membership: null, amount: amt, mode: b.mode, reference: b.reference, note: "Library fine", kind: "fine" });
    await loan.update({ fine_paid: U.money(Number(loan.fine_paid) + amt) }, { transaction: tx });
    await core.recompute(tx, student.id);
    return loan;
  });
}

async function waiveFine(ctx, id) {
  const loan = await loadLoan(ctx.venue.id, id);
  const due = outstanding(loan);
  if (loan.status === "issued" || due <= 0.009) throw new AppError("There is no fine to waive on this loan", 400);
  await loan.update({ fine_waived: U.money(Number(loan.fine_waived) + due) });
  return loan;
}

const LOAN_FROM = `FROM lib_book_loans l JOIN lib_students s ON s.id = l.student_id JOIN lib_books b ON b.id = l.book_id`;
const LOAN_COLS = `l.id, l.book_id, l.student_id, l.issued_on, l.due_on, l.returned_on, l.status, l.renewals,
  l.fine_amount::float AS fine_amount, l.fine_paid::float AS fine_paid, l.fine_waived::float AS fine_waived, l.note,
  b.title, b.author, b.rack, b.price::float AS book_price, s.name AS student_name, s.student_code, s.phone`;

function shapeLoan(l, settings, today) {
  const days = l.status === "issued" ? overdueDays(l.due_on, today) : 0;
  return { ...l, days_overdue: days, est_fine: U.money(days * (Number(settings.fine_per_day) || 0)), fine_due: outstanding(l) };
}

async function listLoans(venueId, settings, q = {}) {
  const today = U.todayIST();
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
  const view = ["issued", "overdue", "returned", "lost", "fines"].includes(q.status) ? q.status : "issued";
  const repl = { v: venueId, today, limit, offset: (page - 1) * limit };
  let where = "l.venue_id = :v";
  if (view === "issued") where += " AND l.status = 'issued'";
  if (view === "overdue") where += " AND l.status = 'issued' AND l.due_on < :today";
  if (view === "returned") where += " AND l.status = 'returned'";
  if (view === "lost") where += " AND l.status = 'lost'";
  if (view === "fines") where += " AND l.status <> 'issued' AND (l.fine_amount - l.fine_paid - l.fine_waived) > 0.009";
  if (!core.blank(q.q)) { where += " AND (s.name ILIKE :like OR s.phone ILIKE :like OR s.student_code ILIKE :like OR b.title ILIKE :like)"; repl.like = `%${U.likeEscape(q.q)}%`; }
  if (core.isUuid(q.student_id)) { where += " AND l.student_id = :sid"; repl.sid = q.student_id; }
  if (core.isUuid(q.book_id)) { where += " AND l.book_id = :bid"; repl.bid = q.book_id; }
  const order = view === "issued" || view === "overdue" ? "l.due_on ASC" : "l.returned_on DESC NULLS LAST, l.created_at DESC";
  const [rows, [tot], sum] = await Promise.all([
    sequelize.query(`SELECT ${LOAN_COLS} ${LOAN_FROM} WHERE ${where} ORDER BY ${order} LIMIT :limit OFFSET :offset`, { replacements: repl, type: QueryTypes.SELECT }),
    sequelize.query(`SELECT COUNT(*)::int AS n ${LOAN_FROM} WHERE ${where}`, { replacements: repl, type: QueryTypes.SELECT }),
    summary(venueId)
  ]);
  return { items: rows.map((r) => shapeLoan(r, settings, today)), total: tot.n, page, limit, summary: sum };
}

async function studentLoans(venueId, settings, studentId) {
  const s = await core.findStudent(venueId, studentId);
  const today = U.todayIST();
  const rows = await sequelize.query(
    `SELECT ${LOAN_COLS} ${LOAN_FROM} WHERE l.venue_id = :v AND l.student_id = :s ORDER BY (l.status = 'issued') DESC, l.issued_on DESC LIMIT 20`,
    { replacements: { v: venueId, s: s.id }, type: QueryTypes.SELECT }
  );
  return { items: rows.map((r) => shapeLoan(r, settings, today)) };
}

module.exports = { summary, list, create, update, remove, importBooks, issue, returnLoan, markLost, renewLoan, collectFine, waiveFine, listLoans, studentLoans };