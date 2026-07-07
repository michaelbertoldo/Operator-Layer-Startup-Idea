import { PageHeader } from "@/components/shell/page-header";
import { DemoClient } from "./demo-client";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return (
    <>
      <PageHeader
        title="Demo"
        description="Investor-ready scenarios that create real payment requests through the API and show policy, risk, final status, and audit logs."
      />
      <DemoClient />
    </>
  );
}

