"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--ma-surface)",
  borderColor: "var(--ma-border)",
  borderRadius: "var(--ma-radius-sm)",
  color: "var(--ma-text)",
};
const axisTickStyle = { fill: "var(--ma-chart-axis)", fontSize: 12 };

export function ClinicalHistoryChart({
  data,
  unit,
}: {
  data: { date: string; numericValue: number | null }[];
  unit: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="var(--ma-chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={axisTickStyle} stroke="var(--ma-border)" />
        <YAxis tick={axisTickStyle} stroke="var(--ma-border)" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line dataKey="numericValue" name={unit} stroke="var(--ma-action)" connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
