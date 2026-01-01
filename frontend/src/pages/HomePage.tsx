import { DoctorList } from '../components/DoctorList';
import { ServiceSelector } from '../components/ServiceSelector';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { BookingForm } from '../components/BookingForm';
import { useAppStore } from '../store/appStore';
import { Building2 } from 'lucide-react';

export function HomePage() {
  const { tenantId, setTenantId } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Clinic Scheduling
                </h1>
                <p className="text-sm text-gray-600">Multi-Tenant Appointment System</p>
              </div>
            </div>

            {/* Tenant Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Clinic:</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={1}>Downtown Clinic</option>
                <option value={2}>Westside Medical</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Service & Doctor Selection */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <ServiceSelector />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <DoctorList />
              </div>
            </div>
          </div>

          {/* Middle Column - Calendar & Availability */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <AvailabilityCalendar />
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <BookingForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Multi-Tenant Clinic Scheduling System</p>
            <p className="mt-1">
              Built with React, TypeScript, Express, and PostgreSQL
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

