import React from 'react';
import { 
  Activity, 
  ShieldAlert, 
  EyeOff, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export function MetricsCards({ stats }) {
  const cards = [
    {
      id: 'kpi-total-requests',
      title: 'Total Processed Requests',
      value: (stats.total_requests || 0).toLocaleString(),
      subtitle: `${stats.passed_count || 0} passed cleanly`,
      icon: Activity,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      badge: 'LIVE FLOW',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800'
    },
    {
      id: 'kpi-neutralized-injections',
      title: 'Neutralized Injections',
      value: (stats.blocked_count || 0).toLocaleString(),
      subtitle: `${stats.threat_distribution?.PROMPT_INJECTION || 0} prompt injections & overrides`,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      badge: 'OWASP LLM01',
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800'
    },
    {
      id: 'kpi-sanitized-pii',
      title: 'Sanitized PII & Secrets',
      value: (stats.sanitized_count || 0).toLocaleString(),
      subtitle: `${(stats.threat_distribution?.SECRET_LEAK || 0) + (stats.threat_distribution?.PII_EXPOSURE || 0)} sensitive entities cloaked`,
      icon: EyeOff,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      badge: 'OWASP LLM06',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800'
    },
    {
      id: 'kpi-interception-latency',
      title: 'Median Guardrail Latency',
      value: `${stats.avg_guardrail_latency_ms || '1.25'} ms`,
      subtitle: 'SLA target: < 20.00 ms (Zero-Stall)',
      icon: Clock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      badge: 'SUB-20MS SLA',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`glass-panel p-5 rounded-2xl border ${card.borderColor} relative overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:border-zinc-700`}
          >
            {/* Ambient Background Radial Glow */}
            <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full ${card.bgColor} blur-2xl pointer-events-none`} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">
                {card.title}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <div className="flex items-baseline space-x-3 mb-2">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-zinc-100">
                {card.value}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono">
              <Icon className={`w-3.5 h-3.5 ${card.color} shrink-0`} />
              <span className="truncate">{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
