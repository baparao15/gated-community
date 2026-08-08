import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';
import Brand from '../components/Brand';
import GoogleButton from '../components/GoogleButton';
import panchayatMark from '../assets/brand/panchayat-mark.png';
import { login } from '../store/authSlice';
import api from '../services/api';

function AuthFrame({ children, title, subtitle, wide = false }) {
  return (
    <div className="grid min-h-screen bg-earth-50 lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden bg-earth-900 p-12 text-white lg:flex lg:flex-col">
        <img src={panchayatMark} alt="" aria-hidden="true" className="pointer-events-none absolute right-[-3rem] top-1/2 h-96 w-96 -translate-y-[60%] rounded-full opacity-[0.07] blur-[1px]" />
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
        <Brand light />
        <div className="relative my-auto max-w-xl">
          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-amber-100">A calmer way to run your community</div>
          <h1 className="font-display text-5xl font-extrabold leading-tight">Everything your community needs. Nothing it doesn’t.</h1>
          <p className="mt-5 text-lg leading-8 text-earth-300">Secure access, helpful updates, transparent services and simpler everyday living.</p>
          <div className="mt-10 grid grid-cols-2 gap-3">{[['Secure visitor passes','QR + OTP verification'],['Live service tracking','From request to resolution'],['Easy digital payments','Receipts always available'],['Community updates','Never miss what matters']].map(([a,b])=><div key={a} className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="mb-3 text-mint-100" size={20}/><div className="font-bold">{a}</div><div className="mt-1 text-xs text-earth-300">{b}</div></div>)}</div>
        </div>
        <div className="relative text-xs text-earth-500">Trusted community operations · Built for privacy</div>
      </div>
      <div className="flex items-center justify-center p-4 sm:p-10">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-earth-500 hover:text-brand-600 sm:mb-8"><ArrowLeft size={17}/> Back home</Link>
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-earth-900 p-5 text-white lg:hidden">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-600/25 blur-2xl" />
            <div className="relative flex items-center justify-between gap-3">
              <Brand light />
              <span className="inline-flex items-center gap-1 rounded-full bg-mint-100/15 px-3 py-1 text-xs font-bold text-mint-100"><ShieldCheck size={13} /> Secure</span>
            </div>
            <p className="relative mt-3 text-sm text-earth-300">A calmer way to run your community — safe, simple and connected.</p>
          </div>
          <div className="card p-6 sm:p-9">
            <h2 className="font-display text-3xl font-extrabold text-ink">{title}</h2>
            <p className="mt-2 text-earth-500">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'superadmin@gc.com' },
  { role: 'Admin', email: 'admin@gc.com' },
  { role: 'Resident', email: 'rahul@gc.com' },
  { role: 'Guard', email: 'guard@gc.com' },
  { role: 'Staff', email: 'staff@gc.com' },
];
const DEMO_PASSWORD = 'Test@1234';

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const submit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (result.meta.requestStatus === 'fulfilled') navigate('/app/dashboard');
  };
  const fillDemo = (email) => setForm({ email, password: DEMO_PASSWORD });
  return <AuthFrame title="Welcome back" subtitle="Sign in to your community workspace.">
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="block"><span className="mb-2 block text-sm font-bold">Email address</span><input className="field" type="email" required placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label className="block"><div className="mb-2 flex justify-between"><span className="text-sm font-bold">Password</span><Link to="/forgot-password" className="text-sm font-bold text-brand-600">Forgot password?</Link></div><div className="relative"><input className="field pr-12" type={show?'text':'password'} required placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" onClick={()=>setShow(!show)} className="absolute right-4 top-3.5 text-earth-500">{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error} New here? <Link to="/register" className="underline">Register</Link> instead.</div>}
      <label className="flex items-center gap-2 text-sm text-earth-500"><input type="checkbox" defaultChecked className="accent-brand-600"/> Remember me on this device</label>
      <button className="btn-primary w-full" disabled={loading}>{loading?<CircularProgress size={20} color="inherit"/>:<><LockKeyhole size={18}/> Sign in securely</>}</button>
    </form>
    <div className="mt-6 rounded-xl border border-earth-200 bg-earth-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-earth-500">Demo accounts</p>
      <p className="mt-1 text-xs text-earth-500">Click a role to autofill credentials (password: <span className="font-mono font-semibold">{DEMO_PASSWORD}</span>)</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_ACCOUNTS.map(({ role, email }) => (
          <button type="button" key={email} onClick={()=>fillDemo(email)} className="rounded-full border border-earth-200 bg-white px-3 py-1.5 text-xs font-bold text-earth-700 hover:border-brand-600 hover:text-brand-600">{role}</button>
        ))}
      </div>
    </div>
    <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-earth-400"><span className="h-px flex-1 bg-earth-200" />or<span className="h-px flex-1 bg-earth-200" /></div>
    <GoogleButton />
    <p className="mt-7 text-center text-sm text-earth-500">New to Panchayat? <Link to="/register" className="font-bold text-brand-600">Register your home</Link></p>
  </AuthFrame>;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [form,setForm]=useState({name:'',email:'',phone:'',unitNumber:'',password:'',confirm:''});
  const submit=async(e)=>{e.preventDefault(); if(form.password!==form.confirm){setMessage('Passwords do not match.');return;} try{await api.post('/auth/register',{name:form.name,email:form.email,phone:form.phone,password:form.password,...(form.unitNumber&&{unitNumber:form.unitNumber})});setMessage('Registration submitted. An admin will approve your account.');setTimeout(()=>navigate('/login'),1800);}catch(err){setMessage(err.response?.data?.message || 'Registration failed. Please try again.');}};
  return <AuthFrame wide title="Join your community" subtitle="Create your resident account. Admin approval may be required."><form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
    {[['Full name','name','text'],['Email','email','email'],['Phone','phone','tel'],['Apartment number','unitNumber','text'],['Password','password','password'],['Confirm password','confirm','password']].map(([label,key,type])=><label key={key} className="block"><span className="mb-2 block text-sm font-bold">{label}</span><input className="field" type={type} required={!['phone','unitNumber'].includes(key)} placeholder={key==='unitNumber'?'A1289':''} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
    {message&&<div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-brand-700">{message}</div>}<button className="btn-primary sm:col-span-2" type="submit">Create resident account</button></form>
    <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-earth-400"><span className="h-px flex-1 bg-earth-200" />or<span className="h-px flex-1 bg-earth-200" /></div>
    <GoogleButton />
    <p className="mt-7 text-center text-sm text-earth-500">Already registered? <Link to="/login" className="font-bold text-brand-600">Sign in</Link></p></AuthFrame>;
}
