'use client';

import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { CashRegisterSession, Payment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDateTime, getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function CashRegisterPage() {
  const { pb, user, isAuthenticated, isViewOnlyRole, employee } = useAuth();
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<CashRegisterSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<CashRegisterSession | null>(null);
  const [actualCash, setActualCash] = useState<number>(0);
  const [expectedCash, setExpectedCash] = useState<number>(0);
  const [expectedLoading, setExpectedLoading] = useState(false);
  const [closeNote, setCloseNote] = useState('');

  const isAdmin = employee?.role === 'admin';
  const openedByLabel = employee?.name || user?.email || '-';

  useEffect(() => {
    const fetchSession = async () => {
      if (!pb || !user || !isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await pb.collection('cash_register_sessions').getList<CashRegisterSession>(1, 1, {
          filter: `user_id = "${user.id}" && status = "open"`,
          sort: '-open_time',
        });
        const current = res.items[0] || null;
        setSession(current);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat status cash register');
        console.error('[v0] Fetch cash register session error:', message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [pb, user, isAuthenticated]);

  const fetchHistory = useCallback(async () => {
    if (!pb || !user || !isAuthenticated) return;

    try {
      setHistoryLoading(true);
      const res = await pb
        .collection('cash_register_sessions')
        .getList<CashRegisterSession>(historyPage, 10, {
          filter: `user_id = "${user.id}"`,
          sort: '-open_time',
        });
      setHistory(res.items);
      setHistoryTotalPages(res.totalPages || 1);
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(
        error,
        'Gagal memuat histori cash register'
      );
      console.error('[v0] Fetch cash register history error:', message);
      toast.error(message);
    } finally {
      setHistoryLoading(false);
    }
  }, [pb, user, isAuthenticated, historyPage]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOpen = async () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa membuka cash register');
      return;
    }
    if (!pb || !user) return;
    if (openingBalance < 0) {
      toast.error('Saldo awal tidak boleh negatif');
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const created = (await pb.collection('cash_register_sessions').create({
        user_id: user.id,
        open_time: now,
        opening_balance: openingBalance,
        status: 'open',
      })) as CashRegisterSession;
      setSession(created);
      setOpenDialogOpen(false);
      await fetchHistory();
      toast.success('Cash register berhasil dibuka');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal membuka cash register');
      console.error('[v0] Open cash register error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseClick = async () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menutup cash register');
      return;
    }
    if (!pb || !session || !user) return;

    const isOpener = session.user_id === user.id;
    if (!isAdmin && !isOpener) {
      toast.error('Cash register hanya bisa ditutup oleh pembuka atau admin');
      return;
    }

    try {
      setExpectedLoading(true);
      let totalCash = 0;

      const res = await pb
        .collection('payments')
        .getList<Payment>(1, 500, {
          filter: `session_id = "${session.id}" && method = "cash"`,
        });

      totalCash = res.items.reduce((sum, p) => sum + (p.amount || 0), 0);

      const calculatedExpected = (session.opening_balance || 0) + totalCash;
      setExpectedCash(calculatedExpected);
      setActualCash(calculatedExpected);
    } catch (error: any) {
      console.error('[v0] Calculate expected cash error (fallback to opening balance):', error);
      setExpectedCash(session.opening_balance || 0);
      setActualCash(session.opening_balance || 0);
    } finally {
      setExpectedLoading(false);
    }

    setCloseDialogOpen(true);
  };

  const handleConfirmClose = async () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menutup cash register');
      return;
    }
    if (!pb || !session || !user) return;

    const isOpener = session.user_id === user.id;
    if (!isAdmin && !isOpener) {
      toast.error('Cash register hanya bisa ditutup oleh pembuka atau admin');
      return;
    }
    if (actualCash < 0) {
      toast.error('Saldo akhir tidak boleh negatif');
      return;
    }
    if (!closeNote.trim()) {
      toast.error('Catatan penutupan cash register wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const updated = (await pb.collection('cash_register_sessions').update(session.id, {
        close_time: now,
        closing_balance: actualCash,
        notes: closeNote.trim(),
        status: 'closed',
      })) as CashRegisterSession;
      setSession(null);
      setCloseDialogOpen(false);
      setActualCash(0);
      setCloseNote('');
      await fetchHistory();
      toast.success('Cash register berhasil ditutup');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menutup cash register');
      console.error('[v0] Close cash register error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Cash Register">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-white mb-2">Cash Register</h1>
          <p className="text-sm text-slate-400 mb-4">
            Kelola pembukaan dan penutupan kas harian. Transaksi PoS hanya dapat dilakukan saat
            cash register dalam kondisi terbuka.
          </p>

          {loading ? (
            <div className="text-slate-400 text-sm">Memuat status cash register...</div>
          ) : !session ? (
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-200 font-semibold mb-2">
                  Cash register belum dibuka
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Klik tombol di bawah untuk membuka cash register dan memulai sesi transaksi.
                </p>
                <Button
                  type="button"
                  onClick={() => setOpenDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Buka Cash Register
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-green-400 font-semibold mb-2">
                  Cash register sedang terbuka
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Dibuka oleh</p>
                    <p className="text-slate-200 text-sm">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Waktu buka</p>
                    <p className="text-slate-200 text-sm">{formatDateTime(session.open_time)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Saldo awal</p>
                    <p className="text-slate-200 text-sm">
                      {formatCurrency(session.opening_balance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-200 font-semibold mb-2">Tutup cash register</p>
                <p className="text-xs text-slate-400 mb-3">
                  Klik tombol di bawah untuk menghitung Expected Cash dan mengisi saldo akhir
                  aktual di dialog konfirmasi.
                </p>
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    onClick={handleCloseClick}
                    disabled={
                      saving ||
                      !session ||
                      (!isAdmin && session.user_id !== user?.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {saving ? 'Menutup...' : 'Tutup Cash Register'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Riwayat Cash Register</h2>
          <p className="text-xs text-slate-400 mb-4">
            Riwayat pembukaan dan penutupan cash register. Ditampilkan per 10 sesi, urut dari yang
            terbaru.
          </p>

          {historyLoading ? (
            <div className="text-slate-400 text-sm">Memuat histori cash register...</div>
          ) : history.length === 0 ? (
            <div className="text-slate-500 text-sm">Belum ada histori cash register.</div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Waktu Buka
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Waktu Tutup
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                        Saldo Awal
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                        Saldo Akhir
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">
                        Variance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">
                        Dibuka oleh
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-800 hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-200">
                          {formatDateTime(item.open_time)}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {item.close_time ? formatDateTime(item.close_time) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200">
                          {formatCurrency(item.opening_balance || 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200">
                          {item.closing_balance != null
                            ? formatCurrency(item.closing_balance)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200">
                          {item.closing_balance != null
                            ? formatCurrency(
                                (item.closing_balance || 0) - (item.opening_balance || 0)
                              )
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {openedByLabel}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                              item.status === 'open'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-slate-600/20 text-slate-200'
                            }`}
                          >
                            {item.status === 'open'
                              ? `Terbuka oleh ${openedByLabel}`
                              : `Ditutup oleh ${openedByLabel}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                            onClick={() => {
                              setSelectedHistory(item);
                              setViewDialogOpen(true);
                            }}
                          >
                            Lihat
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400">
                  Halaman <span className="font-semibold text-slate-200">{historyPage}</span> dari{' '}
                  <span className="font-semibold text-slate-200">{historyTotalPages}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={historyPage <= 1 || historyLoading}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="border-slate-700 text-slate-200 hover:text-white"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={historyPage >= historyTotalPages || historyLoading}
                    onClick={() =>
                      setHistoryPage((p) =>
                        historyTotalPages > 0 ? Math.min(historyTotalPages, p + 1) : p + 1
                      )
                    }
                    className="border-slate-700 text-slate-200 hover:text-white"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
          <DialogContent className="sm:max-w-[420px] bg-slate-900 border border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Buka Cash Register</DialogTitle>
              <DialogDescription className="text-slate-400">
                Masukkan saldo awal kas di laci sebelum mulai bertransaksi di PoS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Saldo Awal Kas (Rp)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Contoh: 500000"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialogOpen(false)}
                  className="border-slate-700 text-slate-200 hover:text-white"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleOpen}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? 'Membuka...' : 'Konfirmasi & Buka'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent className="sm:max-w-[420px] bg-slate-900 border border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Konfirmasi Tutup Cash Register</DialogTitle>
              <DialogDescription className="text-slate-400">
                Periksa saldo kas dan isi saldo akhir aktual sebelum menutup cash register.
              </DialogDescription>
            </DialogHeader>

            {session && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Opening Balance</p>
                    <p className="text-base font-semibold text-slate-100">
                      {formatCurrency(session.opening_balance || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Expected Cash</p>
                    <p className="text-base font-semibold text-orange-400">
                      {expectedLoading
                        ? 'Menghitung...'
                        : formatCurrency(expectedCash)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-200">Actual Cash Count</p>
                  <Input
                    type="number"
                    min={0}
                    value={actualCash}
                    onChange={(e) => setActualCash(Number(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                  <p className="text-xs text-slate-400 mb-1">Variance (Actual - Expected)</p>
                  <p
                    className={`text-base font-semibold ${
                      actualCash - expectedCash === 0
                        ? 'text-green-400'
                        : actualCash - expectedCash > 0
                          ? 'text-orange-400'
                          : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(actualCash - expectedCash)}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-200">
                    Catatan Penutupan (wajib)
                  </p>
                  <Input
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    placeholder="Contoh: Selisih karena uang kembalian, dll."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCloseDialogOpen(false)}
                    disabled={saving}
                    className="border-slate-700 text-slate-300 hover:text-white"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmClose}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {saving ? 'Menutup...' : 'Konfirmasi & Tutup'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[460px] bg-slate-900 border border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Detail Cash Register</DialogTitle>
              <DialogDescription className="text-slate-400">
                Detail sesi cash register termasuk saldo dan catatan penutupan.
              </DialogDescription>
            </DialogHeader>

            {selectedHistory && (
              <div className="space-y-4 mt-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Waktu Buka</p>
                    <p className="text-slate-100">
                      {formatDateTime(selectedHistory.open_time)}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Waktu Tutup</p>
                    <p className="text-slate-100">
                      {selectedHistory.close_time
                        ? formatDateTime(selectedHistory.close_time)
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Saldo Awal</p>
                    <p className="text-base font-semibold text-slate-100">
                      {formatCurrency(selectedHistory.opening_balance || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Saldo Akhir</p>
                    <p className="text-base font-semibold text-slate-100">
                      {selectedHistory.closing_balance != null
                        ? formatCurrency(selectedHistory.closing_balance)
                        : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Variance</p>
                    <p className="text-base font-semibold text-orange-400">
                      {selectedHistory.closing_balance != null
                        ? formatCurrency(
                            (selectedHistory.closing_balance || 0) -
                              (selectedHistory.opening_balance || 0)
                          )
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded p-3">
                  <p className="text-xs text-slate-400 mb-1">Catatan Penutupan</p>
                  <p className="text-sm text-slate-100 whitespace-pre-line">
                    {selectedHistory.notes || '-'}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                    className="border-slate-700 text-slate-300 hover:text-white"
                  >
                    Tutup
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