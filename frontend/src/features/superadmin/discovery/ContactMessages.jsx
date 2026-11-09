import React, { useState } from "react";
import {
  Mail, MessageCircle, CheckCheck, RotateCcw, Trash2, Search, ChevronDown, Phone
} from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import { useDebounce } from "../../../hooks/useDebounce";
import Loader from "../../../components/common/Loader";
import { contactMessageService } from "../../../services/contactMessageService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatDateTime } from "../../../lib/formatters";

const PILL = {
  new: "bg-yellow-100 text-yellow-700",
  read: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700"
};

const TOPIC_LABELS = {
  general: "General question",
  list_business: "List my business",
  vendor_support: "Vendor support",
  billing: "Billing",
  website: "My website",
  partnership: "Partnership",
  report: "Report a listing or review",
  feedback: "Feedback"
};

function whatsappHref(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}`;
}

export default function ContactMessages() {
  const [status, setStatus] = useState("new");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const q = useDebounce(search.trim(), 400);
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const { data, loading, refetch } = useFetch(`/admin/contact-messages?${params.toString()}`);

  const messages = data?.messages || [];
  const counts = data?.counts || { new: 0, read: 0, resolved: 0 };
  const total = counts.new + counts.read + counts.resolved;

  const tabs = [
    { key: "new", label: "New", count: counts.new },
    { key: "read", label: "Read", count: counts.read },
    { key: "resolved", label: "Resolved", count: counts.resolved },
    { key: "", label: "All", count: total }
  ];

  const changeStatus = async (id, next) => {
    try {
      await contactMessageService.updateStatus(id, next);
      showSuccess(
        next === "resolved" ? "Marked as resolved" : next === "read" ? "Marked as read" : "Moved back to new"
      );
      refetch();
    } catch {
      showError("Could not update message");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this message permanently?")) return;
    try {
      await contactMessageService.remove(id);
      showSuccess("Message deleted");
      if (openId === id) setOpenId(null);
      refetch();
    } catch {
      showError("Could not delete message");
    }
  };

  if (loading && !data) {
    return (
      <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Contact Messages">
        <Loader fullScreen />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Contact Messages">
      {/* Status tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key || "all"}
              onClick={() => setStatus(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                status === t.key
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone or message"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-600"
          />
        </div>
      </div>

      {/* Messages table */}
      <div className={`bg-white rounded-xl border border-gray-100 overflow-x-auto ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {q ? "No messages match your search." : "No messages here yet."}
                </td>
              </tr>
            )}

            {messages.map((m) => {
              const open = openId === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr className="border-t border-gray-50 hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">
                      <p className={`${m.status === "new" ? "font-semibold" : "font-medium"}`}>{m.name}</p>
                      <p className="text-xs text-gray-500">{TOPIC_LABELS[m.topic] || "General question"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <a
                          href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to In2Fest")}`}
                          className="inline-flex items-center gap-1.5 text-primary-600 hover:underline break-all"
                        >
                          <Mail size={14} className="shrink-0" /> {m.email}
                        </a>
                        {m.phone && (
                          <div className="flex items-center gap-3">
                            <a
                              href={whatsappHref(m.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary-600 hover:underline"
                            >
                              <MessageCircle size={14} /> {m.phone}
                            </a>
                            <a href={`tel:${m.phone}`} className="text-gray-400 hover:text-gray-600" title="Call">
                              <Phone size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        onClick={() => setOpenId(open ? null : m.id)}
                        className="text-left w-full flex items-start gap-1.5"
                        aria-expanded={open}
                      >
                        <span className="text-gray-700 line-clamp-2">{m.message}</span>
                        <ChevronDown
                          size={15}
                          className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          PILL[m.status] || PILL.read
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {m.status === "new" && (
                          <button
                            onClick={() => changeStatus(m.id, "read")}
                            className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium"
                          >
                            <CheckCheck size={14} /> Read
                          </button>
                        )}
                        {m.status !== "resolved" && (
                          <button
                            onClick={() => changeStatus(m.id, "resolved")}
                            className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"
                          >
                            <CheckCheck size={14} /> Resolve
                          </button>
                        )}
                        {m.status !== "new" && (
                          <button
                            onClick={() => changeStatus(m.id, "new")}
                            className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium"
                          >
                            <RotateCcw size={14} /> Reopen
                          </button>
                        )}
                        <button
                          onClick={() => remove(m.id)}
                          className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {open && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={6} className="px-4 py-4">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Full message</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{m.message}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}