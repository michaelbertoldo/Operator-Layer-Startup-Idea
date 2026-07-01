import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { formatCurrency, paymentRequests } from "@/lib/mock-data";

export default function RequestsPage() {
  return (
    <>
      <PageHeader
        title="Requests"
        description="Mock payment requests showing policy decisions, risk level, final status, and the agent-vendor relationship."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Request</Th>
                <Th>Created</Th>
                <Th>Agent</Th>
                <Th>Vendor</Th>
                <Th>Category</Th>
                <Th>Amount</Th>
                <Th>Policy</Th>
                <Th>Risk</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {paymentRequests.map((request) => (
                <tr key={request.id}>
                  <Td className="font-medium text-slate-900">{request.id}</Td>
                  <Td>{request.createdAt}</Td>
                  <Td>{request.agent}</Td>
                  <Td>{request.vendor}</Td>
                  <Td>{request.category}</Td>
                  <Td>{formatCurrency(request.amount)}</Td>
                  <Td>{request.policyDecision}</Td>
                  <Td><StatusBadge value={request.riskLevel} /></Td>
                  <Td><StatusBadge value={request.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

