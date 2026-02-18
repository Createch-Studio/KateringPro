'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Customer } from '@/lib/types';
import { Search, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { AddCustomerDialog } from '@/components/dialogs/AddCustomerDialog';
import { getPocketBaseErrorMessage } from '@/lib/api';

export default function CustomersPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !pb) {
      setLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await pb.collection('customers').getList(1, 50);
        setCustomers(res.items as Customer[]);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat pelanggan');
        if (String(message).toLowerCase().includes('autocancel')) return;
        console.error('[v0] Fetch customers error:', message);
        toast.error(`Gagal memuat pelanggan: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [isAuthenticated, pb]);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone.includes(search)
  );

  const handleDelete = async (id: string) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus pelanggan');
      return;
    }

    if (!confirm('Yakin ingin menghapus pelanggan ini?')) return;

    try {
      await pb.collection('customers').delete(id);
      setCustomers(customers.filter((c) => c.id !== id));
      toast.success('Pelanggan berhasil dihapus');
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast.error('Gagal menghapus pelanggan');
    }
  };

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers([newCustomer, ...customers]);
  };

  return (
    <MainLayout title="Pelanggan">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
          <div className="ml-4">
            {pb && !isViewOnlyRole && (
              <AddCustomerDialog pb={pb} onCustomerAdded={handleCustomerAdded} />
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data pelanggan...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {customers.length === 0
                ? 'Belum ada data pelanggan'
                : 'Tidak ada pelanggan yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Tipe
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Telepon
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{customer.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium">
                          {customer.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{customer.phone}</td>
                      <td className="px-6 py-4 text-slate-300">{customer.email || '-'}</td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        {!isViewOnlyRole && (
                          <>
                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(customer.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
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
