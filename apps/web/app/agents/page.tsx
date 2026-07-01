import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { agents, formatCurrency } from "@/lib/mock-data";

export default function AgentsPage() {
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
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <Td>
                    <p className="font-medium text-slate-900">{agent.name}</p>
                    <p className="text-xs text-slate-500">{agent.id}</p>
                  </Td>
                  <Td>{agent.owner}</Td>
                  <Td><StatusBadge value={agent.status} /></Td>
                  <Td>{formatCurrency(agent.weeklyBudget)}</Td>
                  <Td>{formatCurrency(agent.spentThisWeek)}</Td>
                  <Td>{agent.allowedVendors}</Td>
                  <Td><StatusBadge value={agent.risk} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

