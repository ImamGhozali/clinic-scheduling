import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiService } from '../services/api';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { Calendar, User, Mail, Phone, FileText, Clock } from 'lucide-react';

export function BookingForm() {
  const { selectedService, selectedSlot } = useAppStore();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    notes: '',
  });

  const createAppointmentMutation = useMutation({
    mutationFn: apiService.createAppointment.bind(apiService),
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      setFormData({
        patient_name: '',
        patient_email: '',
        patient_phone: '',
        notes: '',
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
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
      ends_at: selectedSlot.end,
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
            {format(new Date(selectedSlot.start), 'PPpp')}
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

