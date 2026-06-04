import { useState } from 'react';
import { Shift } from '@/types/staffing';
import { X, Loader2 } from 'lucide-react';
import { shifts as shiftApi } from '@/lib/staffingApi';

interface EditShiftModalProps {
  shift: Shift;
  onClose: () => void;
  onSuccess: (updatedShift: Shift) => void;
}

export default function EditShiftModal({ shift, onClose, onSuccess }: EditShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format the datetime-local value (YYYY-MM-DDThh:mm)
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    role: shift.role || 'RN',
    specialty: shift.specialty || '',
    description: shift.description || '',
    payRate: shift.pay_rate?.toString() || '0',
    durationHours: shift.duration_hours?.toString() || '0',
    startTime: formatDateTime(shift.start_time),
    location: shift.location || '',
    address: shift.address || '',
    city: shift.city || '',
    state: shift.state || '',
    zip: shift.zip || '',
    slotsTotal: shift.slots_total?.toString() || '1',
    instantBook: shift.instant_book ?? false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await shiftApi.update(shift.id, {
        ...formData,
        payRate: parseFloat(formData.payRate),
        durationHours: parseFloat(formData.durationHours),
        slotsTotal: parseInt(formData.slotsTotal, 10),
        startTime: new Date(formData.startTime).toISOString(),
      });
      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update shift');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative animate-scale-in">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Edit Shift</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="p-4 mb-6 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form id="edit-shift-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all">
                  <option value="RN">RN</option>
                  <option value="LPN/LVN">LPN/LVN</option>
                  <option value="CNA">CNA</option>
                  <option value="HHA">HHA</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Specialty (Optional)</label>
                <input type="text" name="specialty" value={formData.specialty} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Pay Rate ($/hr)</label>
                <input type="number" step="0.01" name="payRate" value={formData.payRate} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Duration (Hours)</label>
                <input type="number" step="0.5" name="durationHours" value={formData.durationHours} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Start Time</label>
                <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Total Slots (Workers needed)</label>
                <input type="number" name="slotsTotal" value={formData.slotsTotal} onChange={handleChange} min="1" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Facility Name / Floor / Department</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Street Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">ZIP</label>
                <input type="text" name="zip" value={formData.zip} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"></textarea>
            </div>

            {/* Instant Book toggle */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, instantBook: !prev.instantBook }))}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${formData.instantBook ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">⚡</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Instant Book</p>
                <p className="text-xs text-gray-500 leading-snug">Professionals book this shift instantly — no manual review.</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${formData.instantBook ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.instantBook ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="edit-shift-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
