import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Td, Th, Table } from "@/components/ui/table";
import { formatCurrency, vendors } from "@/lib/mock-data";

export default function VendorsPage() {
  return (
    <>
      <PageHeader
        title="Vendors"
        description="Approved, pending, and blocked vendors used by agents when requesting paid MCP or API calls."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Vendor</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Requests</Th>
                <Th>Simulated spend</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <Td>
                    <p className="font-medium text-slate-900">{vendor.name}</p>
                    <p className="text-xs text-slate-500">{vendor.id}</p>
                  </Td>
                  <Td>{vendor.category}</Td>
                  <Td><StatusBadge value={vendor.status} /></Td>
                  <Td>{vendor.requests}</Td>
                  <Td>{formatCurrency(vendor.spend)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

