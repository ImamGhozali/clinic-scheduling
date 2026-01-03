import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { apiService } from '../services/api';
import { useAppStore } from '../store/appStore';
import { Calendar, Clock } from 'lucide-react';

export function AvailabilityCalendar() {
  const { selectedDoctor, selectedService, selectedDate, selectedSlot, setSelectedDate, setSelectedSlot, tenantId, nextAvailableSlots, setNextAvailableSlots } = useAppStore();

  const { data: availability, isLoading } = useQuery({
    queryKey: ['availability', tenantId, selectedService?.id, selectedDoctor?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => {
      // Get the date in Europe/Berlin timezone to avoid local timezone issues
      // This ensures we search for the correct day regardless of user's timezone
      const timezone = 'Europe/Berlin';
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Parse date string AS IF it's in Berlin timezone, then convert to UTC
      // This prevents issues when user's browser is in a different timezone
      const startOfDay = zonedTimeToUtc(`${dateStr} 00:00:00`, timezone);
      const endOfDay = zonedTimeToUtc(`${dateStr} 23:59:59`, timezone);
      
      return apiService.getAvailability(
        selectedService!.id,
        startOfDay.toISOString(),
        endOfDay.toISOString(),
        selectedDoctor ? [selectedDoctor.id] : undefined
      );
    },
    enabled: !!selectedService,
  });

  if (!selectedService) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Please select a service to view availability</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5" />
          Select Date
        </h2>
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" />
          Available Time Slots
        </h3>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : availability?.slots.length === 0 && nextAvailableSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No available slots for this date
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {/* Show next available slots if they exist, otherwise show regular availability */}
            {(nextAvailableSlots.length > 0 ? nextAvailableSlots : availability?.slots || []).map((slot, index) => {
              // Display time in Europe/Berlin timezone
              const startTime = formatInTimeZone(new Date(slot.start), 'Europe/Berlin', 'HH:mm');

              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setNextAvailableSlots([]); // Clear next slots when user selects one
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSlot?.start === slot.start
                      ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  <div className="text-xs">{startTime}</div>
                  {!selectedDoctor && (
                    <div className="text-[10px] opacity-75 truncate">
                      {slot.doctor_name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm font-medium text-primary-900">
            Selected: {formatInTimeZone(new Date(selectedSlot.start), 'Europe/Berlin', 'PPpp')}
          </p>
        </div>
      )}
    </div>
  );
}

