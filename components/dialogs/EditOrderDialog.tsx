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
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Customer, MenuItem, Order } from '@/lib/types';
import { formatCurrency, getPocketBaseErrorMessage } from '@/lib/api';

interface EditOrderDialogProps {
  pb: any;
  order: Order;
  customers: Customer[];
  onOrderUpdated: (order: Order) => void;
}

interface OrderItemRow {
  id: string;
  menu_id: string;
  menu_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function EditOrderDialog({ pb, order, customers, onOrderUpdated }: EditOrderDialogProps) {
  const createdDate = new Date(order.created).toISOString().split('T')[0];

  const getDateOnly = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    let v = value;
    if (v.includes('T')) {
      v = v.split('T')[0];
    } else if (v.includes(' ')) {
      v = v.split(' ')[0];
    }
    if (v.length > 10) {
      return v.slice(0, 10);
    }
    return v;
  };

  const initialOrderDate = getDateOnly(order.order_date, createdDate);
  const initialEventDate = getDateOnly(order.event_date, createdDate);
  const initialSubtotal = order.subtotal || 0;
  const initialTax = order.tax || 0;
  const initialTaxEnabled = initialTax > 0;
  const initialTaxPercent =
    initialSubtotal > 0 && initialTax > 0 ? Math.round((initialTax / initialSubtotal) * 100) : 11;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [initialItemIds, setInitialItemIds] = useState<string[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [selectedMenuQty, setSelectedMenuQty] = useState(1);
  const [taxEnabled, setTaxEnabled] = useState(initialTaxEnabled);
  const [taxPercent, setTaxPercent] = useState(initialTaxPercent);

  const [formData, setFormData] = useState({
    order_number: order.order_number,
    customer_id: order.customer_id,
    order_date: initialOrderDate,
    event_date: initialEventDate,
    event_name: order.event_name || '',
    event_location: order.event_location || '',
    total_pax: order.total_pax || 0,
    status: order.status,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        order_number: order.order_number,
        customer_id: order.customer_id,
        order_date: getDateOnly(order.order_date, createdDate),
        event_date: getDateOnly(order.event_date, createdDate),
        event_name: order.event_name || '',
        event_location: order.event_location || '',
        total_pax: order.total_pax || 0,
        status: order.status,
      });

      const subtotalValue = order.subtotal || 0;
      const taxValue = order.tax || 0;
      const enabled = taxValue > 0;
      const percent =
        subtotalValue > 0 && taxValue > 0 ? Math.round((taxValue / subtotalValue) * 100) : 11;
      setTaxEnabled(enabled);
      setTaxPercent(percent);

      const fetchData = async () => {
        if (!pb) return;
        try {
          const [menusRes, itemsRes] = await Promise.all([
            pb.collection('menus').getList(1, 100, {
              filter: 'is_active = true',
            }),
            pb.collection('order_items').getList(1, 200, {
              filter: `order_id = "${order.id}"`,
            }),
          ]);

          const menusData = menusRes.items as MenuItem[];
          const itemsData = itemsRes.items as any[];

          setMenus(menusData);

          const mappedItems: OrderItemRow[] = itemsData.map((item) => {
            const menu = menusData.find((m) => m.id === item.menu_id);
            return {
              id: item.id,
              menu_id: item.menu_id,
              menu_name: menu?.name || 'Menu',
              quantity: item.quantity || 0,
              unit_price: item.unit_price || 0,
              total: item.total || 0,
            };
          });

          setOrderItems(mappedItems);
          setInitialItemIds(mappedItems.map((it) => it.id));
        } catch (error) {
          console.error('[v0] Failed to fetch order items:', error);
        }
      };

      fetchData();
    }
  }, [open, order]);

  const addOrderItem = () => {
    if (!selectedMenuId) {
      toast.error('Silakan pilih menu terlebih dahulu');
      return;
    }

    const selectedMenu = menus.find((m) => m.id === selectedMenuId);
    if (!selectedMenu) return;

    const quantity = selectedMenuQty > 0 ? selectedMenuQty : 1;
    const unitPrice = selectedMenu.price;

    const newItem: OrderItemRow = {
      id: `temp-${Date.now()}`,
      menu_id: selectedMenu.id,
      menu_name: selectedMenu.name,
      quantity,
      unit_price: unitPrice,
      total: unitPrice * quantity,
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedMenuId('');
    setSelectedMenuQty(1);
    toast.success('Item berhasil ditambahkan');
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0 || Number.isNaN(quantity)) return;
    setOrderItems(
      orderItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              total: item.unit_price * quantity,
            }
          : item
      )
    );
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const effectiveTaxPercent = taxEnabled ? taxPercent : 0;
  const tax = subtotal * (effectiveTaxPercent / 100);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.order_number.trim() || !formData.customer_id || !formData.event_date) {
      toast.error('Order number, customer, and event date are required');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        order_number: formData.order_number,
        customer_id: formData.customer_id,
        order_date: formData.order_date,
        event_date: formData.event_date,
        event_name: formData.event_name || undefined,
        event_location: formData.event_location || undefined,
        total_pax: formData.total_pax || undefined,
        status: formData.status,
        subtotal,
        tax,
        total,
      };

      const updated = await pb.collection('orders').update(order.id, payload);

      const currentExistingIds = orderItems
        .filter((item) => !item.id.startsWith('temp-'))
        .map((item) => item.id);
      const itemsToDelete = initialItemIds.filter((id) => !currentExistingIds.includes(id));

      for (const item of orderItems) {
        if (item.id.startsWith('temp-')) {
          await pb.collection('order_items').create({
            order_id: order.id,
            menu_id: item.menu_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          });
        } else {
          await pb.collection('order_items').update(item.id, {
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          });
        }
      }

      for (const id of itemsToDelete) {
        await pb.collection('order_items').delete(id);
      }

      onOrderUpdated(updated);
      toast.success('Order updated successfully');
      setOpen(false);
    } catch (error: any) {
      toast.error(getPocketBaseErrorMessage(error, 'Failed to update order'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          className="p-2 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <Edit2 size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Order</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update order information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Order Number *
              </label>
              <Input
                value={formData.order_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_number: e.target.value,
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
                    status: e.target.value as Order['status'],
                  })
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  customer_id: e.target.value,
                })
              }
              disabled={loading || customers.length === 0}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
            >
              {customers.length === 0 ? (
                <option>No customers available</option>
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
                Order Date *
              </label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_date: e.target.value,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Event Date *
              </label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    event_date: e.target.value,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Event Name
            </label>
            <Input
              value={formData.event_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  event_name: e.target.value,
                })
              }
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Event Location
            </label>
            <Input
              value={formData.event_location}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  event_location: e.target.value,
                })
              }
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Total Pax
            </label>
            <Input
              type="number"
              min={0}
              value={formData.total_pax}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total_pax: Number(e.target.value) || 0,
                })
              }
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white"
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
                  min={1}
                  value={selectedMenuQty}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setSelectedMenuQty(Number.isNaN(value) || value <= 0 ? 1 : value);
                  }}
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
                  <Plus size={14} className="mr-1" />
                  Tambah
                </Button>
              </div>
            </div>

            {orderItems.length > 0 && (
              <div className="bg-slate-800 rounded border border-slate-700 p-2 mb-3 max-h-40 overflow-y-auto">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-slate-300 py-2 px-2 border-b border-slate-700 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.menu_name}</p>
                      <p className="text-slate-500">
                        {item.quantity} x {formatCurrency(item.unit_price)} ={' '}
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(
                            item.id,
                            Number.parseInt(e.target.value, 10) || item.quantity
                          )
                        }
                        disabled={loading}
                        className="bg-slate-900 border-slate-700 text-white text-xs py-1 h-8"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOrderItem(item.id)}
                      disabled={loading}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
