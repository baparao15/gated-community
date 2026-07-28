import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CheckCircle2, Sparkles, UsersRound } from 'lucide-react';
import Brand from '../components/Brand';

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-ink">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <Brand />
          <div className="flex items-center gap-2"><Link className="hidden px-4 py-2 font-bold text-brand-600 sm:block" to="/login">Sign in</Link><Link className="btn-primary !px-4 !py-2.5" to="/register">Join community</Link></div>
        </div>
      </header>

      <main>
        <section className="relative flex flex-col justify-center bg-gradient-to-b from-blue-50 via-white to-white pb-12 pt-28 lg:min-h-screen lg:items-center lg:pb-20 lg:pt-36">
          <div className="absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute right-[-8rem] top-48 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold text-brand-700 shadow-sm sm:text-sm"><Sparkles size={16} /> One community. Beautifully connected.</div>
              <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-[-.045em] sm:text-6xl lg:text-7xl">Everyday community life, <span className="text-brand-600">made effortless.</span></h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">Smart Community Management System brings residents, management, security and service teams together—so your community feels safer, smoother and genuinely more connected.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link className="btn-primary justify-center" to="/login">Explore your dashboard <ArrowRight size={18} /></Link><Link className="btn-secondary justify-center" to="/register">Create an account</Link></div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">{['Secure by design', 'Real-time updates', 'Mobile ready'].map(x => <span key={x} className="flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-500" />{x}</span>)}</div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-brand-300/30 to-emerald-200/30 blur-2xl" />
              <div className="relative rounded-[2rem] border border-white bg-white p-3 shadow-[0_35px_90px_rgba(37,99,235,.18)]">
                <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between"><Brand light /><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">All systems live</span></div>
                  <div className="mt-9"><div className="text-sm text-slate-400">Good morning</div><div className="mt-1 font-display text-2xl font-bold">Here is your community today.</div></div>
                  <div className="mt-6 grid grid-cols-2 gap-3">{[['₹2,500','Outstanding'],['02','Visitors today'],['01','Open request'],['03','Bookings']].map(([v,l],i)=><div key={l} className={`rounded-2xl p-4 ${i===0?'bg-brand-600':'bg-white/5'}`}><div className="font-display text-xl font-extrabold">{v}</div><div className="mt-1 text-xs text-slate-300">{l}</div></div>)}</div>
                  <div className="mt-5 rounded-2xl bg-white p-4 text-ink"><div className="flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-brand-600">Verified entry</div><div className="mt-1 font-bold">Secure visitor pass</div><div className="text-xs text-slate-400">QR and OTP gate access</div></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><BadgeCheck /></div></div></div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-8 hidden rounded-2xl bg-white p-4 shadow-xl sm:block"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><UsersRound /></div><div><div className="text-xs text-slate-400">Residents connected</div><div className="font-display text-xl font-extrabold">1,250+</div></div></div></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
