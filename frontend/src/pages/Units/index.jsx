import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { Building2, Home, Plus } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { showToast } from '../../store/uiSlice';

const initialBlocks = [
  { block: 'A', total: 320, occupied: 298, vacant: 22 },
  { block: 'B', total: 280, occupied: 260, vacant: 20 },
  { block: 'C', total: 300, occupied: 282, vacant: 18 },
  { block: 'D', total: 350, occupied: 324, vacant: 26 },
];

export default function UnitsPage() {
  const dispatch = useDispatch();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    block: 'A',
    unitNumber: '',
    floor: '1',
    type: '3BHK',
    status: 'occupied',
  });

  const totalUnits = blocks.reduce((acc, b) => acc + b.total, 0);
  const totalOccupied = blocks.reduce((acc, b) => acc + b.occupied, 0);
  const totalVacant = blocks.reduce((acc, b) => acc + b.vacant, 0);

  const handleAddUnit = (e) => {
    e.preventDefault();
    if (!form.unitNumber) return;

    setBlocks(prev => prev.map(b => {
      if (b.block.toUpperCase() === form.block.toUpperCase()) {
        const isOccupied = form.status === 'occupied';
        return {
          ...b,
          total: b.total + 1,
          occupied: isOccupied ? b.occupied + 1 : b.occupied,
          vacant: isOccupied ? b.vacant : b.vacant + 1,
        };
      }
      return b;
    }));

    dispatch(showToast({ message: `Unit ${form.block}-${form.unitNumber} (${form.type}) added successfully` }));
    setDialogOpen(false);
    setForm({ block: 'A', unitNumber: '', floor: '1', type: '3BHK', status: 'occupied' });
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Units and apartments"
        description="Manage blocks, apartment numbers, occupancy, and resident assignment."
        action={
          <button
            id="admin-add-unit-btn"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 transition"
          >
            <Plus size={18} /> Add unit
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total units" value={totalUnits.toLocaleString()} icon={Building2} color="blue" />
        <StatCard title="Occupied" value={totalOccupied.toLocaleString()} icon={Home} color="green" />
        <StatCard title="Vacant" value={totalVacant.toLocaleString()} icon={Building2} color="orange" />
      </div>
      <section className="card mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400 dark:bg-slate-900">
            <tr><th className="px-5 py-4">Block</th><th>Total</th><th>Occupied</th><th>Vacant</th><th>Occupancy</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {blocks.map((unit) => (
              <tr key={unit.block}>
                <td className="px-5 py-4 font-bold">Block {unit.block}</td>
                <td>{unit.total}</td>
                <td>{unit.occupied}</td>
                <td>{unit.vacant}</td>
                <td className="font-bold text-emerald-600">{Math.round((unit.occupied / unit.total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Add Unit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogContent className="!p-6">
          <h2 className="font-display text-2xl font-bold">Add New Unit</h2>
          <p className="mt-1 text-xs text-earth-500">Register a new residential or commercial flat in the community.</p>
          <form onSubmit={handleAddUnit} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Block</span>
                <select
                  className="field"
                  value={form.block}
                  onChange={(e) => setForm({ ...form, block: e.target.value })}
                >
                  <option value="A">Block A</option>
                  <option value="B">Block B</option>
                  <option value="C">Block C</option>
                  <option value="D">Block D</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Unit Number</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 504"
                  className="field"
                  value={form.unitNumber}
                  onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Floor</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  required
                  className="field"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold">Configuration</span>
                <select
                  className="field"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="1BHK">1 BHK</option>
                  <option value="2BHK">2 BHK</option>
                  <option value="3BHK">3 BHK</option>
                  <option value="4BHK">4 BHK</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Villa">Villa</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold">Occupancy Status</span>
              <select
                className="field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="occupied">Occupied</option>
                <option value="vacant">Vacant</option>
              </select>
            </label>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border border-earth-200 px-4 py-2 text-sm font-semibold dark:border-earth-700"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Unit
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
