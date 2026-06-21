import React, { useState, useEffect } from 'react';
import { User, Building, Globe, Clock, Image, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth.js';
import { Button, Input, Textarea, Label } from '../components/ui/custom.jsx';
import { authAPI } from '../services/api.js';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'
];

const INDUSTRIES = [
  'Technology', 'SaaS / Software', 'E-commerce', 'Media & Publishing',
  'Education', 'Finance', 'Healthcare', 'Marketing Agency', 'Other'
];

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
    website: user?.website || '',
    industry: user?.industry || '',
    timezone: user?.timezone || 'UTC',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        website: user.website || '',
        industry: user.industry || '',
        timezone: user.timezone || 'UTC',
        bio: user.bio || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaved(false);
    try {
      const updatedUser = await authAPI.updateProfile({
        name: form.name,
        company: form.company,
        website: form.website,
        industry: form.industry,
        timezone: form.timezone,
        bio: form.bio
      });
      updateUser(updatedUser);
      toast.success('Profile saved.');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to save profile changes.');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading photo...');
    try {
      const updatedUser = await authAPI.uploadAvatar(file);
      updateUser(updatedUser);
      toast.success('Profile picture updated.', { id: toastId });
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast.error('Failed to upload profile picture.', { id: toastId });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text">Profile</h2>
        <p className="text-sm text-muted mt-0.5">Manage your account information.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar + identity */}
        <div className="rounded-xl border border-border bg-white shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Identity</h3>
          <div className="flex items-center gap-5 mb-5">
            <div className="relative">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt="Profile Avatar"
                  className="h-16 w-16 rounded-full object-cover border-2 border-accent/20"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-accent uppercase">
                    {(form.email || 'U')[0]}
                  </span>
                </div>
              )}
              <input
                type="file"
                id="avatar-upload-input"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById('avatar-upload-input')?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full border border-border bg-white shadow-dropdown text-muted hover:text-text"
                title="Change photo"
              >
                <Image className="h-3 w-3" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{form.name || form.email}</p>
              <p className="text-xs text-muted">{form.email}</p>
              <p className="text-xs text-muted mt-0.5">Free plan · {TIMEZONES.includes(form.timezone) ? form.timezone : 'UTC'}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Your full name"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                disabled
                className="bg-gray-50 text-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="A short description about yourself or your brand..."
              className="h-20"
            />
          </div>
        </div>

        {/* Organization */}
        <div className="rounded-xl border border-border bg-white shadow-card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Organization</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Company or brand name"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://yoursite.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                value={form.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm text-text shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <select
                  id="timezone"
                  value={form.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 py-1 text-sm text-text shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button type="submit" className="gap-2 min-w-[120px]">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
