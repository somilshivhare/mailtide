import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Mail, Eye, MousePointer, Plus, ArrowUpRight,
  TrendingUp, Send, Activity, CheckCircle, Clock
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { analyticsAPI, campaignsAPI } from '../services/api.js';
import StatsCard from '../components/StatsCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../components/ui/custom.jsx';
import { formatDate, formatPercent } from '../lib/utils.js';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white shadow-dropdown px-3 py-2 text-xs">
      <p className="text-muted font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text font-semibold" style={{ color: p.color }}>
          {p.name}: <span className="text-text">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Activity Feed Item ───────────────────────────────────────────────────────
function ActivityItem({ icon: Icon, text, time, color }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text leading-snug">{text}</p>
        <p className="text-xs text-muted mt-0.5">{time}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsAPI.getOverview
  });

  const { data: campaignsRes, isLoading: campaignsLoading } = useQuery({
    queryKey: ['recent-campaigns'],
    queryFn: () => campaignsAPI.getAll(1, 5)
  });

  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['subscribers-growth'],
    queryFn: analyticsAPI.getGrowth
  });

  const isLoading = overviewLoading || campaignsLoading || growthLoading;

  const kpis = [
    {
      title: 'Total Subscribers',
      value: overview?.totalSubscribers ?? 0,
      description: 'Active list size',
      icon: Users,
      trend: 'All time',
      trendType: 'neutral'
    },
    {
      title: 'Campaigns Sent',
      value: overview?.totalCampaigns ?? 0,
      description: 'Total dispatched',
      icon: Send,
      trend: 'All time',
      trendType: 'neutral'
    },
    {
      title: 'Avg. Open Rate',
      value: formatPercent(overview?.avgOpenRate),
      description: 'Across all campaigns',
      icon: Eye,
      trend: overview?.avgOpenRate > 25 ? 'Above average' : 'Industry avg ~25%',
      trendType: overview?.avgOpenRate > 25 ? 'positive' : 'neutral'
    },
    {
      title: 'Avg. Click Rate',
      value: formatPercent(overview?.avgClickRate),
      description: 'Across all campaigns',
      icon: MousePointer,
      trend: overview?.avgClickRate > 3 ? 'Above average' : 'Industry avg ~3%',
      trendType: overview?.avgClickRate > 3 ? 'positive' : 'neutral'
    }
  ];

  const recentCampaigns = campaignsRes?.campaigns || [];

  // Build activity feed from recent campaigns
  const activityFeed = recentCampaigns.slice(0, 5).map((c) => {
    if (c.status === 'sent') return { icon: CheckCircle, text: `Campaign "${c.title}" sent to ${c.totalSubscribers} subscribers`, time: formatDate(c.sentAt || c.createdAt), color: 'bg-success/10 text-success' };
    if (c.status === 'sending' || c.status === 'queued') return { icon: Activity, text: `Campaign "${c.title}" is dispatching`, time: formatDate(c.createdAt), color: 'bg-warning/10 text-warning' };
    return { icon: Clock, text: `Draft "${c.title}" created`, time: formatDate(c.createdAt), color: 'bg-gray-100 text-muted' };
  });

  // Normalize growth data for chart
  const chartData = (growthData || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Subscribers: d.totalSubscribers
  }));

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <p className="mt-3 text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Overview</h2>
          <p className="text-sm text-muted mt-0.5">Monitor subscriber performance and email campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            Manage Campaigns
          </Button>
          <Button size="sm" onClick={() => navigate('/campaigns?create=true')} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => <StatsCard key={i} {...kpi} />)}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subscriber Growth — spans 2 cols */}
        <ChartCard
          title="Subscriber Growth"
          description="Cumulative active subscribers — last 30 days"
          className="lg:col-span-2"
          height={220}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Subscribers"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#subGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Activity feed — 1 col */}
        <div className="rounded-xl border border-border bg-white shadow-card flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Recent Activity</h3>
            <Activity className="h-4 w-4 text-muted" />
          </div>
          <div className="flex-1 px-5 py-2 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">No activity yet.</p>
            ) : (
              activityFeed.map((item, i) => <ActivityItem key={i} {...item} />)
            )}
          </div>
        </div>
      </div>

      {/* ── Recent campaigns table ── */}
      <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-text">Recent Campaigns</h3>
            <p className="text-xs text-muted mt-0.5">Performance of your latest 5 newsletters</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')} className="gap-1">
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="py-16 text-center">
            <Mail className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted">No campaigns yet.</p>
            <Button onClick={() => navigate('/campaigns?create=true')} variant="outline" size="sm" className="mt-3">
              Create first campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Campaign</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Audience</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Open Rate</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Click Rate</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentCampaigns.map((c) => {
                  const openRate = c.totalDelivered > 0 ? (c.totalOpened / c.totalDelivered) * 100 : 0;
                  const clickRate = c.totalDelivered > 0 ? (c.totalClicked / c.totalDelivered) * 100 : 0;
                  return (
                    <tr
                      key={c._id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/campaigns/${c._id}`)}
                    >
                      <td className="px-5 py-3.5 font-medium text-text">{c.title}</td>
                      <td className="px-5 py-3.5"><Badge variant={c.status}>{c.status}</Badge></td>
                      <td className="px-5 py-3.5 text-muted">{c.totalSubscribers || '—'}</td>
                      <td className="px-5 py-3.5 text-muted">{c.status === 'draft' ? '—' : formatPercent(openRate)}</td>
                      <td className="px-5 py-3.5 text-muted">{c.status === 'draft' ? '—' : formatPercent(clickRate)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted">{formatDate(c.sentAt || c.createdAt).split(',')[0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
