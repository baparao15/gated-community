import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { CalendarDays, Clock3, Plus, UsersRound } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList } from '../utils/apiData';

const facilityColors=['from-blue-600 to-indigo-700','from-emerald-600 to-teal-700','from-orange-500 to-rose-600'];
const getFacilityImage = (facility) => {
  if (facility?.images?.length) return facility.images[0];
  const name = facility?.name?.toLowerCase() || '';
  if (name.includes('badminton') || name.includes('court')) return '/facilities/badminton_court.jpg';
  if (name.includes('gym') || name.includes('fitness')) return '/facilities/gym.jpg';
  if (name.includes('pool') || name.includes('swim')) return '/facilities/pool.png';
  if (name.includes('clubhouse') || name.includes('hall')) return '/facilities/clubhousecall.jpg';
  const typeMap = {
    gym: '/facilities/gym.jpg',
    pool: '/facilities/pool.png',
    clubhouse: '/facilities/clubhousecall.jpg',
    'party-hall': '/facilities/clubhousecall.jpg',
    'tennis-court': '/facilities/badminton_court.jpg',
  };
  return typeMap[facility?.type] || null;
};
const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const timeLabel=(iso)=>new Date(iso).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});
const hourLabel=(hhmm)=>{const [h,m]=hhmm.split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);return d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});};

