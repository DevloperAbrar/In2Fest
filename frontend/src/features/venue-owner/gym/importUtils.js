// Zero-dependency CSV helpers for the member import. Everything here runs in the browser.

const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");

export const FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "first_name", label: "First name (only if name is split)" },
  { key: "last_name", label: "Last name (only if name is split)" },
  { key: "phone", label: "Mobile", required: true },
  { key: "email", label: "Email" },
  { key: "gender", label: "Gender" },
  { key: "dob", label: "Date of birth", date: true },
  { key: "plan", label: "Plan / package" },
  { key: "start_date", label: "Plan start date", date: true },
  { key: "end_date", label: "Plan end / expiry date", date: true },
  { key: "joined_on", label: "Joining date", date: true },
  { key: "fee", label: "Plan amount (₹)" },
  { key: "paid", label: "Amount paid (₹)" },
  { key: "due", label: "Balance due (₹)" },
  { key: "trainer_name", label: "Trainer" },
  { key: "goal", label: "Goal" },
  { key: "notes", label: "Notes / remarks" },
  { key: "health_notes", label: "Health / medical notes" },
  { key: "emergency_name", label: "Emergency contact name" },
  { key: "emergency_phone", label: "Emergency contact phone" },
  { key: "old_id", label: "Old member ID" }
];

// normalised header text -> our field
const SYN = {
  name: ["name", "membername", "fullname", "customername", "clientname", "member", "customer", "client", "studentname"],
  first_name: ["firstname", "fname", "givenname"],
  last_name: ["lastname", "lname", "surname", "familyname"],
  phone: ["phone", "mobile", "mobileno", "mobilenumber", "phoneno", "phonenumber", "contact", "contactno", "contactnumber", "cell", "cellphone", "whatsapp", "whatsappno", "whatsappnumber", "primaryphone", "mobile1", "mob", "mobno"],
  email: ["email", "emailid", "emailaddress", "mail", "mailid"],
  gender: ["gender", "sex"],
  dob: ["dob", "dateofbirth", "birthdate", "birthday", "bday"],
  plan: ["plan", "planname", "package", "packagename", "membership", "membershiptype", "membershipplan", "membershipname", "subscription", "scheme", "plantype"],
  start_date: ["startdate", "startingdate", "planstart", "planstartdate", "membershipstart", "membershipstartdate", "from", "fromdate", "start", "begindate"],
  end_date: ["enddate", "expirydate", "expiredate", "expiry", "expires", "validtill", "validuntil", "validupto", "planend", "planenddate", "membershipend", "membershipenddate", "to", "todate", "end", "renewaldate", "nextrenewal"],
  joined_on: ["joiningdate", "joindate", "dateofjoining", "doj", "admissiondate", "registrationdate", "enrolldate", "enrolmentdate", "membersince", "joinedon", "joined"],
  fee: ["fee", "fees", "amount", "totalamount", "planamount", "planfee", "price", "packageamount", "packagefee", "total", "totalfees", "membershipfee", "netamount"],
  paid: ["paid", "amountpaid", "paidamount", "received", "receivedamount", "paymentreceived", "collected", "totalpaid", "paymentdone"],
  due: ["due", "balance", "balanceamount", "pending", "pendingamount", "dueamount", "balancedue", "outstanding", "remaining", "remainingamount", "dues"],
  trainer_name: ["trainer", "trainername", "coach", "coachname", "ptname", "assignedtrainer", "instructor"],
  goal: ["goal", "fitnessgoal", "objective", "purpose"],
  notes: ["notes", "note", "remarks", "remark", "comments", "comment"],
  health_notes: ["healthnotes", "medical", "medicalhistory", "healthissues", "injury", "medicalconditions", "healthcondition", "medicalnotes"],
  emergency_name: ["emergencyname", "emergencycontact", "emergencycontactname", "guardian", "guardianname", "emergencyperson"],
  emergency_phone: ["emergencyphone", "emergencycontactnumber", "emergencycontactphone", "guardianphone", "emergencymobile", "emergencynumber", "emergencycontactno"],
  old_id: ["memberid", "id", "membercode", "memberno", "membershipno", "regno", "registrationno", "registrationnumber", "code", "customerid", "srno", "sno"]
};
const LOOKUP = {};
Object.entries(SYN).forEach(([key, list]) => list.forEach((s) => { LOOKUP[s] = key; }));

/* ---------- reading the file ---------- */
export function decodeBuffer(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new Error("This looks like an Excel (.xlsx) file. In Excel choose File > Save As > CSV (Comma delimited) and upload that file.");
  }
  if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes); // older Excel "CSV" files
  }
}

function sniffDelimiter(src) {
  const sample = src.slice(0, 2000);
  let best = ",", bestCount = 0;
  for (const d of [",", ";", "\t", "|"]) {
    const n = sample.split(d).length - 1;
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

// Returns { headers, records: [{ line, cells }] }. `line` is the record number in the file (header row = the row above the first record).
export function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, "");
  const delim = sniffDelimiter(src);
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }

  const all = rows.map((cells, i) => ({ cells, line: i + 1 })).filter((r) => r.cells.some((c) => String(c).trim() !== ""));
  if (!all.length) return { headers: [], records: [] };

  // The header is the row (among the first 10) whose cells look most like known column names. Skips report titles.
  let best = 0, bestScore = -1;
  for (let i = 0; i < Math.min(all.length, 10); i++) {
    const score = all[i].cells.filter((c) => LOOKUP[norm(c)]).length;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  const headers = all[best].cells.map((c, i) => String(c).trim() || `Column ${i + 1}`);
  return { headers, records: all.slice(best + 1) };
}

