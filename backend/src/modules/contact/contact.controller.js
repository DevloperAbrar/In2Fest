const { Op, fn, col } = require("sequelize");
const { ContactMessage } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

// Keep these keys in sync with the TOPICS list in the discovery-frontend ContactPage.
const TOPICS = [
  "general",
  "list_business",
  "vendor_support",
  "billing",
  "website",
  "partnership",
  "report",
  "feedback"
];
const STATUSES = ["new", "read", "resolved"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

// Removes control characters and trims. Newlines are kept only when asked.
function clean(value, { multiline = false } = {}) {
  let text = String(value == null ? "" : value);
  text = multiline
    ? text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    : text.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ");
  return text.trim();
}

// Returns the bare 10-digit Indian mobile number, or null if invalid.
function normalizeIndianMobile(raw) {
  let digits = String(raw || "").replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  digits = digits.replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&");
}

// POST /api/contact   (public)
async function submitContactMessage(req, res, next) {
  try {
    const body = req.body || {};

    // Honeypot: real visitors never see or fill this field. Pretend success to bots.
    if (clean(body.website)) {
      return res.status(201).json({ success: true, message: "Thanks, we have received your message." });
    }

    const name = clean(body.name);
    if (name.length < 2 || name.length > 100) {
      throw new AppError("Please enter your name", 400);
    }

    const email = clean(body.email).toLowerCase();
    if (email.length > 150 || !EMAIL_RE.test(email)) {
      throw new AppError("Please enter a valid email address", 400);
    }

    let phone = null;
    const rawPhone = clean(body.phone);
    if (rawPhone) {
      const mobile = normalizeIndianMobile(rawPhone);
      if (!mobile) throw new AppError("Please enter a valid 10-digit mobile number", 400);
      phone = `+91${mobile}`;
    }

    const topic = TOPICS.includes(body.topic) ? body.topic : "general";

    const message = clean(body.message, { multiline: true });
    if (message.length < 10) {
      throw new AppError("Please write a little more so we can help you (at least 10 characters)", 400);
    }
    if (message.length > 2000) {
      throw new AppError("Your message is too long. Please keep it under 2000 characters", 400);
    }

    // Same person double-clicking or resending the same text is treated as success.
    const duplicate = await ContactMessage.findOne({
      where: {
        email,
        message,
        createdAt: { [Op.gte]: new Date(Date.now() - DUPLICATE_WINDOW_MS) }
      },
      attributes: ["id"]
    });
    if (duplicate) {
      return res.status(200).json({ success: true, message: "Thanks, we have received your message." });
    }

    const record = await ContactMessage.create({ name, email, phone, topic, message });

    res.status(201).json({
      success: true,
      message: "Thanks, we have received your message.",
      data: { id: record.id }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/contact-messages?status=new|read|resolved&q=text   (super admin)
async function listContactMessages(req, res, next) {
  try {
    const where = {};
    if (STATUSES.includes(req.query.status)) where.status = req.query.status;

    const q = clean(req.query.q).slice(0, 100);
    if (q) {
      const like = `%${escapeLike(q)}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: like } },
        { email: { [Op.iLike]: like } },
        { phone: { [Op.iLike]: like } },
        { message: { [Op.iLike]: like } }
      ];
    }

    const [messages, statusCounts] = await Promise.all([
      ContactMessage.findAll({ where, order: [["createdAt", "DESC"]], limit: 500 }),
      ContactMessage.findAll({
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true
      })
    ]);

    const counts = { new: 0, read: 0, resolved: 0 };
    statusCounts.forEach((row) => {
      counts[row.status] = Number(row.count);
    });

    res.json({ success: true, data: { messages, counts } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/contact-messages/:id   body: { status }   (super admin)
async function updateContactMessage(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) throw new AppError("Invalid status", 400);

    const record = await ContactMessage.findByPk(req.params.id);
    if (!record) throw new AppError("Message not found", 404);

    await record.update({
      status,
      read_at: status === "new" ? null : record.read_at || new Date()
    });

    res.json({ success: true, data: record });
  } catch (err) {
    // A malformed id makes Postgres throw; show it as "not found".
    if (err && err.name === "SequelizeDatabaseError") return next(new AppError("Message not found", 404));
    next(err);
  }
}

// DELETE /api/admin/contact-messages/:id   (super admin)
async function deleteContactMessage(req, res, next) {
  try {
    const record = await ContactMessage.findByPk(req.params.id);
    if (!record) throw new AppError("Message not found", 404);
    await record.destroy();
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    if (err && err.name === "SequelizeDatabaseError") return next(new AppError("Message not found", 404));
    next(err);
  }
}

module.exports = {
  submitContactMessage,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage
};