'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/api';
import { Expense } from '@/lib/types';
import { AddExpenseDialog } from '@/components/dialogs/AddExpenseDialog';

export default function ExpensesPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      console.log('[v0] Not authenticated or pb not ready');
      setLoading(false);
      return;
    }

    const fetchExpenses = async () => {
      try {
        console.log('[v0] Fetching expenses...');
        setLoading(true);
        const filters: string[] = [];
        if (startDate) {
          filters.push(`expense_date >= "${startDate} 00:00:00"`);
        }
        if (endDate) {
          filters.push(`expense_date <= "${endDate} 23:59:59"`);
        }

        const options: any = {
          sort: '-expense_date',
        };

        if (filters.length > 0) {
          options.filter = filters.join(' && ');
        }

        const res = await pb.collection('expenses').getList<Expense>(page, 10, options);
        console.log('[v0] Expenses fetched:', res.items.length);
        setExpenses(res.items as Expense[]);
        setTotalPages(res.totalPages || 1);
      } catch (error: any) {
        console.error('[v0] Fetch expenses error:', error.message);
        toast.error('Gagal memuat pengeluaran');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [isAuthenticated, pb, page, startDate, endDate]);

  const filteredExpenses = expenses.filter((expense) =>
    expense.category.toLowerCase().includes(search.toLowerCase()) ||
    expense.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleExpenseAdded = (expense: Expense) => {
    setPage(1);
    setExpenses((prev) => [expense, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus pengeluaran');
      return;
    }

    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;

    try {
      await pb.collection('expenses').delete(id);
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      toast.success('Pengeluaran berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  return (
    <MainLayout title="Pengeluaran">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">Total Pengeluaran</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">Jumlah Data</p>
            <p className="text-3xl font-bold text-orange-400">{filteredExpenses.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm font-medium mb-2">Rata-rata</p>
            <p className="text-3xl font-bold text-blue-400">
              {formatCurrency(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari pengeluaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div className="ml-4">
            {pb && !isViewOnlyRole && (
              <AddExpenseDialog pb={pb} onExpenseAdded={handleExpenseAdded} />
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="border-slate-700 text-slate-200 hover:bg-slate-800 w-full md:w-auto"
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data pengeluaran...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {expenses.length === 0
                ? 'Belum ada pengeluaran'
                : 'Tidak ada pengeluaran yang cocok dengan pencarian'}
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        Kategori
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        Deskripsi
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        Tanggal
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                        Nominal
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">{expense.category}</td>
                        <td className="px-6 py-4 text-slate-300">{expense.description}</td>
                        <td className="px-6 py-4 text-slate-300">
                          {expense.expense_date ? formatDate(expense.expense_date) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-white">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          {!isViewOnlyRole && (
                            <>
                              <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
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
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700">
                <p className="text-xs text-slate-400">
                  Halaman{' '}
                  <span className="font-semibold text-slate-200">
                    {page}
                  </span>{' '}
                  dari{' '}
                  <span className="font-semibold text-slate-200">
                    {totalPages}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= totalPages || loading}
                    onClick={() =>
                      setPage((prev) =>
                        totalPages > 0 ? Math.min(totalPages, prev + 1) : prev + 1
                      )
                    }
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
