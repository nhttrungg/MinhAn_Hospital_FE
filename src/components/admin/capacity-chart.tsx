"use client";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--ma-surface)",
  borderColor: "var(--ma-border)",
  borderRadius: "var(--ma-radius-sm)",
  color: "var(--ma-text)",
};
const axisTickStyle = { fill: "var(--ma-chart-axis)", fontSize: 12 };

export function CapacityChart({
  data,
}: {
  data: { label: string; serving: number; booked: number; examined: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="var(--ma-chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTickStyle} stroke="var(--ma-border)" />
        <YAxis tick={axisTickStyle} stroke="var(--ma-border)" />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="serving" name="Chỗ phục vụ" fill="var(--ma-border-strong)" />
        <Bar dataKey="booked" name="Lịch hẹn hợp lệ" fill="var(--ma-action)" />
        <Bar dataKey="examined" name="Lượt thực khám" fill="var(--ma-status-info-fg)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
