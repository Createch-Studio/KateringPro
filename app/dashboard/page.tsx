'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { Order, DashboardStats, Payment } from '@/lib/types';
import { DollarSign, ShoppingCart, Clock, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const { pb, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedOrders: 0,
    monthlyRevenue: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pb || !isAuthenticated) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const ordersRes = await pb.collection('orders').getList(1, 50, {
          sort: '-order_date',
        });

        const invoicesRes = await pb.collection('invoices').getList(1, 100);

        const paymentsRes = await pb.collection('payments').getList(1, 500, {
          sort: '-payment_date',
        });

        const totalOrders = (ordersRes as any).totalItems ?? ordersRes.items.length;
        const completedOrders = ordersRes.items.filter(
          (o: any) => o.status === 'completed'
        ).length;
        const totalRevenue = (paymentsRes.items as Payment[]).reduce((sum, payment) => {
          if (payment.payment_type === 'refund') {
            return sum - (payment.amount || 0);
          }
          return sum + (payment.amount || 0);
        }, 0);

        const pendingPayments = invoicesRes.items.filter((inv: any) =>
          ['sent', 'overdue', 'partial'].includes(inv.status)
        ).length;

        const monthlyData: { [key: string]: { amount: number; date: Date } } = {};
        (ordersRes.items as Order[]).forEach((order) => {
          let rawDate = order.order_date || order.event_date || order.created;
          if (!rawDate) return;
          if (rawDate.includes(' ')) {
            rawDate = rawDate.replace(' ', 'T');
          }
          const date = new Date(rawDate);
          if (isNaN(date.getTime())) return;
          const monthKey = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
          const existing = monthlyData[monthKey];
          if (existing) {
            existing.amount += order.total || 0;
          } else {
            monthlyData[monthKey] = { amount: order.total || 0, date };
          }
        });

        const monthlyRevenue = Object.entries(monthlyData)
          .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
          .map(([month, value]) => ({
            month,
            amount: value.amount,
          }));

        setStats({
          totalOrders,
          totalRevenue,
          pendingPayments,
          completedOrders,
          monthlyRevenue,
          recentOrders: (ordersRes.items as Order[]).slice(0, 5),
        });
      } catch (error) {
        console.error('[v0] Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [pb, isAuthenticated]);

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ShoppingCart}
            label="Total Pesanan"
            value={stats.totalOrders}
            loading={loading}
          />
          <StatCard
            icon={DollarSign}
            label="Total Pendapatan"
            value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
            loading={loading}
          />
          <StatCard
            icon={Clock}
            label="Pembayaran Tertunda"
            value={stats.pendingPayments}
            loading={loading}
          />
          <StatCard
            icon={CheckCircle}
            label="Pesanan Selesai"
            value={stats.completedOrders}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrendChart data={stats.monthlyRevenue} />
          </div>
          <div>
            <RecentOrders orders={stats.recentOrders} loading={loading} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
