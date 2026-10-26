import React, { useEffect, useState } from "react";
import { Database, HardDrive, Timer, Server, Activity, AlertTriangle, Download, Cpu, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../../components/common/Card";
import api from "../../../services/api";
import { useFetch } from "../../../hooks/useFetch";
import { AdminPage, KpiGrid, RefreshButton, formatBytes, formatDuration, formatNumber } from "./OverviewParts.jsx";

const IST = "Asia/Kolkata";

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function Status({ ok, okText, badText }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ok ? "text-green-600" : "text-red-500"}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      {ok ? okText : badText}
    </span>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-navy-50 last:border-0 gap-3">
      <span className="text-navy-500">{label}</span>
      <span className="text-navy-800 font-medium text-right">{children}</span>
    </div>
  );
}

function Alerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3">
        <ShieldCheck size={16} /> Everything looks healthy right now.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 border ${
            a.level === "critical" ? "bg-red-50 border-red-100 text-red-700" : "bg-amber-50 border-amber-100 text-amber-800"
          }`}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{a.text}</span>
        </div>
      ))}
    </div>
  );
}

function TrafficChart({ points }) {
  const max = Math.max(1, ...points.map((p) => p.requests));
  return (
    <div>
      <div className="flex items-end gap-[2px] h-28">
        {points.map((p) => (
          <div
            key={p.t}
            className="flex-1 flex flex-col justify-end h-full"
            title={`${new Date(p.t).toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit" })}: ${p.requests} requests, ${p.errors_5xx} errors, ${p.avg_ms} ms average`}
          >
            <div
              className={`rounded-sm ${p.errors_5xx ? "bg-red-400" : "bg-violet-400"}`}
              style={{ height: `${(p.requests / max) * 100}%`, minHeight: p.requests ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-navy-400 mt-1.5">
        <span>60 min ago</span>
        <span>now</span>
      </div>
    </div>
  );
}

function RouteTable({ rows, emptyText }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-navy-400">{emptyText}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px]">
        <thead className="border-b border-navy-100">
          <tr>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Endpoint</th>
            <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Calls</th>
            <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Avg</th>
            <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Slowest</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-50">
          {rows.map((r) => (
            <tr key={r.route}>
              <td className="py-2 text-xs font-mono text-navy-700 break-all">{r.route}</td>
              <td className="py-2 text-sm text-right tabular-nums text-navy-700">{formatNumber(r.count)}</td>
              <td className="py-2 text-sm text-right tabular-nums text-navy-700">{r.avg_ms} ms</td>
              <td className="py-2 text-sm text-right tabular-nums text-navy-500">{r.max_ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BackupCard({ backups, onRun, starting, onDownload, downloading }) {
  const last = backups.last_success;
  const attempt = backups.last_attempt;

  // One row per file name, marked with where a copy exists.
  const files = new Map();
  backups.local_files.forEach((f) => files.set(f.name, { ...f, local: true, remote: false }));
  backups.remote.files.forEach((f) => {
    const existing = files.get(f.name);
    if (existing) existing.remote = true;
    else files.set(f.name, { ...f, local: false, remote: true });
  });
  const rows = [...files.values()].sort((a, b) => (a.name < b.name ? 1 : -1));

  return (
    <Card
      title="Database backups"
      action={
        <button
          onClick={onRun}
          disabled={starting || backups.running}
          className="text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 disabled:opacity-60 px-3 py-2 rounded-xl"
        >
          {backups.running ? "Backup running..." : starting ? "Starting..." : "Back up now"}
        </button>
      }
    >
      <InfoRow label="Schedule">{backups.schedule === "off" ? "Switched off" : `Daily, cron ${backups.schedule} (India time)`}</InfoRow>
      <InfoRow label="Last successful backup">
        {last ? (
          <span>
            {formatTime(last.at)} <span className="text-navy-400 font-normal">({formatBytes(last.size_bytes)})</span>
          </span>
        ) : (
          <span className="text-red-500">Never</span>
        )}
      </InfoRow>
      <InfoRow label="Latest attempt">
        {attempt ? <Status ok={attempt.ok} okText={`Success, ${formatTime(attempt.at)}`} badText={`Failed, ${formatTime(attempt.at)}`} /> : "-"}
      </InfoRow>
      <InfoRow label="Copy outside this server">
        {!backups.remote.configured ? (
          <span className="text-amber-700">Not set up</span>
        ) : backups.remote.error ? (
          <span className="text-red-500">Cannot reach bucket</span>
        ) : (
          <Status ok okText={`${backups.remote.files.length} copies in R2`} badText="" />
        )}
      </InfoRow>
      {backups.disk && (
        <InfoRow label="Server disk">
          {formatBytes(backups.disk.free_bytes)} free of {formatBytes(backups.disk.total_bytes)} ({backups.disk.used_percent}% used)
        </InfoRow>
      )}
      {attempt && !attempt.ok && attempt.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-3 break-words">{attempt.error}</p>
      )}
      {backups.remote.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-3 break-words">{backups.remote.error}</p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead className="border-b border-navy-100">
              <tr>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Backup file</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Stored in</th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Size</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {rows.map((f) => (
                <tr key={f.name}>
                  <td className="py-2 text-xs font-mono text-navy-700">{f.name}</td>
                  <td className="py-2 text-xs text-navy-500">{[f.local && "Server", f.remote && "R2"].filter(Boolean).join(" + ")}</td>
                  <td className="py-2 text-sm text-right tabular-nums text-navy-600">{formatBytes(f.size_bytes)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => onDownload(f.name)}
                      disabled={downloading === f.name}
                      className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900 disabled:opacity-60"
                    >
                      <Download size={13} /> {downloading === f.name ? "Downloading..." : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function SystemHealth() {
  const { data, loading, error, refetch } = useFetch("/admin/overview/system");
  const [starting, setStarting] = useState(false);
  const [downloading, setDownloading] = useState("");

  // Refresh by itself: every 30 seconds, or every 3 seconds while a backup is running.
  const backupRunning = !!data?.backups?.running;
  useEffect(() => {
    const id = setInterval(() => {
      refetch();
    }, backupRunning ? 3000 : 30000);
    return () => clearInterval(id);
  }, [backupRunning, refetch]);

  const runBackup = async () => {
    setStarting(true);
    try {
      await api.post("/admin/overview/backups/run");
      toast.success("Backup started");
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start the backup");
    } finally {
      setStarting(false);
    }
  };

  const downloadBackup = async (name) => {
    setDownloading(name);
    try {
      const res = await api.get("/admin/overview/backups/download", { params: { file: name }, responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Could not download this backup");
    } finally {
      setDownloading("");
    }
  };

  const groups = {};
  (data?.tables || []).filter((t) => t.exists).forEach((t) => {
    (groups[t.group] = groups[t.group] || []).push(t);
  });
  const missing = (data?.tables || []).filter((t) => !t.exists);

  return (
    <AdminPage
      title="Database & System"
      loading={loading && !data}
      error={!data ? error : null}
      onRetry={refetch}
      action={<RefreshButton onClick={refetch} loading={loading} />}
    >
      {data && (
        <div className="space-y-6">
          <Alerts alerts={data.alerts} />

          <KpiGrid
            items={[
              { icon: Database, label: "Total rows", value: formatNumber(data.database.total_rows), sublabel: "across the tables below", accent: "#7c3aed" },
              { icon: HardDrive, label: "Database size", value: formatBytes(data.database.size_bytes), sublabel: data.database.name, accent: "#3b82f6" },
              { icon: Timer, label: "DB response", value: `${data.database.latency_ms} ms`, sublabel: "time for the health queries", accent: data.database.latency_ms > 500 ? "#ef4444" : "#10b981" },
              { icon: Server, label: "Server uptime", value: formatDuration(data.server.uptime_seconds), sublabel: "since last restart", accent: "#10b981" }
            ]}
          />

          <KpiGrid
            items={[
              { icon: Activity, label: "Requests (5 min)", value: formatNumber(data.requests.last_5m.requests), sublabel: `${formatNumber(data.requests.last_60m.requests)} in the last hour`, accent: "#7c3aed" },
              { icon: AlertTriangle, label: "Server errors (5 min)", value: formatNumber(data.requests.last_5m.errors_5xx), sublabel: `${formatNumber(data.requests.last_60m.errors_5xx)} in the last hour`, accent: data.requests.last_5m.errors_5xx > 0 ? "#ef4444" : "#10b981" },
              { icon: Timer, label: "Average response", value: `${data.requests.last_5m.avg_ms} ms`, sublabel: "last 5 minutes", accent: data.requests.last_5m.avg_ms > 800 ? "#ef4444" : "#10b981" },
              { icon: ShieldCheck, label: "Blocked by limit", value: formatNumber(data.requests.last_5m.rate_limited), sublabel: "rate limit, last 5 minutes", accent: data.requests.last_5m.rate_limited > 0 ? "#f59e0b" : "#10b981" }
            ]}
          />

          <Card title="Traffic, last 60 minutes">
            <TrafficChart points={data.requests.per_minute} />
            <p className="text-[11px] text-navy-400 mt-2">One bar per minute. Red bars had server errors. Counts reset when the server restarts.</p>
          </Card>

          <BackupCard backups={data.backups} onRun={runBackup} starting={starting} onDownload={downloadBackup} downloading={downloading} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Server">
              <InfoRow label="Environment">{data.server.environment}</InfoRow>
              <InfoRow label="Node.js">{data.server.node_version}</InfoRow>
              <InfoRow label="App memory">{data.server.memory_rss_mb} MB</InfoRow>
              <InfoRow label="Event loop delay">{data.requests.event_loop.p99_ms} ms</InfoRow>
              <InfoRow label="Redis cache">
                {data.redis.configured
                  ? <Status ok={data.redis.connected} okText="Connected" badText="Not reachable" />
                  : <span className="text-navy-400">Not configured</span>}
              </InfoRow>
            </Card>
            <Card title="Database">
              <InfoRow label="Engine">{data.database.version}</InfoRow>
              <InfoRow label="Status"><Status ok okText="Connected" badText="Down" /></InfoRow>
              {data.database.connections && (
                <InfoRow label="Connections">{data.database.connections.used} of {data.database.connections.max}</InfoRow>
              )}
              {data.database.pool && (
                <InfoRow label="App pool">{data.database.pool.in_use} busy, {data.database.pool.idle} idle, {data.database.pool.waiting} waiting</InfoRow>
              )}
              {data.database.cache_hit_percent !== null && (
                <InfoRow label="Cache hit rate">{data.database.cache_hit_percent}%</InfoRow>
              )}
            </Card>
            <Card title="Machine">
              <InfoRow label="CPU cores">{data.host.cpu_count}</InfoRow>
              <InfoRow label="Load (1 / 5 / 15 min)">{data.host.load_average.join(" / ")}</InfoRow>
              <InfoRow label="Memory used">{data.host.memory_used_percent}% of {formatNumber(data.host.memory_total_mb)} MB</InfoRow>
              <InfoRow label="Machine uptime">{formatDuration(data.host.uptime_seconds)}</InfoRow>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Slowest endpoints">
              <RouteTable rows={data.requests.slowest_routes} emptyText="Not enough traffic yet." />
            </Card>
            <Card title="Busiest endpoints">
              <RouteTable rows={data.requests.busiest_routes} emptyText="No traffic yet." />
            </Card>
          </div>

          <Card title="Recent server errors">
            {data.requests.recent_errors.length === 0 ? (
              <p className="text-sm text-green-600">No server errors since the last restart.</p>
            ) : (
              <div className="divide-y divide-navy-50">
                {data.requests.recent_errors.map((e, i) => (
                  <div key={i} className="py-2.5">
                    <p className="text-xs font-mono text-navy-800 break-all">{e.route} <span className="text-red-500">({e.status})</span></p>
                    <p className="text-xs text-navy-500 mt-0.5 break-words">{e.message}</p>
                    <p className="text-[11px] text-navy-400 mt-0.5">{formatTime(e.at)}</p>
                  </div>
                ))}
              </div>
            )}
            {data.requests.process_errors.unhandled_rejections > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
                {data.requests.process_errors.unhandled_rejections} background errors were caught and logged without stopping the server. Latest: {data.requests.process_errors.last[0]?.message}
              </p>
            )}
          </Card>

          {Object.entries(groups).map(([group, tables]) => (
            <Card key={group} title={group}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead className="border-b border-navy-100">
                    <tr>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Table</th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Rows</th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Added (7d)</th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-navy-400 py-2">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {tables.map((t) => (
                      <tr key={t.name}>
                        <td className="py-2.5 text-sm">
                          <p className="font-medium text-navy-800">{t.label}</p>
                          <p className="text-[11px] text-navy-400 font-mono">{t.name}</p>
                        </td>
                        <td className="py-2.5 text-sm text-right font-semibold text-navy-900 tabular-nums">{formatNumber(t.total)}</td>
                        <td className="py-2.5 text-sm text-right text-navy-600 tabular-nums">{t.last_7d === null ? "-" : `+${formatNumber(t.last_7d)}`}</td>
                        <td className="py-2.5 text-sm text-right text-navy-500 tabular-nums">{formatBytes(t.size_bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {missing.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
              Not found in this database: {missing.map((t) => t.name).join(", ")}.
            </p>
          )}
        </div>
      )}
    </AdminPage>
  );
}