export default function BookingsPage(){
  const role=useSelector(s=>s.auth.user?.role);
  const {data:facilities,setData:setFacilities}=useApiData('/facilities',[]);
  const {data:bookingData,setData:setBookings}=useApiData(role==='Resident'?'/bookings/my':'/bookings',[]);
  const list=asList(facilities);
  const bookings=asList(bookingData);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState({date:todayStr(),attendees:2,purpose:''});
  const [slots,setSlots]=useState([]);
  const [slotsLoading,setSlotsLoading]=useState(false);
  const [chosenSlot,setChosenSlot]=useState(null);
  const [facilityOpen,setFacilityOpen]=useState(false);
  const [facilityForm,setFacilityForm]=useState({name:'',type:'clubhouse',description:'',capacity:'20',openStart:'06:00',openEnd:'22:00',amenities:''});
  const dispatch=useDispatch();
  const location=useLocation();
  const navigate=useNavigate();
  // Holds the time a voice booking asked for so the slot list can auto-select the
  // nearest open slot once it loads ({ time: null } means "just pick the first slot").
  const pendingVoiceRef=useRef(null);

  useEffect(()=>{
    if(!selected||!form.date){setSlots([]);return;}
    let active=true;
    setSlotsLoading(true);
    setChosenSlot(null);
    api.get(`/facilities/${selected._id}/availability`,{params:{date:form.date}})
      .then(({data})=>{
        if(!active)return;
        const open=data.data?.availableSlots||[];
        setSlots(open);
        const pending=pendingVoiceRef.current;
        if(pending&&open.length){
          const req=pending.time;
          let best=open[0];
          if(req){
            const reqMs=new Date(`${form.date}T00:00:00`).setHours(req.hour,req.minute,0,0);
            best=open.reduce((b,s)=>Math.abs(new Date(s.start)-reqMs)<Math.abs(new Date(b.start)-reqMs)?s:b,open[0]);
          }
          setChosenSlot(best);
        }
        pendingVoiceRef.current=null;
      })
      .catch(()=>{if(active){setSlots([]);pendingVoiceRef.current=null;}})
      .finally(()=>{if(active)setSlotsLoading(false);});
    return ()=>{active=false;};
  },[selected,form.date]);

  const openBooking=(f)=>{setSelected(f);setForm({date:todayStr(),attendees:2,purpose:''});};

  // Voice assistant deep-link: "book the gym at 6pm" lands here — find the facility,
  // open its dialog on the requested date and auto-select the nearest open slot.
  useEffect(()=>{
    const prefill=location.state?.voicePrefill;
    if(prefill?.type!=='facility-booking'||!list.length)return;
    navigate(location.pathname,{replace:true,state:null});
    const facility=list.find((f)=>f.type===prefill.facilityType);
    if(!facility){
      dispatch(showToast({message:`No ${prefill.facilityType.replace('-',' ')} facility is set up yet.`,severity:'error'}));
      return;
    }
    pendingVoiceRef.current={time:prefill.requestedTime||null};
    setSelected(facility);
    setForm({date:prefill.dateStr||todayStr(),attendees:2,purpose:'Reserved via voice assistant'});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[location.state,list.length]);

  const book=async(e)=>{
    e.preventDefault();
    if(!chosenSlot)return;
    const payload={facilityId:selected._id,slotStart:chosenSlot.start,slotEnd:chosenSlot.end,attendees:Number(form.attendees),purpose:form.purpose};
    try{
      const {data:r}=await api.post('/bookings',payload);
      setBookings([r.data,...bookings]);
      setSelected(null);
      dispatch(showToast({message:`Booked ${selected.name} for ${timeLabel(chosenSlot.start)}`}));
    }catch(err){
      dispatch(showToast({message:err.response?.data?.message||'Booking request failed',severity:'error'}));
    }
  };

  const approve=async(b,action)=>{try{const {data:r}=await api.patch(`/bookings/${b._id}/approve`,{action});setBookings(bookings.map(x=>x._id===b._id?{...x,...r.data}:x));dispatch(showToast({message:`Booking ${action==='approve'?'approved':'rejected'}`}));}catch(err){dispatch(showToast({message:err.response?.data?.message||'Booking could not be updated',severity:'error'}));}};

  const createFacility=async(e)=>{
    e.preventDefault();
    const payload={name:facilityForm.name,type:facilityForm.type,description:facilityForm.description,capacity:Number(facilityForm.capacity),openHours:[{start:facilityForm.openStart,end:facilityForm.openEnd}],amenities:facilityForm.amenities.split(',').map(x=>x.trim()).filter(Boolean)};
    try{const {data:r}=await api.post('/facilities',payload);setFacilities([r.data,...list]);setFacilityOpen(false);setFacilityForm({name:'',type:'clubhouse',description:'',capacity:'20',openStart:'06:00',openEnd:'22:00',amenities:''});dispatch(showToast({message:'Facility created'}));}catch(err){dispatch(showToast({message:err.response?.data?.message||'Facility could not be created',severity:'error'}));}
  };

  return <><PageHeader eyebrow="Community amenities" title={role==='Resident'?'Find your perfect slot':'Facility & booking management'} description="Discover community spaces, choose a time and keep every reservation organized." action={role!=='Resident'?<button onClick={()=>setFacilityOpen(true)} className="btn-primary"><Plus size={18}/> Add facility</button>:null}/>
    <div className="grid gap-5 lg:grid-cols-3">
      {list.map((f, i) => {
        const img = getFacilityImage(f);
        return (
          <article key={f._id} className="card overflow-hidden group">
            <div className="relative flex h-48 items-end overflow-hidden p-5 text-white">
              {img ? (
                <>
                  <img src={img} alt={f.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
                </>
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${facilityColors[i % 3]}`} />
              )}
              <div className="relative z-10">
                <div className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize backdrop-blur-md">
                  {f.type?.replace('-', ' ')}
                </div>
                <h2 className="font-display text-2xl font-extrabold drop-shadow">{f.name}</h2>
              </div>
            </div>
            <div className="p-5">
              <p className="min-h-10 text-sm text-slate-500 line-clamp-2">{f.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><UsersRound size={15} /> Capacity {f.capacity}</span>
                {(f.openHours || []).map((oh, idx) => (
                  <span key={idx} className="flex items-center gap-1"><Clock3 size={15} /> {hourLabel(oh.start)}–{hourLabel(oh.end)}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {f.amenities?.slice(0, 3).map((a) => (
                  <span key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">{a}</span>
                ))}
              </div>
              {role === 'Resident' && (
                <button onClick={() => openBooking(f)} className="btn-primary mt-5 w-full">
                  Book a slot
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
    <section className="card mt-7 overflow-hidden">
      <div className="p-5">
        <h2 className="section-title">{role === 'Resident' ? 'My booking history' : 'Booking requests'}</h2>
      </div>

      {/* Mobile card list (visible below md) */}
      <div className="md:hidden divide-y divide-earth-100 dark:divide-earth-800">
        {bookings.length === 0 && (
          <div className="px-5 pb-6 text-sm text-earth-500">No bookings yet.</div>
        )}
        {bookings.map((b) => (
          <div key={b._id} className="flex flex-col gap-2 px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-sm">{b.facility?.name || 'Community Facility'}</div>
              <StatusBadge value={b.status} />
            </div>
            <div className="text-xs text-earth-500">
              {new Date(b.slotStart).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            {b.purpose && <div className="text-xs text-earth-500">{b.purpose}</div>}
            {role !== 'Resident' && b.status === 'pending' && (
              <div className="flex gap-3 pt-1">
                <button onClick={() => approve(b, 'approve')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Approve</button>
                <button onClick={() => approve(b, 'reject')} className="text-xs font-bold text-red-500 dark:text-red-400">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table (visible md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400 dark:bg-slate-900">
            <tr>
              <th className="px-5 py-3">Facility</th>
              <th>Date &amp; time</th>
              <th>Purpose</th>
              <th>Status</th>
              {role !== 'Resident' && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4 font-bold">{b.facility?.name || 'Community Facility'}</td>
                <td>{new Date(b.slotStart).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td>{b.purpose || '—'}</td>
                <td><StatusBadge value={b.status} /></td>
                {role !== 'Resident' && (
                  <td className="space-x-3">
                    {b.status === 'pending' ? (
                      <>
                        <button onClick={() => approve(b, 'approve')} className="font-bold text-emerald-600 dark:text-emerald-400">Approve</button>
                        <button onClick={() => approve(b, 'reject')} className="font-bold text-red-500 dark:text-red-400">Reject</button>
                      </>
                    ) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <Dialog open={!!selected} onClose={()=>setSelected(null)} fullWidth maxWidth="sm">
      <DialogContent className="!p-7">
        <div className="eyebrow">Reserve your time</div>
        <h2 className="mt-2 font-display text-2xl font-extrabold">{selected?.name}</h2>
        <p className="mt-1 text-xs text-slate-400">Slots are {selected ? 40 : ''} minutes each, within operating hours.</p>
        <form onSubmit={book} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Date</span>
            <input required min={todayStr()} type="date" className="field" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          </label>
          <div>
            <span className="mb-2 block text-sm font-bold">Available slots</span>
            {slotsLoading && <div className="text-sm text-slate-400">Loading slots…</div>}
            {!slotsLoading && !slots.length && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">No slots left for this date — try another day.</div>}
            {!slotsLoading && !!slots.length && (
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                {slots.map((s)=> (
                  <button
                    type="button"
                    key={s.start}
                    onClick={()=>setChosenSlot(s)}
                    className={`rounded-xl border-2 px-2 py-2 text-xs font-bold transition ${chosenSlot?.start===s.start?'border-brand-600 bg-brand-50 text-brand-700':'border-earth-300 text-earth-600 hover:border-brand-300'}`}
                  >
                    {timeLabel(s.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-bold">Attendees</span><input type="number" min="1" className="field" value={form.attendees} onChange={e=>setForm({...form,attendees:e.target.value})}/></label>
            <label><span className="mb-2 block text-sm font-bold">Purpose</span><input className="field" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/></label>
          </div>
          <button disabled={!chosenSlot} className="btn-primary w-full disabled:opacity-40"><CalendarDays size={18}/> {chosenSlot?`Book ${timeLabel(chosenSlot.start)}–${timeLabel(chosenSlot.end)}`:'Pick a slot above'}</button>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={facilityOpen} onClose={()=>setFacilityOpen(false)} fullWidth maxWidth="sm"><DialogContent className="!p-7"><h2 className="font-display text-2xl font-extrabold">Add facility</h2><form onSubmit={createFacility} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Name</span><input required className="field" value={facilityForm.name} onChange={e=>setFacilityForm({...facilityForm,name:e.target.value})}/></label><label><span className="mb-2 block text-sm font-bold">Type</span><select className="field" value={facilityForm.type} onChange={e=>setFacilityForm({...facilityForm,type:e.target.value})}>{['gym','pool','clubhouse','tennis-court','playground','party-hall','conference-room','other'].map(x=><option key={x}>{x}</option>)}</select></label><label><span className="mb-2 block text-sm font-bold">Capacity</span><input required min="1" type="number" className="field" value={facilityForm.capacity} onChange={e=>setFacilityForm({...facilityForm,capacity:e.target.value})}/></label><label><span className="mb-2 block text-sm font-bold">Opens</span><input type="time" className="field" value={facilityForm.openStart} onChange={e=>setFacilityForm({...facilityForm,openStart:e.target.value})}/></label><label><span className="mb-2 block text-sm font-bold">Closes</span><input type="time" className="field" value={facilityForm.openEnd} onChange={e=>setFacilityForm({...facilityForm,openEnd:e.target.value})}/></label><p className="text-xs text-earth-500 sm:col-span-2">Need a second daily shift (like a gym open morning and evening)? Add it afterwards from the database, or ask to extend this form.</p><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Amenities</span><input className="field" placeholder="AC, Projector, Wi-Fi" value={facilityForm.amenities} onChange={e=>setFacilityForm({...facilityForm,amenities:e.target.value})}/></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Description</span><textarea required rows="3" className="field" value={facilityForm.description} onChange={e=>setFacilityForm({...facilityForm,description:e.target.value})}/></label><button className="btn-primary sm:col-span-2"><Plus size={18}/> Create facility</button></form></DialogContent></Dialog></>;
}
