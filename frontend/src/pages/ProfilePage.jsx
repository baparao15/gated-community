import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { Camera, KeyRound, Mail, MapPin, Phone, Plus, Save, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { updateUser } from '../store/authSlice';
import { unitLabel } from '../utils/apiData';

export default function ProfilePage() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', apartment: '', emergencyName: '', emergencyPhone: '' });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', relation: 'Spouse', age: '' });
  const [savingMember, setSavingMember] = useState(false);
  const isResident = user?.role === 'Resident';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get(isResident ? '/residents/profile' : '/auth/me');
        if (!active) return;
        const next = data.data;
        setProfile(next);
        const avatarUrl = isResident ? next.user?.avatar : next.avatar;
        if (avatarUrl) {
          dispatch(updateUser({ avatar: avatarUrl }));
        }
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

  const phoneRegex = /^[0-9]{7,15}$/;
  const cleanPhone = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 15);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(showToast({ message: 'Please select an image file (PNG, JPG, etc.)', severity: 'error' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      dispatch(showToast({ message: 'Image size must be less than 5MB', severity: 'error' }));
      return;
    }

    setAvatarUploading(true);
    try {
      let updatedUser = null;
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const { data } = await api.patch('/auth/me', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updatedUser = data.data;
      } catch {
        // Fallback: convert to Base64 data URL
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { data } = await api.patch('/auth/me', { avatar: base64 });
        updatedUser = data.data;
      }

      const newAvatar = updatedUser.avatar;
      setProfile((prev) => ({
        ...prev,
        avatar: newAvatar,
        user: { ...(prev?.user || {}), avatar: newAvatar },
      }));
      dispatch(updateUser({ avatar: newAvatar }));
      dispatch(showToast({ message: 'Profile photo updated successfully' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not upload photo', severity: 'error' }));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.phone && !phoneRegex.test(form.phone.trim())) {
      dispatch(showToast({ message: 'Enter a valid phone number (digits only, 7–15 digits)', severity: 'error' }));
      return;
    }
    if (isResident && form.emergencyPhone && !phoneRegex.test(form.emergencyPhone.trim())) {
      dispatch(showToast({ message: 'Enter a valid emergency contact phone number (digits only, 7–15 digits)', severity: 'error' }));
      return;
    }
    try {
      const { data } = await api.patch(
        isResident ? '/residents/profile' : '/auth/me',
        isResident
          ? {
              name: form.name,
              phone: form.phone,
              emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone, relation: 'Emergency contact' },
              familyMembers: profile?.familyMembers || [],
            }
          : { name: form.name, phone: form.phone }
      );
      setProfile(data.data);
      dispatch(updateUser({ name: form.name, phone: form.phone }));
      dispatch(showToast({ message: 'Profile updated successfully' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Profile could not be updated', severity: 'error' }));
    }
  };

  const openAddFamilyMember = () => {
    setEditingMemberIndex(null);
    setMemberForm({ name: '', relation: 'Spouse', age: '' });
    setFamilyModalOpen(true);
  };

  const openEditFamilyMember = (index) => {
    const member = profile?.familyMembers?.[index];
    if (!member) return;
    setEditingMemberIndex(index);
    setMemberForm({
      name: member.name || '',
      relation: member.relation || 'Spouse',
      age: member.age !== undefined && member.age !== null ? String(member.age) : '',
    });
    setFamilyModalOpen(true);
  };

  const saveFamilyMember = async (e) => {
    e.preventDefault();
    if (!memberForm.name.trim()) {
      dispatch(showToast({ message: 'Please enter family member name', severity: 'error' }));
      return;
    }

    const cleanMember = {
      name: memberForm.name.trim(),
      relation: memberForm.relation.trim() || 'Spouse',
      ...(memberForm.age !== '' ? { age: Number(memberForm.age) } : {}),
    };

    const currentList = profile?.familyMembers || [];
    let updatedList = [...currentList];
    if (editingMemberIndex !== null && editingMemberIndex >= 0) {
      updatedList[editingMemberIndex] = { ...updatedList[editingMemberIndex], ...cleanMember };
    } else {
      updatedList.push(cleanMember);
    }

    setSavingMember(true);
    try {
      const { data } = await api.patch('/residents/profile', { familyMembers: updatedList });
      setProfile(data.data);
      setFamilyModalOpen(false);
      dispatch(showToast({
        message: editingMemberIndex !== null ? 'Family member updated successfully' : 'Family member added successfully'
      }));
    } catch (err) {
      dispatch(showToast({
        message: err.response?.data?.message || 'Could not save family member',
        severity: 'error'
      }));
    } finally {
      setSavingMember(false);
    }
  };

  const deleteFamilyMember = async (index) => {
    const memberName = profile?.familyMembers?.[index]?.name || 'Family member';
    const updatedList = (profile?.familyMembers || []).filter((_, i) => i !== index);
    try {
      const { data } = await api.patch('/residents/profile', { familyMembers: updatedList });
      setProfile(data.data);
      setFamilyModalOpen(false);
      dispatch(showToast({ message: `${memberName} removed` }));
    } catch (err) {
      dispatch(showToast({
        message: err.response?.data?.message || 'Could not remove family member',
        severity: 'error'
      }));
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
  const currentAvatar = profile?.avatar || profile?.user?.avatar || user?.avatar;

  return <>
    <PageHeader eyebrow="Your account" title="Profile and household" description="Keep your personal, family and emergency information current." />
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
      <aside className="card p-6 text-center self-start">
        <div className="relative mx-auto h-28 w-28">
          <div className="grid h-full w-full overflow-hidden place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 font-display text-3xl font-extrabold text-white shadow-md">
            {currentAvatar ? (
              <img src={currentAvatar} alt={form.name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            title="Upload photo"
            aria-label="Upload photo"
            className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-white text-brand-600 shadow-card hover:bg-brand-50 transition active:scale-95 disabled:opacity-50 dark:bg-earth-800 dark:text-brand-300 dark:hover:bg-earth-700"
          >
            {avatarUploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            ) : (
              <Camera size={17} />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
        <h2 className="mt-5 font-display text-xl font-bold">{form.name}</h2>
        <div className="text-sm text-slate-400">{user?.role}</div>
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-left text-sm dark:border-slate-800"><div className="flex items-center gap-3"><MapPin size={17} className="text-brand-600" /> {form.apartment || 'No unit linked'}</div><div className="flex items-center gap-3"><Mail size={17} className="text-brand-600" /> {form.email}</div><div className="flex items-center gap-3"><Phone size={17} className="text-brand-600" /> {form.phone || 'No phone added'}</div></div>
        <button type="button" onClick={() => setPasswordOpen(true)} className="btn-secondary mt-6 w-full"><KeyRound size={17} /> Change password</button>
      </aside>
      <form onSubmit={save} className="space-y-6">
        <section className="card p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand-600"><UserRound size={19} /></div><h2 className="section-title">Personal information</h2></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{[['Full name', 'name', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'tel'], ...(isResident ? [['Apartment', 'apartment', 'text']] : [])].map(([label, key, type]) => <label key={key}><span className="mb-2 block text-sm font-bold">{label}</span><input type={type} className="field" value={form[key]} disabled={key === 'email' || key === 'apartment'} {...(key === 'phone' ? { inputMode: 'tel', maxLength: 20, placeholder: 'e.g. 9876543210' } : {})} onChange={(e) => setForm({ ...form, [key]: key === 'phone' ? cleanPhone(e.target.value) : e.target.value })} /></label>)}</div></section>
        
        {isResident && (
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <UsersRound size={19} />
                </div>
                <div>
                  <h2 className="section-title">Family members</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={openAddFamilyMember}
                className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
              >
                <Plus size={16} /> Add family member
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {familyMembers.map((member, index) => (
                <div key={member._id || `${member.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-earth-100 font-bold text-earth-700 dark:bg-earth-800 dark:text-earth-200">
                      {(member.name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-ink dark:text-earth-100">{member.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{member.relation}</span>
                        {member.age ? <span>· {member.age} yrs</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditFamilyMember(index)}
                      className="text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFamilyMember(index)}
                      className="text-slate-400 hover:text-red-500 transition p-1"
                      title="Remove member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {!familyMembers.length && (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-800">
                  No family members added yet.
                </div>
              )}
              <button
                type="button"
                onClick={openAddFamilyMember}
                className="text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
              >
                + Add family member
              </button>
            </div>
          </section>
        )}

        {isResident && <section className="card p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600"><ShieldCheck size={19} /></div><h2 className="section-title">Emergency contact</h2></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">Contact name</span><input className="field" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Contact phone</span><input className="field" inputMode="tel" maxLength={20} value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: cleanPhone(e.target.value) })} /></label></div></section>}
        <button className="btn-primary"><Save size={18} /> Save profile changes</button>
      </form>
    </div>

    {/* Family member edit / add dialog */}
    <Dialog open={familyModalOpen} onClose={() => setFamilyModalOpen(false)} fullWidth maxWidth="xs">
      <DialogContent className="!p-7">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{editingMemberIndex !== null ? 'Household' : 'New Member'}</div>
          <button
            type="button"
            onClick={() => setFamilyModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-ink dark:text-earth-100">
          {editingMemberIndex !== null ? 'Edit family member' : 'Add family member'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Update household member details for security and community records.
        </p>

        <form onSubmit={saveFamilyMember} className="mt-5 space-y-4">
          <label>
            <span className="mb-2 block text-sm font-bold">Full name</span>
            <input
              required
              className="field"
              placeholder="e.g. Sneha Sharma"
              value={memberForm.name}
              onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-2 block text-sm font-bold">Relation</span>
              <select
                className="field"
                value={memberForm.relation}
                onChange={(e) => setMemberForm({ ...memberForm, relation: e.target.value })}
              >
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Parent">Parent</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Age (optional)</span>
              <input
                type="number"
                min="0"
                max="120"
                className="field"
                placeholder="e.g. 32"
                value={memberForm.age}
                onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })}
              />
            </label>
          </div>

          <div className="pt-3 flex items-center justify-between gap-3">
            {editingMemberIndex !== null ? (
              <button
                type="button"
                onClick={() => deleteFamilyMember(editingMemberIndex)}
                className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
              >
                <Trash2 size={14} /> Remove
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFamilyModalOpen(false)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMember}
                className="btn-primary !py-2 !px-5 text-xs inline-flex items-center gap-1.5"
              >
                <Save size={15} /> {savingMember ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

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
