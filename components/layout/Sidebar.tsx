'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  ShoppingCart,
  FileText,
  DollarSign,
  Warehouse,
  Truck,
  Package,
  Settings,
  LogOut,
  BookOpen,
  BookMarked,
  BarChart3,
  UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    group: 'Utama',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' }],
  },
  {
    group: 'Penjualan',
    items: [
      { icon: ShoppingCart, label: 'Pesanan', href: '/orders' },
      { icon: FileText, label: 'Invoice', href: '/invoices' },
      { icon: Users, label: 'Pelanggan', href: '/customers' },
      { icon: DollarSign, label: 'Pembayaran', href: '/payments' },
    ],
  },
  {
    group: 'Produksi',
    items: [
      { icon: UtensilsCrossed, label: 'Menu & Paket', href: '/menus' },
      { icon: Package, label: 'Bahan Baku', href: '/ingredients' },
      { icon: Warehouse, label: 'Stok & Gudang', href: '/inventory' },
      { icon: BookOpen, label: 'Tugas Produksi', href: '/production-tasks' },
    ],
  },
  {
    group: 'Pembelian',
    items: [
      { icon: Truck, label: 'Supplier', href: '/suppliers' },
      { icon: DollarSign, label: 'Pengeluaran', href: '/expenses' },
    ],
  },
  {
    group: 'Akuntansi',
    items: [
      { icon: BookMarked, label: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
      { icon: FileText, label: 'Jurnal', href: '/accounting/journal' },
      { icon: BarChart3, label: 'Laporan', href: '/accounting/reports' },
    ],
  },
  {
    group: 'SDM',
    items: [{ icon: UserCircle2, label: 'Karyawan', href: '/employees' }],
  },
  {
    group: 'Sistem',
    items: [{ icon: Settings, label: 'Pengaturan', href: '/settings' }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('[v0] Logout error:', error);
    }
  };

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-700 fixed left-0 top-0 h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-lg font-bold text-white">
            🍽
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-white">KateringPro</div>
            <div className="text-xs text-slate-400">ERP System</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
        {menuItems.map((group) => (
          <div key={group.group}>
            <div className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {group.group}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium',
                      isActive
                        ? 'bg-orange-500/15 text-orange-400'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Logged in as</p>
          <p className="text-sm font-medium text-white truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
