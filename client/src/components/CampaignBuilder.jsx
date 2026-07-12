import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactQuill from 'react-quill';
import { Sparkles, Loader2, Save, Send, Wand2, FileImage, Check, ArrowRight, Image } from 'lucide-react';
import { toast } from 'sonner';
import { aiAPI, campaignsAPI } from '../services/api.js';
import { getErrorMessage, cn } from '../lib/utils.js';
import SubjectOptimizer from './SubjectOptimizer.jsx';
import { Button, Input, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, Select, Textarea, Card, CardHeader, CardTitle, CardContent } from './ui/custom.jsx';

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
  const [aiType, setAiType] = useState('Newsletter');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGoal, setAiGoal] = useState('Educate');
  const [aiCta, setAiCta] = useState('Reply');
  const [aiBrandVoice, setAiBrandVoice] = useState('Founder');
  const [aiInboxStyle, setAiInboxStyle] = useState('Newsletter');
  const [aiDeliverabilityMode, setAiDeliverabilityMode] = useState('Balanced');
  const [aiIndustry, setAiIndustry] = useState('SaaS');
  const [aiLength, setAiLength] = useState('Medium');
  const [aiReasoning, setAiReasoning] = useState('');
  const [aiDeliverability, setAiDeliverability] = useState(null);
  const [aiError, setAiError] = useState('');

  // Quill Editor Ref
  const quillRef = useRef(null);

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [imageError, setImageError] = useState('');

  // AI Rewrite State
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState('professional');
  const [originalBody, setOriginalBody] = useState('');
  const [rewrittenBody, setRewrittenBody] = useState('');
  const [rewriteError, setRewriteError] = useState('');

  // AI Subject Suggestions State
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [subjectSuggestions, setSubjectSuggestions] = useState([]);
  const [bestSubject, setBestSubject] = useState('');
  const [suggestionsError, setSuggestionsError] = useState('');

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
      const result = await aiAPI.writeCampaign(
        aiTopic,
        aiTone,
        aiAudience,
        aiType,
        aiPrompt,
        aiGoal,
        aiCta,
        aiBrandVoice,
        aiInboxStyle,
        aiDeliverabilityMode,
        aiIndustry,
        aiLength
      );
      setValue('subject', result.subject, { shouldValidate: true });
      setValue('body', result.body, { shouldValidate: true });
      setAiReasoning(result.reasoning || '');
      setAiDeliverability(result.deliverability || null);
      setAiOpen(false);
      // Reset AI form fields
      setAiTopic('');
      setAiAudience('');
      setAiPrompt('');
      setAiType('Newsletter');
      setAiGoal('Educate');
      setAiCta('Reply');
      setAiBrandVoice('Founder');
      setAiInboxStyle('Newsletter');
      setAiDeliverabilityMode('Balanced');
      setAiIndustry('SaaS');
      setAiLength('Medium');
    } catch (err) {
      setAiError('Failed to generate campaign. Please check your AI API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    setUploadingImage(true);
    try {
      const res = await campaignsAPI.uploadImage(file);
      setUploadedImageUrl(res.url);
      toast.success('Image uploaded successfully! Click "Insert into Editor" to place it.');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to upload image.');
      setImageError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploadingImage(false);
    }
  };

  const insertImage = (url) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const length = quill.getLength();
      const insertPosition = Math.max(0, length - 1);
      quill.insertText(insertPosition, '\n');
      quill.insertEmbed(insertPosition + 1, 'image', url);
      quill.setSelection(insertPosition + 2);
    } else {
      const currentBody = watch('body') || '';
      setValue('body', `${currentBody}<p><img src="${url}" alt="Campaign Image" /></p>`, { shouldValidate: true });
    }
  };

  const handleRewrite = async () => {
    const currentBody = watch('body') || '';
    if (!currentBody) {
      setRewriteError('Cannot rewrite an empty email.');
      return;
    }
    setOriginalBody(currentBody);
    setRewriteError('');
    setRewriteLoading(true);
    try {
      const res = await aiAPI.rewrite(currentBody, selectedTone);
      setRewrittenBody(res.rewrittenBody);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'AI Rewrite failed.');
      setRewriteError(errorMsg);
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleApplyRewrite = () => {
    setValue('body', rewrittenBody, { shouldValidate: true });
    setRewriteOpen(false);
    setRewrittenBody('');
    setOriginalBody('');
  };

  const handleFetchSubjectSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestionsError('');
    setSubjectSuggestions([]);
    setBestSubject('');
    setSuggestionsOpen(true);
    
    const topic = watch('title') || watch('subject') || 'General Newsletter';
    const bodyText = watch('body') || '';
    
    try {
      const res = await aiAPI.suggestSubjects(topic, bodyText);
      setSubjectSuggestions(res.suggestions || []);
      setBestSubject(res.bestSubject || '');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to generate subject suggestions.');
      setSuggestionsError(errorMsg);
    } finally {
      setSuggestionsLoading(false);
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
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFetchSubjectSuggestions}
              className="text-xs gap-1 border-accent/20 text-accent hover:bg-accent/10 h-8"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Suggest Subjects with AI
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider m-0">Email Body (HTML Editor)</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOriginalBody(watch('body') || '');
                  setRewriteOpen(true);
                }}
                className="h-8 gap-1.5 border-accent/25 text-accent hover:bg-accent/5 text-xs"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Rewrite with AI
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload-input"
                  disabled={uploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                  disabled={uploadingImage}
                  className="h-8 gap-1.5 border-border text-muted hover:text-text text-xs"
                >
                  {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileImage className="h-3.5 w-3.5" />}
                  Upload Image
                </Button>
              </div>
            </div>
          </div>

          {uploadedImageUrl && (
            <div className="flex items-center gap-3 bg-white/5 border border-border rounded-lg p-2.5 mb-3 text-xs">
              <img src={uploadedImageUrl} className="h-10 w-10 object-cover rounded bg-white" alt="Upload Preview" />
              <div className="flex-1">
                <p className="text-text font-medium">Image uploaded successfully</p>
                <p className="text-muted truncate max-w-xs">{uploadedImageUrl}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  insertImage(uploadedImageUrl);
                  setUploadedImageUrl('');
                }}
                className="h-7 px-2 border-accent text-accent hover:bg-accent/10"
              >
                Insert into Editor
              </Button>
            </div>
          )}

          <Controller
            name="body"
            control={control}
            render={({ field }) => (
              <ReactQuill
                theme="snow"
                ref={quillRef}
                value={field.value}
                onChange={field.onChange}
                placeholder="Write your email body here. Use {{name}} to personalize with subscriber names..."
              />
            )}
          />
          {errors.body && <p className="mt-1.5 text-xs text-danger">{errors.body.message}</p>}

          { (aiReasoning || aiDeliverability) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-border/40 pt-5">
              {/* AI Reasoning Panel */}
              {aiReasoning && (
                <Card className="bg-surface border-border p-5 rounded-xl">
                  <CardHeader className="p-0 pb-3 border-none flex flex-row items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-accent" />
                    <CardTitle className="text-xs font-bold text-text uppercase tracking-wider m-0">
                      AI Copywriting Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 text-xs text-muted leading-relaxed whitespace-pre-line">
                    {aiReasoning}
                  </CardContent>
                </Card>
              )}

              {/* Deliverability Insights Panel */}
              {aiDeliverability && (
                <Card className="bg-surface border-border p-5 rounded-xl">
                  <CardHeader className="p-0 pb-3 border-none flex flex-row items-center gap-2">
                    <Send className="h-4.5 w-4.5 text-success" />
                    <CardTitle className="text-xs font-bold text-text uppercase tracking-wider m-0">
                      Gmail Deliverability Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 bg-white/[0.02] border border-border/60 rounded-lg p-3 text-center">
                        <span className="block text-[10px] font-bold text-muted uppercase tracking-wider">Deliverability Score</span>
                        <span className={cn(
                          "block text-2xl font-extrabold mt-1",
                          aiDeliverability.deliverabilityScore >= 90 ? "text-success" : aiDeliverability.deliverabilityScore >= 70 ? "text-warning" : "text-danger"
                        )}>
                          {aiDeliverability.deliverabilityScore} / 100
                        </span>
                      </div>
                      <div className="flex-1 bg-white/[0.02] border border-border/60 rounded-lg p-3 text-center">
                        <span className="block text-[10px] font-bold text-muted uppercase tracking-wider">Promotions Risk</span>
                        <span className={cn(
                          "block text-lg font-extrabold mt-1.5 uppercase",
                          aiDeliverability.promotionsRisk === 'Low' ? "text-success" : aiDeliverability.promotionsRisk === 'Medium' ? "text-warning" : "text-danger"
                        )}>
                          {aiDeliverability.promotionsRisk}
                        </span>
                      </div>
                    </div>

                    {aiDeliverability.deliverabilitySuggestions && aiDeliverability.deliverabilitySuggestions.length > 0 && (
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-muted uppercase tracking-wider">Key Recommendations</span>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-muted">
                          {aiDeliverability.deliverabilitySuggestions.map((suggestion, idx) => (
                            <li key={idx} className="leading-relaxed">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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
      <Dialog open={aiOpen} onOpenChange={setAiOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <span>Generate Copy with Claude AI</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Campaign Type</label>
                <Select value={aiType} onChange={(e) => setAiType(e.target.value)}>
                  <option value="Newsletter">Newsletter</option>
                  <option value="Product Launch">Product Launch</option>
                  <option value="Feature Update">Feature Update</option>
                  <option value="Promotion">Promotion</option>
                  <option value="Event Invitation">Event Invitation</option>
                  <option value="Welcome Email">Welcome Email</option>
                  <option value="Re-engagement">Re-engagement</option>
                  <option value="Announcement">Announcement</option>
                  <option value="Educational">Educational</option>
                  <option value="Custom">Custom</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Goal</label>
                <Select value={aiGoal} onChange={(e) => setAiGoal(e.target.value)}>
                  <option value="Educate">Educate</option>
                  <option value="Sell">Sell</option>
                  <option value="Announce">Announce</option>
                  <option value="Engage">Engage</option>
                  <option value="Retain">Retain</option>
                  <option value="Convert">Convert</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">CTA Type</label>
                <Select value={aiCta} onChange={(e) => setAiCta(e.target.value)}>
                  <option value="Reply">Reply</option>
                  <option value="Visit Website">Visit Website</option>
                  <option value="Read Blog">Read Blog</option>
                  <option value="Book Demo">Book Demo</option>
                  <option value="Join Waitlist">Join Waitlist</option>
                  <option value="Start Free Trial">Start Free Trial</option>
                  <option value="Download Resource">Download Resource</option>
                  <option value="Contact Team">Contact Team</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Brand Voice</label>
                <Select value={aiBrandVoice} onChange={(e) => setAiBrandVoice(e.target.value)}>
                  <option value="Founder">Founder Style</option>
                  <option value="Startup">Startup Style</option>
                  <option value="Technical">Technical</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Community">Community</option>
                  <option value="Educational">Educational</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Inbox Style</label>
                <Select value={aiInboxStyle} onChange={(e) => setAiInboxStyle(e.target.value)}>
                  <option value="Personal Email">Personal Email</option>
                  <option value="Founder Update">Founder Update</option>
                  <option value="Community Update">Community Update</option>
                  <option value="Newsletter">Newsletter</option>
                  <option value="Marketing Campaign">Marketing Campaign</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Deliverability Mode</label>
                <Select value={aiDeliverabilityMode} onChange={(e) => setAiDeliverabilityMode(e.target.value)}>
                  <option value="Max Inbox Placement">Max Inbox Placement</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Marketing">Marketing</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Industry</label>
                <Select value={aiIndustry} onChange={(e) => setAiIndustry(e.target.value)}>
                  <option value="SaaS">SaaS</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Education">Education</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Technology">Technology</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Agency">Agency</option>
                  <option value="Nonprofit">Nonprofit</option>
                  <option value="Custom">Custom</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Email Length</label>
                <Select value={aiLength} onChange={(e) => setAiLength(e.target.value)}>
                  <option value="Short">Short (50-150 words)</option>
                  <option value="Medium">Medium (150-300 words)</option>
                  <option value="Long">Long (300-700 words)</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Tone</label>
                <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                  <option value="professional">Professional & Direct</option>
                  <option value="casual">Friendly & Casual</option>
                  <option value="witty">Witty & Creative</option>
                  <option value="urgent">Urgent & Direct</option>
                  <option value="educational">Educational & Instructive</option>
                </Select>
              </div>
            </div>
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
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Custom Instructions (Optional AI Prompt)</label>
              <Textarea
                placeholder="e.g. Write about Redis + BullMQ reliability improvements and mention we fixed the stalled jobs issue."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[70px] resize-y"
              />
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

      {/* Rewrite With AI Dialog */}
      <Dialog open={rewriteOpen} onOpenChange={setRewriteOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent" />
            <span>Rewrite Email with AI</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="mt-4">
          {!rewrittenBody ? (
            <div className="space-y-4">
              <p className="text-xs text-muted">Choose a tone/style to rewrite your email body. AI will preserve HTML layout and links.</p>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Select Tone / Style</label>
                <Select value={selectedTone} onChange={(e) => setSelectedTone(e.target.value)}>
                  <option value="More Professional">More Professional</option>
                  <option value="More Technical">More Technical</option>
                  <option value="More Human">More Human</option>
                  <option value="More Persuasive">More Persuasive</option>
                  <option value="Shorter">Shorter</option>
                  <option value="Longer">Longer</option>
                  <option value="Improve CTA">Improve CTA</option>
                  <option value="Improve Open Rate">Improve Open Rate</option>
                  <option value="Founder Style">Founder Style</option>
                  <option value="Startup Style">Startup Style</option>
                </Select>
              </div>
              {rewriteError && <p className="text-xs text-danger">{rewriteError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted">Review the rewritten content before applying it to your editor:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                <div className="border border-border rounded-lg p-3 bg-white/[0.01]">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Original</p>
                  <div className="text-xs text-text/80 space-y-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: originalBody }} />
                </div>
                <div className="border border-accent/30 rounded-lg p-3 bg-accent/5">
                  <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Rewritten ({selectedTone})</p>
                  <div className="text-xs text-text space-y-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: rewrittenBody }} />
                </div>
              </div>
              {rewriteError && <p className="text-xs text-danger">{rewriteError}</p>}
            </div>
          )}
        </DialogContent>
        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setRewriteOpen(false); setRewrittenBody(''); }} disabled={rewriteLoading}>
            Cancel
          </Button>
          {!rewrittenBody ? (
            <Button onClick={handleRewrite} disabled={rewriteLoading} className="gap-2 bg-accent text-white">
              {rewriteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Rewrite Content
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRewrittenBody('')} className="border-border text-muted">
                Back
              </Button>
              <Button onClick={handleApplyRewrite} className="gap-2 bg-accent text-white">
                <Check className="h-4 w-4" />
                Apply to Editor
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>

      {/* AI Subject Suggestions Dialog */}
      <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen} className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <span>AI Subject Line Suggestions</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="mt-4">
          {suggestionsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-xs text-muted">Generating 5 alternative subject lines...</p>
            </div>
          ) : suggestionsError ? (
            <div className="space-y-2">
              <p className="text-sm text-danger">{suggestionsError}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted">Click any suggestion to apply it to your campaign draft:</p>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {subjectSuggestions.map((suggestion, idx) => {
                  const isBest = suggestion.subject === bestSubject;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col md:flex-row md:items-center justify-between border rounded-lg p-3.5 transition-all gap-3 bg-white/[0.01] ${
                        isBest ? 'border-accent/40 bg-accent/[0.02]' : 'border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-text">{suggestion.subject}</span>
                          {isBest && (
                            <span className="bg-success/10 border border-success/20 text-success text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Best Recommendation
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted leading-relaxed">Reasoning: {suggestion.reasoning}</p>
                      </div>
                      <Button
                        type="button"
                        variant={isBest ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setValue('subject', suggestion.subject, { shouldValidate: true });
                          setSuggestionsOpen(false);
                          toast.success('Subject line updated!');
                        }}
                        className="h-8 self-end md:self-center"
                      >
                        Use Subject
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setSuggestionsOpen(false)} disabled={suggestionsLoading}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
