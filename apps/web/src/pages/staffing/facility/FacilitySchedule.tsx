import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight as ChevronRightIcon, Clock, MapPin, Briefcase } from 'lucide-react';
import { shifts as shiftApi } from '@/lib/staffingApi';
import { Shift } from '@/types/staffing';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';

export default function FacilitySchedule() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(new Date().getDate());

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

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  
  const prevMonth = () => { 
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } 
    else setCalMonth(m => m - 1); 
    setCalSelectedDay(null); 
  };
  
  const nextMonth = () => { 
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } 
    else setCalMonth(m => m + 1); 
    setCalSelectedDay(null); 
  };

  const sessionsByDay = new Map<number, Shift[]>();
  shifts.forEach((s: Shift) => {
    const d = new Date(s.start_time);
    if (!isNaN(d.getTime()) && d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      sessionsByDay.set(day, [...(sessionsByDay.get(day) || []), s]);
    }
  });

  const sessionDays = new Set(sessionsByDay.keys());
  const selectedSessions = calSelectedDay
    ? (sessionsByDay.get(calSelectedDay) || [])
    : shifts.filter((s: Shift) => {
        const d = new Date(s.start_time);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      });
      
  const today = new Date();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-900">Schedule</h2>
      
      {/* Month calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-gray-900">{monthNames[calMonth]} {calYear}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
            const hasSession = sessionDays.has(day);
            const isSelected = calSelectedDay === day;
            const daySessions = sessionsByDay.get(day) || [];
            const tooltipText = daySessions.map((s: Shift) => `${s.role} (${format(new Date(s.start_time), 'h:mm a')})`).join('\n');
            
            return (
              <button key={day} onClick={() => setCalSelectedDay(isSelected ? null : day)}
                title={hasSession ? tooltipText : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-sm font-medium transition-all',
                  isSelected ? 'bg-emerald-600 text-white' :
                  isToday ? 'bg-emerald-50 text-emerald-700 font-bold' :
                  hasSession ? 'hover:bg-emerald-50 text-gray-800' : 'hover:bg-gray-50 text-gray-500'
                )}>
                {day}
                {hasSession && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
        {calSelectedDay && (
          <p className="text-xs text-center text-emerald-600 font-medium mt-3">
            Showing shifts for {monthNames[calMonth]} {calSelectedDay} · <button onClick={() => setCalSelectedDay(null)} className="underline">Clear</button>
          </p>
        )}
      </div>

      {/* Session list */}
      {selectedSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{calSelectedDay ? 'No shifts on this day' : 'No upcoming shifts this month'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedSessions.map((session: Shift) => {
            const isCompleted = session.status === 'completed';
            const isFilled = session.status === 'filled';
            
            return (
              <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={cn('w-1.5 h-16 rounded-full shrink-0 hidden sm:block', 
                  isCompleted ? 'bg-teal-400' : isFilled ? 'bg-emerald-400' : 'bg-blue-400'
                )} />
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{session.role} Shift</p>
                  <p className="text-sm text-gray-500">{session.location}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {format(new Date(session.start_time), 'MMM d, yyyy')}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(session.start_time), 'h:mm a')}</span>
                    <span className="flex items-center gap-1 font-semibold text-gray-500">${session.pay_rate}/hr</span>
                  </div>
                </div>
                <div className="flex items-center justify-end shrink-0">
                  <span className={cn('text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider',
                    isCompleted ? 'bg-teal-100 text-teal-700' : 
                    isFilled ? 'bg-emerald-100 text-emerald-700' : 
                    'bg-blue-100 text-blue-700'
                  )}>
                    {session.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
