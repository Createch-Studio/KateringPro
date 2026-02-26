'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { PosLayout } from '@/components/layout/PosLayout'; // Use new POS Layout
import { useAuth } from '@/lib/auth-context';
import { CashRegisterSession, Customer, Invoice, MenuItem, Order, Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency, getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Minus, Plus, Trash2, CheckCircle2, Wallet, LogOut } from 'lucide-react';

interface CartItem {
  id: string;
  menu: MenuItem;
  quantity: number;
}

type PosPaymentMethod = 'cash' | 'qris' | 'other';

export default function PosPage() {
  const { pb, isAuthenticated, user, isViewOnlyRole, employee } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [registerSession, setRegisterSession] = useState<CashRegisterSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [qrisDialogOpen, setQrisDialogOpen] = useState(false);
  const [midtransTransaction, setMidtransTransaction] = useState<any>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);

  // Recent Orders State
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Cash Register State
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [registerNote, setRegisterNote] = useState('');

  // Refs for accessing latest state in subscriptions
  const cartItemsRef = useRef(cartItems);
  const totalRef = useRef(0);
  const midtransTransactionRef = useRef(midtransTransaction);
  const customersRef = useRef(customers);
  const selectedCustomerIdRef = useRef(selectedCustomerId);

  useEffect(() => {
    cartItemsRef.current = cartItems;
    totalRef.current = cartItems.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
    midtransTransactionRef.current = midtransTransaction;
    customersRef.current = customers;
    selectedCustomerIdRef.current = selectedCustomerId;
  }, [cartItems, midtransTransaction, customers, selectedCustomerId]);

  const cashierName = employee?.name || user?.email || 'Kasir';

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
        const customersRes = await pb.collection('customers').getList<Customer>(1, 200, {
          sort: 'name',
        });
        setCustomers(customersRes.items);

        const posCustomer = customersRes.items.find((c) => c.name === 'Customer PoS');
        if (posCustomer) {
          setSelectedCustomerId(posCustomer.id);
        } else {
          setSelectedCustomerId('');
        }
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat pelanggan untuk PoS');
        console.error('[v0] Fetch PoS customers error:', message);
        toast.error(message);
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

  // Fetch recent orders
  useEffect(() => {
    if (!pb || !isAuthenticated) return;

    const fetchRecentOrders = async () => {
      try {
        const result = await pb.collection('orders').getList<Order>(1, 5, {
          sort: '-created',
          expand: 'customer_id,order_items_via_order_id.menu_id',
        });
        setRecentOrders(result.items);
      } catch (error) {
        console.error('Failed to fetch recent orders:', error);
      }
    };

    fetchRecentOrders();

    // Subscribe to new orders
    pb.collection('orders').subscribe('*', (e) => {
       if (e.action === 'create' || e.action === 'update') {
          fetchRecentOrders();
       }
    });

    return () => {
        pb.collection('orders').unsubscribe('*');
    };
  }, [pb, isAuthenticated]);

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

  const handleCheckout = () => {
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
    if (!selectedCustomerId) {
      toast.error('Customer PoS belum tersedia. Buat pelanggan "Customer PoS" terlebih dahulu di menu Customers.');
      return;
    }

    setCheckoutDialogOpen(true);
  };

  const mapPosPaymentToPaymentMethod = (method: PosPaymentMethod): Payment['method'] => {
    if (method === 'cash') return 'cash';
    if (method === 'qris') return 'qris';
    return 'transfer_bank';
  };

  const handleConfirmCheckout = async () => {
    if (paymentMethod === 'qris') {
      setCheckoutDialogOpen(false);
      setTimeout(() => setQrisDialogOpen(true), 0);
      await handleQrisCheckout();
    } else {
      await handleStandardCheckout();
    }
  };

  const handleQrisCheckout = async () => {
    if (isViewOnlyRole || !pb || !user || !registerSession || cartItems.length === 0 || !selectedCustomerId) {
      toast.error('Kondisi untuk checkout tidak terpenuhi.');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      toast.error('Pelanggan tidak ditemukan.');
      return;
    }

    setMidtransTransaction(null);

    try {
      setSaving(true);
      const midtransOrderId = `POS-${Date.now()}`;

      const response = await fetch('/api/midtrans/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: midtransOrderId,
          total: total,
          customer_name: customer.name,
          customer_email: customer.email,
        }),
      });

      const transaction = await response.json();

      if (!response.ok) {
        throw new Error(transaction.message || 'Gagal membuat transaksi QRIS.');
      }
      
