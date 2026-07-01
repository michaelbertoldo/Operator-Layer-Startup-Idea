import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace controls for the fake-money MVP environment and policy authorization defaults."
      />
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-950">Acme AI Operations</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Environment</span>
              <Badge variant="success">Fake-money MVP</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Payment executor</span>
              <span className="font-medium text-slate-950">FAKE_X402</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Default authorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">New vendor requests</span>
              <span className="font-medium text-slate-950">Require approval</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">High risk requests</span>
              <span className="font-medium text-slate-950">Block</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Audit logging</span>
              <Badge variant="success">Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

