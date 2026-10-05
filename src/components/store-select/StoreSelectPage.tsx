import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  Package,
  Users
} from 'lucide-react';

export const StoreSelectPage: React.FC = () => {
  const { stores, currentUser, selectStore, inventory, users, navigateTo } = useApp();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">
              {stores.length} Cabang Tersedia
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            Pilih Toko / Cabang
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pilih cabang operasional untuk masuk ke dashboard inventaris, transaksi stok, absensi, dan laporan toko tersebut.
          </p>
        </div>
      </div>

      {/* Store Selection Grid / Empty State */}
      {stores.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <StoreIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Belum Ada Cabang Toko</h3>
            <p className="text-xs text-slate-500 mt-1">
              Data cabang toko saat ini masih kosong. Silakan tambahkan cabang toko baru melalui menu Manajemen Toko.
            </p>
          </div>
          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => navigateTo('TOKO')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>Tambah Cabang Toko</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stores.map((store) => {
          const storeItems = inventory.filter((item) => item.store_id === store.id);
          const storeUsers = users.filter((u) => u.store_id === store.id);
          const totalStockCount = storeItems.reduce((acc, curr) => acc + curr.stok, 0);

          const isRestricted =
            currentUser?.role !== 'SUPER_ADMIN' &&
            currentUser?.store_id &&
            currentUser.store_id !== store.id;

          return (
            <div
              key={store.id}
              id={`store-card-${store.id}`}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-150 flex flex-col justify-between group ${
                isRestricted
                  ? 'border-slate-200 opacity-50 bg-slate-50/70'
                  : 'border-slate-200 hover:shadow-md hover:border-blue-300'
              }`}
            >
              <div>
                {/* Store Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-2xs group-hover:border-blue-300 transition-colors">
                    {store.foto_profil || store.logo ? (
                      <img
                        src={store.foto_profil || store.logo}
                        alt={store.nama_toko}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <StoreIcon className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      store.status === 'AKTIF'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {store.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                  {store.nama_toko}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mb-3">
                  {store.cabang}
                </p>

                <div className="space-y-1 text-xs text-slate-500 mb-4">
                  <p className="flex items-center gap-1.5 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.alamat}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.nomor_telepon || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.jam_operasional}</span>
                  </p>
                </div>

                {/* Metrics Row inside Store Card */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 mb-4">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                      <Package className="w-3 h-3 text-slate-400" />
                      <span>Total Stok</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {totalStockCount} <span className="text-[11px] font-normal text-slate-400">unit</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Karyawan</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {storeUsers.length} <span className="text-[11px] font-normal text-slate-400">orang</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Action Button */}
              <div>
                {isRestricted ? (
                  <div className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Akses Dibatasi</span>
                  </div>
                ) : (
                  <button
                    id={`btn-enter-${store.id}`}
                    onClick={() => selectStore(store.id)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Masuk ke {store.nama_toko}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
