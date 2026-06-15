import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactQuill from 'react-quill';
import { Sparkles, Loader2, Save, Send } from 'lucide-react';
import { aiAPI } from '../services/api.js';
import SubjectOptimizer from './SubjectOptimizer.jsx';
import { Button, Input, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, Select } from './ui/custom.jsx';

const campaignSchema = z.object({
  title: z.string().min(1, 'Campaign title is required'),
  subject: z.string().min(1, 'Subject line is required'),
  body: z.string().min(10, 'Email body content must be at least 10 characters')
});

export default function CampaignBuilder({ initialData = {}, onSave, onSend, saving, sending }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiAudience, setAiAudience] = useState('');
  const [aiError, setAiError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: initialData.title || '',
      subject: initialData.subject || '',
      body: initialData.body || ''
    }
  });

  const subjectVal = watch('subject');

  const handleSelectSubjectSuggestion = (suggestion) => {
    setValue('subject', suggestion, { shouldValidate: true });
  };

  const handleAiGenerate = async () => {
    if (!aiTopic || !aiAudience) {
      setAiError('Please provide both the campaign topic and target audience.');
      return;
    }
    setAiError('');
    setAiLoading(true);
    try {
      const result = await aiAPI.writeCampaign(aiTopic, aiTone, aiAudience);
      setValue('subject', result.subject, { shouldValidate: true });
      setValue('body', result.body, { shouldValidate: true });
      setAiOpen(false);
      // Reset AI form fields
      setAiTopic('');
      setAiAudience('');
    } catch (err) {
      setAiError('Failed to generate campaign. Please check your AI API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmitForm = (data) => {
    onSave(data);
  };

  const handleSendForm = handleSubmit((data) => {
    if (onSend) {
      onSend(data);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Campaign Details</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAiOpen(true)}
          className="gap-2 border-accent/30 text-accent hover:bg-accent/10"
        >
          <Sparkles className="h-4 w-4" />
          Write with AI
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Campaign Title (Internal)</label>
          <Input
            placeholder="e.g. June Product Updates"
            {...register('title')}
            className={errors.title ? 'border-danger focus:ring-danger/30 focus:border-danger' : ''}
          />
          {errors.title && <p className="mt-1.5 text-xs text-danger">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Subject Line</label>
          <Input
            placeholder="e.g. Grow your SaaS in 10 minutes"
            {...register('subject')}
            className={errors.subject ? 'border-danger focus:ring-danger/30 focus:border-danger' : ''}
          />
          {errors.subject && <p className="mt-1.5 text-xs text-danger">{errors.subject.message}</p>}
          
          <SubjectOptimizer 
            subject={subjectVal} 
            onSelectSuggestion={handleSelectSubjectSuggestion} 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Email Body (HTML Editor)</label>
          <Controller
            name="body"
            control={control}
            render={({ field }) => (
              <ReactQuill
                theme="snow"
                value={field.value}
                onChange={field.onChange}
                placeholder="Write your email body here. Use {{name}} to personalize with subscriber names..."
              />
            )}
          />
          {errors.body && <p className="mt-1.5 text-xs text-danger">{errors.body.message}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-5">
          <Button type="submit" variant="outline" disabled={saving || sending} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </Button>
          {onSend && (
            <Button type="button" onClick={handleSendForm} disabled={saving || sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Campaign
            </Button>
          )}
        </div>
      </form>

      {/* Write with AI Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <span>Generate Copy with Claude AI</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="mt-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">What is this campaign about?</label>
              <Input
                placeholder="e.g. Introducing our new automated analytics integrations"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Target Audience</label>
              <Input
                placeholder="e.g. Freelancers and small agency owners"
                value={aiAudience}
                onChange={(e) => setAiAudience(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Copywriting Tone</label>
              <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                <option value="professional">Professional & Direct</option>
                <option value="casual">Friendly & Casual</option>
                <option value="witty">Witty & Creative</option>
                <option value="urgent">Urgent & Direct</option>
                <option value="educational">Educational & Instructive</option>
              </Select>
            </div>
            {aiError && <p className="text-xs text-danger">{aiError}</p>}
          </div>
        </DialogContent>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiLoading}>
            Cancel
          </Button>
          <Button onClick={handleAiGenerate} disabled={aiLoading} className="gap-2">
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
