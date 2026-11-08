import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Sparkles, ChevronRight, UserPlus } from "lucide-react";
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
import { TONES } from "./gymUi.jsx";
import { MemberAvatar } from "./memberUi.jsx";

// Colour of the days badge on the mobile card, by goal.
const GOAL_TONE = { fat_loss: "red", muscle_gain: "violet", strength: "amber", flexibility: "sky", endurance: "emerald", general_fitness: "navy", rehab: "sky", other: "navy" };
const LEVEL_CHIP = { beginner: "bg-emerald-50 text-emerald-700", intermediate: "bg-amber-50 text-amber-700", advanced: "bg-primary-50 text-primary-700" };
const words = (s) => String(s || "").replace(/_/g, " ");

// Hand-built drawing for "no workout plans yet".
function EmptyWorkoutArt({ className = "" }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden="true">
      <ellipse cx="80" cy="108" rx="52" ry="7" className="fill-navy-100/70" />
      <rect x="30" y="52" width="14" height="30" rx="5" className="fill-navy-700" />
      <rect x="44" y="45" width="12" height="44" rx="5" className="fill-primary-500" />
      <rect x="56" y="64" width="48" height="6" rx="3" className="fill-navy-300" />
      <rect x="104" y="45" width="12" height="44" rx="5" className="fill-primary-500" />
      <rect x="116" y="52" width="14" height="30" rx="5" className="fill-navy-700" />
      <circle cx="132" cy="28" r="13" className="fill-white stroke-navy-200" strokeWidth="2" />
      <path d="M132 21v14M125 28h14" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" className="stroke-primary-500" />
      <rect x="26" y="22" width="16" height="16" rx="8" className="fill-amber-100" />
    </svg>
  );
}

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
      <div className="mt-3 max-h-[46vh] md:max-h-72 overflow-y-auto space-y-2 md:space-y-0 md:divide-y">
        {items.map((m) => {
          const on = sel.includes(m.id);
          return (
            <label
              key={m.id}
              className={`tap-scale flex items-center gap-3 py-2.5 md:py-2 text-sm rounded-2xl border px-3 md:rounded-none md:border-0 md:bg-transparent md:px-0 ${on ? "border-primary-300 bg-primary-50/60" : "border-navy-100 bg-white"}`}
            >
              <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={on} onChange={() => setSel((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />
              <span className="md:hidden shrink-0"><MemberAvatar name={m.name} src={m.photo_url} size={36} /></span>
              <span className="min-w-0 flex-1 md:flex-none">
                <span className="block md:inline truncate font-medium md:font-normal text-navy-900 md:text-inherit">{m.name}</span>{" "}
                <span className="block md:inline text-xs md:text-sm text-gray-400">{m.phone}</span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 md:mx-0 md:mb-0 mt-4 px-5 sm:px-6 md:px-0 py-3 md:py-0 bg-white/95 backdrop-blur border-t border-navy-100/70 md:border-0 md:bg-transparent md:backdrop-blur-none md:static flex gap-2 md:justify-end">
        <Button variant="outline" className="flex-1 md:flex-none" onClick={onClose}>Cancel</Button>
        <Button className="flex-[2] md:flex-none" onClick={go} loading={busy} disabled={!sel.length}>Assign ({sel.length})</Button>
      </div>
    </Modal>
  );
}

// One plan on mobile (desktop keeps the original list rows below).
function MobilePlanCard({ p, onAssign, onDelete }) {
  const tone = GOAL_TONE[p.goal] || "navy";
  const days = p.days?.length || 0;
  const level = String(p.level || "").toLowerCase();
  return (
    <div className="rounded-3xl bg-white border border-navy-100/70 shadow-card p-4">
      <Link to={`/dashboard/gym/workouts/${p.id}`} className="tap-scale flex items-start gap-3">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${TONES[tone].chip}`}>
          <span className="font-display font-bold text-[20px] leading-none tabular-nums">{days}</span>
          <span className="text-[10px] font-semibold mt-0.5 leading-none">{days === 1 ? "day" : "days"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[15.5px] leading-snug text-navy-900 line-clamp-2">{p.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.goal && <span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-medium capitalize ${TONES[tone].chip}`}>{words(p.goal)}</span>}
            {level && <span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-medium capitalize ${LEVEL_CHIP[level] || "bg-navy-50 text-navy-600"}`}>{level}</span>}
            {p.member && <span className="inline-flex rounded-full bg-navy-50 text-navy-600 px-2.5 py-1 text-[11.5px] font-medium">For {p.member.name}</span>}
          </div>
        </div>
        <ChevronRight size={18} className="text-navy-300 mt-1 shrink-0" />
      </Link>
      <div className="mt-4 flex gap-2">
        {p.is_template ? (
          <button
            type="button"
            onClick={() => onAssign(p)}
            className="tap-scale flex-1 h-11 rounded-2xl bg-navy-900 text-white text-[13.5px] font-semibold flex items-center justify-center gap-2"
          >
            <UserPlus size={15} /> Assign to members
          </button>
        ) : (
          <Link
            to={`/dashboard/gym/workouts/${p.id}`}
            className="tap-scale flex-1 h-11 rounded-2xl bg-navy-50 text-navy-800 text-[13.5px] font-semibold flex items-center justify-center gap-2"
          >
            Open plan
          </Link>
        )}
        <button
          type="button"
          onClick={() => onDelete(p)}
          aria-label={`Delete ${p.name}`}
          className="tap-scale w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
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
      actions={<div className="hidden md:block"><Button onClick={() => nav("/dashboard/gym/workouts/new")}><Plus size={15} /> New template</Button></div>}>

      {/* Mobile: New template button */}
      <button
        type="button"
        onClick={() => nav("/dashboard/gym/workouts/new")}
        className="md:hidden tap-scale w-full h-[54px] mb-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-semibold text-[14.5px] shadow-card flex items-center justify-center gap-2.5"
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Plus size={18} /></span>
        New template
      </button>

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-full md:w-fit">
        {[["templates", "Templates"], ["members", "Member plans"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 md:flex-none py-2.5 md:py-1.5 px-4 rounded-lg text-sm font-medium ${tab === k ? "bg-white shadow" : "text-gray-500"}`}>{l}</button>
        ))}
      </div>

      {loading ? <Loader /> : !plans?.length ? (
        <>
          <div className="md:hidden flex flex-col items-center text-center px-6 py-6">
            <EmptyWorkoutArt className="w-44 h-36" />
            <h3 className="mt-2 font-display font-semibold text-[16px] text-navy-900">{tab === "templates" ? "No templates yet" : "No member plans yet"}</h3>
            <p className="mt-1 text-[13px] text-navy-400 max-w-[280px] leading-snug">
              {tab === "templates" ? "Start with ready-made Fat Loss, Muscle Gain and Strength templates." : "Assign a template to a member to see it here."}
            </p>
            {tab === "templates" && (
              <button
                type="button"
                onClick={starters}
                className="tap-scale mt-4 h-11 px-5 rounded-2xl bg-navy-900 text-white text-[13.5px] font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles size={15} /> Add starter templates
              </button>
            )}
          </div>
          <div className="hidden md:block">
            <EmptyState title={tab === "templates" ? "No templates yet" : "No member plans yet"}
              description={tab === "templates" ? "Start with ready-made Fat Loss, Muscle Gain and Strength templates." : "Assign a template to a member to see it here."}
              action={tab === "templates" && <Button onClick={starters}><Sparkles size={14} /> Add starter templates</Button>} />
          </div>
        </>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {plans.map((p) => (
              <MobilePlanCard key={p.id} p={p} onAssign={setAssign} onDelete={setDel} />
            ))}
          </div>

          {/* Desktop / tablet list (unchanged) */}
          <div className="hidden md:block bg-white rounded-2xl border border-navy-100/60 divide-y">
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
        </>
      )}
      {assign && <AssignModal tpl={assign} vid={vid} onClose={() => setAssign(null)} />}
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete workout plan?" confirmText="Delete" message="This cannot be undone." />
    </GymPage>
  );
}