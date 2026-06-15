import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { analyticsAPI, campaignsAPI } from '../services/api.js';
import StatsCard from '../components/StatsCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { formatPercent, formatDate } from '../lib/utils.js';

export default function Analytics() {
  // Query 1: Overview KPIs
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsAPI.getOverview
  });

  // Query 2: Sent Campaigns for comparative metrics
  const { data: campaignsRes, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns-analytics'],
    queryFn: () => campaignsAPI.getAll(1, 15, 'sent')
  });

  // Query 3: Subscriber Growth
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['subscribers-growth'],
    queryFn: analyticsAPI.getGrowth
  });

  const isLoading = overviewLoading || campaignsLoading || growthLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const kpis = [
    { title: 'Total Subscribers', value: overview?.totalSubscribers ?? 0, icon: TrendingUp },
    { title: 'Avg. Open Rate', value: formatPercent(overview?.avgOpenRate), icon: BarChart3 },
    { title: 'Avg. Click Rate', value: formatPercent(overview?.avgClickRate), icon: LineIcon }
  ];

  // Process comparative campaigns open rates
  const campaignsList = campaignsRes?.campaigns || [];
  const barChartData = campaignsList.map((c) => {
    const openRate = c.totalDelivered > 0 ? (c.totalOpened / c.totalDelivered) * 100 : 0;
    return {
      name: c.title.length > 15 ? `${c.title.substring(0, 15)}...` : c.title,
      'Open Rate (%)': Math.round(openRate * 10) / 10
    };
  }).reverse(); // chronological order

  // Process funnel distribution for Pie Chart
  let totalDelivered = 0;
  let totalOpened = 0;
  let totalClicked = 0;
  let totalBounced = 0;

  campaignsList.forEach((c) => {
    totalDelivered += c.totalDelivered || 0;
    totalOpened += c.totalOpened || 0;
    totalClicked += c.totalClicked || 0;
    totalBounced += c.totalBounced || 0;
  });

  const pieChartData = [
    { name: 'Delivered (Unopened)', value: Math.max(0, totalDelivered - totalOpened), color: '#7c6aff' },
    { name: 'Opened (Unclicked)', value: Math.max(0, totalOpened - totalClicked), color: '#ffb86a' },
    { name: 'Clicked', value: totalClicked, color: '#6affb8' },
    { name: 'Bounced', value: totalBounced, color: '#ff6a9e' }
  ].filter(d => d.value > 0); // only show positive categories

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text">Analytics</h2>
        <p className="text-sm text-muted">Deep dive into newsletter dispatches and audience engagement rates.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <StatsCard key={idx} {...kpi} className="bg-surface border-border" />
        ))}
      </div>

      {/* Grid of charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart: Open rates */}
        <ChartCard
          title="Open Rate per Campaign"
          description="Comparison of performance rates across sent newsletters"
        >
          {barChartData.length === 0 ? (
            <p className="text-xs text-muted">No campaigns dispatched yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#8888aa" fontSize={9} tickLine={false} />
                <YAxis stroke="#8888aa" fontSize={9} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111118', borderColor: '#ffffff10', borderRadius: '6px' }}
                  labelStyle={{ fontSize: '11px', color: '#e8e8f0', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '11px', color: '#7c6aff' }}
                />
                <Bar dataKey="Open Rate (%)" fill="#7c6aff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Pie Chart: Deliverability funnel */}
        <ChartCard
          title="Email Funnel Performance"
          description="Aggregated engagement distribution across sent campaigns"
        >
          {pieChartData.length === 0 ? (
            <p className="text-xs text-muted">No campaign dispatches recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111118', borderColor: '#ffffff10', borderRadius: '6px' }}
                  itemStyle={{ fontSize: '11px', color: '#e8e8f0' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#8888aa' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Line Chart: Audience Growth (Span 2) */}
        <ChartCard
          title="Subscribers Growth Trend"
          description="30-day timeline analysis of total mailing list growth"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData || []} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#8888aa"
                fontSize={9}
                tickLine={false}
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis stroke="#8888aa" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111118', borderColor: '#ffffff10', borderRadius: '6px' }}
                labelStyle={{ fontSize: '11px', color: '#8888aa', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '11px', color: '#7c6aff' }}
              />
              <Line
                type="monotone"
                dataKey="totalSubscribers"
                name="Audience Count"
                stroke="#7c6aff"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#7c6aff', stroke: '#0a0a0f', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
