'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Edit2, Eye, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    invoice_date: '',
    due_date: '',
    status: 'draft' as Invoice['status'],
    amount: 0,
    tax_amount: 0,
    total_amount: 0,
    notes: '',
  });

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

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        invoice.customer.toLowerCase().includes(search.toLowerCase())
      ),
    [invoices, search]
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

  const getDateOnly = (value: string | undefined) => {
    if (!value) return '';
    let v = value;
    if (v.includes('T')) {
      v = v.split('T')[0];
    } else if (v.includes(' ')) {
      v = v.split(' ')[0];
    }
    if (v.length > 10) return v.slice(0, 10);
    return v;
  };

  const handleOpenEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditForm({
      invoice_date: getDateOnly(invoice.invoice_date),
      due_date: getDateOnly(invoice.due_date),
      status: invoice.status,
      amount: invoice.amount,
      tax_amount: invoice.tax_amount || 0,
      total_amount: invoice.total_amount,
      notes: invoice.notes || '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pb || !selectedInvoice) return;
    if (!editForm.invoice_date) {
      toast.error('Tanggal invoice wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        invoice_date: editForm.invoice_date,
        amount: editForm.amount,
        tax_amount: editForm.tax_amount || undefined,
        total_amount: editForm.total_amount,
        status: editForm.status,
        notes: editForm.notes.trim() || undefined,
      };
      if (editForm.due_date) {
        payload.due_date = editForm.due_date;
      } else {
        payload.due_date = null;
      }

      const updated = (await pb
        .collection('invoices')
        .update(selectedInvoice.id, payload)) as Invoice;

      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      toast.success('Invoice berhasil diperbarui');
      setEditOpen(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      console.error('[v0] Edit invoice error:', error);
      toast.error('Gagal memperbarui invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewOpen(true);
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    window.print();
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
                        <button
                          type="button"
                          onClick={() => handleOpenView(invoice)}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(invoice)}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            handlePrintInvoice();
                          }}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Printer size={16} />
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Invoice</DialogTitle>
              <DialogDescription className="text-slate-400">
                Perbarui informasi invoice.
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tanggal Invoice *
                    </label>
                    <Input
                      type="date"
                      value={editForm.invoice_date}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, invoice_date: e.target.value }))
                      }
                      disabled={saving}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Jatuh Tempo
                    </label>
                    <Input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, due_date: e.target.value }))
                      }
                      disabled={saving}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value as Invoice['status'],
                      }))
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Dikirim</option>
                    <option value="partial">Terbayar Sebagian</option>
                    <option value="paid">Lunas</option>
                    <option value="overdue">Terlambat</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nominal
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          amount: Number(e.target.value) || 0,
                          total_amount:
                            (Number(e.target.value) || 0) + (prev.tax_amount || 0),
                        }))
                      }
                      disabled={saving}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Pajak
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.tax_amount}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          tax_amount: Number(e.target.value) || 0,
                          total_amount:
                            prev.amount + (Number(e.target.value) || 0),
                        }))
                      }
                      disabled={saving}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Total
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.total_amount}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          total_amount: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={saving}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Catatan
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm min-h-[80px]"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setEditOpen(false)}
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Detail Invoice</DialogTitle>
              <DialogDescription className="text-slate-400">
                Ringkasan informasi invoice untuk keperluan review dan cetak.
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-400">Nomor Invoice</p>
                    <p className="text-lg font-semibold text-white">
                      {selectedInvoice.invoice_number}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Status</p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full font-medium mt-1 ${getStatusColor(
                        selectedInvoice.status
                      )}`}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Tanggal Invoice</p>
                    <p className="text-sm text-slate-200">
                      {formatDate(selectedInvoice.invoice_date)}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Jatuh Tempo</p>
                    <p className="text-sm text-slate-200">
                      {selectedInvoice.due_date
                        ? formatDate(selectedInvoice.due_date)
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-slate-400 mb-1">Pelanggan</p>
                  <p className="text-sm text-slate-200">
                    {selectedInvoice.customer || '-'}
                  </p>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between text-sm text-slate-200 mb-1">
                    <span>Nominal</span>
                    <span>{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-200 mb-1">
                    <span>Pajak</span>
                    <span>{formatCurrency(selectedInvoice.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-100 font-semibold mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-400 mb-1">Catatan</p>
                    <p className="text-sm text-slate-200 whitespace-pre-line">
                      {selectedInvoice.notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrintInvoice}
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    <Printer size={16} className="mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
