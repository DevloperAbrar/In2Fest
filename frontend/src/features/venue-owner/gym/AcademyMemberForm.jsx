import React from "react";
import { UserRound, Users, Trophy, HeartPulse } from "lucide-react";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import { Field, TextArea } from "./gymShared.jsx";
import { SheetSection } from "./memberUi.jsx";

// Add-member sections for Sports Academy and Studio accounts. Gym accounts never use this file.
// Sport / class details are saved through the academy profile API right after the member is created.

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GENDER_OPTIONS = [
  { value: "", label: "Select" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];
const MAX_DISCIPLINES = 8;

const digits = (v) => String(v || "").replace(/\D/g, "");

export const EMPTY_PROFILE = { disciplines: [], fields: {}, levels: {}, school: "", blood_group: "", kit_size: "", parent_phone: "" };

// Same rule as the server (gym.utils normalizePhone), so a bad number is caught before the member is created.
function phoneOk(v) {
  let d = digits(v);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d);
}

// Returns an error message, or "" when the extra fields are fine.
export function profileProblem(pf) {
  if (String(pf.parent_phone || "").trim() && !phoneOk(pf.parent_phone)) return "Enter a valid 10-digit parent mobile number";
  return "";
}

export function hasProfileData(pf, healthNotes) {
  return Boolean(
    pf.disciplines.length || pf.school.trim() || pf.blood_group || pf.kit_size.trim() || pf.parent_phone.trim() || String(healthNotes || "").trim()
  );
}

// Body for PUT /academy/members/:id/profile. Only the chosen sports / classes are sent.
export function buildProfilePayload(pf, healthNotes) {
  const fields = {};
  const levels = {};
  pf.disciplines.forEach((dk) => {
    if (pf.fields[dk]) fields[dk] = pf.fields[dk];
    if (pf.levels[dk]) levels[dk] = pf.levels[dk];
  });
  return {
    disciplines: pf.disciplines,
    fields,
    levels,
    school: pf.school,
    blood_group: pf.blood_group,
    kit_size: pf.kit_size,
    parent_phone: pf.parent_phone,
    medical_notes: String(healthNotes || "").trim().slice(0, 1000)
  };
}

export function batchLabel(b) {
  const days = (b.days || []).map((d) => DAY[d]).join(" ");
  const full = b.capacity && b.student_count >= b.capacity;
  return `${b.name}${days ? ` · ${days}` : ""} · ${b.start_time}-${b.end_time}${full ? " (full)" : ""}`;
}

function ageText(dob) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "";
  const now = new Date();
  const [y, m, d] = dob.split("-").map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age >= 0 && age < 120 ? `${age} years old` : "";
}

