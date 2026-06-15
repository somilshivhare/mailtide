import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import useCampaign from '../hooks/useCampaign.js';
import { Progress, Badge } from './ui/custom.jsx';

export default function ProgressTracker({ campaignId }) {
  const { useCampaignStatusQuery } = useCampaign();
  
  // Poll status every 5 seconds.
  // The hook already stops polling if campaign status is 'sent' or 'failed'.
  const { data, isLoading, error } = useCampaignStatusQuery(campaignId, {
    refetchInterval: 5000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 border border-border bg-surface rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="ml-3 text-sm text-muted">Loading dispatch status...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 border border-danger/20 bg-danger/5 rounded-lg text-sm text-danger">
        Failed to load real-time campaign dispatch metrics.
      </div>
    );
  }

  const { status, totalSubscribers, stats } = data;
  
  // Calculate completion percentage
  // Progress comprises anything dispatched (sent, delivered, bounced, failed, skipped)
  const completedJobs = (stats.sent || 0) + (stats.delivered || 0) + (stats.bounced || 0) + (stats.failed || 0) + (stats.skipped || 0);
  const progressPercent = totalSubscribers > 0 ? (completedJobs / totalSubscribers) * 100 : 0;

  const isSending = status === 'sending' || status === 'queued';
  const isSent = status === 'sent';

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text text-sm">Dispatch Progress</h3>
          {isSending && <Loader2 className="h-3 w-3 animate-spin text-accent" />}
          {isSent && <CheckCircle2 className="h-4 w-4 text-success" />}
        </div>
        <Badge variant={status}>{status}</Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted mb-1.5">
          <span>{Math.round(progressPercent)}% Complete</span>
          <span>{completedJobs} / {totalSubscribers} subscribers</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-border bg-white/[0.01] p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Queued</span>
          <p className="mt-1 text-lg font-bold text-text">{stats.queued || 0}</p>
        </div>
        <div className="rounded border border-border bg-white/[0.01] p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Sending/Sent</span>
          <p className="mt-1 text-lg font-bold text-accent">{stats.sent || 0}</p>
        </div>
        <div className="rounded border border-border bg-white/[0.01] p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Delivered</span>
          <p className="mt-1 text-lg font-bold text-success">{stats.delivered || 0}</p>
        </div>
        <div className="rounded border border-border bg-white/[0.01] p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Bounced</span>
          <p className="mt-1 text-lg font-bold text-danger">{stats.bounced || 0}</p>
        </div>
      </div>

      {isSent && (
        <div className="mt-6 border-t border-border/50 pt-4 text-center">
          <p className="text-xs text-success font-medium">✨ Campaign dispatch completed successfully! Metrics will update as subscribers interact with your emails.</p>
        </div>
      )}
    </div>
  );
}
