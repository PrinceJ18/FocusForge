import { useMemo, useState } from 'react';
import { Brain, DollarSign, Zap, BarChart2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { CustomTooltip } from '../components/analytics/CustomTooltip';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/formatCurrency';
import { calculateAnalyticsData } from '../lib/statistics';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', transport: '#06b6d4', shopping: '#ec4899',
  entertainment: '#a855f7', health: '#10b981', education: '#3b82f6',
  utilities: '#6b7280', other: '#8b5cf6',
};

type Period = 'today' | '30d' | '3m';

export default function Analytics() {
  const { expenses, focusSessions, tasks, profile } = useStore();
  const [period, setPeriod] = useState<Period>('30d');

  const days = period === 'today' ? 1 : period === '30d' ? 30 : 90;

  const data = useMemo(() => {
    return calculateAnalyticsData({ expenses, focusSessions, tasks, profile, period });
  }, [expenses, focusSessions, tasks, profile, period]);

  return (
    <div className="page-enter space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['today', '30d', '3m'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: period === p ? 'rgba(168,85,247,0.2)' : 'transparent',
                color: period === p ? 'white' : 'var(--text-muted)',
                border: period === p ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                borderRadius: 10,
              }}
            >
              {p === 'today' ? 'Daily' : p === '30d' ? '30 Days' : '3 Months'}
            </button>
          ))}
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Total Spent: </span>
            <span className="font-bold" style={{ color: '#ef4444' }}>{formatCurrency(data.totalSpent)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Total Focus: </span>
            <span className="font-bold" style={{ color: '#a855f7' }}>
              {(data.totalFocus / 60).toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass-card p-5" style={{ border: '1px solid rgba(168,85,247,0.2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
          >
            <Zap size={16} className="text-white" />
          </div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>AI Insights</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
          >
            Powered by Analytics
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className="p-3 rounded-12"
              style={{
                background: `${insight.color}10`,
                border: `1px solid ${insight.color}25`,
                borderRadius: 12,
              }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base">{insight.icon}</span>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Focus & Finance Analytics — Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Analytics */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.15)' }}
            >
              <Brain size={16} style={{ color: '#a855f7' }} />
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Focus Analytics</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={period === 'today' ? data.combined : data.combined.slice(-Math.min(days, 30))}>
              <defs>
                <linearGradient id="focusGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} interval={Math.floor(days / 7)} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="focus" name="Focus (min)" stroke="#a855f7" fill="url(#focusGradAnalytics)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, stroke: '#a855f7', strokeWidth: 2, fill: '#1a1a2e' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <AnalyticsPill label="Today" value={`${data.todayFocusMin}m`} color="#a855f7" />
            <AnalyticsPill label="This Week" value={`${data.weeklyFocusMin}m`} color="#7c3aed" />
            <AnalyticsPill label="This Month" value={`${(data.monthlyFocusMin / 60).toFixed(1)}h`} color="#ec4899" />
            <AnalyticsPill label="Sessions" value={String(data.monthlySessions)} color="#06b6d4" />
          </div>
        </div>

        {/* Finance Analytics */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(236,72,153,0.15)' }}
            >
              <DollarSign size={16} style={{ color: '#ec4899' }} />
            </div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Finance Analytics</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={period === 'today' ? data.combined : data.combined.slice(-Math.min(days, 30))}>
              <defs>
                <linearGradient id="spendGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} interval={Math.floor(days / 7)} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="spending" name="Spending" stroke="#ec4899" fill="url(#spendGradAnalytics)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, stroke: '#ec4899', strokeWidth: 2, fill: '#1a1a2e' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <AnalyticsPill label="Today" value={formatCurrency(data.todaySpent)} color="#ec4899" />
            <AnalyticsPill label="This Week" value={formatCurrency(data.weeklySpent)} color="#f59e0b" />
            <AnalyticsPill label="This Month" value={formatCurrency(data.monthlySpent)} color="#ef4444" />
            <AnalyticsPill label="Top Category" value={data.topCategory} color="#8b5cf6" isText />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Spending by Category</h3>
          {data.categoryData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.categoryData} cx="50%" cy="50%" outerRadius={85} dataKey="value" paddingAngle={3}>
                    {data.categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {data.categoryData.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.fill }} />
                    <span className="text-xs truncate capitalize" style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                    <span className="text-xs ml-auto font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Weekly focus */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Weekly Focus Hours</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.weeklyFocus} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Bar dataKey="hours" name="Focus Hours" fill="url(#focusBarGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="focusBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Activity Heatmap (12 Weeks)</h3>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1 flex-shrink-0" style={{ paddingTop: 24 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-xs text-center" style={{ height: 14, color: 'var(--text-muted)', lineHeight: '14px' }}>
                {i % 2 === 0 ? d : ''}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-1 flex-shrink-0">
            {data.heatmap.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {wi % 4 === 0 && (
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', height: 14, lineHeight: '14px' }}>
                    {format(new Date(week[0]?.date || new Date()), 'MMM')}
                  </div>
                )}
                {wi % 4 !== 0 && <div style={{ height: 14 }} />}
                {week.map((day, di) => {
                  const intensity = Math.min((day.focus / 120) * 100, 100);
                  const color = day.focus > 0 ? `rgba(168,85,247,${0.2 + intensity * 0.008})` : 'rgba(255,255,255,0.04)';
                  return (
                    <div
                      key={di}
                      className="heatmap-cell"
                      title={`${day.date}: ${day.focus}m focus, ${formatCurrency(day.spending)} spent`}
                      style={{
                        width: 14, height: 14,
                        background: color,
                        border: `1px solid ${day.focus > 60 ? 'rgba(168,85,247,0.4)' : 'transparent'}`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Less</span>
          {[0.05, 0.2, 0.4, 0.6, 0.8].map((o, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(168,85,247,${o})` }} />
          ))}
          <span>More focus</span>
        </div>
      </div>

      {/* Focus vs Spending Scatter */}
      {data.scatterData.length > 3 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Focus vs Spending Analysis</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Each point represents a day. Higher focus often correlates with controlled spending.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="x" name="Focus (min)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} label={{ value: 'Focus (min)', position: 'insideBottomRight', offset: -10, fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <YAxis dataKey="y" name="Spending ($)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} label={{ value: `Spending (${formatCurrency(data.totalSpent)})`, angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <ZAxis dataKey="z" range={[40, 80]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Scatter data={data.scatterData} fill="#a855f7" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)' }}>
      <div className="text-center">
        <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No data for this period</p>
      </div>
    </div>
  );
}

function AnalyticsPill({ label, value, color, isText }: { label: string; value: string; color: string; isText?: boolean }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center transition-all duration-300 hover:scale-[1.03]"
      style={{ background: `${color}10`, border: `1px solid ${color}18` }}
    >
      <div
        className="text-sm font-bold"
        style={{
          color,
          fontFamily: isText ? 'Inter, sans-serif' : 'Space Grotesk, sans-serif',
          textTransform: isText ? 'capitalize' : 'none',
        }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}
