import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  formatter?: (value: any) => string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function CustomTooltip(props: any) {
  const { active, payload, label, formatter, valuePrefix = '', valueSuffix = '' } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-border rounded-xl p-3 shadow-xl pointer-events-none">
        <p className="text-text-primary font-bold text-sm mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            const displayValue = formatter ? formatter(entry.value) : `${valuePrefix}${entry.value}${valueSuffix}`;
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: entry.color || entry.payload.fill }} 
                  />
                  <span className="text-text-muted capitalize truncate max-w-[120px]">{entry.name}</span>
                </div>
                <span className="text-text-primary font-semibold tabular-nums">
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}
