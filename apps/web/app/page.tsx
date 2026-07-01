import { MetricCard } from "@/components/shell/metric-card";
import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { agents, auditLogs, formatCurrency, paymentRequests, totals } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live mock view of agent spend authorization, weekly limits, approval routing, and audit activity."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active agents" value={String(totals.activeAgents)} detail="2 active, 1 paused" />
        <MetricCard label="Weekly controlled spend" value={formatCurrency(totals.weeklySpend)} detail="Across simulated requests" />
        <MetricCard label="Pending approvals" value={String(totals.pendingApprovals)} detail="Needs human authorization" />
        <MetricCard label="Blocked requests" value={String(totals.blockedRequests)} detail="Stopped by policy or risk" />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent payment requests</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
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
                {paymentRequests.map((request) => (
                  <tr key={request.id}>
                    <Td className="font-medium text-slate-900">{request.id}</Td>
                    <Td>{request.agent}</Td>
                    <Td>{request.vendor}</Td>
                    <Td>{formatCurrency(request.amount)}</Td>
                    <Td><StatusBadge value={request.status} /></Td>
                    <Td><StatusBadge value={request.riskLevel} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent budget posture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {agents.map((agent) => {
              const percent = Math.round((agent.spentThisWeek / agent.weeklyBudget) * 100);
              return (
                <div key={agent.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.owner}</p>
                    </div>
                    <StatusBadge value={agent.status} />
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatCurrency(agent.spentThisWeek)} of {formatCurrency(agent.weeklyBudget)} used
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Latest audit events</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                  <span className="text-xs text-slate-500">{log.time}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{log.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
