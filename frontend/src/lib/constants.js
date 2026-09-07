export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const BACKEND_URL = API_BASE_URL.replace("/api", ""); // e.g. http://localhost:5000
export const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "venuesafar.com";
export const DISCOVERY_URL = import.meta.env.VITE_DISCOVERY_URL || "http://localhost:3001";
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

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