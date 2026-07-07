import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Td, Th, Table } from "@/components/ui/table";
import { getPaymentRequests } from "@/lib/data";
import { formatCurrency, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const paymentRequests = await getPaymentRequests();

  return (
    <>
      <PageHeader
        title="Requests"
        description="Database-backed payment requests showing policy decisions, risk level, final status, and the agent-vendor relationship."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {paymentRequests.length ? (
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
                    <Td>
                      <p className="font-medium text-slate-900">{request.id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.fakeTransactionId ?? "No fake transaction"}
                      </p>
                    </Td>
                    <Td>{formatTime(request.createdAt)}</Td>
                    <Td>{request.agent.name}</Td>
                    <Td>{request.vendor.name}</Td>
                    <Td>{request.category}</Td>
                    <Td className="font-medium text-slate-900">
                      {formatCurrency(request.amountCents)}
                    </Td>
                    <Td>{request.policyDecision}</Td>
                    <Td><StatusBadge value={request.riskLevel} /></Td>
                    <Td><StatusBadge value={request.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="No payment requests yet"
              detail="Requests will appear here after an agent submits a paid API or MCP call."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
