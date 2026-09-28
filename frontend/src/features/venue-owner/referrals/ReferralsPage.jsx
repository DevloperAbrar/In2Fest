import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { Copy, Share2, Gift, Clock, Users } from "lucide-react";
import { showSuccess } from "../../../components/common/Toast";

export default function ReferralsPage() {
  const { venue } = useVenue();
  // NOTE: useFetch already unwraps res.data.data, so `data` IS the referral object.
  const { data: ref, loading, error } = useFetch(venue ? "/referrals/me" : null, { skip: !venue });

  if (loading) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Referrals">
        <Loader fullScreen />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Referrals">
        <div className="max-w-xl mx-auto mt-16 text-center bg-white rounded-2xl border border-red-100 p-10">
          <p className="text-sm text-red-600">Could not load referrals: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Free plan / no referral code yet
  if (!ref?.code) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Referrals">
        <div className="max-w-xl mx-auto mt-16 text-center bg-white rounded-2xl border border-navy-100 p-10 shadow-card">
          <Gift size={40} className="mx-auto mb-4 text-navy-300" />
          <h2 className="text-xl font-display font-bold text-navy-900 mb-2">Start earning referral credit</h2>
          <p className="text-sm text-navy-500">
            Upgrade to a paid plan to unlock your unique referral link and earn ₹ credit when friends join In2Fest.
          </p>
          
         <a   href="/dashboard/settings/subscription"
            className="inline-block mt-6 px-6 py-2.5 rounded-full bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
          >
            View Plans
          </a>
        </div>
      </DashboardLayout>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(ref.link);
    showSuccess("Referral link copied!");
  };

  const whatsappText = encodeURIComponent(
    `Join In2Fest — India's platform for wedding & event vendors! Get 12% off your first plan when you sign up using my link: ${ref.link}`
  );

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Referrals">
      {/* Link card */}
      <div className="bg-white rounded-2xl border border-navy-100 shadow-card p-5 mb-6">
        <h2 className="font-display font-semibold text-navy-800 mb-1">Your referral link</h2>
        <p className="text-xs text-navy-400 mb-3">
          Share this link — your friend gets 12% off, you earn 25% credit when they pay.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={ref.link}
            className="flex-1 text-sm bg-navy-50 border border-navy-100 rounded-xl px-3 py-2 text-navy-700 truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Copy size={14} /> Copy
          </button>
          
         <a   href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <Share2 size={14} /> WhatsApp
          </a>
        </div>
        <p className="text-xs text-navy-400 mt-3">
          Your code: <span className="font-semibold text-navy-700">{ref.code}</span>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Gift size={20} className="text-emerald-500" />}
          label="Credit available"
          value={formatCurrency(ref.balance || 0)}
          sub="Ready to use at checkout"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<Clock size={20} className="text-amber-500" />}
          label="Pending credit"
          value={formatCurrency(ref.pending_amount || 0)}
          sub="Releases after 14-day hold"
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Users size={20} className="text-sky-500" />}
          label="Friends paid"
          value={ref.stats?.paid ?? 0}
          sub={`${ref.stats?.invited ?? 0} invited`}
          bg="bg-sky-50"
        />
      </div>

      {/* History table */}
      <div className="bg-white rounded-2xl border border-navy-100 shadow-card p-5">
        <h2 className="font-display font-semibold text-navy-800 mb-4">Referral history</h2>
        {(ref.history || []).length === 0 ? (
          <p className="text-sm text-navy-400 py-6 text-center">
            No referrals yet. Share your link to get started!
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-400 text-xs border-b border-navy-100">
                <th className="pb-2 font-medium">Friend</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Reward</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {ref.history.map((row) => (
                <tr key={row.id} className="border-b border-navy-100/60 last:border-0">
                  <td className="py-2.5 text-navy-700">{row.friend_name}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-navy-50 text-navy-600"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-navy-700">
                    {row.reward_amount ? formatCurrency(row.reward_amount) : "—"}
                  </td>
                  <td className="py-2.5 text-navy-400">{formatDate(row.registered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, sub, bg }) {
  return (
    <div className={`rounded-2xl border border-navy-100 p-4 flex items-start gap-3 ${bg || "bg-white"}`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-navy-500 mb-0.5">{label}</p>
        <p className="text-xl font-display font-bold text-navy-900">{value}</p>
        <p className="text-xs text-navy-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}