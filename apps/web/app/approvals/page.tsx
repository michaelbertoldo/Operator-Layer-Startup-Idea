import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getApprovalRequests } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await getApprovalRequests();

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Requests routed for human authorization after policy or risk checks require review."
      />
      <section className="grid gap-4">
        {approvals.length ? (
          approvals.map((request) => (
            <Card key={request.id}>
              <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{request.id}</p>
                    <StatusBadge value={request.riskLevel} />
                    <StatusBadge value={request.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {request.agent.name} requested {formatCurrency(request.amountCents)} for {request.vendor.name}.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary">Reject</Button>
                  <Button type="button">Approve</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-slate-600">No requests need approval.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

