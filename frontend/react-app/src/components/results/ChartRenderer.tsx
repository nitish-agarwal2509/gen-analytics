import type { VizConfig, QueryResults } from "@/types/api";
import { BarChartView } from "./BarChart";
import { LineChartView } from "./LineChart";
import { MetricCard } from "./MetricCard";

interface ChartRendererProps {
  vizConfig: VizConfig;
  results: QueryResults;
}

export function ChartRenderer({ vizConfig, results }: ChartRendererProps) {
  const { chart_type, x_axis, y_axis, title } = vizConfig;
  const { rows } = results;

  if (!rows || rows.length === 0) return null;

  switch (chart_type) {
    case "bar_chart":
      return (
        <BarChartView
          data={rows}
          xKey={x_axis ?? ""}
          yKey={y_axis ?? ""}
          title={title}
        />
      );
    case "line_chart":
      return (
        <LineChartView
          data={rows}
          xKey={x_axis ?? ""}
          yKey={y_axis ?? ""}
          title={title}
        />
      );
    case "metric_card":
      return (
        <MetricCard
          value={y_axis ? rows[0]?.[y_axis] : Object.values(rows[0] ?? {})[0]}
          label={title}
        />
      );
    case "table":
      return null; // ResultTable handles this
    default:
      return null;
  }
}
