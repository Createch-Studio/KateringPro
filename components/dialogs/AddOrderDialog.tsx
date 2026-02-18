import { useState, useEffect } from 'react';
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
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Order, Customer, MenuItem } from '@/lib/types';
import { formatCurrency } from '@/lib/api';
import { getPocketBaseErrorMessage } from '@/lib/api';

interface AddOrderDialogProps {
  pb: any;
  customers: Customer[];
  onOrderAdded: (order: Order) => void;
}

interface OrderItem {
  id: string;
  menu_id: string;
  menu_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function AddOrderDialog({ pb, customers, onOrderAdded }: AddOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [selectedMenuQty, setSelectedMenuQty] = useState(1);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPercent, setTaxPercent] = useState(11);
  const [formData, setFormData] = useState({
    order_number: '',
    customer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    event_date: new Date().toISOString().split('T')[0],
    event_name: '',
    event_location: '',
    total_pax: 0,
    status: 'draft',
  });

  // Fetch menus
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const res = await pb.collection('menus').getList(1, 100, {
          filter: 'is_active = true',
        });
        setMenus(res.items as MenuItem[]);
      } catch (error) {
        console.error('[v0] Failed to fetch menus:', error);
      }
    };
    if (open && pb) fetchMenus();
  }, [open, pb]);

  useEffect(() => {
    // Generate order number
    const timestamp = Date.now().toString().slice(-6);
    setFormData((prev) => ({ ...prev, order_number: `ORD-${timestamp}` }));
  }, [open]);

  useEffect(() => {
    if (customers.length > 0 && !formData.customer_id) {
      setFormData((prev) => ({ ...prev, customer_id: customers[0].id }));
    }
  }, [customers, formData.customer_id]);

  const addOrderItem = () => {
    if (!selectedMenuId) {
      toast.error('Please select a menu item');
      return;
    }

    const selectedMenu = menus.find((m) => m.id === selectedMenuId);
    if (!selectedMenu) return;

    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      menu_id: selectedMenuId,
      menu_name: selectedMenu.name,
      quantity: selectedMenuQty,
      unit_price: selectedMenu.price,
      total: selectedMenu.price * selectedMenuQty,
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedMenuId('');
    setSelectedMenuQty(1);
    toast.success('Item added to order');
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const effectiveTaxPercent = taxEnabled ? taxPercent : 0;
  const tax = subtotal * (effectiveTaxPercent / 100);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.order_number.trim() || !formData.customer_id || !formData.event_date) {
      toast.error('Nomor order, pelanggan, dan tanggal acara wajib diisi');
      return;
    }

    try {
      setLoading(true);

      const newOrder = await pb.collection('orders').create({
        order_number: formData.order_number,
        customer_id: formData.customer_id,
        order_date: formData.order_date,
        event_date: formData.event_date,
        event_name: formData.event_name || undefined,
        event_location: formData.event_location || undefined,
        total_pax: formData.total_pax || undefined,
        status: formData.status,
        subtotal: subtotal,
        tax: tax,
        total: total,
      });

      // Create order items
      for (const item of orderItems) {
        await pb.collection('order_items').create({
          order_id: newOrder.id,
          menu_id: item.menu_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        });
      }

      onOrderAdded(newOrder);
      toast.success('Pesanan berhasil dibuat beserta item menu');
      setOpen(false);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        order_number: `ORD-${Date.now().toString().slice(-6)}`,
        customer_id: customers[0]?.id || '',
        order_date: today,
        event_date: today,
        event_name: '',
        event_location: '',
        total_pax: 0,
        status: 'draft',
      });
      setOrderItems([]);
    } catch (error: any) {
      console.error('[v0] Add order error:', error);
      toast.error(getPocketBaseErrorMessage(error, 'Gagal membuat pesanan'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Buat Pesanan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Buat Pesanan Baru</DialogTitle>
          <DialogDescription className="text-slate-400">
            Catat pesanan katering baru untuk pelanggan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nomor Order *
              </label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Terkonfirmasi</option>
                <option value="in_progress">Proses</option>
                <option value="delivered">Terkirim</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Batal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pelanggan *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              disabled={loading || customers.length === 0}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
            >
              {customers.length === 0 ? (
                <option>Tidak ada pelanggan</option>
              ) : (
                customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tanggal Order *
              </label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tanggal Acara *
              </label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nama Acara
            </label>
            <Input
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              placeholder="e.g., Acara Pernikahan"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Lokasi Acara
            </label>
            <Input
              value={formData.event_location}
              onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
              placeholder="Event location"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Jumlah Porsi
            </label>
            <Input
              type="number"
              min="1"
              value={formData.total_pax}
              onChange={(e) => setFormData({ ...formData, total_pax: parseInt(e.target.value) || 0 })}
              placeholder="100"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-white mb-3">Menu dalam Pesanan</h3>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Menu</label>
                <select
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  disabled={loading || menus.length === 0}
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 text-white rounded text-sm"
                >
                  <option value="">Pilih menu...</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name} - {formatCurrency(menu.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Qty</label>
                <Input
                  type="number"
                  min="1"
                  value={selectedMenuQty}
                  onChange={(e) => setSelectedMenuQty(parseInt(e.target.value) || 1)}
                  disabled={loading}
                  className="bg-slate-800 border-slate-700 text-white text-sm py-1 h-8"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={addOrderItem}
                  disabled={loading || !selectedMenuId}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 h-8"
                >
                  Tambah
                </Button>
              </div>
            </div>

            {orderItems.length > 0 && (
              <div className="bg-slate-800 rounded border border-slate-700 p-2 mb-3 max-h-40 overflow-y-auto">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-xs text-slate-300 py-2 px-2 border-b border-slate-700 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.menu_name}</p>
                      <p className="text-slate-500">
                        {item.quantity} x {formatCurrency(item.unit_price)} = {formatCurrency(item.total)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOrderItem(item.id)}
                      className="ml-2 p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
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
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Persentase pajak</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={taxPercent}
                onChange={(e) =>
                  setTaxPercent(() => {
                    const value = Number.parseFloat(e.target.value);
                    if (Number.isNaN(value) || value < 0) return 0;
                    if (value > 100) return 100;
                    return value;
                  })
                }
                disabled={loading || !taxEnabled}
                className="w-20 bg-slate-800 border-slate-700 text-white text-sm"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-400 mb-1">Subtotal</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(subtotal)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Pajak ({taxEnabled ? taxPercent : 0}
                  %)
                </p>
                <p className="text-lg font-semibold text-white">{formatCurrency(tax)}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
            <p className="text-xs text-slate-400 mb-1">Total Tagihan</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(total)}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Menyimpan...' : 'Simpan Pesanan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
