import { MetricCard } from "@/components/shell/metric-card";
import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { verifyAuditChain } from "@/lib/auditIntegrity";
import { getDashboardData } from "@/lib/data";
import { formatCurrency, formatTime } from "@/lib/format";
import { ControlsClient } from "./controls-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { company, agents, auditLogs, paymentRequests, totals } = await getDashboardData();
  const auditIntegrity = verifyAuditChain([...auditLogs].reverse());
  const frozenAgents = agents.filter((agent) => agent.frozenAt);
  const recentRequests = paymentRequests.slice(0, 6);
  const latestAuditLogs = auditLogs.slice(0, 4);
  const totalBudgetCents = agents.reduce(
    (sum, agent) => sum + agent.weeklyBudgetCents,
    0
  );
  const budgetUsedPercent =
    totalBudgetCents > 0
      ? Math.min(100, Math.round((totals.weeklySpend / totalBudgetCents) * 100))
      : 0;

  return (
    <>
      <PageHeader
        title="Command Center"
        description="Live control plane for agent spend authorization, freeze controls, approvals, and audit integrity."
      />

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card
          className={
            company?.frozenAt
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }
        >
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={company?.frozenAt ? "Frozen" : "Active"} />
                <StatusBadge value={auditIntegrity.valid ? "Valid" : "Blocked"} />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                {company?.frozenAt ? "All spend is frozen" : "Spend controls are active"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {company?.frozenAt
                  ? company.freezeReason ?? "Company-level spend is frozen."
                  : "Agent requests are checked against policy, risk, budget reservations, approvals, and hash-chain audit controls."}
              </p>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <ControlStat label="Agents" value={String(agents.length)} />
                <ControlStat label="Frozen" value={String(frozenAgents.length)} />
                <ControlStat label="Audit events" value={String(auditIntegrity.checkedCount)} />
              </div>
            </div>
            <ControlsClient
              scope="company"
              frozen={Boolean(company?.frozenAt)}
              reason={company?.freezeReason}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold text-slate-950">
                  {budgetUsedPercent}%
                </p>
                <p className="mt-1 text-sm text-slate-500">controlled spend used</p>
              </div>
              <p className="text-right text-sm font-medium text-slate-700">
                {formatCurrency(totals.weeklySpend)}
                <span className="block text-xs font-normal text-slate-500">
                  of {formatCurrency(totalBudgetCents)}
                </span>
              </p>
            </div>
            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Company state"
          value={company?.frozenAt ? "Frozen" : "Enabled"}
          detail={company?.frozenAt ? "Kill switch active" : "Requests can be evaluated"}
        />
        <MetricCard
          label="Audit integrity"
          value={auditIntegrity.valid ? "Verified" : "Issue found"}
          detail={`${auditIntegrity.checkedCount} events checked`}
        />
        <MetricCard
          label="Pending approvals"
          value={String(totals.pendingApprovals)}
          detail="Needs human authorization"
        />
        <MetricCard
          label="Blocked requests"
          value={String(totals.blockedRequests)}
          detail="Stopped by policy, risk, or freeze"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Requests</CardTitle>
            <p className="text-sm text-slate-500">{paymentRequests.length} total</p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {recentRequests.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Request</Th>
                    <Th>Agent</Th>
                    <Th>Vendor</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>Risk</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <Td>
                        <p className="font-medium text-slate-900">{request.id}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(request.createdAt)}
                        </p>
                      </Td>
                      <Td>{request.agent.name}</Td>
                      <Td>{request.vendor.name}</Td>
                      <Td className="font-medium text-slate-900">
                        {formatCurrency(request.amountCents)}
                      </Td>
                      <Td><StatusBadge value={request.status} /></Td>
                      <Td><StatusBadge value={request.riskLevel} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState
                title="No payment requests yet"
                detail="New agent spend requests will appear here after the demo or gateway creates them."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {agents.length ? (
              agents.map((agent) => {
                const percent =
                  agent.weeklyBudgetCents > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (agent.spentThisWeekCents / agent.weeklyBudgetCents) * 100
                        )
                      )
                    : 0;
                return (
                  <div key={agent.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {agent.frozenAt
                            ? agent.freezeReason ?? "Agent spend is frozen."
                            : agent.ownerName}
                        </p>
                      </div>
                      <StatusBadge value={agent.frozenAt ? "Frozen" : agent.status} />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-100">
                      <div
                        className={
                          agent.frozenAt
                            ? "h-2 rounded-full bg-red-500"
                            : "h-2 rounded-full bg-cyan-500"
                        }
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatCurrency(agent.spentThisWeekCents)} of{" "}
                      {formatCurrency(agent.weeklyBudgetCents)} used
                    </p>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No agents configured"
                detail="Agents will appear here once they are created."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Latest Audit Events</CardTitle>
            <StatusBadge value={auditIntegrity.valid ? "Valid" : "Blocked"} />
          </CardHeader>
          <CardContent>
            {latestAuditLogs.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {latestAuditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                      <span className="text-xs text-slate-500">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{log.actor}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{log.detail}</p>
                    <p className="mt-3 break-all text-xs font-medium text-slate-400">
                      {log.hash.slice(0, 18)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No audit events yet"
                detail="Policy checks, approvals, freezes, and simulated payments will create audit events."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ControlStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/70 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto max-w-sm">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
