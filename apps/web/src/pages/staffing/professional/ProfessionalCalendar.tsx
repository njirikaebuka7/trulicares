import { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, CheckCircle,
  Phone
} from 'lucide-react';
import { bookings as bookingApi } from '@/lib/staffingApi';
import { ShiftBooking } from '@/types/staffing';

export default function ProfessionalCalendar() {
  const [bookings, setBookings] = useState<ShiftBooking[]>([]);
  const [, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await bookingApi.list();
        setBookings(data.bookings);
      } catch (err) {
        console.error('Failed to load bookings', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const numDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const getShiftsForDay = (day: number) => {
    return bookings.filter(b => {
      const d = new Date(b.start_time!);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const calendarDays = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/50 border-b border-r border-gray-100" />);
  }

  // Actual days
  for (let day = 1; day <= numDays; day++) {
    const dayShifts = getShiftsForDay(day);
    const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
    
    calendarDays.push(
      <div 
        key={day} 
        className={`h-32 border-b border-r border-gray-100 p-2 transition-colors hover:bg-blue-50/30 cursor-pointer ${isToday ? 'bg-blue-50/20' : 'bg-white'}`}
        onClick={() => dayShifts.length > 0 && setSelectedDay(day)}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={`text-sm font-bold ${isToday ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center' : 'text-gray-500'}`}>
            {day}
          </span>
          {dayShifts.length > 0 && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">
              {dayShifts.length} {dayShifts.length === 1 ? 'Shift' : 'Shifts'}
            </span>
          )}
        </div>
        
        <div className="space-y-1 overflow-hidden">
          {dayShifts.map((s, idx) => (
            <div 
              key={idx} 
              className={`px-2 py-1 rounded text-[10px] font-bold truncate border shadow-sm ${
                s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                s.status === 'paid' ? 'bg-blue-600 text-white border-blue-500' :
                'bg-amber-50 text-amber-700 border-amber-100'
              }`}
            >
              {new Date(s.start_time!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {s.shift_role}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedShifts = selectedDay ? getShiftsForDay(selectedDay) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{monthNames[month]} {year}</h2>
            <p className="text-gray-500 text-sm font-medium">Viewing your upcoming and past shifts</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all"
          >
            Today
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-100 px-4 pt-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/30 rounded-t-xl">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 p-4 gap-2">
          {calendarDays}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Shifts for {monthNames[month]} {selectedDay}, {year}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="w-6 h-6 rotate-90" />
            </button>
          </div>

          <div className="space-y-4">
            {selectedShifts.map((booking) => (
              <div key={booking.id} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-6">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-semibold">{booking.shift_role}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                        booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{booking.facility_name}</h4>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(booking.start_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {booking.location}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex-1 md:flex-none px-5 py-2 bg-white border border-gray-200 rounded-full text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <Phone className="w-4 h-4" /> Call Facility
                  </button>
                  {booking.status === 'paid' && (
                    <button className="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-full font-semibold text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-sm">
                      Check In
                    </button>
                  )}
                  {booking.status === 'completed' && (
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold px-4 py-2 bg-emerald-50 rounded-full text-sm">
                      <CheckCircle className="w-5 h-5" /> Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
