"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type DemoScenario = {
  id: string;
  name: string;
  description: string;
  buttonLabel: string;
  request: {
    agentId: string;
    vendorId: string;
    amountCents: number;
    category: string;
    metadata?: {
      hasUnusualMetadata?: boolean;
      sensitiveCategories?: string[];
    };
  };
};

type DemoResult = {
  paymentRequest: {
    id: string;
    amountCents: number;
    category: string;
    status: string;
    policyDecision: string;
    riskLevel: string;
    riskScore: number;
    fakeTransactionId: string | null;
    agent: {
      name: string;
    };
    vendor: {
      name: string;
    };
  };
  policyResult: {
    decision: string;
    reasons: string[];
  };
  riskResult: {
    score: number;
    level: string;
    signals: string[];
  };
  fakePayment: {
    fakeTransactionId: string;
    rail: string;
    asset: string;
    amountCents: number;
    executedAt: string;
  } | null;
  auditLogs: Array<{
    id: string;
    actor: string;
    action: string;
    detail: string;
    createdAt: string;
  }>;
};

const scenarios: DemoScenario[] = [
  {
    id: "safe",
    name: "Safe request",
    description: "Approved vendor, small amount, allowed category, low risk.",
    buttonLabel: "Simulate safe request",
    request: {
      agentId: "agt_research",
      vendorId: "vnd_clearbit",
      amountCents: 1_200,
      category: "Data enrichment"
    }
  },
  {
    id: "new-vendor",
    name: "New vendor request",
    description: "Pending vendor and medium amount, routed for human authorization.",
    buttonLabel: "Simulate new vendor request",
    request: {
      agentId: "agt_sales",
      vendorId: "vnd_serp",
      amountCents: 7_600,
      category: "Research"
    }
  },
  {
    id: "dangerous",
    name: "Dangerous request",
    description: "Blocked vendor, high amount, sensitive category, blocked by controls.",
    buttonLabel: "Simulate dangerous request",
    request: {
      agentId: "agt_research",
      vendorId: "vnd_compute",
      amountCents: 24_000,
      category: "Compute",
      metadata: {
        hasUnusualMetadata: true,
        sensitiveCategories: ["Compute"]
      }
    }
  }
];

export function DemoClient() {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0].id);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);

  async function runScenario(scenario: DemoScenario) {
    setSelectedScenario(scenario.id);
    setLoadingScenario(scenario.id);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/payment-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(scenario.request)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Demo request failed.");
      }

      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Demo request failed."
      );
    } finally {
      setLoadingScenario(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
      <section className="grid gap-4">
        {scenarios.map((scenario) => (
          <Card
            key={scenario.id}
            className={selectedScenario === scenario.id ? "border-slate-400" : ""}
          >
            <CardHeader>
              <CardTitle>{scenario.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">{scenario.description}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Agent</dt>
                  <dd className="font-medium text-slate-950">{scenario.request.agentId}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Vendor</dt>
                  <dd className="font-medium text-slate-950">{scenario.request.vendorId}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-medium text-slate-950">
                    {formatCurrency(scenario.request.amountCents)}
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                className="mt-5 w-full"
                variant={scenario.id === "dangerous" ? "danger" : "secondary"}
                disabled={loadingScenario !== null}
                onClick={() => void runScenario(scenario)}
              >
                {loadingScenario === scenario.id ? "Simulating" : scenario.buttonLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4">
        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Request result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <ResultField label="Request" value={result.paymentRequest.id} />
                  <ResultField label="Agent" value={result.paymentRequest.agent.name} />
                  <ResultField label="Vendor" value={result.paymentRequest.vendor.name} />
                  <ResultField
                    label="Amount"
                    value={formatCurrency(result.paymentRequest.amountCents)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <ResultBadge label="Policy" value={result.policyResult.decision} />
                  <ResultBadge label="Risk" value={result.paymentRequest.riskLevel} />
                  <ResultBadge label="Final status" value={result.paymentRequest.status} />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk score
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">
                    {result.riskResult.score}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {result.riskResult.signals.join(", ")}
                  </p>
                </div>
                {result.fakePayment ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Fake execution
                    </p>
                    <p className="mt-2 text-sm font-medium text-emerald-950">
                      {result.fakePayment.fakeTransactionId}
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      {result.fakePayment.rail} / {result.fakePayment.asset}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Select a scenario to create a real payment request through the API.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {result?.auditLogs.length ? (
              <ol className="space-y-3">
                {result.auditLogs.map((log) => (
                  <li key={log.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">{log.action}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{log.actor}</p>
                    <p className="mt-2 text-sm text-slate-600">{log.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-600">
                Audit events appear here after a scenario runs.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function ResultBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2">
        <StatusBadge value={value} />
      </div>
    </div>
  );
}

