import React, { useState } from 'react';
import { useToast } from '../../components/common/Toast';
import useLocalStorage from '../../hooks/useLocalStorage';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-mint-light/60 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <label className="relative cursor-pointer flex-shrink-0 ml-4">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-gradient transition-all" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

export default function SettingsPage() {
  const toast    = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [prefs, setPrefs] = useLocalStorage('ema_prefs', {
    subscriptionReminder:true,
    examAnnouncements:   true,
    soundEffects:        false,
    autoNextQuestion:    false,
    showExplanationAuto: true,
    compactMode:         false,
  });

  const setPref = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="max-w-xl space-y-5">
      <h2 className="font-display font-extrabold text-2xl text-primary-700">Settings ⚙️</h2>

      {/* Notifications */}
      <div className="soft-card p-5">
        <h3 className="font-display font-bold text-base text-primary-700 mb-2">🔔 Notifications</h3>
        <Toggle label="Subscription Expiry" description="Alert when subscription is about to expire"
          checked={prefs.subscriptionReminder} onChange={v => setPref('subscriptionReminder', v)} />
        <Toggle label="New Announcements" description="Know when new announcements are available"
          checked={prefs.examAnnouncements} onChange={v => setPref('examAnnouncements', v)} />
      </div>

      {/* Practice preferences */}
      <div className="soft-card p-5">
        <h3 className="font-display font-bold text-base text-primary-700 mb-2">⚡ Practice</h3>
        <Toggle label="Auto-show Explanation" description="Show explanation immediately after answering"
          checked={prefs.showExplanationAuto} onChange={v => setPref('showExplanationAuto', v)} />
        <Toggle label="Auto-advance to Next" description="Move to next question automatically after 3 seconds"
          checked={prefs.autoNextQuestion} onChange={v => setPref('autoNextQuestion', v)} />
        <Toggle label="Sound Effects" description="Play sounds for correct/wrong answers"
          checked={prefs.soundEffects} onChange={v => setPref('soundEffects', v)} />
      </div>

      {/* Display */}
      <div className="soft-card p-5">
        <h3 className="font-display font-bold text-base text-primary-700 mb-2">🎨 Display</h3>
        <Toggle label="Compact Mode" description="Reduce spacing for a denser layout"
          checked={prefs.compactMode} onChange={v => setPref('compactMode', v)} />
      </div>

      {/* Account actions */}
      <div className="soft-card p-5 space-y-3">
        <h3 className="font-display font-bold text-base text-primary-700 mb-1">Account</h3>
        <Button variant="white" fullWidth onClick={() => navigate('/dashboard/profile')}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Edit Profile
        </Button>
        <Button variant="white" fullWidth onClick={() => navigate('/dashboard/subscription')}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          Manage Subscription
        </Button>
        <Button variant="danger" fullWidth onClick={() => setShowLogoutConfirm(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign Out
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out?"
        message="You will be redirected to the login page."
        confirmLabel="Sign Out"
        variant="warning"
        loading={loggingOut}
      />
    </div>
  );
}
