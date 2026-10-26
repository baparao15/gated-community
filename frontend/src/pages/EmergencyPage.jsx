import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Phone, Plus, Siren, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList, unitLabel } from '../utils/apiData';

const PHONE_REGEX = /^[0-9+\-\s()]{3,20}$/;
const sosCategories = [
  ['medical', 'Medical'],
  ['fire', 'Fire'],
  ['security', 'Security'],
  ['other', 'Other'],
];

export default function EmergencyPage() {
  const role = useSelector((s) => s.auth.user?.role);
  const dispatch = useDispatch();
  const isResident = role === 'Resident';
  const isAdmin = role === 'Admin' || role === 'SuperAdmin';
  const canBroadcast = role === 'Guard' || isAdmin;

  const { data: contactData, setData: setContacts } = useApiData('/emergency-contacts', []);
  const { data: sosData, setData: setSos, reload: reloadSos } = useApiData('/sos', []);
  const contacts = asList(contactData);
  const alerts = asList(sosData);

  const [broadcast, setBroadcast] = useState('Medical emergency assistance required at the main gate.');
  const [sosForm, setSosForm] = useState({ category: 'medical', message: '' });
  const [confirmSos, setConfirmSos] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', type: 'emergency' });

  // Responders see new SOS alerts without having to refresh.
  useEffect(() => {
    if (isResident) return undefined;
    const timer = setInterval(reloadSos, 10000);
    return () => clearInterval(timer);
  }, [isResident, reloadSos]);

  const toastError = (err, fallback) => dispatch(showToast({ message: err.response?.data?.message || fallback, severity: 'error' }));

  const sendBroadcast = async () => {
    try {
      await api.post('/alerts/emergency', { title: 'Security emergency alert', message: broadcast });
      dispatch(showToast({ message: 'Emergency alert broadcast to all community users', severity: 'error' }));
    } catch (err) {
      toastError(err, 'Emergency alert could not be sent');
    }
  };

  const sendSos = async () => {
    try {
      const { data: response } = await api.post('/sos', sosForm);
      setSos([response.data, ...alerts]);
      setConfirmSos(false);
      setSosForm({ category: 'medical', message: '' });
      dispatch(showToast({ message: 'SOS sent. Security and admin have been alerted.', severity: 'error' }));
    } catch (err) {
      toastError(err, 'SOS could not be sent. Please call security directly.');
    }
  };

  const resolve = async (alert) => {
    try {
      const { data: response } = await api.patch(`/sos/${alert._id}/resolve`);
      setSos(alerts.map((item) => (item._id === alert._id ? { ...item, ...response.data } : item)));
      dispatch(showToast({ message: 'SOS marked as resolved' }));
    } catch (err) {
      toastError(err, 'SOS could not be updated');
    }
  };

  const addContact = async (event) => {
    event.preventDefault();
    if (!PHONE_REGEX.test(contactForm.phone.trim())) {
      dispatch(showToast({ message: 'Enter a valid phone number', severity: 'error' }));
      return;
    }
    try {
      const { data: response } = await api.post('/emergency-contacts', contactForm);
      setContacts([...contacts, response.data]);
      setContactForm({ name: '', phone: '', type: 'emergency' });
      dispatch(showToast({ message: 'Emergency contact added' }));
    } catch (err) {
      toastError(err, 'Contact could not be added');
    }
  };

  const removeContact = async (contact) => {
    try {
      await api.delete(`/emergency-contacts/${contact._id}`);
      setContacts(contacts.filter((item) => item._id !== contact._id));
      dispatch(showToast({ message: 'Emergency contact removed' }));
    } catch (err) {
      toastError(err, 'Contact could not be removed');
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active');

  return (
    <>
      <PageHeader
        eyebrow="Critical response"
        title={isResident ? 'SOS & emergency help' : 'Emergency command'}
        description={isResident
          ? 'Raise an SOS to alert security and admin instantly, or call a verified emergency contact.'
          : 'Respond to resident SOS alerts, broadcast urgent notices and manage verified emergency contacts.'}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          {isResident && (
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-rose-800 p-7 text-white shadow-xl">
              <Siren size={38} />
              <h2 className="mt-5 font-display text-3xl font-extrabold">Raise an SOS</h2>
              <p className="mt-2 text-red-100">Security and admin see your name, apartment and phone number straight away.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {sosCategories.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setSosForm({ ...sosForm, category: value })}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${sosForm.category === value ? 'bg-white text-red-600' : 'bg-white/15 text-white hover:bg-white/25'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 p-4 outline-none placeholder:text-red-200"
                rows="3"
                maxLength={500}
                placeholder="Describe what's happening (optional)"
                value={sosForm.message}
                onChange={(event) => setSosForm({ ...sosForm, message: event.target.value })}
              />
              {confirmSos ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={sendSos} className="rounded-2xl bg-white px-6 py-3 font-bold text-red-600">Yes, send SOS now</button>
                  <button type="button" onClick={() => setConfirmSos(false)} className="rounded-2xl border border-white/40 px-6 py-3 font-bold">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmSos(true)} className="mt-4 rounded-2xl bg-white px-6 py-3 font-bold text-red-600">Send SOS</button>
              )}
            </section>
          )}

          {canBroadcast && (
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-rose-800 p-7 text-white shadow-xl">
              <Siren size={38} />
              <h2 className="mt-5 font-display text-3xl font-extrabold">Broadcast emergency alert</h2>
              <p className="mt-2 text-red-100">This immediately notifies residents, security, staff and administration.</p>
              <textarea className="mt-6 w-full rounded-2xl border border-white/20 bg-white/10 p-4 outline-none placeholder:text-red-200" rows="4" value={broadcast} onChange={(event) => setBroadcast(event.target.value)} />
              <button type="button" onClick={sendBroadcast} className="mt-4 rounded-2xl bg-white px-6 py-3 font-bold text-red-600">Send community-wide alert</button>
            </section>
          )}

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">{isResident ? 'My SOS history' : `SOS alerts${activeAlerts.length ? ` (${activeAlerts.length} active)` : ''}`}</h2>
            </div>
            <div className="mt-5 space-y-3">
              {alerts.map((alert) => (
                <div key={alert._id} className={`rounded-2xl border p-4 ${alert.status === 'active' ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20' : 'border-slate-100 dark:border-slate-800'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold capitalize">{alert.category} emergency{!isResident && alert.user?.name ? ` - ${alert.user.name}` : ''}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(alert.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        {alert.unit && ` - ${unitLabel(alert.unit)}`}
                        {!isResident && alert.phone && ` - ${alert.phone}`}
                      </div>
                      {alert.message && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{alert.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={alert.status} />
                      {!isResident && alert.phone && <a href={`tel:${alert.phone}`} className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30">Call</a>}
                      {!isResident && alert.status === 'active' && (
                        <button type="button" onClick={() => resolve(alert)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><CheckCircle2 size={14} /> Resolve</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!alerts.length && <div className="text-sm text-slate-500">No SOS alerts.</div>}
            </div>
          </section>
        </div>

        <section className="card h-fit p-6">
          <h2 className="section-title">Emergency contacts</h2>
          <div className="mt-5 space-y-3">
            {contacts.map((contact) => (
              <div key={contact._id || contact.name} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div>
                  <div className="font-bold">{contact.name}</div>
                  <div className="text-sm text-slate-400">{contact.phone}</div>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 font-bold text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"><Phone size={15} /> Call</a>
                  {isAdmin && contact._id && (
                    <button type="button" onClick={() => removeContact(contact)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" aria-label={`Remove ${contact.name}`}><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            ))}
            {!contacts.length && <div className="text-sm text-slate-500">No contacts yet.</div>}
          </div>

          {isAdmin && (
            <form onSubmit={addContact} className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-600">Add contact</h3>
              <input required className="field" placeholder="Name (e.g. Community medical room)" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              <input required className="field" inputMode="tel" maxLength={20} placeholder="Phone number" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })} />
              <button className="btn-primary w-full"><Plus size={17} /> Add emergency contact</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
