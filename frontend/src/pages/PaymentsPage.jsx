import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { jsPDF } from 'jspdf';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {
  Banknote,
  CheckCircle2,
  CircleCheck,
  CreditCard,
  Download,
  FilePlus,
  HandCoins,
  IndianRupee,
  Plus,
  Receipt,
  Search,
  TrendingUp,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import PaymentModal from '../components/PaymentModal';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList, currency, monthLabel } from '../utils/apiData';

export default function PaymentsPage() {
  const role = useSelector((s) => s.auth.user?.role);
  const isAdmin = role === 'Admin' || role === 'SuperAdmin';
  const dispatch = useDispatch();

  // Invoices & Payouts data
  const { data: invoiceData, setData: setInvoices } = useApiData(isAdmin ? '/invoices' : '/invoices/my', []);
  const { data: usersData } = useApiData(isAdmin ? '/users' : null, []);
  const { data: unitsData } = useApiData(isAdmin ? '/units' : null, []);
  const { data: workerPayoutData, setData: setWorkerPayouts } = useApiData(isAdmin ? '/complaints/worker-payouts' : null, []);

  const invoices = asList(invoiceData);
  const users = asList(usersData).filter((u) => u.role === 'Resident');
  const units = asList(unitsData);
  const workerPayoutJobs = workerPayoutData?.jobs || [];
  const workerSummary = workerPayoutData?.summary || { totalCollectedByAdmin: 0, totalSettledToWorkers: 0, totalPendingToWorkers: 0 };

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'worker-payouts'
  const [search, setSearch] = useState('');

  // Payment Modal State
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [isAdminCashCollection, setIsAdminCashCollection] = useState(false);

  // Raise Invoice Form State
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    residentId: '',
    unitId: '',
    category: 'Rent',
    title: 'Monthly Rent',
    amount: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    tax: 0,
  });

  const pendingInvoices = invoices.filter((i) => !['paid', 'cancelled'].includes(i.status));
  const pending = pendingInvoices.reduce((sum, i) => sum + ((i.totalAmount || 0) - (i.paidAmount || 0)), 0);
  const paidThisYear = invoices
    .filter((i) => i.status === 'paid' && (i.period?.year || new Date(i.paidAt || 0).getFullYear()) === new Date().getFullYear())
    .reduce((sum, i) => sum + (i.paidAmount || i.totalAmount || 0), 0);
  const nextDue = [...pendingInvoices].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  const collectionRate = invoices.length
    ? Math.round((invoices.filter((i) => i.status === 'paid').length / invoices.length) * 1000) / 10
    : 0;

  const filteredInvoices = invoices.filter((i) => {
    const text = [
      i.invoiceNumber,
      i.resident?.name,
      i.resident?.email,
      i.unit?.unitNumber,
      i.notes,
      i.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return text.includes(search.toLowerCase());
  });

  // Open Payment Flow (Resident Online or Admin Cash)
  const openPay = (invoice, isCash = false) => {
    setPaymentTarget(invoice);
    setIsAdminCashCollection(isCash);
  };

  const handleProcessPayment = async (payload) => {
    if (!paymentTarget) return;
    const { data: response } = await api.post(`/invoices/${paymentTarget._id}/pay`, payload);
    const updated = response.data?.invoice || paymentTarget;
    setInvoices(invoices.map((i) => (i._id === paymentTarget._id ? updated : i)));
    dispatch(showToast({ message: payload.method === 'cash' ? 'Cash collection recorded successfully' : 'Payment completed successfully' }));
    return response.data;
  };

  const downloadReceipt = async (invoiceOrResult) => {
    const inv = invoiceOrResult?.invoice || invoiceOrResult;
    if (!inv) return;

    let receiptData = null;
    try {
      const { data: response } = await api.get(`/invoices/${inv._id}/receipt`);
      receiptData = response.data;
    } catch {}

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Smart Community Management System', 20, 25);
    doc.setFontSize(12);
    doc.text(`Receipt: ${receiptData?.receiptNumber || inv.invoiceNumber}`, 20, 42);
    doc.text(`Resident: ${inv.resident?.name || 'Resident'}`, 20, 52);
    doc.text(`Amount: INR ${inv.totalAmount}`, 20, 62);
    doc.text(`Status: ${inv.status?.toUpperCase()}`, 20, 72);
    doc.text(`Period: ${monthLabel(inv.period)}`, 20, 82);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 92);
    doc.text('Thank you for your payment.', 20, 112);
    doc.save(`${inv.invoiceNumber}-receipt.pdf`);
  };

  // Admin: Create custom invoice
  const handleRaiseInvoice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        residentId: raiseForm.residentId || undefined,
        unitId: raiseForm.unitId || undefined,
        title: `${raiseForm.category}: ${raiseForm.title}`,
        amount: Number(raiseForm.amount),
        dueDate: raiseForm.dueDate,
        notes: raiseForm.notes,
        tax: Number(raiseForm.tax || 0),
      };

      const { data: response } = await api.post('/invoices', payload);
      setInvoices([response.data, ...invoices]);
      setRaiseOpen(false);
      setRaiseForm({
        residentId: '',
        unitId: '',
        category: 'Rent',
        title: 'Monthly Rent',
        amount: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        tax: 0,
      });
      dispatch(showToast({ message: 'Payment invoice raised and sent to resident!' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not raise invoice', severity: 'error' }));
    }
  };

  // Admin: Settle worker payout
  const handleSettleWorker = async (job) => {
    try {
      const { data: response } = await api.post(`/complaints/${job._id}/quote/payout`);
      setWorkerPayouts({
        ...workerPayoutData,
        summary: {
          ...workerSummary,
          totalSettledToWorkers: workerSummary.totalSettledToWorkers + (job.quote?.amount || 0),
          totalPendingToWorkers: Math.max(0, workerSummary.totalPendingToWorkers - (job.quote?.amount || 0)),
        },
        jobs: workerPayoutJobs.map((j) => (j._id === job._id ? response.data : j)),
      });
      dispatch(showToast({ message: `Payout of ₹${job.quote?.amount} settled to ${job.assignedTo?.name || 'worker'}` }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not settle payout', severity: 'error' }));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? 'Community finance & collections' : 'Resident finance'}
        title={isAdmin ? 'Revenue, Dues & Worker Payouts' : 'Maintenance and payments'}
        description={
          isAdmin
            ? 'Raise rent and maintenance invoices, collect in cash, manage Razorpay/UPI payments and settle worker earnings.'
            : 'Track dues, pay securely via Razorpay/UPI, and keep every receipt close at hand.'
        }
        action={
          isAdmin ? (
            <button onClick={() => setRaiseOpen(true)} className="btn-primary !px-5 flex items-center gap-2">
              <FilePlus size={18} /> Raise Payment / Invoice
            </button>
          ) : null
        }
      />

      {/* Financial Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending dues" value={currency(pending)} icon={IndianRupee} color="orange" />
        <StatCard title="Collected this year" value={currency(paidThisYear)} icon={CircleCheck} color="green" />
        <StatCard
          title={isAdmin ? 'Collection rate' : 'Next due date'}
          value={isAdmin ? `${collectionRate}%` : nextDue ? new Date(nextDue.dueDate).toLocaleDateString('en-IN') : '-'}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Admin Tab Switcher */}
      {isAdmin && (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                activeTab === 'invoices'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-200'
              }`}
            >
              Invoices &amp; Collections ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('worker-payouts')}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${
                activeTab === 'worker-payouts'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-200'
              }`}
            >
              <Wrench size={16} />
              <span>Worker Payouts Desk</span>
              {workerSummary.totalPendingToWorkers > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                  {currency(workerSummary.totalPendingToWorkers)}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'invoices' && (
            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" />
              <input
                className="field !py-2 !pl-9 text-xs"
                placeholder="Search resident, invoice, unit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* Resident Next Due Hero Banner */}
      {!isAdmin && nextDue && (
        <section className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-blue-700 p-7 text-white shadow-xl shadow-brand-600/20">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-100">
                {nextDue.notes || `${monthLabel(nextDue.period)} maintenance`}
              </div>
              <div className="mt-1 font-display text-4xl font-extrabold">
                {currency((nextDue.totalAmount || 0) - (nextDue.paidAmount || 0))}
              </div>
              <div className="mt-2 text-xs text-blue-100">Due date: {new Date(nextDue.dueDate).toLocaleDateString('en-IN')}</div>
            </div>
            <button
              onClick={() => openPay(nextDue, false)}
              className="rounded-2xl bg-white px-6 py-3 font-bold text-brand-700 shadow-md hover:bg-blue-50 transition"
            >
              Pay now (Razorpay / UPI)
            </button>
          </div>
        </section>
      )}

      {/* Main Tab 1: Invoices List */}
      {(!isAdmin || activeTab === 'invoices') && (
        <section className="card mt-7 overflow-hidden">
          <div className="border-b border-earth-100 p-5 dark:border-earth-800">
            <h2 className="section-title">{isAdmin ? 'All Community Invoices & Rent Dues' : 'Payment History & Dues'}</h2>
          </div>

          {/* Mobile Invoices List (< md) */}
          <div className="md:hidden divide-y divide-earth-100 dark:divide-earth-800">
            {filteredInvoices.length === 0 && <div className="p-6 text-center text-sm text-earth-500">No invoices found.</div>}
            {filteredInvoices.map((inv) => {
              const isPaid = inv.status === 'paid';
              return (
                <div key={inv._id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-brand-700">{inv.invoiceNumber}</span>
                      <div className="font-bold text-sm text-ink dark:text-white">
                        {inv.notes || `${monthLabel(inv.period)} dues`}
                      </div>
                      {isAdmin && inv.resident && (
                        <div className="text-xs text-earth-500">
                          {inv.resident.name} {inv.unit ? `(${inv.unit.blockName}-${inv.unit.unitNumber})` : ''}
                        </div>
                      )}
                    </div>
                    <StatusBadge value={inv.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-earth-500">
                    <span>Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</span>
                    <span className="font-display text-base font-extrabold text-ink dark:text-white">
                      {currency(inv.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {isPaid ? (
                      <button
                        onClick={() => downloadReceipt(inv)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600"
                      >
                        <Download size={14} /> PDF Receipt
                      </button>
                    ) : (
                      <>
                        {!isAdmin && (
                          <button
                            onClick={() => openPay(inv, false)}
                            className="btn-primary !py-1.5 !px-3 text-xs"
                          >
                            Pay now
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => openPay(inv, true)}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                          >
                            <Banknote size={14} className="inline mr-1" /> Mark Paid in Cash
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-earth-50 text-xs uppercase text-earth-400 dark:bg-earth-900">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  {isAdmin && <th>Resident / Unit</th>}
                  <th>Purpose / Period</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="text-right px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-sm text-earth-500">
                      No invoices found.
                    </td>
                  </tr>
                )}
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  return (
                    <tr key={inv._id} className="border-t border-earth-100 dark:border-earth-800">
                      <td className="px-5 py-4 font-mono font-bold text-brand-700">{inv.invoiceNumber}</td>
                      {isAdmin && (
                        <td>
                          <div className="font-bold">{inv.resident?.name || 'Resident'}</div>
                          <div className="text-xs text-earth-400">
                            {inv.unit ? `${inv.unit.blockName}-${inv.unit.unitNumber}` : inv.resident?.email}
                          </div>
                        </td>
                      )}
                      <td>
                        <div className="font-semibold">{inv.notes || `${monthLabel(inv.period)} Maintenance`}</div>
                        <div className="text-xs text-earth-400">{monthLabel(inv.period)}</div>
                      </td>
                      <td className="font-display font-bold text-base">{currency(inv.totalAmount)}</td>
                      <td>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                      <td>
                        <StatusBadge value={inv.status} />
                      </td>
                      <td className="px-5 text-right space-x-2">
                        {isPaid ? (
                          <button
                            onClick={() => downloadReceipt(inv)}
                            className="inline-flex items-center gap-1 rounded-xl border border-earth-200 px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-earth-50"
                          >
                            <Download size={14} /> PDF Receipt
                          </button>
                        ) : (
                          <>
                            {!isAdmin && (
                              <button
                                onClick={() => openPay(inv, false)}
                                className="btn-primary !py-1.5 !px-3 text-xs"
                              >
                                Pay now
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => openPay(inv, true)}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                              >
                                <Banknote size={14} className="inline mr-1" /> Mark Paid in Cash
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Main Tab 2: Admin Worker Payouts Desk */}
      {isAdmin && activeTab === 'worker-payouts' && (
        <section className="mt-7 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Collected by Admin"
              value={currency(workerSummary.totalCollectedByAdmin)}
              icon={Receipt}
              color="green"
            />
            <StatCard
              title="Settled to Workers"
              value={currency(workerSummary.totalSettledToWorkers)}
              icon={UserCheck}
              color="blue"
            />
            <StatCard
              title="Pending to Settle"
              value={currency(workerSummary.totalPendingToWorkers)}
              icon={HandCoins}
              color="orange"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-earth-100 p-5 dark:border-earth-800">
              <h2 className="section-title">Completed Maintenance Jobs &amp; Worker Payouts</h2>
              <p className="mt-1 text-xs text-earth-500">
                When residents pay maintenance quotes, the money enters the admin pool. Settle worker dues in cash or bank transfer below.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-earth-50 text-xs uppercase text-earth-400 dark:bg-earth-900">
                  <tr>
                    <th className="px-5 py-3">Task # / Date</th>
                    <th>Worker / Staff</th>
                    <th>Resident / Location</th>
                    <th>Quote Amount</th>
                    <th>Resident Payment</th>
                    <th>Worker Payout</th>
                    <th className="text-right px-5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workerPayoutJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-sm text-earth-500">
                        No completed maintenance jobs with quotes yet.
                      </td>
                    </tr>
                  )}
                  {workerPayoutJobs.map((job) => {
                    const isSettled = job.quote?.workerPayoutStatus === 'paid_out';
                    const amount = job.quote?.amount || 0;
                    return (
                      <tr key={job._id} className="border-t border-earth-100 dark:border-earth-800">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-xs text-brand-700">
                            #{String(job._id).slice(-6)}
                          </div>
                          <div className="text-xs text-earth-400">
                            {new Date(job.quote?.paidAt || job.updatedAt).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td>
                          <div className="font-bold">{job.assignedTo?.name || 'Assigned Staff'}</div>
                          <div className="text-xs text-earth-400 capitalize">{job.category} Specialist</div>
                        </td>
                        <td>
                          <div className="font-medium">{job.raisedBy?.name || 'Resident'}</div>
                          <div className="text-xs text-earth-400">
                            {job.unit ? `${job.unit.blockName}-${job.unit.unitNumber}` : 'Community Area'}
                          </div>
                        </td>
                        <td className="font-display font-extrabold text-base">{currency(amount)}</td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={12} /> Received by Admin
                          </span>
                        </td>
                        <td>
                          {isSettled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                              <CheckCircle2 size={12} /> Settled / Paid Out
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              ⏳ Claimable by Worker
                            </span>
                          )}
                        </td>
                        <td className="px-5 text-right">
                          {isSettled ? (
                            <span className="text-xs text-earth-400 font-semibold">Settled</span>
                          ) : (
                            <button
                              onClick={() => handleSettleWorker(job)}
                              className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-brand-700 transition"
                            >
                              <HandCoins size={14} className="inline mr-1" /> Settle {currency(amount)}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Admin Modal: Raise Invoice / Rent */}
      <Dialog open={raiseOpen} onClose={() => setRaiseOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">Financial Desk</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Raise Payment / Rent Invoice</h2>
          <p className="mt-1 text-xs text-earth-500">
            Create an invoice for a specific resident or apartment. The resident will receive an instant notification and can pay via Razorpay, UPI, Cards or Cash.
          </p>

          <form onSubmit={handleRaiseInvoice} className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-earth-600">Category</span>
                <select
                  className="field text-sm"
                  value={raiseForm.category}
                  onChange={(e) => setRaiseForm({ ...raiseForm, category: e.target.value })}
                >
                  <option value="Rent">Monthly Rent</option>
                  <option value="Maintenance">Maintenance Dues</option>
                  <option value="Electricity & Water">Utility Charges</option>
                  <option value="Clubhouse / Amenities">Amenity Fee</option>
                  <option value="Parking">Parking Space Fee</option>
                  <option value="Custom Dues">Custom Assessment</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-earth-600">Select Resident</span>
                <select
                  required
                  className="field text-sm"
                  value={raiseForm.residentId}
                  onChange={(e) => setRaiseForm({ ...raiseForm, residentId: e.target.value })}
                >
                  <option value="">-- Choose Resident --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-earth-600">Apartment / Unit (Optional)</span>
                <select
                  className="field text-sm"
                  value={raiseForm.unitId}
                  onChange={(e) => setRaiseForm({ ...raiseForm, unitId: e.target.value })}
                >
                  <option value="">-- Choose Unit --</option>
                  {units.map((un) => (
                    <option key={un._id} value={un._id}>
                      {un.blockName}-{un.unitNumber}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-earth-600">Due Date</span>
                <input
                  required
                  type="date"
                  className="field text-sm"
                  value={raiseForm.dueDate}
                  onChange={(e) => setRaiseForm({ ...raiseForm, dueDate: e.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-earth-600">Amount (INR ₹)</span>
                <input
                  required
                  type="number"
                  min="1"
                  className="field text-sm font-bold"
                  placeholder="e.g. 15000"
                  value={raiseForm.amount}
                  onChange={(e) => setRaiseForm({ ...raiseForm, amount: e.target.value })}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-earth-600">Invoice Title / Description</span>
                <input
                  required
                  className="field text-sm"
                  placeholder="e.g., Rent for August 2026"
                  value={raiseForm.title}
                  onChange={(e) => setRaiseForm({ ...raiseForm, title: e.target.value })}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-earth-600">Notes / Instructions</span>
              <textarea
                className="field text-sm"
                rows="2"
                placeholder="e.g., Please pay before due date to avoid late charges."
                value={raiseForm.notes}
                onChange={(e) => setRaiseForm({ ...raiseForm, notes: e.target.value })}
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRaiseOpen(false)}
                className="rounded-2xl border border-earth-300 px-5 py-2.5 text-sm font-bold text-earth-700 hover:bg-earth-50"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary !px-6 flex items-center gap-2">
                <FilePlus size={16} /> Send Invoice to Resident
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Razorpay Standard Web Checkout & Cash Collection Modal */}
      <PaymentModal
        open={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        title={isAdminCashCollection ? 'Collect Cash at Desk' : 'Pay Community Dues'}
        subtitle={paymentTarget?.notes || `${monthLabel(paymentTarget?.period)} maintenance`}
        amount={(paymentTarget?.totalAmount || 0) - (paymentTarget?.paidAmount || 0)}
        invoiceId={paymentTarget?._id}
        invoiceNumber={paymentTarget?.invoiceNumber}
        isAdminCollecting={isAdminCashCollection}
        onSuccess={(result) => {
          const updated = result?.invoice || { ...paymentTarget, status: 'paid', paidAt: new Date() };
          setInvoices(invoices.map((i) => (i._id === paymentTarget?._id ? updated : i)));
        }}
        onProcessPayment={handleProcessPayment}
        onDownloadReceipt={downloadReceipt}
      />
    </>
  );
}
