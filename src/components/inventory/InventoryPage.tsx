import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryItem, IPhoneSeries } from '../../types';
import { formatRupiah } from '../../mockData';
import {
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  Edit2,
  Trash2,
  History,
  Smartphone,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Table as TableIcon,
  Grid,
  ChevronDown
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const InventoryPage: React.FC = () => {
  const {
    stores,
    activeStore,
    activeStoreId,
    inventory,
    categories,
    iphoneSeries,
    transactions,
    currentUser,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock,
    addIphoneSeries,
    updateIphoneSeries,
    deleteIphoneSeries,
    showToast,
  } = useApp();

  const isKaryawan = currentUser?.role === 'KARYAWAN';

  // Navigation Level: 'SERIES_LIST' (Level 1) vs 'SERIES_COMPONENTS' (Level 2) vs 'ALL_TABLE' (Flat Table)
  const [viewMode, setViewMode] = useState<'SERIES_LIST' | 'ALL_TABLE'>('SERIES_LIST');
  const [selectedSeries, setSelectedSeries] = useState<IPhoneSeries | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Scroll to top only when entering or exiting a series drill-down, preserving position on viewMode switch
  useEffect(() => {
    if (selectedSeries) {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [selectedSeries]);

  // Modals
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [seriesEditing, setSeriesEditing] = useState<IPhoneSeries | null>(null);
  const [seriesForm, setSeriesForm] = useState({
    nama_seri: '',
    tahun_rilis: 2024,
    deskripsi: '',
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    kode_barang: '',
    nama_barang: '',
    model_iphone: 'iPhone 13',
    harga_beli: 400000,
    harga_jual: 600000,
    category_id: '',
    stok: 10,
    stok_minimum: 5,
    satuan: 'pcs',
    keterangan: '',
  });

  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [stockAdjustType, setStockAdjustType] = useState<'+' | '-'>('+');
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [stockAdjustAmount, setStockAdjustAmount] = useState<number | ''>(1);
  const [stockAdjustReason, setStockAdjustReason] = useState<string>('Restock barang');
  const [stockAdjustNotes, setStockAdjustNotes] = useState<string>('');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetItem, setHistoryTargetItem] = useState<InventoryItem | null>(null);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'primary' | 'danger' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filtered inventory for current store
  const storeInventory = useMemo(() => {
    return inventory.filter((item) => item.store_id === activeStoreId);
  }, [inventory, activeStoreId]);

  // Filtered iPhone series strictly for current store
  const storeIphoneSeries = useMemo(() => {
    if (!activeStoreId) return [];
    return iphoneSeries.filter((s) => s.store_id === activeStoreId);
  }, [iphoneSeries, activeStoreId]);

  // Filtered categories strictly for current store
  const storeCategories = useMemo(() => {
    if (!activeStoreId) return [];
    return categories.filter((c) => c.store_id === activeStoreId);
  }, [categories, activeStoreId]);

  // Metrics across whole store
  const storeMetrics = useMemo(() => {
    const totalComponents = storeInventory.length;
    const totalUnits = storeInventory.reduce((acc, curr) => acc + curr.stok, 0);
    const totalValuation = storeInventory.reduce((acc, curr) => acc + curr.stok * curr.harga_beli, 0);
    const lowStockCount = storeInventory.filter(
      (item) => item.status === 'MENIPIS' || item.status === 'HABIS'
    ).length;

    return { totalComponents, totalUnits, totalValuation, lowStockCount };
  }, [storeInventory]);

  // Series Cards List with Computed Stats per Series for Current Store
  const seriesWithStats = useMemo(() => {
    return storeIphoneSeries.map((series) => {
      const itemsInSeries = storeInventory.filter(
        (item) => item.model_iphone.toLowerCase() === series.nama_seri.toLowerCase()
      );
      const componentCount = itemsInSeries.length;
      const totalUnits = itemsInSeries.reduce((acc, curr) => acc + curr.stok, 0);
      const totalValuation = itemsInSeries.reduce((acc, curr) => acc + curr.stok * curr.harga_beli, 0);
      const hasLowStock = itemsInSeries.some(
        (item) => item.status === 'MENIPIS' || item.status === 'HABIS'
      );

      return {
        ...series,
        componentCount,
        totalUnits,
        totalValuation,
        hasLowStock,
      };
    });
  }, [storeIphoneSeries, storeInventory]);

  // Filtered Series List
  const filteredSeries = useMemo(() => {
    if (!searchTerm.trim()) return seriesWithStats;
    const q = searchTerm.toLowerCase();
    return seriesWithStats.filter(
      (s) =>
        s.nama_seri.toLowerCase().includes(q) ||
        (s.deskripsi && s.deskripsi.toLowerCase().includes(q))
    );
  }, [seriesWithStats, searchTerm]);

  // Filtered Components for Selected Series (Level 2) or All Table
  const componentsList = useMemo(() => {
    return storeInventory.filter((item) => {
      const matchSeries = selectedSeries
        ? item.model_iphone.toLowerCase() === selectedSeries.nama_seri.toLowerCase()
        : true;

      const matchSearch =
        item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model_iphone.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = categoryFilter === 'ALL' || item.category_id === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSeries && matchSearch && matchCategory && matchStatus;
    });
  }, [storeInventory, selectedSeries, searchTerm, categoryFilter, statusFilter]);

  // Handle Open Add Series
  const handleOpenAddSeries = () => {
    setSeriesEditing(null);
    setSeriesForm({
      nama_seri: '',
      tahun_rilis: new Date().getFullYear(),
      deskripsi: '',
    });
    setIsSeriesModalOpen(true);
  };

  // Handle Open Edit Series
  const handleOpenEditSeries = (series: IPhoneSeries) => {
    setSeriesEditing(series);
    setSeriesForm({
      nama_seri: series.nama_seri,
      tahun_rilis: series.tahun_rilis || 2024,
      deskripsi: series.deskripsi || '',
    });
    setIsSeriesModalOpen(true);
  };

  // Handle Save Series
  const handleSaveSeries = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesForm.nama_seri.trim()) return;

    if (seriesEditing) {
      updateIphoneSeries(seriesEditing.id, {
        nama_seri: seriesForm.nama_seri.trim(),
        tahun_rilis: Number(seriesForm.tahun_rilis),
        deskripsi: seriesForm.deskripsi.trim(),
        store_id: seriesEditing.store_id || activeStoreId || undefined,
      });
      // If currently selected, update active state
      if (selectedSeries?.id === seriesEditing.id) {
        setSelectedSeries((prev) =>
          prev
            ? {
                ...prev,
                nama_seri: seriesForm.nama_seri.trim(),
                tahun_rilis: Number(seriesForm.tahun_rilis),
                deskripsi: seriesForm.deskripsi.trim(),
              }
            : null
        );
      }
    } else {
      addIphoneSeries({
        nama_seri: seriesForm.nama_seri.trim(),
        tahun_rilis: Number(seriesForm.tahun_rilis),
        deskripsi: seriesForm.deskripsi.trim(),
        store_id: activeStoreId || undefined,
      });
    }

    setIsSeriesModalOpen(false);
  };

  // Handle Delete Series
  const handleDeleteSeries = (series: IPhoneSeries) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Seri iPhone',
      message: `Apakah Anda yakin ingin menghapus kolom seri "${series.nama_seri}"? Komponen yang sudah ada tidak akan hilang dari sistem.`,
      variant: 'danger',
      onConfirm: () => {
        deleteIphoneSeries(series.id);
        if (selectedSeries?.id === series.id) {
          setSelectedSeries(null);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Handle Open Add Component
  const handleOpenAddComponent = () => {
    if (isKaryawan) {
      showToast('Akses Dibatasi', 'Role Karyawan hanya memiliki hak untuk melihat stok dan riwayat mutasi.', 'warning');
      return;
    }
    setItemEditing(null);
    const targetModel = selectedSeries ? selectedSeries.nama_seri : (storeIphoneSeries[0]?.nama_seri || '');
    setItemForm({
      kode_barang: `CMP-${Math.floor(100 + Math.random() * 900)}`,
      nama_barang: '',
      model_iphone: targetModel,
      harga_beli: 350000,
      harga_jual: 550000,
      category_id: storeCategories[0]?.id || '',
      stok: 10,
      stok_minimum: 5,
      satuan: 'pcs',
      keterangan: '',
    });
    setIsItemModalOpen(true);
  };

  // Handle Open Edit Component
  const handleOpenEditComponent = (item: InventoryItem) => {
    if (isKaryawan) {
      showToast('Akses Dibatasi', 'Role Karyawan tidak memiliki hak untuk mengedit data master komponen.', 'warning');
      return;
    }
    setItemEditing(item);
    setItemForm({
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      model_iphone: item.model_iphone,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      category_id: item.category_id,
      stok: item.stok,
      stok_minimum: item.stok_minimum,
      satuan: item.satuan,
      keterangan: item.keterangan || '',
    });
    setIsItemModalOpen(true);
  };

  // Handle Save Component
  const handleSaveComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isKaryawan) return;
    if (!itemForm.nama_barang.trim()) return;

    if (itemEditing) {
      updateInventoryItem(itemEditing.id, {
        kode_barang: itemForm.kode_barang.trim(),
        nama_barang: itemForm.nama_barang.trim(),
        model_iphone: itemForm.model_iphone,
        category_id: itemForm.category_id,
        harga_beli: Number(itemForm.harga_beli),
        harga_jual: Number(itemForm.harga_jual),
        stok: Number(itemForm.stok),
        stok_minimum: Number(itemForm.stok_minimum),
        satuan: itemForm.satuan,
        keterangan: itemForm.keterangan.trim(),
      });
    } else {
      addInventoryItem({
        store_id: activeStoreId || (stores.length > 0 ? stores[0].id : ''),
        kode_barang: itemForm.kode_barang.trim(),
        nama_barang: itemForm.nama_barang.trim(),
        model_iphone: itemForm.model_iphone,
        category_id: itemForm.category_id,
        harga_beli: Number(itemForm.harga_beli),
        harga_jual: Number(itemForm.harga_jual),
        stok: Number(itemForm.stok),
        stok_minimum: Number(itemForm.stok_minimum),
        satuan: itemForm.satuan,
        keterangan: itemForm.keterangan.trim(),
      });
    }

    setIsItemModalOpen(false);
  };

  // Handle Delete Component
  const handleDeleteComponent = (item: InventoryItem) => {
    if (isKaryawan) {
      showToast('Akses Dibatasi', 'Role Karyawan tidak memiliki hak untuk menghapus data komponen.', 'warning');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Komponen',
      message: `Hapus komponen "${item.nama_barang}" (${item.model_iphone}) dari inventaris?`,
      variant: 'danger',
      onConfirm: () => {
        deleteInventoryItem(item.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Handle Stock Adjust Modal
  const handleOpenStockAdjust = (item: InventoryItem, type: '+' | '-') => {
    if (isKaryawan) {
      showToast('Akses Dibatasi', 'Role Karyawan hanya memiliki hak untuk melihat riwayat mutasi stok, bukan melakukan penyesuaian stok langsung.', 'warning');
      return;
    }
    setSelectedStockItem(item);
    setStockAdjustType(type);
    setStockAdjustAmount(1);
    setStockAdjustReason(type === '+' ? 'Restock Supplier / Barang Masuk' : 'Servis Selesai / Terjual');
    setStockAdjustNotes('');
    setIsStockAdjustModalOpen(true);
  };

  const handleSaveStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (isKaryawan) return;
    const finalAmount = Math.max(1, Number(stockAdjustAmount) || 1);
    if (!selectedStockItem || finalAmount <= 0) return;

    adjustStock(
      selectedStockItem.id,
      finalAmount,
      stockAdjustType,
      stockAdjustReason,
      stockAdjustNotes,
      stockAdjustType === '+' ? 'MASUK' : 'KELUAR'
    );

    setIsStockAdjustModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Inventaris Sparepart
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola katalog seri iPhone, daftar komponen LCD, baterai, kamera, dan penyesuaian stok per cabang.
          </p>
        </div>

        {/* Global Action Buttons */}
        {!isKaryawan && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-add-iphone-series"
              onClick={handleOpenAddSeries}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Katalog Seri</span>
            </button>

            <button
              id="btn-add-component-global"
              onClick={handleOpenAddComponent}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Komponen iPhone</span>
            </button>
          </div>
        )}
      </div>

      {/* Store Quick Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Seri Perangkat Terdaftar</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{storeIphoneSeries.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Model Seri Cabang</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Total Jenis Komponen</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{storeMetrics.totalComponents}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Di {activeStore?.nama_toko || 'Toko'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Total Stok Fisik</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{storeMetrics.totalUnits} <span className="text-xs font-normal text-slate-400">pcs</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Unit Tersedia</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-medium text-slate-500">Total Valuasi Aset</p>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate">
            {formatRupiah(storeMetrics.totalValuation)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Nilai Harga Beli</p>
        </div>
      </div>

      {/* LEVEL 1: LIST / BODY KOLOM SERI IPHONE (when no series is selected & in series mode) */}
      {!selectedSeries && viewMode === 'SERIES_LIST' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari seri (contoh: iPhone 13, 14 Pro, SE)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setViewMode('SERIES_LIST');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white shadow-xs cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Katalog Seri</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setViewMode('ALL_TABLE');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Semua Komponen (Tabel)</span>
              </button>
            </div>
          </div>

          {/* Grid / Empty State List Seri */}
          {filteredSeries.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {storeIphoneSeries.length === 0 ? 'Belum Ada Seri Terdaftar' : 'Seri Tidak Ditemukan'}
              </h3>
              <p className="text-xs text-slate-500">
                {storeIphoneSeries.length === 0
                  ? 'Data seri perangkat untuk cabang toko ini masih kosong. Klik Tambah Seri untuk mendaftarkan model seri baru.'
                  : `Tidak ada seri yang cocok dengan pencarian Anda.`}
              </p>
              {!isKaryawan && storeIphoneSeries.length === 0 && (
                <button
                  onClick={handleOpenAddSeries}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Seri Baru</span>
                </button>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSeries.map((series) => (
              <div
                key={series.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top row of card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {series.nama_seri}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Rilis {series.tahun_rilis || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Low stock badge */}
                    {series.hasLowStock && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Stok Menipis
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {series.deskripsi && (
                    <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                      {series.deskripsi}
                    </p>
                  )}

                  {/* Stats per Series */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2 rounded-lg bg-slate-50">
                      <p className="text-[10px] text-slate-400">Komponen</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {series.componentCount} jenis
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <p className="text-[10px] text-slate-400">Total Unit</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">
                        {series.totalUnits} pcs
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <p className="text-[10px] text-slate-400">Valuasi</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                        {formatRupiah(series.totalValuation)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {!isKaryawan && (
                      <>
                        <button
                          onClick={() => handleOpenEditSeries(series)}
                          title="Edit seri iPhone"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSeries(series)}
                          title="Hapus seri iPhone"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSeries(series);
                      setSearchTerm('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                  >
                    <span>Buka Komponen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* LEVEL 2: DAFTAR KOMPONEN DALAM SERI IPHONE TERPILIH */}
      {selectedSeries && (
        <div className="space-y-4">
          {/* Breadcrumb Header */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSelectedSeries(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/90 text-blue-700 hover:text-blue-800 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 group w-fit cursor-pointer"
                title="Kembali ke Daftar Semua Katalog Seri iPhone"
              >
                <span className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center transition-transform group-hover:-translate-x-0.5 shadow-2xs shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span>Kembali ke Katalog Seri</span>
              </button>

              <div className="border-l-0 sm:border-l sm:border-slate-200 sm:pl-3.5 pt-0.5 sm:pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Komponen: {selectedSeries.nama_seri}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold">
                    {selectedSeries.tahun_rilis}
                  </span>
                </div>
                {selectedSeries.deskripsi && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSeries.deskripsi}</p>
                )}
              </div>
            </div>

            {/* Actions for this series */}
            {!isKaryawan && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenAddComponent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Komponen Baru ({selectedSeries.nama_seri})</span>
                </button>

                <button
                  onClick={() => handleOpenEditSeries(selectedSeries)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Edit Info Seri
                </button>
              </div>
            )}
          </div>

          {/* Filter Toolbar within Series */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-2 flex-1 max-w-md w-full min-w-0">
              <div className="relative w-full min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari sparepart ${selectedSeries.nama_seri}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium min-w-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto min-w-0 max-w-full">
              <div className="relative flex items-center min-w-0 max-w-full w-full">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full min-w-0 max-w-full pl-2.5 pr-7 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-600 truncate appearance-none font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  {storeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_kategori}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2 pointer-events-none" />
              </div>

              <div className="relative flex items-center min-w-0 max-w-full w-full">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full min-w-0 max-w-full pl-2.5 pr-7 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-600 truncate appearance-none font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Status Stok</option>
                  <option value="AMAN">Stok Aman</option>
                  <option value="MENIPIS">Stok Menipis</option>
                  <option value="HABIS">Stok Habis</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table of Components in Selected Series */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold">
                    <th className="py-3.5 px-4 font-semibold">Kode</th>
                    <th className="py-3.5 px-4 font-semibold">Nama Komponen</th>
                    <th className="py-3.5 px-4 font-semibold">Kategori</th>
                    <th className="py-3.5 px-4 font-semibold">Harga Beli</th>
                    <th className="py-3.5 px-4 font-semibold">Harga Jual</th>
                    <th className="py-3.5 px-4 font-semibold">Stok</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    {!isKaryawan && (
                      <th className="py-3.5 px-4 text-right font-semibold">Aksi Stok & Kelola</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {componentsList.length === 0 ? (
                    <tr>
                      <td colSpan={isKaryawan ? 7 : 8} className="py-12 text-center text-slate-400">
                        Belum ada komponen sparepart terdaftar untuk {selectedSeries.nama_seri}.
                      </td>
                    </tr>
                  ) : (
                    componentsList.map((item) => {
                      const cat = categories.find((c) => c.id === item.category_id);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-bold">
                              {item.kode_barang}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-900 text-xs">{item.nama_barang}</p>
                            {item.keterangan && (
                              <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                                {item.keterangan}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200/60">
                              {cat?.nama_kategori || 'Komponen'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {formatRupiah(item.harga_beli)}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(item.harga_jual)}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <span className="text-sm font-bold text-slate-900">{item.stok}</span>{' '}
                            <span className="text-[11px] font-normal text-slate-400">{item.satuan}</span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {item.status === 'AMAN' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Aman
                              </span>
                            ) : item.status === 'MENIPIS' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Menipis (&lt;{item.stok_minimum})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Habis (0)
                              </span>
                            )}
                          </td>
                          {!isKaryawan && (
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenStockAdjust(item, '+')}
                                  title="Tambah Stok / Masuk"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenStockAdjust(item, '-')}
                                  title="Kurangi Stok / Keluar"
                                  className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditComponent(item)}
                                  title="Edit Komponen"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComponent(item)}
                                  title="Hapus Komponen"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
              {componentsList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  Belum ada komponen sparepart terdaftar untuk {selectedSeries.nama_seri}.
                </div>
              ) : (
                componentsList.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  return (
                    <div key={item.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                              {item.kode_barang}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">
                              {cat?.nama_kategori || 'Komponen'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs mt-1.5 leading-snug">{item.nama_barang}</h4>
                          {item.keterangan && (
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5">{item.keterangan}</p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          {item.status === 'AMAN' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Aman
                            </span>
                          ) : item.status === 'MENIPIS' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Menipis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Habis
                            </span>
                          )}
                          <p className="text-xs font-bold text-slate-900 mt-1">
                            Stok: <span className="text-blue-700 font-extrabold">{item.stok}</span> {item.satuan}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans font-medium">Harga Beli:</span>
                          <span className="text-slate-700 font-medium">{formatRupiah(item.harga_beli)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans font-medium">Harga Jual:</span>
                          <span className="text-emerald-700 font-bold">{formatRupiah(item.harga_jual)}</span>
                        </div>
                      </div>

                      {!isKaryawan && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenStockAdjust(item, '+')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah</span>
                            </button>
                            <button
                              onClick={() => handleOpenStockAdjust(item, '-')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs border border-amber-200 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                              <span>Kurang</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditComponent(item)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                              title="Edit Komponen"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComponent(item)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                              title="Hapus Komponen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLAT TABLE VIEW: SEMUA KOMPONEN */}
      {!selectedSeries && viewMode === 'ALL_TABLE' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0 max-w-full overflow-hidden">
            <div className="relative flex-1 max-w-md w-full min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari semua komponen (nama, seri, kode)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 min-w-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto min-w-0">
              <div className="relative flex items-center min-w-0 flex-1 sm:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full min-w-0 max-w-full pl-2.5 pr-7 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-600 truncate appearance-none font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  {storeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_kategori}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 absolute right-2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setViewMode('SERIES_LIST');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Katalog Seri</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold">
                    <th className="py-3.5 px-4 font-semibold">Kode</th>
                    <th className="py-3.5 px-4 font-semibold">Seri iPhone</th>
                    <th className="py-3.5 px-4 font-semibold">Nama Komponen</th>
                    <th className="py-3.5 px-4 font-semibold">Kategori</th>
                    <th className="py-3.5 px-4 font-semibold">Harga Beli</th>
                    <th className="py-3.5 px-4 font-semibold">Harga Jual</th>
                    <th className="py-3.5 px-4 font-semibold">Stok</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    {!isKaryawan && <th className="py-3.5 px-4 text-right font-semibold">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {componentsList.length === 0 ? (
                    <tr>
                      <td colSpan={isKaryawan ? 8 : 9} className="py-12 text-center text-slate-400">
                        Tidak ada komponen yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    componentsList.map((item) => {
                      const cat = categories.find((c) => c.id === item.category_id);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-bold">
                              {item.kode_barang}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 font-bold text-[11px]">
                              {item.model_iphone}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-900 text-xs">{item.nama_barang}</p>
                            {item.keterangan && (
                              <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">{item.keterangan}</p>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200/60">
                              {cat?.nama_kategori || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {formatRupiah(item.harga_beli)}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(item.harga_jual)}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <span className="text-sm font-bold text-slate-900">{item.stok}</span>{' '}
                            <span className="text-[11px] font-normal text-slate-400">{item.satuan}</span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {item.status === 'AMAN' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Aman
                              </span>
                            ) : item.status === 'MENIPIS' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Menipis
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Habis
                              </span>
                            )}
                          </td>
                          {!isKaryawan && (
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenStockAdjust(item, '+')}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 shadow-2xs transition-colors cursor-pointer"
                                  title="Tambah Stok"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenStockAdjust(item, '-')}
                                  className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 shadow-2xs transition-colors cursor-pointer"
                                  title="Kurang Stok"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditComponent(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                                  title="Edit Komponen"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComponent(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                                  title="Hapus Komponen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
              {componentsList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  Tidak ada komponen ditemukan.
                </div>
              ) : (
                componentsList.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  return (
                    <div key={item.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                              {item.model_iphone}
                            </span>
                            <span className="font-mono text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                              {item.kode_barang}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">
                              {cat?.nama_kategori || 'Komponen'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs mt-1.5 leading-snug">{item.nama_barang}</h4>
                        </div>

                        <div className="shrink-0 text-right">
                          {item.status === 'AMAN' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Aman
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Menipis
                            </span>
                          )}
                          <p className="text-xs font-bold text-slate-900 mt-1">
                            Stok: <span className="text-blue-700 font-extrabold">{item.stok}</span> {item.satuan}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans font-medium">Harga Beli:</span>
                          <span className="text-slate-700 font-medium">{formatRupiah(item.harga_beli)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans font-medium">Harga Jual:</span>
                          <span className="text-emerald-700 font-bold">{formatRupiah(item.harga_jual)}</span>
                        </div>
                      </div>

                      {!isKaryawan && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenStockAdjust(item, '+')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah</span>
                            </button>
                            <button
                              onClick={() => handleOpenStockAdjust(item, '-')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                              <span>Kurang</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditComponent(item)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                              title="Edit Komponen"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComponent(item)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                              title="Hapus Komponen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH / EDIT SERI IPHONE */}
      {isSeriesModalOpen && !isKaryawan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/90 my-auto max-h-[88dvh] sm:max-h-[82dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                {seriesEditing ? 'Edit Kolom Seri iPhone' : 'Tambah Kolom Seri iPhone Baru'}
              </h3>
              <button
                onClick={() => setIsSeriesModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSeries} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Seri iPhone
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: iPhone 16 Pro Max, iPhone SE 2022"
                    value={seriesForm.nama_seri}
                    onChange={(e) => setSeriesForm({ ...seriesForm, nama_seri: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Rilis
                  </label>
                  <input
                    type="number"
                    min={2007}
                    max={2030}
                    value={seriesForm.tahun_rilis}
                    onChange={(e) =>
                      setSeriesForm({ ...seriesForm, tahun_rilis: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi & Spesifikasi Singkat
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Layar Super Retina XDR OLED 6.7 inch, Chip Apple A17 Pro"
                    value={seriesForm.deskripsi}
                    onChange={(e) => setSeriesForm({ ...seriesForm, deskripsi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setIsSeriesModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 font-semibold text-white shadow-xs cursor-pointer transition-colors"
                >
                  {seriesEditing ? 'Simpan Perubahan' : 'Tambah Seri iPhone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH / EDIT KOMPONEN */}
      {isItemModalOpen && !isKaryawan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/90 my-auto max-h-[88dvh] sm:max-h-[82dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                {itemEditing ? 'Edit Komponen iPhone' : 'Tambah Komponen iPhone Baru'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveComponent} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Seri iPhone
                    </label>
                    <select
                      value={itemForm.model_iphone}
                      onChange={(e) => setItemForm({ ...itemForm, model_iphone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
                    >
                      {storeIphoneSeries.length === 0 && (
                        <option value="">-- Belum ada seri iPhone (buat seri dulu) --</option>
                      )}
                      {storeIphoneSeries.map((s) => (
                        <option key={s.id} value={s.nama_seri}>
                          {s.nama_seri}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kategori Komponen
                    </label>
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
                    >
                      {storeCategories.length === 0 && (
                        <option value="">-- Belum ada kategori (buat kategori dulu) --</option>
                      )}
                      {storeCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama_kategori}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-700 mb-1">Kode Barang</label>
                    <input
                      type="text"
                      value={itemForm.kode_barang}
                      onChange={(e) => setItemForm({ ...itemForm, kode_barang: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Komponen
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: LCD OLED GX Original, Baterai High Capacity"
                      value={itemForm.nama_barang}
                      onChange={(e) => setItemForm({ ...itemForm, nama_barang: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Harga Beli (Modal Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={itemForm.harga_beli}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, harga_beli: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Harga Jual / Servis (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={itemForm.harga_jual}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, harga_jual: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stok Awal</label>
                    <input
                      type="number"
                      min={0}
                      value={itemForm.stok}
                      onChange={(e) => setItemForm({ ...itemForm, stok: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stok Minimum</label>
                    <input
                      type="number"
                      min={1}
                      value={itemForm.stok_minimum}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, stok_minimum: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                    <input
                      type="text"
                      value={itemForm.satuan}
                      onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Keterangan / Kualitas / Catatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Grade A Original Quality, Garansi 1 Bulan"
                    value={itemForm.keterangan}
                    onChange={(e) => setItemForm({ ...itemForm, keterangan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow-xs cursor-pointer transition-colors"
                >
                  {itemEditing ? 'Simpan Perubahan' : 'Tambah Komponen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PENYESUAIAN STOK (+ / -) */}
      {isStockAdjustModalOpen && selectedStockItem && !isKaryawan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/90 my-auto max-h-[88dvh] sm:max-h-[82dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                {stockAdjustType === '+' ? 'Tambah Stok (Barang Masuk)' : 'Kurangi Stok (Keluar / Servis)'}
              </h3>
              <button
                onClick={() => setIsStockAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-900">{selectedStockItem.nama_barang}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedStockItem.model_iphone} &bull; Kode: {selectedStockItem.kode_barang}
                  </p>
                  <p className="text-xs font-semibold text-blue-700 mt-1">
                    Stok Saat Ini: {selectedStockItem.stok} {selectedStockItem.satuan}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jumlah {stockAdjustType === '+' ? 'Masuk' : 'Keluar'} ({selectedStockItem.satuan})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={stockAdjustType === '-' ? selectedStockItem.stok : 9999}
                    value={stockAdjustAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setStockAdjustAmount('');
                      } else {
                        const num = parseInt(val, 10);
                        setStockAdjustAmount(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (stockAdjustAmount === '' || Number(stockAdjustAmount) < 1) {
                        setStockAdjustAmount(1);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alasan</label>
                  <input
                    type="text"
                    value={stockAdjustReason}
                    onChange={(e) => setStockAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: No nota supplier / No invoice servis"
                    value={stockAdjustNotes}
                    onChange={(e) => setStockAdjustNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setIsStockAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-white cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl font-semibold text-white shadow-xs cursor-pointer transition-colors ${
                    stockAdjustType === '+'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Konfirmasi {stockAdjustType === '+' ? 'Tambah Stok' : 'Kurangi Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant || 'primary'}
      />
    </div>
  );
};
