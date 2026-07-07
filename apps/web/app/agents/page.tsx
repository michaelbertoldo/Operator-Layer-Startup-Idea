import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Td, Th, Table } from "@/components/ui/table";
import { getAgents } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { ControlsClient } from "../controls-client";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <>
      <PageHeader
        title="Agents"
        description="AI agents with spend permissions, budget posture, approved vendor counts, and current operating status."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>Weekly budget</Th>
                <Th>Spent this week</Th>
                <Th>Approved vendors</Th>
                <Th>Risk</Th>
                <Th>Controls</Th>
              </tr>
            </thead>
            <tbody>
              {agents.length ? (
                agents.map((agent) => (
                  <tr key={agent.id}>
                    <Td>
                      <p className="font-medium text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.id}</p>
                      {agent.frozenAt ? (
                        <p className="mt-1 text-xs font-medium text-red-700">
                          {agent.freezeReason ?? "Agent spend is frozen."}
                        </p>
                      ) : null}
                    </Td>
                    <Td>{agent.ownerName}</Td>
                    <Td><StatusBadge value={agent.frozenAt ? "Frozen" : agent.status} /></Td>
                    <Td>{formatCurrency(agent.weeklyBudgetCents)}</Td>
                    <Td>{formatCurrency(agent.spentThisWeekCents)}</Td>
                    <Td>{agent.approvedVendorCount}</Td>
                    <Td><StatusBadge value={agent.riskLevel} /></Td>
                    <Td>
                      <ControlsClient
                        scope="agent"
                        agentId={agent.id}
                        frozen={Boolean(agent.frozenAt)}
                        reason={agent.freezeReason}
                        compact
                      />
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <Td colSpan={8}>
                    <EmptyState
                      title="No agents configured"
                      detail="Agents will appear here once they receive spend policies and permissions."
                    />
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
