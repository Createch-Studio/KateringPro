'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { CashRegisterSession, MenuItem, Order, Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Minus, Plus, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  menu: MenuItem;
  quantity: number;
}

export default function PosPage() {
  const { pb, isAuthenticated, user, isViewOnlyRole } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [registerSession, setRegisterSession] = useState<CashRegisterSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setMenusLoading(false);
      setSessionLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setMenusLoading(true);
        const menusRes = await pb.collection('menus').getList<MenuItem>(1, 200, {
          filter: 'is_active = true',
          sort: 'name',
        });
        setMenus(menusRes.items);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat menu untuk PoS');
        console.error('[v0] Fetch PoS menus error:', message);
        toast.error(message);
      } finally {
        setMenusLoading(false);
      }

      try {
        setSessionLoading(true);
        if (user) {
          const sessionRes = await pb
            .collection('cash_register_sessions')
            .getList<CashRegisterSession>(1, 1, {
              filter: `user_id = "${user.id}" && status = "open"`,
              sort: '-open_time',
            });
          setRegisterSession(sessionRes.items[0] || null);
        } else {
          setRegisterSession(null);
        }
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat status cash register');
        console.error('[v0] Fetch cash register for PoS error:', message);
        toast.error(message);
      } finally {
        setSessionLoading(false);
      }
    };

    fetchData();
  }, [pb, isAuthenticated, user]);

  const filteredMenus = useMemo(() => {
    if (!search.trim()) return menus;
    const keyword = search.toLowerCase();
    return menus.filter(
      (m) =>
        m.name.toLowerCase().includes(keyword) ||
        (m.description || '').toLowerCase().includes(keyword)
    );
  }, [menus, search]);

  const addToCart = (menu: MenuItem) => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa melakukan transaksi PoS');
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.menu.id === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.menu.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${menu.id}`,
          menu,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa mengubah keranjang');
      return;
    }
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa mengubah keranjang');
      return;
    }
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.menu.price * item.quantity, 0),
    [cartItems]
  );

  const total = subtotal;

  const canCheckout = !!registerSession && cartItems.length > 0 && !saving && !isViewOnlyRole;

  const handleCheckout = async () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa melakukan transaksi PoS');
      return;
    }
    if (!pb || !isAuthenticated || !user) return;
    if (!registerSession) {
      toast.error('Cash register belum dibuka. Buka terlebih dahulu di menu Cash Register.');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    try {
      setSaving(true);
      const today = new Date().toISOString().split('T')[0];
      const orderNumber = `POS-${Date.now().toString().slice(-6)}`;

      const newOrder = (await pb.collection('orders').create({
        order_number: orderNumber,
        customer_id: '',
        order_date: today,
        event_date: today,
        status: 'completed',
        subtotal: subtotal,
        tax: 0,
        total: total,
        notes: 'Transaksi PoS',
      })) as Order;

      for (const item of cartItems) {
        await pb.collection('order_items').create({
          order_id: newOrder.id,
          menu_id: item.menu.id,
          quantity: item.quantity,
          unit_price: item.menu.price,
          total: item.menu.price * item.quantity,
        });
      }

      const payment = (await pb.collection('payments').create({
        order_id: newOrder.id,
        payment_date: today,
        amount: total,
        method: 'cash',
        payment_type: 'full_payment',
        notes: 'Pembayaran PoS',
      })) as Payment;

      toast.success('Transaksi PoS berhasil disimpan');
      setCartItems([]);
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menyimpan transaksi PoS');
      console.error('[v0] PoS checkout error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="PoS (Point of Sale)">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <Input
                    placeholder="Cari menu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              {menusLoading ? (
                <div className="text-sm text-slate-400">Memuat daftar menu...</div>
              ) : filteredMenus.length === 0 ? (
                <div className="text-sm text-slate-400">
                  {menus.length === 0
                    ? 'Belum ada menu yang dapat dijual'
                    : 'Tidak ada menu yang cocok dengan pencarian'}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredMenus.map((menu) => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => addToCart(menu)}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-left hover:border-orange-500 hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="text-sm font-semibold text-white mb-1 truncate">
                        {menu.name}
                      </div>
                      <div className="text-xs text-slate-400 mb-1 line-clamp-2">
                        {menu.description || '-'}
                      </div>
                      <div className="text-sm font-bold text-orange-400 mt-1">
                        {formatCurrency(menu.price)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Keranjang</h2>
                {sessionLoading ? (
                  <span className="text-xs text-slate-400">Memeriksa cash register...</span>
                ) : registerSession ? (
                  <span className="text-xs text-green-400">Cash register terbuka</span>
                ) : (
                  <span className="text-xs text-red-400">
                    Cash register belum dibuka (buka di menu Cash Register)
                  </span>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="text-sm text-slate-400">Belum ada item di keranjang</div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b border-slate-800 pb-2 last:border-0"
                    >
                      <div className="flex-1 mr-2">
                        <p className="text-sm font-medium text-white truncate">
                          {item.menu.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.quantity} x {formatCurrency(item.menu.price)}
                        </p>
                        <p className="text-sm font-semibold text-orange-400">
                          {formatCurrency(item.menu.price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-700 mt-3 pt-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-100">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-200">Total</span>
                  <span className="text-orange-400 text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving
                  ? 'Menyimpan transaksi...'
                  : registerSession
                    ? 'Simpan & Bayar (Cash)'
                    : 'Cash register belum dibuka'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
