import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, GraduationCap, HeartPulse, Search, Tractor, Truck, UsersRound } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import useApiData from '../../hooks/useApiData';
import { asList } from '../../utils/apiData';

const categories = [
  ['Healthcare', HeartPulse, 'bg-red-100 text-red-700'],
  ['Education', GraduationCap, 'bg-amber-100 text-amber-500'],
  ['Farming', Tractor, 'bg-mint-100 text-mint-600'],
  ['Transport', Truck, 'bg-brand-100 text-brand-600'],
];

export default function FacilitiesPage() {
  const navigate = useNavigate();
  const { data } = useApiData('/facilities', []);
  const facilities = asList(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch = !searchTerm ||
      (f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !activeCategory ||
      (f.type && f.type.toLowerCase().includes(activeCategory.toLowerCase())) ||
      (f.name && f.name.toLowerCase().includes(activeCategory.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <PageHeader
        eyebrow="Service directory"
        title="Community resources"
        description="Find shared amenities, support centers, booking rules and operating hours."
      />
      <section className="mb-6 overflow-hidden rounded-2xl bg-mint-100 p-6 text-mint-600 shadow-card">
        <h2 className="font-display text-2xl font-bold">Gram Seva Kendra</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-earth-700">Local resources and community services for residents, staff and security teams.</p>
      </section>
      <div className="relative mb-7 max-w-xl">
        <Search className="absolute left-4 top-3.5 text-brand-600" size={19} />
        <input
          className="search-input"
          style={{paddingLeft: '3rem'}}
          placeholder="Search healthcare, clubhouse, transport..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <section className="mb-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Categories</h2>
          <button
            onClick={() => { setActiveCategory(''); setSearchTerm(''); }}
            className="text-sm font-bold text-brand-600 hover:underline"
          >
            View all
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([label, Icon, tone]) => (
            <button
              key={label}
              onClick={() => setActiveCategory(activeCategory === label ? '' : label)}
              className={`card p-5 text-center transition active:scale-95 ${activeCategory === label ? 'ring-2 ring-brand-500' : ''}`}
            >
              <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${tone}`}><Icon size={24} /></div>
              <div className="mt-4 font-bold text-earth-900 dark:text-earth-50">{label}</div>
              <div className="mt-1 text-xs text-earth-500">Live services</div>
            </button>
          ))}
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredFacilities.length === 0 ? (
          <div className="col-span-full py-8 text-center text-earth-500">
            No community facilities found matching your criteria.
          </div>
        ) : (
          filteredFacilities.map((facility, index) => (
            <article key={facility._id || facility.name} className="card overflow-hidden">
              <div className={`h-36 ${index % 3 === 0 ? 'bg-gradient-to-br from-mint-600 to-mint-100' : index % 3 === 1 ? 'bg-gradient-to-br from-brand-600 to-brand-100' : 'bg-gradient-to-br from-amber-500 to-amber-100'}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-extrabold">{facility.name}</h2>
                    <p className="mt-1 text-sm leading-6 text-earth-700 dark:text-earth-200">{facility.description || 'Community facility for resident services.'}</p>
                  </div>
                  <StatusBadge value={facility.status || 'Available'} />
                </div>
                <div className="mt-5 grid gap-3 text-sm text-earth-700 dark:text-earth-200">
                  <div className="flex items-center gap-2"><UsersRound size={16} /> Capacity {facility.capacity || 20}</div>
                  <div className="flex items-center gap-2"><Clock size={16} /> {(facility.openHours?.length ? facility.openHours : [{ start: '06:00', end: '22:00' }]).map((oh) => `${oh.start}-${oh.end}`).join(', ')}</div>
                  <div className="flex items-center gap-2"><CalendarDays size={16} /> Advance booking supported</div>
                </div>
                <button
                  onClick={() => navigate('/app/bookings')}
                  className="btn-primary mt-5 w-full"
                >
                  Book facility
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}
