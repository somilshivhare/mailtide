import React, { useState } from 'react';
import { Settings, Mail, Key, Eye, EyeOff, Copy, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Label } from '../components/ui/custom.jsx';
import { cn } from '../lib/utils.js';
import { useAuth } from '../hooks/useAuth.js';

const TABS = [
  { id: 'general',  label: 'General',  icon: Settings },
  { id: 'email',    label: 'Email',    icon: Mail },
  { id: 'apikeys',  label: 'API Keys', icon: Key },
];

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{label}</p>
        {description && <p className="text-xs text-muted mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200",
        enabled ? "bg-accent border-accent" : "bg-gray-200 border-gray-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 mt-[0px]",
          enabled ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // General
  const [appName, setAppName] = useState('Mailtide');
  const [notifEmail, setNotifEmail] = useState(user?.email || '');

  // Email
  const [senderName, setSenderName] = useState('Mailtide');
  const [senderEmail, setSenderEmail] = useState('onboarding@resend.dev');
  const [replyTo, setReplyTo] = useState('');

  // Toggles
  const [toggles, setToggles] = useState({
    bounceAlerts: true,
    weeklyDigest: false,
    unsubNotify: true,
    openTracking: true,
    clickTracking: true,
  });

  // API Key display
  const [showKey, setShowKey] = useState(false);
  const fakeKey = 'mt_live_••••••••••••••••••••••••••••••••';

  const toggle = (key) => setToggles((t) => ({ ...t, [key]: !t[key] }));

  const handleSave = () => { toast.success('Settings saved.'); };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-text">Settings</h2>
        <p className="text-sm text-muted mt-0.5">Manage application preferences and integrations.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-border overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap -mb-px",
              activeTab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-text"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">

        {/* ── General ── */}
        {activeTab === 'general' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">General Settings</h3>
            <SettingRow label="Application Name" description="Used in email headers and branding.">
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="w-48" />
            </SettingRow>
            <SettingRow label="Notification Email" description="Receive system alerts at this address.">
              <Input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} className="w-52" />
            </SettingRow>
            <SettingRow label="Bounce Alerts" description="Get notified when emails bounce.">
              <Toggle enabled={toggles.bounceAlerts} onChange={() => toggle('bounceAlerts')} />
            </SettingRow>
            <SettingRow label="Weekly Digest" description="Summary report every Monday morning.">
              <Toggle enabled={toggles.weeklyDigest} onChange={() => toggle('weeklyDigest')} />
            </SettingRow>
            <SettingRow label="Unsubscribe Notifications" description="Alert when subscribers opt out.">
              <Toggle enabled={toggles.unsubNotify} onChange={() => toggle('unsubNotify')} />
            </SettingRow>
          </div>
        )}

        {/* ── Email ── */}
        {activeTab === 'email' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Email Sending</h3>
            <SettingRow label="From Name" description="Displayed in the recipient's inbox.">
              <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} className="w-44" />
            </SettingRow>
            <SettingRow label="From Email" description="Must match your verified Resend domain.">
              <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="w-56" />
            </SettingRow>
            <SettingRow label="Reply-To" description="Where replies are directed (optional).">
              <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="replies@yourdomain.com" className="w-52" />
            </SettingRow>
            <SettingRow label="Open Tracking" description="Embed 1×1 pixel to track email opens.">
              <Toggle enabled={toggles.openTracking} onChange={() => toggle('openTracking')} />
            </SettingRow>
            <SettingRow label="Click Tracking" description="Wrap links to track clicks.">
              <Toggle enabled={toggles.clickTracking} onChange={() => toggle('clickTracking')} />
            </SettingRow>
          </div>
        )}

        {/* ── API Keys ── */}
        {activeTab === 'apikeys' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-text mb-1">API Keys</h3>
            <p className="text-xs text-muted mb-5">Use these keys to authenticate with the Mailtide API.</p>

            <div className="rounded-lg border border-border p-4 bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">Production Key</p>
                  <p className="text-xs text-muted">Created Jun 1, 2026 · Last used Jun 15, 2026</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowKey((s) => !s)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-muted hover:text-text transition-colors"
                    title={showKey ? 'Hide key' : 'Reveal key'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText('mt_live_test_key'); toast.success('Copied to clipboard.'); }}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-muted hover:text-text transition-colors"
                    title="Copy"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <code className="block w-full rounded bg-gray-100 border border-border px-3 py-2 text-xs font-mono text-text tracking-wide">
                {showKey ? 'mt_live_sk_example_key_123456' : fakeKey}
              </code>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted">Rotate key to invalidate existing access.</p>
              <Button variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Rotate Key
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save bar */}
      {(activeTab === 'general' || activeTab === 'email') && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
}
