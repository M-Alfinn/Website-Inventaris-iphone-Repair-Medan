import React, { useRef, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/Toast';
import { FirstLoginPasswordModal } from './components/auth/FirstLoginPasswordModal';

// Code-split authenticated dashboard subpages for high-performance mobile initial load
const MainDashboard = lazy(() => import('./components/dashboard/MainDashboard').then((m) => ({ default: m.MainDashboard })));
const StoreDashboard = lazy(() => import('./components/dashboard/StoreDashboard').then((m) => ({ default: m.StoreDashboard })));
const InventoryPage = lazy(() => import('./components/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const CategoriesPage = lazy(() => import('./components/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const StockInPage = lazy(() => import('./components/transactions/StockInPage').then((m) => ({ default: m.StockInPage })));
const StockOutPage = lazy(() => import('./components/transactions/StockOutPage').then((m) => ({ default: m.StockOutPage })));
const DamagedItemsPage = lazy(() => import('./components/transactions/DamagedItemsPage').then((m) => ({ default: m.DamagedItemsPage })));
const ReturnsPage = lazy(() => import('./components/returns/ReturnsPage').then((m) => ({ default: m.ReturnsPage })));
const AttendancePage = lazy(() => import('./components/attendance/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const EmployeesPage = lazy(() => import('./components/employees/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const StoresPage = lazy(() => import('./components/stores/StoresPage').then((m) => ({ default: m.StoresPage })));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ActivityLogPage = lazy(() => import('./components/activity-log/ActivityLogPage').then((m) => ({ default: m.ActivityLogPage })));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const StoreSelectPage = lazy(() => import('./components/store-select/StoreSelectPage').then((m) => ({ default: m.StoreSelectPage })));

const AppContent: React.FC = () => {
  const { currentUser, currentPage, activeStoreId, setSidebarOpen } = useApp();
  const mainRef = useRef<HTMLElement>(null);

  // Automatically close sidebar/drawer and scroll back to top on login or page change
  useEffect(() => {
    setSidebarOpen(false);
    const scrollToTop = () => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
        mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    return () => cancelAnimationFrame(rafId);
  }, [currentPage, activeStoreId, currentUser?.id, setSidebarOpen]);

  // 1. If not authenticated, show Login Page
  if (!currentUser) {
    return (
      <main className="min-h-screen font-sans">
        <LoginPage />
        <ToastContainer />
      </main>
    );
  }

  // 2. Render Main App Layout with Sidebar + Header + Page Content
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'DASHBOARD_UTAMA':
        return <MainDashboard />;
      case 'PILIH_TOKO':
        return <StoreSelectPage />;
      case 'DASHBOARD_TOKO':
        return <StoreDashboard />;
      case 'INVENTARIS':
        return <InventoryPage />;
      case 'KATEGORI':
        return <CategoriesPage />;
      case 'BARANG_MASUK':
        return <StockInPage />;
      case 'BARANG_KELUAR':
        return <StockOutPage />;
      case 'BARANG_RUSAK':
        return <DamagedItemsPage />;
      case 'RETURN':
        return <ReturnsPage />;
      case 'ABSENSI':
        return <AttendancePage />;
      case 'KARYAWAN':
        return <EmployeesPage />;
      case 'TOKO':
        return <StoresPage />;
      case 'LAPORAN':
        return <ReportsPage />;
      case 'ACTIVITY_LOG':
        return <ActivityLogPage />;
      case 'PENGATURAN':
        return <SettingsPage />;
      default:
        return <StoreDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans text-slate-900 flex flex-col">
      {/* Top Header */}
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          key={`${currentPage}-${activeStoreId || 'global'}`}
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0"
        >
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center min-h-[360px] w-full gap-3">
                <div className="w-9 h-9 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Memuat halaman...</span>
              </div>
            }
          >
            {renderCurrentPage()}
          </Suspense>
        </main>
      </div>

      {/* Global Toast Notifications & Mandatory Password Change Modal */}
      <FirstLoginPasswordModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
