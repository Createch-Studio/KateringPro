'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Supplier } from '@/lib/types';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { AddSupplierDialog } from '@/components/dialogs/AddSupplierDialog';

export default function SuppliersPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      console.log('[v0] Not authenticated or pb not ready');
      setLoading(false);
      return;
    }

    const fetchSuppliers = async () => {
      try {
        console.log('[v0] Fetching suppliers...');
        setLoading(true);
        const res = await pb.collection('suppliers').getList(1, 100);
        console.log('[v0] Suppliers fetched:', res.items.length);
        setSuppliers(res.items as Supplier[]);
      } catch (error: any) {
        console.error('[v0] Fetch suppliers error:', error.message);
        toast.error('Gagal memuat supplier');
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [isAuthenticated, pb]);

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    supplier.phone.toLowerCase().includes(search.toLowerCase())
  );

  const handleSupplierAdded = (supplier: Supplier) => {
    setSuppliers([supplier, ...suppliers]);
  };

  const handleDelete = async (id: string) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus supplier');
      return;
    }

    if (!confirm('Yakin ingin menghapus supplier ini?')) return;

    try {
      await pb.collection('suppliers').delete(id);
      setSuppliers(suppliers.filter((s) => s.id !== id));
      toast.success('Supplier berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus supplier');
    }
  };

  return (
    <MainLayout title="Supplier">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div className="ml-4">
            {pb && !isViewOnlyRole && (
              <AddSupplierDialog pb={pb} onSupplierAdded={handleSupplierAdded} />
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data supplier...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {suppliers.length === 0
                ? 'Belum ada data supplier'
                : 'Tidak ada supplier yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Kontak
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Telepon
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Kategori
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{supplier.name}</td>
                      <td className="px-6 py-4 text-slate-300">{supplier.contact_person || '-'}</td>
                      <td className="px-6 py-4 text-slate-300">{supplier.phone}</td>
                      <td className="px-6 py-4 text-slate-300">{supplier.email || '-'}</td>
                      <td className="px-6 py-4 text-slate-300 capitalize">
                        {supplier.category?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            supplier.is_active
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {supplier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        {!isViewOnlyRole && (
                          <>
                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(supplier.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
