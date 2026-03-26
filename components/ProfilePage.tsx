"use client";
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useToast } from './ToastContext';
import { useSubscription } from '../hooks/useSubscription';
import { User, Shield, CreditCard, Settings, Activity, ArrowLeft, Check, Loader2, Eye, EyeOff, BookOpen, Pencil, Trash2, Download, Image as ImageIcon, Bot } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getActivity, ActivityEntry, getPreferences, savePreferences, UserPreferences, DEFAULT_PREFERENCES } from '../services/storage';

interface ProfilePageProps {
  user: FirebaseUser | null;
  onBack: () => void;
}

// Activity icon mapping
const getActivityIcon = (action: string) => {
  switch (action) {
    case 'project_created': return <BookOpen size={14} className="text-emerald-500" />;
    case 'open_project': return <BookOpen size={14} className="text-blue-500" />;
    case 'publish_book': return <Download size={14} className="text-purple-500" />;
    case 'open_cover_studio': return <ImageIcon size={14} className="text-pink-500" />;
    case 'delete_project': return <Trash2 size={14} className="text-red-500" />;
    case 'open_agent_command': return <Bot size={14} className="text-amber-500" />;
    case 'start_new_project_flow': return <Pencil size={14} className="text-indigo-500" />;
    default: return <Activity size={14} className="text-slate-400" />;
  }
};

const formatActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    project_created: 'Created Project',
    open_project: 'Opened Project',
    publish_book: 'Published Book',
    open_cover_studio: 'Opened Cover Studio',
    open_context_studio: 'Opened Research Studio',
    delete_project: 'Deleted Project',
    open_agent_command: 'Opened Agent Command',
    start_new_project_flow: 'Started New Project',
    open_remix_engine: 'Opened Remix Engine',
    open_research_studio: 'Opened Research Studio',
    exit_studio: 'Exited Studio',
    crystallize_project_start: 'Started Project Setup',
    express_start: 'Quick Start',
    create_project_from_art: 'Created Project from Art',
    remix_project_start: 'Remixed Project',
    download_asset: 'Downloaded Asset',
    open_profile: 'Viewed Profile',
    password_updated: 'Updated Password',
    preferences_saved: 'Saved Preferences',
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Billing Section Component
const BillingSection: React.FC = () => {
  const { isSubscribed, subscriptionStatus, currentPeriodEnd, openBillingPortal, isMonthly, isYearly } = useSubscription();

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isSubscribed) {
    return (
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="text-emerald-500" />
          <h2 className="text-xl font-bold text-slate-900">Billing & Subscription</h2>
        </div>
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <Check size={18} className="text-emerald-600" />
              <span className="font-semibold text-emerald-900">Active Subscription</span>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong>Plan:</strong> Manuscale Pro {isMonthly ? '(Monthly)' : isYearly ? '(Yearly)' : ''}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span className="text-emerald-600 font-semibold capitalize">{subscriptionStatus}</span>
              </p>
              <p>
                <strong>Next Billing Date:</strong> {formatDate(currentPeriodEnd)}
              </p>
            </div>
          </div>
          <Button
            onClick={openBillingPortal}
            variant="ghost"
            className="w-full border border-slate-200 hover:bg-slate-50"
          >
            Manage Subscription
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-900">Upgrade to Pro</h2>
      </div>
      <p className="text-slate-600 mb-4">
        Unlock all features with Manuscale Pro and get unlimited access to AI-powered writing, exports, and more.
      </p>
      <a
        href="/pricing"
        className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
      >
        View Pricing Plans
      </a>
    </section>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack }) => {
  const { showToast } = useToast();

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsDirty, setPrefsDirty] = useState(false);

  // Activity state
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  // Detect if user signed in with email/password (vs Google)
  const isEmailUser = user?.providerData?.some(p => p.providerId === 'password') ?? false;

  useEffect(() => {
    const loadData = async () => {
      const [prefs, activities] = await Promise.all([
        getPreferences(),
        getActivity(),
      ]);
      setPreferences(prefs);
      setActivity(activities);
      setIsLoadingActivity(false);
    };
    loadData();
  }, []);

  const handleUpdatePassword = async () => {
    if (!user || !isEmailUser) return;
    if (!currentPassword) { showToast('Please enter your current password.', 'error'); return; }
    if (newPassword.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('New passwords do not match.', 'error'); return; }

    setIsUpdatingPassword(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Update password
      await updatePassword(user, newPassword);
      showToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        showToast('Current password is incorrect.', 'error');
      } else if (code === 'auth/weak-password') {
        showToast('New password is too weak. Use at least 6 characters.', 'error');
      } else if (code === 'auth/requires-recent-login') {
        showToast('Please log out and log back in, then try again.', 'error');
      } else {
        showToast('Failed to update password. Please try again.', 'error');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setPrefsDirty(true);
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await savePreferences(preferences);
      setPrefsDirty(false);
      showToast('Preferences saved!', 'success');
    } catch {
      showToast('Failed to save preferences.', 'error');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || 'Not available';
  const photoURL = user?.photoURL;
  const createdAt = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const lastSignIn = user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-12 px-4 sm:px-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-6 sm:mb-8 transition-colors p-2 -ml-2 touch-target">
        <ArrowLeft size={16}/> Back to Dashboard
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 sm:mb-8">User Profile</h1>

      <div className="space-y-8">
        {/* Profile Info */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <User className="text-primary-600" />
            <h2 className="text-xl font-bold text-slate-900">Profile Info</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-slate-200 object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                <div className="text-sm text-slate-900 font-medium">{displayName}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <div className="text-sm text-slate-900">{displayEmail}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {createdAt && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Member Since</label>
                    <div className="text-sm text-slate-600">{createdAt}</div>
                  </div>
                )}
                {lastSignIn && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Last Sign In</label>
                    <div className="text-sm text-slate-600">{lastSignIn}</div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Auth Provider</label>
                <div className="text-sm text-slate-600">{isEmailUser ? 'Email & Password' : 'Google'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-primary-600" />
            <h2 className="text-xl font-bold text-slate-900">Security</h2>
          </div>
          {isEmailUser ? (
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-slate-600 mb-2">Change your account password.</p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 outline-none pr-10"
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrentPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 outline-none pr-10"
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 outline-none"
                  placeholder="Re-enter new password"
                />
              </div>
              <Button variant="primary" onClick={handleUpdatePassword} disabled={isUpdatingPassword}>
                {isUpdatingPassword ? <><Loader2 size={14} className="animate-spin mr-1.5"/> Updating...</> : <><Check size={14} className="mr-1.5"/> Update Password</>}
              </Button>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 text-sm">
              You signed in with Google. Password management is handled through your Google account settings.
            </div>
          )}
        </section>

        {/* Billing */}
        <BillingSection />

        {/* Preferences */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Settings className="text-primary-600" />
            <h2 className="text-xl font-bold text-slate-900">Preferences</h2>
          </div>
          <div className="space-y-5 max-w-lg">
            {/* Autosave */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Autosave</div>
                <div className="text-xs text-slate-500">Automatically save your work periodically</div>
              </div>
              <button onClick={() => updatePref('autosaveEnabled', !preferences.autosaveEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${preferences.autosaveEnabled ? 'bg-primary-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${preferences.autosaveEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}/>
              </button>
            </div>

            {preferences.autosaveEnabled && (
              <div className="pl-4 border-l-2 border-primary-100">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Autosave Interval</label>
                <select value={preferences.autosaveInterval} onChange={e => updatePref('autosaveInterval', Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 outline-none">
                  <option value={2}>Every 2 minutes</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={10}>Every 10 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                </select>
              </div>
            )}

            {/* Show Word Count */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Show Word Count</div>
                <div className="text-xs text-slate-500">Display word counts in the project dashboard</div>
              </div>
              <button onClick={() => updatePref('showWordCount', !preferences.showWordCount)}
                className={`w-11 h-6 rounded-full transition-colors relative ${preferences.showWordCount ? 'bg-primary-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${preferences.showWordCount ? 'translate-x-[22px]' : 'translate-x-0.5'}`}/>
              </button>
            </div>

            {/* Confirm Before Delete */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Confirm Before Delete</div>
                <div className="text-xs text-slate-500">Show a confirmation dialog before deleting projects</div>
              </div>
              <button onClick={() => updatePref('confirmBeforeDelete', !preferences.confirmBeforeDelete)}
                className={`w-11 h-6 rounded-full transition-colors relative ${preferences.confirmBeforeDelete ? 'bg-primary-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${preferences.confirmBeforeDelete ? 'translate-x-[22px]' : 'translate-x-0.5'}`}/>
              </button>
            </div>

            {/* Compact Sidebar */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Compact Sidebar</div>
                <div className="text-xs text-slate-500">Use a narrower sidebar in the editor</div>
              </div>
              <button onClick={() => updatePref('compactSidebar', !preferences.compactSidebar)}
                className={`w-11 h-6 rounded-full transition-colors relative ${preferences.compactSidebar ? 'bg-primary-500' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${preferences.compactSidebar ? 'translate-x-[22px]' : 'translate-x-0.5'}`}/>
              </button>
            </div>

            {/* Default Voice */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Default Audiobook Voice</label>
              <select value={preferences.defaultVoice} onChange={e => updatePref('defaultVoice', e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 outline-none w-full">
                <option value="Kore">Kore (Female, Clear)</option>
                <option value="Aoede">Aoede (Female, Professional)</option>
                <option value="Zephyr">Zephyr (Male, Authoritative)</option>
                <option value="Fenrir">Fenrir (Male, Deep)</option>
              </select>
            </div>

            {prefsDirty && (
              <Button variant="primary" onClick={handleSavePreferences} disabled={isSavingPrefs}>
                {isSavingPrefs ? <><Loader2 size={14} className="animate-spin mr-1.5"/> Saving...</> : <><Check size={14} className="mr-1.5"/> Save Preferences</>}
              </Button>
            )}
          </div>
        </section>

        {/* Activity */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Activity className="text-primary-600" />
            <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
          </div>
          {isLoadingActivity ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 size={14} className="animate-spin" /> Loading activity...
            </div>
          ) : activity.length === 0 ? (
            <div className="text-sm text-slate-500 py-4">No activity recorded yet. Start creating projects to see your activity here!</div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {activity.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                    {getActivityIcon(entry.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{formatActionLabel(entry.action)}</div>
                    {entry.detail && <div className="text-xs text-slate-500 truncate">{entry.detail}</div>}
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">{formatRelativeTime(entry.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
