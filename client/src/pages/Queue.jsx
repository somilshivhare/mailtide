import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Clock, CheckCircle, XCircle, Activity, RefreshCw, Database, Server, Wifi } from 'lucide-react';
import { campaignsAPI } from '../services/api.js';
import { formatDate } from '../lib/utils.js';
import { Badge, Button } from '../components/ui/custom.jsx';

function StatTile({ label, value, icon: Icon, color, bg }) {
  return (
    <div className={`rounded-xl border border-border ${bg} p-5 flex items-start gap-4`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} bg-white border border-border shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text leading-none">{value}</p>
        <p className="text-xs text-muted font-medium mt-1 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

function InfraChip({ icon: Icon, label, status, detail }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3 shadow-card">
      <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-50 border border-border">
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text">{label}</p>
        {detail && <p className="text-xs text-muted truncate">{detail}</p>}
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${status === 'online' ? 'text-success' : 'text-danger'}`}>
        <span className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-success' : 'bg-danger'} animate-pulse`} />
        {status === 'online' ? 'Online' : 'Offline'}
      </div>
    </div>
  );
}

export default function Queue() {
  // Derive queue statistics from all campaigns
  const { data: allRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['queue-all-campaigns'],
    queryFn: () => campaignsAPI.getAll(1, 100),
    refetchInterval: 8000,  // auto-refresh every 8s
  });

  const campaigns = allRes?.campaigns || [];

  // Aggregate queue stats by campaign status
  const stats = {
    queued:     campaigns.filter((c) => c.status === 'queued').length,
    sending:    campaigns.filter((c) => c.status === 'sending').length,
    sent:       campaigns.filter((c) => c.status === 'sent').length,
    failed:     campaigns.filter((c) => c.status === 'failed').length,
    draft:      campaigns.filter((c) => c.status === 'draft').length,
  };

  const totalJobs = campaigns.reduce((acc, c) => acc + (c.totalSubscribers || 0), 0);
  const processedJobs = campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0);

  const activeCampaigns = campaigns.filter((c) => c.status === 'sending' || c.status === 'queued');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Queue Monitor</h2>
          <p className="text-sm text-muted mt-0.5">Live visibility into BullMQ job processing, Redis, and workers.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Infrastructure status */}
      <div className="grid sm:grid-cols-3 gap-3">
        <InfraChip icon={Database} label="MongoDB" status="online" detail="mongodb://127.0.0.1:27017/mailflow" />
        <InfraChip icon={Server} label="Redis / BullMQ" status="online" detail="redis://127.0.0.1:6379" />
        <InfraChip icon={Wifi} label="Worker Process" status="online" detail="mailtide-emails queue · concurrency 5" />
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Queued" value={stats.queued} icon={Clock} color="text-warning" bg="bg-warning-bg" />
        <StatTile label="Processing" value={stats.sending} icon={Activity} color="text-accent" bg="bg-accent/5" />
        <StatTile label="Completed" value={stats.sent} icon={CheckCircle} color="text-success" bg="bg-success-bg" />
        <StatTile label="Failed" value={stats.failed} icon={XCircle} color="text-danger" bg="bg-danger-bg" />
      </div>

      {/* Job counters */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-white shadow-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Email Jobs</p>
          <div className="space-y-3">
            {[
              { label: 'Total Jobs Dispatched', value: totalJobs },
              { label: 'Jobs Processed (sent)', value: processedJobs },
              { label: 'Jobs Remaining', value: Math.max(0, totalJobs - processedJobs) },
              { label: 'Active Campaigns', value: stats.queued + stats.sending },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted">{label}</span>
                <span className="text-sm font-semibold text-text">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white shadow-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Worker Configuration</p>
          <div className="space-y-3">
            {[
              { label: 'Queue Name', value: 'mailtide-emails' },
              { label: 'Concurrency', value: '5 parallel jobs' },
              { label: 'Rate Limit', value: '50 emails / sec' },
              { label: 'Scheduler Queue', value: 'mailtide-campaign-scheduler' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted">{label}</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded border border-border text-text">{value}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active campaigns */}
      <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Active Queue</h3>
          {(stats.sending + stats.queued) > 0 && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-warning font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              Processing
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          </div>
        ) : activeCampaigns.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-text">Queue is empty</p>
            <p className="text-xs text-muted mt-1">No campaigns currently processing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {['Campaign', 'Status', 'Jobs Total', 'Sent', 'Progress', 'Started'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeCampaigns.map((c) => {
                  const pct = c.totalSubscribers > 0 ? Math.round((c.totalSent / c.totalSubscribers) * 100) : 0;
                  return (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-text">{c.title}</td>
                      <td className="px-5 py-3.5"><Badge variant={c.status}>{c.status}</Badge></td>
                      <td className="px-5 py-3.5 text-muted">{c.totalSubscribers || 0}</td>
                      <td className="px-5 py-3.5 text-muted">{c.totalSent || 0}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                        {c.sentAt ? formatDate(c.sentAt).split(',')[0] : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All campaigns status summary */}
      <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text">All Campaigns — Status Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['Campaign', 'Status', 'Audience', 'Sent', 'Failed', 'Date'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.slice(0, 20).map((c) => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-text max-w-[180px] truncate">{c.title}</td>
                  <td className="px-5 py-3.5"><Badge variant={c.status}>{c.status}</Badge></td>
                  <td className="px-5 py-3.5 text-muted">{c.totalSubscribers || 0}</td>
                  <td className="px-5 py-3.5 text-muted">{c.totalSent || 0}</td>
                  <td className="px-5 py-3.5 text-muted">{c.totalBounced || 0}</td>
                  <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                    {formatDate(c.sentAt || c.createdAt).split(',')[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh note */}
      <p className="text-center text-xs text-muted">
        Auto-refreshes every 8 seconds. Built on <strong>BullMQ + Redis</strong> with 5-worker concurrency.
      </p>
    </div>
  );
}
