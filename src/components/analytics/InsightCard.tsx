import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Wallet,
  Timer,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { Insight } from '../../lib/insightUtils';

const ICON_MAP: Record<string, any> = {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Wallet,
  Timer,
  Brain,
  Lightbulb,
};

interface InsightCardProps {
  insight: Insight;
}

export default function InsightCard({ insight }: InsightCardProps) {
  const IconComponent = ICON_MAP[insight.icon] || Lightbulb;

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 relative flex flex-col justify-between"
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: `${insight.color}25`,
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${insight.color}20`, color: insight.color }}
            >
              <IconComponent size={16} />
            </div>
            {insight.category && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${insight.color}15`, color: insight.color }}
              >
                {insight.category}
              </span>
            )}
          </div>

          {insight.badge && (
            <span
              className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${insight.color}12`,
                borderColor: `${insight.color}35`,
                color: insight.color,
              }}
            >
              {insight.badge}
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-slate-100 mb-1 leading-snug">{insight.title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{insight.desc}</p>
      </div>

      {insight.recommendation && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
          <span className="text-xs shrink-0" style={{ color: insight.color }}>💡</span>
          <p className="text-[11px] text-slate-300 leading-snug">
            <strong className="font-semibold text-slate-200">Action:</strong> {insight.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
