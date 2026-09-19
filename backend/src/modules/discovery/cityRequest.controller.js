const { CityRequest } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Returns the bare 10-digit Indian mobile number, or null if invalid.
// Accepts an optional +91 / 91 / 0 prefix and spaces, dashes, brackets.
function normalizeIndianMobile(raw) {
  let digits = String(raw || "").replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;

  digits = digits.replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

// Returns { contact, contact_key, contact_type } or null if invalid.
function parseContact(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  if (EMAIL_RE.test(value)) {
    return {
      contact: value,
      contact_key: value.toLowerCase(),
      contact_type: "email"
    };
  }

  const mobile = normalizeIndianMobile(value);
  if (mobile) {
    return {
      contact: `+91${mobile}`, // stored in one clean format
      contact_key: mobile,
      contact_type: "phone"
    };
  }

  return null;
}

// POST /api/discovery/city-requests   (public)
async function createCityRequest(req, res, next) {
  try {
    const city = String(req.body.city || "").trim().replace(/\s+/g, " ");
    if (city.length < 2 || city.length > 100) {
      throw new AppError("Please enter a valid city name", 400);
    }

    const parsed = parseContact(req.body.contact);
    if (!parsed) {
      throw new AppError("Enter a valid email or 10-digit mobile number", 400);
    }

    const city_key = city.toLowerCase();

    const [record, created] = await CityRequest.findOrCreate({
      where: { city_key, contact_key: parsed.contact_key },
      defaults: { city, city_key, ...parsed, status: "pending" }
    });

    // Same person asking again for the same city is treated as success.
    res.status(created ? 201 : 200).json({
      success: true,
      data: { id: record.id, city: record.city }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCityRequest };