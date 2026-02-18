'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/api';
import { Invoice, Order } from '@/lib/types';
import { AddInvoiceDialog } from '@/components/dialogs/AddInvoiceDialog';

export default function InvoicesPage() {
  const { pb, isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      console.log('[v0] Not authenticated or pb not ready');
      setLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      try {
        console.log('[v0] Fetching invoices...');
        setLoading(true);
        const [invoicesRes, ordersRes] = await Promise.all([
          pb.collection('invoices').getList(1, 100, {
            sort: '-invoice_date',
          }),
          pb.collection('orders').getList(1, 100, {
            sort: '-order_date',
          }),
        ]);
        console.log('[v0] Invoices fetched:', invoicesRes.items.length);
        setInvoices(invoicesRes.items as Invoice[]);
        setOrders(ordersRes.items as Order[]);
      } catch (error: any) {
        console.error('[v0] Fetch invoices error:', error.message);
        toast.error('Gagal memuat invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [isAuthenticated, pb]);

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    invoice.customer.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-400';
      case 'sent':
        return 'bg-blue-500/10 text-blue-400';
      case 'draft':
        return 'bg-slate-500/10 text-slate-400';
      case 'overdue':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const handleDelete = async (id: string) => {
    if (!pb) return;

    if (!confirm('Yakin ingin menghapus invoice ini?')) return;

    try {
      await pb.collection('invoices').delete(id);
      setInvoices(invoices.filter((inv) => inv.id !== id));
      toast.success('Invoice berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus invoice');
    }
  };

  return (
    <MainLayout title="Invoice">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div>
            {pb && <AddInvoiceDialog pb={pb} orders={orders} onInvoiceAdded={(invoice) => setInvoices([invoice, ...invoices])} />}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data invoice...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {invoices.length === 0
                ? 'Belum ada invoice'
                : 'Tidak ada invoice yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      No Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Pelanggan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Jatuh Tempo
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{invoice.invoice_number}</td>
                      <td className="px-6 py-4 text-slate-300">{invoice.customer}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
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
