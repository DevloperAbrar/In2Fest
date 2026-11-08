import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, MessageCircle, Check, Send, FileText, Search, RefreshCw } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, Field, TextArea, errMsg, waUrl } from "./gymShared.jsx";

const fill = (tpl, vars = {}) => String(tpl || "").replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? "");
const SAMPLE = { name: "Rahul", full_name: "Rahul Sharma", gym: "Your Gym", plan: "3 Month Plan", expiry: "15 Nov 2026", days_left: "5", when: "5 din baad", balance: "1,500", link: "https://...", member_id: "M-0001", trainer: "Amit", goal: "muscle gain", trial_date: "20 Nov 2026", gym_phone: "98xxxxxx10", website: "https://yourgym.in2fest.com", date: "21 Oct 2026" };
const sentLabel = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days <= 0 ? "Sent today" : `Sent ${days}d ago`;
};

// Scroll sideways inside its own row (no scrollbar line) on phones, wrap on larger screens.
const chipRow = "flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible";
const segChip = (on) => `tap-scale shrink-0 px-3.5 py-2 md:px-3 md:py-1.5 rounded-full text-[13px] md:text-xs font-semibold border whitespace-nowrap transition-colors ${on ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-200"}`;
const varChip = "tap-scale shrink-0 px-3 py-1.5 md:px-2 md:py-0.5 rounded-full text-[12px] md:text-xs border border-navy-200 bg-white text-navy-600 hover:bg-navy-50";
// Sticky Cancel / Save bar at the bottom of a sheet on phones, plain buttons on larger screens.
const STICKY_BAR = "sticky bottom-0 z-10 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 md:mx-0 md:mb-0 px-5 sm:px-6 md:px-0 py-3 md:py-0 bg-white/95 backdrop-blur border-t border-navy-100/70 md:border-0 md:bg-transparent md:backdrop-blur-none md:static flex gap-2 md:justify-end";

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

// How the message will look in the chat.
function Bubble({ text, caption }) {
  return (
    <div>
      {caption && <p className="text-[11.5px] text-navy-400 mb-1.5">{caption}</p>}
      <div className="rounded-2xl rounded-tl-md bg-emerald-50 border border-emerald-100 px-3.5 py-3 text-[13.5px] leading-relaxed text-navy-800 whitespace-pre-wrap break-words">{text}</div>
    </div>
  );
}

