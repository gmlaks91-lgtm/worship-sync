"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminDashboardStats } from "@/features/admin-dashboard/queries/getAdminDashboardStats";
import { CHART_AXIS, CHART_COLORS, CHART_PALETTE } from "@/features/admin-dashboard/lib/chart-colors";

type AdminDashboardChartsProps = {
  stats: AdminDashboardStats;
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px -8px rgba(56, 189, 248, 0.25)",
  fontSize: "12px",
};

export function AdminDashboardCharts({ stats }: AdminDashboardChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="가장 많이 불린 찬양 TOP 5" description="셋리스트 등록 기준 누적">
        <TopSongsChart data={stats.topSongs} />
      </ChartCard>

      <ChartCard
        title="청년부 주간 일지 작성률"
        description={stats.weekRangeLabel}
      >
        <JournalPieChart
          data={stats.journalParticipation}
          total={stats.journalParticipationTotal}
        />
      </ChartCard>

      <ChartCard
        title="상점 아이템 판매 랭킹"
        description="구매(인벤토리) 누적"
        className="lg:col-span-2"
      >
        <ShopSalesChart data={stats.shopSalesRanking} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`surface-card flex flex-col gap-4 ${className}`}
    >
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-gradient-to-br from-sky-50/50 to-rose-50/40 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function TopSongsChart({ data }: { data: AdminDashboardStats["topSongs"] }) {
  if (data.length === 0) {
    return <EmptyChartMessage message="아직 셋리스트에 등록된 곡이 없어요." />;
  }

  const chartData = data.map((item) => ({
    name: truncateLabel(item.title, 14),
    fullTitle: item.title,
    count: item.playCount,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={CHART_AXIS.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
            axisLine={{ stroke: CHART_AXIS.grid }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(186, 230, 253, 0.35)" }}
            formatter={(value) => [`${value}회`, "등록"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.fullTitle ?? ""
            }
          />
          <Bar dataKey="count" radius={[10, 10, 4, 4]} maxBarSize={48}>
            {chartData.map((_, index) => (
              <Cell
                key={`song-${index}`}
                fill={CHART_PALETTE[index % CHART_PALETTE.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function JournalPieChart({
  data,
  total,
}: {
  data: AdminDashboardStats["journalParticipation"];
  total: number;
}) {
  if (total === 0) {
    return <EmptyChartMessage message="청년부원(general) 프로필이 없어요." />;
  }

  if (data.length === 0) {
    return <EmptyChartMessage message="이번 주 작성 데이터가 아직 없어요." />;
  }

  const written = data.find((d) => d.name === "일지 작성")?.value ?? 0;
  const rate = total > 0 ? Math.round((written / total) * 100) : 0;

  return (
    <div className="relative h-[280px] w-full">
      <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="block text-2xl font-semibold text-sky-600">{rate}%</span>
        <span className="text-xs text-slate-500">작성률</span>
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={3}
            stroke="transparent"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [
              `${value}명 (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ShopSalesChart({ data }: { data: AdminDashboardStats["shopSalesRanking"] }) {
  if (data.length === 0) {
    return <EmptyChartMessage message="아직 판매된 상점 아이템이 없어요." />;
  }

  const chartData = data.map((item) => ({
    name: truncateLabel(item.name, 16),
    fullName: item.name,
    sales: item.salesCount,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke={CHART_AXIS.grid} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
            axisLine={{ stroke: CHART_AXIS.grid }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(254, 205, 211, 0.35)" }}
            formatter={(value) => [`${value}건`, "판매"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.fullName ?? ""
            }
          />
          <Bar dataKey="sales" radius={[0, 10, 10, 0]} maxBarSize={28}>
            {chartData.map((_, index) => (
              <Cell
                key={`shop-${index}`}
                fill={
                  index % 2 === 0 ? CHART_COLORS.rose : CHART_COLORS.amber
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function truncateLabel(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
