'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { CashRegisterSession } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime, getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function CashRegisterPage() {
  const { pb, user, isAuthenticated, isViewOnlyRole } = useAuth();
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [saving, setSaving] = useState(false);

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
        if (current) {
          setClosingBalance(current.opening_balance);
        }
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
      setClosingBalance(created.opening_balance);
      toast.success('Cash register berhasil dibuka');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal membuka cash register');
      console.error('[v0] Open cash register error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (isViewOnlyRole) {
      toast.error('Role Anda hanya dapat melihat data dan tidak bisa menutup cash register');
      return;
    }
    if (!pb || !session) return;
    if (closingBalance < 0) {
      toast.error('Saldo akhir tidak boleh negatif');
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const updated = (await pb.collection('cash_register_sessions').update(session.id, {
        close_time: now,
        closing_balance: closingBalance,
        status: 'closed',
      })) as CashRegisterSession;
      setSession(null);
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
                  Masukkan saldo awal kas di laci sebelum mulai bertransaksi di PoS.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Saldo awal kas (Rp)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      type="button"
                      onClick={handleOpen}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {saving ? 'Membuka...' : 'Buka Cash Register'}
                    </Button>
                  </div>
                </div>
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
                  Hitung kas fisik di laci, lalu masukkan saldo akhir sebelum menutup shift.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Saldo akhir kas (Rp)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(Number(e.target.value) || 0)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      type="button"
                      onClick={handleClose}
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {saving ? 'Menutup...' : 'Tutup Cash Register'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
