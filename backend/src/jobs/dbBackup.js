const cron = require("node-cron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const env = require("../config/env");
const { getR2Client } = require("../config/r2");
const {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} = require("@aws-sdk/client-s3");

/**
 * Automatic daily database backup.
 *
 *  1. pg_dump (compressed custom format) into the backup folder on the server
 *  2. integrity check (pg_restore --list must be able to read the file)
 *  3. copy to a PRIVATE Cloudflare R2 bucket, so a dead or wiped VPS does not take the backups with it
 *  4. keep the newest few copies, delete older ones
 *
 * .env (all optional except the bucket if you want the off-server copy):
 *   R2_BACKUP_BUCKET_NAME   a separate PRIVATE bucket (never the public image bucket)
 *   BACKUP_DIR              default: ./backups
 *   BACKUP_KEEP_LOCAL       default: 7
 *   BACKUP_KEEP_REMOTE      default: 30
 *   BACKUP_CRON             default: "30 2 * * *"  (02:30 India time)
 *   BACKUP_ENABLED          set to "false" to switch the schedule off
 *   PG_DUMP_PATH / PG_RESTORE_PATH   only if the tools are not on PATH
 */

const REMOTE_PREFIX = "db-backups/";
const NAME_RE = /^in2fest-\d{8}-\d{6}\.dump$/;
const MAX_UPLOAD_BYTES = 150 * 1024 * 1024; // uploaded in one piece, so keep it well under the 500 MB PM2 limit
const DUMP_TIMEOUT_MS = 30 * 60 * 1000;
const HISTORY_LIMIT = 30;

let running = false;

const keepLocal = () => parseInt(process.env.BACKUP_KEEP_LOCAL, 10) || 7;
const keepRemote = () => parseInt(process.env.BACKUP_KEEP_REMOTE, 10) || 30;
const bucketName = () => process.env.R2_BACKUP_BUCKET_NAME || "";

function backupDir() {
  const dir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function statusFile() {
  return path.join(backupDir(), "backup-status.json");
}

function readHistory() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statusFile(), "utf8"));
    return Array.isArray(parsed.history) ? parsed.history : [];
  } catch (_) {
    return [];
  }
}

function writeHistory(history) {
  const tmp = `${statusFile()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ history: history.slice(0, HISTORY_LIMIT) }, null, 2));
  fs.renameSync(tmp, statusFile());
}

// Indian time, e.g. 20261026-023000
function stamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date()).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

function runTool(bin, args, { extraEnv = {}, timeoutMs = DUMP_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let settled = false;
    const child = spawn(bin, args, {
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "ignore", "pipe"]
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      if (!settled) {
        settled = true;
        reject(new Error(`${path.basename(bin)} timed out`));
      }
    }, timeoutMs);

    child.stderr.on("data", (chunk) => {
      if (stderr.length < 4000) stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (err.code === "ENOENT") {
        reject(new Error(`${path.basename(bin)} was not found on this server. Install the PostgreSQL client tools (postgresql-client) or set PG_DUMP_PATH / PG_RESTORE_PATH.`));
      } else {
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(bin)} exited with code ${code}: ${stderr.trim().slice(0, 400)}`));
    });
  });
}

async function dumpTo(file) {
  const args = [
    "-h", env.db.host,
    "-p", String(env.db.port),
    "-U", env.db.user,
    "-d", env.db.name,
    "-Fc", "-Z", "6",
    "--no-owner",
    "-f", file
  ];
  await runTool(process.env.PG_DUMP_PATH || "pg_dump", args, { extraEnv: { PGPASSWORD: env.db.password } });
}

async function verifyDump(file) {
  const size = fs.statSync(file).size;
  if (size < 1024) throw new Error("Backup file is empty or too small.");
  await runTool(process.env.PG_RESTORE_PATH || "pg_restore", ["--list", file], { timeoutMs: 5 * 60 * 1000 });
  return size;
}

