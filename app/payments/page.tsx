'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { Payment, Invoice, Order } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getPocketBaseErrorMessage } from '@/lib/api';

export default function PaymentsPage() {
  const { pb, isAuthenticated } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'cash' as Payment['method'],
    reference_number: '',
    bank_name: '',
    payment_type: 'full_payment' as Payment['payment_type'],
    notes: '',
    invoice_id: '',
    order_id: '',
  });

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [paymentsRes, invoicesRes, ordersRes] = await Promise.all([
          pb.collection('payments').getList(1, 200, {
            sort: '-payment_date',
          }),
          pb.collection('invoices').getList(1, 200, {
            sort: '-invoice_date',
          }),
          pb.collection('orders').getList(1, 200, {
            sort: '-order_date',
          }),
        ]);

        setPayments(paymentsRes.items as Payment[]);
        setInvoices(invoicesRes.items as Invoice[]);
        setOrders(ordersRes.items as Order[]);
      } catch (error) {
        console.error('[v0] Payments fetch error:', error);
        toast.error('Gagal memuat data pembayaran');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pb, isAuthenticated]);

  const filteredPayments = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return payments;

    return payments.filter((p) => {
      const ref = p.reference_number?.toLowerCase() || '';
      const notes = p.notes?.toLowerCase() || '';
      return ref.includes(term) || notes.includes(term);
    });
  }, [payments, search]);

  const getMethodLabel = (method: Payment['method']) => {
    switch (method) {
      case 'cash':
        return 'Tunai';
      case 'transfer_bank':
        return 'Transfer Bank';
      case 'qris':
        return 'QRIS';
      case 'giro':
        return 'Giro';
      case 'cheque':
        return 'Cek';
      default:
        return method;
    }
  };

  const getPaymentTypeLabel = (type: Payment['payment_type']) => {
    switch (type) {
      case 'down_payment':
        return 'DP';
      case 'installment':
        return 'Cicilan';
      case 'full_payment':
        return 'Pelunasan';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };

  const handleOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      payment_date: new Date().toISOString().split('T')[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pb) return;

    if (!formData.invoice_id && !formData.order_id) {
      toast.error('Pilih minimal satu: invoice atau order');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Jumlah pembayaran harus lebih dari 0');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<Payment> = {
        payment_date: formData.payment_date,
        amount: formData.amount,
        method: formData.method,
        reference_number: formData.reference_number || undefined,
        bank_name: formData.bank_name || undefined,
        payment_type: formData.payment_type,
        notes: formData.notes || undefined,
      };

      if (formData.invoice_id) {
        payload.invoice_id = formData.invoice_id;
      }
      if (formData.order_id) {
        payload.order_id = formData.order_id;
      }

      const created = await pb.collection('payments').create(payload);
      setPayments((prev) => [created as Payment, ...prev]);
      toast.success('Pembayaran berhasil dicatat');
      setAddOpen(false);
    } catch (error: any) {
      console.error('[v0] Create payment error:', error);
      const message = getPocketBaseErrorMessage(error);
      toast.error(message || 'Gagal mencatat pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const getLinkedInvoice = (payment: Payment) => {
    if (!payment.invoice_id) return undefined;
    return invoices.find((inv) => inv.id === payment.invoice_id);
  };

  const getLinkedOrder = (payment: Payment) => {
    if (!payment.order_id) return undefined;
    return orders.find((o) => o.id === payment.order_id);
  };

  return (
    <MainLayout title="Pembayaran">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <Input
                placeholder="Cari berdasarkan referensi atau catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div>
            <Dialog open={addOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={16} />
                  Tambah Pembayaran
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Tambah Pembayaran</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Catat pembayaran untuk invoice atau order.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Tanggal Pembayaran *
                      </label>
                      <Input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_date: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Metode Pembayaran *
                      </label>
                      <select
                        value={formData.method}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            method: e.target.value as Payment['method'],
                          }))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="cash">Tunai</option>
                        <option value="transfer_bank">Transfer Bank</option>
                        <option value="qris">QRIS</option>
                        <option value="giro">Giro</option>
                        <option value="cheque">Cek</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Jenis Pembayaran *
                      </label>
                      <select
                        value={formData.payment_type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_type: e.target.value as Payment['payment_type'],
                          }))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="down_payment">DP</option>
                        <option value="installment">Cicilan</option>
                        <option value="full_payment">Pelunasan</option>
                        <option value="refund">Refund</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Jumlah Pembayaran (Rp) *
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.amount || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            amount: Number(e.target.value) || 0,
                          }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Invoice (opsional)
                      </label>
                      <select
                        value={formData.invoice_id}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            invoice_id: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="">Pilih invoice...</option>
                        {invoices.map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.invoice_number} - {formatCurrency(invoice.total_amount)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Order (opsional)
                      </label>
                      <select
                        value={formData.order_id}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            order_id: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="">Pilih order...</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.order_number} - {formatCurrency(order.total || 0)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        No Referensi
                      </label>
                      <Input
                        placeholder="No rekening, ID transaksi, dll"
                        value={formData.reference_number}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            reference_number: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nama Bank
                      </label>
                      <Input
                        placeholder="Nama bank (jika transfer)"
                        value={formData.bank_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bank_name: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Catatan
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
                      placeholder="Catatan tambahan (opsional)"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddOpen(false)}
                      className="border-slate-600 text-slate-200 hover:bg-slate-800"
                      disabled={submitting}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={submitting}
                    >
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Simpan
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat data pembayaran...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {payments.length === 0
                ? 'Belum ada pembayaran yang tercatat'
                : 'Tidak ada pembayaran yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Referensi
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Terkait
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Metode
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Jenis
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Jumlah
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const invoice = getLinkedInvoice(payment);
                    const order = getLinkedOrder(payment);
                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-slate-200 text-sm">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-6 py-3 text-slate-300 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {payment.reference_number || '-'}
                            </span>
                            {payment.bank_name && (
                              <span className="text-xs text-slate-400">
                                {payment.bank_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-300 text-sm">
                          <div className="flex flex-col">
                            {invoice && (
                              <span>
                                Invoice: <span className="font-medium">{invoice.invoice_number}</span>
                              </span>
                            )}
                            {order && (
                              <span>
                                Order: <span className="font-medium">{order.order_number}</span>
                              </span>
                            )}
                            {!invoice && !order && <span className="text-slate-500">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-300 text-sm">
                          {getMethodLabel(payment.method)}
                        </td>
                        <td className="px-6 py-3 text-slate-300 text-sm">
                          {getPaymentTypeLabel(payment.payment_type)}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-white text-sm">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-3 text-slate-300 text-sm max-w-xs">
                          <span className="line-clamp-2">
                            {payment.notes || '-'}
                          </span>
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
