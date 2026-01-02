import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { apiService } from '../services/api';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { Calendar, User, Mail, Phone, FileText, Clock } from 'lucide-react';

// Generate UUID v4 for idempotency key
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function BookingForm() {
  const { selectedService, selectedSlot } = useAppStore();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    notes: '',
  });

  // Generate idempotency key once per booking attempt
  // Ref ensures the same key is used for retries
  const idempotencyKeyRef = useRef<string>(generateUUID());

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => 
      apiService.createAppointment(data, idempotencyKeyRef.current),
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      setFormData({
        patient_name: '',
        patient_email: '',
        patient_phone: '',
        notes: '',
      });
      // Generate new idempotency key for next booking
      idempotencyKeyRef.current = generateUUID();
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      // Handle 409 Conflict errors gracefully
      if (error.response?.status === 409) {
        const conflicts = error.response?.data?.conflicts || [];
        
        if (conflicts.length > 0) {
          // Format conflict details for user-friendly display
          const conflict = conflicts[0]; // Show first conflict
          const startTime = formatInTimeZone(new Date(conflict.conflictingTime.starts_at), 'Europe/Berlin', 'p');
          const endTime = formatInTimeZone(new Date(conflict.conflictingTime.ends_at), 'Europe/Berlin', 'p');
          
          let conflictMessage = '';
          if (conflict.resource === 'doctor') {
            conflictMessage = `Doctor is already booked from ${startTime} to ${endTime}`;
          } else if (conflict.resource === 'room') {
            conflictMessage = `Room is occupied from ${startTime} to ${endTime}`;
          } else if (conflict.resource === 'device') {
            conflictMessage = `Required device is in use from ${startTime} to ${endTime}`;
          } else {
            conflictMessage = `Resource conflict from ${startTime} to ${endTime}`;
          }
          
          toast.error(
            `This time slot is no longer available. ${conflictMessage}. Please select another time slot.`,
            { duration: 6000 }
          );
          
          // Refresh availability to show updated slots
          queryClient.invalidateQueries({ queryKey: ['availability'] });
          return;
        }
        
        // Fallback for 409 without detailed conflicts
        toast.error('This time slot is no longer available. Please select another time slot.', {
          duration: 5000,
        });
        queryClient.invalidateQueries({ queryKey: ['availability'] });
        return;
      }
      
      // Generic error handling for non-409 errors
      const message = error.response?.data?.message || 'Failed to book appointment';
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }

    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    createAppointmentMutation.mutate({
      doctor_id: selectedSlot.doctor_id,
      service_id: selectedService.id,
      patient_name: formData.patient_name,
      patient_email: formData.patient_email || undefined,
      patient_phone: formData.patient_phone || undefined,
      starts_at: selectedSlot.start,
      // ends_at is calculated automatically by the backend based on service duration
      notes: formData.notes || undefined,
    });
  };

  if (!selectedSlot) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Book Appointment
      </h2>

      {/* Selected Appointment Details */}
      <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-primary-600" />
          <span className="font-medium text-primary-900">Doctor:</span>
          <span className="text-primary-700">{selectedSlot.doctor_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary-600" />
          <span className="font-medium text-primary-900">Time:</span>
          <span className="text-primary-700">
            {formatInTimeZone(new Date(selectedSlot.start), 'Europe/Berlin', 'PPpp')}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <User className="w-4 h-4" />
            Patient Name *
          </label>
          <input
            type="text"
            required
            value={formData.patient_name}
            onChange={(e) =>
              setFormData({ ...formData, patient_name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <input
            type="email"
            value={formData.patient_email}
            onChange={(e) =>
              setFormData({ ...formData, patient_email: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone
          </label>
          <input
            type="tel"
            value={formData.patient_phone}
            onChange={(e) =>
              setFormData({ ...formData, patient_phone: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Any additional information..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={createAppointmentMutation.isPending}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createAppointmentMutation.isPending ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
}

