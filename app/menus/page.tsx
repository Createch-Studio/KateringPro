'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { MenuItem, MenuCategory } from '@/lib/types';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/api';
import { AddMenuDialog } from '@/components/dialogs/AddMenuDialog';

export default function MenusPage() {
  const { pb, isAuthenticated } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch categories
        const categoriesRes = await pb.collection('menu_categories').getList(1, 100);
        setCategories(categoriesRes.items as MenuCategory[]);

        // Fetch menu items
        const itemsRes = await pb.collection('menus').getList(1, 100);
        setMenuItems(itemsRes.items as MenuItem[]);
      } catch (error: any) {
        console.error('[v0] Fetch menu error:', error.message);
        toast.error(`Gagal memuat menu: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, pb]);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Uncategorized';
  };

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!pb) return;

    if (!confirm('Yakin ingin menghapus menu ini?')) return;

    try {
      await pb.collection('menu_items').delete(id);
      setMenuItems(menuItems.filter((item) => item.id !== id));
      toast.success('Menu berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus menu');
    }
  };

  const handleMenuAdded = (newMenu: MenuItem) => {
    setMenuItems([newMenu, ...menuItems]);
  };

  return (
    <MainLayout title="Menu & Paket">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div className="ml-4">
            {pb && <AddMenuDialog pb={pb} categories={categories} onMenuAdded={handleMenuAdded} />}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data menu...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {menuItems.length === 0
                ? 'Belum ada menu'
                : 'Tidak ada menu yang cocok dengan pencarian'}
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
                      Kategori
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Satuan
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Harga
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
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                      <td className="px-6 py-4 text-slate-300">{getCategoryName(item.category_id)}</td>
                      <td className="px-6 py-4 text-slate-300">{item.unit}</td>
                      <td className="px-6 py-4 text-right text-white font-semibold">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            item.is_active
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
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
