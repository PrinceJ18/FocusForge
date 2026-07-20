import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CustomTooltip } from './CustomTooltip';

interface CategoryPieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}

const DEFAULT_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];

export default function CategoryPieChart({ data, height = 250 }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-slate-500 text-xs text-center py-4">No data available</div>;
  }

  return (
    <div className="chart-fade-in" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
