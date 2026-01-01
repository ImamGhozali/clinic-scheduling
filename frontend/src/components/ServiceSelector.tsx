import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAppStore } from '../store/appStore';
import { Stethoscope } from 'lucide-react';

export function ServiceSelector() {
  const { selectedService, setSelectedService, tenantId } = useAppStore();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', tenantId],
    queryFn: () => apiService.getServices(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Stethoscope className="w-5 h-5" />
          Select Service
        </h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Stethoscope className="w-5 h-5" />
        Select Service
      </h2>

      {services?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No services available
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {services?.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedService?.id === service.id
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{service.name}</div>
              {service.description && (
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {service.description}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {service.duration_min} min
                </span>
                {service.requires_device && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    Device required
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

