import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, Eye, MousePointer, Users, ArrowUp, Minus, CheckCircle2, AlertOctagon, Megaphone, UserX, Mail } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { analyticsAPI, campaignsAPI } from '../services/api.js';
import StatsCard from '../components/StatsCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { formatPercent } from '../lib/utils.js';

// Custom tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white shadow-dropdown px-3 py-2 text-xs">
      <p className="text-muted font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: <span className="text-text">{typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}</span>
        </p>
      ))}
    </div>
  );
}

const FUNNEL_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EF4444'];

export default function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsAPI.getOverview
  });

  const { data: campaignsRes, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns-analytics'],
    queryFn: () => campaignsAPI.getAll(1, 15, 'sent')
  });

  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['subscribers-growth'],
    queryFn: analyticsAPI.getGrowth
  });

  const isLoading = overviewLoading || campaignsLoading || growthLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <p className="mt-3 text-sm text-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const campaignsList = campaignsRes?.campaigns || [];

  // Bar chart: open rate per campaign
  const barData = campaignsList.map((c) => ({
    name: c.title.length > 18 ? c.title.substring(0, 18) + '…' : c.title,
    'Open Rate': c.totalDelivered > 0 ? Math.round((c.totalOpened / c.totalDelivered) * 1000) / 10 : 0,
    'Click Rate': c.totalDelivered > 0 ? Math.round((c.totalClicked / c.totalDelivered) * 1000) / 10 : 0,
  })).reverse();

  // Pie chart: funnel
  let totalDelivered = 0, totalOpened = 0, totalClicked = 0, totalBounced = 0;
  campaignsList.forEach((c) => {
    totalDelivered += c.totalDelivered || 0;
    totalOpened += c.totalOpened || 0;
    totalClicked += c.totalClicked || 0;
    totalBounced += c.totalBounced || 0;
  });

  const pieData = [
    { name: 'Delivered (Unopened)', value: Math.max(0, totalDelivered - totalOpened) },
    { name: 'Opened (Unclicked)', value: Math.max(0, totalOpened - totalClicked) },
    { name: 'Clicked', value: totalClicked },
    { name: 'Bounced', value: totalBounced },
  ].filter((d) => d.value > 0);

  // Growth chart
  const growthChart = (growthData || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Subscribers: d.totalSubscribers
  }));

  const kpis = [
    { title: 'Total Subscribers', value: overview?.totalSubscribers ?? 0, icon: Users, trend: 'All time', trendType: 'neutral' },
    { title: 'Avg. Open Rate', value: formatPercent(overview?.avgOpenRate), icon: Eye, trend: overview?.avgOpenRate > 25 ? 'Above avg' : 'Avg ~25%', trendType: overview?.avgOpenRate > 25 ? 'positive' : 'neutral' },
    { title: 'Avg. Click Rate', value: formatPercent(overview?.avgClickRate), icon: MousePointer, trend: overview?.avgClickRate > 3 ? 'Above avg' : 'Avg ~3%', trendType: overview?.avgClickRate > 3 ? 'positive' : 'neutral' },
    { title: 'Campaigns Sent', value: overview?.totalCampaigns ?? 0, icon: TrendingUp, trend: 'All time', trendType: 'neutral' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text">Analytics</h2>
        <p className="text-sm text-muted mt-0.5">Campaign performance and audience engagement metrics.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
      </div>

      {/* Engagement Totals */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Overall Engagement Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <StatsCard title="Total Sent" value={overview?.totalSent ?? 0} icon={Mail} trend="Emails sent" trendType="neutral" />
          <StatsCard title="Total Delivered" value={overview?.totalDelivered ?? 0} icon={CheckCircle2} trend="Delivered" trendType="neutral" />
          <StatsCard title="Total Opens" value={overview?.totalOpened ?? 0} icon={Eye} trend="Opened" trendType="neutral" />
          <StatsCard title="Total Clicks" value={overview?.totalClicked ?? 0} icon={MousePointer} trend="Clicked" trendType="neutral" />
          <StatsCard title="Total Bounces" value={overview?.totalBounced ?? 0} icon={AlertOctagon} trend="Bounced" trendType="neutral" />
          <StatsCard title="Total Complaints" value={overview?.totalComplained ?? 0} icon={Megaphone} trend="Complaints" trendType="neutral" />
          <StatsCard title="Total Unsubscribes" value={overview?.totalUnsubscribed ?? 0} icon={UserX} trend="Unsubscribed" trendType="neutral" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <ChartCard title="Open & Click Rates" description="Per campaign, most recent first" height={240}>
          {barData.length === 0 ? (
            <p className="text-sm text-muted mt-4">No sent campaigns yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Open Rate" fill="#6366F1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Click Rate" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Pie chart */}
        <ChartCard title="Email Funnel" description="Aggregated engagement distribution" height={240}>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted mt-4">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#6B7280' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Subscriber growth */}
      <ChartCard
        title="Subscriber Growth"
        description="30-day cumulative subscriber count"
        height={220}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={growthChart} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#growthGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Campaign performance table */}
      {campaignsList.length > 0 && (
        <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text">Campaign Performance</h3>
            <p className="text-xs text-muted mt-0.5">Sent campaigns ranked by open rate</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  {['Campaign', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Open Rate', 'Click Rate'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...campaignsList]
                  .sort((a, b) => {
                    const rA = a.totalDelivered > 0 ? a.totalOpened / a.totalDelivered : 0;
                    const rB = b.totalDelivered > 0 ? b.totalOpened / b.totalDelivered : 0;
                    return rB - rA;
                  })
                  .map((c) => {
                    const openRate = c.totalDelivered > 0 ? (c.totalOpened / c.totalDelivered) * 100 : 0;
                    const clickRate = c.totalDelivered > 0 ? (c.totalClicked / c.totalDelivered) * 100 : 0;
                    return (
                      <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-text max-w-[180px] truncate">{c.title}</td>
                        <td className="px-5 py-3.5 text-muted">{c.totalSent ?? 0}</td>
                        <td className="px-5 py-3.5 text-muted">{c.totalDelivered ?? 0}</td>
                        <td className="px-5 py-3.5 text-muted">{c.totalOpened ?? 0}</td>
                        <td className="px-5 py-3.5 text-muted">{c.totalClicked ?? 0}</td>
                        <td className="px-5 py-3.5">
                          <span className={`font-semibold ${openRate > 25 ? 'text-success' : 'text-text'}`}>
                            {formatPercent(openRate)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`font-semibold ${clickRate > 3 ? 'text-success' : 'text-text'}`}>
                            {formatPercent(clickRate)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
