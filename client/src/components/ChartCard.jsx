import React from 'react';
import { cn } from '../lib/utils.js';

export default function ChartCard({ title, description, children, className }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:border-white/10", className)}>
      <div className="mb-6 flex flex-col space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-text">{title}</h3>
        {description && <p className="text-xs text-muted leading-relaxed">{description}</p>}
      </div>
      <div className="h-[300px] w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
