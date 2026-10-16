const { GymPayment, GymWorkoutPlan } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const core = require("./gym.core");
const payments = require("./gym.payments.service");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Builds the text a vendor copies / shares from their own phone. The platform sends nothing.
async function compose(ctx, memberId, q) {
  const { venue, settings } = ctx;
  const member = await core.findMember(venue.id, memberId);
  const today = U.todayIST();
  const base = {
    name: U.firstName(member.name), gym: venue.hall_name, plan: member.plan_name || "",
    expiry: member.end_date ? U.fmtDate(member.end_date) : "", balance: U.inr(member.balance_due)
  };

  switch (q.type) {
    case "renewal": {
      if (!member.end_date) throw new AppError("This member has no plan yet", 400);
      const dl = U.diffDays(today, member.end_date);
      const link = U.renewLink(member);
      if (dl < 0) return { text: U.msg(settings, "winback", { ...base, link }), link };
      const when = dl === 0 ? "aaj" : dl === 1 ? "kal" : `${dl} din baad`;
      return { text: U.msg(settings, "expiry_reminder", { ...base, when, link }), link };
    }
    case "dues": {
      const ms = await core.pickMembership(null, member.id);
      const due = ms ? U.money(Number(ms.total_amount) - Number(ms.amount_paid)) : 0;
      if (due <= 0) throw new AppError("No dues pending for this member", 400);
      let link = "";
      try {
        link = (await payments.createRequest({ venue, settings, member, amount: due, membershipId: ms.id })).url;
      } catch (e) { /* no UPI / Razorpay set up: the text is still useful without a link */ }
      return { text: U.msg(settings, "payment_due", { ...base, balance: U.inr(due), link }), link };
    }
    case "welcome":
      return { text: U.msg(settings, "welcome", base), link: "" };
    case "receipt": {
      const pay = UUID_RE.test(String(q.payment_id)) ? await GymPayment.findOne({ where: { id: q.payment_id, member_id: member.id, status: "paid" } }) : null;
      if (!pay) throw new AppError("Payment not found", 404);
      return { text: U.msg(settings, "receipt", { ...base, amount: U.inr(pay.amount), receipt: pay.receipt_no || "" }), link: "" };
    }
    case "workout": {
      const plan = UUID_RE.test(String(q.plan_id)) ? await GymWorkoutPlan.findOne({ where: { id: q.plan_id, member_id: member.id } }) : null;
      if (!plan) throw new AppError("Workout plan not found", 404);
      const link = `${U.publicApiBase()}/public/gym/workout/${plan.share_token}/pdf`;
      return { text: U.msg(settings, "workout_plan", { ...base, plan: plan.name, link }), link };
    }
    default:
      throw new AppError("Invalid message type", 400);
  }
}

module.exports = { compose };