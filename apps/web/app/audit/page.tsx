import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { auditLogs } from "@/lib/mock-data";

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit"
        description="Immutable-style mock log of policy checks, risk scoring, simulated execution, and approval routing events."
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
                  <Td>{log.time}</Td>
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

