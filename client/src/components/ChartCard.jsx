import React from 'react';
import { cn } from '../lib/utils.js';

/**
 * Chart wrapper card with title + description.
 * Renders children in a fixed-height chart area.
 */
export default function ChartCard({ title, description, className, height = 260, children }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-white shadow-card",
      className
    )}>
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {description && (
          <p className="text-xs text-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5" style={{ height }}>
        {children}
      </div>
    </div>
  );
}
