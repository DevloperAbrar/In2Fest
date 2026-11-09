// Public QR check-in page. Plain HTML + a normal form POST (no JavaScript), same style as the renew / card pages.
const express = require("express");
const rateLimit = require("express-rate-limit");
const U = require("./gym.utils");
const att = require("./gym.attendance.service");

const CSS = `*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f1f5f9;margin:0;padding:16px;color:#0f172a}
.card{max-width:440px;margin:12px auto;background:#fff;border-radius:22px;padding:26px 22px;box-shadow:0 4px 24px #0f172a14;text-align:center}
h1{font-size:24px;margin:0 0 6px;line-height:1.25}.sub{color:#64748b;font-size:15px;margin:0 0 18px;line-height:1.5}
label{display:block;text-align:left;font-weight:700;font-size:16px;margin:16px 0 6px}
input{width:100%;font-size:26px;padding:16px;border:2px solid #cbd5e1;border-radius:14px;text-align:center;letter-spacing:2px;text-transform:uppercase}
input:focus{outline:none;border-color:#16a34a}.hint{color:#64748b;font-size:13px;text-align:left;margin:6px 2px 0;line-height:1.5}
.btn{display:block;width:100%;margin-top:20px;background:#16a34a;color:#fff;border:0;border-radius:16px;padding:18px;font-size:20px;font-weight:800;cursor:pointer;text-decoration:none}
.btn.dark{background:#0f172a}.icon{width:84px;height:84px;border-radius:50%;margin:4px auto 14px;display:flex;align-items:center;justify-content:center;font-size:44px;color:#fff}
.ok{background:#16a34a}.warn{background:#f59e0b}.bad{background:#dc2626}.info{background:#2563eb}
.big{font-size:30px;font-weight:800;margin:6px 0}.row{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #e2e8f0;font-size:15px;text-align:left}
.err{margin:0 0 6px;padding:12px;border-radius:12px;background:#fef2f2;color:#b91c1c;font-size:15px;font-weight:600}
.note{margin-top:14px;padding:12px;border-radius:12px;font-size:14px;background:#fff7ed;color:#9a3412;text-align:left}`;

const page = (title, inner) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${U.esc(title)}</title>
<style>${CSS}</style></head><body><div class="card">${inner}</div></body></html>`;

const send = (res, status, html) =>
  res.status(status).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).send(html);

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase() : "";

const notFound = (res) =>
  send(res, 404, page("Not found", `<div class="icon bad">!</div><h1>Link not found</h1><p class="sub">This QR code is not valid any more. Please ask your gym for the new one.<br>यह QR अब मान्य नहीं है। कृपया जिम से नया QR लें।</p>`));

function formHtml(action, venue, settings, { error = "", id = "" } = {}) {
  return `<h1>${U.esc(venue.hall_name)}</h1>
<p class="sub">Mark your attendance<br>अपनी हाज़िरी लगाएं</p>
${error ? `<p class="err">${U.esc(error)}</p>` : ""}
<form method="POST" action="${U.esc(action)}" autocomplete="off">
<label for="id">Member ID / मेंबर आईडी</label>
<input id="id" name="id" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" maxlength="20" placeholder="M0012" required value="${U.esc(id)}">
<p class="hint">Example: M0012 (or just 12). You can also type your mobile number.<br>उदाहरण: M0012 (या सिर्फ़ 12) — या अपना मोबाइल नंबर लिखें।</p>
${settings.require_phone ? `<label for="last4">Last 4 digits of your mobile / मोबाइल के आख़िरी 4 अंक</label>
<input id="last4" name="last4" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="1234">` : ""}
<button class="btn" type="submit">Mark Attendance<br><span style="font-size:15px;font-weight:600">हाज़िरी लगाएं</span></button>
</form>`;
}

const actionOf = (req) => String(req.originalUrl || "").split("?")[0];

async function formPage(req, res, next) {
  try {
    const gate = await att.findByToken(req.params.token);
    if (!gate) return notFound(res);
    send(res, 200, page("Mark attendance", formHtml(actionOf(req), gate.venue, gate.settings)));
  } catch (e) { next(e); }
}

async function submit(req, res, next) {
  try {
    const body = req.body || {};
    const out = await att.checkIn(req.params.token, { id: body.id, last4: body.last4 });
    if (out.code === "not_found") return notFound(res);
    const { venue, settings, member } = out;
    const gym = U.esc(venue.hall_name);
    const first = member ? U.esc(U.firstName(member.name)) : "";
    const result = (status, tone, icon, title, text, extra = "") =>
      send(res, status, page("Attendance", `<div class="icon ${tone}">${icon}</div><h1>${title}</h1><p class="sub">${text}</p>${extra}<p class="sub" style="margin:14px 0 0">${gym}</p>`));

    switch (out.code) {
      case "disabled":
        return result(200, "warn", "!", "QR attendance is off", "Please ask the gym staff to mark your attendance.<br>कृपया जिम स्टाफ से हाज़िरी लगवाएं।");
      case "closed":
        return result(200, "warn", "!", "Gym is closed today", `${U.esc(out.reason)}.<br>आज जिम बंद है।`);
      case "bad_id":
      case "no_member":
        return send(res, 422, page("Mark attendance", formHtml(actionOf(req), venue, settings, {
          error: out.shared_phone
            ? "This mobile number is used by more than one member. Please enter your Member ID (example: M0012). / यह नंबर एक से ज़्यादा मेंबर का है, कृपया अपना मेंबर आईडी डालें।"
            : "We could not find this ID. Please check and try again. / यह आईडी नहीं मिली, कृपया दोबारा जांचें।",
          id: String(body.id || "").slice(0, 20)
        })));
      case "frozen":
        return result(403, "info", "❄", `Hi ${first}`, "Your membership is frozen right now. Please contact the gym.<br>आपकी मेंबरशिप अभी फ्रीज़ है, कृपया जिम से संपर्क करें।");
      case "not_started":
        return result(403, "warn", "!", `Hi ${first}`, `Your membership starts on <b>${U.esc(U.fmtDate(out.date))}</b>.<br>आपकी मेंबरशिप ${U.esc(U.fmtDate(out.date))} से शुरू होगी।`);
      case "expired":
        return result(403, "bad", "✕", `Hi ${first}`,
          `Your membership ${out.date ? `ended on <b>${U.esc(U.fmtDate(out.date))}</b>` : "has ended"}. Please renew to continue.<br>आपकी मेंबरशिप ख़त्म हो गई है, कृपया रिन्यू करें।`,
          `<a class="btn dark" href="${U.esc(U.publicApiBase())}/public/gym/renew/${U.esc(member.portal_token)}">Renew now / रिन्यू करें</a>`);
      case "already":
        return result(200, "info", "✓", `Hi ${first}`,
          `Your attendance is already marked${out.at ? ` at <b>${U.esc(fmtTime(out.at))}</b>` : " today"}.<br>आपकी हाज़िरी पहले ही लग चुकी है।`);
      case "ok": {
        const left = out.daysLeft;
        const valid = `<div class="row"><span>Membership valid till</span><b>${U.esc(U.fmtDate(out.ms.end_date))}</b></div>`;
        const soon = left <= 7 ? `<div class="note">Your membership ends in ${left} day${left === 1 ? "" : "s"}. Please renew soon.<br>आपकी मेंबरशिप ${left} दिन में ख़त्म होगी, कृपया जल्दी रिन्यू करें।</div>` : "";
        return result(200, "ok", "✓", `Welcome, ${first}!`,
          `Attendance marked<br>आपकी हाज़िरी लग गई`,
          `<div class="big">${U.esc(fmtTime(out.at))}</div><p class="sub" style="margin:0 0 10px">${U.esc(U.fmtDate(U.todayIST()))}</p>${valid}${soon}`);
      }
      default:
        return notFound(res);
    }
  } catch (e) { next(e); }
}

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => send(res, 429, page("Please wait", `<div class="icon warn">!</div><h1>Too many tries</h1><p class="sub">Please wait a few minutes and try again.<br>कृपया कुछ मिनट बाद दोबारा कोशिश करें।</p>`))
});
// Only FAILED tries count (wrong ID, expired...), so a busy gym on one WiFi is never blocked by normal check-ins.
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 40, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => send(res, 429, page("Please wait", `<div class="icon warn">!</div><h1>Too many tries</h1><p class="sub">Please wait a few minutes and try again.<br>कृपया कुछ मिनट बाद दोबारा कोशिश करें।</p>`))
});

const router = express.Router();
router.get("/:token", getLimiter, formPage);
router.post("/:token", postLimiter, submit);

module.exports = router;