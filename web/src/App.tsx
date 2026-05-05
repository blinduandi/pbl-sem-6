import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import AlertsPage from './pages/AlertsPage';
import ThresholdsPage from './pages/ThresholdsPage';
import { connect as connectLiveBridge, disconnect as disconnectLiveBridge } from './lib/liveBridge';

export default function App(): JSX.Element {
  useEffect(() => {
    connectLiveBridge();
    return () => {
      disconnectLiveBridge();
    };
  }, []);

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:id" element={<DeviceDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/thresholds" element={<ThresholdsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
