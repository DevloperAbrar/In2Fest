export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatDate(date, options = {}) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options
  });
}

export function formatDateTime(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Turns a "HH:MM" / "HH:MM:SS" DB time string into 12-hour display
// ("14:30:00" -> "2:30 PM"). Booking start_time/end_time come from
// Postgres TIME columns in this format.
export function formatTime(time) {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const hour = parseInt(hStr, 10);
  if (Number.isNaN(hour)) return "";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${mStr} ${period}`;
}

// Formats a booking's start_time/end_time pair for display.
export function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return "-";
  if (!endTime) return formatTime(startTime);
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

// Formats a booking's date_from/date_to pair (multi-day bookings collapse
// to a single date when both are the same day, or missing date_to).
export function formatDateRange(dateFrom, dateTo) {
  if (!dateFrom) return "-";
  if (!dateTo || dateTo === dateFrom) return formatDate(dateFrom);
  return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
}

// Turns a category/service slug ("sound-lighting") into a readable label
// ("Sound Lighting") for places that only have the raw slug on hand and
// don't want to fetch the full /meta/categories list just to show a name.
export function formatSlugLabel(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function truncate(text, length = 50) {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

export function statusColor(status) {
  const map = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-yellow-100 text-yellow-700",
    negotiating: "bg-orange-100 text-orange-700",
    advance_received: "bg-purple-100 text-purple-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    lost: "bg-gray-100 text-gray-700",
    trial: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    expiring_soon: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
    suspended: "bg-gray-200 text-gray-700",
    in_progress: "bg-orange-100 text-orange-700",
    listed: "bg-green-100 text-green-700",
    not_listed: "bg-red-100 text-red-700"
  };
  return map[status] || "bg-gray-100 text-gray-700";
}