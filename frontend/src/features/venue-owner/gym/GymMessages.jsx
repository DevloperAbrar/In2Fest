import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, MessageCircle, Check } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, Field, TextArea, errMsg, waUrl } from "./gymShared.jsx";

const fill = (tpl, vars = {}) => String(tpl || "").replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? "");
const SAMPLE = { name: "Rahul", full_name: "Rahul Sharma", gym: "Your Gym", plan: "3 Month Plan", expiry: "15 Nov 2026", days_left: "5", when: "5 din baad", balance: "1,500", link: "https://...", member_id: "M-0001", trainer: "Amit", goal: "muscle gain", trial_date: "20 Nov 2026", gym_phone: "98xxxxxx10", website: "https://yourgym.in2fest.com", date: "21 Oct 2026" };
const sentLabel = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days <= 0 ? "Sent today" : `Sent ${days}d ago`;
};

function useTemplates(vid) {
  const [data, setData] = useState(null);
  const load = () => gymService.msgTemplates(vid).then((r) => setData(r.data.data)).catch((e) => showError(errMsg(e)));
  useEffect(() => { if (vid) load(); /* eslint-disable-next-line */ }, [vid]);
  return { data, reload: load };
}

function TemplateGroups({ data, bulkOnly, value, onChange }) {
  const groups = data.categories.map(([key, label]) => ({
    label, options: data.templates.filter((t) => t.category === key && (!bulkOnly || t.bulk)).map((t) => ({ value: t.id, label: t.title }))
  })).filter((g) => g.options.length);
  return <Select label="Template" value={value} onChange={(e) => onChange(e.target.value)} options={[{ value: "", label: "Choose a template" }]} groups={groups} />;
}

