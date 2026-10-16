import React from "react";
import { useNavigate } from "react-router-dom";
import { Phone, UserPlus } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Select from "../../../components/common/Select";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg } from "./gymShared.jsx";

const STATUSES = [["new", "New"], ["contacted", "Contacted"], ["trial_booked", "Trial booked"], ["trial_done", "Trial done"], ["converted", "Converted"], ["lost", "Lost"]]
  .map(([value, label]) => ({ value, label }));

export default function GymLeads() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const nav = useNavigate();
  const { data: leads, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/leads` : null, { skip: !vid });

  const setStatus = async (lead, status) => {
    try { await gymService.updateLead(vid, lead.id, { status }); showSuccess("Updated"); refetch(); } catch (e) { showError(errMsg(e)); }
  };

  return (
    <GymPage title="Free-trial leads" subtitle="People who tapped “Book free trial” on your website">
      {loading ? <Loader /> : !leads?.length ? (
        <EmptyState title="No leads yet" description="Leads from your website's free-trial button appear here. Check this tab regularly and call them." />
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
          {leads.map((l) => (
            <div key={l.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-medium text-gray-900">{l.name} <span className="text-gray-400 font-normal">{l.phone}</span></p>
                <p className="text-xs text-gray-500">
                  {l.goal ? l.goal.replace(/_/g, " ") : "No goal given"}{l.preferred_time ? ` · prefers ${l.preferred_time}` : ""} · {new Date(l.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="w-40"><Select value={l.status} onChange={(e) => setStatus(l, e.target.value)} options={STATUSES} /></div>
              <a href={`tel:+91${l.phone}`} className="p-2 text-primary-600"><Phone size={16} /></a>
 
              {l.status !== "converted" && (
                <Button variant="outline" onClick={() => nav("/dashboard/gym/members", { state: { lead: l } })}><UserPlus size={14} /> Enroll</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </GymPage>
  );
}