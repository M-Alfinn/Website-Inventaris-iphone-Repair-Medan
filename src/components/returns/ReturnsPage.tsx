import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ReturnItem, ReturnStatus } from '../../types';
import { RotateCcw, Plus, Search, CheckCircle2, XCircle, Clock, Check, X, Smartphone } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ComponentPicker } from '../common/ComponentPicker';

export const ReturnsPage: React.FC = () => {
  const { activeStore, activeStoreId, inventory, returns, createReturnRequest, processReturn, currentUser } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminToko = currentUser?.role === 'ADMIN_TOKO';
  const isKaryawan = currentUser?.role === 'KARYAWAN';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [customerName, setCustomerName] = useState('Budi Pratama');
  const [customerPhone, setCustomerPhone] = useState('081299887766');
  const [amount, setAmount] = useState<number | ''>(1);
  const [reason, setReason] = useState('LCD touchscreen ghost touch setelah 3 hari pemakaian');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'primary' | 'danger' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const storeInventory = inventory.filter((i) => i.store_id === activeStoreId);
  const storeReturns = returns
    .filter((r) => r.store_id === activeStoreId)
    .filter((r) =>
      r.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.kode_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.alasan_return.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleOpenAdd = () => {
    if (storeInventory.length > 0) {
      setSelectedInventoryId(storeInventory[0].id);
    }
    setAmount(1);
    setReason('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Math.max(1, Number(amount) || 1);
    if (!selectedInventoryId || finalAmount <= 0 || !reason.trim()) return;

    createReturnRequest(selectedInventoryId, customerName, customerPhone, finalAmount, reason);
    setIsModalOpen(false);
  };

  const handleProcessAction = (returnItem: ReturnItem, status: 'DITERIMA' | 'DITOLAK') => {
    const isApprove = status === 'DITERIMA';
    setConfirmModal({
      isOpen: true,
      title: isApprove ? 'Terima Klaim Return' : 'Tolak Klaim Return',
      message: isApprove
        ? `Apakah Anda yakin menyetujui klaim return ${returnItem.nama_barang} (${returnItem.jumlah} unit)? Stok inventaris toko akan otomatis bertambah.`
        : `Apakah Anda yakin menolak klaim return ${returnItem.nama_barang}? Alasan penolakan akan dicatat.`,
      variant: isApprove ? 'success' : 'danger',
      onConfirm: () => {
        processReturn(returnItem.id, status, isApprove ? 'Garansi valid disetujui admin' : 'Garansi void / segel rusak');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const renderStatus = (status: ReturnStatus) => {
    switch (status) {
      case 'MENUNGGU':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            MENUNGGU
          </span>
        );
      case 'DITERIMA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            DITERIMA
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            DITOLAK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              {activeStore?.nama_toko} ({activeStore?.cabang})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            {isKaryawan ? 'Riwayat Return Komponen iPhone' : 'Manajemen Return Komponen iPhone'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isKaryawan
              ? 'Riwayat catatan pengajuan klaim garansi dan pengembalian suku cadang pelanggan cabang ini.'
              : 'Kelola pengajuan klaim garansi sparepart pelanggan. Status: Menunggu, Diterima, Ditolak.'}
          </p>
        </div>

        {!isKaryawan && (
          <button
            id="btn-create-return"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isSuperAdmin ? 'Catat Return' : 'Buat Pengajuan Return'}</span>
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
              placeholder="Cari data return / nama customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {storeReturns.length} Pengajuan Return
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Tanggal Pengajuan</th>
                <th className="py-3.5 px-4 font-semibold">Komponen iPhone</th>
                <th className="py-3.5 px-4 font-semibold">Customer & Kontak</th>
                <th className="py-3.5 px-4 text-center font-semibold">Jumlah</th>
                <th className="py-3.5 px-4 font-semibold">Alasan Return</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Approval Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {storeReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Belum ada pengajuan return di cabang ini.
                  </td>
                </tr>
              ) : (
                storeReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {ret.tanggal_pengajuan}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 text-xs">{ret.nama_barang}</p>
                      <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px] font-bold mt-1 inline-block">
                        {ret.kode_barang}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800">{ret.customer_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{ret.customer_phone}</p>
                    </td>
                    <td className="py-4 px-4 text-center font-extrabold text-slate-900 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200/60">
                        {ret.jumlah} unit
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-slate-800 font-medium text-xs">{ret.alasan_return}</p>
                      {ret.catatan_approval && (
                        <p className="text-[10px] text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 mt-1 inline-block">
                          Ket: {ret.catatan_approval.replace(/\s*\(Disetujui\)/gi, '').trim()}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">{renderStatus(ret.status)}</td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      {ret.status === 'MENUNGGU' ? (
                        isSuperAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-approve-return-${ret.id}`}
                              onClick={() => handleProcessAction(ret, 'DITERIMA')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 cursor-pointer shadow-2xs transition-all"
                              title="Setujui dan tambah stok"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Terima</span>
                            </button>
                            <button
                              id={`btn-reject-return-${ret.id}`}
                              onClick={() => handleProcessAction(ret, 'DITOLAK')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer shadow-2xs transition-all"
                              title="Tolak klaim"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin" />
                            Menunggu Super Admin
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {ret.catatan_approval?.includes('Dicatat langsung') || ret.catatan_proses?.includes('Dicatat langsung')
                            ? 'Dicatat Super Admin'
                            : (ret.status === 'DITERIMA' ? 'Disetujui Super Admin' : 'Ditolak Super Admin')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden p-3.5 sm:p-4 space-y-3.5 bg-slate-50/50">
          {storeReturns.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
              Belum ada pengajuan return di cabang ini.
            </div>
          ) : (
            storeReturns.map((ret) => (
              <div key={ret.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                {/* Header card: Item info and status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{ret.nama_barang}</h4>
                    <span className="font-mono text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold mt-1.5 inline-block">
                      {ret.kode_barang}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div>{renderStatus(ret.status)}</div>
                    <span className="text-[11px] font-extrabold text-slate-800 mt-1 block">
                      {ret.jumlah} unit
                    </span>
                  </div>
                </div>

                {/* Customer Info Box */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Customer:</span>
                    <span className="font-bold text-slate-800">{ret.customer_name}</span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{ret.customer_phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Tgl Pengajuan:</span>
                    <span className="font-mono text-slate-700">{ret.tanggal_pengajuan}</span>
                  </div>
                </div>

                {/* Complaint box */}
                <div className="text-xs bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                  <span className="text-amber-900 font-bold block text-[11px]">Keluhan Customer:</span>
                  <p className="text-slate-700 text-xs mt-0.5">{ret.alasan_return}</p>
                  {ret.catatan_approval && (
                    <p className="text-[10px] text-blue-700 font-semibold mt-1.5 pt-1.5 border-t border-amber-200/60">
                      Catatan Admin: {ret.catatan_approval.replace(/\s*\(Disetujui\)/gi, '').trim()}
                    </p>
                  )}
                </div>

                {/* Actions for Mobile */}
                {ret.status === 'MENUNGGU' && isSuperAdmin && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      id={`mobile-btn-approve-return-${ret.id}`}
                      onClick={() => handleProcessAction(ret, 'DITERIMA')}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Terima Klaim</span>
                    </button>
                    <button
                      id={`mobile-btn-reject-return-${ret.id}`}
                      onClick={() => handleProcessAction(ret, 'DITOLAK')}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Tolak Klaim</span>
                    </button>
                  </div>
                )}
                {ret.status === 'MENUNGGU' && !isSuperAdmin && (
                  <div className="pt-2 border-t border-slate-100 text-center">
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" />
                      Menunggu Persetujuan Super Admin
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Add Return */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isSuperAdmin ? 'Catat Return Komponen' : 'Form Pengajuan Return'}
                  </h3>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Customer</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jumlah Unit</label>
                <input
                  type="number"
                  min="1"
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
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alasan Kerusakan / Komplain</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail kendala yang dialami customer saat masa garansi..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 font-medium"
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {isSuperAdmin ? 'Simpan & Setujui Return' : 'Ajukan Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
