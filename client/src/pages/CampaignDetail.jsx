import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Play, Sparkles, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { campaignsAPI, aiAPI } from '../services/api.js';
import useCampaign from '../hooks/useCampaign.js';
import CampaignBuilder from '../components/CampaignBuilder.jsx';
import ProgressTracker from '../components/ProgressTracker.jsx';
import StatsCard from '../components/StatsCard.jsx';
import { Button, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, Badge } from '../components/ui/custom.jsx';
import { formatDate, formatPercent } from '../lib/utils.js';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const {
    useCampaignDetailQuery,
    updateCampaignMutation,
    deleteCampaignMutation,
    sendCampaignMutation,
    resendNonOpenersMutation
  } = useCampaign(id);

  // Load Campaign Detail
  const { data: campaign, isLoading, error } = useCampaignDetailQuery(id);

  const handleUpdateDraft = async (formData) => {
    try {
      await updateCampaignMutation.mutateAsync({ id, ...formData });
      toast.success('Campaign draft updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    } catch (err) {
      toast.error('Failed to update campaign draft.');
    }
  };

  const handleSendDraft = async () => {
    setConfirmOpen(false);
    try {
      await sendCampaignMutation.mutateAsync(id);
      toast.success('Campaign dispatch started successfully!');
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send campaign.';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this campaign draft?')) {
      try {
        await deleteCampaignMutation.mutateAsync(id);
        toast.success('Campaign deleted successfully.');
        navigate('/campaigns');
      } catch (err) {
        toast.error('Failed to delete campaign.');
      }
    }
  };

  const handleResendNonOpeners = async () => {
    if (window.confirm('This will send a copy of this newsletter to all subscribers who have not opened the email yet. Proceed?')) {
      try {
        await resendNonOpenersMutation.mutateAsync(id);
        toast.success('Resending campaign to non-openers.');
        queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to schedule resend.';
        toast.error(errorMsg);
      }
    }
  };

  const handleGetAiInsights = async () => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await aiAPI.analyzeCampaign(id);
      setInsights(res.insights);
      toast.success('Campaign insights generated.');
    } catch (err) {
      toast.error('Failed to generate insights. Check your Anthropic API key.');
    } finally {
      setInsightsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <ShieldAlert className="h-10 w-10 text-danger mx-auto mb-4" />
        <h2 className="text-lg font-bold text-text">Campaign Not Found</h2>
        <p className="text-sm text-muted mt-2">The campaign you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => navigate('/campaigns')} variant="outline" size="sm" className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const isDraft = campaign.status === 'draft';
  const isQueuedOrSending = campaign.status === 'queued' || campaign.status === 'sending';
  const isSent = campaign.status === 'sent';

  // Stats Calculations
  const deliveryRate = campaign.totalSubscribers > 0 ? (campaign.totalDelivered / campaign.totalSubscribers) * 100 : 0;
  const openRate = campaign.totalDelivered > 0 ? (campaign.totalOpened / campaign.totalDelivered) * 100 : 0;
  const clickRate = campaign.totalDelivered > 0 ? (campaign.totalClicked / campaign.totalDelivered) * 100 : 0;
  const bounceRate = campaign.totalSubscribers > 0 ? (campaign.totalBounced / campaign.totalSubscribers) * 100 : 0;

  return (
    <div className="space-y-8 p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/campaigns')}
            className="p-1 rounded-full text-muted hover:text-text hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-text">{campaign.title}</h2>
              <Badge variant={campaign.status}>{campaign.status}</Badge>
            </div>
            <p className="text-xs text-muted mt-1">Created: {formatDate(campaign.createdAt)}</p>
          </div>
        </div>

        {isDraft && (
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-danger border-danger/20 hover:bg-danger/5">
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Draft
            </Button>
            <Button onClick={() => setConfirmOpen(true)} size="sm" className="gap-1.5">
              <Play className="h-4 w-4 fill-current" />
              Launch Dispatch
            </Button>
          </div>
        )}
      </div>

      {/* DRAFT MODE VIEW (Renders Builder Form) */}
      {isDraft && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <CampaignBuilder
            initialData={campaign}
            onSave={handleUpdateDraft}
            onSend={() => setConfirmOpen(true)}
            saving={updateCampaignMutation.isLoading}
            sending={updateCampaignMutation.isLoading || sendCampaignMutation.isLoading}
          />
        </div>
      )}

      {/* DISPATCH PROGRESS ROW */}
      {isQueuedOrSending && (
        <div className="grid gap-6">
          <ProgressTracker campaignId={campaign._id} />
        </div>
      )}

      {/* METRICS & INSIGHTS (When Sending or Sent) */}
      {!isDraft && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <StatsCard title="Total Audience" value={campaign.totalSubscribers} description="Targeted subscribers" />
            <StatsCard title="Sent" value={campaign.totalSent} description="Processed jobs" />
            <StatsCard
              title="Delivered"
              value={campaign.totalDelivered}
              trend={formatPercent(deliveryRate)}
              trendType="positive"
              description="Successfully delivered"
            />
            <StatsCard
              title="Opened"
              value={campaign.totalOpened}
              trend={formatPercent(openRate)}
              trendType={openRate > 25 ? 'positive' : 'neutral'}
              description="Opened rates"
            />
            <StatsCard
              title="Clicked"
              value={campaign.totalClicked}
              trend={formatPercent(clickRate)}
              trendType={clickRate > 5 ? 'positive' : 'neutral'}
              description="Clicked links"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Subject and Content Preview */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-surface p-6 space-y-4">
              <h3 className="text-sm font-semibold tracking-tight text-text">Newsletter Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Subject Line</span>
                  <p className="text-sm text-text font-medium bg-white/[0.02] border border-border rounded px-3 py-2">
                    {campaign.subject}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Email Body Content</span>
                  <div
                    className="text-sm text-text bg-white/[0.02] border border-border rounded p-4 max-h-[300px] overflow-y-auto leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: campaign.body }}
                  />
                </div>
              </div>
            </div>

            {/* Campaign Actions & AI Insights */}
            <div className="space-y-6">
              {/* Actions panel */}
              <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
                <h3 className="text-sm font-semibold tracking-tight text-text">Campaign Actions</h3>
                <div className="space-y-3">
                  {isSent && (
                    <Button
                      onClick={handleResendNonOpeners}
                      disabled={resendNonOpenersMutation.isLoading}
                      variant="outline"
                      className="w-full justify-start gap-2 border-border"
                    >
                      {resendNonOpenersMutation.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Resend to Non-Openers
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleGetAiInsights}
                    disabled={insightsLoading}
                    className="w-full justify-start gap-2 bg-accent text-white"
                  >
                    {insightsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate AI Insights
                  </Button>
                </div>
              </div>

              {/* Insights Panel */}
              {(insightsLoading || insights) && (
                <div className="rounded-lg border border-border bg-surface p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold tracking-tight text-text">Claude AI Insights</h3>
                  </div>

                  {insightsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {insights.map((insight, idx) => (
                        <div key={idx} className="text-xs bg-white/[0.02] border border-border/50 rounded-md p-3 leading-relaxed text-text">
                          <p className="font-semibold text-accent mb-1">Insight #{idx + 1}</p>
                          {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Launch Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Confirm Campaign Send</DialogTitle>
        </DialogHeader>
        <DialogContent className="mt-4">
          <p className="text-sm text-muted leading-relaxed">
            Are you sure you want to send this campaign newsletter? This will immediately create delivery tasks for all active subscribers. This action cannot be undone.
          </p>
        </DialogContent>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sendCampaignMutation.isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSendDraft} disabled={sendCampaignMutation.isLoading} className="bg-accent text-white">
            {sendCampaignMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Yes, Dispatch Now
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
