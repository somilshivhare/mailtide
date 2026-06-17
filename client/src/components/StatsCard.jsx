import React from 'react';
import { cn } from '../lib/utils.js';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPI / Stats card — clean light-theme design.
 * Props: title, value, description, icon (lucide), trend (string), trendType ('positive'|'negative'|'neutral')
 */
export default function StatsCard({ title, value, description, icon: Icon, trend, trendType = 'neutral', className }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-white p-5 shadow-card hover:shadow-md transition-shadow duration-200",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-text tracking-tight leading-none">{value ?? 0}</p>
          {description && (
            <p className="mt-1 text-xs text-muted leading-snug">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/8 border border-accent/15">
            <Icon className="h-4 w-4 text-accent" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendType === 'positive' && <TrendingUp className="h-3 w-3 text-success" />}
          {trendType === 'negative' && <TrendingDown className="h-3 w-3 text-danger" />}
          {trendType === 'neutral' && <Minus className="h-3 w-3 text-muted" />}
          <span className={cn(
            "text-xs font-medium",
            trendType === 'positive' && "text-success",
            trendType === 'negative' && "text-danger",
            trendType === 'neutral' && "text-muted",
          )}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
