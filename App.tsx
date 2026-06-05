
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, Role } from './types';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './components/Login';
import { ChangePassword } from './components/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { Clinical } from './pages/Clinical';
import { Inventory } from './pages/Inventory';
// AI Pages removed for GAS compatibility
import { ScaffoldPage } from './pages/ScaffoldPage';
import { SurgeryStats } from './pages/SurgeryStats';
import { SurgeryApproval } from './pages/SurgeryApproval';
import { VipPatients } from './pages/VipPatients';
import { Research } from './pages/Research';
import { ScientificMeetings } from './pages/ScientificMeetings';
import { DailyBriefingPage } from './pages/DailyBriefing';
import { NewTechniquesPage } from './pages/NewTechniques';
import { CommunicationPage } from './pages/Communication';
import { FiveS } from './pages/FiveS';
import { Shifts } from './pages/Shifts';
import { AdminConfig } from './pages/AdminConfig';
import { AdminUsers } from './pages/AdminUsers';
import { StaffPerformance } from './pages/StaffPerformance';
import { ToastContainer } from './components/Toast';
import { clearSession, getSessionToken, logoutUser } from './services/dataService';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        userRole={user.role} 
      />
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Topbar 
          user={user} 
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
        />
        <main className="w-full grow p-4 sm:p-6 lg:p-8">
            {children}
        </main>
      </div>
    </div>
  );
};

const normalizeProtectedRole = (role: unknown) => {
    const value = String(role || '').trim().toUpperCase();
    if (value === 'ADMIN') return Role.CHIEF;
    return value as Role;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles: Role[], userRole: Role }> = ({ children, allowedRoles, userRole }) => {
    if (!allowedRoles.includes(normalizeProtectedRole(userRole))) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    const sessionToken = getSessionToken();
    if (storedUser && sessionToken) {
      setUser(JSON.parse(storedUser));
    } else if (storedUser && !sessionToken) {
      clearSession();
    }
    setLoading(false);

    const handleSessionExpired = () => setUser(null);
    window.addEventListener('app_session_expired', handleSessionExpired);
    return () => window.removeEventListener('app_session_expired', handleSessionExpired);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('app_user', JSON.stringify(u));
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handlePasswordChanged = () => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, mustChangePassword: false };
      localStorage.setItem('app_user', JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <HashRouter>
      <ToastContainer />
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : user.mustChangePassword === true || user.mustChangePassword === 'TRUE' || user.mustChangePassword === 'true' || user.mustChangePassword === '1' ? (
        <ChangePassword user={user} onChanged={handlePasswordChanged} onLogout={handleLogout} />
      ) : (
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* --- I. CHUYÊN MÔN --- */}
            <Route path="/clinical" element={<Clinical user={user} />} />
            
            <Route path="/surgery-approval" element={<SurgeryApproval userRole={user.role} />} />
            <Route path="/vip-patients" element={<VipPatients userRole={user.role} />} />
            <Route path="/surgery-stats" element={<SurgeryStats />} />

            {/* --- II. KHOA HỌC --- */}
            <Route path="/research" element={<Research userRole={user.role} />} />
            <Route path="/science-meetings" element={<ScientificMeetings userRole={user.role} />} />

            {/* --- III. HÀNH CHÍNH - ĐIỀU HÀNH --- */}
            <Route path="/daily-briefing" element={<DailyBriefingPage userRole={user.role} />} />
            <Route path="/staff-performance" element={<StaffPerformance currentUser={user} />} />
            <Route path="/new-techniques" element={<NewTechniquesPage userRole={user.role} />} />
            <Route path="/communication" element={<CommunicationPage userRole={user.role} />} />

            {/* --- IV. HÀNH CHÍNH & DƯỢC --- */}
            <Route path="/inventory" element={<Inventory userRole={user.role} />} />
            <Route path="/5s" element={<FiveS userRole={user.role} />} />

            {/* --- V. ĐIỀU DƯỠNG --- */}
            <Route path="/nursing-tasks" element={
               <ScaffoldPage title="Công tác điều dưỡng" moduleName="dieu_duong" userRole={user.role}
                columns={[
                    { key: 'date', label: 'Ngày', type: 'date' },
                    { key: 'shift', label: 'Ca trực', type: 'select', options: ['Sáng', 'Chiều', 'Đêm'] },
                    { key: 'task', label: 'Nội dung công việc', type: 'textarea' },
                    { key: 'status', label: 'Trạng thái', type: 'select', options: ['Chưa làm', 'Đang làm', 'Hoàn thành'], 
                      badgeColors: { 'Hoàn thành': 'bg-green-100 text-green-800', 'Chưa làm': 'bg-slate-100 text-slate-800', 'Đang làm': 'bg-blue-100 text-blue-800' }
                    }
                ]}
               />
            } />
             <Route path="/shifts" element={<Shifts userRole={user.role} />} />

             {/* --- VII. ADMIN (STRICT CHIEF ONLY) --- */}
             <Route path="/settings" element={
                 <ProtectedRoute allowedRoles={[Role.CHIEF]} userRole={user.role}>
                     <AdminConfig />
                 </ProtectedRoute>
             } />
             <Route path="/users" element={
                 <ProtectedRoute allowedRoles={[Role.CHIEF]} userRole={user.role}>
                     <AdminUsers currentUser={user} />
                 </ProtectedRoute>
             } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </HashRouter>
  );
};

export default App;
