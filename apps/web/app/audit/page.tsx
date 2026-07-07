import { PageHeader } from "@/components/shell/page-header";
import { MetricCard } from "@/components/shell/metric-card";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { getAuditIntegrity } from "@/lib/data";
import { formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { integrity, logs } = await getAuditIntegrity();
  const auditLogs = [...logs].reverse();
  const chainPreview = logs.slice(-5);

  return (
    <>
      <PageHeader
        title="Audit"
        description="Database-backed audit log with hash-chain integrity checks for spend controls, approvals, freezes, and breaker events."
      />

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card
          className={
            integrity.valid
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={integrity.valid ? "Valid" : "Blocked"} />
                  <span className="rounded-md border border-white/70 bg-white/70 px-2 py-1 text-xs font-medium text-slate-600">
                    SHA-256 hash chain
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                  {integrity.valid
                    ? "Audit chain verified"
                    : "Audit chain requires review"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {integrity.valid
                    ? "Every audit row matches its payload hash and previous-hash pointer, creating a tamper-evident trail for spend decisions."
                    : `${integrity.issues.length} integrity issue${integrity.issues.length === 1 ? "" : "s"} detected across the audit trail.`}
                </p>
              </div>
              <div className="rounded-lg border border-white/70 bg-white/70 p-4 md:min-w-64">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Latest hash
                </p>
                <p className="mt-2 break-all font-mono text-xs font-semibold text-slate-950">
                  {integrity.latestHash ?? "No audit hash yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chain Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {chainPreview.length ? (
              <ol className="space-y-3">
                {chainPreview.map((log, index) => (
                  <li key={log.id} className="flex items-center gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">
                        {log.action}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-500">
                        {shortHash(log.hash)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No chain yet"
                detail="Audit events will appear after spend or control actions."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Integrity status"
          value={integrity.valid ? "Valid" : "Invalid"}
          detail={integrity.valid ? "Hash chain verified" : "Review chain issues"}
        />
        <MetricCard
          label="Events checked"
          value={String(integrity.checkedCount)}
          detail="Chronological audit rows"
        />
        <MetricCard
          label="Chain head"
          value={shortHash(integrity.firstHash)}
          detail="First audit hash"
        />
        <MetricCard
          label="Latest hash"
          value={shortHash(integrity.latestHash)}
          detail="Current audit tip"
        />
      </section>

      {integrity.issues.length ? (
        <section className="mt-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle>Integrity issues</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Log</Th>
                    <Th>Action</Th>
                    <Th>Issue</Th>
                    <Th>Expected</Th>
                    <Th>Actual</Th>
                  </tr>
                </thead>
                <tbody>
                  {integrity.issues.map((issue) => (
                    <tr key={`${issue.logId}-${issue.issue}`} className="bg-red-50/50">
                      <Td className="font-medium text-slate-900">{issue.logId}</Td>
                      <Td>{issue.action}</Td>
                      <Td>
                        <StatusBadge value="Blocked" />
                        <span className="ml-2 text-xs text-red-700">{issue.issue}</span>
                      </Td>
                      <Td className="max-w-[220px] break-all font-mono text-xs">{issue.expected ?? "null"}</Td>
                      <Td className="max-w-[220px] break-all font-mono text-xs">{issue.actual ?? "null"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Audit Log</CardTitle>
          <p className="text-sm text-slate-500">{auditLogs.length} events</p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {auditLogs.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Prev</Th>
                  <Th>Hash</Th>
                  <Th>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <Td>{formatTime(log.createdAt)}</Td>
                    <Td>{log.actor}</Td>
                    <Td className="font-medium text-slate-900">{log.action}</Td>
                    <Td>{log.target}</Td>
                    <Td className="max-w-[140px] break-all font-mono text-xs text-slate-500">
                      {shortHash(log.prevHash)}
                    </Td>
                    <Td className="max-w-[140px] break-all font-mono text-xs text-slate-500">
                      {shortHash(log.hash)}
                    </Td>
                    <Td className="min-w-80">{log.detail}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="No audit events yet"
              detail="Policy checks, approvals, freezes, and fake executions will populate this log."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function shortHash(hash: string | null) {
  return hash ? hash.slice(0, 12) : "None";
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
