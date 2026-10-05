import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Store as StoreIcon,
  Package,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertOctagon,
  RotateCcw,
  CalendarCheck,
  Users,
  BarChart3,
  History,
  Settings,
  Building2,
  X,
  ChevronRight,
  Boxes,
  ArrowLeft
} from 'lucide-react';
import { NavigationPage } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    currentPage,
    navigateTo,
    sidebarOpen,
    setSidebarOpen,
    activeStoreId,
    activeStore,
    selectStore,
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isKaryawan = currentUser?.role === 'KARYAWAN';

  // Sections when in Dashboard Utama (No store chosen):
  // Directly provides access to:
  // - Dashboard Utama
  // - Pilih Toko (opens Store Selection page in right content area)
  // - Absensi Karyawan (displays data for all stores)
  // - Data Karyawan (displays data for all stores)
  // - Laporan & Rekap (displays data for all stores)
  // - Activity Log (displays data for all stores)
  // - Manajemen Toko (displays data for all stores)
  // - Pengaturan
  const mainSections = [
    {
      title: 'Personalia & Presensi',
      items: [
        {
          id: 'ABSENSI' as NavigationPage,
          label: 'Absensi Karyawan',
          icon: <CalendarCheck className="w-4 h-4" />,
        },
        {
          id: 'KARYAWAN' as NavigationPage,
          label: 'Data Karyawan',
          icon: <Users className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Laporan & Sistem',
      items: [
        {
          id: 'LAPORAN' as NavigationPage,
          label: 'Laporan & Rekap',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: 'ACTIVITY_LOG' as NavigationPage,
          label: 'Log Aktivitas',
          icon: <History className="w-4 h-4" />,
        },
        {
          id: 'TOKO' as NavigationPage,
          label: 'Manajemen Toko',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          id: 'PENGATURAN' as NavigationPage,
          label: 'Pengaturan',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  // Sections when a specific Store (e.g. Toko A) is active:
  const storeSections = [
    {
      title: 'Inventaris & Sparepart',
      items: [
        {
          id: 'INVENTARIS' as NavigationPage,
          label: 'Manajemen Inventaris',
          icon: <Package className="w-4 h-4" />,
        },
        {
          id: 'KATEGORI' as NavigationPage,
          label: 'Kategori Sparepart',
          icon: <Tags className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Mutasi & Transaksi',
      items: [
        {
          id: 'BARANG_MASUK' as NavigationPage,
          label: isKaryawan ? 'Riwayat Barang Masuk' : 'Barang Masuk',
          icon: <ArrowDownToLine className="w-4 h-4" />,
        },
        {
          id: 'BARANG_KELUAR' as NavigationPage,
          label: isKaryawan ? 'Riwayat Barang Keluar' : 'Barang Keluar',
          icon: <ArrowUpFromLine className="w-4 h-4" />,
        },
        {
          id: 'BARANG_RUSAK' as NavigationPage,
          label: isKaryawan ? 'Riwayat Barang Rusak' : 'Barang Rusak',
          icon: <AlertOctagon className="w-4 h-4" />,
        },
        {
          id: 'RETURN' as NavigationPage,
          label: isKaryawan ? 'Riwayat Return' : 'Klaim Return',
          icon: <RotateCcw className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Personalia & Presensi',
      items: [
        {
          id: 'ABSENSI' as NavigationPage,
          label: 'Absensi Karyawan',
          icon: <CalendarCheck className="w-4 h-4" />,
        },
        ...(!isKaryawan
          ? [
              {
                id: 'KARYAWAN' as NavigationPage,
                label: 'Data Karyawan',
                icon: <Users className="w-4 h-4" />,
              },
            ]
          : []),
      ],
    },
    {
      title: 'Laporan & Informasi Cabang',
      items: [
        ...(!isKaryawan
          ? [
              {
                id: 'LAPORAN' as NavigationPage,
                label: 'Laporan & Rekap',
                icon: <BarChart3 className="w-4 h-4" />,
              },
            ]
          : []),
        {
          id: 'ACTIVITY_LOG' as NavigationPage,
          label: 'Log Aktivitas',
          icon: <History className="w-4 h-4" />,
        },
        {
          id: 'TOKO' as NavigationPage,
          label: `Profil ${activeStore?.nama_toko || 'Toko'}`,
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          id: 'PENGATURAN' as NavigationPage,
          label: 'Pengaturan',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  const handleLinkClick = (pageId: NavigationPage) => {
    navigateTo(pageId);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleBackToMainDashboard = () => {
    selectStore(null);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Content */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 ${
          sidebarOpen
            ? 'w-64 translate-x-0 opacity-100'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-none'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* ========================================================================= */}
            {/* [LOGO TOKO DARI FOLDER /public/images/logo.png]                           */}
            {/* ========================================================================= */}
            <div className="w-10 h-10 bg-white text-slate-950 rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0 overflow-hidden relative">
              <img
                src="/images/logo.png"
                alt="Logo Toko"
                className="w-full h-full object-contain scale-[1.3] transition-transform"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/logo.png';
                }}
              />
            </div>
            {/* ========================================================================= */}
            <div className="min-w-0">
              <span className="font-bold text-white tracking-tight text-xs block truncate font-mono">
                IPHONE REPAIR MEDAN
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium block truncate">
                SISTEM PENGELOLAAN INVENTARIS
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg lg:hidden shrink-0 cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {/* Top Level Nav Items */}
          <div className="space-y-1">
            {activeStoreId === null ? (
              /* Dashboard Utama Mode (Super Admin) */
              <>
                <button
                  id="sidebar-link-dashboard-utama"
                  onClick={() => handleLinkClick('DASHBOARD_UTAMA')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                    currentPage === 'DASHBOARD_UTAMA'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-blue-400" />
                    <span>Dashboard Utama</span>
                  </div>
                  {currentPage === 'DASHBOARD_UTAMA' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* Pilih Toko Button -> opens the store picker page in right content area */}
                {isSuperAdmin && (
                  <button
                    id="sidebar-link-pilih-toko"
                    onClick={() => handleLinkClick('PILIH_TOKO')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                      currentPage === 'PILIH_TOKO'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <StoreIcon className="w-4 h-4 text-emerald-400" />
                      <span>Pilih Toko</span>
                    </div>
                    {currentPage === 'PILIH_TOKO' && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                  </button>
                )}
              </>
            ) : (
              /* Specific Store Selected Mode (e.g. Toko A) */
              <>
                {/* Back to Dashboard Utama Button (for Super Admin) */}
                {isSuperAdmin && (
                  <button
                    id="sidebar-btn-back-to-main"
                    onClick={handleBackToMainDashboard}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-400 hover:text-white hover:bg-blue-600/20 border border-blue-500/30 transition-all cursor-pointer mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Kembali ke Dashboard Utama</span>
                  </button>
                )}

                <button
                  id="sidebar-link-dashboard-toko"
                  onClick={() => handleLinkClick('DASHBOARD_TOKO')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                    currentPage === 'DASHBOARD_TOKO'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StoreIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Dashboard {activeStore?.nama_toko || 'Toko'}</span>
                  </div>
                  {currentPage === 'DASHBOARD_TOKO' && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              </>
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-2" />

          {/* Sections List */}
          {(activeStoreId === null ? mainSections : storeSections).map((sec, secIdx) => (
            <div key={secIdx}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-3">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-link-${item.id.toLowerCase()}`}
                      onClick={() => handleLinkClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500 pl-2.5'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 p-2 bg-slate-800/50 rounded-xl border border-slate-700/40">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider shrink-0 overflow-hidden border border-slate-600">
              {currentUser?.avatar || currentUser?.foto_profil ? (
                <img
                  src={currentUser.avatar || currentUser.foto_profil}
                  alt={currentUser.nama || currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (currentUser?.nama || currentUser?.name || 'SA').substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {currentUser?.nama || currentUser?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser?.role === 'SUPER_ADMIN'
                  ? activeStoreId === null
                    ? 'Super Admin'
                    : `Super Admin (${activeStore?.nama_toko || 'Cabang'})`
                  : currentUser?.role === 'ADMIN_TOKO'
                  ? `Admin ${activeStore?.nama_toko || ''}`
                  : `Karyawan ${activeStore?.nama_toko || ''}`}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
