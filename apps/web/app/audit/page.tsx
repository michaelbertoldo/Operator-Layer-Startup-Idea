import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { getAuditLogs } from "@/lib/data";
import { formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auditLogs = await getAuditLogs();

  return (
    <>
      <PageHeader
        title="Audit"
        description="Database-backed audit log of policy checks, risk scoring, simulated execution, and approval routing events."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <Td>{formatTime(log.createdAt)}</Td>
                  <Td>{log.actor}</Td>
                  <Td className="font-medium text-slate-900">{log.action}</Td>
                  <Td>{log.target}</Td>
                  <Td>{log.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

