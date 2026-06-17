import React from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import useCampaign from '../hooks/useCampaign.js';
import { Progress, Badge } from './ui/custom.jsx';

export default function ProgressTracker({ campaignId }) {
  const { useCampaignStatusQuery } = useCampaign();

  const { data, isLoading, error } = useCampaignStatusQuery(campaignId, {
    refetchInterval: 5000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 border border-border bg-white rounded-xl shadow-card">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="ml-2.5 text-sm text-muted">Loading dispatch status...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 border border-danger-border bg-danger-bg rounded-xl text-sm text-danger flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Failed to load campaign dispatch metrics.
      </div>
    );
  }

  const { status, totalSubscribers, stats } = data;

  const completedJobs = (stats.sent || 0) + (stats.delivered || 0) + (stats.bounced || 0) + (stats.failed || 0) + (stats.skipped || 0);
  const progressPercent = totalSubscribers > 0 ? (completedJobs / totalSubscribers) * 100 : 0;

  const isSending = status === 'sending' || status === 'queued';
  const isSent = status === 'sent';
  const isFailed = status === 'failed';

  return (
    <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          {isSending && <Loader2 className="h-4 w-4 animate-spin text-warning" />}
          {isSent && <CheckCircle2 className="h-4 w-4 text-success" />}
          {isFailed && <XCircle className="h-4 w-4 text-danger" />}
          <h3 className="text-sm font-semibold text-text">Dispatch Progress</h3>
        </div>
        <Badge variant={status}>{status}</Badge>
      </div>

      {/* Progress section */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <span className="font-medium">{Math.round(progressPercent)}% Complete</span>
          <span>{completedJobs} / {totalSubscribers} subscribers</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 divide-x divide-border">
        {[
          { label: 'Queued', value: stats.queued || 0, color: 'text-muted' },
          { label: 'Sent', value: stats.sent || 0, color: 'text-accent' },
          { label: 'Delivered', value: stats.delivered || 0, color: 'text-success' },
          { label: 'Failed', value: (stats.bounced || 0) + (stats.failed || 0), color: 'text-danger' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {isSent && (
        <div className="px-5 py-3 bg-success-bg border-t border-success-border text-center">
          <p className="text-xs font-medium text-success">
            ✓ Campaign dispatched successfully. Metrics update as subscribers engage.
          </p>
        </div>
      )}
    </div>
  );
}
