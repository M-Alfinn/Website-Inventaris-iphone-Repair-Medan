import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { Tags, Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const CategoriesPage: React.FC = () => {
  const { categories, inventory, activeStore, activeStoreId, addCategory, updateCategory, deleteCategory, currentUser } = useApp();

  const isKaryawan = currentUser?.role === 'KARYAWAN';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    nama_kategori: '',
    deskripsi: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filtered categories strictly for the current active store
  const storeCategories = useMemo(() => {
    if (!activeStoreId) return [];
    return categories.filter((c) => c.store_id === activeStoreId);
  }, [categories, activeStoreId]);

  const filteredCategories = useMemo(() => {
    return storeCategories.filter((c) =>
      c.nama_kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [storeCategories, searchTerm]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ nama_kategori: '', deskripsi: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nama_kategori: category.nama_kategori,
      deskripsi: category.deskripsi,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kategori.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, formData.nama_kategori.trim(), formData.deskripsi.trim(), editingCategory.store_id || activeStoreId || undefined);
    } else {
      addCategory(formData.nama_kategori.trim(), formData.deskripsi.trim(), activeStoreId || undefined);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (category: Category) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Kategori',
      message: `Apakah Anda yakin ingin menghapus kategori "${category.nama_kategori}"? Barang dalam kategori ini tidak akan terhapus.`,
      onConfirm: () => {
        deleteCategory(category.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kategori Barang
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola pengelompokan suku cadang (LCD, Baterai, Kamera, Flexible, IC, Casing, dll).
          </p>
        </div>

        {!isKaryawan && (
          <button
            id="btn-add-category"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        )}
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-600 whitespace-nowrap shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
            <span>{storeCategories.length} Total Kategori</span>
          </span>
        </div>
      </div>

      {/* Grid of Categories / Empty State */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Tags className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {storeCategories.length === 0 ? 'Belum Ada Kategori' : 'Kategori Tidak Ditemukan'}
          </h3>
          <p className="text-xs text-slate-500">
            {storeCategories.length === 0
              ? 'Data kategori sparepart untuk cabang toko ini masih kosong. Klik Tambah Kategori untuk menambahkan kategori pertama.'
              : `Tidak ada kategori yang cocok dengan "${searchTerm}".`}
          </p>
          {!isKaryawan && storeCategories.length === 0 && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCategories.map((cat) => {
          const itemCount = inventory.filter(
            (i) => i.category_id === cat.id && i.store_id === activeStoreId
          ).length;

          return (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Tags className="w-4 h-4" />
                  </div>
                  {!isKaryawan && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900">{cat.nama_kategori}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {cat.deskripsi || 'Tidak ada deskripsi'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                <span className="text-slate-400">Barang di Toko ini:</span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                  {itemCount} item
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Add / Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: LCD & Touchscreen"
                  value={formData.nama_kategori}
                  onChange={(e) => setFormData({ ...formData, nama_kategori: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Cakupan
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi jenis komponen sparepart..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Simpan Kategori
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
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
