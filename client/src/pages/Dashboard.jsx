import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Mail, Eye, MousePointer, Plus, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsAPI, campaignsAPI } from '../services/api.js';
import StatsCard from '../components/StatsCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../components/ui/custom.jsx';
import { formatDate, formatPercent } from '../lib/utils.js';

export default function Dashboard() {
  const navigate = useNavigate();

  // Query 1: Overview KPIs
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsAPI.getOverview
  });

  // Query 2: Recent campaigns (page 1, limit 5)
  const { data: campaignsRes, isLoading: campaignsLoading } = useQuery({
    queryKey: ['recent-campaigns'],
    queryFn: () => campaignsAPI.getAll(1, 5)
  });

  // Query 3: Subscriber Growth last 30 days
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['subscribers-growth'],
    queryFn: analyticsAPI.getGrowth
  });

  const isLoading = overviewLoading || campaignsLoading || growthLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="text-sm text-muted">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Subscribers',
      value: overview?.totalSubscribers ?? 0,
      description: 'Active subscribers receiving campaigns',
      icon: Users,
      trend: 'Active',
      trendType: 'positive'
    },
    {
      title: 'Campaigns Sent',
      value: overview?.totalCampaigns ?? 0,
      description: 'Total email newsletters dispatched',
      icon: Mail,
      trend: 'Sent',
      trendType: 'neutral'
    },
    {
      title: 'Avg. Open Rate',
      value: formatPercent(overview?.avgOpenRate),
      description: 'Percentage of emails opened',
      icon: Eye,
      trend: overview?.avgOpenRate > 30 ? 'Strong' : 'Healthy',
      trendType: overview?.avgOpenRate > 30 ? 'positive' : 'neutral'
    },
    {
      title: 'Avg. Click Rate',
      value: formatPercent(overview?.avgClickRate),
      description: 'Percentage of link clicks',
      icon: MousePointer,
      trend: overview?.avgClickRate > 5 ? 'High' : 'Normal',
      trendType: overview?.avgClickRate > 5 ? 'positive' : 'neutral'
    }
  ];

  const recentCampaigns = campaignsRes?.campaigns || [];

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text">Overview</h2>
          <p className="text-sm text-muted">Monitor subscriber performance and email campaign dispatches.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/campaigns')} variant="outline" size="sm">
            Manage Campaigns
          </Button>
          <Button onClick={() => navigate('/campaigns?create=true')} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <StatsCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subscriber Growth Chart (Span 2) */}
        <ChartCard
          title="Subscriber Growth"
          description="Cumulative active subscribers over the last 30 days"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={growthData || []}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#8888aa" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis stroke="#8888aa" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111118', borderColor: '#ffffff10', borderRadius: '6px' }}
                labelStyle={{ fontSize: '12px', color: '#8888aa', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '12px', color: '#7c6aff' }}
                labelFormatter={(label) => formatDate(label).split(',')[0]}
              />
              <Line
                type="monotone"
                dataKey="totalSubscribers"
                name="Total Subscribers"
                stroke="#7c6aff"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#7c6aff', stroke: '#0a0a0f', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Quick Stats Panel (Span 1) */}
        <div className="rounded-lg border border-border bg-surface p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-text mb-4">Quick Insights</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-xs text-muted">Audience Status</span>
                <span className="text-xs font-semibold text-success">Healthy Deliverability</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-xs text-muted">List Engagement</span>
                <span className="text-xs font-semibold text-text">
                  {overview?.avgOpenRate > 25 ? 'High Open Rates' : 'Standard Open Rates'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">AI Capabilities</span>
                <span className="text-xs font-semibold text-accent">Claude 3.5 Active</span>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-4">
            <p className="text-xs text-muted leading-relaxed mb-4">
              Need inspiration? Let Claude write a personalized conversion newsletter for your audience.
            </p>
            <Link to="/campaigns?create=true">
              <Button variant="outline" size="sm" className="w-full text-accent border-accent/20 bg-accent/5 hover:bg-accent/10">
                Draft with AI Copywriter
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent campaigns Table */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-text">Recent Campaigns</h3>
            <p className="text-xs text-muted">Performance summaries of your five latest campaign newsletters</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            View All
          </Button>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted">No campaigns created yet.</p>
            <Button onClick={() => navigate('/campaigns?create=true')} variant="outline" size="sm" className="mt-4">
              Create First Campaign
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Click Rate</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCampaigns.map((c) => {
                const openRate = c.totalDelivered > 0 ? (c.totalOpened / c.totalDelivered) * 100 : 0;
                const clickRate = c.totalDelivered > 0 ? (c.totalClicked / c.totalDelivered) * 100 : 0;
                return (
                  <TableRow key={c._id} className="cursor-pointer" onClick={() => navigate(`/campaigns/${c._id}`)}>
                    <TableCell className="font-medium text-text">{c.title}</TableCell>
                    <TableCell><Badge variant={c.status}>{c.status}</Badge></TableCell>
                    <TableCell>{c.totalSubscribers || '-'}</TableCell>
                    <TableCell>{c.status === 'draft' ? '-' : formatPercent(openRate)}</TableCell>
                    <TableCell>{c.status === 'draft' ? '-' : formatPercent(clickRate)}</TableCell>
                    <TableCell className="text-muted text-xs">{formatDate(c.createdAt).split(',')[0]}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
