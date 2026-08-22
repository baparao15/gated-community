import { useState } from 'react';
import { useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Banknote,
  CheckCircle2,
  Download,
  IndianRupee,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import api from '../services/api';
import { currency } from '../utils/apiData';

// Helper to ensure Razorpay SDK script is loaded
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PaymentModal({
  open,
  onClose,
  title = 'Complete Payment',
  subtitle = '',
  amount = 0,
  invoiceId = null,
  complaintId = null,
  invoiceNumber = '',
  isAdminCollecting = false,
  onSuccess,
  onProcessPayment,
  onDownloadReceipt,
}) {
  const user = useSelector((s) => s.auth.user);
  const [method, setMethod] = useState(isAdminCollecting ? 'cash' : 'razorpay');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [receiptResult, setReceiptResult] = useState(null);

  // Direct UPI Form State
  const [upiId, setUpiId] = useState(user?.email ? `${user.email.split('@')[0]}@okaxis` : 'resident@okaxis');

  // Cash / Admin form State
  const [cashNotes, setCashNotes] = useState('Paid in cash at management office');

  const handleClose = () => {
    if (processing) return;
    setSuccess(false);
    setReceiptResult(null);
    setErrorMessage('');
    onClose();
  };

  // STEP 2 & 3: Standard Razorpay Web Checkout Flow
  const handleRazorpayCheckout = async () => {
    setProcessing(true);
    setErrorMessage('');

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // STEP 1: Backend Create Order
      const { data: orderRes } = await api.post('/payments/razorpay/order', {
        amount: Number(amount),
        invoiceId: invoiceId || undefined,
        complaintId: complaintId || undefined,
        currency: 'INR',
      });

      const orderData = orderRes.data;
      if (!orderData?.order_id) {
        throw new Error('Invalid order response from payment server');
      }

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.key_id;

      // Ensure a valid 10-digit Indian phone number is passed so Razorpay displays UPI / QR options
      const prefillPhone = user?.phone && /^\d{10}$/.test(user.phone.replace(/\D/g, ''))
        ? user.phone.replace(/\D/g, '')
        : '9876543210';

      // STEP 2: Configure & Open Razorpay Standard Checkout Modal with explicit UPI enablement
      const options = {
        key: keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'Panchayat Community Hub',
        description: subtitle || title || 'Community Dues Payment',
        image: '/favicon-180.png',
        order_id: orderData.order_id,
        prefill: {
          name: user?.name || 'Resident',
          email: user?.email || 'resident@example.com',
          contact: prefillPhone,
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          qr: true,
        },
        theme: {
          color: '#943D28', // Brand warm terracotta
        },
        notes: {
          invoiceId: invoiceId || '',
          complaintId: complaintId || '',
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
        // STEP 3: Handle Payment Success -> Verify Signature on Backend
        handler: async function (response) {
          try {
            const { data: verifyRes } = await api.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: invoiceId || undefined,
              complaintId: complaintId || undefined,
              amount: Number(amount),
            });

            setReceiptResult(verifyRes.data);
            setSuccess(true);
            if (onSuccess) onSuccess(verifyRes.data);
          } catch (verifyErr) {
            console.error('Signature verification error:', verifyErr);
            setErrorMessage(
              verifyErr.response?.data?.message || 'Payment signature verification failed. Please contact support.'
            );
          } finally {
            setProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error);
        setErrorMessage(
          response.error?.description || response.error?.reason || 'Payment failed or was cancelled.'
        );
        setProcessing(false);
      });

      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Could not initiate payment. Please try again.');
      setProcessing(false);
    }
  };

  // Direct UPI / QR Instant Flow
  const handleDirectUpiPayment = async () => {
    setProcessing(true);
    setErrorMessage('');
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const payload = {
        method: 'upi',
        reference: `UPI-${Date.now()}`,
        notes: `Paid via UPI VPA (${upiId})`,
        amount: Number(amount),
      };

      let result = null;
      if (invoiceId) {
        const { data: response } = await api.post(`/invoices/${invoiceId}/pay`, payload);
        result = response.data;
      } else if (complaintId) {
        const { data: response } = await api.post(`/complaints/${complaintId}/quote/pay`, payload);
        result = response.data;
      } else if (onProcessPayment) {
        result = await onProcessPayment(payload);
      }

      setReceiptResult(result);
      setSuccess(true);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete UPI payment');
    } finally {
      setProcessing(false);
    }
  };

  // Admin Cash Flow
  const handleCashPayment = async () => {
    setProcessing(true);
    setErrorMessage('');
    try {
      const payload = {
        method: 'cash',
        reference: `CASH-${Date.now()}`,
        notes: cashNotes,
        amount: Number(amount),
      };

      let result = null;
      if (invoiceId) {
        const { data: response } = await api.post(`/invoices/${invoiceId}/pay`, payload);
        result = response.data;
      } else if (complaintId) {
        const { data: response } = await api.post(`/complaints/${complaintId}/quote/pay`, payload);
        result = response.data;
      } else if (onProcessPayment) {
        result = await onProcessPayment(payload);
      }

      setReceiptResult(result);
      setSuccess(true);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to record cash payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogContent className="!p-0 overflow-hidden">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-earth-900 via-earth-800 to-brand-900 p-6 text-white">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-1 text-white/80 hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200">
            <ShieldCheck size={16} /> Secure Payment Gateway
          </div>

          <h2 className="mt-2 font-display text-2xl font-extrabold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-earth-300">{subtitle}</p>}

          <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-white/10 p-4 backdrop-blur-md">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-earth-300">Amount to Pay</div>
              <div className="font-display text-3xl font-black text-white">{currency(amount)}</div>
            </div>
            {invoiceNumber && (
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-earth-300">Reference</div>
                <div className="font-mono text-sm font-bold text-amber-200">{invoiceNumber}</div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Success View */}
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">Payment Successful!</h3>
            <p className="mt-1 text-sm text-earth-500">
              {isAdminCollecting || method === 'cash'
                ? `Cash collection of ${currency(amount)} recorded successfully.`
                : `Your payment of ${currency(amount)} has been confirmed.`}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {onDownloadReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onDownloadReceipt(receiptResult);
                    handleClose();
                  }}
                  className="btn-primary flex items-center justify-center gap-2 !py-2.5"
                >
                  <Download size={16} /> Download Receipt (PDF)
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl border border-earth-300 bg-white px-6 py-2.5 text-sm font-bold text-earth-700 hover:bg-earth-50 dark:border-earth-700 dark:bg-earth-800 dark:text-earth-200"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Options Switcher */}
            <div className="mb-6 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('razorpay')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-bold transition ${
                  method === 'razorpay'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'border-earth-200 text-earth-600 hover:border-earth-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Smartphone size={18} />
                  <Sparkles size={14} className="text-amber-500" />
                </div>
                <span>Razorpay Gateway</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('upi-direct')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-bold transition ${
                  method === 'upi-direct'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'border-earth-200 text-earth-600 hover:border-earth-300'
                }`}
              >
                <QrCode size={18} />
                <span>UPI / QR Direct</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-bold transition ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-earth-200 text-earth-600 hover:border-earth-300'
                }`}
              >
                <Banknote size={18} />
                <span>Cash / Desk</span>
              </button>
            </div>

            {/* Tab 1: Razorpay Gateway */}
            {method === 'razorpay' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                      Standard Web Checkout
                    </span>
                    <span className="rounded bg-brand-700 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                      RAZORPAY
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-earth-600 dark:text-earth-300 leading-relaxed">
                    Opens the official Razorpay Checkout popup with all payment options:
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-lg bg-white px-2.5 py-1 text-earth-700 shadow-sm dark:bg-earth-800 dark:text-earth-200">
                      ⚡ GPay / PhonePe / Paytm / BHIM UPI
                    </span>
                    <span className="rounded-lg bg-white px-2.5 py-1 text-earth-700 shadow-sm dark:bg-earth-800 dark:text-earth-200">
                      💳 Credit &amp; Debit Cards (Visa / Mastercard / RuPay)
                    </span>
                    <span className="rounded-lg bg-white px-2.5 py-1 text-earth-700 shadow-sm dark:bg-earth-800 dark:text-earth-200">
                      🏦 50+ Net Banking Portals
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRazorpayCheckout}
                  disabled={processing}
                  className="btn-primary w-full !py-3.5 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-brand-700/20"
                >
                  {processing ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      <span>Opening Razorpay Checkout...</span>
                    </>
                  ) : (
                    <>
                      <IndianRupee size={18} />
                      <span>Pay {currency(amount)} with Razorpay</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: Direct UPI & QR */}
            {method === 'upi-direct' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-48 rounded-2xl border-2 border-brand-200 bg-white p-3 shadow-inner">
                  <div className="grid h-36 w-full place-items-center rounded-xl bg-earth-50 text-earth-700">
                    <div className="flex flex-col items-center gap-1">
                      <QrCode size={56} className="text-brand-700" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-earth-600">Scan with any UPI app</span>
                    </div>
                  </div>
                </div>

                <label className="block text-left">
                  <span className="mb-1 block text-xs font-bold text-earth-600">Your UPI ID (VPA)</span>
                  <input
                    className="field text-sm"
                    placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDirectUpiPayment}
                  disabled={processing}
                  className="btn-primary w-full !py-3.5 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-brand-700/20"
                >
                  {processing ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      <span>Processing UPI Payment...</span>
                    </>
                  ) : (
                    <>
                      <IndianRupee size={18} />
                      <span>Confirm &amp; Pay {currency(amount)} via UPI</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 3: Cash Desk Mode */}
            {method === 'cash' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <div className="font-bold">💵 Cash / Offline Desk Collection</div>
                  <div className="mt-1">
                    Record payment collected directly in cash at the management office. Immediately clears dues and issues a verified digital receipt.
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-earth-600">Collector Notes</span>
                  <textarea
                    className="field text-sm"
                    rows="2"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    placeholder="e.g., Received cash at desk"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleCashPayment}
                  disabled={processing}
                  className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-700 w-full flex items-center justify-center gap-2 transition"
                >
                  {processing ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      <span>Recording collection...</span>
                    </>
                  ) : (
                    <>
                      <Banknote size={18} />
                      <span>Record Cash Collection ({currency(amount)})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-earth-400">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Instant Verification · Test Mode Active</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
