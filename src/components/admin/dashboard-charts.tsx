"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { DashboardOverview } from "@/lib/realtime";
import { appointmentLabels, encounterLabels } from "@/lib/outpatient";
import styles from "./dashboard-overview.module.css";
import {
  Disclosure,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";

const colors = [
  "var(--ma-chart-1)",
  "var(--ma-chart-4)",
  "var(--ma-chart-2)",
  "var(--ma-chart-3)",
  "var(--ma-chart-5)",
];
const tooltipStyle = {
  backgroundColor: "var(--ma-surface)",
  borderColor: "var(--ma-border)",
  borderRadius: "var(--ma-radius-sm)",
  color: "var(--ma-text)",
};
const axisTickStyle = { fill: "var(--ma-chart-axis)", fontSize: 12 };

const number = (value: unknown) => Number(value).toLocaleString("vi-VN");
const compactVnd = (value: unknown) => {
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${number(Math.round(n / 1_000))}k`;
  }
  return number(n);
};
const date = (value: string) => `${value.slice(8, 10)}/${value.slice(5, 7)}`;

export default function DashboardCharts({ data }: { data: DashboardOverview }) {
  return (
    <div className={styles.charts}>
      {!!data.visits.length && (
        <section className={styles.chart} aria-label="Lượt khám theo ngày">
          <h3>Lượt khám theo ngày</h3>
          <p>Hoàn tất, hủy và vắng theo ngày lịch hẹn</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.visits} accessibilityLayer>
              <CartesianGrid stroke="var(--ma-chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={date}
                tick={axisTickStyle}
                stroke="var(--ma-border)"
              />
              <YAxis allowDecimals={false} tick={axisTickStyle} stroke="var(--ma-border)" />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => date(String(value))}
              />
              <Legend wrapperStyle={{ color: "var(--ma-text)" }} />
              <Bar dataKey="completed" name="Hoàn tất" stackId="visits" fill={colors[0]} />
              <Bar dataKey="cancelled" name="Hủy" stackId="visits" fill={colors[3]} />
              <Bar dataKey="noShow" name="Vắng" stackId="visits" fill={colors[2]} />
            </BarChart>
          </ResponsiveContainer>
          <Disclosure title="Xem bảng số liệu">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Hoàn tất</TableHead>
                  <TableHead>Hủy</TableHead>
                  <TableHead>Vắng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.visits.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{date(day.date)}</TableCell>
                    <TableCell>{day.completed}</TableCell>
                    <TableCell>{day.cancelled}</TableCell>
                    <TableCell>{day.noShow}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Disclosure>
        </section>
      )}
      {!!data.revenue.length && (
        <section className={styles.chart} aria-label="Thực thu theo ngày">
          <h3>Thực thu theo ngày</h3>
          <p>Tiền thu trừ hoàn tiền · VND</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.revenue} accessibilityLayer>
              <CartesianGrid stroke="var(--ma-chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={date}
                tick={axisTickStyle}
                stroke="var(--ma-border)"
              />
              <YAxis
                width={68}
                tickFormatter={compactVnd}
                tick={axisTickStyle}
                stroke="var(--ma-border)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={number}
                labelFormatter={(value) => date(String(value))}
              />
              <Line
                type="monotone"
                dataKey="amount"
                name="Thực thu"
                stroke={colors[0]}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <Disclosure title="Xem bảng số liệu">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Thực thu (VND)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.revenue.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{date(day.date)}</TableCell>
                    <TableCell>{number(day.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Disclosure>
        </section>
      )}
      {!!data.services.length && (
        <section className={styles.chart} aria-label="Dịch vụ được khám nhiều nhất">
          <h3>5 dịch vụ có nhiều lượt khám</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart accessibilityLayer>
              <Pie
                data={data.services}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {data.services.map((item, i) => (
                  <Cell key={item.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--ma-text)" }} />
            </PieChart>
          </ResponsiveContainer>
          <ul>
            {data.services.map((item) => (
              <li key={item.name}>
                {item.name}: <strong>{number(item.value)}</strong> lượt
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!data.doctors.length && (
        <section className={styles.chart} aria-label="Bác sĩ theo lượt hoàn tất">
          <h3>Bác sĩ theo lượt hoàn tất</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.doctors} layout="vertical" accessibilityLayer>
              <CartesianGrid
                stroke="var(--ma-chart-grid)"
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={axisTickStyle}
                stroke="var(--ma-border)"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={axisTickStyle}
                stroke="var(--ma-border)"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Lượt hoàn tất" fill={colors[1]} />
            </BarChart>
          </ResponsiveContainer>
          <ul>
            {data.doctors.map((item) => (
              <li key={item.name}>
                {item.name}: <strong>{number(item.value)}</strong> lượt
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!data.statuses.length && (
        <section className={styles.chart} aria-label="Khối lượng công việc theo trạng thái">
          <h3>Công việc theo trạng thái</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.statuses.map((item) => ({
                ...item,
                name:
                  appointmentLabels[item.name] ??
                  encounterLabels[item.name] ??
                  labels[item.name] ??
                  item.name,
              }))}
              accessibilityLayer
            >
              <CartesianGrid stroke="var(--ma-chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={axisTickStyle} stroke="var(--ma-border)" />
              <YAxis allowDecimals={false} tick={axisTickStyle} stroke="var(--ma-border)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Số lượng" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
          <ul>
            {data.statuses.map((item) => (
              <li key={item.name}>
                {appointmentLabels[item.name] ??
                  encounterLabels[item.name] ??
                  labels[item.name] ??
                  item.name}
                : <strong>{number(item.value)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
const labels: Record<string, string> = {
  OPEN: "Chưa thu",
  PARTIAL: "Thu một phần",
  PAID: "Đã thu đủ",
  DRAFT: "Đang soạn",
  READY: "Sẵn sàng giao",
  DELIVERED: "Đã giao",
  ISSUED: "Đã chỉ định",
  ACCEPTED: "Đã nhận",
};
