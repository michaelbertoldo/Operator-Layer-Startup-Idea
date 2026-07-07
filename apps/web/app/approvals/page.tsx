import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
  const reservedCents = approvals.reduce(
    (sum, request) => sum + (request.reservation?.amountCents ?? 0),
    0
  );
  const mediumRiskCount = approvals.filter(
    (request) => request.riskLevel === "Medium"
  ).length;

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

      <section className="grid gap-4 md:grid-cols-3">
        <QueueMetric
          label="Pending review"
          value={String(approvals.length)}
          detail="Requests awaiting authorization"
        />
        <QueueMetric
          label="Reserved spend"
          value={formatCurrency(reservedCents)}
          detail="Released automatically on rejection"
        />
        <QueueMetric
          label="Medium risk"
          value={String(mediumRiskCount)}
          detail="Needs human judgment"
        />
      </section>

      <section className="grid gap-4">
        {approvals.length ? (
          approvals.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="grid gap-5 p-0 lg:grid-cols-[1fr_auto]">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {request.agent.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{request.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    <StatusBadge value={request.riskLevel} />
                    <StatusBadge value={request.status} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <ReviewField label="Vendor" value={request.vendor.name} />
                    <ReviewField label="Amount" value={formatCurrency(request.amountCents)} />
                    <ReviewField label="Policy" value={request.policyDecision} />
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    {request.reservation ? (
                      <>
                        <p className="text-sm font-medium text-slate-950">
                          {formatCurrency(request.reservation.amountCents)} reserved
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Rejecting releases this controlled spend back to the agent budget.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-amber-800">
                          Legacy approval
                        </p>
                        <p className="mt-1 text-sm text-amber-700">
                          This request does not have an active budget reservation.
                        </p>
                      </>
                    )}
                    {request.reservation?.budgetPeriod ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Current reserved:{" "}
                        {formatCurrency(request.reservation.budgetPeriod.reservedCents)}.
                        After reject:{" "}
                        {formatCurrency(
                          Math.max(
                            0,
                            request.reservation.budgetPeriod.reservedCents -
                              request.reservation.amountCents
                          )
                        )}
                        .
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3 border-t border-slate-200 bg-slate-50 p-5 lg:min-w-56 lg:border-l lg:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Human authorization
                  </p>
                  <ApprovalActionButtons
                    requestId={request.id}
                    approveAction={approvePaymentRequestAction}
                    rejectAction={rejectPaymentRequestAction}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent>
              <EmptyState
                title="No requests need approval"
                detail="Requests routed for human authorization will appear here with reserved budget impact."
              />
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

function QueueMetric({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}