export function autoMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const key = LOOKUP[norm(h)];
    if (key && map[key] == null) map[key] = i;
  });
  return map;
}

/* ---------- dates ---------- */
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

// Returns { iso } ("" when blank) or { bad: rawText } when the text is not a real date.
export function parseDate(value, fmt = "dmy") {
  const raw = String(value == null ? "" : value).trim();
  if (!raw || /^(-+|na|n\/a|nil|null|none|0000-00-00|00\/00\/0000)$/i.test(raw)) return { iso: "" };
  let y, m, d, mt;
  if ((mt = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = raw.match(/^(\d{1,2})[-/. ]+([A-Za-z]{3,9})[-/. ,]+(\d{2,4})(?:\s.*)?$/))) { d = +mt[1]; m = MONTHS[mt[2].slice(0, 3).toLowerCase()]; y = +mt[3]; }
  else if ((mt = raw.match(/^([A-Za-z]{3,9})[-/. ]+(\d{1,2})(?:st|nd|rd|th)?,?[-/. ]+(\d{4})$/))) { m = MONTHS[mt[1].slice(0, 3).toLowerCase()]; d = +mt[2]; y = +mt[3]; }
  else if ((mt = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[\s,].*)?$/))) {
    const a = +mt[1], b = +mt[2];
    if (fmt === "mdy") { m = a; d = b; } else { d = a; m = b; }
    y = +mt[3];
  } else if (/^\d{5}$/.test(raw) && +raw > 20000 && +raw < 80000) {
    const dt = new Date(Date.UTC(1899, 11, 30) + +raw * 86400000); // Excel serial date
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else return { bad: raw };

  if (y < 100) y += 2000;
  const t = new Date(Date.UTC(y, (m || 0) - 1, d));
  if (!m || t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return { bad: raw };
  return { iso: `${y}-${pad(m)}-${pad(d)}` };
}

// 12/31/2026 can only be month-first, 31/12/2026 only day-first. Default is day-first (India).
export function guessDateFormat(records, map) {
  let dmy = 0, mdy = 0;
  for (const key of ["start_date", "end_date", "joined_on", "dob"]) {
    const idx = map[key];
    if (idx == null || idx < 0) continue;
    for (const { cells } of records.slice(0, 300)) {
      const m = String(cells[idx] == null ? "" : cells[idx]).trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
      if (!m) continue;
      if (+m[1] > 12) dmy++; else if (+m[2] > 12) mdy++;
    }
  }
  return mdy > dmy ? "mdy" : "dmy";
}

/* ---------- plans ---------- */
export const planKey = norm;

export function distinctPlans(records, map) {
  if (map.plan == null || map.plan < 0) return [];
  const counts = new Map();
  for (const { cells } of records) {
    const label = String(cells[map.plan] == null ? "" : cells[map.plan]).trim();
    const key = norm(label);
    if (!key) continue;
    const cur = counts.get(key) || { key, label, count: 0 };
    cur.count++;
    counts.set(key, cur);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 60);
}

// { normalisedFileName: planId | "" }
export function autoMatchPlans(distinct, plans) {
  const out = {};
  for (const d of distinct) {
    const exact = plans.find((p) => norm(p.name) === d.key);
    if (exact) { out[d.key] = exact.id; continue; }
    const loose = plans.filter((p) => norm(p.name).length >= 3 && (d.key.includes(norm(p.name)) || norm(p.name).includes(d.key)));
    out[d.key] = loose.length === 1 ? loose[0].id : "";
  }
  return out;
}

/* ---------- building the rows we send to the server ---------- */
const fixSci = (v) => {
  const s = String(v == null ? "" : v).trim();
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s)) return String(Math.round(Number(s))); // Excel turned 9876543210 into 9.87654E+09
  return s.replace(/^(\d{10,})\.0+$/, "$1");
};

export function buildRows(records, map, { dateFmt, planMap }) {
  const get = (cells, key) => (map[key] != null && map[key] >= 0 ? String(cells[map[key]] == null ? "" : cells[map[key]]).trim() : "");
  return records.map(({ line, cells }) => {
    const row = { _row: line, bad: {} };
    for (const f of FIELDS) {
      if (f.key === "first_name" || f.key === "last_name") continue;
      let v = get(cells, f.key);
      if (f.key === "phone" || f.key === "emergency_phone") v = fixSci(v);
      if (f.date) {
        const r = parseDate(v, dateFmt);
        if (r.bad) { row.bad[f.key] = r.bad; v = ""; } else v = r.iso;
      }
      row[f.key] = v;
    }
    if (!row.name) row.name = [get(cells, "first_name"), get(cells, "last_name")].filter(Boolean).join(" ");
    const k = norm(row.plan);
    row.plan_id = k && planMap[k] ? planMap[k] : "";
    return row;
  });
}

/* ---------- csv out (problem report) ---------- */
export function toCsv(rows) {
  const cell = (v) => {
    let s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `\uFEFF${rows.map((r) => r.map(cell).join(",")).join("\r\n")}`;
}