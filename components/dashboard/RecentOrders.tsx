import { Order } from '@/lib/types';
import Link from 'next/link';
import { formatDate } from '@/lib/api';

interface RecentOrdersProps {
  orders: Order[];
  loading?: boolean;
}

export function RecentOrders({ orders, loading }: RecentOrdersProps) {
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

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-bold text-white mb-4">Pesanan Terbaru</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-800 rounded animate-pulse"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">Belum ada pesanan</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href="/orders"
              className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors truncate">
                  {order.order_number}
                </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(order.order_date || order.created)}
                    </p>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-bold text-white">
                  Rp {(order.total || 0).toLocaleString('id-ID')}
                </p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
