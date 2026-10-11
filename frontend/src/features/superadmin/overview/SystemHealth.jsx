import React from "react";
import { Database, HardDrive, Timer, Server } from "lucide-react";
import Card from "../../../components/common/Card";
import { useFetch } from "../../../hooks/useFetch";
import { AdminPage, KpiGrid, RefreshButton, formatBytes, formatDuration, formatNumber } from "./OverviewParts.jsx";

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

export default function SystemHealth() {
  const { data, loading, error, refetch } = useFetch("/admin/overview/system");

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
          <KpiGrid
            items={[
              { icon: Database, label: "Total rows", value: formatNumber(data.database.total_rows), sublabel: "across the tables below", accent: "#7c3aed" },
              { icon: HardDrive, label: "Database size", value: formatBytes(data.database.size_bytes), sublabel: data.database.name, accent: "#3b82f6" },
              { icon: Timer, label: "DB response", value: `${data.database.latency_ms} ms`, sublabel: "time for the health queries", accent: data.database.latency_ms > 500 ? "#ef4444" : "#10b981" },
              { icon: Server, label: "Server uptime", value: formatDuration(data.server.uptime_seconds), sublabel: "since last restart", accent: "#10b981" }
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Server">
              <InfoRow label="Environment">{data.server.environment}</InfoRow>
              <InfoRow label="Node.js">{data.server.node_version}</InfoRow>
              <InfoRow label="Memory in use">{data.server.memory_rss_mb} MB</InfoRow>
              <InfoRow label="Redis cache">
                {data.redis.configured
                  ? <Status ok={data.redis.connected} okText="Connected" badText="Not reachable" />
                  : <span className="text-navy-400">Not configured</span>}
              </InfoRow>
            </Card>
            <Card title="Database">
              <InfoRow label="Engine">{data.database.version}</InfoRow>
              <InfoRow label="Name">{data.database.name}</InfoRow>
              <InfoRow label="Size on disk">{formatBytes(data.database.size_bytes)}</InfoRow>
              <InfoRow label="Status"><Status ok okText="Connected" badText="Down" /></InfoRow>
            </Card>
          </div>

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