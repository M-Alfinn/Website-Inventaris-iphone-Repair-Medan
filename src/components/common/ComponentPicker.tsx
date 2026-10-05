import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { Check, Layers, AlertCircle, ExternalLink } from 'lucide-react';

interface ComponentPickerProps {
  items: InventoryItem[];
  selectedId: string;
  onSelect: (item: InventoryItem | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export const ComponentPicker: React.FC<ComponentPickerProps> = ({
  items,
  selectedId,
  onSelect,
  label = 'Pilih Komponen iPhone',
  required = true,
  disabled = false,
}) => {
  const { categories, iphoneSeries, activeStoreId, navigateTo } = useApp();

  // Selected series state ('ALL' or specific series name)
  const [selectedSeries, setSelectedSeries] = useState<string>('ALL');

  // Extract unique series by combining master iphoneSeries (filtered by current store) and any series in items
  const availableSeries = useMemo(() => {
    const seriesSet = new Set<string>();
    // First priority: all registered master iPhone series for current store
    iphoneSeries
      .filter((s) => !activeStoreId || s.store_id === activeStoreId)
      .forEach((s) => {
        if (s.nama_seri && s.nama_seri.trim()) {
          seriesSet.add(s.nama_seri.trim());
        }
      });
    // Second priority: any items that have model_iphone
    items.forEach((item) => {
      if (item.model_iphone && item.model_iphone.trim()) {
        seriesSet.add(item.model_iphone.trim());
      }
    });
    return Array.from(seriesSet).sort((a, b) => a.localeCompare(b));
  }, [iphoneSeries, activeStoreId, items]);

  // Filtered items based on selected series
  const filteredItems = useMemo(() => {
    if (selectedSeries === 'ALL') {
      return items;
    }
    return items.filter((item) => item.model_iphone?.trim() === selectedSeries.trim());
  }, [items, selectedSeries]);

  // Selected item object
  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedId) || null;
  }, [items, selectedId]);

  // If currently selected item is outside the newly filtered series, automatically sync
  useEffect(() => {
    if (filteredItems.length > 0) {
      const isStillInList = filteredItems.some((i) => i.id === selectedId);
      if (!isStillInList && selectedSeries !== 'ALL') {
        onSelect(filteredItems[0]);
      }
    } else if (items.length > 0 && selectedSeries === 'ALL') {
      if (!selectedId) {
        onSelect(items[0]);
      }
    } else if (filteredItems.length === 0 && selectedSeries !== 'ALL') {
      onSelect(null);
    }
  }, [selectedSeries, filteredItems, selectedId, items, onSelect]);

  // Find category name helper
  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    return found ? found.nama_kategori : 'Sparepart';
  };

  return (
    <div className="space-y-2.5">
      {/* 1. Filter / Pilih Seri iPhone */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label} - Seri iPhone</span>
          <span className="text-[10px] font-normal text-slate-400">
            {availableSeries.length} Seri Terdaftar
          </span>
        </label>
        <select
          value={selectedSeries}
          onChange={(e) => setSelectedSeries(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-colors font-medium text-slate-800"
        >
          <option value="ALL">Semua Seri iPhone ({items.length} Komponen)</option>
          {availableSeries.map((series) => {
            const countInSeries = items.filter((i) => i.model_iphone?.trim() === series.trim()).length;
            return (
              <option key={series} value={series}>
                {series} ({countInSeries} Komponen)
              </option>
            );
          })}
        </select>
      </div>

      {/* 2. Pilih Komponen iPhone */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>Pilih Komponen Sparepart</span>
          <span className="text-[10px] font-normal text-slate-400">
            {filteredItems.length} pilihan
          </span>
        </label>
        <select
          value={selectedId}
          onChange={(e) => {
            const found = items.find((i) => i.id === e.target.value) || null;
            onSelect(found);
          }}
          required={required && filteredItems.length > 0}
          disabled={disabled || filteredItems.length === 0}
          className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-blue-600 focus:outline-none transition-colors font-medium text-slate-900"
        >
          {filteredItems.length === 0 ? (
            <option value="">
              {selectedSeries === 'ALL'
                ? 'Belum ada komponen di inventaris toko'
                : `Tidak ada komponen untuk katalog seri ${selectedSeries}`}
            </option>
          ) : (
            filteredItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama_barang} — {item.stok > 0 ? `Stok: ${item.stok}` : 'Habis (0)'}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Info Warning if series has no components yet */}
      {selectedSeries !== 'ALL' && filteredItems.length === 0 && (
        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-amber-900 text-[11px]">
              Belum ada komponen untuk katalog {selectedSeries} di cabang ini
            </p>
            <p className="text-[10px] text-amber-700 leading-snug">
              Silakan tambahkan komponen sparepart untuk seri ini di menu Inventaris agar dapat dipilih pada transaksi.
            </p>
            <button
              type="button"
              onClick={() => navigateTo('INVENTARIS')}
              className="mt-0.5 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Menu Inventaris</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Visual Preview Kartu Komponen Terpilih */}
      {selectedItem ? (
        <div className="p-2 sm:p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-blue-700 bg-white px-1.5 py-0.2 rounded border border-blue-200 shadow-2xs">
                {selectedItem.kode_barang}
              </span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                {selectedItem.model_iphone}
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:inline-flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-slate-400" />
                {getCategoryName(selectedItem.category_id)}
              </span>
            </div>
            <p className="font-bold text-slate-900 text-xs truncate">
              {selectedItem.nama_barang}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] text-slate-400 block font-medium leading-none mb-0.5">Stok:</span>
            <span
              className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                selectedItem.stok > 5
                  ? 'bg-emerald-100 text-emerald-800'
                  : selectedItem.stok > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {selectedItem.stok > 0 ? (
                <Check className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              <span>
                {selectedItem.stok} {selectedItem.satuan || 'Unit'}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="p-1.5 sm:p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-400 text-center">
          Pilih komponen iPhone di atas
        </div>
      )}
    </div>
  );
};