export default function AcademyEnrollSections({ f, set, pf, setPf, config, terms, group }) {
  const isSport = group === "sport";
  const disciplines = config?.disciplines || [];
  const byKey = Object.fromEntries(disciplines.map((d) => [d.key, d]));
  const today = new Date().toISOString().slice(0, 10);
  const age = ageText(f.dob);

  const toggle = (k) =>
    setPf((p) => {
      if (p.disciplines.includes(k)) return { ...p, disciplines: p.disciplines.filter((x) => x !== k) };
      if (p.disciplines.length >= MAX_DISCIPLINES) return p;
      return { ...p, disciplines: [...p.disciplines, k] };
    });
  const setField = (dk, fk, v) => setPf((p) => ({ ...p, fields: { ...p.fields, [dk]: { ...(p.fields[dk] || {}), [fk]: v } } }));
  const setLevel = (dk, v) => setPf((p) => ({ ...p, levels: { ...p.levels, [dk]: v } }));
  const setP = (k) => (e) => setPf((p) => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <SheetSection icon={UserRound} title={`${terms.person} details`} hint="Name and mobile are required" tone="emerald">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Name *" value={f.name} onChange={set("name")} />
          <Input label={isSport ? "Mobile * (parent or student)" : "Mobile *"} inputMode="numeric" maxLength={10} value={f.phone} onChange={set("phone")} />
          <div>
            <Input label="Date of birth" type="date" max={today} value={f.dob} onChange={set("dob")} />
            {age && <p className="mt-1 text-xs text-navy-400">{age}</p>}
          </div>
          <Select label="Gender" value={f.gender} onChange={set("gender")} options={GENDER_OPTIONS} />
          {isSport && <Input label="School / college" maxLength={120} value={pf.school} onChange={setP("school")} />}
          {isSport && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Height (optional)" placeholder="e.g. 150 cm" maxLength={30} value={f.height} onChange={set("height")} />
              <Input label="Weight (optional)" placeholder="e.g. 42 kg" maxLength={30} value={f.weight} onChange={set("weight")} />
            </div>
          )}
        </div>
      </SheetSection>

      <SheetSection icon={Users} title={isSport ? "Parent / guardian" : "Parent / guardian (for children)"} hint="Optional for adults" tone="sky">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Parent / guardian name" maxLength={100} value={f.parent_name} onChange={set("parent_name")} />
          <Input label="Parent mobile" inputMode="numeric" maxLength={14} value={pf.parent_phone} onChange={setP("parent_phone")} />
          <Input label="Emergency contact name" value={f.emergency_name} onChange={set("emergency_name")} />
          <Input label="Emergency contact phone" inputMode="numeric" value={f.emergency_phone} onChange={set("emergency_phone")} />
        </div>
      </SheetSection>

      <SheetSection
        icon={Trophy}
        title={isSport ? "Sport details" : "Class details"}
        hint={isSport ? "Which sports does this student play?" : "Which classes does this member take?"}
        tone="amber"
      >
        {!config ? (
          <p className="text-sm text-navy-400">Loading...</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {disciplines.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggle(d.key)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium ${pf.disciplines.includes(d.key) ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {pf.disciplines.map((dk) => {
              const d = byKey[dk];
              if (!d) return null;
              return (
                <div key={dk} className="rounded-xl border border-navy-100 bg-white p-3">
                  <p className="text-sm font-semibold text-navy-800 mb-2">{d.label}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {d.levels.length > 0 && (
                      <Select
                        label={d.level_label}
                        value={pf.levels[dk] || ""}
                        onChange={(e) => setLevel(dk, e.target.value)}
                        options={[{ value: "", label: "Not set" }, ...d.levels.map((l) => ({ value: l, label: l }))]}
                      />
                    )}
                    {d.fields.map((fd) =>
                      fd.type === "select" ? (
                        <Select
                          key={fd.key}
                          label={fd.label}
                          value={pf.fields[dk]?.[fd.key] || ""}
                          onChange={(e) => setField(dk, fd.key, e.target.value)}
                          options={[{ value: "", label: "Not set" }, ...fd.options.map((o) => ({ value: o, label: o }))]}
                        />
                      ) : (
                        <Input
                          key={fd.key}
                          label={fd.label}
                          maxLength={fd.max || 40}
                          value={pf.fields[dk]?.[fd.key] || ""}
                          onChange={(e) => setField(dk, fd.key, e.target.value)}
                        />
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </SheetSection>

      <SheetSection icon={HeartPulse} title="Health and address" hint="Optional" tone="red">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Blood group" value={pf.blood_group} onChange={setP("blood_group")} options={[{ value: "", label: "Not set" }, ...BLOOD.map((b) => ({ value: b, label: b }))]} />
          {isSport && <Input label="Kit / jersey size" maxLength={10} value={pf.kit_size} onChange={setP("kit_size")} placeholder="e.g. M" />}
        </div>
        <Field label="Injury, allergy or medical note"><TextArea value={f.health_notes} onChange={set("health_notes")} /></Field>
        <Field label="Address (optional)"><TextArea rows={2} maxLength={300} value={f.address} onChange={set("address")} /></Field>
      </SheetSection>
    </>
  );
}