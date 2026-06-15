import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils.js';

// --- BUTTON ---
export const Button = React.forwardRef(({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        {
          'bg-accent text-white hover:bg-accent-hover shadow-glow': variant === 'default',
          'border border-border bg-transparent text-text hover:bg-white/5': variant === 'outline',
          'bg-transparent hover:bg-white/5 text-text': variant === 'ghost',
          'bg-danger text-white hover:opacity-90 shadow-sm': variant === 'danger',
          'bg-success text-black hover:opacity-90 font-semibold shadow-sm': variant === 'success',
        },
        {
          'h-9 px-4 py-2': size === 'default',
          'h-8 rounded-md px-3 text-xs': size === 'sm',
          'h-10 rounded-md px-8': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";

// --- INPUT ---
export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

// --- TEXTAREA ---
export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

// --- BADGE ---
export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
        {
          'bg-accent/10 border-accent/20 text-accent': variant === 'default',
          'bg-success/10 border-success/20 text-success': variant === 'success' || variant === 'active' || variant === 'sent' || variant === 'delivered',
          'bg-warning/10 border-warning/20 text-warning': variant === 'warning' || variant === 'unsubscribed' || variant === 'queued' || variant === 'sending',
          'bg-danger/10 border-danger/20 text-danger': variant === 'danger' || variant === 'invalid' || variant === 'failed' || variant === 'bounced',
          'bg-white/5 border-border text-muted': variant === 'muted' || variant === 'draft' || variant === 'skipped',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// --- PROGRESS ---
export function Progress({ value = 0, className, ...props }) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/5 border border-border", className)}
      {...props}
    >
      <div
        className="h-full bg-accent transition-all duration-300 ease-out shadow-glow"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// --- SELECT ---
export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

// --- DIALOG / MODAL ---
export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md scale-95 transform rounded-lg border border-border bg-surface p-6 shadow-premium transition-all duration-300 animate-in fade-in zoom-in-95">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function DialogHeader({ children, className }) {
  return <div className={cn("flex flex-col space-y-1.5 text-left", className)}>{children}</div>;
}

export function DialogTitle({ children, className }) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight text-text", className)}>{children}</h2>;
}

export function DialogFooter({ children, className }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>;
}

// --- TABLE ---
export const Table = ({ className, children, ...props }) => (
  <div className="w-full overflow-auto">
    <table className={cn("w-full caption-bottom text-sm text-left border-collapse", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className, children, ...props }) => (
  <thead className={cn("border-b border-border bg-white/[0.02] text-muted font-medium", className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className, children, ...props }) => (
  <tbody className={cn("divide-y divide-border/50", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className, children, ...props }) => (
  <tr className={cn("transition-colors hover:bg-white/[0.01]", className)} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ className, children, ...props }) => (
  <th className={cn("h-10 px-4 align-middle font-medium text-xs uppercase tracking-wider text-muted", className)} {...props}>
    {children}
  </th>
);

export const TableCell = ({ className, children, ...props }) => (
  <td className={cn("p-4 align-middle text-text", className)} {...props}>
    {children}
  </td>
);
