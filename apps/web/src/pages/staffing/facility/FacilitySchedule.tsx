import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, MapPin, Briefcase, Info, Plus, Search
} from 'lucide-react';
import { shifts as shiftApi } from '@/lib/staffingApi';
import { Shift } from '@/types/staffing';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function FacilitySchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  useEffect(() => {
    async function loadShifts() {
      setLoading(true);
      try {
        const data = await shiftApi.getFacilityShifts();
        setShifts(data || []);
      } catch (err) {
        console.error('Failed to load facility shifts', err);
      } finally {
        setLoading(false);
      }
    }
    loadShifts();
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getShiftsForDay = (day: Date) => {
    return shifts.filter(s => isSameDay(new Date(s.start_time), day));
  };

  const selectedDayShifts = selectedDay ? getShiftsForDay(selectedDay) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shift Calendar</h2>
          <p className="text-gray-500 text-sm font-medium mt-0.5">Manage and track all facility staffing schedules.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="px-3 text-sm font-bold text-gray-900 min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg transition-all">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-5 py-2 bg-gray-900 text-white font-semibold rounded-full hover:bg-brand-600 transition-all active:scale-95 text-sm shadow-sm"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 px-4 pt-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 p-4 gap-2">
            {calendarDays.map((day, idx) => {
              const dayShifts = getShiftsForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    min-h-[100px] p-2.5 rounded-xl transition-all text-left flex flex-col gap-2 relative border
                    ${isSelected ? 'border-brand-500 bg-brand-50/20 ring-2 ring-brand-100' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}
                    ${!isCurrentMonth ? 'opacity-25 grayscale' : ''}
                  `}
                >
                  <span className={`
                    text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg
                    ${isToday ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-900'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {dayShifts.slice(0, 2).map((s, i) => (
                      <div key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white border border-gray-100 text-gray-600 truncate flex items-center gap-1">
                        <div className={`w-1 h-1 rounded-full ${s.status === 'open' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {s.role}
                      </div>
                    ))}
                    {dayShifts.length > 2 && (
                      <div className="text-[9px] font-bold text-brand-600 pl-1">
                        + {dayShifts.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-600" />
              {selectedDay ? format(selectedDay, 'MMM d, yyyy') : 'Select a date'}
            </h3>

            {selectedDayShifts.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 border border-gray-100">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No shifts scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayShifts.map((s, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 group hover:border-brand-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{s.role}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        s.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {format(new Date(s.start_time), 'h:mm a')} - {format(new Date(s.end_time), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="w-full mt-6 py-2.5 bg-brand-50 text-brand-600 font-semibold rounded-full hover:bg-brand-600 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-brand-100 text-sm active:scale-95">
              <Plus className="w-4 h-4" />
              Post Shift
            </button>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16" />
            <h4 className="text-base font-bold mb-2">Schedule Insights</h4>
            <p className="text-xs text-emerald-100 font-medium leading-relaxed mb-4 opacity-90">
              You have {shifts.filter(s => s.status === 'open').length} open shifts this month. Consider boosting them to reach more professionals.
            </p>
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center gap-3">
              <Info className="w-4 h-4 text-emerald-300" />
              <p className="text-[10px] font-bold">Matching rate: 85%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
