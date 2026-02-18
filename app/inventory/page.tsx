'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Ingredient } from '@/lib/types';

export default function InventoryPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      console.log('[v0] Not authenticated or pb not ready');
      setLoading(false);
      return;
    }

    const fetchItems = async () => {
      try {
        console.log('[v0] Fetching inventory items (ingredients)...');
        setLoading(true);
        const res = await pb.collection('ingredients').getList(1, 100);
        console.log('[v0] Inventory items fetched:', res.items.length);
        setItems(res.items as Ingredient[]);
      } catch (error: any) {
        console.error('[v0] Fetch inventory error:', error.message);
        toast.error('Gagal memuat data stok');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [isAuthenticated, pb]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus item stok');
      return;
    }

    if (!confirm('Yakin ingin menghapus item stok ini?')) return;

    try {
      await pb.collection('ingredients').delete(id);
      setItems(items.filter((item) => item.id !== id));
      toast.success('Item stok berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus item stok');
    }
  };

  return (
    <MainLayout title="Stok & Gudang">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari item stok..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data stok...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {items.length === 0
                ? 'Belum ada item stok'
                : 'Tidak ada item yang cocok dengan pencarian'}
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
                      Satuan
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">
                      Stok
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">
                      Stok Min
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
                  {filteredItems.map((item) => {
                    const isLowStock =
                      item.current_stock <= (item.min_stock || 0);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                        <td className="px-6 py-4 text-slate-300">
                          {item.unit}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-white">
                          {item.current_stock}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300">
                          {item.min_stock || 0}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              isLowStock
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-green-500/10 text-green-400'
                            }`}
                          >
                            {isLowStock ? 'Rendah' : 'OK'}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          {!isViewOnlyRole && (
                            <>
                              <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
