import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { GymPage, StatusPill, errMsg } from "./gymShared.jsx";
import { Surface, EmptyState, InitialsAvatar } from "./gymUi.jsx";
import { useGymVariant } from "./gymVariant.js";

export default function AcademyProgress() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { terms } = useGymVariant();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    if (!vid) return undefined;
    let off = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await gymService.acListMembers(vid, { q: q.trim(), page, limit: 20 });
        if (off) return;
        const d = r.data.data;
        setData((prev) => ({ items: page === 1 ? d.items : [...prev.items, ...d.items], pages: d.pages }));
      } catch (e) { if (!off) showError(errMsg(e)); } finally { if (!off) setLoading(false); }
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [vid, q, page]);

  return (
    <GymPage title="Progress" subtitle={`Record test results and track how each ${terms.person.toLowerCase()} improves`}>
      <Input placeholder={`Search ${terms.people.toLowerCase()} by name, mobile or ID`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 space-y-2">
        {data.items.length === 0 && !loading && (
          <Surface className="p-6"><EmptyState title={`No ${terms.people.toLowerCase()} found`} description={`Add ${terms.people.toLowerCase()} from the ${terms.people} tab first.`} /></Surface>
        )}
        {data.items.map((m) => (
          <Link key={m.id} to={`/dashboard/gym/progress/${m.id}`} className="tap-scale block">
            <Surface className="p-3 flex items-center gap-3">
              <InitialsAvatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[14px] text-navy-900 truncate">{m.name}</p>
                <p className="text-xs text-navy-400">{m.member_code} · {m.phone}</p>
              </div>
              <StatusPill status={m.display_status} daysLeft={m.days_left} />
              <ChevronRight size={16} className="text-navy-300 shrink-0" />
            </Surface>
          </Link>
        ))}
        {loading && <Loader />}
        {!loading && page < data.pages && <Button variant="outline" className="w-full" onClick={() => setPage((p) => p + 1)}>Load more</Button>}
      </div>
    </GymPage>
  );
}