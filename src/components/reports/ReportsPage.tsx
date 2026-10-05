import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertOctagon,
  RotateCcw,
  CalendarCheck,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { formatRupiah } from '../../mockData';
import { formatDateYMD } from '../../utils/dateUtils';

export const ReportsPage: React.FC = () => {
  const { stores, activeStoreId, activeStore, inventory, transactions, returns, attendance, showToast, currentUser, categories } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const assignedStoreId = currentUser?.store_id || activeStoreId || (stores.length > 0 ? stores[0].id : '');

  const [reportType, setReportType] = useState<
    'STOK' | 'MASUK' | 'KELUAR' | 'RUSAK' | 'RETURN' | 'ABSENSI'
  >('STOK');
  const [selectedStore, setSelectedStore] = useState<string>(
    isSuperAdmin ? (activeStoreId || 'ALL') : assignedStoreId
  );
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateYMD(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateYMD(new Date()));

  React.useEffect(() => {
    if (isSuperAdmin) {
      setSelectedStore(activeStoreId || 'ALL');
    }
  }, [activeStoreId, isSuperAdmin]);

  // Strictly enforce branch isolation for non-superadmin
  const effectiveStoreId = isSuperAdmin ? selectedStore : assignedStoreId;
  const currentStore = stores.find((s) => s.id === effectiveStoreId);

  // Data subsets strictly based on effectiveStoreId and date range
  const storeInventory = useMemo(() => {
    if (effectiveStoreId === 'ALL') return inventory;
    return inventory.filter((i) => i.store_id === effectiveStoreId);
  }, [inventory, effectiveStoreId]);

  const storeTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchStore = effectiveStoreId === 'ALL' || t.store_id === effectiveStoreId;
      const matchDate = (!startDate || t.tanggal >= startDate) && (!endDate || t.tanggal <= endDate);
      return matchStore && matchDate;
    });
  }, [transactions, effectiveStoreId, startDate, endDate]);

  const storeReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchStore = effectiveStoreId === 'ALL' || r.store_id === effectiveStoreId;
      const matchDate = (!startDate || r.tanggal_pengajuan >= startDate) && (!endDate || r.tanggal_pengajuan <= endDate);
      return matchStore && matchDate;
    });
  }, [returns, effectiveStoreId, startDate, endDate]);

  const storeAttendance = useMemo(() => {
    return attendance.filter((a) => {
      const matchStore = effectiveStoreId === 'ALL' || a.store_id === effectiveStoreId;
      const matchDate = (!startDate || a.tanggal >= startDate) && (!endDate || a.tanggal <= endDate);
      return matchStore && matchDate;
    });
  }, [attendance, effectiveStoreId, startDate, endDate]);

  const handleExportExcel = () => {
    try {
      let exportRows: Record<string, any>[] = [];
      const storeName = currentStore?.nama_toko || 'Toko';
      const storeBranch = currentStore?.cabang || '';

      if (reportType === 'STOK') {
        exportRows = storeInventory.map((item, idx) => {
          const cat = categories.find((c) => c.id === item.category_id);
          return {
            'No': idx + 1,
            'Kode Barang': item.kode_barang,
            'Nama Suku Cadang': item.nama_barang,
            'Model iPhone': item.model_iphone,
            'Kategori': cat?.nama_kategori || '-',
            'Stok Saat Ini': item.stok,
            'Stok Minimum': item.stok_minimum,
            'Satuan': item.satuan.toUpperCase(),
            'Status Stok': item.status,
            'Harga Beli': item.harga_beli,
            'Harga Jual': item.harga_jual,
            'Cabang Toko': `${storeName} (${storeBranch})`,
            'Keterangan': item.keterangan || '-',
          };
        });
      } else if (reportType === 'MASUK' || reportType === 'KELUAR' || reportType === 'RUSAK') {
        const filteredTrx = storeTransactions.filter((t) => {
          if (reportType === 'MASUK') return t.jenis === 'MASUK' || t.jenis === 'TAMBAH_STOK';
          if (reportType === 'KELUAR') return t.jenis === 'KELUAR' || t.jenis === 'KURANGI_STOK';
          if (reportType === 'RUSAK') return t.jenis === 'RUSAK';
          return true;
        });

        exportRows = filteredTrx.map((t, idx) => ({
          'No': idx + 1,
          'Tanggal': t.tanggal,
          'Waktu': t.waktu,
          'Kode Barang': t.kode_barang,
          'Nama Barang': t.nama_barang,
          'Model iPhone': t.model_iphone || '-',
          'Jenis Mutasi': t.jenis,
          'Perubahan Stok': `${t.direction}${t.jumlah}`,
          'Stok Sebelum': t.stok_sebelum ?? '-',
          'Stok Sesudah': t.stok_sesudah ?? '-',
          'Alasan / No. Nota': t.alasan,
          'Keterangan': t.keterangan || '-',
          'Petugas': t.user_name,
          'Cabang Toko': `${storeName} (${storeBranch})`,
        }));
      } else if (reportType === 'RETURN') {
        exportRows = storeReturns.map((r, idx) => ({
          'No': idx + 1,
          'Tanggal Pengajuan': r.tanggal_pengajuan,
          'Kode Barang': r.kode_barang,
          'Nama Barang': r.nama_barang,
          'Model iPhone': r.model_iphone || '-',
          'Nama Customer': r.customer_name || '-',
          'No. HP Customer': r.customer_phone || '-',
          'Jumlah Return': r.jumlah,
          'Alasan Return': r.alasan_return || r.alasan,
          'Status': r.status,
          'Petugas Pengaju': r.dibuat_oleh_name || '-',
          'Cabang Toko': `${storeName} (${storeBranch})`,
        }));
      } else if (reportType === 'ABSENSI') {
        exportRows = storeAttendance.map((a, idx) => ({
          'No': idx + 1,
          'Tanggal': a.tanggal,
          'Nama Karyawan': a.user_name,
          'Cabang Toko': a.store_name || `${storeName} (${storeBranch})`,
          'Status Kehadiran': a.status,
          'Jam Masuk': a.jam_masuk || '-',
          'Jam Pulang': a.jam_pulang || a.jam_keluar || '-',
          'Keterangan / Catatan': a.catatan || a.keterangan || '-',
        }));
      }

      if (exportRows.length === 0) {
        showToast('Peringatan', 'Tidak ada data untuk diekspor pada rentang tanggal dan kategori yang dipilih.', 'warning');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan_${reportType}`);

      // Auto-size columns based on header length
      const maxColWidths = Object.keys(exportRows[0] || {}).map((k) => ({
        wch: Math.max(k.length + 3, 14),
      }));
      worksheet['!cols'] = maxColWidths;

      const filename = `Laporan_${reportType}_${storeName.replace(/\s+/g, '_')}_${startDate}_sd_${endDate}.xlsx`;
      XLSX.writeFile(workbook, filename);

      showToast(
        'Export Excel Berhasil',
        `File ${filename} berhasil diunduh (${exportRows.length} baris data).`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Export Gagal', 'Terjadi kesalahan saat mengekspor file Excel.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Laporan &amp; Rekapitulasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Unduh laporan stok, mutasi barang masuk/keluar/rusak, return, serta absensi seluruh cabang dalam format Excel spreadsheet (.xlsx).'
              : `Laporan operasional dan inventaris khusus ${currentStore?.nama_toko}${currentStore?.cabang && currentStore.cabang !== '0' && currentStore.cabang !== '()' && currentStore.cabang !== '(0)' ? ` (${currentStore.cabang})` : ''}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Jenis Laporan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Laporan</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-indigo-600 bg-white"
          >
            <option value="STOK">Laporan Stok Barang</option>
            <option value="MASUK">Laporan Barang Masuk</option>
            <option value="KELUAR">Laporan Barang Keluar</option>
            <option value="RUSAK">Laporan Barang Rusak</option>
            <option value="RETURN">Laporan Return</option>
            <option value="ABSENSI">Laporan Absensi Karyawan</option>
          </select>
        </div>

        {/* Pilih Toko - Only editable by Super Admin when in Dashboard Utama (activeStoreId === null) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <span>Cabang Toko</span>
          </label>
          {isSuperAdmin && !activeStoreId ? (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-indigo-600 bg-white"
            >
              <option value="ALL">Semua Cabang Toko</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_toko}{s.cabang && s.cabang !== '0' && s.cabang !== '()' && s.cabang !== '(0)' ? ` (${s.cabang})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">
                {currentStore?.nama_toko || activeStore?.nama_toko || 'Cabang Toko'}{(currentStore?.cabang || activeStore?.cabang) && (currentStore?.cabang || activeStore?.cabang) !== '0' && (currentStore?.cabang || activeStore?.cabang) !== '()' && (currentStore?.cabang || activeStore?.cabang) !== '(0)' ? ` (${currentStore?.cabang || activeStore?.cabang})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Tanggal Mulai */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 font-medium"
          />
        </div>

        {/* Tanggal Sampai */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Sampai</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 font-medium"
          />
        </div>
      </div>

      {/* Laporan Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Pratinjau Data: Laporan {reportType} &bull; {currentStore ? `${currentStore.nama_toko}${currentStore.cabang && currentStore.cabang !== '0' && currentStore.cabang !== '()' && currentStore.cabang !== '(0)' ? ` (${currentStore.cabang})` : ''}` : 'Semua Cabang'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Periode: {startDate} s/d {endDate}
          </span>
        </div>

        {/* TABEL LAPORAN STOK */}
        {reportType === 'STOK' && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Kode Barang</th>
                    <th className="py-3 px-4">Nama Suku Cadang</th>
                    <th className="py-3 px-4">Model iPhone</th>
                    <th className="py-3 px-4">Stok Saat Ini</th>
                    <th className="py-3 px-4">Batas Minimum</th>
                    <th className="py-3 px-4">Satuan</th>
                    <th className="py-3 px-4">Harga Beli</th>
                    <th className="py-3 px-4">Harga Jual</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tidak ada data stok di cabang ini.
                      </td>
                    </tr>
                  ) : (
                    storeInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{item.kode_barang}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.nama_barang}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{item.model_iphone}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{item.stok}</td>
                        <td className="py-3 px-4 text-slate-500">{item.stok_minimum}</td>
                        <td className="py-3 px-4 uppercase">{item.satuan}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{formatRupiah(item.harga_beli)}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{formatRupiah(item.harga_jual)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'AMAN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.status === 'MENIPIS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards STOK */}
            <div className="md:hidden p-3.5 space-y-3 bg-slate-50/60">
              {storeInventory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80 p-4">
                  Tidak ada data stok di cabang ini.
                </div>
              ) : (
                storeInventory.map((item) => (
                  <div key={item.id} className="p-4 space-y-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-indigo-600">{item.kode_barang}</span>
                        <h4 className="font-bold text-slate-900 text-xs">{item.nama_barang}</h4>
                        <span className="text-[11px] text-slate-500">{item.model_iphone}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        item.status === 'AMAN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.status === 'MENIPIS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Stok / Min:</span>
                        <span className="font-bold text-slate-800">{item.stok} {item.satuan} <span className="text-slate-400 font-normal">(Min: {item.stok_minimum})</span></span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Harga Jual:</span>
                        <span className="font-bold font-mono text-emerald-700">{formatRupiah(item.harga_jual)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TABEL LAPORAN BARANG MASUK / KELUAR / RUSAK */}
        {(reportType === 'MASUK' || reportType === 'KELUAR' || reportType === 'RUSAK') && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Tanggal / Jam</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4">Jumlah</th>
                    <th className="py-3 px-4">Alasan / No. Nota</th>
                    <th className="py-3 px-4">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeTransactions
                    .filter((t) => {
                      if (reportType === 'MASUK') return t.jenis === 'MASUK' || t.jenis === 'TAMBAH_STOK';
                      if (reportType === 'KELUAR') return t.jenis === 'KELUAR' || t.jenis === 'KURANGI_STOK';
                      if (reportType === 'RUSAK') return t.jenis === 'RUSAK';
                      return true;
                    })
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-500">{t.tanggal} {t.waktu}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{t.nama_barang}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{t.kode_barang}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {t.direction}{t.jumlah}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{t.alasan}</p>
                          <p className="text-[10px] text-slate-400">{t.keterangan || '-'}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.user_name}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Mutasi */}
            <div className="md:hidden p-3.5 space-y-3 bg-slate-50/60">
              {storeTransactions
                .filter((t) => {
                  if (reportType === 'MASUK') return t.jenis === 'MASUK' || t.jenis === 'TAMBAH_STOK';
                  if (reportType === 'KELUAR') return t.jenis === 'KELUAR' || t.jenis === 'KURANGI_STOK';
                  if (reportType === 'RUSAK') return t.jenis === 'RUSAK';
                  return true;
                })
                .map((t) => (
                  <div key={t.id} className="p-4 space-y-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400">{t.tanggal} {t.waktu}</span>
                        <h4 className="font-bold text-slate-900 text-xs">{t.nama_barang}</h4>
                        <span className="font-mono text-[10px] text-indigo-600">{t.kode_barang}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono shrink-0 ${
                        reportType === 'MASUK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        reportType === 'RUSAK' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {t.direction}{t.jumlah} unit
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Alasan:</span>
                        <span className="font-semibold text-slate-800">{t.alasan}</span>
                      </div>
                      {t.keterangan && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[10px]">Ket:</span>
                          <span className="text-slate-600">{t.keterangan}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 text-[10px]">Petugas:</span>
                        <span className="font-medium text-slate-700">{t.user_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* TABEL LAPORAN RETURN */}
        {reportType === 'RETURN' && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Tanggal Pengajuan</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Jumlah</th>
                    <th className="py-3 px-4">Alasan</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada data return pada rentang tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    storeReturns.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-500">{r.tanggal_pengajuan}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.nama_barang}</td>
                        <td className="py-3 px-4 text-slate-700">{r.customer_name || '-'} ({r.customer_phone || '-'})</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.jumlah} unit</td>
                        <td className="py-3 px-4 text-slate-600">{r.alasan_return || r.alasan}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'DITERIMA' ? 'bg-emerald-50 text-emerald-700' : r.status === 'MENUNGGU' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards RETURN */}
            <div className="md:hidden p-3.5 space-y-3 bg-slate-50/60">
              {storeReturns.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80 p-4">
                  Tidak ada data return pada rentang tanggal ini.
                </div>
              ) : (
                storeReturns.map((r) => (
                  <div key={r.id} className="p-4 space-y-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400">{r.tanggal_pengajuan}</span>
                        <h4 className="font-bold text-slate-900 text-xs">{r.nama_barang}</h4>
                        <span className="text-[11px] text-slate-500">{r.customer_name} ({r.customer_phone})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        r.status === 'DITERIMA' ? 'bg-emerald-50 text-emerald-700' : r.status === 'MENUNGGU' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Jumlah:</span>
                        <span className="font-bold text-slate-800">{r.jumlah} unit</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Alasan:</span>
                        <span className="text-slate-700">{r.alasan_return || r.alasan}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TABEL LAPORAN ABSENSI */}
        {reportType === 'ABSENSI' && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nama Karyawan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Jam Masuk</th>
                    <th className="py-3 px-4">Jam Pulang</th>
                    <th className="py-3 px-4">Catatan / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada data absensi pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    storeAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-500">{a.tanggal}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{a.user_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            a.status === 'HADIR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            a.status === 'TERLAMBAT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            a.status === 'IZIN' || a.status === 'SAKIT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{a.jam_masuk || '-'}</td>
                        <td className="py-3 px-4 font-mono">{a.jam_pulang || a.jam_keluar || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{a.catatan || a.keterangan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards ABSENSI */}
            <div className="md:hidden p-3.5 space-y-3 bg-slate-50/60">
              {storeAttendance.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80 p-4">
                  Tidak ada data absensi pada periode ini.
                </div>
              ) : (
                storeAttendance.map((a) => (
                  <div key={a.id} className="p-4 space-y-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400">{a.tanggal}</span>
                        <h4 className="font-bold text-slate-900 text-xs">{a.user_name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        a.status === 'HADIR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        a.status === 'TERLAMBAT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        a.status === 'IZIN' || a.status === 'SAKIT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Jam Masuk - Pulang:</span>
                        <span className="font-mono text-slate-800 font-semibold">{a.jam_masuk || '-'} - {a.jam_pulang || a.jam_keluar || '-'}</span>
                      </div>
                      { (a.catatan || a.keterangan) && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[10px]">Catatan:</span>
                          <span className="text-slate-600">{a.catatan || a.keterangan}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
