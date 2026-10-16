import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, errMsg } from "./gymShared.jsx";

function AssignModal({ tpl, vid, onClose }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const { data } = useFetch(tpl ? `/venues/${vid}/gym/members?status=active&limit=100&q=${encodeURIComponent(q)}` : null, { skip: !tpl });
  const items = data?.items || [];
  const go = async () => {
    setBusy(true);
    try { const r = await gymService.assignWorkout(vid, tpl.id, { member_ids: sel }); showSuccess(`Assigned to ${r.data.data.assigned} member(s). Open a member to download or share the plan.`); onClose(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen={!!tpl} onClose={onClose} title={`Assign "${tpl?.name || ""}"`}>
      <Input placeholder="Search member" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 max-h-72 overflow-y-auto divide-y">
        {items.map((m) => (
          <label key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <input type="checkbox" checked={sel.includes(m.id)} onChange={() => setSel((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />
            {m.name} <span className="text-gray-400">{m.phone}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy} disabled={!sel.length}>Assign ({sel.length})</Button></div>
    </Modal>
  );
}

export default function WorkoutPlans() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const nav = useNavigate();
  const [tab, setTab] = useState("templates");
  const { data: plans, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/workout-plans?template=${tab === "templates"}` : null, { skip: !vid });
  const [assign, setAssign] = useState(null);
  const [del, setDel] = useState(null);

  const starters = async () => {
    try { const r = await gymService.installStarters(vid); showSuccess(`${r.data.data.installed} starter templates added`); refetch(); } catch (e) { showError(errMsg(e)); }
  };
  const remove = async () => {
    try { await gymService.deleteWorkout(vid, del.id); showSuccess("Deleted"); refetch(); } catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };

  return (
    <GymPage title="Workout plans" subtitle="Build once as a template, assign to many members"
      actions={<Button onClick={() => nav("/dashboard/gym/workouts/new")}><Plus size={15} /> New template</Button>}>
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {[["templates", "Templates"], ["members", "Member plans"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === k ? "bg-white shadow" : "text-gray-500"}`}>{l}</button>
        ))}
      </div>
      {loading ? <Loader /> : !plans?.length ? (
        <EmptyState title={tab === "templates" ? "No templates yet" : "No member plans yet"}
          description={tab === "templates" ? "Start with ready-made Fat Loss, Muscle Gain and Strength templates." : "Assign a template to a member to see it here."}
          action={tab === "templates" && <Button onClick={starters}><Sparkles size={14} /> Add starter templates</Button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Link to={`/dashboard/gym/workouts/${p.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.days.length} days{p.goal ? ` · ${p.goal.replace(/_/g, " ")}` : ""}{p.level ? ` · ${p.level}` : ""}{p.member ? ` · ${p.member.name}` : ""}</p>
              </Link>
              {p.is_template && <Button variant="outline" onClick={() => setAssign(p)}>Assign</Button>}
              <button onClick={() => setDel(p)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {assign && <AssignModal tpl={assign} vid={vid} onClose={() => setAssign(null)} />}
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete workout plan?" confirmText="Delete" message="This cannot be undone." />
    </GymPage>
  );
}