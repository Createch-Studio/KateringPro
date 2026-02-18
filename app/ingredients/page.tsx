'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Ingredient, Supplier } from '@/lib/types';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/api';
import { AddIngredientDialog } from '@/components/dialogs/AddIngredientDialog';

export default function IngredientsPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      console.log('[v0] Not authenticated or pb not ready');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        console.log('[v0] Fetching ingredients and suppliers...');
        setLoading(true);

        // Fetch suppliers
        const suppliersRes = await pb.collection('suppliers').getList(1, 100);
        setSuppliers(suppliersRes.items as Supplier[]);

        // Fetch ingredients
        const res = await pb.collection('ingredients').getList(1, 100);
        console.log('[v0] Ingredients fetched:', res.items.length);
        setIngredients(res.items as Ingredient[]);
      } catch (error: any) {
        console.error('[v0] Fetch error:', error.message);
        toast.error('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, pb]);

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || '-';
  };

  const filteredIngredients = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(search.toLowerCase()) ||
    ingredient.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus bahan baku');
      return;
    }

    if (!confirm('Yakin ingin menghapus bahan baku ini?')) return;

    try {
      await pb.collection('ingredients').delete(id);
      setIngredients(ingredients.filter((i) => i.id !== id));
      toast.success('Bahan baku berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus bahan baku');
    }
  };

  return (
    <MainLayout title="Bahan Baku">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari bahan baku..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div>
            {pb && !isViewOnlyRole && (
              <AddIngredientDialog
                pb={pb}
                suppliers={suppliers}
                onIngredientAdded={(ingredient) => setIngredients([ingredient, ...ingredients])}
              />
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data bahan baku...</div>
          ) : filteredIngredients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {ingredients.length === 0
                ? 'Belum ada bahan baku'
                : 'Tidak ada bahan baku yang cocok dengan pencarian'}
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
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">
                      Stok
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">
                      Stok Min
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Harga Terakhir
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
                  {filteredIngredients.map((ingredient) => {
                    const isLowStock = ingredient.current_stock <= (ingredient.min_stock || 0);
                    return (
                      <tr
                        key={ingredient.id}
                        className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">{ingredient.name}</td>
                        <td className="px-6 py-4 text-slate-300 capitalize">
                          {ingredient.category?.replace(/_/g, ' ') || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{ingredient.unit}</td>
                        <td className="px-6 py-4 text-center font-semibold text-white">
                          {ingredient.current_stock}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300">
                          {ingredient.min_stock || 0}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {getSupplierName(ingredient.supplier_id || '')}
                        </td>
                        <td className="px-6 py-4 text-right text-white">
                          {formatCurrency(ingredient.last_price || 0)}
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
                                onClick={() => handleDelete(ingredient.id)}
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
