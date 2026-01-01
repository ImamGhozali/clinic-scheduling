import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { useAppStore } from './store/appStore';
import { useEffect } from 'react';
import { apiService } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  const tenantId = useAppStore((state) => state.tenantId);
  const setSelectedService = useAppStore((state) => state.setSelectedService);
  const setSelectedDoctor = useAppStore((state) => state.setSelectedDoctor);
  const setSelectedSlot = useAppStore((state) => state.setSelectedSlot);

  // Update API service when tenant changes and reset selections
  useEffect(() => {
    apiService.setTenant(tenantId);
    // Reset selections when tenant changes
    setSelectedService(null);
    setSelectedDoctor(null);
    setSelectedSlot(null);
  }, [tenantId, setSelectedService, setSelectedDoctor, setSelectedSlot]);

  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;

