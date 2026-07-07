import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCompanySettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const company = await getCompanySettings();
  const users = company?.users ?? [];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace configuration, fake-money guardrails, authorization defaults, and team access."
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card
          className={
            company?.frozenAt
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={company?.frozenAt ? "Frozen" : "Active"} />
                  <Badge variant="success">Fake-money MVP</Badge>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                  {company?.name ?? "No workspace configured"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  {company?.frozenAt
                    ? company.freezeReason ?? "Company spend is currently frozen."
                    : "This workspace authorizes simulated agent spend with policy checks, risk checks, approvals, budget reservations, and audit logs."}
                </p>
              </div>
              <div className="rounded-lg border border-white/70 bg-white/70 p-4 md:min-w-56">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Executor
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {company?.paymentExecutor ?? "Not configured"}
                </p>
                <p className="mt-1 text-xs text-slate-500">No real funds move</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <SettingRow label="Mode" value={company?.environment ?? "Not configured"} />
            <SettingRow label="Spend rail" value={company?.paymentExecutor ?? "Not configured"} />
            <SettingRow
              label="Company freeze"
              value={company?.frozenAt ? "Enabled" : "Off"}
              tone={company?.frozenAt ? "danger" : "success"}
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Authorization Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <SettingRow label="New vendor requests" value="Require approval" />
            <SettingRow label="High risk requests" value="Block" tone="danger" />
            <SettingRow label="Medium risk requests" value="Route to approval" tone="warning" />
            <SettingRow label="Audit logging" value="Enabled" tone="success" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 1 Guardrails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Fake payment executor only",
              "No wallets or private keys",
              "No custody or real funds",
              "Budget reservations before execution",
              "Hash-chain audit events"
            ].map((guardrail) => (
              <div
                key={guardrail}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-900">{guardrail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Access</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length ? (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-950">{user.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      </div>
                      <Badge>{user.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No users configured"
                detail="Workspace users will appear here once seed data or auth setup creates them."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function SettingRow({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      {tone === "default" ? (
        <span className="text-right font-medium text-slate-950">{value}</span>
      ) : (
        <Badge variant={tone}>{value}</Badge>
      )}
    </div>
  );
}
