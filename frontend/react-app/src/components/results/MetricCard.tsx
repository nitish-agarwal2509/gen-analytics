import { Card } from "@/components/ui/card";

interface MetricCardProps {
  value: unknown;
  label: string;
}

export function MetricCard({ value, label }: MetricCardProps) {
  const formatted =
    typeof value === "number" ? value.toLocaleString() : String(value ?? "—");

  return (
    <Card className="flex flex-col items-center justify-center p-6">
      <span className="text-3xl font-bold tracking-tight">{formatted}</span>
      <span className="mt-1 text-sm text-muted-foreground">{label}</span>
    </Card>
  );
}
