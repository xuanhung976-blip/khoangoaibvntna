import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAccess } from './hooks/useAccess';
import { findNavItem } from './components/layout/nav';
import type { User } from './types';
import { clearSession, getCurrentUser, getSessionToken, logoutUser } from './services/dataService';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { LoginScreen } from './components/auth/LoginScreen';
import { ForcePasswordChange } from './components/auth/ForcePasswordChange';
import { ConfirmHost, Toaster } from './components/ui';
import { clearResourceCache } from './lib/resource';
import { toBool } from './lib/text';

const page = <T extends Record<string, React.ComponentType<any>>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(() => loader().then(module => ({ default: module[name] as React.ComponentType<any> })));

const DashboardPage = page(() => import('./features/dashboard/DashboardPage'), 'DashboardPage');
const PatientsPage = page(() => import('./features/patients/PatientsPage'), 'PatientsPage');
const SurgeryPage = page(() => import('./features/surgery/SurgeryPage'), 'SurgeryPage');
const SurgeryStatsPage = page(() => import('./features/surgery/SurgeryStatsPage'), 'SurgeryStatsPage');
const VipPage = page(() => import('./features/vip/VipPage'), 'VipPage');
const NursingPage = page(() => import('./features/nursing/NursingPage'), 'NursingPage');
const ShiftsPage = page(() => import('./features/shifts/ShiftsPage'), 'ShiftsPage');
const BriefingPage = page(() => import('./features/briefing/BriefingPage'), 'BriefingPage');
const StaffPage = page(() => import('./features/staff/StaffPage'), 'StaffPage');
const TechniquesPage = page(() => import('./features/techniques/TechniquesPage'), 'TechniquesPage');
const CommunicationPage = page(() => import('./features/communication/CommunicationPage'), 'CommunicationPage');
const ResearchPage = page(() => import('./features/research/ResearchPage'), 'ResearchPage');
const MeetingsPage = page(() => import('./features/meetings/MeetingsPage'), 'MeetingsPage');
const MedicalEnglishPage = page(() => import('./features/learning/MedicalEnglishPage'), 'MedicalEnglishPage');
const InventoryPage = page(() => import('./features/inventory/InventoryPage'), 'InventoryPage');
const FiveSPage = page(() => import('./features/fives/FiveSPage'), 'FiveSPage');
const UsersPage = page(() => import('./features/admin/UsersPage'), 'UsersPage');
const PermissionsPage = page(() => import('./features/admin/PermissionsPage'), 'PermissionsPage');
const ConfigPage = page(() => import('./features/admin/ConfigPage'), 'ConfigPage');
const AuditLogPage = page(() => import('./features/admin/AuditLogPage'), 'AuditLogPage');

const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted">
    <Loader2 className="h-5 w-5 animate-spin text-primary" /> Đang mở chức năng…
  </div>
);

const ChiefOnly: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { chief } = useApp();
  return chief ? children : <Navigate to="/" replace />;
};

/** Chặn mở module bằng đường dẫn khi ma trận phân quyền không cho xem. */
const ModuleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { can } = useAccess();
  const item = findNavItem(location.pathname);
  if (item?.module && !can(item.module)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <AppShell>
    <Suspense fallback={<PageFallback />}>
      <ModuleGuard>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clinical" element={<PatientsPage />} />
        <Route path="/surgery-approval" element={<SurgeryPage />} />
        <Route path="/vip-patients" element={<VipPage />} />
        <Route path="/surgery-stats" element={<SurgeryStatsPage />} />
        <Route path="/nursing-tasks" element={<NursingPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/daily-briefing" element={<BriefingPage />} />
        <Route path="/briefing" element={<Navigate to="/daily-briefing" replace />} />
        <Route path="/staff-performance" element={<StaffPage />} />
        <Route path="/new-techniques" element={<TechniquesPage />} />
        <Route path="/communication" element={<CommunicationPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/science-meetings" element={<MeetingsPage />} />
        <Route path="/medical-english" element={<MedicalEnglishPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/5s" element={<FiveSPage />} />
        <Route path="/users" element={<ChiefOnly><UsersPage /></ChiefOnly>} />
        <Route path="/permissions" element={<ChiefOnly><PermissionsPage /></ChiefOnly>} />
        <Route path="/settings" element={<ChiefOnly><ConfigPage /></ChiefOnly>} />
        <Route path="/audit-logs" element={<ChiefOnly><AuditLogPage /></ChiefOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ModuleGuard>
    </Suspense>
  </AppShell>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = getCurrentUser();
    if (stored && getSessionToken()) return stored;
    if (stored) clearSession();
    return null;
  });

  useEffect(() => {
    const onExpired = () => {
      clearResourceCache();
      setUser(null);
    };
    window.addEventListener('app_session_expired', onExpired);
    return () => window.removeEventListener('app_session_expired', onExpired);
  }, []);

  const handleLogin = (next: User) => {
    clearResourceCache();
    localStorage.setItem('app_user', JSON.stringify(next));
    setUser(next);
  };

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearResourceCache();
      setUser(null);
    }
  }, []);

  const handlePasswordChanged = () => {
    setUser(current => {
      if (!current) return current;
      const updated = { ...current, mustChangePassword: false };
      localStorage.setItem('app_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <HashRouter>
      <Toaster />
      <ConfirmHost />
      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : toBool(user.mustChangePassword) ? (
        <ForcePasswordChange user={user} onChanged={handlePasswordChanged} onLogout={handleLogout} />
      ) : (
        <AppProvider user={user} onLogout={handleLogout}>
          <AppRoutes />
        </AppProvider>
      )}
    </HashRouter>
  );
};

export default App;
