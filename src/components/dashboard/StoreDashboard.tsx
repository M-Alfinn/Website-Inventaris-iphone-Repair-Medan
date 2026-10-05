import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Package,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertOctagon,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Users,
  CalendarCheck,
  Calendar,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  LineChart as LineChartIcon,
  Building2,
  Clock,
  LogIn,
  LogOut,
  Bell,
  UserCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  formatDateYMD,
  getTodayPeriodInfo,
  getWeekPeriodInfo,
  getMonthPeriodInfo,
  getYearPeriodInfo,
  getCustomPeriodInfo
} from '../../utils/dateUtils';

export const StoreDashboard: React.FC = () => {
  const {
    activeStore,
    activeStoreId,
    inventory,
    transactions,
    returns,
    attendance,
    users,
    navigateTo,
    currentUser,
    checkInAttendance,
    checkOutAttendance,
  } = useApp();

  // Attendance Reminder Data for Current User & Branch Staff
  const todayStr = useMemo(() => formatDateYMD(new Date()), []);
  const myTodayAttendance = useMemo(() => {
    return attendance.find((a) => a.user_id === currentUser?.id && a.tanggal === todayStr) || null;
  }, [attendance, currentUser?.id, todayStr]);

  const userJamMasuk = currentUser?.jam_masuk_standar || activeStore?.jam_masuk_standar || '08:30';
  const userJamPulang = currentUser?.jam_pulang_standar || activeStore?.jam_pulang_standar || '17:00';
  const userToleransi = currentUser?.toleransi_keterlambatan_menit ?? activeStore?.toleransi_keterlambatan_menit ?? 0;

  // Branch team attendance statistics for Admin Toko / Super Admin
  const branchStaffList = useMemo(() => {
    return users.filter((u) => u.store_id === activeStoreId && u.role !== 'SUPER_ADMIN');
  }, [users, activeStoreId]);

  const branchStaffCheckedInCount = useMemo(() => {
    return branchStaffList.filter((staff) =>
      attendance.some((a) => a.user_id === staff.id && a.tanggal === todayStr && a.jam_masuk)
    ).length;
  }, [branchStaffList, attendance, todayStr]);

  const branchStaffMissingCount = branchStaffList.length - branchStaffCheckedInCount;

  // Dynamic initial custom dates
  const defaultCustomDates = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: formatDateYMD(thirtyDaysAgo),
      end: formatDateYMD(now),
    };
  }, []);

  // Period Filter: Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Custom Tanggal
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState(defaultCustomDates.start);
  const [customEnd, setCustomEnd] = useState(defaultCustomDates.end);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Scroll to top when activeStore or period changes
  useEffect(() => {
    const scrollToTop = () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
        mainEl.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    return () => cancelAnimationFrame(rafId);
  }, [activeStoreId, period]);

  // Base items specifically for the active store
  const storeInventory = useMemo(() => {
    return inventory.filter((item) => item.store_id === activeStoreId);
  }, [inventory, activeStoreId]);

  const storeTransactions = useMemo(() => {
    return transactions.filter((trx) => trx.store_id === activeStoreId);
  }, [transactions, activeStoreId]);

  const storeReturns = useMemo(() => {
    return returns.filter((ret) => ret.store_id === activeStoreId);
  }, [returns, activeStoreId]);

  const storeAttendance = useMemo(() => {
    return attendance.filter((att) => att.store_id === activeStoreId);
  }, [attendance, activeStoreId]);

  const storeEmployees = useMemo(() => {
    if (!activeStoreId) return [];
    return users.filter((u) => u.store_id === activeStoreId && u.role !== 'SUPER_ADMIN');
  }, [users, activeStoreId]);

  // Calculate 100% dynamic date boundaries & label descriptions in real-time
  const periodInfo = useMemo(() => {
    const now = new Date();

    switch (period) {
      case 'today':
        return getTodayPeriodInfo(now);
      case 'week':
        return getWeekPeriodInfo(now);
      case 'month':
        return getMonthPeriodInfo(now);
      case 'year':
        return getYearPeriodInfo(now);
      case 'custom':
      default:
        return getCustomPeriodInfo(customStart, customEnd);
    }
  }, [period, customStart, customEnd]);

  // Filtered dataset according to active period
  const filteredTransactions = useMemo(() => {
    return storeTransactions.filter((trx) => {
      const trxDate = trx.tanggal || trx.created_at?.split(' ')[0] || '';
      return trxDate >= periodInfo.startDate && trxDate <= periodInfo.endDate;
    });
  }, [storeTransactions, periodInfo]);

  const filteredReturns = useMemo(() => {
    return storeReturns.filter((ret) => {
      const retDate = ret.tanggal_pengajuan || ret.tanggal_return || ret.created_at?.split(' ')[0] || '';
      return retDate >= periodInfo.startDate && retDate <= periodInfo.endDate;
    });
  }, [storeReturns, periodInfo]);

  const filteredAttendance = useMemo(() => {
    return storeAttendance.filter((att) => {
      const attDate = att.tanggal || '';
      return attDate >= periodInfo.startDate && attDate <= periodInfo.endDate;
    });
  }, [storeAttendance, periodInfo]);

  // Metric Computations (Real-time and reactive to period filter)
  const totalJenisBarang = storeInventory.length;
  const totalStok = storeInventory.reduce((acc, item) => acc + item.stok, 0);

  const barangMasukCount = filteredTransactions
    .filter((t) => t.jenis === 'MASUK' || t.jenis === 'TAMBAH_STOK' || t.jenis === 'RETURN_MASUK' || t.direction === '+')
    .reduce((acc, t) => acc + t.jumlah, 0);

  const barangKeluarCount = filteredTransactions
    .filter((t) => (t.jenis === 'KELUAR' || t.jenis === 'KURANGI_STOK' || t.direction === '-') && t.jenis !== 'RUSAK')
    .reduce((acc, t) => acc + t.jumlah, 0);

  const barangRusakCount = filteredTransactions
    .filter((t) => t.jenis === 'RUSAK')
    .reduce((acc, t) => acc + t.jumlah, 0);

  const returnMenunggu = filteredReturns.filter((r) => r.status === 'MENUNGGU').length;
  const returnDiterima = filteredReturns.filter((r) => r.status === 'DITERIMA').length;
  const returnDitolak = filteredReturns.filter((r) => r.status === 'DITOLAK').length;

  const totalKaryawan = storeEmployees.length;
  const totalHadirCount = filteredAttendance.filter(
    (a) => a.status === 'HADIR' || (a.jam_masuk !== null && a.jam_masuk !== undefined)
  ).length;

  const lowStockItems = storeInventory.filter((i) => i.status === 'MENIPIS' || i.status === 'HABIS');

  // Chart 1 Data: Dynamically computed based on selected period
  const transactionChartData = useMemo(() => {
    if (period === 'today') {
      const timeSlots = ('slots' in periodInfo ? periodInfo.slots : []).map((s) => ({ ...s }));

      filteredTransactions.forEach((trx) => {
        const hour = parseInt((trx.waktu || '10:00:00').split(':')[0], 10);
        const slot = timeSlots.find((s) => hour >= s.startH && hour < s.endH) || timeSlots[1];
        if (slot) {
          if (trx.jenis === 'MASUK' || trx.direction === '+') {
            slot.masuk += trx.jumlah;
          } else if (trx.jenis === 'RUSAK') {
            slot.rusak += trx.jumlah;
          } else {
            slot.keluar += trx.jumlah;
          }
        }
      });

      return timeSlots;
    }

    if (period === 'week') {
      const weekDays = ('days' in periodInfo ? periodInfo.days : []).map((d) => ({ ...d }));

      filteredTransactions.forEach((trx) => {
        const trxDate = trx.tanggal || trx.created_at?.split(' ')[0];
        const daySlot = weekDays.find((d) => d.date === trxDate);
        if (daySlot) {
          if (trx.jenis === 'MASUK' || trx.direction === '+') {
            daySlot.masuk += trx.jumlah;
          } else if (trx.jenis === 'RUSAK') {
            daySlot.rusak += trx.jumlah;
          } else {
            daySlot.keluar += trx.jumlah;
          }
        }
      });

      return weekDays;
    }

    if (period === 'month') {
      const monthWeeks = ('weeks' in periodInfo ? periodInfo.weeks : []).map((w) => ({ ...w }));

      filteredTransactions.forEach((trx) => {
        const trxDate = trx.tanggal || trx.created_at?.split(' ')[0] || '';
        const slot = monthWeeks.find((w) => trxDate >= w.startD && trxDate <= w.endD);
        if (slot) {
          if (trx.jenis === 'MASUK' || trx.direction === '+') {
            slot.masuk += trx.jumlah;
          } else if (trx.jenis === 'RUSAK') {
            slot.rusak += trx.jumlah;
          } else {
            slot.keluar += trx.jumlah;
          }
        }
      });

      return monthWeeks;
    }

    if (period === 'year') {
      const yearMonths = ('months' in periodInfo ? periodInfo.months : []).map((m) => ({ ...m }));

      filteredTransactions.forEach((trx) => {
        const trxDate = trx.tanggal || trx.created_at?.split(' ')[0] || '';
        const monthCode = trxDate.substring(0, 7);
        const slot = yearMonths.find((m) => m.code === monthCode);
        if (slot) {
          if (trx.jenis === 'MASUK' || trx.direction === '+') {
            slot.masuk += trx.jumlah;
          } else if (trx.jenis === 'RUSAK') {
            slot.rusak += trx.jumlah;
          } else {
            slot.keluar += trx.jumlah;
          }
        }
      });

      return yearMonths;
    }

    // Period === 'custom':
    const mapByDate = new Map<string, { name: string; fullDay: string; masuk: number; keluar: number; rusak: number }>();
    filteredTransactions.forEach((trx) => {
      const d = trx.tanggal || trx.created_at?.split(' ')[0] || '2026-09-01';
      if (!mapByDate.has(d)) {
        const parts = d.split('-');
        const shortName = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        mapByDate.set(d, { name: shortName, fullDay: `Tanggal ${d}`, masuk: 0, keluar: 0, rusak: 0 });
      }
      const item = mapByDate.get(d)!;
      if (trx.jenis === 'MASUK' || trx.direction === '+') {
        item.masuk += trx.jumlah;
      } else if (trx.jenis === 'RUSAK') {
        item.rusak += trx.jumlah;
      } else {
        item.keluar += trx.jumlah;
      }
    });

    const result = Array.from(mapByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, v]) => v);

    if (result.length === 0) {
      return [
        { name: 'Awal', fullDay: `Mulai: ${customStart}`, masuk: 0, keluar: 0, rusak: 0 },
        { name: 'Akhir', fullDay: `Selesai: ${customEnd}`, masuk: 0, keluar: 0, rusak: 0 },
      ];
    }
    return result;
  }, [period, periodInfo, filteredTransactions, customStart, customEnd]);

  // Chart 2: Status Return Breakdown
  const returnChartData = useMemo(() => {
    const totalStatus = returnDiterima + returnMenunggu + returnDitolak;
    if (totalStatus === 0) {
      return [
        { name: 'Diterima', value: 0, color: '#10b981' },
        { name: 'Menunggu', value: 0, color: '#f59e0b' },
        { name: 'Ditolak', value: 0, color: '#f43f5e' },
      ];
    }
    return [
      { name: 'Diterima', value: returnDiterima, color: '#10b981' },
      { name: 'Menunggu', value: returnMenunggu, color: '#f59e0b' },
      { name: 'Ditolak', value: returnDitolak, color: '#f43f5e' },
    ];
  }, [returnDiterima, returnMenunggu, returnDitolak]);

  if (!activeStore) {
    const isSuper = currentUser?.role === 'SUPER_ADMIN';
    return (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center max-w-md mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">
            {isSuper ? 'Belum Ada Cabang yang Dipilih' : 'Cabang Belum Ditugaskan / Tidak Ditemukan'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {isSuper
              ? 'Silakan pilih cabang toko terlebih dahulu untuk melihat dashboard dan analitik transaksi toko.'
              : 'Akun Anda belum memiliki cabang toko yang ditugaskan atau cabang toko Anda sedang dinonaktifkan. Silakan hubungi Super Admin untuk penugasan cabang resmi.'}
          </p>
        </div>
        {isSuper && (
          <button
            onClick={() => navigateTo('PILIH_TOKO')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <span>Pilih Cabang Toko</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
            {activeStore?.foto_profil || activeStore?.logo ? (
              <img
                src={activeStore.foto_profil || activeStore.logo}
                alt={activeStore.nama_toko}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-7 h-7 text-indigo-500" />
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              DASHBOARD {activeStore?.nama_toko.toUpperCase() || 'TOKO'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {activeStore?.cabang} &bull; {activeStore?.alamat}
            </p>
          </div>
        </div>

        {/* Filter Periode */}
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold overflow-x-auto max-w-full">
            <button
              id="filter-today"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-md transition-colors shrink-0 ${period === 'today' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hari Ini
            </button>
            <button
              id="filter-week"
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-md transition-colors shrink-0 ${period === 'week' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Minggu Ini
            </button>
            <button
              id="filter-month"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-md transition-colors shrink-0 ${period === 'month' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Bulan Ini
            </button>
            <button
              id="filter-year"
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-md transition-colors shrink-0 ${period === 'year' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tahun Ini
            </button>
            <button
              id="filter-custom"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-md transition-colors shrink-0 ${period === 'custom' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Custom
            </button>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs shrink-0 max-w-full flex-wrap sm:flex-nowrap">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-700"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Attendance Widget: Khusus Super Admin vs Admin Toko/Karyawan */}
      {currentUser?.role === 'SUPER_ADMIN' ? (
        /* Super Admin: Monitoring Presensi Staf Toko (Super Admin tidak memiliki kewajiban absensi kerja) */
        <div className="bg-white p-3.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/90 shadow-2xs text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 border border-blue-200/70 mt-0.5 sm:mt-0">
              <UserCheck className="w-4 h-4" />
            </div>

            <div className="min-w-0 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-xs block sm:inline">
                Kehadiran Staf Cabang:
              </span>

              {branchStaffList.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 font-medium text-[11px] leading-tight">
                  <strong className="text-slate-900 font-bold">{branchStaffCheckedInCount}</strong> dari {branchStaffList.length} staf &amp; teknisi hadir hari ini
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-500 font-medium text-[11px] leading-tight">
                  Belum ada karyawan terdaftar di cabang ini
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button
              onClick={() => navigateTo('ABSENSI')}
              className="w-full sm:w-auto text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-xl hover:bg-indigo-50 border border-indigo-100 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              title="Buka Rekapitulasi Absensi Staf Toko"
            >
              <span>Rekap Absensi Staf</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </button>
          </div>
        </div>
      ) : (
        /* Admin Toko & Karyawan: Status Absensi Mandiri */
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-3 min-w-0 flex-1">
            {/* Header / Title Row on Mobile */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  !myTodayAttendance?.jam_masuk
                    ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                    : !myTodayAttendance?.jam_pulang && !myTodayAttendance?.jam_keluar
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs block leading-tight">
                    Presensi Kerja Hari Ini
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block sm:hidden">
                    Shift {userJamMasuk} - {userJamPulang} WIB
                  </span>
                </div>
              </div>

              {currentUser?.role === 'ADMIN_TOKO' && branchStaffList.length > 0 && (
                <span className="sm:hidden inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  Staf: {branchStaffCheckedInCount}/{branchStaffList.length}
                </span>
              )}
            </div>

            {/* Attendance Status Badge / Details */}
            <div className="min-w-0">
              {!myTodayAttendance?.jam_masuk ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-[11px] font-semibold leading-snug">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="truncate">Belum Absen Masuk</span>
                  <span className="hidden sm:inline text-amber-600/80 font-normal">
                    (Shift: {userJamMasuk} - {userJamPulang} WIB)
                  </span>
                </div>
              ) : !myTodayAttendance?.jam_pulang && !myTodayAttendance?.jam_keluar ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold leading-snug">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Hadir: jam {myTodayAttendance.jam_masuk} WIB</span>
                  <span className="hidden sm:inline text-emerald-600/80 font-normal">
                    (Pulang: {userJamPulang} WIB)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold leading-snug">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Shift Selesai</span>
                  <span className="text-slate-500 font-normal">
                    ({myTodayAttendance.jam_masuk} - {myTodayAttendance.jam_pulang || myTodayAttendance.jam_keluar})
                  </span>
                </div>
              )}
            </div>

            {currentUser?.role === 'ADMIN_TOKO' && branchStaffList.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-200 pl-3 shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Staf Toko: <strong className="text-slate-800 font-bold">{branchStaffCheckedInCount}/{branchStaffList.length}</strong> hadir
              </span>
            )}
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
            {!myTodayAttendance?.jam_masuk ? (
              <button
                onClick={() => checkInAttendance()}
                className="flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Check In</span>
              </button>
            ) : !myTodayAttendance?.jam_pulang && !myTodayAttendance?.jam_keluar ? (
              <button
                onClick={() => checkOutAttendance()}
                className="flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Check Out</span>
              </button>
            ) : null}

            <button
              onClick={() => navigateTo('ABSENSI')}
              className="flex-1 sm:flex-initial text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3.5 py-2 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 shrink-0"
              title="Buka Menu Absensi Lengkap"
            >
              <span>Menu Absensi</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Alert low stock banner if any */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Peringatan Stok: {lowStockItems.length} barang menipis atau habis di {activeStore?.nama_toko}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {lowStockItems.map((i) => `${i.nama_barang} (${i.stok} ${i.satuan})`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('INVENTARIS')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0 transition-colors"
          >
            Lihat Inventaris
          </button>
        </div>
      )}

      {/* 10 METRIC CARDS (Dynamic to Selected Period) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Jenis Barang */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Jenis Barang</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalJenisBarang} <span className="text-xs font-normal text-slate-400">SKU</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Katalog terdaftar</p>
        </div>

        {/* 2. Total Stok */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Stok</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-blue-700 mt-2">{totalStok} <span className="text-xs font-normal text-slate-400">unit</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Fisik di gudang</p>
        </div>

        {/* 3. Barang Masuk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Barang Masuk</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">+{barangMasukCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{periodInfo.periodLabel}</p>
        </div>

        {/* 4. Barang Keluar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Barang Keluar</p>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-800 mt-2">-{barangKeluarCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{periodInfo.periodLabel}</p>
        </div>

        {/* 5. Barang Rusak */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Barang Rusak</p>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-600 mt-2">{barangRusakCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{periodInfo.periodLabel}</p>
        </div>

        {/* 6. Return Menunggu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Return Menunggu</p>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-600 mt-2">{returnMenunggu}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Perlu approval</p>
        </div>

        {/* 7. Return Diterima */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Return Diterima</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">{returnDiterima}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Kembali ke stok</p>
        </div>

        {/* 8. Return Ditolak */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Return Ditolak</p>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-600 mt-2">{returnDitolak}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Klaim ditolak</p>
        </div>

        {/* 9. Jumlah Karyawan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Jumlah Karyawan</p>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalKaryawan} <span className="text-xs font-normal text-slate-400">orang</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Staff cabang</p>
        </div>

        {/* 10. Karyawan Hadir */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">{period === 'today' ? 'Hadir Hari Ini' : 'Total Kehadiran'}</p>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-teal-700 mt-2">{totalHadirCount} <span className="text-xs font-normal text-slate-400">kehadiran</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{periodInfo.periodLabel}</p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Barang Masuk, Keluar, Rusak */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Aktivitas Arus Barang &bull; {periodInfo.title}
                </h2>
              </div>
              <p className="text-xs text-slate-500">{periodInfo.chartSub}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Chart Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    chartType === 'area'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Tampilan Grafik Tren (Area)"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Area</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    chartType === 'bar'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Tampilan Bar Chart"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Batang</span>
                </button>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-2.5 text-[11px] font-medium">
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Masuk
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /> Keluar
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" /> Rusak
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full outline-none select-none">
            <ResponsiveContainer width="100%" height="100%" className="outline-none">
              {chartType === 'area' ? (
                <AreaChart
                  data={transactionChartData}
                  accessibilityLayer={false}
                  margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
                  className="outline-none focus:outline-none"
                >
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRusak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const fullDayName = payload[0]?.payload?.fullDay || label;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-800 space-y-1">
                            <p className="font-bold text-slate-300 border-b border-slate-700 pb-1">{fullDayName}</p>
                            <div className="flex items-center justify-between gap-4 text-emerald-400">
                              <span>Barang Masuk:</span>
                              <span className="font-bold">+{payload.find((p) => p.dataKey === 'masuk')?.value || 0} unit</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-blue-400">
                              <span>Barang Keluar:</span>
                              <span className="font-bold">-{payload.find((p) => p.dataKey === 'keluar')?.value || 0} unit</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-rose-400">
                              <span>Barang Rusak:</span>
                              <span className="font-bold">{payload.find((p) => p.dataKey === 'rusak')?.value || 0} unit</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="masuk"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMasuk)"
                    name="Barang Masuk"
                    activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="keluar"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorKeluar)"
                    name="Barang Keluar"
                    activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rusak"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRusak)"
                    name="Barang Rusak"
                    activeDot={{ r: 4, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={transactionChartData}
                  accessibilityLayer={false}
                  margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
                  className="outline-none focus:outline-none"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const fullDayName = payload[0]?.payload?.fullDay || label;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-800 space-y-1">
                            <p className="font-bold text-slate-300 border-b border-slate-700 pb-1">{fullDayName}</p>
                            <div className="flex items-center justify-between gap-4 text-emerald-400">
                              <span>Barang Masuk:</span>
                              <span className="font-bold">+{payload.find((p) => p.dataKey === 'masuk')?.value || 0} unit</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-blue-400">
                              <span>Barang Keluar:</span>
                              <span className="font-bold">-{payload.find((p) => p.dataKey === 'keluar')?.value || 0} unit</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-rose-400">
                              <span>Barang Rusak:</span>
                              <span className="font-bold">{payload.find((p) => p.dataKey === 'rusak')?.value || 0} unit</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="masuk" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} name="Barang Masuk" />
                  <Bar dataKey="keluar" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} name="Barang Keluar" />
                  <Bar dataKey="rusak" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={20} name="Barang Rusak" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status Return */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Distribusi Status Return
            </h2>
            <p className="text-xs text-slate-500">Klaim barang return ({periodInfo.title})</p>

            <div className="h-52 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={returnChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {returnChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Perlu Peninjauan:</span>
            <span className="font-bold text-amber-600">{returnMenunggu} Pengajuan</span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigateTo('INVENTARIS')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">Kelola Inventaris</p>
            <p className="text-[10px] text-slate-400">Tambah / sesuaikan stok</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          onClick={() => navigateTo('BARANG_MASUK')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600">
              {currentUser?.role === 'KARYAWAN' ? 'Riwayat Barang Masuk' : 'Input Barang Masuk'}
            </p>
            <p className="text-[10px] text-slate-400">
              {currentUser?.role === 'KARYAWAN' ? 'Lihat catatan penerimaan' : 'Penerimaan dari supplier'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          onClick={() => navigateTo('BARANG_KELUAR')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
              {currentUser?.role === 'KARYAWAN' ? 'Riwayat Barang Keluar' : 'Input Barang Keluar'}
            </p>
            <p className="text-[10px] text-slate-400">
              {currentUser?.role === 'KARYAWAN' ? 'Lihat catatan pengeluaran' : 'Penjualan / pemakaian'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          onClick={() => navigateTo('RETURN')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600">Pusat Return</p>
            <p className="text-[10px] text-slate-400">Approval klaim barang</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
