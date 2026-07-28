import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import Brand from '../../components/Brand';
import api from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      const token = data.data?.resetToken ? ` Demo reset token: ${data.data.resetToken}` : '';
      setMessage(`${data.message || 'Reset instructions generated.'}${token}`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Reset request could not be processed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8 dark:bg-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Brand />
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600">
          <ArrowLeft size={16} /> Back to login
        </Link>
      </div>
      <section className="mx-auto mt-16 max-w-lg rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70 dark:bg-slate-900 dark:shadow-black/20">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand-600">
          <MailCheck size={26} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink dark:text-white">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter your registered email or phone number. In production, this sends a secure reset link or OTP through the backend notification service.
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Email</span>
            <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-800 dark:bg-slate-950" placeholder="resident@example.com" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {message && <div className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-brand-700">{message}</div>}
          <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white shadow-lg shadow-brand-600/20" disabled={loading}>{loading ? 'Sending...' : 'Send reset instructions'}</button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">Demo mode does not send real messages.</p>
      </section>
    </div>
  );
}
