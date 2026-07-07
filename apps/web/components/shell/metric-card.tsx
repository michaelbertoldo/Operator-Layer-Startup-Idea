import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

