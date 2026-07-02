import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { getApprovalRequests } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { ApprovalActionButtons } from "./approval-action-buttons";
import {
  approvePaymentRequestAction,
  rejectPaymentRequestAction
} from "./actions";

export const dynamic = "force-dynamic";

type ApprovalsPageProps = {
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const params = await searchParams;
  const approvals = await getApprovalRequests();

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Requests routed for human authorization after policy or risk checks require review."
      />
      {params?.error ? (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent>
            <p className="text-sm font-medium text-red-700">{params.error}</p>
          </CardContent>
        </Card>
      ) : null}
      {params?.status ? (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <CardContent>
            <p className="text-sm font-medium text-emerald-700">{params.status}</p>
          </CardContent>
        </Card>
      ) : null}
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
                <ApprovalActionButtons
                  requestId={request.id}
                  approveAction={approvePaymentRequestAction}
                  rejectAction={rejectPaymentRequestAction}
                />
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
