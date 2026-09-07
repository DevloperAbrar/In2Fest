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