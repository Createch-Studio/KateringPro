import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Invoice, Order } from '@/lib/types';
import { formatCurrency } from '@/lib/api';
import { getPocketBaseErrorMessage } from '@/lib/api';

interface AddInvoiceDialogProps {
  pb: any;
  orders: Order[];
  onInvoiceAdded: (invoice: Invoice) => void;
}

export function AddInvoiceDialog({ pb, orders, onInvoiceAdded }: AddInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPercent, setTaxPercent] = useState(11);

  const [formData, setFormData] = useState({
    invoice_number: '',
    order_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    amount: 0,
    status: 'draft' as Invoice['status'],
    notes: '',
  });

  useEffect(() => {
    const timestamp = Date.now().toString().slice(-6);
    setFormData((prev) => ({ ...prev, invoice_number: `INV-${timestamp}` }));
    setTaxEnabled(false);
    setTaxPercent(11);
  }, [open]);

  useEffect(() => {
    if (orders.length > 0 && !formData.order_id) {
      const firstOrder = orders[0];
      setFormData((prev) => ({
        ...prev,
        order_id: firstOrder.id,
        amount: firstOrder.total || 0,
      }));
    }
  }, [orders, formData.order_id]);

  const handleOrderChange = (orderId: string) => {
    const selected = orders.find((o) => o.id === orderId);
    setFormData((prev) => ({
      ...prev,
      order_id: orderId,
      amount: selected?.total || 0,
      total_amount: (selected?.total || 0) + prev.tax_amount,
    }));
  };

  const handleAmountChange = (value: string) => {
    const amount = Number(value) || 0;
    setFormData((prev) => ({
      ...prev,
      amount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoice_number.trim() || !formData.order_id || !formData.invoice_date) {
      toast.error('Nomor invoice, order, dan tanggal invoice wajib diisi');
      return;
    }

    try {
      setLoading(true);

      const effectiveTaxPercent = taxEnabled ? taxPercent : 0;
      const taxAmount = formData.amount * (effectiveTaxPercent / 100);
      const totalAmount = formData.amount + taxAmount;

      const payload: any = {
        invoice_number: formData.invoice_number,
        order_id: formData.order_id,
        invoice_date: formData.invoice_date,
        amount: formData.amount,
        tax_amount: taxAmount || undefined,
        total_amount: totalAmount,
        status: formData.status,
      };

      if (formData.due_date) {
        payload.due_date = formData.due_date;
      }
      if (formData.notes.trim()) {
        payload.notes = formData.notes.trim();
      }

      const newInvoice = await pb.collection('invoices').create(payload);

      onInvoiceAdded(newInvoice);
      toast.success('Invoice berhasil dibuat');
      setOpen(false);
      const today = new Date().toISOString().split('T')[0];
      const timestamp = Date.now().toString().slice(-6);
      setFormData({
        invoice_number: `INV-${timestamp}`,
        order_id: orders[0]?.id || '',
        invoice_date: today,
        due_date: today,
        amount: orders[0]?.total || 0,
        status: 'draft',
        notes: '',
      });
      setTaxEnabled(false);
      setTaxPercent(11);
    } catch (error: any) {
      toast.error(getPocketBaseErrorMessage(error, 'Gagal membuat invoice'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Buat Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Buat Invoice Baru</DialogTitle>
          <DialogDescription className="text-slate-400">
            Buat invoice penagihan untuk order yang sudah ada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nomor Invoice *
              </label>
              <Input
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    invoice_number: e.target.value,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Invoice['status'],
                  })
                }
                disabled={loading}
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
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Order *
            </label>
            <select
              value={formData.order_id}
              onChange={(e) => handleOrderChange(e.target.value)}
              disabled={loading || orders.length === 0}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tanggal Invoice *
              </label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    invoice_date: e.target.value,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Jatuh Tempo
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    due_date: e.target.value,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                disabled={loading}
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
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={loading}
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
                  value={taxPercent}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value);
                    if (Number.isNaN(value)) {
                      setTaxPercent(0);
                    } else if (value < 0) {
                      setTaxPercent(0);
                    } else if (value > 100) {
                      setTaxPercent(100);
                    } else {
                      setTaxPercent(value);
                    }
                  }}
                  disabled={loading || !taxEnabled}
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
                    formData.amount +
                    formData.amount * ((taxEnabled ? taxPercent : 0) / 100)
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
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              disabled={loading}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || orders.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Menyimpan...' : 'Simpan Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
