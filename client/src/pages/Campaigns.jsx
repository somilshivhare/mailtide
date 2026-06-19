import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Mail, ChevronLeft, ChevronRight, Loader2, ArrowLeft, Search, Filter, Trash2 } from 'lucide-react';
import { useCampaign } from '../hooks/useCampaign.js';
import { toast } from 'sonner';
import CampaignBuilder from '../components/CampaignBuilder.jsx';
import { Button, Badge } from '../components/ui/custom.jsx';
import { formatDate, formatPercent, getErrorMessage } from '../lib/utils.js';

const STATUS_FILTERS = ['', 'draft', 'queued', 'sending', 'sent', 'failed'];
const STATUS_LABELS = { '': 'All', draft: 'Draft', queued: 'Queued', sending: 'Sending', sent: 'Sent', failed: 'Failed' };

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCreating = searchParams.get('create') === 'true';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { useCampaignsQuery, createCampaignMutation, sendCampaignMutation, deleteCampaignMutation } = useCampaign();
  const { data: listRes, isLoading: listLoading, refetch } = useCampaignsQuery(page, 10, statusFilter);

  useEffect(() => {
    if (!isCreating) refetch();
  }, [isCreating, refetch]);

  const handleSaveDraft = async (formData) => {
    try {
      await createCampaignMutation.mutateAsync(formData);
      toast.success('Campaign draft saved.');
      setSearchParams({});
    } catch { toast.error('Failed to save draft.'); }
  };

  const handleSendCampaign = async (formData) => {
    try {
      const campaign = await createCampaignMutation.mutateAsync(formData);
      await sendCampaignMutation.mutateAsync(campaign._id);
      toast.success('Campaign dispatched!');
      navigate(`/campaigns/${campaign._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to dispatch.'));
    }
  };

  const handleDeleteDraft = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete the draft "${title}"?`)) {
      try {
        await deleteCampaignMutation.mutateAsync(id);
        toast.success('Campaign draft deleted.');
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete campaign.'));
      }
    }
  };

  const campaigns = (listRes?.campaigns || []).filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );
  const pagination = listRes?.pagination || { total: 0, pages: 1 };

  // ── Create view ──
  if (isCreating) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-text">Create Campaign</h2>
            <p className="text-sm text-muted">Write copy or generate with AI.</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white shadow-card p-6">
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
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Campaigns</h2>
          <p className="text-sm text-muted mt-0.5">Draft, dispatch, and track your email newsletters.</p>
        </div>
        <Button onClick={() => setSearchParams({ create: 'true' })} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg bg-white shadow-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted shrink-0" />
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`h-7 px-3 rounded-full text-xs font-medium border transition-all duration-150 ${
                statusFilter === status
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-white text-muted border-border hover:text-text hover:border-gray-300'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
        {listLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center">
            <Mail className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No campaigns found</p>
            <p className="text-xs text-muted mt-1">
              {search || statusFilter ? 'Try adjusting your filters.' : 'Create your first campaign to get started.'}
            </p>
            {!search && !statusFilter && (
              <Button onClick={() => setSearchParams({ create: 'true' })} variant="outline" size="sm" className="mt-4">
                Create Campaign
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    {['Campaign', 'Status', 'Delivered', 'Open Rate', 'Click Rate', 'Date', ''].map((h, i) => (
                      <th key={i} className={`${h === '' ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((c) => {
                    const openRate = c.totalDelivered > 0 ? (c.totalOpened / c.totalDelivered) * 100 : 0;
                    const clickRate = c.totalDelivered > 0 ? (c.totalClicked / c.totalDelivered) * 100 : 0;
                    return (
                      <tr
                        key={c._id}
                        onClick={() => navigate(`/campaigns/${c._id}`)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-text">{c.title}</div>
                          <div className="text-xs text-muted mt-0.5 truncate max-w-[240px]">{c.subject}</div>
                        </td>
                        <td className="px-5 py-3.5"><Badge variant={c.status}>{c.status}</Badge></td>
                        <td className="px-5 py-3.5 text-muted">
                          {c.status === 'draft' ? '—' : `${c.totalDelivered ?? 0} / ${c.totalSubscribers ?? 0}`}
                        </td>
                        <td className="px-5 py-3.5 text-muted">{c.status === 'draft' ? '—' : formatPercent(openRate)}</td>
                        <td className="px-5 py-3.5 text-muted">{c.status === 'draft' ? '—' : formatPercent(clickRate)}</td>
                        <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                          {formatDate(c.sentAt || c.createdAt).split(',')[0]}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {c.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDraft(c._id, c.title)}
                              className="p-1 h-8 w-8 text-danger hover:bg-danger-bg rounded-lg border border-transparent hover:border-danger/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface">
                <p className="text-xs text-muted">
                  Page {page} of {pagination.pages} · {pagination.total} campaigns
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pg = i + 1;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`h-7 w-7 rounded-md text-xs font-medium transition-colors ${
                          page === pg ? 'bg-accent text-white' : 'text-muted hover:bg-gray-100'
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
