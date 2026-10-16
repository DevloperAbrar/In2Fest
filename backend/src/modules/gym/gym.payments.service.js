const Razorpay = require("razorpay");
const { Op } = require("sequelize");
const { sequelize, Venue, GymMember, GymMembership, GymPlan, GymPayment, GymSettings } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");

const rzpClient = (settings) =>
  settings.razorpay_key_id && settings.razorpay_key_secret_enc
    ? new Razorpay({ key_id: settings.razorpay_key_id, key_secret: U.decrypt(settings.razorpay_key_secret_enc) })
    : null;

const urlFor = (p) => p.rzp_link_url || `${U.publicApiBase()}/public/gym/pay/${p.pay_token}`;

// Cash / UPI / card received at the desk, applied to a membership.
async function createPaidTx(tx, { venue, settings, member, membership, amount, mode = "cash", paid_on, reference, receivedBy, notes }) {
  const amt = U.num(amount, "Amount", { min: 0.01 });
  if (!C.PAYMENT_MODES.includes(mode)) throw new AppError("Invalid payment mode", 400);
  const due = U.money(Number(membership.total_amount) - Number(membership.amount_paid));
  if (amt > due + 0.009) throw new AppError(`Amount exceeds the due of ₹${U.inr(due)}`, 400);
  const paidOn = paid_on ? core.checkDate(paid_on, "Payment date") : U.todayIST();
  if (paidOn > U.todayIST()) throw new AppError("Payment date cannot be in the future", 400);
  const seq = await core.nextSeq(tx, venue.id, "gym_payments", "receipt_seq");
  return GymPayment.create({
    venue_id: venue.id, member_id: member.id, membership_id: membership.id, amount: U.money(amt), mode, status: "paid",
    paid_on: paidOn, receipt_seq: seq, receipt_no: `${settings.receipt_prefix}-${String(seq).padStart(5, "0")}`,
    reference: reference ? String(reference).slice(0, 80) : null, received_by: receivedBy, notes: notes ? String(notes).slice(0, 300) : null
  }, { transaction: tx });
}

