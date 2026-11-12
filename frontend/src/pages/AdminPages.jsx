import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { jsPDF } from 'jspdf';
import { BarChart3, Building, Download, FileSpreadsheet, Plus, Search, ShieldAlert, UserPlus, UsersRound } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList } from '../utils/apiData';

const roles = ['Resident', 'Guard', 'Staff', 'Admin'];
const statuses = ['active', 'pending', 'suspended', 'deactivated'];

export function ResidentsPage() {
  const { data, setData } = useApiData('/users?limit=500', []);
  const users = asList(data);
  const dispatch = useDispatch();
  const [unitOpen, setUnitOpen] = useState(false);
  const [createdUnit, setCreatedUnit] = useState(null);
  const [residentOpen, setResidentOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [unitForm, setUnitForm] = useState({ blockName: '', unitNumber: '', floor: '', type: 'apartment', bedrooms: '', area: '', occupancyStatus: 'vacant' });
  const [residentForm, setResidentForm] = useState({ name: '', email: '', phone: '', role: 'Resident', status: 'active', unitNumber: '', password: 'password123' });
  const [manageForm, setManageForm] = useState({ role: 'Resident', status: 'active' });
  const visibleUsers = users.filter((user) => [user.name, user.email, user.phone, user.role, user.status].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()));

  const toastError = (err, fallback) => dispatch(showToast({ message: err.response?.data?.message || fallback, severity: 'error' }));

  const approve = async (user) => {
    try {
      const { data: response } = await api.patch(`/users/${user._id}/approve`);
      setData(users.map((item) => (item._id === user._id ? response.data : item)));
      dispatch(showToast({ message: `${user.name} approved` }));
    } catch (err) {
      toastError(err, 'User could not be approved');
    }
  };

  const createUnit = async (event) => {
    event.preventDefault();
    const payload = {
      ...unitForm,
      floor: unitForm.floor ? Number(unitForm.floor) : undefined,
      bedrooms: unitForm.bedrooms ? Number(unitForm.bedrooms) : undefined,
      area: unitForm.area ? Number(unitForm.area) : undefined,
    };
    try {
      const { data: response } = await api.post('/units', payload);
      setCreatedUnit(response.data);
      setUnitForm({ blockName: '', unitNumber: '', floor: '', type: 'apartment', bedrooms: '', area: '', occupancyStatus: 'vacant' });
      dispatch(showToast({ message: `Unit ${payload.unitNumber} created` }));
    } catch (err) {
      toastError(err, 'Unit could not be created');
    }
  };

  const createResident = async (event) => {
    event.preventDefault();
    try {
      const { data: response } = await api.post('/users', residentForm);
      setData([response.data, ...users]);
      setResidentOpen(false);
      setResidentForm({ name: '', email: '', phone: '', role: 'Resident', status: 'active', unitNumber: '', password: 'password123' });
      dispatch(showToast({ message: 'User created' }));
    } catch (err) {
      toastError(err, 'User could not be created');
    }
  };

  const openManage = (user) => {
    setSelected(user);
    setManageForm({ role: user.role, status: user.status });
  };

  const saveManage = async (event) => {
    event.preventDefault();
    if (!selected) return;
    try {
      let updated = selected;
      if (manageForm.status !== selected.status) {
        const { data: response } = await api.patch(`/users/${selected._id}/status`, { status: manageForm.status });
        updated = response.data;
      }
      if (manageForm.role !== selected.role) {
        const { data: response } = await api.patch(`/users/${selected._id}/role`, { role: manageForm.role });
        updated = response.data;
      }
      setData(users.map((item) => (item._id === selected._id ? updated : item)));
      setSelected(null);
      dispatch(showToast({ message: 'User updated' }));
    } catch (err) {
      toastError(err, 'User could not be updated');
    }
  };

  return <>
    <PageHeader
      eyebrow="People & homes"
      title="Residents and units"
      description="Manage registrations, resident access, staff roles and community inventory."
      action={<div className="flex gap-2"><button id="add-unit-btn" onClick={() => setUnitOpen(true)} className="btn-secondary"><Building size={18} /> Add unit</button><button id="add-resident-btn" onClick={() => setResidentOpen(true)} className="btn-primary"><UserPlus size={18} /> Add resident</button></div>}
    />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard title="Residents" value={users.filter((item) => item.role === 'Resident').length} icon={UsersRound} color="blue" />
      <StatCard title="Staff and security" value={users.filter((item) => ['Staff', 'Guard'].includes(item.role)).length} icon={Building} color="green" />
      <StatCard title="Pending approvals" value={users.filter((item) => item.status === 'pending').length} icon={ShieldAlert} color="orange" />
    </div>
    <section className="card mt-7 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
        <h2 className="section-title">Community directory</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="search-input !py-2 w-full sm:w-64" placeholder="Search people" />
        </div>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {visibleUsers.length === 0 && <div className="p-6 text-center text-sm text-slate-400">No users found.</div>}
        {visibleUsers.map((user) => (
          <div key={user._id} className="p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-sm text-ink dark:text-white">{user.name}</div>
                <div className="text-xs text-slate-500 break-all">{user.email}</div>
                {user.phone && <div className="text-xs text-slate-400">{user.phone}</div>}
              </div>
              <StatusBadge value={user.status} />
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Role: <span className="text-brand-600 dark:text-brand-400">{user.role}</span></span>
              <div className="flex items-center gap-2">
                {user.status === 'pending' && (
                  <button type="button" onClick={() => approve(user)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700">
                    <CheckCircle2 size={13} /> Approve
                  </button>
                )}
                <button type="button" onClick={() => openManage(user)} className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30">
                  Manage
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400 dark:bg-slate-900">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4 font-bold">{user.name}</td>
                <td>
                  {user.email}
                  <div className="text-xs text-slate-400">{user.phone}</div>
                </td>
                <td>{user.role}</td>
                <td><StatusBadge value={user.status} /></td>
                <td>
                  <div className="flex items-center gap-2">
                    {user.status === 'pending' && (
                      <button type="button" onClick={() => approve(user)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700">
                        <CheckCircle2 size={14} /> Approve
                      </button>
                    )}
                    <button type="button" onClick={() => openManage(user)} className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30">
                      Manage
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <Dialog open={unitOpen} onClose={() => { setUnitOpen(false); setCreatedUnit(null); }} fullWidth maxWidth="sm">
      <DialogContent className="!p-7">
        {createdUnit ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 size={52} className="text-emerald-500" />
            <h2 className="font-display text-2xl font-extrabold">Unit created!</h2>
            <p className="text-sm text-slate-500">The apartment has been added to the community inventory.</p>
            <div className="mt-2 w-full rounded-2xl bg-earth-50 p-5 text-left dark:bg-earth-800">
              <div className="mb-3 text-xs font-extrabold uppercase tracking-widest text-brand-600">Apartment details</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="block text-xs text-slate-400">Block</span><span className="font-bold">{createdUnit.blockName}</span></div>
                <div><span className="block text-xs text-slate-400">Apartment number</span><span className="font-bold text-brand-700">{createdUnit.unitNumber}</span></div>
                {createdUnit.floor != null && <div><span className="block text-xs text-slate-400">Floor</span><span className="font-bold">{createdUnit.floor}</span></div>}
                {createdUnit.type && <div><span className="block text-xs text-slate-400">Type</span><span className="font-bold capitalize">{createdUnit.type}</span></div>}
                {createdUnit.bedrooms != null && <div><span className="block text-xs text-slate-400">Bedrooms</span><span className="font-bold">{createdUnit.bedrooms}</span></div>}
                <div><span className="block text-xs text-slate-400">Status</span><span className="font-bold capitalize">{createdUnit.occupancyStatus}</span></div>
              </div>
            </div>
            <div className="mt-2 flex w-full gap-3">
              <button onClick={() => { setCreatedUnit(null); }} className="btn-secondary flex-1"><Plus size={17} /> Add another</button>
              <button onClick={() => { setUnitOpen(false); setCreatedUnit(null); }} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-extrabold">Add unit</h2>
            <form onSubmit={createUnit} className="mt-6 grid gap-4 sm:grid-cols-2">
              {[['Block', 'blockName'], ['Unit number', 'unitNumber'], ['Floor', 'floor'], ['Bedrooms', 'bedrooms'], ['Area (sq ft)', 'area']].map(([label, key]) => (
                <label key={key}>
                  <span className="mb-2 block text-sm font-bold">{label}</span>
                  <input required={['blockName', 'unitNumber'].includes(key)} className="field" value={unitForm[key]} onChange={(event) => setUnitForm({ ...unitForm, [key]: event.target.value })} />
                </label>
              ))}
              <label><span className="mb-2 block text-sm font-bold">Type</span><select className="field" value={unitForm.type} onChange={(event) => setUnitForm({ ...unitForm, type: event.target.value })}>{['apartment', 'villa', 'flat', 'studio'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Occupancy</span><select className="field" value={unitForm.occupancyStatus} onChange={(event) => setUnitForm({ ...unitForm, occupancyStatus: event.target.value })}>{['vacant', 'owner-occupied', 'tenant-occupied'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="btn-primary sm:col-span-2"><Plus size={18} /> Create unit</button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={residentOpen} onClose={() => setResidentOpen(false)} fullWidth maxWidth="sm"><DialogContent className="!p-7"><h2 className="font-display text-2xl font-extrabold">Add user</h2><form onSubmit={createResident} className="mt-6 grid gap-4 sm:grid-cols-2">{[['Full name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['Apartment number', 'unitNumber'], ['Temporary password', 'password']].map(([label, key]) => <label key={key} className={key === 'password' ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-bold">{label}</span><input required={['name', 'email', 'password'].includes(key)} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'phone' ? 10 : undefined} placeholder={key === 'phone' ? '9876543210' : ''} className="field" value={residentForm[key]} onChange={(event) => setResidentForm({ ...residentForm, [key]: key === 'phone' ? event.target.value.replace(/\D/g, '').slice(0, 10) : event.target.value })} /></label>)}<label><span className="mb-2 block text-sm font-bold">Role</span><select className="field" value={residentForm.role} onChange={(event) => setResidentForm({ ...residentForm, role: event.target.value })}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="mb-2 block text-sm font-bold">Status</span><select className="field" value={residentForm.status} onChange={(event) => setResidentForm({ ...residentForm, status: event.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><button className="btn-primary sm:col-span-2"><UserPlus size={18} /> Create user</button></form></DialogContent></Dialog>

    <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm"><DialogContent className="!p-7"><h2 className="font-display text-2xl font-extrabold">Manage user</h2><p className="mt-1 text-sm text-slate-500">{selected?.name} - {selected?.email}</p><form onSubmit={saveManage} className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">Role</span><select className="field" value={manageForm.role} onChange={(event) => setManageForm({ ...manageForm, role: event.target.value })}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="mb-2 block text-sm font-bold">Status</span><select className="field" value={manageForm.status} onChange={(event) => setManageForm({ ...manageForm, status: event.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><button className="btn-primary sm:col-span-2">Save changes</button></form></DialogContent></Dialog>
  </>;
}

export function ReportsPage() {
  const reports = [['Monthly financial summary', 'Collections, dues and payment methods', 'Finance'], ['Visitor movement report', 'Entries, exits and peak gate hours', 'Security'], ['Complaint performance', 'Resolution time, categories and ratings', 'Maintenance'], ['Facility utilization', 'Bookings, cancellations and popular slots', 'Facilities']];
  const download = (name) => { const doc = new jsPDF(); doc.setFontSize(22); doc.text('Smart Community Management System Report', 20, 25); doc.setFontSize(14); doc.text(name, 20, 42); doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 20, 52); doc.text('This export uses live API data when the backend is connected.', 20, 70); doc.save(`${name.toLowerCase().replaceAll(' ', '-')}.pdf`); };
  const downloadCsv = (name, text, type) => { const csv = `Report,Type,Description,Generated\n"${name}","${type}","${text}","${new Date().toLocaleString('en-IN')}"\n`; const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = `${name.toLowerCase().replaceAll(' ', '-')}.csv`; link.click(); URL.revokeObjectURL(url); };
  return <><PageHeader eyebrow="Insights & exports" title="Community reports" description="Generate operational summaries in PDF or Excel-compatible formats." /><div className="grid gap-5 md:grid-cols-2">{reports.map(([name, text, type]) => <article key={name} className="card p-6"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600"><BarChart3 /></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">{type}</span></div><h2 className="mt-5 font-display text-xl font-bold">{name}</h2><p className="mt-2 text-sm text-slate-500">{text}</p><div className="mt-6 flex gap-2"><button onClick={() => download(name)} className="btn-primary !px-4 !py-2 text-sm"><Download size={16} /> PDF</button><button onClick={() => downloadCsv(name, text, type)} className="btn-secondary !px-4 !py-2 text-sm"><FileSpreadsheet size={16} /> Excel</button></div></article>)}</div></>;
}
