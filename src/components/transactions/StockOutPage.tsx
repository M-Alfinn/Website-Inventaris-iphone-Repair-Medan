import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowUpFromLine, Plus, Search, Smartphone } from 'lucide-react';
import { ComponentPicker } from '../common/ComponentPicker';

export const StockOutPage: React.FC = () => {
  const { activeStore, activeStoreId, inventory, transactions, recordStockOut, currentUser, showToast } = useApp();

  const isKaryawan = currentUser?.role === 'KARYAWAN';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [amount, setAmount] = useState<number | ''>(1);
  const [reason, setReason] = useState('Terjual / Service Ganti Sparepart');
  const [notes, setNotes] = useState('');

  const storeInventory = inventory.filter((i) => i.store_id === activeStoreId);
  const selectedItem = storeInventory.find((i) => i.id === selectedInventoryId);

  const stockOutTransactions = transactions
    .filter((t) => t.store_id === activeStoreId && (t.jenis === 'KELUAR' || t.jenis === 'KURANGI_STOK'))
    .filter((t) =>
      t.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.kode_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.model_iphone && t.model_iphone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.alasan.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleOpenModal = () => {
    if (storeInventory.length > 0) {
      setSelectedInventoryId(storeInventory[0].id);
    }
    setAmount(1);
    setReason('Terjual / Service Ganti Sparepart');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Math.max(1, Number(amount) || 1);
    if (!selectedInventoryId || finalAmount <= 0) return;

    if (selectedItem && selectedItem.stok < finalAmount) {
      showToast('Stok Tidak Cukup', `Stok ${selectedItem.nama_barang} tersisa ${selectedItem.stok}. Tidak dapat mengeluarkan ${finalAmount}.`, 'error');
      return;
    }

    recordStockOut(selectedInventoryId, finalAmount, reason, notes);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {activeStore?.nama_toko} ({activeStore?.cabang})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            {isKaryawan ? 'Riwayat Barang Keluar' : 'Barang Keluar (Penjualan & Pemakaian Servis)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isKaryawan
              ? 'Riwayat catatan pengeluaran suku cadang iPhone untuk nota servis customer atau retail.'
              : 'Pencatatan pengeluaran suku cadang iPhone untuk nota servis customer atau retail. Stok otomatis berkurang.'}
          </p>
        </div>

        {!isKaryawan && (
          <button
            id="btn-record-stock-out"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Barang Keluar</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari riwayat barang keluar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap shrink-0 self-end sm:self-auto">
            {stockOutTransactions.length} Transaksi Tercatat
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Tanggal Keluar</th>
                <th className="py-3.5 px-4 font-semibold">Komponen & Seri iPhone</th>
                <th className="py-3.5 px-4 text-center font-semibold">Jumlah</th>
                <th className="py-3.5 px-4 font-semibold">Perubahan Stok</th>
                <th className="py-3.5 px-4 font-semibold">Alasan / No. Nota</th>
                <th className="py-3.5 px-4 font-semibold">Petugas / Teknisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stockOutTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Belum ada riwayat transaksi barang keluar di toko ini.
                  </td>
                </tr>
              ) : (
                stockOutTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{trx.tanggal}</span>
                      <span className="text-slate-400 block text-[10px] mt-0.5">{trx.waktu}</span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 text-xs">{trx.nama_barang}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px] font-bold">
                          {trx.kode_barang}
                        </span>
                        {trx.model_iphone && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {trx.model_iphone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-extrabold text-xs border border-rose-200 shadow-2xs">
                        -{trx.jumlah}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px]">
                        <span>{trx.stok_sebelum}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="font-bold text-slate-900">{trx.stok_sesudah}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800 text-xs">{trx.alasan}</p>
                      {trx.keterangan && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{trx.keterangan}</p>}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/60">
                        {trx.user_name}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
          {stockOutTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
              Belum ada riwayat transaksi barang keluar di toko ini.
            </div>
          ) : (
            stockOutTransactions.map((trx) => (
              <div key={trx.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                {/* Header card: Item info and quantity badge */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{trx.nama_barang}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="font-mono text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                        {trx.kode_barang}
                      </span>
                      {trx.model_iphone && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {trx.model_iphone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-extrabold text-xs border border-rose-200 shadow-2xs">
                    -{trx.jumlah} unit
                  </span>
                </div>

                {/* Details box: Stock change & Date */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Perubahan Stok:</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {trx.stok_sebelum} &rarr; <b className="text-slate-900 font-bold">{trx.stok_sesudah}</b> unit
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Waktu Keluar:</span>
                    <span className="font-mono text-slate-700">{trx.tanggal} <span className="text-slate-400 font-normal">{trx.waktu}</span></span>
                  </div>
                </div>

                {/* Notes and Logger */}
                <div className="pt-1 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-[11px]">{trx.alasan}</p>
                      {trx.keterangan && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{trx.keterangan}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                      {trx.user_name}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Input Barang Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Input Komponen Keluar</h3>
                  <p className="text-[11px] text-slate-500">Cabang: {activeStore?.nama_toko}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto flex-1 pr-1 py-1">
              <ComponentPicker
                items={storeInventory}
                selectedId={selectedInventoryId}
                onSelect={(item) => setSelectedInventoryId(item ? item.id : '')}
                label="Pilih Komponen iPhone"
                required
              />

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Jumlah Keluar (Unit)</label>
                  {selectedItem && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      Maksimal: <strong className="text-slate-900">{selectedItem.stok}</strong>
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={selectedItem ? selectedItem.stok : 999}
                  required
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setAmount('');
                    } else {
                      const num = parseInt(val, 10);
                      setAmount(isNaN(num) ? '' : num);
                    }
                  }}
                  onBlur={() => {
                    if (amount === '' || Number(amount) < 1) {
                      setAmount(1);
                    }
                  }}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alasan / Keperluan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Terjual / Service Ganti LCD Customer"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Nota Servis / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="No. Nota servis / identitas customer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-100 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={Boolean(selectedItem && selectedItem.stok < Number(amount))}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Simpan Barang Keluar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
