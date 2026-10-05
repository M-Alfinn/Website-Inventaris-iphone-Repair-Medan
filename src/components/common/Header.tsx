import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  ChevronDown, 
  Menu, 
  LogOut, 
  CheckCheck,
  Shield, 
  User as UserIcon, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import { isNotificationReadByUser } from '../../utils/notificationRules';

export const Header: React.FC = () => {
  const {
    currentUser,
    activeStore,
    activeStoreId,
    logout,
    sidebarOpen,
    setSidebarOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    hasUnreadNotifications,
    navigateTo,
    selectStore,
    currentPage,
  } = useApp();

  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotifs = () => {
    setNotifMenuOpen(!notifMenuOpen);
  };

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return notifications.filter((n) => !isNotificationReadByUser(n, currentUser.id)).length;
  }, [notifications, currentUser]);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'DASHBOARD_UTAMA':
        return 'Dashboard Utama';
      case 'DASHBOARD_TOKO':
        return activeStore ? `Dashboard ${activeStore.nama_toko}` : 'Dashboard Toko';
      case 'INVENTARIS':
        return 'Manajemen Inventaris';
      case 'KATEGORI':
        return 'Kategori Sparepart';
      case 'BARANG_MASUK':
        return currentUser?.role === 'KARYAWAN' ? 'Riwayat Barang Masuk' : 'Barang Masuk';
      case 'BARANG_KELUAR':
        return currentUser?.role === 'KARYAWAN' ? 'Riwayat Barang Keluar' : 'Barang Keluar';
      case 'BARANG_RUSAK':
        return 'Barang Rusak';
      case 'RETURN':
        return 'Klaim Return';
      case 'ABSENSI':
        return 'Absensi Karyawan';
      case 'KARYAWAN':
        return 'Data Karyawan';
      case 'TOKO':
        return activeStore ? `Profil ${activeStore.nama_toko}` : 'Manajemen Cabang Toko';
      case 'LAPORAN':
        return 'Laporan & Rekap';
      case 'ACTIVITY_LOG':
        return 'Log Aktivitas';
      case 'PENGATURAN':
        return 'Pengaturan';
      default:
        return 'Dashboard';
    }
  };

  const renderNotifIcon = (tipe: string) => {
    switch (tipe) {
      case 'DANGER':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header id="app-header" className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white border-b border-slate-200 shrink-0">
      {/* Left side: hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          id="btn-toggle-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sleek Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-slate-400 font-medium">Dashboard</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right side: Notifications, User Profile & Quick Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* NOTIFICATIONS BELL */}
        <div className="relative" ref={notifMenuRef}>
          <button
            id="notification-bell-btn"
            onClick={handleOpenNotifs}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Notifikasi"
            aria-label="Buka Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {hasUnreadNotifications && (
              <span
                id="notification-red-dot"
                className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white"></span>
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <>
              {/* Mobile Backdrop to close on tap outside */}
              <div
                className="fixed inset-0 z-40 sm:hidden"
                onClick={() => setNotifMenuOpen(false)}
              />
              <div
                id="notification-dropdown-panel"
                className="fixed top-16 right-3 sm:absolute sm:top-full sm:right-0 sm:mt-2 w-[calc(100vw-24px)] max-w-[300px] sm:max-w-none sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 sm:p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                {/* Header Dropdown - Bersih & Ringkas */}
                <div className="pb-2 mb-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-900">
                      Notifikasi
                    </h4>
                    {activeStoreId ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md truncate max-w-[120px]">
                        {activeStore?.nama_toko || 'Toko'}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                        Seluruh Toko
                      </span>
                    )}
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-md">
                        {unreadCount} Baru
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 rounded-md">
                        Semua Dibaca
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        id="btn-mark-all-read"
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Tandai Dibaca
                      </button>
                    )}
                    <button
                      onClick={() => setNotifMenuOpen(false)}
                      className="sm:hidden p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                      aria-label="Tutup Notifikasi"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notification List (Compact height for mobile) */}
                <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-1.5 pr-0.5 divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 px-3">
                      <div className="w-8 h-8 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-1.5">
                        <Bell className="w-4 h-4 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Tidak ada notifikasi</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {activeStoreId ? 'Semua aktivitas cabang ini terpantau normal.' : 'Semua aktivitas terpantau dengan baik.'}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isRead = isNotificationReadByUser(notif, currentUser?.id);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (currentUser?.role === 'SUPER_ADMIN' && !activeStoreId && notif.store_id) {
                              selectStore(notif.store_id);
                            }
                            if (notif.link_page) {
                              navigateTo(notif.link_page as any);
                            }
                            setNotifMenuOpen(false);
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition-all border ${
                            isRead
                              ? 'bg-white border-transparent opacity-75 hover:opacity-100 hover:bg-slate-50'
                              : 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50/70 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="shrink-0 mt-0.5">
                              {renderNotifIcon(notif.tipe)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {!activeStoreId && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                    {!notif.store_name || notif.store_name.toLowerCase() === 'global' || notif.store_name.toLowerCase() === 'semua cabang toko' ? 'Seluruh Toko' : notif.store_name}
                                  </span>
                                )}
                                <p className={`text-[11px] sm:text-xs leading-snug ${isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                                  {notif.judul}
                                </p>
                                {!isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                                )}
                              </div>

                              <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2 break-words">
                                {notif.pesan}
                              </p>

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[9px] font-mono text-slate-400">
                                  {notif.waktu}
                                </span>

                                {!activeStoreId && notif.store_id && (
                                  <span className="text-[9px] font-medium text-indigo-600 hover:underline">
                                    Buka Cabang &rarr;
                                  </span>
                                )}

                                {/* Personal Tag */}
                                {notif.target_user_id === currentUser?.id && (
                                  <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    Pribadi
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* USER PROFILE BUTTON */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="user-profile-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden border border-slate-200">
              {currentUser?.avatar || currentUser?.foto_profil ? (
                <img
                  src={currentUser.avatar || currentUser.foto_profil}
                  alt={currentUser.name || currentUser.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser?.name.substring(0, 2).toUpperCase() || 'U'
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[120px] leading-tight">
                {currentUser?.name || currentUser?.nama || 'User'}
              </p>
              <p className="text-[10px] text-slate-500">
                {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : currentUser?.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <>
              {/* Mobile backdrop */}
              <div
                className="fixed inset-0 z-40 sm:hidden"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                id="user-dropdown-menu"
                className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
              <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 mt-0.5">
                  {currentUser?.avatar || currentUser?.foto_profil ? (
                    <img
                      src={currentUser.avatar || currentUser.foto_profil}
                      alt={currentUser.name || currentUser.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser?.name.substring(0, 2).toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || currentUser?.nama}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                  {(currentUser?.position || currentUser?.status_peran_kerja) && (
                    <p className="text-[11px] font-semibold text-indigo-600 mt-0.5 truncate">
                      {currentUser.position || currentUser.status_peran_kerja}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  navigateTo('PENGATURAN');
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>Pengaturan Profil</span>
              </button>

              <button
                onClick={() => {
                  navigateTo('ABSENSI');
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Absensi & Presensi</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                id="btn-logout"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
            </>
          )}
        </div>

        {/* Quick Logout Button */}
        <button
          onClick={logout}
          className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
