import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Trash2, ChevronUp, ChevronDown, ClipboardList } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, Field, TextArea, GOALS, BODY_PARTS, BODY_PART_GROUPS, errMsg } from "./gymShared.jsx";
import { TONES } from "./gymUi.jsx";

const LEVELS = [{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }];
const newDay = (n) => ({ title: `Day ${n}`, focus: [], notes: "", exercises: [] });
const label = (s) => s.replace(/_/g, " ");

// Each day gets its own colour for the number badge on mobile.
const DAY_TONES = ["red", "sky", "emerald", "amber", "violet", "navy", "red"];

function ExercisePicker({ isOpen, onClose, vid, onPick }) {
  const [group, setGroup] = useState("");
  const [part, setPart] = useState("");
  const [equip, setEquip] = useState("");
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState({ name: "", part: "", save: false });
  const { data, loading } = useFetch(isOpen ? `/venues/${vid}/gym/exercises` : null, { skip: !isOpen });
  const list = useMemo(() => data || [], [data]);
  const g = BODY_PART_GROUPS.find((x) => x.key === group);

  const inGroup = useMemo(() => list.filter((e) => !g || g.parts.includes(e.body_part)), [list, g]);
  const equipment = useMemo(() => [...new Set(inGroup.map((e) => e.equipment).filter(Boolean))].sort(), [inGroup]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return inGroup.filter((e) => (!part || e.body_part === part) && (!equip || e.equipment === equip) && (!n || e.name.toLowerCase().includes(n)));
  }, [inGroup, part, equip, q]);
  const subParts = g ? g.parts.filter((p) => list.some((e) => e.body_part === p)) : [];
  const chip = (on) => `tap-scale px-3.5 py-1.5 md:px-3 md:py-1 rounded-full text-[13px] md:text-xs border ${on ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`;

  const addCustom = async () => {
    const name = custom.name.trim();
    if (!name) return;
    try {
      let exercise_id;
      if (custom.save && custom.part) {
        const r = await gymService.createExercise(vid, { name, body_part: custom.part });
        exercise_id = r.data.data.id;
      }
      onPick({ exercise_id, name, body_part: custom.part || part || null });
      setCustom({ name: "", part: "", save: false });
      onClose();
    } catch (e) { showError(errMsg(e)); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add exercise" size="lg">
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button onClick={() => { setGroup(""); setPart(""); setEquip(""); }} className={chip(!group)}>All ({list.length})</button>
        {BODY_PART_GROUPS.map((x) => (
          <button key={x.key} onClick={() => { setGroup(x.key); setPart(""); setEquip(""); }} className={chip(group === x.key)}>
            {x.label} ({list.filter((e) => x.parts.includes(e.body_part)).length})
          </button>
        ))}
      </div>
      {subParts.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-2 pl-1 border-l-2 border-primary-200">
          <button onClick={() => setPart("")} className={chip(!part)}>All {g.label.toLowerCase()}</button>
          {subParts.map((p) => <button key={p} onClick={() => setPart(p)} className={`${chip(part === p)} capitalize`}>{label(p)}</button>)}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2"><Input placeholder="Search exercise" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={equip} onChange={(e) => setEquip(e.target.value)} options={[{ value: "", label: "Any equipment" }, ...equipment.map((v) => ({ value: v, label: v }))]} />
      </div>
      <p className="text-xs text-gray-400 mt-2">{shown.length} exercises</p>
      <div className="mt-1 max-h-[40vh] md:max-h-64 overflow-y-auto divide-y">
        {loading ? <Loader /> : shown.map((ex) => (
          <button key={ex.id} onClick={() => { onPick({ exercise_id: ex.id, name: ex.name, body_part: ex.body_part }); onClose(); }}
            className="w-full text-left py-3 md:py-2 px-1 flex flex-col md:flex-row md:justify-between gap-0.5 md:gap-2 text-sm hover:bg-gray-50 active:bg-navy-50 md:active:bg-transparent">
            <span>{ex.name}</span>
            <span className="text-[11.5px] md:text-xs text-gray-400 capitalize md:whitespace-nowrap">{label(ex.body_part)}{ex.equipment ? ` · ${ex.equipment}` : ""}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 md:pt-3 md:border-t">
        <div className="space-y-2 rounded-2xl bg-navy-50/50 border border-navy-100/70 p-3 md:rounded-none md:bg-transparent md:border-0 md:p-0">
          <p className="text-xs text-gray-500">Not in the list? Add your own</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Input placeholder="Exercise name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></div>
            <Select value={custom.part} onChange={(e) => setCustom({ ...custom, part: e.target.value })} options={[{ value: "", label: "Body part" }, ...BODY_PARTS.map((p) => ({ value: p, label: label(p) }))]} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 flex items-center gap-2">
              <input type="checkbox" checked={custom.save} disabled={!custom.part} onChange={(e) => setCustom({ ...custom, save: e.target.checked })} /> Save to my exercise library
            </label>
            <Button variant="outline" disabled={!custom.name.trim()} onClick={addCustom}>Add</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function WorkoutBuilder() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const memberId = sp.get("member");
  const nav = useNavigate();
  const { venue } = useVenue();
  const vid = venue?.id;
  const isNew = id === "new";

  const [plan, setPlan] = useState({ name: "", goal: "", level: "beginner", duration_weeks: "", notes: "", days: [newDay(1)] });
  const [loading, setLoading] = useState(!isNew);
  const [picker, setPicker] = useState(null); // index of the day being edited
  const [busy, setBusy] = useState(false);
  const [forMember, setForMember] = useState(null);

  useEffect(() => {
    if (isNew || !vid) return;
    gymService.getWorkout(vid, id)
      .then((r) => {
        const p = r.data.data;
        setPlan({ name: p.name, goal: p.goal || "", level: p.level || "", duration_weeks: p.duration_weeks || "", notes: p.notes || "", days: p.days });
        setForMember(p.member || null);
      })
      .catch((e) => showError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, isNew, vid]);

  const setDay = (i, patch) => setPlan((p) => ({ ...p, days: p.days.map((d, k) => (k === i ? { ...d, ...patch } : d)) }));
  const setEx = (di, ei, patch) =>
    setDay(di, { exercises: plan.days[di].exercises.map((e, k) => (k === ei ? { ...e, ...patch } : e)) });
  const removeEx = (di, ei) => setDay(di, { exercises: plan.days[di].exercises.filter((_, k) => k !== ei) });
  const move = (di, ei, dir) => {
    const list = [...plan.days[di].exercises];
    const j = ei + dir;
    if (j < 0 || j >= list.length) return;
    [list[ei], list[j]] = [list[j], list[ei]];
    setDay(di, { exercises: list });
  };
  const toggleFocus = (di, bp) => {
    const cur = plan.days[di].focus;
    setDay(di, { focus: cur.includes(bp) ? cur.filter((x) => x !== bp) : [...cur, bp] });
  };
  const addExercise = (di, ex) =>
    setDay(di, { exercises: [...plan.days[di].exercises, { ...ex, sets: 3, reps: "10-12", rest_sec: 60 }] });

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...plan, duration_weeks: plan.duration_weeks || null };
      if (isNew) await gymService.createWorkout(vid, { ...body, is_template: !memberId, member_id: memberId || undefined });
      else await gymService.updateWorkout(vid, id, body);
      showSuccess("Workout plan saved");
      nav(memberId ? `/dashboard/gym/members/${memberId}` : "/dashboard/gym/workouts");
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  if (loading) return <GymPage title="Workout plan"><Loader /></GymPage>;

  const iconBtn = "tap-scale w-9 h-9 md:w-auto md:h-auto md:p-1 flex items-center justify-center rounded-xl bg-navy-50 md:bg-transparent text-gray-400";

  return (
    <GymPage
      title={isNew ? (memberId ? "Custom plan for member" : "New template") : "Edit workout plan"}
      subtitle={forMember ? `For ${forMember.name}` : undefined}
      actions={<Button onClick={save} loading={busy} disabled={!plan.name}>Save plan</Button>}
    >
      <Card className="mb-4">
        {/* Mobile heading for this block */}
        <div className="md:hidden flex items-center gap-2.5 mb-3">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${TONES.sky.chip}`}>
            <ClipboardList size={16} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="font-display font-semibold text-[14px] text-navy-900 leading-tight">Plan details</p>
            <p className="text-[11.5px] text-navy-400 leading-tight mt-0.5">Name, goal, level and notes</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2"><Input label="Plan name *" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} /></div>
          <Select label="Goal" value={plan.goal} onChange={(e) => setPlan({ ...plan, goal: e.target.value })} options={[{ value: "", label: "Select goal" }, ...GOALS]} />
          <Select label="Level" value={plan.level} onChange={(e) => setPlan({ ...plan, level: e.target.value })} options={LEVELS} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="col-span-2 sm:col-span-1"><Input label="Weeks" inputMode="numeric" value={plan.duration_weeks} onChange={(e) => setPlan({ ...plan, duration_weeks: e.target.value })} /></div>
          <div className="col-span-2 sm:col-span-3">
            <Field label="General notes (warm-up, diet tips, safety)">
              <TextArea rows={2} value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} />
            </Field>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {plan.days.map((d, di) => {
          const tone = DAY_TONES[di % DAY_TONES.length];
          return (
            <Card key={di}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-9 h-9 md:w-7 md:h-7 rounded-full md:bg-primary-600 md:text-white text-sm md:text-xs font-semibold flex items-center justify-center flex-shrink-0 ${TONES[tone].chip}`}>{di + 1}</span>
                <Input value={d.title} onChange={(e) => setDay(di, { title: e.target.value })} placeholder="e.g. Chest + Triceps" />
                {plan.days.length > 1 && (
                  <button onClick={() => setPlan((p) => ({ ...p, days: p.days.filter((_, k) => k !== di) }))} aria-label={`Remove day ${di + 1}`} className="tap-scale p-2.5 md:p-2 rounded-xl bg-primary-50 text-primary-600 md:bg-transparent md:text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                )}
              </div>
              <p className="md:hidden text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1.5">Focus</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[...BODY_PARTS, ...d.focus.filter((x) => !BODY_PARTS.includes(x))].map((bp) => (
                  <button key={bp} onClick={() => toggleFocus(di, bp)}
                    className={`tap-scale px-3 py-1.5 md:px-2.5 md:py-0.5 rounded-full text-[12.5px] md:text-xs border capitalize ${d.focus.includes(bp) ? "bg-primary-50 border-primary-500 text-primary-700" : "text-gray-500"}`}>
                    {label(bp)}
                  </button>
                ))}
              </div>

              <div className="md:hidden flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Exercises</p>
                <span className="text-[11.5px] text-navy-400 tabular-nums">{d.exercises.length === 0 ? "Rest day" : `${d.exercises.length} added`}</span>
              </div>
              {d.exercises.length === 0 && <p className="text-sm text-gray-400 mb-2">No exercises. Leave empty for a rest day.</p>}
              <div className="space-y-2">
                {d.exercises.map((e, ei) => (
                  <div key={ei} className="border rounded-2xl md:rounded-xl p-3 md:p-2.5 bg-navy-50/40 md:bg-transparent">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                        {e.body_part && <p className="md:hidden text-[11.5px] text-navy-400 capitalize mt-0.5">{label(e.body_part)}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-0 flex-shrink-0">
                        <button onClick={() => move(di, ei, -1)} aria-label="Move up" className={iconBtn}><ChevronUp size={16} /></button>
                        <button onClick={() => move(di, ei, 1)} aria-label="Move down" className={iconBtn}><ChevronDown size={16} /></button>
                        <button onClick={() => removeEx(di, ei)} aria-label="Remove exercise" className={`${iconBtn} hover:text-red-600`}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Input label="Sets" inputMode="numeric" value={e.sets} onChange={(ev) => setEx(di, ei, { sets: ev.target.value })} />
                      <Input label="Reps" value={e.reps} onChange={(ev) => setEx(di, ei, { reps: ev.target.value })} />
                      <Input label="Rest (sec)" inputMode="numeric" value={e.rest_sec} onChange={(ev) => setEx(di, ei, { rest_sec: ev.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-3 w-full md:w-auto h-11 md:h-auto items-center border-dashed md:border-solid" onClick={() => setPicker(di)}><Plus size={14} /> Add exercise</Button>
            </Card>
          );
        })}
      </div>

      {plan.days.length < 7 && (
        <Button variant="outline" className="mt-3 w-full md:w-auto h-12 md:h-auto items-center border-dashed md:border-solid" onClick={() => setPlan((p) => ({ ...p, days: [...p.days, newDay(p.days.length + 1)] }))}>
          <Plus size={14} /> Add day
        </Button>
      )}

      {/* Mobile: save at the end of the page so it is within reach after a long plan */}
      <div className="md:hidden mt-5">
        <Button className="w-full h-12 items-center" onClick={save} loading={busy} disabled={!plan.name}>Save plan</Button>
      </div>

      <ExercisePicker isOpen={picker !== null} onClose={() => setPicker(null)} vid={vid} onPick={(ex) => addExercise(picker, ex)} />
    </GymPage>
  );
}