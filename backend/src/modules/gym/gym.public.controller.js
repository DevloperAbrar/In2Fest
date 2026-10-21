const QRCode = require("qrcode");
const { Op } = require("sequelize");
const { Venue, GymPlan, GymMember, GymLead, GymPayment } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const U = require("./gym.utils");
const C = require("./gym.constants");
const core = require("./gym.core");
const payments = require("./gym.payments.service");
 
const workout = require("./gym.workout.service");
const store = require("./gym.store.service");
const invoicePdf = require("./gym.store.invoice");
const { getSettings } = require("./gym.insights.service");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function gymVenue(id) {
  const venue = UUID_RE.test(String(id)) ? await Venue.findOne({ where: { id, is_active: true } }) : null;
  const cats = venue ? [venue.business_category, ...(venue.secondary_categories || [])] : [];
  if (!venue || !cats.some((c) => C.GYM_CATEGORY_SLUGS.includes(c))) throw new AppError("Gym not found", 404);
  return venue;
}

/* ---------------- JSON endpoints ---------------- */
async function plans(req, res, next) {
  try {
    const venue = await gymVenue(req.params.venueId);
    const rows = await GymPlan.findAll({ where: { venue_id: venue.id, is_active: true }, order: [["sort_order", "ASC"], ["duration_value", "ASC"], ["price", "ASC"]] });
    res.json({
      success: true,
      data: rows.map((p) => {
        const q = core.quote(p, { firstTime: true });
        return {
          id: p.id, name: p.name, description: p.description, duration_unit: p.duration_unit, duration_value: p.duration_value,
          price: Number(p.price), final_price: U.money(q.base - q.discount), discount_percent: Number(p.discount_percent),
          joining_fee: Number(p.joining_fee), is_popular: p.is_popular
        };
      })
    });
  } catch (e) { next(e); }
}

async function trial(req, res, next) {
    try {
      if (req.body.website) return res.status(201).json({ success: true, message: "Thanks!" }); // honeypot
      const venue = await gymVenue(req.params.venueId);
      const name = String(req.body.name || "").trim().slice(0, 80);
      if (name.length < 2) throw new AppError("Please enter your name", 400);
      const phone = U.normalizePhone(req.body.phone);
      const recent = await GymLead.findOne({ where: { venue_id: venue.id, phone, createdAt: { [Op.gt]: new Date(Date.now() - 86400000) } } });
      if (!recent) {
        await GymLead.create({
          venue_id: venue.id, name, phone, goal: C.GOALS.includes(req.body.goal) ? req.body.goal : null,
          preferred_time: String(req.body.preferred_time || "").trim().slice(0, 40) || null, source: "website"
        });
      }
      res.status(201).json({ success: true, message: "Thanks! The gym will contact you shortly." });
    } catch (e) { next(e); }
  }

const workoutPdf = (req, res, next) => workout.pdfByToken(req.params.token, res).catch(next);

