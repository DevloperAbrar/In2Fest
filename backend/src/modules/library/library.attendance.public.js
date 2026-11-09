// Public pages: QR check-in form and the rotating-QR kiosk screen.
// Plain HTML + a normal form POST (no JavaScript), like the gym check-in page.
const express = require("express");
const rateLimit = require("express-rate-limit");
const U = require("../gym/gym.utils");
const core = require("./library.core");
const att = require("./library.attendance.service");

const CSS = `*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f1f5f9;margin:0;padding:16px;color:#0f172a}
.card{max-width:440px;margin:12px auto;background:#fff;border-radius:22px;padding:26px 22px;box-shadow:0 4px 24px #0f172a14;text-align:center}
h1{font-size:24px;margin:0 0 6px;line-height:1.25}.sub{color:#64748b;font-size:15px;margin:0 0 18px;line-height:1.5}
label{display:block;text-align:left;font-weight:700;font-size:16px;margin:16px 0 6px}
input{width:100%;font-size:26px;padding:16px;border:2px solid #cbd5e1;border-radius:14px;text-align:center;letter-spacing:2px;text-transform:uppercase}
input:focus{outline:none;border-color:#16a34a}.hint{color:#64748b;font-size:13px;text-align:left;margin:6px 2px 0;line-height:1.5}
.btn{display:block;width:100%;margin-top:20px;background:#16a34a;color:#fff;border:0;border-radius:16px;padding:18px;font-size:20px;font-weight:800;cursor:pointer}
.icon{width:84px;height:84px;border-radius:50%;margin:4px auto 14px;display:flex;align-items:center;justify-content:center;font-size:44px;color:#fff}
.ok{background:#16a34a}.warn{background:#f59e0b}.bad{background:#dc2626}.info{background:#2563eb}
.big{font-size:30px;font-weight:800;margin:6px 0}.row{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #e2e8f0;font-size:15px;text-align:left}
.err{margin:0 0 6px;padding:12px;border-radius:12px;background:#fef2f2;color:#b91c1c;font-size:15px;font-weight:600}
.kiosk{max-width:640px}.kiosk img{width:min(78vw,460px);height:auto;border-radius:16px;border:3px solid #0b1b3a;padding:8px;background:#fff}`;

