import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CustomTooltip } from './CustomTooltip';

interface TrendChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}

export default function TrendChart({
  data,
  xKey,
  yKey,
  color = '#a855f7',
  height = 200
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-slate-500 text-xs text-center py-4">No data available</div>;
  }

  return (
    <div className="chart-fade-in" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 10 }}>
          <defs>
            <linearGradient id={`color-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey={xKey} 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip valueSuffix={yKey === 'spent' ? '' : 'm'} valuePrefix={yKey === 'spent' ? '$' : ''} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area 
            type="monotone" 
            dataKey={yKey} 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#color-${yKey})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
