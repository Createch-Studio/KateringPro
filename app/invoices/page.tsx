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
import { Customer, Invoice, Order } from '@/lib/types';
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
    notes: '',
  });
  const [editTaxEnabled, setEditTaxEnabled] = useState(false);
  const [editTaxPercent, setEditTaxPercent] = useState(11);

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
    const baseAmount = invoice.amount || 0;
    const baseTax = invoice.tax_amount || 0;
    const enabled = baseTax > 0;
    let percent = 11;
    if (enabled && baseAmount > 0) {
      percent = Math.round((baseTax / baseAmount) * 100);
    }
    setEditTaxEnabled(enabled);
    setEditTaxPercent(percent);
    setEditForm({
      invoice_date: getDateOnly(invoice.invoice_date),
      due_date: getDateOnly(invoice.due_date),
      status: invoice.status,
      amount: invoice.amount,
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
      const effectiveTaxPercent = editTaxEnabled ? editTaxPercent : 0;
      const taxAmount = editForm.amount * (effectiveTaxPercent / 100);
      const totalAmount = editForm.amount + taxAmount;
      const payload: any = {
        invoice_date: editForm.invoice_date,
        amount: editForm.amount,
        tax_amount: taxAmount || undefined,
        total_amount: totalAmount,
        status: editForm.status,
        notes: editForm.notes.trim() || undefined,
      };
      if (editForm.due_date) {
        payload.due_date = editForm.due_date;
      } else {
        payload.due_date = null;
      }

      if (selectedInvoice.order_id) {
        payload.order_id = selectedInvoice.order_id;
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

  const handlePrintInvoice = async () => {
    if (!selectedInvoice) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const invoice = selectedInvoice;
    const relatedOrder = orders.find((o) => o.id === invoice.order_id);

    let customerName = (invoice as any).customer || '';
    let customerAddress = '';
    let customerPhone = '';

    if (pb && relatedOrder?.customer_id) {
      try {
        const customer = (await pb
          .collection('customers')
          .getOne(relatedOrder.customer_id)) as Customer;
        customerName = customer.name || customerName;
        customerAddress = customer.address || '';
        customerPhone = customer.phone || '';
      } catch (error) {
        console.error('[v0] Fetch customer for invoice print error:', error);
      }
    }

    const companyName = 'Nama Perusahaan';
    const companyAddress = 'Alamat Perusahaan';
    const companyPhone = 'Telepon Perusahaan';

    const formatCurrencyLocal = (value: number | undefined) => {
      if (!value) return 'Rp 0';
      try {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(value);
      } catch {
        return `Rp ${value.toLocaleString('id-ID')}`;
      }
    };

    const html = `
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charSet="utf-8" />
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 22px; margin: 0; letter-spacing: 2px; }
      .muted { color: #64748b; font-size: 12px; }
      .section { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
      .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
      .label { color: #64748b; }
      .value { font-weight: 500; }
      .total { font-weight: 700; font-size: 16px; margin-top: 8px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0f172a; }
      .company-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
      .company-line { font-size: 12px; color: #475569; }
      .invoice-meta { text-align: right; font-size: 12px; }
      .invoice-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
      .two-cols { display: flex; justify-content: space-between; gap: 32px; }
      .col { flex: 1; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="company-name">${companyName}</div>
        <div class="company-line">${companyAddress}</div>
        <div class="company-line">${companyPhone}</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">INVOICE</div>
        <div class="label">No. Invoice</div>
        <div class="value">${invoice.invoice_number}</div>
        <div class="label" style="margin-top:8px;">Status</div>
        <div class="value" style="text-transform:capitalize;">${invoice.status}</div>
      </div>
    </div>

    <div class="section two-cols">
      <div class="col">
        <div class="label">Kepada</div>
        <div class="value" style="margin-top:4px;">${customerName || '-'}</div>
        ${
          customerAddress
            ? `<div class="company-line" style="margin-top:2px;">${customerAddress}</div>`
            : ''
        }
        ${
          customerPhone
            ? `<div class="company-line" style="margin-top:2px;">Telp: ${customerPhone}</div>`
            : ''
        }
      </div>
      <div class="col">
        <div class="label">Tanggal Invoice</div>
        <div class="value">${formatDate(invoice.invoice_date)}</div>
        <div class="label" style="margin-top:8px;">Jatuh Tempo</div>
        <div class="value">${invoice.due_date ? formatDate(invoice.due_date) : '-'}</div>
        <div class="label" style="margin-top:8px;">Order Terkait</div>
        <div class="value">
          ${
            relatedOrder
              ? `${relatedOrder.order_number} - ${formatCurrencyLocal(
                  relatedOrder.total || 0
                )}`
              : '-'
          }
        </div>
      </div>
    </div>

    <div class="section">
      <div class="row">
        <div class="label">Nominal</div>
        <div class="value">${formatCurrencyLocal(invoice.amount)}</div>
      </div>
      <div class="row">
        <div class="label">Pajak</div>
        <div class="value">${formatCurrencyLocal(invoice.tax_amount || 0)}</div>
      </div>
      <div class="row total">
        <div>Total</div>
        <div>${formatCurrencyLocal(invoice.total_amount)}</div>
      </div>
    </div>

    ${
      invoice.notes
        ? `<div class="section">
      <div class="label">Catatan</div>
      <div class="value">${invoice.notes.replace(/\n/g, '<br />')}</div>
    </div>`
        : ''
    }

    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      };
    </script>
  </body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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

                {selectedInvoice && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Order Terkait
                    </label>
                    <select
                      value={selectedInvoice.order_id}
                      onChange={(e) => {
                        const newOrderId = e.target.value;
                        if (!newOrderId) return;
                        setSelectedInvoice((prev) =>
                          prev ? { ...prev, order_id: newOrderId } : prev
                        );
                      }}
                      disabled={saving || orders.length === 0}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                    >
                      {orders.length === 0 ? (
                        <option>Tidak ada order</option>
                      ) : (
                        orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.order_number} - {formatCurrency(order.total || 0)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

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

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editTaxEnabled}
                      onChange={(e) => setEditTaxEnabled(e.target.checked)}
                      disabled={saving}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-500"
                    />
                    <span className="text-sm text-slate-200">Aktifkan pajak</span>
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
                          }))
                        }
                        disabled={saving}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Pajak (%)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editTaxPercent}
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value);
                          if (Number.isNaN(value)) {
                            setEditTaxPercent(0);
                          } else if (value < 0) {
                            setEditTaxPercent(0);
                          } else if (value > 100) {
                            setEditTaxPercent(100);
                          } else {
                            setEditTaxPercent(value);
                          }
                        }}
                        disabled={saving || !editTaxEnabled}
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
                        value={
                          editForm.amount +
                          editForm.amount *
                            ((editTaxEnabled ? editTaxPercent : 0) / 100)
                        }
                        disabled
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
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
