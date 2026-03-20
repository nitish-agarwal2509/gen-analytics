import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { Card } from "@/components/ui/card";

interface LineChartViewProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
}

export function LineChartView({ data, xKey, yKey, title }: LineChartViewProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            fill="rgba(108, 99, 255, 0.08)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#6C63FF"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
