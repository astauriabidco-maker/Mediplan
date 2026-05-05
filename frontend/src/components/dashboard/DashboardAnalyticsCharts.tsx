import { memo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Sparkles, X } from 'lucide-react';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
];
const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '0.75rem',
  border: 'none',
};
const budgetTooltipStyle = { ...chartTooltipStyle, color: '#fff' };
const tooltipItemStyle = { color: '#fff' };

interface DashboardAnalyticsChartsProps {
  dynamicWidgets: any[];
  services?: any[];
  trends?: any[];
  formatCFA: (value: number) => string;
  onRemoveWidget: (title: string) => void;
}

export const DashboardAnalyticsCharts = memo(function DashboardAnalyticsCharts({
  dynamicWidgets,
  services,
  trends,
  formatCFA,
  onRemoveWidget,
}: DashboardAnalyticsChartsProps) {
  return (
    <>
      {dynamicWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
          {dynamicWidgets.map((widget, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 relative group overflow-hidden shadow-2xl shadow-blue-500/10 hover:border-blue-500/50 transition-all"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {widget.title}
                    </h3>
                    <p className="text-xs text-slate-500">{widget.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveWidget(widget.title)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {widget.chartType === 'PIE' ? (
                    <PieChart>
                      <Pie
                        data={widget.data}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {widget.data.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={chartTooltipStyle}
                        itemStyle={tooltipItemStyle}
                      />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                      />
                    </PieChart>
                  ) : widget.chartType === 'BAR' ? (
                    <BarChart data={widget.data}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {widget.data.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : widget.chartType === 'RADAR' ? (
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      data={widget.data}
                    >
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Radar
                        name="Valeur"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.6}
                      />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                    </RadarChart>
                  ) : (
                    <LineChart data={widget.data}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            Évolution Budgétaire (6 mois)
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends || []}>
                <defs>
                  <linearGradient
                    id="colorMasseSalariale"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val / 1000000}M`}
                />
                <RechartsTooltip
                  contentStyle={budgetTooltipStyle}
                  formatter={(value: any) => [
                    formatCFA(Number(value) || 0),
                    undefined,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="masseSalariale"
                  name="Masse Salariale Net"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorMasseSalariale)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            Poids Budgétaire par Service
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services || []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Bar dataKey="coutsGénérés" radius={[0, 4, 4, 0]} barSize={20}>
                  {services?.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
});