async function recordManual(ctx, memberId, b) {
  const { venue, settings, user } = ctx;
  let out;
  await sequelize.transaction(async (tx) => {
    const member = await GymMember.findOne({ where: { id: memberId, venue_id: venue.id, is_archived: false }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!member) throw new AppError("Member not found", 404);
    const ms = b.membership_id
      ? await GymMembership.findOne({ where: { id: b.membership_id, member_id: member.id }, transaction: tx })
      : await core.pickMembership(tx, member.id);
    if (!ms) throw new AppError("This member has no membership to apply the payment to", 400);
    const payment = await createPaidTx(tx, { ...b, venue, settings, member, membership: ms, receivedBy: user.name });
    await core.recomputeFinancials(tx, member.id);
    await member.reload({ transaction: tx });
    out = { payment, member };
  });
 
  return { payment: out.payment, member: core.present(out.member) };
}

// Creates (or reuses) a pending payment request. Razorpay link if the gym connected Razorpay, else UPI page.
async function createRequest({ venue, settings, member, amount, membershipId = null, intent = null }) {
  const amt = U.money(amount);
  const existing = await GymPayment.findOne({
    where: { member_id: member.id, status: "pending", amount: amt, membership_id: membershipId, createdAt: { [Op.gt]: new Date(Date.now() - 86400000) }, expires_at: { [Op.gt]: new Date() } },
    order: [["createdAt", "DESC"]]
  });
  if (existing) return { payment: existing, url: urlFor(existing) };

  const rz = rzpClient(settings);
  if (!rz && !venue.upi_id) throw new AppError("Add your UPI ID (Settings > Payment) or connect Razorpay to collect payments online.", 400);

  const payment = await GymPayment.create({
    venue_id: venue.id, member_id: member.id, membership_id: membershipId, amount: amt, mode: rz ? "razorpay" : "upi",
    status: "pending", pay_token: U.token(), meta: intent ? { intent } : {}, expires_at: new Date(Date.now() + 7 * 86400000)
  });
  if (rz) {
    try {
      const link = await rz.paymentLink.create({
        amount: Math.round(amt * 100), currency: "INR", accept_partial: false, reference_id: payment.id,
        description: `${venue.hall_name} - membership`.slice(0, 200),
        customer: { name: member.name, contact: `+91${member.phone}` },
        notify: { sms: false, email: false }, reminder_enable: false,
        expire_by: Math.floor(Date.now() / 1000) + 7 * 86400
      });
      await payment.update({ rzp_link_id: link.id, rzp_link_url: link.short_url });
    } catch (e) {
      await payment.destroy();
      throw new AppError(`Razorpay could not create the link: ${e?.error?.description || e.message}`, 502);
    }
  }
  return { payment, url: urlFor(payment) };
}

// Owner-side: link for pending dues, or the member's renewal landing link.
// Owner-side: the member's renewal landing link, or a payment link for pending dues.
// The vendor copies / shares it themselves; nothing is sent from the platform.
async function linkForMember(ctx, memberId, b) {
    const { venue, settings } = ctx;
    const member = await core.findMember(venue.id, memberId);
    if (b.purpose === "renewal") {
      if (!member.plan_id) throw new AppError("This member has no plan yet. Enroll them first.", 400);
      return { url: U.renewLink(member) };
    }
    const ms = await core.pickMembership(null, member.id);
    const due = ms ? U.money(Number(ms.total_amount) - Number(ms.amount_paid)) : 0;
    if (due <= 0) throw new AppError("No dues pending for this member", 400);
    const amount = b.amount ? Math.min(U.num(b.amount, "Amount", { min: 1 }), due) : due;
    const { payment, url } = await createRequest({ venue, settings, member, amount, membershipId: ms.id });
    return { url, payment };
  }

// Idempotent: turns a pending request into a paid receipt (and creates the renewal when needed).
async function settlePending(venue, settings, paymentId, { mode = "upi", reference, receivedBy, rzpPaymentId } = {}) {
  let result = {};
  await sequelize.transaction(async (tx) => {
    const pay = await GymPayment.findOne({ where: { id: paymentId, venue_id: venue.id }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!pay) throw new AppError("Payment not found", 404);
    if (pay.status === "paid") { result = { pay, already: true }; return; }
    if (pay.status !== "pending") throw new AppError(`This payment is ${pay.status}`, 409);

    const member = await GymMember.findByPk(pay.member_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    let ms = pay.membership_id ? await GymMembership.findByPk(pay.membership_id, { transaction: tx }) : null;
    const intent = pay.meta && pay.meta.intent;
    if (!ms && intent) {
      const plan = await GymPlan.findByPk(intent.plan_id, { transaction: tx });
      if (!plan) throw new AppError("The plan for this renewal no longer exists", 409);
      const today = U.todayIST();
      const start = member.end_date && member.end_date >= today ? U.addDays(member.end_date, 1) : today;
      ms = await core.createMembership(tx, { venueId: venue.id, member, plan, kind: "renewal", start, includePt: intent.include_pt });
      await core.syncMemberFromMembership(tx, member, ms);
    }
    if (!ms) ms = await core.pickMembership(tx, member.id);

    const seq = await core.nextSeq(tx, venue.id, "gym_payments", "receipt_seq");
    await pay.update({
      status: "paid", membership_id: ms ? ms.id : null, mode, paid_on: U.todayIST(), receipt_seq: seq,
      receipt_no: `${settings.receipt_prefix}-${String(seq).padStart(5, "0")}`,
      reference: reference ? String(reference).slice(0, 80) : null, received_by: receivedBy || null, rzp_payment_id: rzpPaymentId || null
    }, { transaction: tx });
    await core.recomputeFinancials(tx, member.id);
    await member.reload({ transaction: tx });
    result = { pay, member };
  });
 
  return result;
}

async function confirm(ctx, paymentId, b = {}) {
  const r = await settlePending(ctx.venue, ctx.settings, paymentId, {
    mode: C.PAYMENT_MODES.includes(b.mode) ? b.mode : "upi", reference: b.reference, receivedBy: ctx.user.name
  });
  return { payment: r.pay, member: r.member ? core.present(r.member) : null };
}

async function cancel(ctx, paymentId) {
  const pay = await GymPayment.findOne({ where: { id: paymentId, venue_id: ctx.venue.id } });
  if (!pay) throw new AppError("Payment not found", 404);
  if (pay.status !== "pending") throw new AppError("Only pending payments can be cancelled", 409);
  if (pay.rzp_link_id) {
    try { await rzpClient(ctx.settings)?.paymentLink.cancel(pay.rzp_link_id); } catch (e) { /* already expired/paid: ignore */ }
  }
  await pay.update({ status: "cancelled" });
  return pay;
}

async function checkLink(pay, cache) {
  let ctx = cache.get(pay.venue_id);
  if (!ctx) {
    const [venue, settings] = await Promise.all([Venue.findByPk(pay.venue_id), GymSettings.findByPk(pay.venue_id)]);
    ctx = { venue, settings, rz: settings ? rzpClient(settings) : null };
    cache.set(pay.venue_id, ctx);
  }
  if (!ctx.venue || !ctx.rz) return null;
  const link = await ctx.rz.paymentLink.fetch(pay.rzp_link_id);
  if (link.status === "paid") {
    await settlePending(ctx.venue, ctx.settings, pay.id, { mode: "razorpay", receivedBy: "Razorpay", rzpPaymentId: link.payments && link.payments[0] && link.payments[0].payment_id });
  } else if (link.status === "expired" || link.status === "cancelled") {
    await pay.update({ status: link.status });
  }
  return link.status;
}

async function refresh(ctx, paymentId) {
  const pay = await GymPayment.findOne({ where: { id: paymentId, venue_id: ctx.venue.id } });
  if (!pay) throw new AppError("Payment not found", 404);
  if (pay.status !== "pending" || !pay.rzp_link_id) return { status: pay.status };
  try { return { status: await checkLink(pay, new Map()) }; }
  catch (e) { throw new AppError(`Could not reach Razorpay: ${e?.error?.description || e.message}`, 502); }
}

// Cron: every 10 minutes
async function pollPendingLinks() {
  const pending = await GymPayment.findAll({
    where: { status: "pending", rzp_link_id: { [Op.ne]: null }, createdAt: { [Op.gt]: new Date(Date.now() - 9 * 86400000) } }, limit: 300
  });
  const cache = new Map();
  for (const p of pending) {
    try { await checkLink(p, cache); } catch (e) { console.error("[GYM] link poll failed:", p.id, e?.error?.description || e.message); }
  }
  await GymPayment.update({ status: "expired" }, { where: { status: "pending", rzp_link_id: null, expires_at: { [Op.lt]: new Date() } } });
}

async function listPayments(venueId, q) {
  const where = { venue_id: venueId };
  if (["pending", "paid", "expired", "cancelled"].includes(q.status)) where.status = q.status;
  if (q.member_id) where.member_id = q.member_id;
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(parseInt(q.limit, 10) || 25, 100);
  const { rows, count } = await GymPayment.findAndCountAll({
    where, order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit,
    include: [{ model: GymMember, as: "member", attributes: ["id", "name", "phone", "member_code"] }]
  });
  return { items: rows, total: count, page, pages: Math.max(Math.ceil(count / limit), 1) };
}

module.exports = { rzpClient, urlFor, createPaidTx, recordManual, createRequest, linkForMember, settlePending, confirm, cancel, refresh, pollPendingLinks, listPayments };