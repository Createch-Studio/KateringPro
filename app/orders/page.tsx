'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Order, Customer } from '@/lib/types';
import { formatDate, getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { AddOrderDialog } from '@/components/dialogs/AddOrderDialog';
import { EditOrderDialog } from '@/components/dialogs/EditOrderDialog';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function OrdersPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
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

    const fetchData = async () => {
      try {
        console.log('[v0] Fetching orders and customers...');
        setLoading(true);

        const customersRes = await pb.collection('customers').getList(1, 100);
        setCustomers(customersRes.items as Customer[]);

        const filters: string[] = [];
        if (startDate) {
          filters.push(`order_date >= "${startDate} 00:00:00"`);
        }
        if (endDate) {
          filters.push(`order_date <= "${endDate} 23:59:59"`);
        }

        const options: any = {
          sort: '-order_date',
        };

        if (filters.length > 0) {
          options.filter = filters.join(' && ');
        }

        const ordersRes = await pb.collection('orders').getList<Order>(page, 10, options);
        console.log('[v0] Orders fetched:', ordersRes.items.length);
        setOrders(ordersRes.items as Order[]);
        setTotalPages(ordersRes.totalPages || 1);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat data');
        console.error('[v0] Fetch error:', message);
        toast.error(`Gagal memuat data: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, pb, page, startDate, endDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400';
      case 'confirmed':
        return 'bg-blue-500/10 text-blue-400';
      case 'draft':
        return 'bg-slate-500/10 text-slate-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const handleOrderAdded = (newOrder: Order) => {
    setPage(1);
    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus pesanan');
      return;
    }

    if (!confirm('Yakin ingin menghapus pesanan ini?')) return;

    try {
      await pb.collection('orders').delete(id);
      setOrders((prev) => prev.filter((order) => order.id !== id));
      toast.success('Pesanan berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete order error:', error);
      toast.error('Gagal menghapus pesanan');
    }
  };

  return (
    <MainLayout title="Pesanan">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">📋 Data Pesanan</h2>
          <div>
            {pb && !isViewOnlyRole && (
              <AddOrderDialog pb={pb} customers={customers} onOrderAdded={handleOrderAdded} />
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
            <div className="p-8 text-center text-slate-400">Memuat data pesanan...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Belum ada pesanan</div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        No Order
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                        Tanggal
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">{order.order_number}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          Rp {(order.total || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {order.order_date || order.created
                            ? formatDate(order.order_date || order.created)
                            : '-'}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          {pb && !isViewOnlyRole && (
                            <>
                              <EditOrderDialog
                                pb={pb}
                                order={order}
                                customers={customers}
                                onOrderUpdated={(updated) =>
                                  setOrders((prev) =>
                                    prev.map((o) =>
                                      o.id === updated.id ? (updated as Order) : o
                                    )
                                  )
                                }
                              />
                              <button
                                type="button"
                                onClick={() => handleDelete(order.id)}
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
