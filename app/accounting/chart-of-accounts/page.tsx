'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { Account } from '@/lib/types';
import { getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Search, Edit2, Trash2 } from 'lucide-react';

const accountTypes: { value: Account['type']; label: string }[] = [
  { value: 'asset', label: 'Aset' },
  { value: 'liability', label: 'Liabilitas' },
  { value: 'equity', label: 'Ekuitas' },
  { value: 'revenue', label: 'Pendapatan' },
  { value: 'expense', label: 'Beban' },
];

const normalBalances: { value: Account['normal_balance']; label: string }[] = [
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Kredit' },
];

export default function ChartOfAccountsPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'asset' as Account['type'],
    normal_balance: 'debit' as Account['normal_balance'],
    is_active: true,
    description: '',
  });

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const res = await pb.collection('chart_of_accounts').getList(1, 200, {
          sort: 'code',
        });
        setAccounts(res.items as Account[]);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat daftar akun');
        console.error('[v0] Fetch accounts error:', message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [pb, isAuthenticated]);

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((acc) => {
        const keyword = search.toLowerCase();
        return (
          acc.code.toLowerCase().includes(keyword) ||
          acc.name.toLowerCase().includes(keyword) ||
          acc.type.toLowerCase().includes(keyword)
        );
      }),
    [accounts, search]
  );

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'asset',
      normal_balance: 'debit',
      is_active: true,
      description: '',
    });
  };

  const handleOpenAdd = () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menambah akun');
      return;
    }
    resetForm();
    setAddOpen(true);
  };

  const handleOpenEdit = (account: Account) => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa mengubah akun');
      return;
    }
    setSelectedAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      normal_balance: account.normal_balance,
      is_active: account.is_active ?? true,
      description: account.description || '',
    });
    setEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa mengubah akun');
      return;
    }
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Kode dan nama akun wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        normal_balance: formData.normal_balance,
        is_active: formData.is_active,
      };
      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      if (selectedAccount) {
        const updated = (await pb
          .collection('chart_of_accounts')
          .update(selectedAccount.id, payload)) as Account;
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toast.success('Akun berhasil diperbarui');
      } else {
        const created = (await pb.collection('chart_of_accounts').create(payload)) as Account;
        setAccounts((prev) => [created, ...prev]);
        toast.success('Akun baru berhasil ditambahkan');
      }

      setAddOpen(false);
      setEditOpen(false);
      setSelectedAccount(null);
      resetForm();
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menyimpan akun');
      console.error('[v0] Save account error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: Account) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus akun');
      return;
    }
    if (!confirm(`Yakin ingin menghapus akun ${account.code} - ${account.name}?`)) return;

    try {
      await pb.collection('chart_of_accounts').delete(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      toast.success('Akun berhasil dihapus');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menghapus akun');
      console.error('[v0] Delete account error:', message);
      toast.error(message);
    }
  };

  return (
    <MainLayout title="Chart of Accounts">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
            <p className="text-sm text-slate-400">
              Kelola daftar akun akuntansi yang digunakan untuk pencatatan transaksi.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari kode / nama akun..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <Button
              type="button"
              onClick={handleOpenAdd}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isViewOnlyRole}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Akun
            </Button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat daftar akun...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {accounts.length === 0
                ? 'Belum ada akun yang tercatat'
                : 'Tidak ada akun yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Kode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Nama Akun
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Saldo Normal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-3 text-sm text-white font-medium">{account.code}</td>
                      <td className="px-6 py-3 text-sm text-slate-200">{account.name}</td>
                      <td className="px-6 py-3 text-sm text-slate-200">
                        {accountTypes.find((t) => t.value === account.type)?.label || account.type}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-200">
                        {normalBalances.find((n) => n.value === account.normal_balance)?.label ||
                          account.normal_balance}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            account.is_active ?? true
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          {account.is_active ?? true ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm flex justify-end gap-2">
                        {!isViewOnlyRole && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(account)}
                              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(account)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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

        <Dialog
          open={addOpen || editOpen}
          onOpenChange={(open) => {
            if (!open) {
              setAddOpen(false);
              setEditOpen(false);
              setSelectedAccount(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedAccount ? 'Edit Akun' : 'Tambah Akun'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedAccount
                  ? 'Perbarui informasi akun akuntansi.'
                  : 'Tambahkan akun baru ke chart of accounts.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Kode Akun *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value }))
                    }
                    disabled={saving}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipe Akun *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as Account['type'],
                      }))
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                  >
                    {accountTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nama Akun *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={saving}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Saldo Normal *
                  </label>
                  <select
                    value={formData.normal_balance}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        normal_balance: e.target.value as Account['normal_balance'],
                      }))
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                  >
                    {normalBalances.map((nb) => (
                      <option key={nb.value} value={nb.value}>
                        {nb.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2 pt-1">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium text-slate-200 select-none"
                  >
                    Akun aktif
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
                  placeholder="Deskripsi singkat penggunaan akun (opsional)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setAddOpen(false);
                    setEditOpen(false);
                    setSelectedAccount(null);
                    resetForm();
                  }}
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