/* ---------- send a template to one lead or member (used from Leads) ---------- */
export function QuickSendModal({ vid, kind, id, onClose, onSent }) {
  const { data } = useTemplates(vid);
  const [person, setPerson] = useState(null);
  const [tplId, setTplId] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    gymService.msgAudience(vid, kind === "lead" ? { lead_id: id } : { member_id: id })
      .then((r) => setPerson(r.data.data.items[0])).catch((e) => { showError(errMsg(e)); onClose(); });
    // eslint-disable-next-line
  }, [vid, id, kind]);

  const pick = (v) => { setTplId(v); const t = data.templates.find((x) => x.id === v); if (t) setBody(t.body); };
  const text = person ? fill(body, person.vars) : "";
  const label = data?.templates.find((t) => t.id === tplId)?.title || "Custom message";

  const send = () => {
    window.open(waUrl(person.wa_phone, text), "_blank", "noopener");
    gymService.msgSent(vid, { items: [{ type: person.type, id: person.id }], label, mark_contacted: true }).catch(() => {});
    onSent && onSent();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={person ? `WhatsApp ${person.name}` : "WhatsApp"} size="md">
      {!data || !person ? <Loader /> : (
        <div className="space-y-3">
          <TemplateGroups data={data} bulkOnly value={tplId} onChange={pick} />
          <Field label="Message (you can edit)"><TextArea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          {body && <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm whitespace-pre-wrap text-gray-800">{text}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={send} disabled={!body.trim()}><MessageCircle size={15} /> Open WhatsApp</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- create / edit a template ---------- */
function TemplateModal({ vid, data, tpl, onClose, onDone }) {
  const isSystem = !!tpl?.system;
  const [f, setF] = useState({ title: tpl?.title || "", category: tpl?.category || "custom", body: tpl?.body || "" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (isSystem) await gymService.msgSaveSystem(vid, tpl.key, f.body);
      else if (tpl) await gymService.msgUpdateTemplate(vid, tpl.id, f);
      else await gymService.msgCreateTemplate(vid, f);
      showSuccess("Template saved");
      onDone();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={tpl ? (isSystem ? tpl.title : "Edit template") : "New template"} size="lg">
      <div className="space-y-3">
        {!isSystem && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Template name *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <Select label="Group" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={data.categories.map(([value, label]) => ({ value, label }))} />
          </div>
        )}
        <Field label="Message *"><TextArea rows={6} maxLength={1000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Tap to insert (replaced with each person's own details):</p>
          <div className="flex flex-wrap gap-1.5">
            {data.variables.map(([k, label]) => (
              <button key={k} type="button" title={label} onClick={() => setF((s) => ({ ...s, body: `${s.body}{{${k}}}` }))}
                className="px-2 py-0.5 rounded-full text-xs border text-gray-600 hover:bg-gray-50">{`{{${k}}}`}</button>
            ))}
          </div>
        </div>
        {f.body && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Preview</p>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm whitespace-pre-wrap">{fill(f.body, SAMPLE)}</div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!f.body.trim() || (!isSystem && f.title.trim().length < 2)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Templates tab ---------- */
function TemplatesTab({ vid, data, reload }) {
  const [edit, setEdit] = useState(undefined); // undefined = closed, null = new
  const act = async (fn, ok) => { try { await fn(); showSuccess(ok); reload(); } catch (e) { showError(errMsg(e)); } };

  return (
    <>
      <div className="flex justify-end mb-3"><Button onClick={() => setEdit(null)}><Plus size={15} /> New template</Button></div>
      {data.categories.map(([key, label]) => {
        const list = data.templates.filter((t) => t.category === key);
        if (!list.length) return null;
        return (
          <div key={key} className="mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {list.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{t.title}{t.customised && <span className="ml-2 text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">Edited</span>}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEdit(t)} className="p-1.5 text-gray-400 hover:text-primary-600"><Pencil size={15} /></button>
                      {t.system && t.customised && <button title="Back to default" onClick={() => act(() => gymService.msgResetSystem(vid, t.key), "Reset to default")} className="p-1.5 text-gray-400 hover:text-primary-600"><RotateCcw size={15} /></button>}
                      {!t.system && <button onClick={() => window.confirm("Delete this template?") && act(() => gymService.msgDeleteTemplate(vid, t.id), "Deleted")} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap line-clamp-4">{t.body}</p>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
      {edit !== undefined && <TemplateModal vid={vid} data={data} tpl={edit} onClose={() => setEdit(undefined)} onDone={() => { setEdit(undefined); reload(); }} />}
    </>
  );
}

/* ---------- Send tab ---------- */
function SendTab({ vid, data }) {
  const initial = new URLSearchParams(window.location.search).get("segment") || "expiring";
  const [segments, setSegments] = useState([]);
  const [segment, setSegment] = useState(initial);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [people, setPeople] = useState(null);
  const [tplId, setTplId] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(() => new Set());

  useEffect(() => { gymService.msgSegments(vid).then((r) => setSegments(r.data.data)).catch(() => {}); }, [vid]);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    let off = false;
    setPeople(null);
    gymService.msgAudience(vid, { segment, q: dq })
      .then((r) => { if (!off) setPeople(r.data.data); })
      .catch((e) => { if (!off) { setPeople({ items: [], total: 0 }); showError(errMsg(e)); } });
    return () => { off = true; };
  }, [vid, segment, dq]);

  const pick = (v) => { setTplId(v); const t = data.templates.find((x) => x.id === v); if (t) setBody(t.body); };
  const label = data.templates.find((t) => t.id === tplId)?.title || "Custom message";
  const items = people?.items || [];
  const pending = items.filter((p) => !done.has(p.id));

  const send = (p) => {
    window.open(waUrl(p.wa_phone, fill(body, p.vars)), "_blank", "noopener");
    setDone((s) => new Set(s).add(p.id));
    gymService.msgSent(vid, { items: [{ type: p.type, id: p.id }], label, mark_contacted: p.type === "lead" }).catch(() => {});
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <Card title="1. Who do you want to message?">
          {["members", "leads"].map((g) => (
            <div key={g} className="mb-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1.5">{g}</p>
              <div className="flex flex-wrap gap-1.5">
                {segments.filter((s) => s.group === g).map((s) => (
                  <button key={s.key} onClick={() => { setSegment(s.key); setDone(new Set()); }}
                    className={`px-3 py-1 rounded-full text-xs border ${segment === s.key ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`}>
                    {s.label} ({s.count})
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card title="2. Choose the message">
          {data && <TemplateGroups data={data} bulkOnly value={tplId} onChange={pick} />}
          <div className="mt-3">
            <Field label="Message (you can edit it)"><TextArea rows={6} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pick a template or write your own. Use {{name}} to add each person's name." /></Field>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data?.variables.slice(0, 9).map(([k]) => (
              <button key={k} type="button" onClick={() => setBody((s) => `${s}{{${k}}}`)} className="px-2 py-0.5 rounded-full text-[11px] border text-gray-500">{`{{${k}}}`}</button>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card title={`3. Send on WhatsApp${people ? ` (${people.total})` : ""}`}
          action={pending.length > 0 && body.trim() && <Button onClick={() => send(pending[0])}><MessageCircle size={15} /> Send next</Button>}>
          <Input placeholder="Search name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
          <p className="text-xs text-gray-500 my-2">Tap WhatsApp for each person. Your chat opens with the message ready, you press send from your own phone.</p>
          {!people ? <Loader /> : items.length === 0 ? (
            <EmptyState title="No one in this group" description="Pick another group above." />
          ) : (
            <div className="divide-y max-h-[520px] overflow-y-auto">
              {items.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name} <span className="text-gray-400 font-normal">{p.phone}</span></p>
                    <p className="text-xs text-gray-500 truncate">{p.sub}</p>
                    {p.last_sent_at && !done.has(p.id) && <p className="text-[11px] text-amber-600">{sentLabel(p.last_sent_at)}</p>}
                  </div>
                  {done.has(p.id)
                    ? <span className="text-xs text-green-600 flex items-center gap-1"><Check size={14} /> Opened</span>
                    : <Button variant="outline" disabled={!body.trim()} onClick={() => send(p)}><MessageCircle size={14} /> WhatsApp</Button>}
                </div>
              ))}
            </div>
          )}
          {people?.truncated && <p className="text-xs text-gray-400 mt-2">Showing the first 500. Use search to find others.</p>}
        </Card>
      </div>
    </div>
  );
}

export default function GymMessages() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data, reload } = useTemplates(vid);
  const [tab, setTab] = useState("send");

  return (
    <GymPage title="WhatsApp messages" subtitle="Ready-made templates for renewals, dues, birthdays, offers and leads">
      <div className="flex gap-1 mb-4">
        {[["send", "Send messages"], ["templates", "Templates"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${tab === k ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>{l}</button>
        ))}
      </div>
      {!data ? <Loader /> : tab === "send" ? <SendTab vid={vid} data={data} /> : <TemplatesTab vid={vid} data={data} reload={reload} />}
    </GymPage>
  );
}