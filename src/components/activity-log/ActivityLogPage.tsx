import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Activity, 
  Search, 
  ShieldCheck, 
  Clock, 
  Filter, 
  History, 
  Store as StoreIcon, 
  UserCheck, 
  PackageCheck, 
  RotateCcw, 
  Trash2,
  CheckCircle2,
  ChevronDown,
  ArrowRightLeft,
  KeyRound
} from 'lucide-react';
import { isEssentialActivityLog } from '../../utils/activityLogRules';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ActivityLogPage: React.FC = () => {
  const { 
    activityLogs, 
    stores, 
    users,
    currentUser, 
    activeStore, 
    activeStoreId,
    deleteActivityLog
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState(activeStoreId || 'ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Confirmation modal state for individual deletion
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedStore(activeStoreId || 'ALL');
  }, [activeStoreId]);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminToko = currentUser?.role === 'ADMIN_TOKO';
  const isKaryawan = currentUser?.role === 'KARYAWAN';

  // 1. First ensure only essential operational logs are processed
  const sanitizedLogs = useMemo(() => {
    return activityLogs.filter(isEssentialActivityLog);
  }, [activityLogs]);

  // 2. Scoped activity logs based on user role and store:
  const roleScopedLogs = useMemo(() => {
    if (!currentUser) return [];

    // Super Admin: sees ALL activity logs across all stores
    if (isSuperAdmin) {
      if (activeStoreId) {
        return sanitizedLogs.filter((log) => log.store_id === activeStoreId || log.store_id === null);
      }
      return sanitizedLogs;
    }

    const myStoreId = currentUser.store_id || activeStoreId || (stores.length > 0 ? stores[0].id : '');

    // Admin Toko: sees logs in their OWN store only (strictly excludes Super Admin logs)
    if (isAdminToko) {
      return sanitizedLogs.filter((log) => {
        const isSameStore = log.store_id === myStoreId;
        const isNotSuperAdmin = log.role !== 'SUPER_ADMIN';
        return isSameStore && isNotSuperAdmin;
      });
    }

    // Karyawan: sees logs in their OWN store only (themselves and other staff/karyawan in that store)
    if (isKaryawan) {
      return sanitizedLogs.filter((log) => {
        const isSameStore = log.store_id === myStoreId;
        const isStaff = log.role === 'KARYAWAN' || (!log.role && log.user_id === currentUser.id);
        const isNotSuperAdmin = log.role !== 'SUPER_ADMIN';
        return isSameStore && isNotSuperAdmin && isStaff;
      });
    }

    return [];
  }, [sanitizedLogs, currentUser, activeStoreId, isSuperAdmin, isAdminToko, isKaryawan]);

  const filteredLogs = useMemo(() => {
    return roleScopedLogs
      .filter((log) => {
        if (activeStoreId || !isSuperAdmin) return true;
        if (selectedStore === 'ALL') return true;
        return log.store_id === selectedStore;
      })
      .filter((log) => {
        if (selectedType === 'ALL') return true;
        return log.tipe === selectedType;
      })
      .filter((log) => {
        if (selectedRole === 'ALL') return true;
        return log.role === selectedRole;
      })
      .filter((log) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          log.user_name.toLowerCase().includes(q) ||
          log.aktivitas.toLowerCase().includes(q) ||
          log.detail_perubahan.toLowerCase().includes(q) ||
          (log.store_name && log.store_name.toLowerCase().includes(q))
        );
      });
  }, [roleScopedLogs, selectedStore, selectedType, selectedRole, searchTerm, isSuperAdmin, activeStoreId]);

  // Helper to format log timestamp cleanly across all mobile browsers
  const formatLogDateTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    if (timeStr === 'Baru saja') return 'Baru saja';
    try {
      const str = timeStr.trim();
      // Regex parse standard YYYY-MM-DD (with optional time)
      const dateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes] = dateMatch;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mIdx = parseInt(month, 10) - 1;
        const monthName = monthNames[mIdx] || month;
        const timePart = hours && minutes ? ` • ${hours}:${minutes} WIB` : '';
        return `${parseInt(day, 10)} ${monthName} ${year}${timePart}`;
      }

      // Fallback parse
      const d = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} • ${hours}:${minutes} WIB`;
      }
    } catch {
      // fallback
    }
    return timeStr;
  };

  // Type Badge Renderer
  const renderTypeBadge = (tipe?: string) => {
    switch (tipe) {
      case 'INVENTORY':
      case 'INVENTARIS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <PackageCheck className="w-3 h-3" />
            INVENTARIS
          </span>
        );
      case 'TRANSACTION':
      case 'TRANSAKSI':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowRightLeft className="w-3 h-3" />
            TRANSAKSI
          </span>
        );
      case 'ABSENSI':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <UserCheck className="w-3 h-3" />
            ABSENSI
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <RotateCcw className="w-3 h-3" />
            RETURN
          </span>
        );
      case 'STORE':
      case 'TOKO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <StoreIcon className="w-3 h-3" />
            CABANG
          </span>
        );
      case 'USER':
      case 'PENGGUNA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <ShieldCheck className="w-3 h-3" />
            USER
          </span>
        );
      case 'AUTH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <KeyRound className="w-3 h-3" />
            AUTH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Activity className="w-3 h-3" />
            SISTEM
          </span>
        );
    }
  };

  // Helper to format detailed changes cleanly
  const renderDetailContent = (detail?: string) => {
    if (!detail) {
      return <span className="text-slate-400 italic">Tidak ada catatan rincian</span>;
    }
    if (detail.includes(' | ')) {
      const segments = detail.split(' | ');
      return (
        <div className="space-y-1">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-indigo-500 font-bold shrink-0 mt-0.5">&bull;</span>
              <span className="break-words leading-relaxed">{seg}</span>
            </div>
          ))}
        </div>
      );
    }
    return <p className="break-words leading-relaxed">{detail}</p>;
  };

  const handleConfirmDelete = () => {
    if (logToDelete) {
      deleteActivityLog(logToDelete);
      setLogToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Log Aktivitas Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {activeStore
              ? `Riwayat transaksi stok, return, absensi, dan master data di ${activeStore.nama_toko}.`
              : isSuperAdmin
              ? 'Seluruh rekam jejak transaksi inventaris, return, dan absensi lintas seluruh cabang toko.'
              : `Catatan aktivitas operasional di ${activeStore?.nama_toko || 'cabang toko Anda'}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <History className="w-4 h-4 text-purple-600" />
            <span>Total: <strong className="text-purple-900 font-bold">{filteredLogs.length} Catatan</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 min-w-0 max-w-full overflow-hidden">
        {/* Search */}
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pengguna / aktivitas / detail perubahan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-medium min-w-0"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto min-w-0 max-w-full">
          {/* Store Filter: ONLY FOR SUPER_ADMIN when no store is active */}
          {isSuperAdmin && !activeStoreId && (
            <div className="relative flex items-center min-w-0 max-w-full w-full sm:w-56 border border-slate-200 bg-white rounded-xl px-2.5 py-1.5 sm:py-2 overflow-hidden">
              <StoreIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
              <select
                id="filter-log-store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full min-w-0 max-w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate appearance-none pr-6"
              >
                <option value="ALL">Semua Cabang Toko</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_toko} {s.cabang ? `(${s.cabang})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2.5 pointer-events-none" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto min-w-0 max-w-full">
            {/* Type Filter */}
            <div className="relative flex items-center min-w-0 max-w-full border border-slate-200 bg-white rounded-xl px-2.5 py-1.5 sm:py-2 sm:w-36 overflow-hidden">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
              <select
                id="filter-log-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full min-w-0 max-w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate appearance-none pr-6"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="INVENTORY">Inventaris</option>
                <option value="TRANSACTION">Transaksi Stok</option>
                <option value="RETURN">Return</option>
                <option value="ABSENSI">Absensi</option>
                <option value="STORE">Cabang Toko</option>
                <option value="USER">User / Akun</option>
                <option value="AUTH">Autentikasi</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2 pointer-events-none" />
            </div>

            {/* Role Filter */}
            {isSuperAdmin ? (
              <div className="relative flex items-center min-w-0 max-w-full border border-slate-200 bg-white rounded-xl px-2.5 py-1.5 sm:py-2 sm:w-36 overflow-hidden">
                <select
                  id="filter-log-role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full min-w-0 max-w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate appearance-none pr-6"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN_TOKO">Admin Toko</option>
                  <option value="KARYAWAN">Karyawan</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2 pointer-events-none" />
              </div>
            ) : isAdminToko ? (
              <div className="relative flex items-center min-w-0 max-w-full border border-slate-200 bg-white rounded-xl px-2.5 py-1.5 sm:py-2 sm:w-36 overflow-hidden">
                <select
                  id="filter-log-role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full min-w-0 max-w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer truncate appearance-none pr-6"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="ADMIN_TOKO">Admin Toko</option>
                  <option value="KARYAWAN">Karyawan</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2 pointer-events-none" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Waktu & Tanggal</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tipe</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Pengguna</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Cabang Toko</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Aktivitas</th>
                <th className="py-3.5 px-4 min-w-[200px]">Detail Perubahan Data</th>
                {(isSuperAdmin || isAdminToko) && (
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin || isAdminToko ? 7 : 6} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada catatan aktivitas operasional yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                      {formatLogDateTime(log.waktu)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderTypeBadge(log.tipe)}
                    </td>
                    <td className="py-3.5 px-4">
                      {(() => {
                        const actor = users.find((u) => u.id === log.user_id);
                        return (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 shadow-2xs">
                              {actor?.avatar || actor?.foto_profil ? (
                                <img
                                  src={actor.avatar || actor.foto_profil}
                                  alt={log.user_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                log.user_name.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{(log.user_name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</p>
                              {log.role && (
                                <span className="text-[10px] text-slate-400">
                                  {log.role === 'SUPER_ADMIN' ? 'Super Admin' : log.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {log.store_name || 'Pusat'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">
                      {log.aktivitas}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 max-w-md">
                      {renderDetailContent(log.detail_perubahan)}
                    </td>
                    {(isSuperAdmin || isAdminToko) && (
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setLogToDelete(log.id)}
                          title="Hapus baris log ini"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden p-3 sm:p-3.5 space-y-3 bg-slate-50/60 min-w-0 max-w-full">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium bg-white rounded-xl border border-slate-200/80 p-4">
              Tidak ada catatan aktivitas operasional yang sesuai dengan filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const actor = users.find((u) => u.id === log.user_id);
              return (
                <div
                  key={log.id}
                  className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-200 transition-all min-w-0 max-w-full overflow-hidden"
                >
                  {/* Card Top: Badges & Action */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {renderTypeBadge(log.tipe)}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200/70 truncate max-w-[160px]">
                        <StoreIcon className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{log.store_name || 'Pusat'}</span>
                      </span>
                    </div>

                    {(isSuperAdmin || isAdminToko) && (
                      <button
                        type="button"
                        onClick={() => setLogToDelete(log.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Hapus baris log ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Card Body: Actor info & Activity headline */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 shadow-2xs mt-0.5">
                      {actor?.avatar || actor?.foto_profil ? (
                        <img
                          src={actor.avatar || actor.foto_profil}
                          alt={log.user_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        log.user_name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                        {log.aktivitas}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        <span className="font-semibold text-slate-700 truncate">{(log.user_name || '').replace(/\s*\((\s*|0)\)/g, '').replace(/\s+0$/, '').trim()}</span>
                        {log.role && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600 shrink-0">
                            {log.role === 'SUPER_ADMIN' ? 'Super Admin' : log.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail Box: Clean Structured Styling */}
                  <div className="p-3 rounded-xl bg-slate-50/90 text-xs text-slate-700 border border-slate-100/90 break-words leading-relaxed min-w-0">
                    {renderDetailContent(log.detail_perubahan)}
                  </div>

                  {/* Card Footer: Clean Timestamp */}
                  <div className="flex items-center gap-1.5 pt-2 text-[11px] text-slate-500 border-t border-slate-100 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-mono">{formatLogDateTime(log.waktu)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal for Individual Deletion */}
      <ConfirmationModal
        isOpen={Boolean(logToDelete)}
        title="Hapus Catatan Log Aktivitas"
        message="Apakah Anda yakin ingin menghapus catatan log ini?"
        confirmText="Ya, Hapus Log"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setLogToDelete(null)}
      />
    </div>
  );
};
