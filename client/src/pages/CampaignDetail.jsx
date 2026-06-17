import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, Play, Sparkles, RefreshCw, Trash2,
  ShieldAlert, Eye, Send, CheckCircle2, Clock, Zap, Mail,
  FileText, Users, MousePointer, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { campaignsAPI, aiAPI } from '../services/api.js';
import useCampaign from '../hooks/useCampaign.js';
import CampaignBuilder from '../components/CampaignBuilder.jsx';
import ProgressTracker from '../components/ProgressTracker.jsx';
import StatsCard from '../components/StatsCard.jsx';
import {
  Button, Dialog, DialogHeader, DialogTitle, DialogContent,
  DialogFooter, Badge, Input
} from '../components/ui/custom.jsx';
import { formatDate, formatPercent, getErrorMessage } from '../lib/utils.js';
import EmailPreview from '../components/EmailPreview.jsx';
import { cn } from '../lib/utils.js';

// ─── Campaign Lifecycle Timeline ─────────────────────────────────────────────
const LIFECYCLE_STEPS = [
  { id: 'draft',    label: 'Draft',     icon: FileText },
  { id: 'queued',   label: 'Queued',    icon: Clock },
  { id: 'sending',  label: 'Sending',   icon: Zap },
  { id: 'sent',     label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_ORDER = { draft: 0, queued: 1, sending: 2, sent: 3, failed: -1 };

function CampaignTimeline({ status }) {
  const currentIdx = STATUS_ORDER[status] ?? 0;
  const isFailed = status === 'failed';

  return (
    <div className="flex items-center gap-0 py-1">
      {LIFECYCLE_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = !isFailed && currentIdx > i;
        const active = !isFailed && currentIdx === i;
        const pending = isFailed || currentIdx < i;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                done   && "border-success bg-success text-white",
                active && "border-accent bg-accent text-white",
                pending && !isFailed && "border-gray-200 bg-white text-gray-300",
                isFailed && i === currentIdx && "border-danger bg-danger text-white",
                isFailed && i !== currentIdx && "border-gray-200 bg-white text-gray-300",
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={cn(
                "mt-1 text-[10px] font-medium whitespace-nowrap",
                done && "text-success",
                active && "text-accent",
                pending && "text-gray-300",
              )}>
                {step.label}
              </span>
            </div>
            {i < LIFECYCLE_STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-1 mb-5 rounded-full transition-colors",
                done ? "bg-success" : "bg-gray-100"
              )} />
            )}
          </React.Fragment>
        );
      })}
      {isFailed && (
        <div className="ml-4 flex items-center gap-1.5 text-xs text-danger font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          Failed
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);

  const {
    useCampaignDetailQuery,
    updateCampaignMutation,
    deleteCampaignMutation,
    sendCampaignMutation,
    resendNonOpenersMutation
  } = useCampaign(id);

  const { data: campaign, isLoading, error } = useCampaignDetailQuery(id);

  const handleUpdateDraft = async (formData) => {
    try {
      await updateCampaignMutation.mutateAsync({ id, ...formData });
      toast.success('Campaign updated.');
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    } catch { toast.error('Failed to update campaign.'); }
  };

  const handleSendDraft = async () => {
    setConfirmOpen(false);
    try {
      await sendCampaignMutation.mutateAsync(id);
      toast.success('Campaign dispatched!');
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send campaign.'));
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this campaign draft?')) {
      try {
        await deleteCampaignMutation.mutateAsync(id);
        toast.success('Campaign deleted.');
        navigate('/campaigns');
      } catch { toast.error('Failed to delete.'); }
    }
  };

  const handleResendNonOpeners = async () => {
    if (window.confirm('Resend to subscribers who haven\'t opened yet?')) {
      try {
        await resendNonOpenersMutation.mutateAsync(id);
        toast.success('Resending to non-openers.');
        queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to resend.'));
      }
    }
  };

  const handleGetAiInsights = async () => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await aiAPI.analyzeCampaign(id);
      setInsights(res.insights);
      toast.success('AI insights ready.');
    } catch {
      toast.error('Failed to generate insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSendTest = async (e) => {
    if (e) e.preventDefault();
    if (!testEmail) return;
    setTestSending(true);
    try {
      await campaignsAPI.sendTest(id, testEmail);
      toast.success(`Test email sent to ${testEmail}`);
      setIsTestOpen(false);
      setTestEmail('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send test.'));
    } finally {
      setTestSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <p className="mt-3 text-sm text-muted">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-16">
        <ShieldAlert className="h-10 w-10 text-danger mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-text">Campaign Not Found</h2>
        <p className="text-sm text-muted mt-2">This campaign doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/campaigns')} variant="outline" size="sm" className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const isDraft = campaign.status === 'draft';
  const isQueuedOrSending = campaign.status === 'queued' || campaign.status === 'sending';
  const isSent = campaign.status === 'sent';

  const deliveryRate = campaign.totalSubscribers > 0 ? (campaign.totalDelivered / campaign.totalSubscribers) * 100 : 0;
  const openRate = campaign.totalDelivered > 0 ? (campaign.totalOpened / campaign.totalDelivered) * 100 : 0;
  const clickRate = campaign.totalDelivered > 0 ? (campaign.totalClicked / campaign.totalDelivered) * 100 : 0;
  const bounceRate = campaign.totalSubscribers > 0 ? (campaign.totalBounced / campaign.totalSubscribers) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate('/campaigns')}
          className="mt-0.5 p-2 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h2 className="text-xl font-semibold text-text">{campaign.title}</h2>
            <Badge variant={campaign.status}>{campaign.status}</Badge>
          </div>
          <p className="text-xs text-muted">
            Created {formatDate(campaign.createdAt)}
            {campaign.sentAt && ` · Dispatched ${formatDate(campaign.sentAt)}`}
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDraft && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsTestOpen(true)} className="gap-1.5">
                <Send className="h-3.5 w-3.5" /> Test
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="gap-1.5 text-danger border-danger/20 hover:bg-danger-bg">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={() => setConfirmOpen(true)} size="sm" className="gap-1.5">
                <Play className="h-3.5 w-3.5 fill-current" />
                Launch
              </Button>
            </>
          )}
          {isSent && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={handleResendNonOpeners}
                disabled={resendNonOpenersMutation.isLoading}
                className="gap-1.5"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", resendNonOpenersMutation.isLoading && "animate-spin")} />
                Resend Non-Openers
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Campaign Lifecycle Timeline ── */}
      <div className="rounded-xl border border-border bg-white shadow-card px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Campaign Lifecycle</p>
        <CampaignTimeline status={campaign.status} />
      </div>

      {/* ── Draft: show builder ── */}
      {isDraft && (
        <div className="rounded-xl border border-border bg-white shadow-card p-6">
          <CampaignBuilder
            initialData={campaign}
            onSave={handleUpdateDraft}
            onSend={() => setConfirmOpen(true)}
            saving={updateCampaignMutation.isLoading}
            sending={updateCampaignMutation.isLoading || sendCampaignMutation.isLoading}
          />
        </div>
      )}

      {/* ── Queued / Sending: show progress ── */}
      {isQueuedOrSending && (
        <ProgressTracker campaignId={campaign._id} />
      )}

      {/* ── Metrics (non-draft) ── */}
      {!isDraft && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard title="Audience" value={campaign.totalSubscribers} description="Targeted" icon={Users} />
            <StatsCard title="Sent" value={campaign.totalSent} description="Processed" icon={Mail} />
            <StatsCard
              title="Delivered"
              value={campaign.totalDelivered}
              description="Delivery rate"
              trend={formatPercent(deliveryRate)}
              trendType={deliveryRate > 90 ? 'positive' : 'neutral'}
              icon={CheckCircle2}
            />
            <StatsCard
              title="Opened"
              value={campaign.totalOpened}
              description="Open rate"
              trend={formatPercent(openRate)}
              trendType={openRate > 25 ? 'positive' : 'neutral'}
              icon={Eye}
            />
            <StatsCard
              title="Clicked"
              value={campaign.totalClicked}
              description="Click rate"
              trend={formatPercent(clickRate)}
              trendType={clickRate > 3 ? 'positive' : 'neutral'}
              icon={MousePointer}
            />
          </div>

          {/* Content + Actions */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Newsletter preview panel */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-white shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-text">Newsletter Content</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Subject Line</p>
                  <p className="text-sm text-text font-medium bg-gray-50 border border-border rounded-lg px-3 py-2">
                    {campaign.subject}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Email Body</p>
                  <div
                    className="text-sm text-text bg-gray-50 border border-border rounded-lg p-4 max-h-[280px] overflow-y-auto leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: campaign.body }}
                  />
                </div>
              </div>
            </div>

            {/* Actions sidebar */}
            <div className="space-y-4">
              {/* Quick actions */}
              <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-text">Actions</h3>
                </div>
                <div className="p-4 space-y-2">
                  <Button
                    onClick={() => setIsPreviewOpen(true)}
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm h-9"
                  >
                    <Eye className="h-4 w-4 text-muted" /> Preview Email
                  </Button>
                  <Button
                    onClick={() => setIsTestOpen(true)}
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm h-9"
                  >
                    <Send className="h-4 w-4 text-muted" /> Send Test
                  </Button>
                  {isSent && (
                    <Button
                      onClick={handleResendNonOpeners}
                      disabled={resendNonOpenersMutation.isLoading}
                      variant="outline"
                      className="w-full justify-start gap-2 text-sm h-9"
                    >
                      <RefreshCw className={cn("h-4 w-4 text-muted", resendNonOpenersMutation.isLoading && "animate-spin")} />
                      Resend Non-Openers
                    </Button>
                  )}
                  <Button
                    onClick={handleGetAiInsights}
                    disabled={insightsLoading}
                    className="w-full justify-start gap-2 text-sm h-9"
                  >
                    {insightsLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4" />
                    }
                    AI Insights
                  </Button>
                </div>
              </div>

              {/* AI Insights panel */}
              {(insightsLoading || insights) && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 shadow-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-accent/15 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-accent">AI Insights</h3>
                  </div>
                  <div className="p-4">
                    {insightsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {insights.map((insight, idx) => (
                          <div key={idx} className="text-xs bg-white border border-accent/15 rounded-lg p-3 leading-relaxed text-text">
                            <p className="font-semibold text-accent text-[10px] uppercase tracking-wide mb-1">Insight {idx + 1}</p>
                            {insight}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* Launch confirm */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Confirm Dispatch</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted leading-relaxed">
            This will immediately queue delivery jobs for all active subscribers. This action cannot be undone.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sendCampaignMutation.isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSendDraft} disabled={sendCampaignMutation.isLoading} className="gap-2">
            {sendCampaignMutation.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Yes, Dispatch Now
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Test email */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <form onSubmit={handleSendTest}>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-muted leading-relaxed">
              Send a preview to verify formatting before dispatching to your full list.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Recipient Email</label>
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTestOpen(false)} disabled={testSending}>Cancel</Button>
            <Button type="submit" disabled={testSending} className="gap-2">
              {testSending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Test
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Email Preview */}
      <EmailPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        subject={campaign.subject}
        body={campaign.body}
      />
    </div>
  );
}
