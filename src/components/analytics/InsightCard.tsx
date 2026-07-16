import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Wallet, Timer, Brain } from 'lucide-react';
import { Insight } from '../../lib/insightUtils';

const ICON_MAP: Record<string, any> = {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Wallet,
  Timer,
  Brain
};

interface InsightCardProps {
  insight: Insight;
}

export default function InsightCard({ insight }: InsightCardProps) {
  const IconComponent = ICON_MAP[insight.icon] || CheckCircle;

  return (
    <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex items-start gap-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${insight.color}20`, color: insight.color }}
        >
          <IconComponent size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-1">{insight.title}</h4>
          <p className="text-xs text-slate-400">{insight.desc}</p>
        </div>
      </div>
    </div>
  );
}
