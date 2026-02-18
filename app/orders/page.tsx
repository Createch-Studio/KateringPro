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

export default function OrdersPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch customers
        const customersRes = await pb.collection('customers').getList(1, 100);
        setCustomers(customersRes.items as Customer[]);

        // Fetch orders
        const ordersRes = await pb.collection('orders').getList(1, 50, {
          sort: '-order_date',
        });
        console.log('[v0] Orders fetched:', ordersRes.items.length);
        setOrders(ordersRes.items as Order[]);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat data');
        console.error('[v0] Fetch error:', message);
        toast.error(`Gagal memuat data: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, pb]);

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
    setOrders([newOrder, ...orders]);
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
      setOrders(orders.filter((order) => order.id !== id));
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

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data pesanan...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Belum ada pesanan</div>
          ) : (
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
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        Rp {(order.total || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {order.order_date || order.created ? formatDate(order.order_date || order.created) : '-'}
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        {pb && !isViewOnlyRole && (
                          <>
                            <EditOrderDialog
                              pb={pb}
                              order={order}
                              customers={customers}
                              onOrderUpdated={(updated) =>
                                setOrders(
                                  orders.map((o) => (o.id === updated.id ? (updated as Order) : o))
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
          )}
        </div>
      </div>
    </MainLayout>
  );
}
