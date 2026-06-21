import React, { useState, useEffect } from 'react';
import { Settings, Sliders, LogOut, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '../components/ui/custom.jsx';
import { cn } from '../lib/utils.js';
import { useAuth } from '../hooks/useAuth.js';

const TABS = [
  { id: 'general',     label: 'General',     icon: Settings },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'account',     label: 'Account',     icon: LogOut },
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
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // General Settings
  const [appName, setAppName] = useState('Mailtide');
  const [notifEmail, setNotifEmail] = useState(user?.email || '');

  // Preferences Toggles
  const [bounceAlerts, setBounceAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [unsubNotify, setUnsubNotify] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedAppName = localStorage.getItem('mailtide_app_name');
    if (savedAppName) setAppName(savedAppName);

    const savedNotifEmail = localStorage.getItem('mailtide_notif_email');
    if (savedNotifEmail) setNotifEmail(savedNotifEmail);
    else if (user?.email) setNotifEmail(user.email);

    const savedBounce = localStorage.getItem('mailtide_bounce_alerts');
    if (savedBounce !== null) setBounceAlerts(savedBounce === 'true');

    const savedDigest = localStorage.getItem('mailtide_weekly_digest');
    if (savedDigest !== null) setWeeklyDigest(savedDigest === 'true');

    const savedUnsub = localStorage.getItem('mailtide_unsub_notify');
    if (savedUnsub !== null) setUnsubNotify(savedUnsub === 'true');
  }, [user]);

  const handleSave = () => {
    localStorage.setItem('mailtide_app_name', appName);
    localStorage.setItem('mailtide_notif_email', notifEmail);
    localStorage.setItem('mailtide_bounce_alerts', String(bounceAlerts));
    localStorage.setItem('mailtide_weekly_digest', String(weeklyDigest));
    localStorage.setItem('mailtide_unsub_notify', String(unsubNotify));
    toast.success('Settings saved.');
  };

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

        {/* ── General Settings ── */}
        {activeTab === 'general' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">General Settings</h3>
            <SettingRow label="Application Name" description="Used in email headers and branding.">
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="w-48" />
            </SettingRow>
            <SettingRow label="Notification Email" description="Receive system alerts at this address.">
              <Input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} className="w-52" />
            </SettingRow>
          </div>
        )}

        {/* ── Preferences Toggles ── */}
        {activeTab === 'preferences' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">System Alerts</h3>
            <SettingRow label="Bounce Alerts" description="Get notified when emails bounce.">
              <Toggle enabled={bounceAlerts} onChange={setBounceAlerts} />
            </SettingRow>
            <SettingRow label="Weekly Digest" description="Summary report every Monday morning.">
              <Toggle enabled={weeklyDigest} onChange={setWeeklyDigest} />
            </SettingRow>
            <SettingRow label="Unsubscribe Notifications" description="Alert when subscribers opt out.">
              <Toggle enabled={unsubNotify} onChange={setUnsubNotify} />
            </SettingRow>
          </div>
        )}

        {/* ── Account Actions (Logout) ── */}
        {activeTab === 'account' && (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-text mb-2">Account Management</h3>
            <p className="text-xs text-muted mb-6">Manage session access and authentication state.</p>
            <div className="rounded-lg border border-border p-4 bg-surface flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">Sign Out</p>
                <p className="text-xs text-muted">Disconnect session and exit your account.</p>
              </div>
              <Button onClick={logout} variant="outline" className="text-danger border-danger/20 hover:bg-danger/5 gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save bar */}
      {(activeTab === 'general' || activeTab === 'preferences') && (
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
