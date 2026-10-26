import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { Camera, KeyRound, Mail, MapPin, Phone, Save, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { unitLabel } from '../utils/apiData';

export default function ProfilePage() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', apartment: '', emergencyName: '', emergencyPhone: '' });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const isResident = user?.role === 'Resident';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get(isResident ? '/residents/profile' : '/auth/me');
        if (!active) return;
        const next = data.data;
        setProfile(next);
        if (isResident) {
          setForm({
            name: next.user?.name || user?.name || '',
            email: next.user?.email || user?.email || '',
            phone: next.user?.phone || '',
            apartment: unitLabel(next.unit),
            emergencyName: next.emergencyContact?.name || '',
            emergencyPhone: next.emergencyContact?.phone || '',
          });
        } else {
          setForm({
            name: next.name || user?.name || '',
            email: next.email || user?.email || '',
            phone: next.phone || '',
            apartment: '',
            emergencyName: '',
            emergencyPhone: '',
          });
        }
      } catch {
        if (!active) return;
        setForm((current) => ({ ...current, name: user?.name || '', email: user?.email || '' }));
      }
    };
    load();
    return () => { active = false; };
  }, [isResident, user?.email, user?.name]);

  const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
  const cleanPhone = (value) => value.replace(/[^0-9+\-\s()]/g, '');

  const save = async (e) => {
    e.preventDefault();
    if (form.phone && !phoneRegex.test(form.phone.trim())) {
      dispatch(showToast({ message: 'Enter a valid phone number (digits only, 7–20 characters)', severity: 'error' }));
      return;
    }
    if (isResident && form.emergencyPhone && !phoneRegex.test(form.emergencyPhone.trim())) {
      dispatch(showToast({ message: 'Enter a valid emergency contact phone number', severity: 'error' }));
      return;
    }
    try {
      const { data } = await api.patch(isResident ? '/residents/profile' : '/auth/me', isResident ? { name: form.name, phone: form.phone, emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone, relation: 'Emergency contact' } } : { name: form.name, phone: form.phone });
      setProfile(data.data);
      dispatch(showToast({ message: 'Profile updated successfully' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Profile could not be updated', severity: 'error' }));
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      dispatch(showToast({ message: 'New passwords do not match', severity: 'error' }));
      return;
    }
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      dispatch(showToast({ message: 'Password changed successfully' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Password could not be changed', severity: 'error' }));
    }
  };

  const initials = (form.name || user?.name || 'User').split(' ').map((x) => x[0]).join('').slice(0, 2);
  const familyMembers = profile?.familyMembers || [];

  return <>
    <PageHeader eyebrow="Your account" title="Profile and household" description="Keep your personal, family and emergency information current." />
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
      <aside className="card p-6 text-center self-start">
        <div className="relative mx-auto h-28 w-28"><div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 font-display text-3xl font-extrabold text-white">{initials}</div><button className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-white text-brand-600 shadow-card"><Camera size={17} /></button></div>
        <h2 className="mt-5 font-display text-xl font-bold">{form.name}</h2>
        <div className="text-sm text-slate-400">{user?.role}</div>
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-left text-sm dark:border-slate-800"><div className="flex items-center gap-3"><MapPin size={17} className="text-brand-600" /> {form.apartment || 'No unit linked'}</div><div className="flex items-center gap-3"><Mail size={17} className="text-brand-600" /> {form.email}</div><div className="flex items-center gap-3"><Phone size={17} className="text-brand-600" /> {form.phone || 'No phone added'}</div></div>
        <button type="button" onClick={() => setPasswordOpen(true)} className="btn-secondary mt-6 w-full"><KeyRound size={17} /> Change password</button>
      </aside>
      <form onSubmit={save} className="space-y-6">
        <section className="card p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand-600"><UserRound size={19} /></div><h2 className="section-title">Personal information</h2></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{[['Full name', 'name', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'tel'], ...(isResident ? [['Apartment', 'apartment', 'text']] : [])].map(([label, key, type]) => <label key={key}><span className="mb-2 block text-sm font-bold">{label}</span><input type={type} className="field" value={form[key]} disabled={key === 'email' || key === 'apartment'} {...(key === 'phone' ? { inputMode: 'tel', maxLength: 20, placeholder: 'e.g. 9876543210' } : {})} onChange={(e) => setForm({ ...form, [key]: key === 'phone' ? cleanPhone(e.target.value) : e.target.value })} /></label>)}</div></section>
        {isResident && <section className="card p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><UsersRound size={19} /></div><h2 className="section-title">Family members</h2></div><div className="mt-5 space-y-3">{familyMembers.map((member) => <div key={`${member.name}-${member.relation}`} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 dark:border-slate-800"><div><div className="font-bold">{member.name}</div><div className="text-xs text-slate-400">{member.relation}</div></div><button type="button" className="text-sm font-bold text-brand-600 dark:text-brand-300 dark:hover:text-brand-200">Edit</button></div>)}{!familyMembers.length && <div className="text-sm text-slate-500">No family members added yet.</div>}<button type="button" className="text-sm font-bold text-brand-600 dark:text-brand-300 dark:hover:text-brand-200">+ Add family member</button></div></section>}
        {isResident && <section className="card p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600"><ShieldCheck size={19} /></div><h2 className="section-title">Emergency contact</h2></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">Contact name</span><input className="field" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Contact phone</span><input className="field" inputMode="tel" maxLength={20} value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: cleanPhone(e.target.value) })} /></label></div></section>}
        <button className="btn-primary"><Save size={18} /> Save profile changes</button>
      </form>
    </div>
    <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="sm">
      <DialogContent className="!p-7">
        <h2 className="font-display text-2xl font-extrabold">Change password</h2>
        <form onSubmit={changePassword} className="mt-6 space-y-4">
          <label><span className="mb-2 block text-sm font-bold">Current password</span><input required type="password" className="field" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label>
          <label><span className="mb-2 block text-sm font-bold">New password</span><input required minLength="8" type="password" className="field" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label>
          <label><span className="mb-2 block text-sm font-bold">Confirm new password</span><input required minLength="8" type="password" className="field" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>
          <button className="btn-primary w-full"><KeyRound size={18} /> Save new password</button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
