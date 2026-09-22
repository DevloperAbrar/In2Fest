export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const BACKEND_URL = API_BASE_URL.replace("/api", ""); // e.g. http://localhost:5000
export const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "venuesafar.com";
export const DISCOVERY_URL = import.meta.env.VITE_DISCOVERY_URL || "http://localhost:3001";
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Secret, unguessable path for the super-admin login screen.
// Set VITE_ADMIN_LOGIN_PATH in your .env (no leading slash needed, it's added below).
// Falls back to a random-looking default for local dev only - always set your own in production.
const RAW_ADMIN_PATH = import.meta.env.VITE_ADMIN_LOGIN_PATH || "portal-7kq2m9xh4v-secure";
export const ADMIN_LOGIN_PATH = `/${RAW_ADMIN_PATH.replace(/^\/+/, "")}`;

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  VENUE_OWNER: "venue_owner",
  TEAM_MEMBER: "team_member"
};

export const INQUIRY_STATUSES = [
  "new", "contacted", "negotiating", "advance_received",
  "confirmed", "completed", "cancelled", "lost"
];

export const BOOKING_STATUSES = ["confirmed", "in_progress", "completed", "cancelled"];

export const SUBSCRIPTION_STATUSES = ["trial", "active", "expiring_soon", "expired", "suspended"];