/* ---------------- tiny HTML pages (no JS, so they pass helmet's CSP) ---------------- */
const page = (title, inner) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${U.esc(title)}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f6f7fb;margin:0;padding:20px;color:#111}
.card{max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 16px #0001}
h1{font-size:20px;margin:0 0 4px}.muted{color:#667;font-size:14px}.amt{font-size:36px;font-weight:800;margin:14px 0}
.btn{display:block;width:100%;box-sizing:border-box;text-align:center;background:#16a34a;color:#fff;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:700;text-decoration:none;margin-top:12px;cursor:pointer}
.btn.alt{background:#111}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee;font-size:14px}img{display:block;margin:14px auto}</style>
</head><body><div class="card">${inner}</div></body></html>`;

const send = (res, status, html) => res.status(status).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).send(html);
const notFoundPage = (res) => send(res, 404, page("Not found", `<h1>Link not found</h1><p class="muted">This link is invalid or has expired. Please contact your gym.</p>`));

async function loadByMemberToken(token) {
  const member = token ? await GymMember.findOne({ where: { portal_token: token, is_archived: false } }) : null;
  const venue = member ? await Venue.findOne({ where: { id: member.venue_id, is_active: true } }) : null;
  return member && venue ? { member, venue } : null;
}

async function renewPage(req, res, next) {
  try {
    const ctx = await loadByMemberToken(req.params.token);
    if (!ctx) return notFoundPage(res);
    const { member, venue } = ctx;
    const plan = member.plan_id ? await GymPlan.findByPk(member.plan_id) : null;
    const settings = await getSettings(venue.id);
    const canPay = !!(payments.rzpClient(settings) || venue.upi_id);
    const head = `<h1>${U.esc(venue.hall_name)}</h1><p class="muted">Hi ${U.esc(U.firstName(member.name))}, renew your membership</p>`;
    if (!plan || !plan.is_active || !canPay || member.status === "frozen") {
      const tel = U.waFromAny(venue.phone);
      return send(res, 200, page("Renew", `${head}<p>Please contact the gym to renew your membership.</p>${tel ? `<a class="btn alt" href="tel:+${U.esc(tel)}">Call the gym</a>` : ""}`));
    }
    const q = core.quote(plan, { includePt: member.has_pt, firstTime: false });
    const status = member.end_date ? (member.end_date >= U.todayIST() ? `Valid till ${U.fmtDate(member.end_date)}` : `Expired on ${U.fmtDate(member.end_date)}`) : "";
    send(res, 200, page("Renew membership", `${head}
      <div class="row"><span>Plan</span><b>${U.esc(plan.name)}</b></div>
      ${status ? `<div class="row"><span>Current status</span><b>${U.esc(status)}</b></div>` : ""}
      <div class="amt">₹${U.inr(q.total)}</div>
      <form method="POST" action="${U.esc(U.publicApiBase())}/public/gym/renew/${U.esc(req.params.token)}"><button class="btn" type="submit">Renew &amp; Pay</button></form>`));
  } catch (e) { next(e); }
}

async function renewStart(req, res, next) {
  try {
    const ctx = await loadByMemberToken(req.params.token);
    if (!ctx) return notFoundPage(res);
    const { member, venue } = ctx;
    const plan = member.plan_id ? await GymPlan.findByPk(member.plan_id) : null;
    if (!plan || !plan.is_active || member.status === "frozen") return res.redirect(303, `${U.publicApiBase()}/public/gym/renew/${req.params.token}`);
    const settings = await getSettings(venue.id);
    const q = core.quote(plan, { includePt: member.has_pt, firstTime: false });
    const { url } = await payments.createRequest({ venue, settings, member, amount: q.total, intent: { plan_id: plan.id, include_pt: member.has_pt } });
    res.redirect(303, url);
  } catch (e) { next(e); }
}

async function payPage(req, res, next) {
  try {
    const pay = await GymPayment.findOne({ where: { pay_token: req.params.token } });
    if (!pay) return notFoundPage(res);
    const venue = await Venue.findOne({ where: { id: pay.venue_id, is_active: true } });
    const member = await GymMember.findByPk(pay.member_id);
    if (!venue || !member) return notFoundPage(res);
    const head = `<h1>${U.esc(venue.hall_name)}</h1><p class="muted">Payment for ${U.esc(member.name)}</p>`;

    if (pay.status === "paid") return send(res, 200, page("Paid", `${head}<div class="amt">✅ Paid</div><p class="muted">Receipt ${U.esc(pay.receipt_no || "")}. Thank you!</p>`));
    if (pay.status !== "pending" || (pay.expires_at && pay.expires_at < new Date())) return send(res, 410, page("Expired", `${head}<p>This payment link has expired. Please ask the gym for a new one.</p>`));
    if (pay.rzp_link_url) return res.redirect(302, pay.rzp_link_url);
    if (!venue.upi_id) return notFoundPage(res);

    const note = `${venue.hall_name} membership`.slice(0, 40);
    const upi = `upi://pay?pa=${encodeURIComponent(venue.upi_id)}&pn=${encodeURIComponent(venue.hall_name)}&am=${Number(pay.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    const qr = await QRCode.toDataURL(upi, { margin: 1, width: 240 });
    const claimed = pay.meta && pay.meta.claimed_at;
    send(res, 200, page("Pay with UPI", `${head}
      <div class="amt">₹${U.inr(pay.amount)}</div>
      <a class="btn" href="${U.esc(upi)}">Pay with UPI app</a>
      <img src="${qr}" width="240" height="240" alt="UPI QR code">
      <p class="muted" style="text-align:center">UPI ID: ${U.esc(venue.upi_id)}</p>
      ${claimed
        ? `<p style="text-align:center"><b>Thanks! The gym will confirm your payment shortly.</b></p>`
        : `<form method="POST" action="${U.esc(U.publicApiBase())}/public/gym/pay/${U.esc(req.params.token)}/claimed"><button class="btn alt" type="submit">I have paid</button></form>`}`));
  } catch (e) { next(e); }
}

async function payClaimed(req, res, next) {
    try {
      const pay = await GymPayment.findOne({ where: { pay_token: req.params.token, status: "pending" } });
      if (pay && !(pay.meta && pay.meta.claimed_at)) {
        await pay.update({ meta: { ...pay.meta, claimed_at: new Date().toISOString() } });
      }
      res.redirect(303, `${U.publicApiBase()}/public/gym/pay/${req.params.token}`);
    } catch (e) { next(e); }
  }

  
  async function storeData(req, res, next) {
    try {
      const v = await gymVenue(req.params.venueId);
      res.json({ success: true, data: await store.publicStore((v && v.id) || req.params.venueId) });
    } catch (e) { next(e); }
  }
  
  async function invoice(req, res, next) {
    try {
      const sale = await store.publicInvoice(req.params.token);
      const [venue, st] = await Promise.all([Venue.findByPk(sale.venue_id), store.getSettings(sale.venue_id)]);
      invoicePdf.render(res, venue, store.presentSale(sale), { inline: true, terms: st.invoice_terms || "" });
    } catch (e) { next(e); }
  }
  
  module.exports = { plans, trial, workoutPdf, renewPage, renewStart, payPage, payClaimed, storeData, invoice };