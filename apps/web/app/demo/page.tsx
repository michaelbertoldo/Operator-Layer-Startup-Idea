import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDemoScenarios } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const demoScenarios = await getDemoScenarios();

  return (
    <>
      <PageHeader
        title="Demo"
        description="Investor-ready database scenarios for safe, review-required, and blocked agent spend requests."
      />
      <section className="grid gap-4 xl:grid-cols-3">
        {demoScenarios.map((scenario) => (
          <Card key={scenario.name}>
            <CardHeader>
              <CardTitle>{scenario.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Vendor</dt>
                  <dd className="font-medium text-slate-950">{scenario.request.vendor.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium text-slate-950">{formatCurrency(scenario.request.amountCents)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Policy</dt>
                  <dd className="font-medium text-slate-950">{scenario.request.policyDecision}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Risk</dt>
                  <dd><StatusBadge value={scenario.request.riskLevel} /></dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd><StatusBadge value={scenario.request.status} /></dd>
                </div>
              </dl>
              <Button type="button" className="mt-5 w-full" variant="secondary">
                Simulate
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

