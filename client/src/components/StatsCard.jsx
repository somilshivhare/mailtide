import React from 'react';
import { cn } from '../lib/utils.js';

export default function StatsCard({ title, value, description, icon: Icon, trend, trendType = 'neutral', className }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:border-white/10 hover:shadow-premium", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-muted" />}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-text">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded-full border",
              {
                'bg-success/10 border-success/20 text-success': trendType === 'positive',
                'bg-danger/10 border-danger/20 text-danger': trendType === 'negative',
                'bg-white/5 border-border text-muted': trendType === 'neutral',
              }
            )}
          >
            {trend}
          </span>
        )}
      </div>
      {description && <p className="mt-2 text-xs text-muted leading-relaxed">{description}</p>}
    </div>
  );
}
