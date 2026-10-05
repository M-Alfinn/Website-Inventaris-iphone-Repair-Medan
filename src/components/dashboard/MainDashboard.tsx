import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Store as StoreIcon, 
  Users, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Clock, 
  Activity, 
  Settings,
  UserPlus,
  Package,
  Boxes,
  Info,
  Bell,
  AlertTriangle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { isEssentialActivityLog } from '../../utils/activityLogRules';

export const MainDashboard: React.FC = () => {
  const { stores, users, navigateTo, selectStore, activityLogs, inventory, notifications, markNotificationAsRead } = useApp();

  const activeStoresCount = stores.filter((s) => s.status === 'AKTIF').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN_TOKO').length;
  const staffCount = users.filter((u) => u.role === 'KARYAWAN').length;

  // Helper to format log timestamp cleanly without breaking on mobile
  const formatLogDateTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    if (timeStr === 'Baru saja') return 'Baru saja';
    try {
      const str = timeStr.trim();
      const dateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes] = dateMatch;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mIdx = parseInt(month, 10) - 1;
        const monthName = monthNames[mIdx] || month;
        const timePart = hours && minutes ? ` • ${hours}:${minutes} WIB` : '';
        return `${parseInt(day, 10)} ${monthName} ${year}${timePart}`;
      }
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
    } catch {}
    return timeStr;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Utama
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ringkasan data profil operasional, aktivitas sistem seluruh toko
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-main-manage-stores"
            onClick={() => navigateTo('TOKO')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Manajemen Toko</span>
          </button>
          <button
            id="btn-main-manage-users"
            onClick={() => navigateTo('KARYAWAN')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Kelola Karyawan</span>
          </button>
        </div>
      </div>

      {/* System Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Toko Terdaftar</p>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stores.length} <span className="text-xs font-normal text-slate-400">cabang</span></p>
          <p className="text-[11px] text-slate-400 mt-1">Total seluruh cabang terdaftar ({activeStoresCount} aktif)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Admin Cabang</p>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{adminCount} <span className="text-xs font-normal text-slate-400">orang</span></p>
          <p className="text-[11px] text-slate-400 mt-1">PIC Kepala Toko</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Staff & Teknisi</p>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{staffCount} <span className="text-xs font-normal text-slate-400">orang</span></p>
          <p className="text-[11px] text-slate-400 mt-1">Karyawan Aktif</p>
        </div>
      </div>

      {/* Notifikasi & Peringatan Penting Lintas Cabang (Khusus Super Admin di Dashboard Utama) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Peringatan &amp; Notifikasi Seluruh Toko
              </h2>
              <p className="text-xs text-slate-500">
                Pemantauan terpusat untuk stok kritis, pengajuan return, dan barang rusak dari seluruh cabang
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 self-start sm:self-auto">
            {notifications.length} Notifikasi Aktif
          </span>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Tidak ada peringatan kritis lintas toko saat ini. Seluruh operasional berjalan normal.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notifications.slice(0, 4).map((notif) => {
              const displayStoreName = (!notif.store_name || notif.store_name.toLowerCase() === 'global' || notif.store_name.toLowerCase() === 'semua cabang toko')
                ? 'Seluruh Toko'
                : notif.store_name;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    if (notif.store_id) {
                      selectStore(notif.store_id);
                    }
                    if (notif.link_page) navigateTo(notif.link_page as any);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="shrink-0 mt-0.5">
                    {notif.tipe === 'DANGER' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    ) : notif.tipe === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        {displayStoreName}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {notif.judul}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {notif.pesan}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="font-mono">{notif.waktu}</span>
                      <span className="text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
                        {notif.store_id ? 'Buka di Toko Ini →' : 'Buka Menu →'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profil Seluruh Cabang Toko Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Profil Cabang Toko
            </h2>
            <p className="text-xs text-slate-500">
              Ringkasan profil identitas, kontak WhatsApp, jam kerja operasional, serta kapasitas masing-masing cabang.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 self-start sm:self-auto">
            {stores.length} Profil Cabang
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stores.map((store) => {
            const storeItems = inventory.filter((item) => item.store_id === store.id);
            const totalStockCount = storeItems.reduce((acc, curr) => acc + curr.stok, 0);
            const storeUsers = users.filter((u) => u.store_id === store.id);

            return (
              <div
                key={store.id}
                id={`main-store-profile-card-${store.id}`}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between bg-white space-y-4"
              >
                <div>
                  {/* Card Top: Store Title & Status */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <StoreIcon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {store.nama_toko}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500 truncate">{store.cabang}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {store.status}
                    </span>
                  </div>

                  {/* Profile Details */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{store.alamat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{store.nomor_telepon || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{store.jam_operasional}</span>
                    </div>
                  </div>

                  {/* Operational Shift & Tolerance badge */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Shift Standar:</span>
                      <span className="font-bold text-slate-700">
                        {store.jam_masuk_standar || '08:30'} - {store.jam_pulang_standar || '17:00'} WIB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">PIC Toko:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                        {store.pic_name || 'Admin Toko'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                  <div className="p-1.5 rounded-lg bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium">Karyawan</p>
                    <p className="text-xs font-bold text-slate-800">{storeUsers.length} Org</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium">Item Sparepart</p>
                    <p className="text-xs font-bold text-slate-800">{storeItems.length} Jenis</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50">
                    <p className="text-[10px] text-slate-400 font-medium">Total Stok</p>
                    <p className="text-xs font-bold text-blue-700">{totalStockCount} Unit</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Status & Recent Global Activity */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Aktivitas Sistem Terkini</h2>
          </div>
          <button
            onClick={() => navigateTo('ACTIVITY_LOG')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Lihat Seluruh Log &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activityLogs.filter(isEssentialActivityLog).slice(0, 6).map((log) => {
            const actor = users.find((u) => u.id === log.user_id);
            return (
              <div
                key={log.id}
                className="flex flex-col justify-between gap-2.5 p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 transition-all text-xs overflow-hidden"
              >
                <div className="space-y-1.5 min-w-0">
                  {/* Top row: Actor & Location badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden border border-slate-200">
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
                      <span className="font-bold text-slate-800 truncate text-xs">{log.user_name}</span>
                      {log.role && (
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          ({log.role === 'SUPER_ADMIN' ? 'Super Admin' : log.role === 'ADMIN_TOKO' ? 'Admin Toko' : 'Karyawan'})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 px-2 py-0.5 bg-white rounded-md border border-slate-200/80 shrink-0 truncate max-w-[150px]">
                      {log.store_name || 'Pusat'}
                    </span>
                  </div>

                  {/* Activity and detail */}
                  <div>
                    <p className="font-bold text-indigo-700 text-xs leading-snug">{log.aktivitas}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed break-words">
                      {log.detail_perubahan}
                    </p>
                  </div>
                </div>

                {/* Bottom row: Clean date & time with clock icon */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-200/60 min-w-0">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{formatLogDateTime(log.waktu)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
