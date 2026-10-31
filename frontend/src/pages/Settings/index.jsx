import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { BellRing, Languages, Moon, ShieldCheck, Sun, Check } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { toggleDark, showToast } from '../../store/uiSlice';

const settings = [
  { id: 'dark-mode', title: 'Dark mode', description: 'Switch between light and dark visual themes for comfortable viewing.', icon: Moon },
  { id: 'notifications', title: 'Notification preferences', description: 'Maintenance, visitor, emergency, and booking alerts.', icon: BellRing },
  { id: 'privacy', title: 'Security privacy', description: 'Control profile visibility and visitor approval defaults.', icon: ShieldCheck },
  { id: 'language', title: 'Language', description: 'Choose your preferred language (English, Hindi, Telugu).', icon: Languages },
];

export default function SettingsPage() {
  const dispatch = useDispatch();
  const isDark = useSelector((s) => s.ui.dark);

  const [activeModal, setActiveModal] = useState(null);

  // Notification settings state
  const [notifState, setNotifState] = useState({
    maintenance: true,
    visitors: true,
    emergency: true,
    announcements: true,
  });

  // Privacy settings state
  const [privacyState, setPrivacyState] = useState({
    showPhoneToNeighbors: false,
    requireApprovalForDeliveries: true,
    showUnitInDirectory: true,
  });

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem('app_language') || 'English'
  );

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    localStorage.setItem('notification_prefs', JSON.stringify(notifState));
    dispatch(showToast({ message: 'Notification preferences saved successfully' }));
    setActiveModal(null);
  };

  const handleSavePrivacy = (e) => {
    e.preventDefault();
    localStorage.setItem('privacy_prefs', JSON.stringify(privacyState));
    dispatch(showToast({ message: 'Privacy settings saved successfully' }));
    setActiveModal(null);
  };

  const handleSaveLanguage = (lang) => {
    setSelectedLanguage(lang);
    localStorage.setItem('app_language', lang);
    dispatch(showToast({ message: `Language changed to ${lang}` }));
    setActiveModal(null);
  };

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Personalize alerts, privacy, language, and interface behavior." />
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map(({ id, title, description, icon: Icon }) => (
          <section key={id} className="card flex gap-4 p-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-brand-600 dark:bg-slate-800"><Icon size={22} /></div>
            <div className="flex-1">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              <button
                onClick={() => setActiveModal(id)}
                className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Configure
              </button>
            </div>
          </section>
        ))}
      </div>

      {/* Dark Mode Modal */}
      <Dialog open={activeModal === 'dark-mode'} onClose={() => setActiveModal(null)} fullWidth maxWidth="xs">
        <DialogContent className="!p-6">
          <h2 className="font-display text-xl font-bold">Theme Appearance</h2>
          <p className="mt-1 text-xs text-earth-500">Choose between light and dark mode appearance.</p>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => { if (isDark) dispatch(toggleDark()); setActiveModal(null); }}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left font-bold transition ${!isDark ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-earth-200 text-earth-700 dark:border-earth-700'}`}
            >
              <div className="flex items-center gap-3"><Sun size={20} /> Light Mode</div>
              {!isDark && <Check size={18} />}
            </button>
            <button
              onClick={() => { if (!isDark) dispatch(toggleDark()); setActiveModal(null); }}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left font-bold transition ${isDark ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300' : 'border-earth-200 text-earth-700 dark:border-earth-700'}`}
            >
              <div className="flex items-center gap-3"><Moon size={20} /> Dark Mode</div>
              {isDark && <Check size={18} />}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Modal */}
      <Dialog open={activeModal === 'notifications'} onClose={() => setActiveModal(null)} fullWidth maxWidth="sm">
        <DialogContent className="!p-6">
          <h2 className="font-display text-xl font-bold">Notification Preferences</h2>
          <p className="mt-1 text-xs text-earth-500">Choose which notifications you wish to receive.</p>
          <form onSubmit={handleSaveNotifications} className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Emergency &amp; Security Alerts</div>
                <div className="text-xs text-earth-500">Receive instant SOS and gate security sirens</div>
              </div>
              <input
                type="checkbox"
                checked={notifState.emergency}
                onChange={(e) => setNotifState({ ...notifState, emergency: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Visitor Gate Passes</div>
                <div className="text-xs text-earth-500">Alerts when guests and deliveries arrive at the gate</div>
              </div>
              <input
                type="checkbox"
                checked={notifState.visitors}
                onChange={(e) => setNotifState({ ...notifState, visitors: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Maintenance &amp; Ticket Updates</div>
                <div className="text-xs text-earth-500">Status changes on your complaints and requests</div>
              </div>
              <input
                type="checkbox"
                checked={notifState.maintenance}
                onChange={(e) => setNotifState({ ...notifState, maintenance: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Community Bulletin &amp; Notices</div>
                <div className="text-xs text-earth-500">Announcements, festivals, and office circulars</div>
              </div>
              <input
                type="checkbox"
                checked={notifState.announcements}
                onChange={(e) => setNotifState({ ...notifState, announcements: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-earth-200 px-4 py-2 text-sm font-semibold dark:border-earth-700">Cancel</button>
              <button type="submit" className="btn-primary">Save Preferences</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Security Privacy Modal */}
      <Dialog open={activeModal === 'privacy'} onClose={() => setActiveModal(null)} fullWidth maxWidth="sm">
        <DialogContent className="!p-6">
          <h2 className="font-display text-xl font-bold">Security &amp; Privacy</h2>
          <p className="mt-1 text-xs text-earth-500">Manage directory visibility and security gates.</p>
          <form onSubmit={handleSavePrivacy} className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Display Phone Number in Resident Directory</div>
                <div className="text-xs text-earth-500">Allow other verified residents to view your contact number</div>
              </div>
              <input
                type="checkbox"
                checked={privacyState.showPhoneToNeighbors}
                onChange={(e) => setPrivacyState({ ...privacyState, showPhoneToNeighbors: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Require Resident Approval For Unannounced Deliveries</div>
                <div className="text-xs text-earth-500">Guard will ring resident before issuing entry token</div>
              </div>
              <input
                type="checkbox"
                checked={privacyState.requireApprovalForDeliveries}
                onChange={(e) => setPrivacyState({ ...privacyState, requireApprovalForDeliveries: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-earth-200 p-3.5 dark:border-earth-700">
              <div>
                <div className="text-sm font-bold">Show Unit Number in Community Forum Posts</div>
                <div className="text-xs text-earth-500">Include apartment number alongside your name on discussions</div>
              </div>
              <input
                type="checkbox"
                checked={privacyState.showUnitInDirectory}
                onChange={(e) => setPrivacyState({ ...privacyState, showUnitInDirectory: e.target.checked })}
                className="h-5 w-5 rounded border-earth-300 text-brand-600"
              />
            </label>
            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setActiveModal(null)} className="rounded-xl border border-earth-200 px-4 py-2 text-sm font-semibold dark:border-earth-700">Cancel</button>
              <button type="submit" className="btn-primary">Save Privacy</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Language Modal */}
      <Dialog open={activeModal === 'language'} onClose={() => setActiveModal(null)} fullWidth maxWidth="xs">
        <DialogContent className="!p-6">
          <h2 className="font-display text-xl font-bold">Select Language</h2>
          <p className="mt-1 text-xs text-earth-500">Choose your preferred application language.</p>
          <div className="mt-5 space-y-3">
            {[
              { code: 'English', label: 'English', native: 'English' },
              { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
              { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
            ].map(({ code, label, native }) => (
              <button
                key={code}
                onClick={() => handleSaveLanguage(code)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left font-bold transition ${selectedLanguage === code ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300' : 'border-earth-200 text-earth-700 dark:border-earth-700'}`}
              >
                <div>
                  <div>{label}</div>
                  <div className="text-xs font-normal text-earth-500">{native}</div>
                </div>
                {selectedLanguage === code && <Check size={18} />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
