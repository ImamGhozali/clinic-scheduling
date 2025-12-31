import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAppStore } from '../store/appStore';
import { User, Stethoscope } from 'lucide-react';

export function DoctorList() {
  const { selectedDoctor, selectedService, setSelectedDoctor } = useAppStore();

  const { data: doctors, isLoading, error } = useQuery({
    queryKey: ['doctors', selectedService?.id],
    queryFn: () => apiService.getDoctors(selectedService?.id),
    enabled: !!selectedService, // Only fetch when a service is selected
  });

  if (!selectedService) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Select a Doctor
        </h2>
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a service first to see available doctors</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Select a Doctor
        </h2>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Select a Doctor
        </h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Failed to load doctors
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Stethoscope className="w-5 h-5" />
        Select a Doctor
      </h2>
      {doctors?.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No doctors available for this service</p>
        </div>
      ) : (
        <div className="space-y-2">
          {doctors?.map((doctor) => (
          <button
            key={doctor.id}
            onClick={() => setSelectedDoctor(doctor)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedDoctor?.id === doctor.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{doctor.name}</h3>
                {doctor.specialty && (
                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {doctor.slot_duration_minutes} min appointments
                </p>
              </div>
            </div>
          </button>
          ))}
        </div>
      )}
    </div>
  );
}

