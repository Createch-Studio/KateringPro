'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { Account, JournalEntry } from '@/lib/types';
import { getPocketBaseErrorMessage, formatDate } from '@/lib/api';
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
import { Calendar, Edit2, Loader2, Plus, Search, Trash2 } from 'lucide-react';

export default function JournalPage() {
  const { pb, isAuthenticated, isViewOnlyRole } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    account_id: '',
    description: '',
    debit: 0,
    credit: 0,
    notes: '',
  });

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [accountsRes, journalRes] = await Promise.all([
          pb.collection('chart_of_accounts').getList(1, 200, {
            sort: 'code',
          }),
          pb.collection('journal_entries').getList(1, 200, {
            sort: '-entry_date',
          }),
        ]);
        setAccounts(accountsRes.items as Account[]);
        setEntries(journalRes.items as JournalEntry[]);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat data jurnal');
        console.error('[v0] Fetch journal error:', message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pb, isAuthenticated]);

  useEffect(() => {
    if (accounts.length > 0 && !formData.account_id) {
      setFormData((prev) => ({
        ...prev,
        account_id: accounts[0].id,
      }));
    }
  }, [accounts, formData.account_id]);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const keyword = search.toLowerCase();
        const account = accounts.find((a) => a.id === entry.account_id);
        const accountText = account ? `${account.code} ${account.name}`.toLowerCase() : '';
        return (
          entry.reference?.toLowerCase().includes(keyword) ||
          entry.description?.toLowerCase().includes(keyword) ||
          accountText.includes(keyword)
        );
      }),
    [entries, accounts, search]
  );

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      reference: '',
      account_id: accounts[0]?.id || '',
      description: '',
      debit: 0,
      credit: 0,
      notes: '',
    });
    setSelectedEntry(null);
  };

  const handleOpenAdd = () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menambah entri jurnal');
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (entry: JournalEntry) => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa mengubah entri jurnal');
      return;
    }
    setSelectedEntry(entry);
    setFormData({
      entry_date: entry.entry_date.includes('T')
        ? entry.entry_date.split('T')[0]
        : entry.entry_date,
      reference: entry.reference || '',
      account_id: entry.account_id,
      description: entry.description || '',
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      notes: entry.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa mengubah entri jurnal');
      return;
    }

    if (!formData.entry_date || !formData.account_id) {
      toast.error('Tanggal dan akun wajib diisi');
      return;
    }

    const debit = Number(formData.debit) || 0;
    const credit = Number(formData.credit) || 0;

    if (debit <= 0 && credit <= 0) {
      toast.error('Isi salah satu nilai debit atau kredit');
      return;
    }

    if (debit > 0 && credit > 0) {
      toast.error('Debit dan kredit tidak boleh terisi bersamaan');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        entry_date: formData.entry_date,
        account_id: formData.account_id,
        debit,
        credit,
      };

      if (formData.reference.trim()) {
        payload.reference = formData.reference.trim();
      }
      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.notes.trim()) {
        payload.notes = formData.notes.trim();
      }
      if (!selectedEntry) {
        payload.source = 'manual';
      }

      if (selectedEntry) {
        const updated = (await pb
          .collection('journal_entries')
          .update(selectedEntry.id, payload)) as JournalEntry;
        setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        toast.success('Entri jurnal berhasil diperbarui');
      } else {
        const created = (await pb
          .collection('journal_entries')
          .create(payload)) as JournalEntry;
        setEntries((prev) => [created, ...prev]);
        toast.success('Entri jurnal baru berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menyimpan entri jurnal');
      console.error('[v0] Save journal entry error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: JournalEntry) => {
    if (!pb) return;
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menghapus entri jurnal');
      return;
    }
    if (
      !confirm(
        `Yakin ingin menghapus entri jurnal untuk akun ini? (Ref: ${
          entry.reference || '-'
        })`
      )
    )
      return;

    try {
      await pb.collection('journal_entries').delete(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success('Entri jurnal berhasil dihapus');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menghapus entri jurnal');
      console.error('[v0] Delete journal entry error:', message);
      toast.error(message);
    }
  };

  const getAccountLabel = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return '-';
    return `${account.code} - ${account.name}`;
  };

  return (
    <MainLayout title="Jurnal">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Jurnal Umum</h1>
            <p className="text-sm text-slate-400">
              Catat transaksi akuntansi harian dengan metode debit-kredit.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari referensi, deskripsi, atau akun..."
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
              Tambah Entri
            </Button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat jurnal...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {entries.length === 0
                ? 'Belum ada entri jurnal'
                : 'Tidak ada entri yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Referensi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Akun
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Kredit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-3 text-sm text-slate-200">
                        <div className="inline-flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formatDate(entry.entry_date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-200">
                        {entry.reference || '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-200">
                        {getAccountLabel(entry.account_id)}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-300 max-w-xs">
                        <span className="line-clamp-2">
                          {entry.description || entry.notes || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-emerald-300 font-medium">
                        {entry.debit > 0
                          ? `Rp ${entry.debit.toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-red-300 font-medium">
                        {entry.credit > 0
                          ? `Rp ${entry.credit.toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm flex justify-end gap-2">
                        {!isViewOnlyRole && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(entry)}
                              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry)}
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
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDialogOpen(false);
              resetForm();
            } else {
              setDialogOpen(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedEntry ? 'Edit Entri Jurnal' : 'Tambah Entri Jurnal'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedEntry
                  ? 'Perbarui data entri jurnal.'
                  : 'Tambahkan entri jurnal baru dengan memilih akun dan nilai debit/kredit.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tanggal *
                  </label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, entry_date: e.target.value }))
                    }
                    disabled={saving}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Referensi
                  </label>
                  <Input
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, reference: e.target.value }))
                    }
                    disabled={saving}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="No bukti, no dokumen, dll (opsional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Akun *
                </label>
                <select
                  value={formData.account_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_id: e.target.value }))
                  }
                  disabled={saving || accounts.length === 0}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                >
                  {accounts.length === 0 ? (
                    <option>Tidak ada akun</option>
                  ) : (
                    accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Debit
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.debit || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        debit: Number(e.target.value) || 0,
                      }))
                    }
                    disabled={saving}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Kredit
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.credit || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        credit: Number(e.target.value) || 0,
                      }))
                    }
                    disabled={saving}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
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
                  placeholder="Uraian singkat transaksi (opsional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Catatan
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setDialogOpen(false);
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
