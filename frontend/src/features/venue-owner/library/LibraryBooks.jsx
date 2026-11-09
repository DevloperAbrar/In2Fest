import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Upload, Pencil, Trash2, BookOpen, RotateCcw, MessageCircle, AlertTriangle } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, MODES, useLib, errMsg, fmtDate, inr, waUrl, Field, TextArea } from "./libraryShared.jsx";
import { CsvImport } from "./libraryUi.jsx";

const VIEWS = [["catalog", "Books"], ["issued", "Issued"], ["overdue", "Overdue"], ["fines", "Fines"], ["returned", "Returned"], ["lost", "Lost"]];
const selectCls = "w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white";
const BOOK_COLS = ["title", "author", "subject", "rack", "copies", "price", "isbn", "publisher", "edition", "language"].map((key) => ({ key, required: key === "title" }));
const BOOK_SAMPLE = [{ title: "Indian Polity", author: "M. Laxmikanth", subject: "UPSC", rack: "A-12", copies: 3, price: 650, isbn: "", publisher: "McGraw Hill", edition: "7th", language: "English" }];

function BookForm({ vid, book, onClose, onSaved }) {
  const [f, setF] = useState({
    title: book?.title || "", author: book?.author || "", subject: book?.subject || "", rack: book?.rack || "", isbn: book?.isbn || "",
    publisher: book?.publisher || "", edition: book?.edition || "", language: book?.language || "",
    total_copies: String(book?.total_copies ?? 1), price: String(book?.price ?? ""), notes: book?.notes || ""
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, title: f.title.trim(), total_copies: Number(f.total_copies), price: f.price === "" ? 0 : Number(f.price) };
      if (book) await libraryService.updateBook(vid, book.id, body); else await libraryService.createBook(vid, body);
      showSuccess("Book saved"); onSaved();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title={book ? "Edit book" : "Add book"} size="lg">
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Title *" value={f.title} onChange={set("title")} />
          <Input label="Author" value={f.author} onChange={set("author")} />
          <Input label="Subject / exam" placeholder="e.g. UPSC, NEET, Novel" value={f.subject} onChange={set("subject")} />
          <Input label="Rack / shelf" placeholder="e.g. A-12" value={f.rack} onChange={set("rack")} />
          <Input label="Number of copies" type="number" min="0" value={f.total_copies} onChange={set("total_copies")} />
          <Input label="Price (₹) - charged if lost" type="number" min="0" value={f.price} onChange={set("price")} />
          <Input label="ISBN" value={f.isbn} onChange={set("isbn")} />
          <Input label="Publisher" value={f.publisher} onChange={set("publisher")} />
          <Input label="Edition" value={f.edition} onChange={set("edition")} />
          <Input label="Language" value={f.language} onChange={set("language")} />
        </div>
        <Field label="Notes"><TextArea rows={2} value={f.notes} onChange={set("notes")} /></Field>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy} disabled={!f.title.trim()}>Save book</Button></div>
      </div>
    </Modal>
  );
}

