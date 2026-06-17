import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils.js';

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export const Button = React.forwardRef(({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none",
        {
          // Default: solid indigo
          'bg-accent text-white hover:bg-accent-hover shadow-sm rounded-lg': variant === 'default',
          // Outline: border with subtle bg on hover
          'border border-border bg-white text-text hover:bg-surface rounded-lg shadow-sm': variant === 'outline',
          // Ghost: no border, hover bg
          'bg-transparent hover:bg-surface text-text rounded-lg': variant === 'ghost',
          // Danger
          'bg-danger text-white hover:bg-red-600 shadow-sm rounded-lg': variant === 'danger',
          // Success
          'bg-success text-white hover:bg-emerald-600 shadow-sm rounded-lg': variant === 'success',
        },
        {
          'h-9 px-4 py-2 text-sm': size === 'default',
          'h-7 px-3 text-xs rounded-md': size === 'sm',
          'h-11 px-6 text-base': size === 'lg',
          'h-9 w-9 p-0': size === 'icon',
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

// ─── INPUT ───────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm text-text shadow-sm transition-colors placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

// ─── BADGE ───────────────────────────────────────────────────────────────────
export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
        {
          'bg-indigo-50 border-indigo-200 text-indigo-700': variant === 'default',
          'bg-emerald-50 border-emerald-200 text-emerald-700': variant === 'success' || variant === 'active' || variant === 'sent' || variant === 'delivered',
          'bg-amber-50 border-amber-200 text-amber-700': variant === 'warning' || variant === 'unsubscribed' || variant === 'queued' || variant === 'sending',
          'bg-red-50 border-red-200 text-red-700': variant === 'danger' || variant === 'invalid' || variant === 'failed' || variant === 'bounced',
          'bg-gray-100 border-gray-200 text-gray-600': variant === 'muted' || variant === 'draft' || variant === 'skipped',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────
export function Progress({ value = 0, className, ...props }) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-gray-100 border border-gray-200", className)}
      {...props}
    >
      <div
        className="h-full bg-accent transition-all duration-500 ease-out rounded-full"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ─── SELECT ──────────────────────────────────────────────────────────────────
export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm text-text shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

// ─── DIALOG / MODAL ──────────────────────────────────────────────────────────
export function Dialog({ open, onOpenChange, children, className }) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div className={cn(
        "relative z-10 w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-modal animate-fade-in",
        className
      )}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function DialogHeader({ children, className }) {
  return <div className={cn("flex flex-col space-y-1.5 text-left mb-4", className)}>{children}</div>;
}

export function DialogTitle({ children, className }) {
  return <h2 className={cn("text-base font-semibold text-text leading-none", className)}>{children}</h2>;
}

export function DialogFooter({ children, className }) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 mt-4", className)}>{children}</div>;
}

// ─── TABLE ───────────────────────────────────────────────────────────────────
export const Table = ({ className, children, ...props }) => (
  <div className="w-full overflow-auto rounded-lg border border-border">
    <table className={cn("w-full caption-bottom text-sm text-left border-collapse", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className, children, ...props }) => (
  <thead className={cn("bg-surface border-b border-border", className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className, children, ...props }) => (
  <tbody className={cn("divide-y divide-border bg-white", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className, children, ...props }) => (
  <tr className={cn("transition-colors hover:bg-gray-50/70", className)} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ className, children, ...props }) => (
  <th className={cn("h-10 px-4 align-middle text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap", className)} {...props}>
    {children}
  </th>
);

export const TableCell = ({ className, children, ...props }) => (
  <td className={cn("px-4 py-3 align-middle text-sm text-text", className)} {...props}>
    {children}
  </td>
);

// ─── LABEL ───────────────────────────────────────────────────────────────────
export function Label({ className, children, ...props }) {
  return (
    <label className={cn("text-sm font-medium text-text leading-none", className)} {...props}>
      {children}
    </label>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-xl border border-border bg-white shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex flex-col space-y-1 p-5 border-b border-border", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-sm font-semibold text-text leading-none", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-xs text-muted mt-1", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}