// Prioritaskan URL v2 jika ada, jika tidak, gunakan URL standar
const qrCodeV2 = transaction.actions?.find((a: any) => a.name === 'generate-qr-code-v2');
const qrCodeUrl = qrCodeV2?.url || transaction.actions?.find((a: any) => a.name === 'generate-qr-code')?.url;

      if (!qrCodeUrl) {
        throw new Error('URL QR Code tidak ditemukan dari Midtrans.');
      }

      const today = new Date().toISOString().split('T')[0];
      const orderNumber = midtransOrderId;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const newOrderPayload: any = {
        order_number: orderNumber,
        customer_id: selectedCustomerId,
        order_date: today,
        event_date: today,
        status: 'confirmed',
        subtotal: subtotal,
        tax: 0,
        total: total,
        payment_type: 'qris',
        paid_amount: 0,
        notes: 'Transaksi PoS (QRIS)',
      };

      const newOrder = (await pb.collection('orders').create(newOrderPayload)) as Order;

      for (const item of cartItems) {
        await pb.collection('order_items').create({
          order_id: newOrder.id,
          menu_id: item.menu.id,
          quantity: item.quantity,
          unit_price: item.menu.price,
          total: item.menu.price * item.quantity,
        });
      }

      const invoicePayload: any = {
        invoice_number: invoiceNumber,
        order_id: newOrder.id,
        invoice_date: today,
        due_date: today,
        amount: total,
        tax_amount: 0,
        total_amount: total,
        status: 'sent',
        notes: `Invoice PoS (QRIS) ${orderNumber}`,
        midtrans_order_id: midtransOrderId,
      };

      const newInvoice = (await pb
        .collection('invoices')
        .create(invoicePayload)) as Invoice;

      setPendingInvoiceId(newInvoice.id);

      setMidtransTransaction({ ...transaction, qr_code_url: qrCodeUrl, midtrans_order_id: midtransOrderId });

    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal memproses pembayaran QRIS');
      console.error('[v0] PoS QRIS checkout error:', message);
      toast.error(message);
      setQrisDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStandardCheckout = async () => {
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
    if (!selectedCustomerId) {
      toast.error('Customer PoS belum tersedia. Buat pelanggan "Customer PoS" terlebih dahulu di menu Customers.');
      return;
    }

    try {
      setSaving(true);
      const today = new Date().toISOString().split('T')[0];
      const orderNumber = `POS-${Date.now().toString().slice(-6)}`;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const newOrderPayload: any = {
        order_number: orderNumber,
        customer_id: selectedCustomerId,
        order_date: today,
        event_date: today,
        status: 'completed',
        subtotal: subtotal,
        tax: 0,
        total: total,
        notes: 'Transaksi PoS',
      };

      const newOrder = (await pb.collection('orders').create(newOrderPayload)) as Order;

      for (const item of cartItems) {
        await pb.collection('order_items').create({
          order_id: newOrder.id,
          menu_id: item.menu.id,
          quantity: item.quantity,
          unit_price: item.menu.price,
          total: item.menu.price * item.quantity,
        });
      }

      const invoicePayload: any = {
        invoice_number: invoiceNumber,
        order_id: newOrder.id,
        invoice_date: today,
        due_date: today,
        amount: total,
        tax_amount: 0,
        total_amount: total,
        status: 'paid',
        notes: 'Invoice PoS',
      };

      const newInvoice = (await pb
        .collection('invoices')
        .create(invoicePayload)) as Invoice;

      const method = mapPosPaymentToPaymentMethod(paymentMethod);

      const payment = (await pb.collection('payments').create({
        order_id: newOrder.id,
        invoice_id: newInvoice.id,
        session_id: registerSession.id,
        payment_date: today,
        amount: total,
        method,
        payment_type: 'full_payment',
        reference_number: `PoS Order ${orderNumber}`,
        notes: `Kasir ${cashierName}`,
      })) as Payment;

      toast.success('Transaksi PoS berhasil disimpan');
      setCartItems([]);
      setCheckoutDialogOpen(false);
      setPaymentMethod('cash');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menyimpan transaksi PoS');
      console.error('[v0] PoS checkout error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRegister = async () => {
    if (!pb || !user) return;
    if (!openingBalance) {
      toast.error('Masukkan saldo awal');
      return;
    }

    try {
      setSaving(true);
      const session = await pb.collection('cash_register_sessions').create({
        user_id: user.id,
        open_time: new Date().toISOString(),
        opening_balance: parseFloat(openingBalance),
        current_balance: parseFloat(openingBalance),
        status: 'open',
        notes: registerNote,
      });

      setRegisterSession(session as CashRegisterSession);
      setRegisterDialogOpen(false);
      toast.success('Cash Register berhasil dibuka');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal membuka cash register');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!pb || !registerSession) return;
    if (!confirm('Apakah Anda yakin ingin menutup Cash Register?')) return;

    try {
      setSaving(true);
      await pb.collection('cash_register_sessions').update(registerSession.id, {
        close_time: new Date().toISOString(),
        status: 'closed',
        final_balance: registerSession.current_balance, // Simplifikasi, idealnya ada hitungan fisik
      });
      setRegisterSession(null);
      toast.success('Cash Register ditutup');
    } catch (error: any) {
       const message = getPocketBaseErrorMessage(error, 'Gagal menutup cash register');
       toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!pb || !pendingInvoiceId) return;
    
    try {
      setSaving(true);
      const invoice = await pb.collection('invoices').getOne(pendingInvoiceId);
      
      if (invoice.status === 'paid') {
        toast.success('Pembayaran terkonfirmasi!');
        
        // Trigger logika sukses yang sama dengan realtime
        const currentCartItems = cartItemsRef.current;
        const currentTotal = totalRef.current;
        const currentTransaction = midtransTransactionRef.current;
        const currentCustomer = customersRef.current.find(c => c.id === selectedCustomerIdRef.current);
        
        setLastOrderDetails({
          orderId: currentTransaction?.midtrans_order_id || pendingInvoiceId || 'UNKNOWN',
          date: new Date().toLocaleString('id-ID'),
          customerName: currentCustomer?.name || 'Guest',
          items: [...currentCartItems], 
          total: currentTotal,
          paymentMethod: 'QRIS'
        });
        
        setSuccessDialogOpen(true);
        setQrisDialogOpen(false);
        setMidtransTransaction(null);
        setPendingInvoiceId(null);
        setCartItems([]);
        setSelectedCustomerId('');
        setPaymentMethod('cash');
      } else {
        toast.info('Pembayaran belum diterima/diproses. Silakan coba lagi sesaat lagi.');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Gagal mengecek status pembayaran');
    } finally {
      setSaving(false);
    }
  };

  const handleViewOrder = async (order: Order) => {
    try {
      // Fetch full order details with items
      const fullOrder = await pb!.collection('orders').getOne(order.id, {
        expand: 'customer_id,order_items_via_order_id.menu_id',
      });
      setSelectedOrder(fullOrder);
      setOrderDialogOpen(true);
    } catch (error) {
      toast.error('Gagal memuat detail pesanan');
    }
  };

  return (
    <PosLayout title="PoS (Point of Sale)">
      <div className="h-full flex flex-col lg:flex-row gap-6">
        {/* Left Side: Menu Grid */}
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
               <div className="relative flex-1 max-w-md">
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
                
                {/* Cash Register Status */}
                <div className="ml-4">
                    {sessionLoading ? (
                        <div className="h-10 w-32 bg-slate-800 animate-pulse rounded-lg"></div>
                    ) : registerSession ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <Wallet size={16} className="text-green-500" />
                            <div className="text-xs">
                                <p className="text-green-500 font-semibold">Register Open</p>
                                <p className="text-slate-400">Bal: {formatCurrency(registerSession.current_balance)}</p>
                            </div>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleCloseRegister}
                                className="h-6 w-6 p-0 ml-1 text-slate-400 hover:text-red-400"
                                title="Tutup Register"
                            >
                                <LogOut size={14} />
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            onClick={() => setRegisterDialogOpen(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 gap-2"
                        >
                            <Wallet size={16} />
                            Buka Register
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              {menusLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin"></div>
                        <span>Memuat menu...</span>
                    </div>
                </div>
              ) : filteredMenus.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  {menus.length === 0
                    ? 'Belum ada menu yang dapat dijual'
                    : 'Tidak ada menu yang cocok dengan pencarian'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredMenus.map((menu) => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => addToCart(menu)}
                      className="group bg-slate-800 border border-slate-700 rounded-xl p-3 text-left hover:border-orange-500 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-orange-500/10 transition-all flex flex-col h-full"
                    >
                      {/* Placeholder Image if needed */}
                      <div className="aspect-video bg-slate-700 rounded-lg mb-3 w-full overflow-hidden relative">
                         {menu.photo ? (
                             <img src={`/api/files/${menu.collectionId}/${menu.id}/${menu.photo}`} alt={menu.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No Image</div>
                         )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white mb-1 line-clamp-2 leading-tight">
                            {menu.name}
                        </div>
                        <div className="text-xs text-slate-400 mb-2 line-clamp-2 h-8">
                            {menu.description || '-'}
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-2 border-t border-slate-700/50 flex justify-between items-center">
                        <div className="text-sm font-bold text-orange-400">
                            {formatCurrency(menu.price)}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={14} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-full lg:w-96 flex flex-col bg-slate-900 border border-slate-700 rounded-lg h-full max-h-[calc(100vh-140px)] sticky top-4">
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                    Keranjang
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <Minus size={24} className="text-slate-600" />
                    </div>
                    <p>Keranjang kosong</p>
                </div>
              ) : (
                cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate mb-1">
                          {item.menu.name}
                        </p>
                        <p className="text-xs text-orange-400 font-semibold">
                          {formatCurrency(item.menu.price * item.quantity)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                          >
                              <Trash2 size={12} /> Hapus
                          </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Pajak (0%)</span>
                        <span>{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-slate-800">
                        <span>Total</span>
                        <span className="text-orange-400">{formatCurrency(total)}</span>
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!canCheckout}
                    className="w-full h-12 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 disabled:shadow-none disabled:opacity-50"
                >
                    {registerSession ? 'Bayar Sekarang' : 'Buka Register Dulu'}
                </Button>
            </div>
            
            {/* Recent Orders Compact View */}
            <div className="mt-4 border-t border-slate-800 pt-4 flex-1 min-h-0 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
                Pesanan Terakhir
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {recentOrders.map((order) => (
                  <div key={order.id} className="bg-slate-800/30 border border-slate-800 rounded-lg p-2 text-xs hover:bg-slate-800/50 transition-colors flex justify-between items-center group">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-slate-400">#{order.order_number.slice(-4)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                          order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-slate-300 font-medium">
                        {formatCurrency(order.total)}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleViewOrder(order)}
                      className="h-7 px-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Lihat
                    </Button>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-4">Belum ada pesanan.</p>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* View Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border border-slate-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Detail Pesanan</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
               <div className="flex justify-between items-start bg-slate-800 p-3 rounded-lg">
                  <div>
                    <p className="text-slate-400 text-xs">No. Order</p>
                    <p className="text-white font-mono font-bold">{selectedOrder.order_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          selectedOrder.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          selectedOrder.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                          selectedOrder.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                        {selectedOrder.status}
                    </span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Tanggal</p>
                    <p className="text-slate-200">{new Date(selectedOrder.created).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Pelanggan</p>
                    <p className="text-slate-200">{(selectedOrder.expand?.customer_id as Customer)?.name || 'Guest'}</p>
                  </div>
               </div>

               <div className="border-t border-slate-800 pt-3">
                  <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Item Pesanan</p>
                  <div className="space-y-2">
                    {selectedOrder.expand?.order_items_via_order_id?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">
                           {item.quantity}x {(item.expand?.menu_id as MenuItem)?.name || 'Unknown Item'}
                        </span>
                        <span className="text-slate-200 font-medium">
                           {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-200">Total</span>
                  <span className="font-bold text-xl text-orange-400">{formatCurrency(selectedOrder.total)}</span>
               </div>
               
               <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setOrderDialogOpen(false)} className="border-slate-700 text-slate-300">
                    Tutup
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-slate-900 border border-slate-700">
            <DialogHeader>
                <DialogTitle className="text-white">Buka Cash Register</DialogTitle>
                <DialogDescription className="text-slate-400">
                    Masukkan saldo awal (modal kasir) untuk memulai sesi penjualan.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Saldo Awal (Rp)</label>
                    <Input 
                        type="number" 
                        placeholder="0"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Catatan (Opsional)</label>
                    <Input 
                        placeholder="Shift pagi, modal tambahan, dll"
                        value={registerNote}
                        onChange={(e) => setRegisterNote(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setRegisterDialogOpen(false)} className="text-slate-400">Batal</Button>
                <Button onClick={handleOpenRegister} disabled={saving || !openingBalance} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {saving ? 'Memproses...' : 'Buka Register'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Existing Checkout & Success Dialogs (Hidden from visual structure but kept in DOM) */}
        <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
          <DialogContent className="sm:max-w-[420px] bg-slate-900 border border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Konfirmasi Pembayaran</DialogTitle>
              <DialogDescription className="text-slate-400">
                Periksa kembali total dan pilih metode pembayaran sebelum transaksi disimpan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2 max-h-48 overflow-y-auto rounded border border-slate-800 p-3 bg-slate-900/60">
                <p className="text-sm font-medium text-slate-200">Rincian Pesanan</p>
                {cartItems.length === 0 ? (
                  <p className="text-xs text-slate-500">Keranjang masih kosong.</p>
                ) : (
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs text-slate-200"
                      >
                        <div className="flex-1 mr-2">
                          <p className="font-medium truncate">{item.menu.name}</p>
                          <p className="text-slate-400">
                            {item.quantity} x {formatCurrency(item.menu.price)}
                          </p>
                        </div>
                        <p className="font-semibold text-orange-400">
                          {formatCurrency(item.menu.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Total yang harus dibayar</span>
                <span className="text-xl font-bold text-orange-400">
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Metode Pembayaran</p>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PosPaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="qris">QRIS</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCheckoutDialogOpen(false)}
                  disabled={saving}
                  className="border-slate-700 text-slate-300 hover:text-white"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {saving ? 'Memproses...' : 'Konfirmasi & Bayar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

<Dialog open={qrisDialogOpen} onOpenChange={(open) => {
  // Cegah penutupan dialog saat klik di luar (backdrop)
  if (!open) return; 
  setQrisDialogOpen(open);
}}>
  <DialogContent 
    className="sm:max-w-[420px] bg-slate-900 border border-slate-700" 
    onInteractOutside={(e) => e.preventDefault()} 
    onEscapeKeyDown={(e) => e.preventDefault()}
  >
    <DialogHeader>
      <DialogTitle className="text-white">Pembayaran QRIS</DialogTitle>
      <DialogDescription className="text-slate-400">
        Scan QR code di bawah ini untuk membayar. Status akan terupdate otomatis.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 mt-2 text-center">
      {midtransTransaction?.qr_code_url ? (
        <div className="flex justify-center">
          <img
            src={midtransTransaction.qr_code_url}
            alt="QR Code Pembayaran"
            className="w-64 h-64 rounded-lg bg-white p-2"
          />
        </div>
      ) : (
        <div className="text-slate-400">Memuat QR Code...</div>
      )}
      <div className="bg-slate-800 rounded-lg p-3">
        <p className="text-sm text-slate-300">Total Pembayaran</p>
        <p className="text-2xl font-bold text-orange-400">
          {formatCurrency(total)}
        </p>
      </div>
      <div className="text-center pt-2">
        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Menunggu pembayaran...
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={checkPaymentStatus}
          disabled={saving}
          className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20"
        >
          Cek Status
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (confirm('Apakah Anda yakin ingin membatalkan transaksi ini?')) {
                setQrisDialogOpen(false);
                setMidtransTransaction(null);
                // Hapus invoice pending jika dibatalkan
                if (pb && pendingInvoiceId) {
                  pb.collection('invoices').delete(pendingInvoiceId).catch(delErr => console.error("Failed to delete pending invoice on cancel:", delErr));
                }
                setPendingInvoiceId(null);
            }
          }}
          disabled={saving}
          className="border-slate-700 text-slate-300 hover:text-white"
        >
          Batal
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

<Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
  <DialogContent className="sm:max-w-[420px] bg-slate-900 border border-slate-700">
    <DialogHeader>
      <div className="mx-auto bg-green-500/10 p-3 rounded-full mb-2">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>
      <DialogTitle className="text-center text-white text-xl">Pembayaran Berhasil!</DialogTitle>
      <DialogDescription className="text-center text-slate-400">
        Transaksi telah berhasil diproses.
      </DialogDescription>
    </DialogHeader>

    {lastOrderDetails && (
      <div className="space-y-4 mt-2">
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Order ID</span>
            <span className="text-slate-200 font-mono">{lastOrderDetails.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tanggal</span>
            <span className="text-slate-200">{lastOrderDetails.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Pelanggan</span>
            <span className="text-slate-200">{lastOrderDetails.customerName}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-slate-400">Metode</span>
             <span className="text-slate-200 font-medium">{lastOrderDetails.paymentMethod}</span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3">
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Detail Item</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {lastOrderDetails.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-300">
                            {item.quantity}x {item.menu.name}
                        </span>
                        <span className="text-slate-200">
                            {formatCurrency(item.menu.price * item.quantity)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
            <span className="font-semibold text-slate-200">Total Bayar</span>
            <span className="font-bold text-xl text-orange-400">{formatCurrency(lastOrderDetails.total)}</span>
        </div>

        <Button 
            className="w-full bg-slate-800 hover:bg-slate-700 text-white mt-4"
            onClick={() => setSuccessDialogOpen(false)}
        >
            Tutup
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>
    </PosLayout>
  );
}
