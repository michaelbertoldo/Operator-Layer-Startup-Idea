import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPolicies } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const policies = await getPolicies();

  return (
    <>
      <PageHeader
        title="Policies"
        description="Database-backed policy controls for transaction limits, weekly budgets, allowed categories, and new vendor approval routing."
      />
      <section className="grid gap-4 xl:grid-cols-3">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{policy.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{policy.id}</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Max transaction</dt>
                  <dd className="mt-1 font-medium text-slate-950">{formatCurrency(policy.maxTransactionCents)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Weekly budget</dt>
                  <dd className="mt-1 font-medium text-slate-950">{formatCurrency(policy.weeklyBudgetCents)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Approval threshold</dt>
                  <dd className="mt-1 font-medium text-slate-950">{formatCurrency(policy.approvalThresholdCents)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">New vendors</dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {policy.requireApprovalForNewVendor ? "Approval required" : "Auto allowed"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {policy.allowedCategories.split("|").map((category) => (
                  <Badge key={category}>{category}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

