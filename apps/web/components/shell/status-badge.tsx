import { Badge } from "@/components/ui/badge";
import type { AgentStatus, RequestStatus, RiskLevel, VendorStatus } from "@/lib/mock-data";

type StatusBadgeProps = {
  value: AgentStatus | VendorStatus | RequestStatus | RiskLevel | string;
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const variant =
    value === "Active" ||
    value === "Approved" ||
    value === "Executed" ||
    value === "Low"
      ? "success"
      : value === "Paused" ||
          value === "Pending" ||
          value === "Needs approval" ||
          value === "Medium"
        ? "warning"
        : value === "Disabled" || value === "Blocked" || value === "High"
          ? "danger"
          : "default";

  return <Badge variant={variant}>{value}</Badge>;
}