async function uploadRemote(file, name) {
  const client = getR2Client();
  const bucket = bucketName();
  if (!client) return { uploaded: false, reason: "R2 is not configured (R2_ACCOUNT_ID missing)." };
  if (!bucket) return { uploaded: false, reason: "R2_BACKUP_BUCKET_NAME is not set, so only the on-server copy exists." };

  const size = fs.statSync(file).size;
  if (size > MAX_UPLOAD_BYTES) {
    return { uploaded: false, reason: `Backup is ${Math.round(size / 1048576)} MB, too large for the built-in upload. Ask for the streaming uploader.` };
  }

  const key = `${REMOTE_PREFIX}${name}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.readFileSync(file),
    ContentType: "application/octet-stream"
  }));
  return { uploaded: true, key };
}

async function pruneRemote() {
  const client = getR2Client();
  const bucket = bucketName();
  if (!client || !bucket) return;

  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: REMOTE_PREFIX }));
  const files = (listed.Contents || [])
    .filter((o) => NAME_RE.test(o.Key.slice(REMOTE_PREFIX.length)))
    .sort((a, b) => (a.Key < b.Key ? 1 : -1));

  const stale = files.slice(keepRemote());
  if (stale.length) {
    await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: stale.map((o) => ({ Key: o.Key })), Quiet: true }
    }));
  }
}

function pruneLocal() {
  const dir = backupDir();
  const files = fs.readdirSync(dir).filter((f) => NAME_RE.test(f)).sort().reverse();
  files.slice(keepLocal()).forEach((f) => {
    try { fs.unlinkSync(path.join(dir, f)); } catch (_) { /* ignore */ }
  });
}

/** Runs one full backup. Never throws; the outcome is stored in the history. */
async function runBackup({ trigger = "schedule" } = {}) {
  if (running) return { ok: false, busy: true, error: "A backup is already running." };
  running = true;

  const startedAt = Date.now();
  const name = `in2fest-${stamp()}.dump`;
  const file = path.join(backupDir(), name);
  const entry = { at: new Date(startedAt).toISOString(), trigger, file: name, ok: false };

  try {
    await dumpTo(file);
    entry.size_bytes = await verifyDump(file);
    entry.local = true;

    try {
      const remote = await uploadRemote(file, name);
      entry.uploaded = remote.uploaded;
      if (remote.key) entry.remote_key = remote.key;
      if (remote.reason) entry.upload_note = remote.reason;
      if (remote.uploaded) await pruneRemote();
    } catch (uploadErr) {
      entry.uploaded = false;
      entry.upload_note = `Off-server upload failed: ${uploadErr.message}`.slice(0, 300);
    }

    pruneLocal();
    entry.ok = true;
    console.log(`[BACKUP] Done: ${name} (${Math.round(entry.size_bytes / 1024)} KB), off-server copy: ${entry.uploaded ? "yes" : "no"}`);
  } catch (err) {
    entry.error = String(err.message || err).slice(0, 500);
    try { fs.unlinkSync(file); } catch (_) { /* nothing to clean */ }
    console.error("[BACKUP] Failed:", entry.error);
  } finally {
    entry.duration_s = Math.round((Date.now() - startedAt) / 1000);
    try {
      writeHistory([entry, ...readHistory()]);
    } catch (writeErr) {
      console.error("[BACKUP] Could not save status:", writeErr.message);
    }
    running = false;
  }

  return { ok: entry.ok, entry };
}

function localFiles() {
  const dir = backupDir();
  return fs.readdirSync(dir)
    .filter((f) => NAME_RE.test(f))
    .sort()
    .reverse()
    .map((f) => ({ name: f, size_bytes: fs.statSync(path.join(dir, f)).size }));
}

async function remoteFiles() {
  const client = getR2Client();
  const bucket = bucketName();
  if (!client || !bucket) return { configured: false, files: [], error: null };
  try {
    const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: REMOTE_PREFIX }));
    const files = (listed.Contents || [])
      .filter((o) => NAME_RE.test(o.Key.slice(REMOTE_PREFIX.length)))
      .sort((a, b) => (a.Key < b.Key ? 1 : -1))
      .slice(0, 10)
      .map((o) => ({ name: o.Key.slice(REMOTE_PREFIX.length), size_bytes: o.Size }));
    return { configured: true, files, error: null };
  } catch (err) {
    return { configured: true, files: [], error: String(err.message || err).slice(0, 200) };
  }
}

function diskInfo() {
  try {
    const s = fs.statfsSync(backupDir());
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    return { total_bytes: total, free_bytes: free, used_percent: total ? Math.round(((total - free) / total) * 100) : 0 };
  } catch (_) {
    return null;
  }
}

/** Everything the Super Admin page needs about backups. */
async function getBackupStatus() {
  const history = readHistory();
  const lastSuccess = history.find((h) => h.ok) || null;
  const remote = await remoteFiles();
  return {
    running,
    schedule: process.env.BACKUP_ENABLED === "false" ? "off" : (process.env.BACKUP_CRON || "30 2 * * *"),
    last_attempt: history[0] || null,
    last_success: lastSuccess,
    history: history.slice(0, 10),
    local_files: localFiles().slice(0, 10),
    remote,
    disk: diskInfo()
  };
}

/** Returns { stream, size_bytes, name } for a backup file, or null when it does not exist. */
async function openBackupFile(name) {
  if (!NAME_RE.test(String(name || ""))) return null;

  const local = path.join(backupDir(), name);
  if (fs.existsSync(local)) {
    return { stream: fs.createReadStream(local), size_bytes: fs.statSync(local).size, name };
  }

  const client = getR2Client();
  const bucket = bucketName();
  if (!client || !bucket) return null;
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `${REMOTE_PREFIX}${name}` }));
    return { stream: res.Body, size_bytes: res.ContentLength, name };
  } catch (_) {
    return null;
  }
}

function startDbBackup() {
  if (process.env.BACKUP_ENABLED === "false") {
    console.log("[JOB] Database backup is switched off (BACKUP_ENABLED=false).");
    return;
  }
  const expression = process.env.BACKUP_CRON || "30 2 * * *";
  cron.schedule(expression, () => { runBackup({ trigger: "schedule" }); }, { timezone: "Asia/Kolkata" });
  console.log(`[JOB] Database backup scheduled (${expression}, India time).`);
}

const isBackupRunning = () => running;

module.exports = { startDbBackup, runBackup, isBackupRunning, getBackupStatus, openBackupFile };