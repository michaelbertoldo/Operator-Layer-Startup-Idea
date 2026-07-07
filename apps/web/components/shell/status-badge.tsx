import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  value: string;
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
        : value === "Disabled" ||
            value === "Blocked" ||
            value === "High" ||
            value === "Frozen"
          ? "danger"
          : "default";

  return <Badge variant={variant}>{value}</Badge>;
}
