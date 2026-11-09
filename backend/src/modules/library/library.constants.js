const LIB_CATEGORY_SLUGS = ["study-library"];
const EXPIRING_DAYS = 7;
const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "other"];
const GENDERS = ["male", "female", "other"];
const LIMITS = { halls: 50, seatsPerHall: 500, shifts: 30, maxMonths: 24, maxDays: 365 };

module.exports = { LIB_CATEGORY_SLUGS, EXPIRING_DAYS, PAYMENT_MODES, GENDERS, LIMITS };