const page = (title, inner, head = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${U.esc(title)}</title>${head}
<style>${CSS}</style></head><body><div class="card">${inner}</div></body></html>`;

const send = (res, status, html) =>
  res.status(status).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).send(html);

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase() : "";

const notFound = (res) => send(res, 404, page("Not found",
  `<div class="icon bad">!</div><h1>Link not found</h1><p class="sub">This QR code is not valid any more. Please ask the library for the new one.<br>यह QR अब मान्य नहीं है।</p>`));

function formHtml(action, venue, settings, { error = "", id = "" } = {}) {
  return `<h1>${U.esc(venue.hall_name)}</h1>
<p class="sub">Mark your attendance<br>अपनी हाज़िरी लगाएं</p>
${error ? `<p class="err">${U.esc(error)}</p>` : ""}
<form method="POST" action="${U.esc(action)}" autocomplete="off">
<label for="id">Student ID / स्टूडेंट आईडी</label>
<input id="id" name="id" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" maxlength="20" placeholder="S0012" required value="${U.esc(id)}">
<p class="hint">Example: S0012 (or just 12). You can also type your mobile number.<br>उदाहरण: S0012 (या सिर्फ़ 12) — या अपना मोबाइल नंबर लिखें।</p>
${settings.require_phone ? `<label for="last4">Last 4 digits of your mobile / मोबाइल के आख़िरी 4 अंक</label>
<input id="last4" name="last4" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="1234">` : ""}
<button class="btn" type="submit">Mark Attendance<br><span style="font-size:15px;font-weight:600">हाज़िरी लगाएं</span></button>
</form>`;
}

const actionOf = (req) => String(req.originalUrl || "").split("#")[0];
const rotOf = (req) => ({ k: req.query && req.query.k, w: req.query && req.query.w });

async function formPage(req, res, next) {
  try {
    const gate = await att.findByToken(req.params.token);
    if (!gate) return notFound(res);
    send(res, 200, page("Mark attendance", formHtml(actionOf(req), gate.venue, gate.settings)));
  } catch (e) { next(e); }
}

function resultHtml(out, action) {
  const v = out.venue;
  const who = out.student ? `<div class="big">${U.esc(out.student.name)}</div>` : "";
  const rows = (items) => items.filter(Boolean).map(([a, b]) => `<div class="row"><span>${a}</span><b>${U.esc(b)}</b></div>`).join("");
  const shiftRow = out.shift ? ["Shift", `${out.shift.name} (${core.fmt12(out.shift.start_time)} - ${core.fmt12(out.shift.end_time)})`] : null;
  const again = `<a class="btn" style="text-decoration:none;display:block;background:#0f172a" href="${U.esc(action)}">Back</a>`;
  switch (out.code) {
    case "ok":
      return page("Done", `<div class="icon ok">✓</div><h1>Attendance marked</h1><p class="sub">हाज़िरी लग गई</p>${who}
        ${out.outsideShift ? `<p class="err" style="background:#fff7ed;color:#9a3412">You are outside your shift time.<br>आप अपनी शिफ्ट के समय के बाहर हैं।</p>` : ""}
        ${rows([["Time", fmtTime(out.at)], shiftRow, ["Valid till", U.fmtDate(out.ms.end_date)], out.daysLeft <= 7 ? ["Days left", `${out.daysLeft}`] : null])}`);
    case "out":
      return page("Check-out", `<div class="icon info">→</div><h1>Checked out</h1><p class="sub">फिर मिलेंगे!</p>${who}${rows([["In", fmtTime(out.inAt)], ["Out", fmtTime(out.at)]])}`);
    case "already":
      return page("Already marked", `<div class="icon info">✓</div><h1>Already marked today</h1><p class="sub">आज की हाज़िरी पहले ही लग चुकी है</p>${who}${rows([["Time", fmtTime(out.at)]])}`);
    case "closed":
      return page("Closed", `<div class="icon warn">!</div><h1>Library is closed today</h1><p class="sub">${U.esc(out.reason)}</p>`);
    case "disabled":
      return page("Disabled", `<div class="icon warn">!</div><h1>QR attendance is off</h1><p class="sub">Please ask the library staff to mark your attendance.</p>`);
    case "stale_qr":
      return page("QR expired", `<div class="icon warn">⟳</div><h1>This QR has expired</h1><p class="sub">Please scan the QR shown on the library screen again.<br>कृपया लाइब्रेरी की स्क्रीन पर दिख रहा QR फिर से स्कैन करें।</p>`);
    case "frozen":
      return page("Frozen", `<div class="icon warn">!</div><h1>Your seat is on hold</h1><p class="sub">Please contact the library desk.</p>${who}`);
    case "left":
      return page("Left", `<div class="icon bad">!</div><h1>Not an active student</h1><p class="sub">Please contact the library desk.</p>${who}`);
    case "expired":
      return page("Expired", `<div class="icon bad">!</div><h1>Your fee has expired</h1><p class="sub">${out.date ? `It ended on ${U.esc(U.fmtDate(out.date))}. ` : ""}Please renew at the desk.<br>कृपया फीस जमा करके रिन्यू करें।</p>${who}`);
    case "not_started":
      return page("Not started", `<div class="icon warn">!</div><h1>Your plan has not started</h1><p class="sub">Starts on ${U.esc(U.fmtDate(out.date))}.</p>${who}`);
    case "outside_shift":
      return page("Outside shift", `<div class="icon warn">!</div><h1>This is not your shift time</h1><p class="sub">Your shift: ${out.shift ? U.esc(`${out.shift.name} ${core.fmt12(out.shift.start_time)} - ${core.fmt12(out.shift.end_time)}`) : ""}<br>आपकी शिफ्ट का समय अभी नहीं है।</p>${who}`);
    default:
      return page("Try again", formHtml(action, v, out.settings, { error: out.code === "bad_id" ? "Enter a valid Student ID or mobile number." : "No student found with these details. Check and try again.", id: out.id || "" }));
  }
}

async function submit(req, res, next) {
  try {
    const body = req.body || {};
    const out = await att.checkIn(req.params.token, { id: body.id, last4: body.last4 }, rotOf(req));
    if (out.code === "not_found") return notFound(res);
    out.id = String(body.id || "").slice(0, 20);
    const retry = ["bad_id", "no_student"].includes(out.code);
    send(res, retry ? 200 : 200, resultHtml(out, actionOf(req)));
  } catch (e) { next(e); }
}

// Kiosk: shown on a tablet/PC at the library entrance. The QR changes every minute, so a photo of it
// shared on WhatsApp stops working quickly.
async function kiosk(req, res, next) {
  try {
    const gate = await att.findByKioskToken(req.params.ktoken);
    if (!gate) return notFound(res);
    const { settings, venue } = gate;
    if (settings.qr_mode !== "rotating") {
      return send(res, 200, page("Kiosk", `<h1>${U.esc(venue.hall_name)}</h1><p class="sub">Rotating QR is switched off. Turn on "Rotating QR" in Library settings to use this screen.</p>`));
    }
    const dataUrl = await att.kioskQrDataUrl(settings);
    send(res, 200, page("Attendance QR",
      `<h1>${U.esc(venue.hall_name)}</h1><p class="sub">Scan to mark your attendance<br>हाज़िरी लगाने के लिए स्कैन करें</p><img src="${dataUrl}" alt="Attendance QR"><p class="hint" style="text-align:center">This code refreshes automatically.</p>`,
      `<meta http-equiv="refresh" content="30">`).replace('class="card"', 'class="card kiosk"'));
  } catch (e) { next(e); }
}

const limiter = rateLimit({
  windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again in a minute." }
});

const checkinRouter = express.Router();
checkinRouter.use(limiter);
checkinRouter.get("/:token", formPage);
checkinRouter.post("/:token", submit);

const kioskRouter = express.Router();
kioskRouter.use(limiter);
kioskRouter.get("/:ktoken", kiosk);

module.exports = { checkinRouter, kioskRouter };