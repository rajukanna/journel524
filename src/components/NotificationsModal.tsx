import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Check, 
  X, 
  ShieldAlert, 
  Loader2, 
  ExternalLink, 
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserNotificationSettings, 
  saveUserNotificationSettings, 
  DEFAULT_NOTIFICATION_SETTINGS 
} from '../lib/firebase';
import { NotificationSettings, NotificationEventType } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: NotificationSettings) => void;
}

const AVAILABLE_EVENTS: Array<{ id: NotificationEventType; label: string; desc: string }> = [
  { 
    id: 'breakthrough', 
    label: 'Breakthrough & Epiphany', 
    desc: 'Triggers when you reach sudden clarity or reframe a longstanding challenge.' 
  },
  { 
    id: 'milestone', 
    label: 'Personal Milestones', 
    desc: 'Triggers when you fulfill an emotional goal or complete a reflective cycle.' 
  },
  { 
    id: 'emotional_shift', 
    label: 'Emotional Shifts', 
    desc: 'Triggers when heavy anxiety or grief gives way to calm and acceptance.' 
  },
  { 
    id: 'gratitude', 
    label: 'Moments of Gratitude', 
    desc: 'Triggers when you articulate deep appreciation for people or life.' 
  },
  { 
    id: 'action_commitment', 
    label: 'Action Commitments', 
    desc: 'Triggers when you declare a concrete, definitive next life step.' 
  },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const { user, getToken } = useAuth();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    async function load() {
      if (!user) return;
      try {
        setIsLoading(true);
        const data = await getUserNotificationSettings(user.uid);
        if (isMounted) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Error loading notification settings:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.uid]);

  if (!isOpen) return null;

  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:') {
        setValidationError('Webhook URL must use secure HTTPS protocol.');
        return false;
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host)
      ) {
        setValidationError('Anti-SSRF Policy: Internal and private IP addresses are prohibited.');
        return false;
      }
      setValidationError(null);
      return true;
    } catch {
      setValidationError('Please enter a valid URL (e.g. https://hooks.slack.com/services/...)');
      return false;
    }
  };

  const handleToggleEvent = (eventId: NotificationEventType) => {
    const exists = settings.events.includes(eventId);
    const updated = exists 
      ? settings.events.filter(e => e !== eventId)
      : [...settings.events, eventId];
    setSettings({ ...settings, events: updated });
  };

  const handleTestNotification = async () => {
    if (!settings.webhookUrl || !validateUrl(settings.webhookUrl)) {
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          webhookUrl: settings.webhookUrl,
          channel: settings.channel,
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestStatus({
          success: true,
          message: 'Test payload successfully dispatched! Check your channel.'
        });
      } else {
        setTestStatus({
          success: false,
          message: data.error || 'Webhook test failed. Verify webhook endpoint permissions.'
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err.message || 'Network error sending test dispatch.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (settings.enabled && settings.webhookUrl && !validateUrl(settings.webhookUrl)) {
      return;
    }

    if (!user) return;
    setIsSaving(true);
    try {
      await saveUserNotificationSettings(user.uid, settings);
      if (onSettingsSaved) {
        onSettingsSaved(settings);
      }
      onClose();
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setValidationError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      id="modal-notifications" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Slack Integration</h3>
              <p className="text-xs text-slate-500">Dispatch milestone and breakthrough reflections directly to Slack</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">Loading notification preferences...</span>
            </div>
          ) : (
            <>
              {/* Master toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Enable Automated Alerts</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dispatch an outbound webhook whenever Gemini detects a milestone or breakthrough.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="toggle-notifications-master"
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Slack Channel Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Slack Incoming Webhook
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Direct Channel Delivery</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  In your Slack workspace, create an <strong>Incoming Webhook</strong> (via Slack Apps &gt; Incoming WebHooks) and paste the generated URL below.
                </p>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-webhook-url" className="text-xs font-semibold text-slate-700">
                    Slack Webhook URL
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">HTTPS Required</span>
                </div>
                <input
                  id="input-webhook-url"
                  type="url"
                  value={settings.webhookUrl}
                  onChange={(e) => {
                    setSettings({ ...settings, webhookUrl: e.target.value, channel: 'slack' });
                    if (validationError) validateUrl(e.target.value);
                  }}
                  placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                  className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 placeholder:text-slate-400 font-mono text-xs transition-all ${
                    validationError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {validationError && (
                  <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{validationError}</span>
                  </p>
                )}
              </div>

              {/* Trigger Event Categories */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Select Notification Triggers
                </label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map((item) => {
                    const isChecked = settings.events.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEvent(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-900 block">{item.label}</span>
                          <span className="text-[11px] text-slate-500">{item.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Test Dispatch Status */}
              {testStatus && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                    testStatus.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  )}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            id="btn-test-notification"
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting || !settings.webhookUrl}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-blue-600" />}
            <span>Test Slack Alert</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-notifications"
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-4 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Slack Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