// One numbered section of the Send page.
function Step({ n, title, hint, action, children, className = "" }) {
  return (
    <section className={`rounded-3xl md:rounded-2xl bg-white border border-navy-100/70 shadow-card p-4 md:p-5 min-w-0 ${className}`}>
      <div className="flex items-center gap-3 mb-3.5">
        <span className="w-8 h-8 rounded-full bg-navy-900 text-white text-[13px] font-bold flex items-center justify-center shrink-0 tabular-nums">{n}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[15px] text-navy-900 leading-tight">{title}</h3>
          {hint && <p className="text-[11.5px] text-navy-400 leading-tight mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
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
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-3 rounded-2xl bg-navy-50/60 border border-navy-100/70 px-3.5 py-3">
            <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center shrink-0">{String(person.name || "?")[0]}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900 truncate">{person.name}</p>
              <p className="text-xs text-navy-400 truncate">{person.phone}{person.sub ? ` · ${person.sub}` : ""}</p>
            </div>
          </div>
          <TemplateGroups data={data} bulkOnly value={tplId} onChange={pick} />
          <Field label="Message (you can edit)"><TextArea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          {body && <Bubble text={text} caption="How it will look" />}
          <div className={STICKY_BAR}>
            <Button variant="outline" className="flex-1 md:flex-none" onClick={onClose}>Cancel</Button>
            <Button className="flex-[2] md:flex-none" onClick={send} disabled={!body.trim()}><MessageCircle size={15} /> Open WhatsApp</Button>
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
      <div className="space-y-3 min-w-0">
        {!isSystem && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Template name *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <Select label="Group" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={data.categories.map(([value, label]) => ({ value, label }))} />
          </div>
        )}
        <Field label="Message *"><TextArea rows={6} maxLength={1000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div>
          <p className="text-xs text-navy-500 mb-1.5">Tap to insert (replaced with each person's own details):</p>
          <div className={chipRow}>
            {data.variables.map(([k, label]) => (
              <button key={k} type="button" title={label} onClick={() => setF((s) => ({ ...s, body: `${s.body}{{${k}}}` }))} className={varChip}>{`{{${k}}}`}</button>
            ))}
          </div>
        </div>
        {f.body && <Bubble text={fill(f.body, SAMPLE)} caption="Preview with sample details" />}
        <div className={STICKY_BAR}>
          <Button variant="outline" className="flex-1 md:flex-none" onClick={onClose}>Cancel</Button>
          <Button className="flex-[2] md:flex-none" onClick={save} loading={busy} disabled={!f.body.trim() || (!isSystem && f.title.trim().length < 2)}>Save template</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Templates tab ---------- */
function TemplatesTab({ vid, data, reload }) {
  const [edit, setEdit] = useState(undefined); // undefined = closed, null = new
  const [del, setDel] = useState(null);
  const act = async (fn, ok) => { try { await fn(); showSuccess(ok); reload(); } catch (e) { showError(errMsg(e)); } };
  const iconBtn = "tap-scale w-10 h-10 md:w-8 md:h-8 rounded-xl bg-navy-50 md:bg-transparent text-navy-500 flex items-center justify-center";

  return (
    <div className="min-w-0">
      <button type="button" onClick={() => setEdit(null)}
        className="md:hidden tap-scale w-full h-[54px] mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-semibold text-[14.5px] shadow-card flex items-center justify-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Plus size={18} /></span>
        New template
      </button>
      <div className="hidden md:flex justify-end mb-3"><Button onClick={() => setEdit(null)}><Plus size={15} /> New template</Button></div>

      {data.categories.map(([key, label]) => {
        const list = data.templates.filter((t) => t.category === key);
        if (!list.length) return null;
        return (
          <div key={key} className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <h3 className="font-display font-semibold text-[14px] text-navy-900">{label}</h3>
              <span className="text-[11px] font-semibold text-navy-400 bg-navy-50 rounded-full px-2 py-0.5 tabular-nums">{list.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.map((t) => (
                <div key={t.id} className="rounded-3xl md:rounded-2xl bg-white border border-navy-100/70 shadow-card p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold text-[15px] text-navy-900 leading-snug">{t.title}</p>
                      {t.customised && <span className="inline-block mt-1 text-[10.5px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">Edited</span>}
                    </div>
                    <div className="flex gap-1.5 md:gap-0.5 shrink-0">
                      <button type="button" onClick={() => setEdit(t)} aria-label={`Edit ${t.title}`} className={`${iconBtn} hover:text-primary-600`}><Pencil size={16} /></button>
                      {t.system && t.customised && <button type="button" title="Back to default" aria-label="Back to default" onClick={() => act(() => gymService.msgResetSystem(vid, t.key), "Reset to default")} className={`${iconBtn} hover:text-primary-600`}><RotateCcw size={16} /></button>}
                      {!t.system && <button type="button" onClick={() => setDel(t)} aria-label={`Delete ${t.title}`} className={`${iconBtn} md:hover:text-red-600 text-primary-600 md:text-navy-500 bg-primary-50 md:bg-transparent`}><Trash2 size={16} /></button>}
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl rounded-tl-md bg-emerald-50/70 border border-emerald-100/80 px-3.5 py-2.5">
                    <p className="text-[12.5px] leading-relaxed text-navy-600 whitespace-pre-wrap break-words line-clamp-4">{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {edit !== undefined && <TemplateModal vid={vid} data={data} tpl={edit} onClose={() => setEdit(undefined)} onDone={() => { setEdit(undefined); reload(); }} />}
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} title="Delete template?" confirmText="Delete" message="This cannot be undone."
        onConfirm={async () => { const t = del; setDel(null); await act(() => gymService.msgDeleteTemplate(vid, t.id), "Deleted"); }} />
    </div>
  );
}

/* ---------- Send tab ---------- */
function SendTab({ vid, data }) {
  const initial = new URLSearchParams(window.location.search).get("segment") || "expiring";
  const [segments, setSegments] = useState(null); // null = loading
  const [segFail, setSegFail] = useState(false);
  const [segment, setSegment] = useState(initial);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [people, setPeople] = useState(null);
  const [tplId, setTplId] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(() => new Set());

  const loadSegments = () => {
    setSegFail(false);
    setSegments(null);
    gymService.msgSegments(vid).then((r) => setSegments(r.data.data)).catch(() => { setSegments([]); setSegFail(true); });
  };
  useEffect(() => { loadSegments(); /* eslint-disable-next-line */ }, [vid]);
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
  const opened = items.length - pending.length;
  const current = (segments || []).find((s) => s.key === segment);
  const canSend = !!body.trim();

  const send = (p) => {
    window.open(waUrl(p.wa_phone, fill(body, p.vars)), "_blank", "noopener");
    setDone((s) => new Set(s).add(p.id));
    gymService.msgSent(vid, { items: [{ type: p.type, id: p.id }], label, mark_contacted: p.type === "lead" }).catch(() => {});
  };

  const next = pending[0];
  const previewPerson = next || items[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4 min-w-0">
      <div className="lg:col-span-2 space-y-3 md:space-y-4 min-w-0">
        <Step n="1" title="Who do you want to message?" hint={current ? `${current.label}: ${current.count} ${current.count === 1 ? "person" : "people"}` : "Pick a group"}>
          {segments === null ? (
            <div className="flex gap-1.5 animate-pulse">
              {[88, 104, 76, 96].map((w) => <span key={w} className="h-9 rounded-full bg-navy-50" style={{ width: w }} />)}
            </div>
          ) : segFail ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-[13px] text-red-700">Could not load the groups.</p>
              <button type="button" onClick={loadSegments} className="tap-scale shrink-0 h-10 px-3.5 rounded-xl bg-white border border-red-200 text-red-700 text-[13px] font-semibold flex items-center gap-1.5"><RefreshCw size={14} /> Try again</button>
            </div>
          ) : (
            ["members", "leads"].map((g) => {
              const list = segments.filter((s) => s.group === g);
              if (!list.length) return null;
              return (
                <div key={g} className="mb-3 last:mb-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1.5">{g}</p>
                  <div className={chipRow}>
                    {list.map((s) => (
                      <button key={s.key} type="button" onClick={() => { setSegment(s.key); setDone(new Set()); }} className={segChip(segment === s.key)}>
                        {s.label} <span className="opacity-70 tabular-nums">{s.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </Step>

        <Step n="2" title="Choose the message" hint="Pick a template or write your own">
          <TemplateGroups data={data} bulkOnly value={tplId} onChange={pick} />
          <div className="mt-3">
            <Field label="Message (you can edit it)"><TextArea rows={6} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pick a template or write your own. Use {{name}} to add each person's name." /></Field>
          </div>
          <p className="text-[11.5px] text-navy-400 mt-2 mb-1.5">Tap to add a detail</p>
          <div className={chipRow}>
            {data.variables.slice(0, 9).map(([k]) => (
              <button key={k} type="button" onClick={() => setBody((s) => `${s}{{${k}}}`)} className={varChip}>{`{{${k}}}`}</button>
            ))}
          </div>
          {canSend && (
            <div className="mt-3">
              <Bubble text={fill(body, previewPerson ? previewPerson.vars : SAMPLE)} caption={previewPerson ? `Preview for ${previewPerson.name}` : "Preview with sample details"} />
            </div>
          )}
        </Step>
      </div>

      <div className="lg:col-span-3 min-w-0">
        <Step n="3" title={`Send on WhatsApp${people ? ` (${people.total})` : ""}`} hint="Your chat opens with the message ready"
          action={pending.length > 0 && canSend ? <span className="hidden md:block"><Button onClick={() => send(next)}><MessageCircle size={15} /> Send next</Button></span> : null}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 pointer-events-none" />
            <Input className="pl-9" placeholder="Search name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {!canSend && items.length > 0 && <p className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 px-3.5 py-2.5 text-[12.5px] text-amber-800">Write or pick a message in step 2 to turn on the WhatsApp buttons.</p>}

          {items.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-navy-500 tabular-nums">{opened} of {items.length} opened</span>
                <span className="font-semibold text-navy-700 tabular-nums">{pending.length} left</span>
              </div>
              <div className="h-2 bg-navy-50 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.round((opened / items.length) * 100)}%` }} />
              </div>
            </div>
          )}

          {pending.length > 0 && canSend && (
            <button type="button" onClick={() => send(next)}
              className="md:hidden tap-scale mt-3 w-full h-12 rounded-2xl bg-navy-900 text-white text-[14px] font-semibold flex items-center justify-center gap-2">
              <Send size={16} /> Send next to {String(next.name).split(" ")[0]}
            </button>
          )}

          <div className="mt-3">
            {!people ? <Loader /> : items.length === 0 ? (
              <EmptyState title="No one in this group" description="Pick another group above." />
            ) : (
              <div className="space-y-2 md:space-y-0 md:divide-y md:max-h-[520px] md:overflow-y-auto">
                {items.map((p) => {
                  const isOpened = done.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-navy-100/70 bg-white px-3 py-2.5 md:rounded-none md:border-0 md:bg-transparent md:px-1 md:py-2.5">
                      <span className={`w-10 h-10 rounded-full font-semibold flex items-center justify-center shrink-0 ${p.type === "lead" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>{String(p.name || "?")[0]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] md:text-sm font-semibold md:font-medium text-navy-900 truncate">{p.name}</p>
                        <p className="text-[11.5px] md:text-xs text-navy-400 truncate">{p.phone}{p.sub ? ` · ${p.sub}` : ""}</p>
                        {p.last_sent_at && !isOpened && <p className="text-[11px] text-amber-600">{sentLabel(p.last_sent_at)}</p>}
                      </div>
                      {isOpened ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1.5 text-[12px] font-semibold"><Check size={14} /> Opened</span>
                      ) : (
                        <button type="button" disabled={!canSend} onClick={() => send(p)} aria-label={`Send WhatsApp to ${p.name}`}
                          className="tap-scale shrink-0 h-11 md:h-10 px-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-40">
                          <MessageCircle size={16} /> <span>Send</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {people?.truncated && <p className="text-xs text-navy-400 mt-2">Showing the first 500. Use search to find others.</p>}
          </div>
        </Step>
      </div>
    </div>
  );
}

export default function GymMessages() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data, reload } = useTemplates(vid);
  const [tab, setTab] = useState("send");
  const tabs = [["send", "Send messages", Send], ["templates", "Templates", FileText]];

  return (
    <GymPage title="WhatsApp messages" subtitle="Ready-made templates for renewals, dues, birthdays, offers and leads">
      <div className="min-w-0 max-w-full">
        <div className="mb-4 p-1 rounded-2xl bg-navy-50 flex gap-1 w-full md:max-w-md">
          {tabs.map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`tap-scale flex-1 min-w-0 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] md:text-sm font-semibold ${tab === k ? "bg-white text-navy-900 shadow-card" : "text-navy-500"}`}>
              <Icon size={16} className="shrink-0" /><span className="truncate">{l}</span>
            </button>
          ))}
        </div>
        {!data ? <Loader /> : tab === "send" ? <SendTab vid={vid} data={data} /> : <TemplatesTab vid={vid} data={data} reload={reload} />}
      </div>
    </GymPage>
  );
}