function IssueModal({ vid, book, settings, onClose, onDone }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [student, setStudent] = useState(null);
  const [days, setDays] = useState(String(settings?.loan_days || 14));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student || q.trim().length < 2) { setFound([]); return undefined; }
    const t = setTimeout(() => {
      libraryService.searchStudents(vid, q.trim()).then((r) => setFound(r.data.data.items)).catch(() => setFound([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, student, vid]);

  const go = async () => {
    setBusy(true);
    try { await libraryService.issueBook(vid, book.id, { student_id: student.id, days: Number(days) }); showSuccess("Book issued"); onDone(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Issue: ${book.title}`} size="md">
      <div className="space-y-3">
        <p className="text-[13px] text-navy-500">{book.available} of {book.total_copies} copies available{book.rack ? ` · Rack ${book.rack}` : ""}</p>
        {student ? (
          <div className="flex items-center justify-between rounded-xl border border-navy-100 p-3">
            <div><p className="font-semibold text-navy-900">{student.name}</p><p className="text-[12.5px] text-navy-500">{student.student_code} · {student.phone} · fee till {fmtDate(student.end_date)}</p></div>
            <button type="button" className="text-sm text-primary-600" onClick={() => setStudent(null)}>Change</button>
          </div>
        ) : (
          <div>
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student by name, phone or ID" className="w-full pl-9 pr-3 py-2 border border-navy-200 rounded-lg text-sm" /></div>
            <div className="mt-2 divide-y divide-navy-50 border border-navy-100 rounded-xl max-h-52 overflow-y-auto">
              {found.map((s) => <button key={s.id} type="button" onClick={() => setStudent(s)} className="w-full text-left px-3 py-2.5 hover:bg-navy-50"><span className="font-medium text-navy-900">{s.name}</span> <span className="text-[12px] text-navy-400">{s.student_code} · {s.phone}</span></button>)}
              {q.trim().length >= 2 && found.length === 0 && <p className="px-3 py-3 text-sm text-navy-400">No active student found.</p>}
            </div>
          </div>
        )}
        <Input label="Loan days" type="number" min="1" max="90" value={days} onChange={(e) => setDays(e.target.value)} />
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy} disabled={!student}>Issue book</Button></div>
      </div>
    </Modal>
  );
}

function ReturnModal({ vid, loan, isOwner, onClose, onDone }) {
  const [action, setAction] = useState("collect");
  const [mode, setMode] = useState("cash");
  const [busy, setBusy] = useState(false);
  const fine = loan.est_fine;
  const go = async () => {
    setBusy(true);
    try {
      await libraryService.returnLoan(vid, loan.id, { fine_action: action, mode });
      showSuccess("Book returned"); onDone();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title="Take book back" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-navy-700"><b>{loan.title}</b><br />from {loan.student_name} ({loan.student_code})</p>
        {fine > 0 ? (
          <>
            <p className="text-sm rounded-xl bg-amber-50 border border-amber-200 text-amber-800 p-3">{loan.days_overdue} days late. Fine: <b>{inr(fine)}</b></p>
            <Field label="Fine"><select className={selectCls} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="collect">Collect now</option><option value="later">Collect later</option>{isOwner && <option value="waive">Waive (no fine)</option>}
            </select></Field>
            {action === "collect" && <Field label="Mode"><select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>}
          </>
        ) : <p className="text-sm text-emerald-700">Returned on time. No fine.</p>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy}>Confirm return</Button></div>
      </div>
    </Modal>
  );
}

function FineModal({ vid, loan, onClose, onDone }) {
  const [amount, setAmount] = useState(String(loan.fine_due));
  const [mode, setMode] = useState("cash");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await libraryService.collectFine(vid, loan.id, { amount: Number(amount), mode }); showSuccess("Fine collected"); onDone(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title="Collect fine" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-navy-600">{loan.student_name} · {loan.title}<br />Fine due: <b className="text-red-600">{inr(loan.fine_due)}</b></p>
        <Input label="Amount (₹)" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Field label="Mode"><select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy} disabled={!(Number(amount) > 0)}>Collect</Button></div>
      </div>
    </Modal>
  );
}

export default function LibraryBooks() {
  const { vid, venue, isOwner } = useLib();
  const [view, setView] = useState("catalog");
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [avail, setAvail] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | "new" | book
  const [issuing, setIssuing] = useState(null);
  const [returning, setReturning] = useState(null);
  const [fining, setFining] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [importing, setImporting] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (view === "catalog") { if (subject) p.set("subject", subject); if (avail) p.set("availability", avail); }
    else p.set("status", view);
    return p.toString();
  }, [q, subject, avail, page, view]);

  const url = vid ? `/venues/${vid}/library/${view === "catalog" ? "books" : "loans"}?${qs}` : null;
  const { data, loading, refetch } = useFetch(url, { skip: !vid });
  const { data: settings } = useFetch(vid ? `/venues/${vid}/library/settings` : null, { skip: !vid });
  const items = data?.items || [];
  const sum = data?.summary || {};
  const pages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  const done = () => { setIssuing(null); setReturning(null); setFining(null); setForm(null); refetch(); };
  const run = async (fn, ok) => { try { await fn(); showSuccess(ok); refetch(); } catch (e) { showError(errMsg(e)); } finally { setConfirm(null); } };
  const libName = venue?.hall_name || "the library";

  const remind = (l) => {
    const text = `Namaste ${l.student_name}, ${libName} ki kitaab "${l.title}" ki wapsi ki tareekh ${fmtDate(l.due_on)} thi (${l.days_overdue} din se der). Kripya jald wapas karein.`;
    window.open(waUrl(`91${l.phone}`, text), "_blank", "noopener");
  };

  const Tile = ({ label, value, tone }) => <Panel className="p-3"><p className="text-[11.5px] text-navy-400">{label}</p><p className={`font-display text-xl font-bold tabular-nums ${tone}`}>{value ?? 0}</p></Panel>;

  return (
    <LibraryPage title="Books" subtitle="Catalogue, issue, return and fines"
      actions={view === "catalog" && <><Button variant="outline" onClick={() => setImporting(true)} className="hidden md:inline-flex"><Upload size={15} /> Import</Button><Button onClick={() => setForm("new")}><Plus size={15} /> Add book</Button></>}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Tile label="Titles / copies" value={`${sum.titles ?? 0} / ${sum.copies ?? 0}`} tone="text-navy-900" />
        <Tile label="Issued now" value={sum.issued} tone="text-sky-600" />
        <Tile label="Overdue" value={sum.overdue} tone="text-red-600" />
        <Tile label="Fines pending" value={inr(sum.fines_due)} tone="text-amber-600" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {VIEWS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setView(k); setPage(1); }} className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border ${view === k ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-100"}`}>{label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={view === "catalog" ? "Search title, author, ISBN or rack" : "Search student or book"} className="w-full pl-9 pr-3 py-2 border border-navy-200 rounded-lg text-sm" /></div>
        {view === "catalog" && (
          <>
            <select value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); }} className="px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white"><option value="">All subjects</option>{(data?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <select value={avail} onChange={(e) => { setAvail(e.target.value); setPage(1); }} className="px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white"><option value="">All</option><option value="available">Available</option><option value="issued">Issued out</option></select>
          </>
        )}
      </div>

      {loading && !data ? <Loader /> : items.length === 0 ? (
        <Panel className="p-10 text-center"><BookOpen className="mx-auto text-navy-300" size={34} /><p className="mt-3 font-semibold text-navy-900">{view === "catalog" ? "No books yet" : "Nothing here"}</p>
          {view === "catalog" && <p className="text-sm text-navy-400">Add books one by one, or import a spreadsheet.</p>}</Panel>
      ) : view === "catalog" ? (
        <div className="grid md:grid-cols-2 gap-2">
          {items.map((b) => (
            <Panel key={b.id} className={`p-3.5 ${b.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900 truncate">{b.title}</p>
                  <p className="text-[12.5px] text-navy-500 truncate">{[b.author, b.subject, b.rack && `Rack ${b.rack}`].filter(Boolean).join(" · ")}</p>
                  <p className={`text-[12.5px] mt-1 font-medium ${b.available > 0 ? "text-emerald-600" : "text-red-600"}`}>{b.available} of {b.total_copies} available{!b.is_active ? " · inactive" : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button onClick={() => setIssuing(b)} disabled={b.available <= 0 || !b.is_active} className="!px-3 !py-1.5 text-[12.5px]">Issue</Button>
                  <button type="button" onClick={() => setForm(b)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500" aria-label="Edit"><Pencil size={15} /></button>
                  {isOwner && <button type="button" onClick={() => setConfirm({ t: "Delete book?", m: "A book that was issued before is deactivated so history stays safe.", go: () => run(async () => { const r = await libraryService.deleteBook(vid, b.id); return r; }, "Done") })} className="p-2 rounded-lg hover:bg-red-50 text-red-500" aria-label="Delete"><Trash2 size={15} /></button>}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <Panel key={l.id} className="p-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900 truncate">{l.title}{l.rack ? <span className="text-[11.5px] text-navy-400 font-normal"> · Rack {l.rack}</span> : null}</p>
                  <p className="text-[12.5px] text-navy-600">{l.student_name} <span className="text-navy-400">{l.student_code} · {l.phone}</span></p>
                  <p className="text-[12.5px] text-navy-500">Issued {fmtDate(l.issued_on)} · Due {fmtDate(l.due_on)}{l.returned_on ? ` · ${l.status === "lost" ? "Lost" : "Returned"} ${fmtDate(l.returned_on)}` : ""}{l.renewals ? ` · renewed ${l.renewals}x` : ""}</p>
                  {l.days_overdue > 0 && <p className="text-[12.5px] font-semibold text-red-600 flex items-center gap-1"><AlertTriangle size={13} /> {l.days_overdue} days overdue · fine so far {inr(l.est_fine)}</p>}
                  {l.fine_amount > 0 && l.status !== "issued" && <p className="text-[12.5px] text-amber-700">Fine {inr(l.fine_amount)} · paid {inr(l.fine_paid)}{l.fine_waived > 0 ? ` · waived ${inr(l.fine_waived)}` : ""}{l.fine_due > 0 ? ` · due ${inr(l.fine_due)}` : ""}</p>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {l.status === "issued" && <Button onClick={() => setReturning(l)} className="!px-3 !py-1.5 text-[12.5px]"><RotateCcw size={13} /> Return</Button>}
                  {l.status === "issued" && l.days_overdue === 0 && <Button variant="outline" onClick={() => run(() => libraryService.renewLoan(vid, l.id), "Renewed")} className="!px-3 !py-1.5 text-[12.5px]">Renew</Button>}
                  {l.status === "issued" && l.days_overdue > 0 && <Button variant="outline" onClick={() => remind(l)} className="!px-3 !py-1.5 text-[12.5px]"><MessageCircle size={13} /> WhatsApp</Button>}
                  {l.status === "issued" && <button type="button" className="text-[12px] text-red-600" onClick={() => setConfirm({ t: "Mark as lost?", m: `${l.student_name} will be charged the fine plus the book price (${inr(l.book_price)}), and one copy is removed from the catalogue.`, go: () => run(() => libraryService.lostLoan(vid, l.id, { fine_action: "later" }), "Marked as lost") })}>Mark lost</button>}
                  {l.fine_due > 0 && l.status !== "issued" && <Button onClick={() => setFining(l)} className="!px-3 !py-1.5 text-[12.5px]">Collect fine</Button>}
                  {l.fine_due > 0 && l.status !== "issued" && isOwner && <button type="button" className="text-[12px] text-navy-500" onClick={() => setConfirm({ t: "Waive this fine?", m: `The ${inr(l.fine_due)} fine will be cleared without payment.`, go: () => run(() => libraryService.waiveFine(vid, l.id), "Fine waived") })}>Waive</button>}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-navy-500">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {form && <BookForm vid={vid} book={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={done} />}
      {issuing && <IssueModal vid={vid} book={issuing} settings={settings} onClose={() => setIssuing(null)} onDone={done} />}
      {returning && <ReturnModal vid={vid} loan={returning} isOwner={isOwner} onClose={() => setReturning(null)} onDone={done} />}
      {fining && <FineModal vid={vid} loan={fining} onClose={() => setFining(null)} onDone={done} />}
      {importing && (
        <CsvImport title="Import books" hint="One book per row. If a title and author already exist, the copies are added to it." columns={BOOK_COLS} sample={BOOK_SAMPLE}
          onImport={async (rows) => (await libraryService.importBooks(vid, rows)).data.data} onClose={() => setImporting(false)} onDone={() => { setImporting(false); refetch(); }} />
      )}
      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)} title={confirm?.t} message={confirm?.m} onConfirm={confirm?.go} />
    </LibraryPage>
  );
}