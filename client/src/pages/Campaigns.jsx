import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Mail, ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useCampaign } from '../hooks/useCampaign.js';
import { toast } from 'sonner';
import CampaignBuilder from '../components/CampaignBuilder.jsx';
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../components/ui/custom.jsx';
import { formatDate, formatPercent } from '../lib/utils.js';

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCreating = searchParams.get('create') === 'true';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const {
    useCampaignsQuery,
    createCampaignMutation,
    sendCampaignMutation
  } = useCampaign();

  // Load campaigns list
  const { data: listRes, isLoading: listLoading, refetch } = useCampaignsQuery(page, 10, statusFilter);

  // Trigger refetch when view toggles
  useEffect(() => {
    if (!isCreating) {
      refetch();
    }
  }, [isCreating, refetch]);

  const handleSaveDraft = async (formData) => {
    try {
      await createCampaignMutation.mutateAsync(formData);
      toast.success('Campaign draft saved successfully.');
      setSearchParams({}); // Close builder
    } catch (err) {
      toast.error('Failed to save draft.');
    }
  };

  const handleSendCampaign = async (formData) => {
    try {
      // 1. Create the campaign draft first
      const campaign = await createCampaignMutation.mutateAsync(formData);
      // 2. Trigger dispatch
      await sendCampaignMutation.mutateAsync(campaign._id);
      toast.success('Campaign bulk sending initiated!');
      navigate(`/campaigns/${campaign._id}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to dispatch campaign.';
      toast.error(errorMsg);
    }
  };

  const handleRowClick = (id) => {
    navigate(`/campaigns/${id}`);
  };

  const campaigns = listRes?.campaigns || [];
  const pagination = listRes?.pagination || { total: 0, pages: 1 };

  if (isCreating) {
    return (
      <div className="space-y-8 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSearchParams({})}
            className="p-1 rounded-full text-muted hover:text-text hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text">Create Campaign</h2>
            <p className="text-sm text-muted">Write custom copy or generate templates using AI.</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-premium">
          <CampaignBuilder
            onSave={handleSaveDraft}
            onSend={handleSendCampaign}
            saving={createCampaignMutation.isLoading}
            sending={createCampaignMutation.isLoading || sendCampaignMutation.isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text">Campaigns</h2>
          <p className="text-sm text-muted">Draft, dispatch, and track performance of your email newsletters.</p>
        </div>
        <Button onClick={() => setSearchParams({ create: 'true' })} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">Filter by Status:</div>
        <div className="flex flex-wrap gap-2">
          {['', 'draft', 'queued', 'sending', 'sent', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-200 ${
                statusFilter === status
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-transparent border-border text-muted hover:text-text hover:border-white/20'
              }`}
            >
              {status === '' ? 'All Campaigns' : status.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns list Table */}
      <div className="rounded-lg border border-border bg-surface p-6">
        {listLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="h-10 w-10 text-muted mx-auto mb-4" />
            <p className="text-sm text-muted">No campaigns found.</p>
            <Button onClick={() => setSearchParams({ create: 'true' })} variant="outline" size="sm" className="mt-4">
              Write First Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead>Click Rate</TableHead>
                  <TableHead>Sent Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const openRate = c.totalDelivered > 0 ? (c.totalOpened / c.totalDelivered) * 100 : 0;
                  const clickRate = c.totalDelivered > 0 ? (c.totalClicked / c.totalDelivered) * 100 : 0;
                  return (
                    <TableRow key={c._id} className="cursor-pointer" onClick={() => handleRowClick(c._id)}>
                      <TableCell className="font-medium text-text">{c.title}</TableCell>
                      <TableCell><Badge variant={c.status}>{c.status}</Badge></TableCell>
                      <TableCell>{c.status === 'draft' ? '-' : `${c.totalDelivered} / ${c.totalSubscribers}`}</TableCell>
                      <TableCell>{c.status === 'draft' ? '-' : formatPercent(openRate)}</TableCell>
                      <TableCell>{c.status === 'draft' ? '-' : formatPercent(clickRate)}</TableCell>
                      <TableCell className="text-xs text-muted">
                        {c.sentAt ? formatDate(c.sentAt) : formatDate(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-4">
                <span className="text-xs text-muted">Showing page {page} of {pagination.pages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
