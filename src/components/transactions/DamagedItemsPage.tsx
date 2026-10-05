import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertOctagon, Plus, Search, Smartphone } from 'lucide-react';
import { ComponentPicker } from '../common/ComponentPicker';

export const DamagedItemsPage: React.FC = () => {
  const { activeStore, activeStoreId, inventory, transactions, recordDamagedItem, currentUser, showToast } = useApp();

  const isKaryawan = currentUser?.role === 'KARYAWAN';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [amount, setAmount] = useState<number | ''>(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const storeInventory = inventory.filter((i) => i.store_id === activeStoreId);
  const selectedItem = storeInventory.find((i) => i.id === selectedInventoryId);

  const damagedTransactions = transactions
    .filter((t) => t.store_id === activeStoreId && t.jenis === 'RUSAK')
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
    setReason('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Math.max(1, Number(amount) || 1);
    if (!selectedInventoryId || finalAmount <= 0) return;

    if (selectedItem && selectedItem.stok < finalAmount) {
      showToast('Stok Tidak Cukup', `Stok barang tersisa ${selectedItem.stok}.`, 'error');
      return;
    }

    recordDamagedItem(selectedInventoryId, finalAmount, reason, notes);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              {activeStore?.nama_toko} ({activeStore?.cabang})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            {isKaryawan ? 'Riwayat Barang Rusak' : 'Barang Rusak (Defect / Reject Komponen)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isKaryawan
              ? 'Riwayat catatan suku cadang iPhone cacat pabrik, rusak saat pemasangan teknisi, atau gagal QC.'
              : 'Pencatatan suku cadang iPhone cacat pabrik, pecah saat pemasangan teknisi, atau gagal QC. Stok otomatis dikurangi.'}
          </p>
        </div>

        {!isKaryawan && (
          <button
            id="btn-record-damaged-item"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Komponen Rusak</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari data barang rusak..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {damagedTransactions.length} Kasus Kerusakan
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Tanggal Rusak</th>
                <th className="py-3.5 px-4 font-semibold">Komponen & Seri iPhone</th>
                <th className="py-3.5 px-4 text-center font-semibold">Jumlah Rusak</th>
                <th className="py-3.5 px-4 font-semibold">Alasan / Penyebab Kerusakan</th>
                <th className="py-3.5 px-4 font-semibold">Keterangan / Tindak Lanjut</th>
                <th className="py-3.5 px-4 font-semibold">Pelapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {damagedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada catatan barang rusak di toko ini.
                  </td>
                </tr>
              ) : (
                damagedTransactions.map((trx) => (
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
                        -{trx.jumlah} Unit
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-rose-950 max-w-xs">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-50/70 border border-rose-200/60 text-rose-900 font-bold text-xs">
                        {trx.alasan}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-xs">
                      <p className="text-[11px] line-clamp-2">{trx.keterangan || '-'}</p>
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
          {damagedTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
              Tidak ada catatan barang rusak di toko ini.
            </div>
          ) : (
            damagedTransactions.map((trx) => (
              <div key={trx.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                {/* Header card: Item info and damage count */}
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
                    -{trx.jumlah} rusak
                  </span>
                </div>

                {/* Defect description box */}
                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 space-y-1">
                  <p className="font-bold text-rose-900 text-xs">{trx.alasan}</p>
                  {trx.keterangan && <p className="text-[11px] text-rose-700 mt-0.5">{trx.keterangan}</p>}
                </div>

                {/* Footer info: Date and Reporter */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="font-mono text-[10px] text-slate-500">{trx.tanggal} <span className="text-slate-400">{trx.waktu}</span></span>
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/60">
                    Pelapor: {trx.user_name}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Input Barang Rusak */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Input Komponen Rusak</h3>
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
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jumlah Rusak (Unit)</label>
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
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alasan Kerusakan / Gejala Defect</label>
                <input
                  type="text"
                  required
                  placeholder="Layar blank / crack mikroskopis / flexibel sobek..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan / Rencana Tindak Lanjut</label>
                <textarea
                  rows={2}
                  placeholder="Klaim retur distributor atau pemusnahan unit..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-600 font-medium"
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
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Simpan Barang Rusak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
