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
  apiKey: string;
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

type LifecycleStatus = "waiting" | "running" | "complete" | "blocked" | "review";

type LifecycleStep = {
  key: string;
  label: string;
  detail: string;
  status: LifecycleStatus;
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
    },
    apiKey: "key_research"
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
    },
    apiKey: "key_sales"
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
    },
    apiKey: "key_research"
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
          "Authorization": `Bearer ${scenario.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `demo-${scenario.id}-${crypto.randomUUID()}`
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
            <CardTitle>Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <LifecycleTimeline
              loading={loadingScenario !== null}
              result={result}
              error={error}
            />
          </CardContent>
        </Card>

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

function LifecycleTimeline({
  loading,
  result,
  error
}: {
  loading: boolean;
  result: DemoResult | null;
  error: string | null;
}) {
  const steps = getLifecycleSteps({ loading, result, error });

  return (
    <ol className="relative space-y-3">
      {steps.map((step, index) => (
        <li key={step.key} className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex flex-col items-center">
            <div className={getStepDotClass(step.status)}>
              {index + 1}
            </div>
            {index < steps.length - 1 ? (
              <div className="mt-2 h-full min-h-6 w-px bg-slate-200" />
            ) : null}
          </div>
          <div className={getStepCardClass(step.status)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{step.label}</p>
              <span className={getStepPillClass(step.status)}>
                {getStepLabel(step.status)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function getLifecycleSteps({
  loading,
  result,
  error
}: {
  loading: boolean;
  result: DemoResult | null;
  error: string | null;
}): LifecycleStep[] {
  if (error) {
    return [
      {
        key: "request",
        label: "Request submitted",
        detail: "The demo request reached the OperatorLayer API.",
        status: "complete"
      },
      {
        key: "error",
        label: "Request failed",
        detail: error,
        status: "blocked"
      }
    ];
  }

  if (loading) {
    return [
      {
        key: "auth",
        label: "Authenticate agent",
        detail: "Checking the fake demo API key and agent permissions.",
        status: "complete"
      },
      {
        key: "policy",
        label: "Evaluate policy",
        detail: "Checking vendor, category, amount, and budget rules.",
        status: "running"
      },
      {
        key: "risk",
        label: "Score risk",
        detail: "Risk engine is preparing deterministic signals.",
        status: "waiting"
      },
      {
        key: "final",
        label: "Finalize request",
        detail: "The request will execute, route to approval, or block.",
        status: "waiting"
      }
    ];
  }

  if (!result) {
    return [
      {
        key: "ready",
        label: "Ready",
        detail: "Choose a scenario to run the full spend authorization flow.",
        status: "waiting"
      }
    ];
  }

  const status = result.paymentRequest.status;
  const finalStatus: LifecycleStatus =
    status === "Executed"
      ? "complete"
      : status === "Needs approval"
        ? "review"
        : "blocked";
  const reserved = hasAuditAction(result, "BUDGET_RESERVED");
  const frozen = hasAuditAction(result, "REQUEST_BLOCKED_FROZEN");

  return [
    {
      key: "auth",
      label: "Authenticate agent",
      detail: getAuditDetail(result, "AGENT_AUTHENTICATED") ?? "Agent credentials accepted.",
      status: "complete"
    },
    {
      key: "policy",
      label: "Evaluate policy",
      detail: `${result.policyResult.decision}: ${result.policyResult.reasons.join(", ")}`,
      status: result.policyResult.decision === "BLOCK" ? "blocked" : "complete"
    },
    {
      key: "risk",
      label: "Score risk",
      detail: `${result.riskResult.level} risk (${result.riskResult.score}): ${result.riskResult.signals.join(", ")}`,
      status: result.riskResult.level === "HIGH" ? "blocked" : "complete"
    },
    {
      key: "reserve",
      label: frozen ? "Freeze check" : "Reserve budget",
      detail: frozen
        ? getAuditDetail(result, "REQUEST_BLOCKED_FROZEN") ?? "Spend is frozen before reservation."
        : reserved
          ? getAuditDetail(result, "BUDGET_RESERVED") ?? "Budget reserved for this request."
          : "No budget reservation was created for this blocked request.",
      status: frozen || (!reserved && status === "Blocked") ? "blocked" : "complete"
    },
    {
      key: "final",
      label:
        status === "Executed"
          ? "Execute fake payment"
          : status === "Needs approval"
            ? "Route to approval"
            : "Block request",
      detail:
        status === "Executed"
          ? result.fakePayment
            ? `${result.fakePayment.fakeTransactionId} on ${result.fakePayment.rail} / ${result.fakePayment.asset}`
            : "Fake payment execution completed."
          : status === "Needs approval"
            ? getAuditDetail(result, "ROUTED_FOR_APPROVAL") ?? "Human authorization is required."
            : getAuditDetail(result, "REQUEST_BLOCKED") ??
              getAuditDetail(result, "REQUEST_BLOCKED_FROZEN") ??
              "Controls blocked this spend request.",
      status: finalStatus
    },
    {
      key: "audit",
      label: "Write audit trail",
      detail: `${result.auditLogs.length} audit event${result.auditLogs.length === 1 ? "" : "s"} appended to the hash chain.`,
      status: "complete"
    }
  ];
}

function hasAuditAction(result: DemoResult, action: string) {
  return result.auditLogs.some((log) => log.action === action);
}

function getAuditDetail(result: DemoResult, action: string) {
  return result.auditLogs.find((log) => log.action === action)?.detail;
}

function getStepLabel(status: LifecycleStatus) {
  if (status === "running") {
    return "Running";
  }

  if (status === "complete") {
    return "Done";
  }

  if (status === "blocked") {
    return "Blocked";
  }

  if (status === "review") {
    return "Review";
  }

  return "Waiting";
}

function getStepDotClass(status: LifecycleStatus) {
  const base =
    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold";

  if (status === "complete") {
    return `${base} bg-emerald-600 text-white`;
  }

  if (status === "running") {
    return `${base} animate-pulse bg-slate-950 text-white`;
  }

  if (status === "blocked") {
    return `${base} bg-red-600 text-white`;
  }

  if (status === "review") {
    return `${base} bg-amber-500 text-white`;
  }

  return `${base} bg-slate-100 text-slate-500`;
}

function getStepCardClass(status: LifecycleStatus) {
  const base = "rounded-lg border p-4";

  if (status === "complete") {
    return `${base} border-emerald-200 bg-emerald-50`;
  }

  if (status === "running") {
    return `${base} border-slate-300 bg-slate-50`;
  }

  if (status === "blocked") {
    return `${base} border-red-200 bg-red-50`;
  }

  if (status === "review") {
    return `${base} border-amber-200 bg-amber-50`;
  }

  return `${base} border-slate-200 bg-white`;
}

function getStepPillClass(status: LifecycleStatus) {
  const base = "rounded-md border px-2 py-1 text-xs font-medium";

  if (status === "complete") {
    return `${base} border-emerald-200 bg-white text-emerald-700`;
  }

  if (status === "running") {
    return `${base} border-slate-200 bg-white text-slate-700`;
  }

  if (status === "blocked") {
    return `${base} border-red-200 bg-white text-red-700`;
  }

  if (status === "review") {
    return `${base} border-amber-200 bg-white text-amber-800`;
  }

  return `${base} border-slate-200 bg-slate-50 text-slate-500`;
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
